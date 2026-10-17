import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { spawn } from 'node:child_process';
import { mkdtemp, mkdir, rm, writeFile, symlink, appendFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { appendEvent, eventsPath } from '../src/events.mjs';
import { createDashboardServer } from '../dashboard/server.mjs';
import { createFileSource } from '../dashboard/source.mjs';

const CLI = fileURLToPath(new URL('../bin/cli.mjs', import.meta.url));

async function withDashboard(fn, options = {}) {
  const dir = await mkdtemp(join(tmpdir(), 'ai-dev-team-dash-'));
  const publicDir = join(dir, 'public');
  await mkdir(publicDir);
  await writeFile(join(publicDir, 'index.html'), '<h1>office</h1>');
  await writeFile(join(dir, 'secret.txt'), 'top secret');
  const project = join(dir, 'project');
  await mkdir(project);
  const server = createDashboardServer({
    source: createFileSource(project),
    publicDir,
    pollMs: 25,
    pushMs: 60_000,
    onError: () => {},
    ...options,
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  try {
    await fn({ port, project, dir, base: `http://127.0.0.1:${port}` });
  } finally {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
    await rm(dir, { recursive: true, force: true });
  }
}

function rawRequest({ port, path, method = 'GET', headers = {} }) {
  return new Promise((resolve, reject) => {
    const req = http.request({ host: '127.0.0.1', port, path, method, headers }, (res) => {
      let body = '';
      res.on('data', (d) => (body += d));
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body }));
    });
    req.on('error', reject);
    req.end();
  });
}

const ev = (extra) => ({ workId: 'feat-x', agent: 'architect', event: 'started', stage: 'spec', ...extra });

test('lists work items that have an event log and ignores others', async () => {
  await withDashboard(async ({ base, project }) => {
    assert.deepEqual((await (await fetch(`${base}/api/works`)).json()).works, []);
    await appendEvent(project, ev({}));
    await mkdir(join(project, '.ai-team', 'empty-dir'), { recursive: true });
    const { works } = await (await fetch(`${base}/api/works`)).json();
    assert.deepEqual(works.map((w) => w.workId), ['feat-x']);
  });
});

test('state endpoint reduces events and skips malformed lines', async () => {
  await withDashboard(async ({ base, project }) => {
    await appendEvent(project, ev({ message: 'drafting' }));
    await appendFile(eventsPath(project, 'feat-x'), 'not json\n{"agent":"qa"}\n');
    const body = await (await fetch(`${base}/api/state?work=feat-x`)).json();
    assert.equal(body.state.agents.architect.status, 'working');
    assert.equal(body.state.eventCount, 1);
    assert.ok(body.serverTime);
  });
});

test('state endpoint rejects invalid ids and reports unknown work as 404', async () => {
  await withDashboard(async ({ base }) => {
    assert.equal((await fetch(`${base}/api/state`)).status, 400);
    assert.equal((await fetch(`${base}/api/state?work=..%2F..%2Fetc`)).status, 400);
    assert.equal((await fetch(`${base}/api/state?work=UPPER`)).status, 400);
    assert.equal((await fetch(`${base}/api/state?work=nope`)).status, 404);
    assert.equal((await fetch(`${base}/stream?work=bad%20id`)).status, 400);
  });
});

test('events endpoint returns reverse-chronological events with limit and 404 for unknown work', async () => {
  await withDashboard(async ({ base, project }) => {
    assert.equal((await fetch(`${base}/api/events`)).status, 400);
    assert.equal((await fetch(`${base}/api/events?work=nope`)).status, 404);

    await appendEvent(project, ev({ message: 'first' }));
    await appendEvent(project, ev({ event: 'progress', message: 'second' }));
    await appendEvent(project, ev({ event: 'progress', message: 'third' }));

    const all = await (await fetch(`${base}/api/events?work=feat-x`)).json();
    assert.equal(all.workId, 'feat-x');
    assert.deepEqual(all.events.map((e) => e.message), ['third', 'second', 'first']);

    const limited = await (await fetch(`${base}/api/events?work=feat-x&limit=2`)).json();
    assert.deepEqual(limited.events.map((e) => e.message), ['third', 'second']);
  });
});

test('is read-only: non-GET methods are rejected', async () => {
  await withDashboard(async ({ port }) => {
    for (const method of ['POST', 'PUT', 'DELETE']) {
      const res = await rawRequest({ port, path: '/api/works', method, headers: { Host: `127.0.0.1:${port}` } });
      assert.equal(res.status, 405, method);
    }
  });
});

