#!/usr/bin/env node
import { resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { install, uninstall } from '../src/install.mjs';
import { TARGETS } from '../src/targets.mjs';
import { appendEvent, AGENTS, EVENT_TYPES } from '../src/events.mjs';

const USAGE = `Usage:
  ai-dev-team install --target <${Object.keys(TARGETS).join('|')}> [--dir <path>] [--force] [--dry-run]
  ai-dev-team uninstall --target <${Object.keys(TARGETS).join('|')}> [--dir <path>] [--dry-run]
  ai-dev-team event --work-id <id> --agent <role> --event <type> [--stage <s>] [--message <text>]
                    [--verdict <v>] [--loop <n>] [--to <role>] [--dir <path>]
  ai-dev-team status [--work-id <id>] [--dir <path>]
  ai-dev-team dashboard [--dir <path>] [--port <n>] [--no-open] [--demo]

Install / Uninstall options:
  -t, --target   Tool to install/uninstall for (repeatable)
  -f, --force    Overwrite existing generated files (install only)
      --dry-run  Show what would change without writing

Event options (append one status event to .ai-team/<work-id>/events.jsonl):
      --agent    ${AGENTS.join(' | ')}
      --event    ${EVENT_TYPES.join(' | ')}

Status options (inspect current work items from the terminal):
      --work-id  Work item to inspect (default: all active work items)

Dashboard options (read-only office view, served on 127.0.0.1 only):
      --port     Port to listen on (default 4173, 0 = any free port)
      --no-open  Do not open the browser automatically
      --demo     Show a scripted run instead of reading the project

Common:
  -d, --dir      Project directory (default: current directory)
  -h, --help     Show this help`;

const OPTIONS = {
  target: { type: 'string', short: 't', multiple: true },
  dir: { type: 'string', short: 'd', default: '.' },
  force: { type: 'boolean', short: 'f', default: false },
  'dry-run': { type: 'boolean', default: false },
  help: { type: 'boolean', short: 'h', default: false },
  'work-id': { type: 'string' },
  agent: { type: 'string' },
  event: { type: 'string' },
  stage: { type: 'string' },
  message: { type: 'string' },
  verdict: { type: 'string' },
  loop: { type: 'string' },
  to: { type: 'string' },
  port: { type: 'string' },
  'no-open': { type: 'boolean', default: false },
  demo: { type: 'boolean', default: false },
};

const COMMANDS = ['install', 'uninstall', 'event', 'status', 'dashboard'];

async function main() {
  const { values, positionals } = parseArgs({ allowPositionals: true, options: OPTIONS });
  const command = positionals[0];

  if (values.help || !COMMANDS.includes(command)) {
    console.log(USAGE);
    process.exit(values.help ? 0 : 1);
  }
  if (command === 'install') return runInstall(values);
  if (command === 'uninstall') return runUninstall(values);
  if (command === 'event') return runEvent(values);
  if (command === 'status') return runStatus(values);
  return runDashboard(values);
}

async function runInstall(values) {
  if (!values.target?.length) {
    console.log(USAGE);
    process.exit(1);
  }
  for (const target of values.target) {
    const report = await install({ target, dir: values.dir, force: values.force, dryRun: values['dry-run'] });
    console.log(`\n[${target}]${values['dry-run'] ? ' (dry run)' : ''}`);
    for (const p of report.written) console.log(`  + ${p}`);
    for (const p of report.updated) console.log(`  ~ ${p}`);
    for (const p of report.skipped) console.log(`  = ${p} (exists, use --force to overwrite)`);
  }
}

async function runUninstall(values) {
  if (!values.target?.length) {
    console.log(USAGE);
    process.exit(1);
  }
  for (const target of values.target) {
    const report = await uninstall({ target, dir: values.dir, dryRun: values['dry-run'] });
    console.log(`\n[${target}]${values['dry-run'] ? ' (dry run)' : ''}`);
    for (const p of report.removed) console.log(`  - ${p}`);
    for (const p of report.updated) console.log(`  ~ ${p}`);
  }
}

async function runEvent(values) {
  const loop = values.loop === undefined ? undefined : Number(values.loop);
  const event = await appendEvent(values.dir, {
    workId: values['work-id'],
    agent: values.agent,
    event: values.event,
    stage: values.stage,
    message: values.message,
    verdict: values.verdict,
    loop,
    to: values.to,
  });
  console.log(`event recorded: ${event.agent} ${event.event}${event.stage ? ` (${event.stage})` : ''}`);
}

async function runStatus(values) {
  const { createFileSource } = await import('../dashboard/source.mjs');
  const { reduceEvents } = await import('../dashboard/state.mjs');
  const source = createFileSource(resolve(values.dir));
  const workIds = values['work-id']
    ? [values['work-id']]
    : (await source.listWorks()).map((w) => w.workId);
  if (!workIds.length) {
    console.log('No work items found in .ai-team/');
    return;
  }
  for (const workId of workIds) {
    const events = await source.readEvents(workId);
    const state = reduceEvents(events);
    console.log(`\n[${workId}] stage=${state.stage ?? '-'} done=${state.done} events=${state.eventCount}`);
    for (const [role, a] of Object.entries(state.agents)) {
      const details = [
        a.status,
        a.stage ? `stage:${a.stage}` : null,
        a.loop ? `loop:${a.loop}` : null,
        a.verdict ? `verdict:${a.verdict}` : null,
        a.task ? `"${a.task}"` : null,
      ]
        .filter(Boolean)
        .join(' ');
      console.log(`  ${role.padEnd(12)} ${details}`);
    }
  }
}

async function runDashboard(values) {
  const port = values.port === undefined ? undefined : Number(values.port);
  if (port !== undefined && !(Number.isInteger(port) && port >= 0 && port <= 65535)) {
    throw new Error('--port must be an integer between 0 and 65535');
  }
  // Loaded on demand so install/event never pay for the dashboard.
  const { startDashboard } = await import('../dashboard/server.mjs');
  await startDashboard({ dir: values.dir, port, demo: values.demo, open: !values['no-open'] });
}

main().catch((err) => {
  console.error(`ai-dev-team: ${err.message}`);
  process.exit(1);
});
