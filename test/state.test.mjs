import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createEvent } from '../src/events.mjs';
import { reduceEvents, STALE_AFTER_MS, RECENT_EVENTS_LIMIT } from '../dashboard/state.mjs';
import { createDemoSource, CYCLE_SECONDS, DEMO_WORK_ID } from '../dashboard/demo.mjs';
import { ROLES, IDLE_ACTIVITIES, isRoaming, getRoamerPose, drawRoamer, roleAt, pickActiveWork } from '../dashboard/public/sprites.js';

const T0 = Date.parse('2026-10-16T05:00:00.000Z');
let tick = 0;
function ev(agent, event, extra = {}, atMs = T0 + tick++ * 1000) {
  return createEvent({ workId: 'feat-x', agent, event, ...extra }, new Date(atMs));
}

test('with no events every agent is idle', () => {
  const state = reduceEvents([], T0);
  assert.equal(Object.keys(state.agents).length, 5);
  for (const a of Object.values(state.agents)) assert.equal(a.status, 'idle');
  assert.equal(state.done, false);
});

test('started and progress make an agent work and record stage and task', () => {
  const state = reduceEvents(
    [ev('architect', 'started', { stage: 'spec', message: 'drafting' }), ev('architect', 'progress', { message: 'stories done' })],
    T0 + 5000,
  );
  assert.equal(state.agents.architect.status, 'working');
  assert.equal(state.agents.architect.stage, 'spec');
  assert.equal(state.agents.architect.task, 'stories done');
  assert.equal(state.stage, 'spec');
});

test('gate_waiting shows waiting and gate_approved resumes work', () => {
  const waiting = reduceEvents([ev('architect', 'started'), ev('architect', 'gate_waiting', { message: 'approve spec' })], T0);
  assert.equal(waiting.agents.architect.status, 'waiting');
  assert.equal(waiting.agents.architect.task, 'approve spec');
  const resumed = reduceEvents([ev('architect', 'gate_waiting'), ev('architect', 'gate_approved')], T0);
  assert.equal(resumed.agents.architect.status, 'working');
});

test('passing verdicts mark done and failing verdicts mark blocked', () => {
  for (const verdict of ['APPROVED', 'CLEARED', 'PASS', 'CONSISTENT']) {
    const s = reduceEvents([ev('reviewer', 'verdict', { verdict })], T0);
    assert.equal(s.agents.reviewer.status, 'done', verdict);
    assert.equal(s.agents.reviewer.verdict, verdict);
  }
  for (const verdict of ['CHANGES_REQUESTED', 'BLOCKED', 'FAIL', 'GAPS_FOUND']) {
    const s = reduceEvents([ev('qa', 'verdict', { verdict })], T0);
    assert.equal(s.agents.qa.status, 'blocked', verdict);
  }
});

test('loop sets the loop count and puts the implementer back to work', () => {
  const s = reduceEvents(
    [ev('implementer', 'escalated'), ev('implementer', 'loop', { loop: 2, message: 'fixing R1' })],
    T0,
  );
  assert.equal(s.agents.implementer.loop, 2);
  assert.equal(s.agents.implementer.status, 'working');
  assert.equal(s.agents.implementer.escalated, false);
});

test('handoff idles a working agent but keeps done and blocked statuses', () => {
  const working = reduceEvents([ev('architect', 'started'), ev('architect', 'handoff', { to: 'implementer' })], T0);
  assert.equal(working.agents.architect.status, 'idle');
  assert.equal(working.agents.architect.handoff.to, 'implementer');

  const done = reduceEvents(
    [ev('reviewer', 'verdict', { verdict: 'APPROVED' }), ev('reviewer', 'handoff', { to: 'security' })],
    T0,
  );
  assert.equal(done.agents.reviewer.status, 'done');
  const blocked = reduceEvents(
    [ev('reviewer', 'verdict', { verdict: 'BLOCKED' }), ev('reviewer', 'handoff', { to: 'implementer' })],
    T0,
  );
  assert.equal(blocked.agents.reviewer.status, 'blocked');
});

