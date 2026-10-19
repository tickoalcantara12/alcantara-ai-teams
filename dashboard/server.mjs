import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { WORK_ID_PATTERN } from '../src/events.mjs';
import { reduceEvents } from './state.mjs';
import { createFileSource } from './source.mjs';
import { createDemoSource } from './demo.mjs';

export const DEFAULT_PORT = 3021;
const DEFAULT_PUBLIC_DIR = fileURLToPath(new URL('./public/', import.meta.url));
const ALLOWED_HOSTNAMES = new Set(['127.0.0.1', 'localhost', '[::1]']);
const MAX_STREAMS = 20;

const CONTENT_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
};

const SECURITY_HEADERS = {
  'Content-Security-Policy':
    "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'Cross-Origin-Resource-Policy': 'same-origin',
};

/**
 * Read-only dashboard server. It exposes GET endpoints only and serves static files from `publicDir`.
 */
export function createDashboardServer({
  source,
  publicDir = DEFAULT_PUBLIC_DIR,
  pollMs = 1000,
  pushMs = 10_000,
  heartbeatMs = 15_000,
  now = Date.now,
  onError = (err) => console.error(`dashboard: ${err.code ?? err.message}`),
}) {
  const root = resolve(publicDir);
  let openStreams = 0;

  const server = http.createServer((req, res) => {
    handle(req, res).catch((err) => {
      onError(err);
      if (!res.headersSent) sendJson(res, 500, { error: 'Internal server error' });
      else res.end();
    });
  });

  async function handle(req, res) {
    // Rejecting unexpected Host values stops DNS-rebinding pages from reading local project data.
    const hostname = (req.headers.host ?? '').replace(/:\d+$/, '').toLowerCase();
    if (!ALLOWED_HOSTNAMES.has(hostname)) return sendJson(res, 403, { error: 'Forbidden host' });
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.setHeader('Allow', 'GET, HEAD');
      return sendJson(res, 405, { error: 'Method not allowed' });
    }

    let url;
    try {
      url = new URL(req.url, 'http://localhost');
    } catch {
      return sendJson(res, 400, { error: 'Bad request' });
    }

    if (url.pathname === '/api/works') {
      return sendJson(res, 200, { works: await source.listWorks() });
    }
    if (url.pathname === '/api/state') {
      const workId = readWorkId(url, res);
      if (!workId) return undefined;
      const events = await source.readEvents(workId);
      if (events.length === 0) return sendJson(res, 404, { error: 'Work item not found' });
      return sendJson(res, 200, snapshot(events));
    }
    if (url.pathname === '/api/events') {
      const workId = readWorkId(url, res);
      if (!workId) return undefined;
      const rawLimit = url.searchParams.get('limit');
      const parsed = rawLimit === null ? 50 : Number.parseInt(rawLimit, 10);
      const limit = Number.isFinite(parsed) && parsed > 0 ? Math.min(parsed, 200) : 50;
      const events = await source.readEvents(workId);
      if (events.length === 0) return sendJson(res, 404, { error: 'Work item not found' });
      return sendJson(res, 200, { workId, events: events.slice(-limit).reverse() });
    }
    if (url.pathname === '/stream') {
      const workId = readWorkId(url, res);
      if (!workId) return undefined;
      return stream(req, res, workId);
    }
    return serveStatic(res, url.pathname);
  }

  function snapshot(events) {
    const t = now();
    return { state: reduceEvents(events, t), serverTime: new Date(t).toISOString() };
  }

  function stream(req, res, workId) {
    if (openStreams >= MAX_STREAMS) return sendJson(res, 503, { error: 'Too many open streams' });
    openStreams += 1;
    res.writeHead(200, {
      ...SECURITY_HEADERS,
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    });
    res.write('retry: 2000\n\n');

    let lastSignature = null;
    let lastPush = 0;
    let busy = false;

    const tick = async () => {
      if (busy) return;
      busy = true;
      try {
        const signature = await source.signature(workId);
        const t = now();
        // Periodic pushes let the page notice time-based changes (stale agents) without new events.
        if (signature !== lastSignature || t - lastPush >= pushMs) {
          const events = await source.readEvents(workId);
          res.write(`event: state\ndata: ${JSON.stringify(snapshot(events))}\n\n`);
          lastSignature = signature;
          lastPush = t;
        }
      } catch (err) {
        onError(err);
      } finally {
        busy = false;
      }
    };

    const poller = setInterval(tick, pollMs);
    const heartbeat = setInterval(() => res.write(': keep-alive\n\n'), heartbeatMs);
    req.on('close', () => {
      clearInterval(poller);
      clearInterval(heartbeat);
      openStreams -= 1;
    });
    return tick();
  }

  async function serveStatic(res, pathname) {
    let relative;
    try {
      relative = decodeURIComponent(pathname);
    } catch {
      return sendJson(res, 400, { error: 'Bad request' });
    }
    if (relative.includes('\0')) return sendJson(res, 400, { error: 'Bad request' });

    const target = resolve(root, `.${relative === '/' ? '/index.html' : relative}`);
    if (target !== root && !target.startsWith(root + sep)) return sendJson(res, 404, { error: 'Not found' });
    try {
      if (!(await stat(target)).isFile()) return sendJson(res, 404, { error: 'Not found' });
      const body = await readFile(target);
      res.writeHead(200, {
        ...SECURITY_HEADERS,
        'Content-Type': CONTENT_TYPES[extname(target).toLowerCase()] ?? 'application/octet-stream',
        'Cache-Control': 'no-store',
      });
      return res.end(body);
    } catch (err) {
      if (err.code === 'ENOENT' || err.code === 'ENOTDIR') return sendJson(res, 404, { error: 'Not found' });
      throw err;
    }
  }

  return server;
}

export async function startDashboard({ dir = '.', port = DEFAULT_PORT, demo = false, open = true, log = console.log }) {
  const source = demo ? createDemoSource() : createFileSource(resolve(dir));
  const server = createDashboardServer({ source });

  await new Promise((resolveListen, reject) => {
    server.once('error', (err) =>
      reject(err.code === 'EADDRINUSE' ? new Error(`Port ${port} is already in use. Try --port <other>.`) : err),
    );
    server.listen(port, '127.0.0.1', resolveListen);
  });

  const url = `http://127.0.0.1:${server.address().port}/`;
  log(demo ? `Dashboard (demo mode, scripted run): ${url}` : `Dashboard for ${resolve(dir)}: ${url}`);
  log('Read-only, listening on 127.0.0.1 only. Press Ctrl+C to stop.');
  if (open) openBrowser(url, log);
  return { server, url };
}

function openBrowser(url, log) {
  const [command, args] =
    process.platform === 'darwin'
      ? ['open', [url]]
      : process.platform === 'win32'
        ? ['cmd', ['/c', 'start', '', url]]
        : ['xdg-open', [url]];
  const child = spawn(command, args, { stdio: 'ignore', detached: true });
  child.on('error', () => log(`Could not open a browser automatically. Open ${url} yourself.`));
  child.unref();
}

function readWorkId(url, res) {
  const workId = url.searchParams.get('work') ?? '';
  if (!WORK_ID_PATTERN.test(workId)) {
    sendJson(res, 400, { error: 'Invalid or missing "work" parameter' });
    return null;
  }
  return workId;
}

function sendJson(res, status, body) {
  res.writeHead(status, {
    ...SECURITY_HEADERS,
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  res.end(JSON.stringify(body));
}
