import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, access } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { appendEvent, createEvent, parseEventLine, validateEvent, eventsPath } from '../src/events.mjs';

const run = promisify(execFile);
const CLI = fileURLToPath(new URL('../bin/cli.mjs', import.meta.url));
const FIXED = new Date('2026-10-16T05:00:00.000Z');
const base = { workId: 'feat-todo', agent: 'architect', event: 'started', stage: 'spec' };

async function withTempDir(fn) {
  const dir = await mkdtemp(join(tmpdir(), 'ai-dev-team-ev-'));
  try {
    await fn(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

test('createEvent adds a timestamp and keeps valid fields', () => {
  const e = createEvent({ ...base, message: 'writing spec' }, FIXED);
  assert.deepEqual(e, { ts: FIXED.toISOString(), ...base, message: 'writing spec' });
});

test('validateEvent rejects bad agent, event, workId, stage, loop and verdict', () => {
  const ts = FIXED.toISOString();
  const bad = [
    { ...base, ts, agent: 'boss' },
    { ...base, ts, event: 'exploded' },
    { ...base, ts, workId: '../etc' },
    { ...base, ts, workId: 'Has Space' },
    { ...base, ts, stage: 'Bad Stage' },
    { ...base, ts, event: 'loop', loop: 0 },
    { ...base, ts, event: 'loop', loop: 1.5 },
    { ...base, ts, event: 'verdict', verdict: 'MAYBE' },
    { ...base, ts: 'not-a-date' },
  ];
  for (const input of bad) assert.equal(validateEvent(input).ok, false, JSON.stringify(input));
  assert.equal(validateEvent(null).ok, false);
  assert.equal(validateEvent([]).ok, false);
});

test('event types enforce their required fields', () => {
  const ts = FIXED.toISOString();
  assert.match(validateEvent({ ...base, ts, event: 'handoff' }).error, /requires "to"/);
  assert.match(validateEvent({ ...base, ts, event: 'verdict' }).error, /requires "verdict"/);
  assert.match(validateEvent({ ...base, ts, event: 'loop' }).error, /requires "loop"/);
  assert.equal(validateEvent({ ...base, ts, event: 'handoff', to: 'implementer' }).ok, true);
});

test('message is stripped of control characters and truncated', () => {
  const e = createEvent({ ...base, message: `line1\nline2\u0007${'x'.repeat(400)}` }, FIXED);
  assert.ok(!/[\u0000-\u001f]/.test(e.message));
  assert.equal(e.message.length, 300);
  assert.ok(e.message.endsWith('…'));
});

test('parseEventLine skips blank, malformed and invalid lines', () => {
  assert.equal(parseEventLine(''), null);
  assert.equal(parseEventLine('{not json'), null);
  assert.equal(parseEventLine('{"agent":"qa"}'), null);
  const line = JSON.stringify({ ts: FIXED.toISOString(), ...base });
  assert.equal(parseEventLine(line).agent, 'architect');
});

test('unknown extra fields are dropped from parsed events', () => {
  const line = JSON.stringify({ ts: FIXED.toISOString(), ...base, evil: '<script>' });
  assert.equal('evil' in parseEventLine(line), false);
});

test('appendEvent writes one JSON line per event under .ai-team/<work-id>', async () => {
  await withTempDir(async (dir) => {
    await appendEvent(dir, base, FIXED);
    await appendEvent(dir, { ...base, event: 'progress', message: 'half way' }, FIXED);
    const lines = (await readFile(eventsPath(dir, 'feat-todo'), 'utf8')).trim().split('\n');
    assert.equal(lines.length, 2);
    assert.equal(JSON.parse(lines[1]).message, 'half way');
  });
});

test('appendEvent refuses path traversal and writes nothing for invalid events', async () => {
  await withTempDir(async (dir) => {
    await assert.rejects(appendEvent(dir, { ...base, workId: '../../evil' }), /workId/);
    assert.throws(() => eventsPath(dir, '../x'), /invalid workId/);
    await assert.rejects(access(join(dir, '.ai-team')));
  });
});

test('CLI event command records an event and rejects invalid input', async () => {
  await withTempDir(async (dir) => {
    const { stdout } = await run('node', [
      CLI, 'event', '--dir', dir, '--work-id', 'feat-x', '--agent', 'reviewer',
      '--event', 'verdict', '--stage', 'review', '--verdict', 'APPROVED', '--message', 'looks good',
    ]);
    assert.match(stdout, /event recorded: reviewer verdict/);
    const saved = JSON.parse((await readFile(eventsPath(dir, 'feat-x'), 'utf8')).trim());
    assert.equal(saved.verdict, 'APPROVED');

    await assert.rejects(
      run('node', [CLI, 'event', '--dir', dir, '--work-id', 'feat-x', '--agent', 'nobody', '--event', 'started']),
      (err) => err.code === 1 && /agent must be one of/.test(err.stderr),
    );
    await assert.rejects(
      run('node', [CLI, 'event', '--dir', dir, '--work-id', 'feat-x', '--agent', 'qa', '--event', 'loop', '--loop', 'abc']),
      (err) => err.code === 1,
    );
  });
});