test('rejects unexpected Host headers (DNS rebinding protection)', async () => {
  await withDashboard(async ({ port }) => {
    const res = await rawRequest({ port, path: '/api/works', headers: { Host: 'evil.example.com' } });
    assert.equal(res.status, 403);
    const ok = await rawRequest({ port, path: '/api/works', headers: { Host: `localhost:${port}` } });
    assert.equal(ok.status, 200);
  });
});

test('serves static files with security headers and blocks path traversal', async () => {
  await withDashboard(async ({ port, base }) => {
    const page = await fetch(`${base}/`);
    assert.equal(page.status, 200);
    assert.match(await page.text(), /office/);
    assert.match(page.headers.get('content-security-policy'), /script-src 'self'/);
    assert.equal(page.headers.get('x-content-type-options'), 'nosniff');

    for (const path of ['/../secret.txt', '/%2e%2e/secret.txt', '/..%2fsecret.txt', '/%00', '/missing.js']) {
      const res = await rawRequest({ port, path, headers: { Host: `127.0.0.1:${port}` } });
      assert.ok([400, 404].includes(res.status), `${path} -> ${res.status}`);
      assert.ok(!res.body.includes('top secret'), path);
    }
  });
});

test('ignores symlinked work directories so links cannot expose outside files', async () => {
  await withDashboard(async ({ base, project, dir }) => {
    const outside = join(dir, 'outside');
    await mkdir(outside);
    await writeFile(join(outside, 'events.jsonl'), `${JSON.stringify({ ts: new Date().toISOString(), ...ev({}) })}\n`);
    await mkdir(join(project, '.ai-team'), { recursive: true });
    await symlink(outside, join(project, '.ai-team', 'linked'));
    const { works } = await (await fetch(`${base}/api/works`)).json();
    assert.deepEqual(works, []);
    assert.equal((await fetch(`${base}/api/state?work=linked`)).status, 404);
  });
});

test('SSE stream sends the current state and pushes new events', async () => {
  await withDashboard(async ({ port, project }) => {
    await appendEvent(project, ev({ message: 'first' }));
    const { response, request } = await new Promise((resolve, reject) => {
      const request = http.get({ host: '127.0.0.1', port, path: '/stream?work=feat-x' }, (response) =>
        resolve({ response, request }),
      );
      request.on('error', reject);
    });
    assert.match(response.headers['content-type'], /text\/event-stream/);

    let received = '';
    const waitFor = (text) =>
      new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error(`timeout waiting for "${text}"; got: ${received}`)), 3000);
        const check = () => {
          if (received.includes(text)) {
            clearTimeout(timer);
            response.off('data', onData);
            resolve();
          }
        };
        const onData = (chunk) => {
          received += chunk;
          check();
        };
        response.on('data', onData);
        check();
      });

    await waitFor('"task":"first"');
    const next = waitFor('"task":"second"');
    await appendEvent(project, ev({ event: 'progress', message: 'second' }));
    await next;
    request.destroy();
  });
});

test('dashboard CLI --demo serves the scripted run on loopback', async () => {
  const child = spawn('node', [CLI, 'dashboard', '--demo', '--no-open', '--port', '0'], {
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  try {
    const url = await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('dashboard did not start')), 5000);
      child.stdout.on('data', (chunk) => {
        const match = /http:\/\/127\.0\.0\.1:\d+\//.exec(chunk.toString());
        if (match) {
          clearTimeout(timer);
          resolve(match[0]);
        }
      });
      child.on('exit', (code) => reject(new Error(`dashboard exited early (${code})`)));
    });
    const { works } = await (await fetch(`${url}api/works`)).json();
    assert.equal(works[0].workId, 'demo-todo-api');
    const state = await (await fetch(`${url}api/state?work=demo-todo-api`)).json();
    assert.equal(state.state.agents.architect.status !== undefined, true);
  } finally {
    child.kill();
  }
});

test('dashboard CLI rejects an invalid port', async () => {
  const child = spawn('node', [CLI, 'dashboard', '--no-open', '--port', '99999'], { stdio: ['ignore', 'pipe', 'pipe'] });
  let stderr = '';
  child.stderr.on('data', (d) => (stderr += d));
  const code = await new Promise((resolve) => child.on('exit', resolve));
  assert.equal(code, 1);
  assert.match(stderr, /--port must be an integer/);
});
