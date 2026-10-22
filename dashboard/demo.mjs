import { createEvent } from '../src/events.mjs';

export const DEMO_WORK_ID = 'demo-todo-api';
export const CYCLE_SECONDS = 80;

// [seconds into the cycle, agent, event, extra fields]
const SCRIPT = [
  [0, 'architect', 'started', { stage: 'spec', message: 'Drafting the spec for the todo API' }],
  [4, 'architect', 'gate_waiting', { stage: 'spec', message: 'Gate 1: please approve the spec' }],
  [9, 'architect', 'gate_approved', { stage: 'spec', message: 'Spec approved' }],
  [10, 'architect', 'started', { stage: 'design', message: 'Designing components and ADRs' }],
  [14, 'architect', 'started', { stage: 'tasks', message: 'Breaking work into test-first tasks' }],
  [17, 'architect', 'verdict', { stage: 'analysis', verdict: 'CONSISTENT', message: 'Spec, design and tasks agree' }],
  [18, 'architect', 'gate_waiting', { stage: 'tasks', message: 'Gate 2: please approve design and tasks' }],
  [22, 'architect', 'gate_approved', { stage: 'tasks', message: 'Design and tasks approved' }],
  [23, 'architect', 'handoff', { stage: 'tasks', to: 'implementer' }],
  [24, 'implementer', 'started', { stage: 'implement', message: 'T1: todo model (tests first)' }],
  [30, 'implementer', 'progress', { stage: 'implement', message: 'T2: REST endpoints' }],
  [35, 'implementer', 'handoff', { stage: 'implement', to: 'reviewer' }],
  [36, 'reviewer', 'started', { stage: 'review', message: 'Reviewing the diff against the spec' }],
  [41, 'reviewer', 'verdict', { stage: 'review', verdict: 'CHANGES_REQUESTED', message: '2 blocking findings' }],
  [42, 'implementer', 'loop', { stage: 'implement', loop: 1, message: 'Fixing findings R1 and R2' }],
  [47, 'implementer', 'handoff', { stage: 'implement', to: 'reviewer' }],
  [48, 'reviewer', 'started', { stage: 'review', message: 'Re-reviewing the fixes' }],
  [51, 'reviewer', 'verdict', { stage: 'review', verdict: 'APPROVED', message: 'All findings resolved' }],
  [52, 'reviewer', 'handoff', { stage: 'review', to: 'security' }],
  [53, 'security', 'started', { stage: 'security', message: 'Threat modeling and input checks' }],
  [58, 'security', 'verdict', { stage: 'security', verdict: 'CLEARED', message: 'No open Critical or High findings' }],
  [59, 'security', 'handoff', { stage: 'security', to: 'qa' }],
  [60, 'qa', 'started', { stage: 'qa', message: 'Verifying REQ-1 to REQ-6' }],
  [66, 'qa', 'verdict', { stage: 'qa', verdict: 'PASS', message: 'Every requirement has a passing test' }],
  [67, 'qa', 'done', { stage: 'qa', message: 'Todo API delivered' }],
];

/**
 * A scripted run that restarts every CYCLE_SECONDS, shaped like the file source so the
 * dashboard can be demonstrated without a real agent. `now` is injectable for tests.
 */
export function createDemoSource({ now = Date.now, startedAt = now() } = {}) {
  function visible() {
    const elapsed = Math.max(0, (now() - startedAt) / 1000);
    const cycle = Math.floor(elapsed / CYCLE_SECONDS);
    const offset = elapsed - cycle * CYCLE_SECONDS;
    const cycleStart = startedAt + cycle * CYCLE_SECONDS * 1000;
    const events = SCRIPT.filter(([at]) => at <= offset).map(([at, agent, event, extra]) =>
      createEvent({ workId: DEMO_WORK_ID, agent, event, ...extra }, new Date(cycleStart + at * 1000)),
    );
    return { events, key: `${cycle}:${events.length}` };
  }

  return {
    async listWorks() {
      const { events } = visible();
      const done = events.at(-1)?.event === 'done';
      return [{ workId: DEMO_WORK_ID, updatedAt: events.at(-1)?.ts ?? null, bytes: 0, done }];
    },
    async readEvents(workId) {
      return workId === DEMO_WORK_ID ? visible().events : [];
    },
    async signature(workId) {
      return workId === DEMO_WORK_ID ? visible().key : 'missing';
    },
  };
}