test('escalated waits for the user and is flagged until work resumes', () => {
  const s = reduceEvents([ev('implementer', 'escalated', { message: 'loop limit' })], T0);
  assert.equal(s.agents.implementer.status, 'waiting');
  assert.equal(s.agents.implementer.escalated, true);
  const resumed = reduceEvents([ev('implementer', 'escalated'), ev('implementer', 'started')], T0);
  assert.equal(resumed.agents.implementer.escalated, false);
});

test('done completes every agent and a later event reopens the work item', () => {
  const finished = reduceEvents([ev('qa', 'done', { message: 'shipped' })], T0);
  assert.equal(finished.done, true);
  assert.equal(finished.summary, 'shipped');
  for (const a of Object.values(finished.agents)) assert.equal(a.status, 'done');
  const reopened = reduceEvents([ev('qa', 'done'), ev('implementer', 'started')], T0);
  assert.equal(reopened.done, false);
  assert.equal(reopened.agents.implementer.status, 'working');
});

test('a working agent with no report for over 5 minutes is stale; waiting agents are not', () => {
  const events = [ev('implementer', 'started', {}, T0), ev('architect', 'gate_waiting', {}, T0)];
  assert.equal(reduceEvents(events, T0 + STALE_AFTER_MS).agents.implementer.stale, false);
  const late = reduceEvents(events, T0 + STALE_AFTER_MS + 1);
  assert.equal(late.agents.implementer.stale, true);
  assert.equal(late.agents.architect.stale, false);
});

test('tracks pendingHandoffTo, participated, and queued across handoffs and completion', () => {
  const handedOff = reduceEvents(
    [ev('architect', 'started'), ev('architect', 'handoff', { to: 'implementer' })],
    T0,
  );
  assert.equal(handedOff.pendingHandoffTo, 'implementer');
  assert.equal(handedOff.agents.architect.participated, true);
  assert.equal(handedOff.agents.implementer.participated, false);
  assert.equal(handedOff.agents.implementer.queued, true);
  assert.equal(handedOff.agents.qa.participated, false);

  const startedNext = reduceEvents(
    [
      ev('architect', 'started'),
      ev('architect', 'handoff', { to: 'implementer' }),
      ev('implementer', 'started', { stage: 'implement' }),
    ],
    T0,
  );
  assert.equal(startedNext.pendingHandoffTo, null);
  assert.equal(startedNext.agents.implementer.participated, true);
  assert.equal(startedNext.agents.implementer.queued, false);

  const finished = reduceEvents(
    [
      ev('architect', 'handoff', { to: 'implementer' }),
      ev('qa', 'done', { message: 'complete' }),
    ],
    T0,
  );
  assert.equal(finished.pendingHandoffTo, null);
  assert.equal(finished.agents.implementer.queued, false);
});

test('recentEvents returns the last 25 events in reverse chronological order', () => {
  const events = Array.from({ length: 30 }, (_, i) =>
    ev('implementer', 'progress', { stage: 'implement', message: `step-${i}` }, T0 + i * 1000),
  );
  const state = reduceEvents(events, T0 + 30_000);
  assert.equal(state.recentEvents.length, RECENT_EVENTS_LIMIT);
  assert.equal(state.recentEvents[0].message, 'step-29');
  assert.equal(state.recentEvents[24].message, 'step-5');
  assert.equal(state.recentEvents[0].agent, 'implementer');
  assert.equal(state.recentEvents[0].stage, 'implement');
});

test('demo source reveals events over time and restarts each cycle', async () => {
  let clock = 1_000_000;
  const demo = createDemoSource({ now: () => clock, startedAt: clock });

  assert.equal((await demo.readEvents(DEMO_WORK_ID)).length, 1);
  const early = await demo.signature(DEMO_WORK_ID);

  clock += 30_000;
  const mid = reduceEvents(await demo.readEvents(DEMO_WORK_ID), clock);
  assert.equal(mid.agents.implementer.status, 'working');
  assert.notEqual(await demo.signature(DEMO_WORK_ID), early);

  clock += 40_000;
  const end = reduceEvents(await demo.readEvents(DEMO_WORK_ID), clock);
  assert.equal(end.done, true);
  assert.equal(end.agents.implementer.loop, 1);
  assert.equal(end.agents.reviewer.verdict, 'APPROVED');

  clock = 1_000_000 + CYCLE_SECONDS * 1000 + 500;
  assert.equal((await demo.readEvents(DEMO_WORK_ID)).length, 1);
  assert.deepEqual(await demo.readEvents('other'), []);
  assert.equal((await demo.listWorks())[0].workId, DEMO_WORK_ID);
});

