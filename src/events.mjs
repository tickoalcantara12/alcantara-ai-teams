import { appendFile, mkdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';

export const AGENTS = ['architect', 'implementer', 'reviewer', 'security', 'qa'];
export const EVENT_TYPES = [
  'started',
  'progress',
  'handoff',
  'gate_waiting',
  'gate_approved',
  'verdict',
  'loop',
  'escalated',
  'done',
];
export const VERDICTS = [
  'APPROVED',
  'CHANGES_REQUESTED',
  'CLEARED',
  'BLOCKED',
  'PASS',
  'FAIL',
  'CONSISTENT',
  'GAPS_FOUND',
];
export const PASSING_VERDICTS = ['APPROVED', 'CLEARED', 'PASS', 'CONSISTENT'];

export const WORK_ID_PATTERN = /^[a-z0-9][a-z0-9-]{0,63}$/;
const STAGE_PATTERN = /^[a-z0-9][a-z0-9-]{0,31}$/;
const MAX_MESSAGE_LENGTH = 300;
const EVENTS_DIR = '.ai-team';
export const EVENTS_FILE = 'events.jsonl';

const REQUIRED_BY_TYPE = {
  handoff: ['to'],
  verdict: ['verdict'],
  loop: ['loop'],
};

/**
 * Validates an untrusted event object (CLI input or a line read from disk).
 * Returns a normalized event so downstream code never sees unexpected shapes or control characters.
 */
export function validateEvent(input) {
  if (input === null || typeof input !== 'object' || Array.isArray(input)) {
    return fail('event must be an object');
  }
  const { ts, workId, agent, event, stage, message, verdict, loop, to } = input;

  if (typeof ts !== 'string' || Number.isNaN(Date.parse(ts))) return fail('ts must be an ISO date string');
  if (typeof workId !== 'string' || !WORK_ID_PATTERN.test(workId)) {
    return fail('workId must match ^[a-z0-9][a-z0-9-]{0,63}$');
  }
  if (!AGENTS.includes(agent)) return fail(`agent must be one of: ${AGENTS.join(', ')}`);
  if (!EVENT_TYPES.includes(event)) return fail(`event must be one of: ${EVENT_TYPES.join(', ')}`);
  if (stage !== undefined && (typeof stage !== 'string' || !STAGE_PATTERN.test(stage))) {
    return fail('stage must match ^[a-z0-9][a-z0-9-]{0,31}$');
  }
  if (verdict !== undefined && !VERDICTS.includes(verdict)) {
    return fail(`verdict must be one of: ${VERDICTS.join(', ')}`);
  }
  if (loop !== undefined && !(Number.isInteger(loop) && loop >= 1 && loop <= 99)) {
    return fail('loop must be an integer between 1 and 99');
  }
  if (to !== undefined && !AGENTS.includes(to)) return fail(`to must be one of: ${AGENTS.join(', ')}`);
  if (message !== undefined && typeof message !== 'string') return fail('message must be a string');

  const normalized = { ts, workId, agent, event };
  if (stage !== undefined) normalized.stage = stage;
  if (message !== undefined) normalized.message = sanitizeMessage(message);
  if (verdict !== undefined) normalized.verdict = verdict;
  if (loop !== undefined) normalized.loop = loop;
  if (to !== undefined) normalized.to = to;

  for (const field of REQUIRED_BY_TYPE[event] ?? []) {
    if (normalized[field] === undefined) return fail(`event "${event}" requires "${field}"`);
  }
  return { ok: true, event: normalized };
}

export function createEvent(fields, now = new Date()) {
  const result = validateEvent({ ...fields, ts: now.toISOString() });
  if (!result.ok) throw new Error(result.error);
  return result.event;
}

/** Parses one JSONL line; returns null for blank or invalid lines so a bad line never breaks a reader. */
export function parseEventLine(line) {
  if (!line.trim()) return null;
  let parsed;
  try {
    parsed = JSON.parse(line);
  } catch {
    return null;
  }
  const result = validateEvent(parsed);
  return result.ok ? result.event : null;
}

export function eventsPath(projectDir, workId) {
  if (!WORK_ID_PATTERN.test(workId)) throw new Error('invalid workId');
  return join(resolve(projectDir), EVENTS_DIR, workId, EVENTS_FILE);
}

export async function appendEvent(projectDir, fields, now = new Date()) {
  const event = createEvent(fields, now);
  const file = eventsPath(projectDir, event.workId);
  await mkdir(join(file, '..'), { recursive: true });
  await appendFile(file, `${JSON.stringify(event)}\n`, 'utf8');
  return event;
}

function sanitizeMessage(message) {
  // Control characters could corrupt the JSONL file or terminal output of readers.
  // eslint-disable-next-line no-control-regex
  const cleaned = message.replace(/[\u0000-\u001f\u007f]+/g, ' ').trim();
  return cleaned.length > MAX_MESSAGE_LENGTH ? `${cleaned.slice(0, MAX_MESSAGE_LENGTH - 1)}…` : cleaned;
}

function fail(error) {
  return { ok: false, error };
}
