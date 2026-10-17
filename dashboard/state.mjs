import { AGENTS, PASSING_VERDICTS } from '../src/events.mjs';

export const STALE_AFTER_MS = 5 * 60 * 1000;
export const RECENT_EVENTS_LIMIT = 25;

const emptyAgent = () => ({
  status: 'idle',
  stage: null,
  task: '',
  verdict: null,
  loop: 0,
  escalated: false,
  lastEventAt: null,
  handoff: null,
  stale: false,
  participated: false,
  queued: false,
});

/**
 * Pure reducer: turns an ordered event list into what the dashboard shows.
 * `stale` is derived from `now` because agents report themselves and may forget to.
 */
export function reduceEvents(events, now = Date.now()) {
  const agents = Object.fromEntries(AGENTS.map((name) => [name, emptyAgent()]));
  const state = {
    workId: null,
    done: false,
    stage: null,
    summary: '',
    lastEventAt: null,
    eventCount: events.length,
    pendingHandoffTo: null,
    recentEvents: events
      .slice(-RECENT_EVENTS_LIMIT)
      .reverse()
      .map((e) => ({
        ts: e.ts,
        agent: e.agent,
        event: e.event,
        stage: e.stage ?? null,
        message: e.message ?? '',
        verdict: e.verdict ?? null,
        loop: e.loop ?? null,
        to: e.to ?? null,
      })),
    agents,
  };

  for (const e of events) {
    const agent = agents[e.agent];
    state.workId = e.workId;
    state.lastEventAt = e.ts;
    agent.lastEventAt = e.ts;
    agent.participated = true;
    agent.queued = false;
    if (state.pendingHandoffTo === e.agent) state.pendingHandoffTo = null;
    if (e.stage) {
      agent.stage = e.stage;
      state.stage = e.stage;
    }
    if (state.done && e.event !== 'done') state.done = false;

    switch (e.event) {
      case 'started':
        agent.status = 'working';
        agent.escalated = false;
        agent.task = e.message ?? '';
        break;
      case 'progress':
        agent.status = 'working';
        if (e.message) agent.task = e.message;
        break;
      case 'gate_waiting':
        agent.status = 'waiting';
        if (e.message) agent.task = e.message;
        break;
      case 'gate_approved':
        agent.status = 'working';
        agent.escalated = false;
        if (e.message) agent.task = e.message;
        break;
      case 'verdict':
        agent.verdict = e.verdict;
        agent.status = PASSING_VERDICTS.includes(e.verdict) ? 'done' : 'blocked';
        if (e.message) agent.task = e.message;
        break;
      case 'loop':
        agent.status = 'working';
        agent.escalated = false;
        agent.loop = e.loop;
        if (e.message) agent.task = e.message;
        break;
      case 'handoff':
        agent.handoff = { to: e.to, at: e.ts };
        if (agent.status === 'working') agent.status = 'idle';
        state.pendingHandoffTo = e.to;
        if (agents[e.to]) agents[e.to].queued = true;
        break;
      case 'escalated':
        agent.status = 'waiting';
        agent.escalated = true;
        if (e.message) agent.task = e.message;
        break;
      case 'done':
        state.done = true;
        state.summary = e.message ?? '';
        state.pendingHandoffTo = null;
        for (const other of Object.values(agents)) {
          other.status = 'done';
          other.queued = false;
        }
        break;
    }
  }

  const nowMs = typeof now === 'number' ? now : now.getTime();
  for (const agent of Object.values(agents)) {
    agent.stale =
      agent.status === 'working' &&
      agent.lastEventAt !== null &&
      nowMs - Date.parse(agent.lastEventAt) > STALE_AFTER_MS;
  }
  return state;
}