test('idle agents roam around the office with random behaviours and return to desk when working', () => {
  assert.equal(isRoaming(undefined), true);
  assert.equal(isRoaming({ status: 'idle', participated: false }), true);
  assert.equal(isRoaming({ status: 'idle', participated: true }, false), true);
  assert.equal(isRoaming({ status: 'idle', participated: true }, true), false);
  assert.equal(isRoaming({ status: 'working', participated: true }), false);
  assert.equal(isRoaming({ status: 'done', participated: true }), false);

  const seenActivities = new Set();
  for (const role of ROLES) {
    const p0 = getRoamerPose(role.id, 0);
    const p1 = getRoamerPose(role.id, 4800);
    assert.equal(typeof p0.x, 'number');
    assert.equal(typeof p0.y, 'number');
    assert.equal(typeof p0.moving, 'boolean');
    assert.ok(p0.x !== p1.x || p0.y !== p1.y, `${role.id} should move over time`);

    for (let slot = 0; slot < 20; slot += 1) {
      const pose = getRoamerPose(role.id, slot * 6400);
      if (!pose.moving) {
        assert.ok(IDLE_ACTIVITIES.includes(pose.activity), `unexpected activity ${pose.activity}`);
        seenActivities.add(pose.activity);
      }
    }

    const matched = roleAt(p0.x, p0.y, {}, 0);
    assert.ok(matched, `should hit-test roamer or station at (${p0.x}, ${p0.y})`);

    const ops = [];
    const mockCtx = {
      fillStyle: '',
      fillRect: (...args) => ops.push(args),
    };
    drawRoamer(mockCtx, role, { time: 200, frame: 4, selected: true });
    assert.ok(ops.length > 5, 'drawRoamer should draw character pixels');
  }
  assert.ok(seenActivities.size >= 4, 'idle agents should cycle through multiple random idle behaviours');
});

test('pickActiveWork auto-refreshes to the active work item when work starts or updates', () => {
  const works = [
    { workId: 'feat-new', updatedAt: '2026-10-22T02:00:00.000Z', done: false },
    { workId: 'feat-old', updatedAt: '2026-10-21T01:00:00.000Z', done: true },
  ];

  // Initial load with no work selected selects the active work item
  const init = pickActiveWork(works, { currentWorkId: null });
  assert.equal(init.workId, 'feat-new');
  assert.equal(init.switched, true);

  // Stale completed work item in URL automatically switches to active work item
  const fromDone = pickActiveWork(works, { currentWorkId: 'feat-old', userSelected: false, lastTopKey: init.topKey });
  assert.equal(fromDone.workId, 'feat-new');
  assert.equal(fromDone.switched, true);

  // Manual user selection stays on the chosen work item while no new events arrive
  const pinned = pickActiveWork(works, { currentWorkId: 'feat-old', userSelected: true, lastTopKey: init.topKey });
  assert.equal(pinned.workId, 'feat-old');
  assert.equal(pinned.switched, false);

  // New event on an active work item overrides manual pin and switches to the active work item
  const updatedWorks = [
    { workId: 'feat-new', updatedAt: '2026-10-22T02:05:00.000Z', done: false },
    { workId: 'feat-old', updatedAt: '2026-10-21T01:00:00.000Z', done: true },
  ];
  const autoSwitched = pickActiveWork(updatedWorks, {
    currentWorkId: 'feat-old',
    userSelected: true,
    lastTopKey: init.topKey,
  });
  assert.equal(autoSwitched.workId, 'feat-new');
  assert.equal(autoSwitched.switched, true);
  assert.equal(autoSwitched.userSelected, false);
});


