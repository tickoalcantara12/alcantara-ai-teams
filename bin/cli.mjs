#!/usr/bin/env node
import { resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { createInterface } from 'node:readline/promises';
import {
  install,
  uninstall,
  initProject,
  detectTargets,
  detectProjectInfo,
  parseTargetSelection,
  addMcpServers,
  removeMcpServers,
  listMcpServers,
  MCP_PRESETS,
} from '../src/install.mjs';
import { parseCliArgs, parseCliEnv } from '../src/mcp.mjs';
import { TARGETS } from '../src/targets.mjs';
import { appendEvent, AGENTS, EVENT_TYPES } from '../src/events.mjs';

const USAGE = `Usage:
  ai-dev-team init [--target <${Object.keys(TARGETS).join('|')}>] [--all] [--yes] [--dir <path>] [--force] [--dry-run]
  ai-dev-team install --target <${Object.keys(TARGETS).join('|')}> [--all] [--dir <path>] [--force] [--dry-run]
  ai-dev-team uninstall --target <${Object.keys(TARGETS).join('|')}> [--all] [--dir <path>] [--dry-run]
  ai-dev-team mcp add <server...> [--target <t>] [--all] [--command <cmd>] [--args <a,b>] [--env <K=V>] [--url <url>] [--dir <path>] [--force] [--dry-run]
  ai-dev-team mcp remove <server...> [--target <t>] [--all] [--dir <path>] [--dry-run]
  ai-dev-team mcp list [--presets] [--dir <path>]
  ai-dev-team event --work-id <id> --agent <role> --event <type> [--stage <s>] [--message <text>]
                    [--verdict <v>] [--loop <n>] [--to <role>] [--dir <path>]
  ai-dev-team status [--work-id <id>] [--dir <path>]
  ai-dev-team dashboard [--dir <path>] [--port <n>] [--no-open] [--demo]

Init / Install / Uninstall options:
  -t, --target        Tool to install/uninstall for (repeatable)
  -a, --all           Target all supported tools (${Object.keys(TARGETS).join(', ')})
  -y, --yes           Skip interactive prompts during init and use detected defaults
      --project       Project name & summary for .ai-team/constitution.md (init only)
      --stack         Technology stack for .ai-team/constitution.md (init only)
      --mcp           MCP servers / integrations (e.g. github, jira, postgres) (init only)
      --requirements  Additional project requirements / constraints (init only)
  -f, --force         Overwrite existing generated files (init/install/mcp add)
      --dry-run       Show what would change without writing

MCP options:
      --presets       List all built-in MCP server presets (${Object.keys(MCP_PRESETS).join(', ')})
      --command       Executable for a custom stdio MCP server
      --args          Arguments for --command (comma-separated or repeatable)
      --env           Environment variables for MCP server in KEY=VALUE format (repeatable)
      --url           Endpoint URL for a custom remote HTTP MCP server

Event options (append one status event to .ai-team/<work-id>/events.jsonl):
      --agent    ${AGENTS.join(' | ')}
      --event    ${EVENT_TYPES.join(' | ')}

Status options (inspect current work items from the terminal):
      --work-id  Work item to inspect (default: all active work items)

Dashboard options (read-only office view, served on 127.0.0.1 only):
      --port     Port to listen on (default 3021, 0 = any free port)
      --no-open  Do not open the browser automatically
      --demo     Show a scripted run instead of reading the project

Common:
  -d, --dir      Project directory (default: current directory)
  -h, --help     Show this help`;

const OPTIONS = {
  target: { type: 'string', short: 't', multiple: true },
  all: { type: 'boolean', short: 'a', default: false },
  yes: { type: 'boolean', short: 'y', default: false },
  project: { type: 'string' },
  stack: { type: 'string' },
  mcp: { type: 'string' },
  requirements: { type: 'string' },
  command: { type: 'string' },
  args: { type: 'string', multiple: true },
  env: { type: 'string', multiple: true },
  url: { type: 'string' },
  presets: { type: 'boolean', default: false },
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

const COMMANDS = ['init', 'install', 'uninstall', 'mcp', 'event', 'status', 'dashboard'];

async function main() {
  const { values, positionals } = parseArgs({ allowPositionals: true, options: OPTIONS });
  const command = positionals[0];

  if (values.help || !COMMANDS.includes(command)) {
    console.log(USAGE);
    process.exit(values.help ? 0 : 1);
  }
  if (command === 'init') return runInit(values);
  if (command === 'install') return runInstall(values);
  if (command === 'uninstall') return runUninstall(values);
  if (command === 'mcp') return runMcp(values, positionals.slice(1));
  if (command === 'event') return runEvent(values);
  if (command === 'status') return runStatus(values);
  return runDashboard(values);
}

async function promptWithDefault(rl, question, defaultValue) {
  const suffix = defaultValue ? ` [${defaultValue}]` : '';
  const ans = (await rl.question(`? ${question}${suffix}: `)).trim();
  return ans || defaultValue;
}

async function runInit(values) {
  const defaults = await detectProjectInfo(values.dir);
  const detectedTargets = await detectTargets(values.dir);
  let targets = values.all ? Object.keys(TARGETS) : values.target;
  let projectInfo = {
    project: values.project ?? defaults.project,
    techStack: values.stack ?? defaults.techStack,
    mcpServers: values.mcp ?? defaults.mcpServers,
    requirements: values.requirements ?? defaults.requirements,
    buildCmd: defaults.buildCmd,
    lintCmd: defaults.lintCmd,
    testCmd: defaults.testCmd,
  };

  if (process.stdin.isTTY && !values.yes) {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    try {
      console.log('\n--- AI Dev Team: Project Initialization ---');
      if (!targets?.length) {
        console.log('Which AI coding tool(s) will you use in this project?');
        console.log('  1) Antigravity (.agents)');
        console.log('  2) Claude Code (.claude + CLAUDE.md)');
        console.log('  3) Cursor (.cursor)');
        console.log('  4) All of the above');
        const targetAns = await promptWithDefault(
          rl,
          'Select tool(s) (1-4 or comma-separated)',
          detectedTargets.join(', '),
        );
        targets = parseTargetSelection(targetAns, detectedTargets);
      }
      projectInfo.project = await promptWithDefault(
        rl,
        'Project name & summary',
        projectInfo.project,
      );
      projectInfo.techStack = await promptWithDefault(
        rl,
        'Technology stack (languages, frameworks, database)',
        projectInfo.techStack,
      );
      projectInfo.mcpServers = await promptWithDefault(
        rl,
        'MCP servers / integrations (e.g. github, jira, gitlab, linear, postgres, sentry, none)',
        projectInfo.mcpServers,
      );
      projectInfo.requirements = await promptWithDefault(
        rl,
        'Other project requirements / constraints (e.g. auth, compliance, performance)',
        projectInfo.requirements,
      );
      projectInfo.buildCmd = await promptWithDefault(
        rl,
        'Build command',
        projectInfo.buildCmd,
      );
      projectInfo.lintCmd = await promptWithDefault(
        rl,
        'Lint / typecheck command',
        projectInfo.lintCmd,
      );
      projectInfo.testCmd = await promptWithDefault(
        rl,
        'Test command',
        projectInfo.testCmd,
      );
    } finally {
      rl.close();
    }
  }

  const { targets: installedTargets, results, workspace, mcp } = await initProject({
    targets,
    dir: values.dir,
    force: values.force,
    dryRun: values['dry-run'],
    projectInfo,
  });
  for (const target of installedTargets) {
    const report = results[target];
    console.log(`\n[${target}]${values['dry-run'] ? ' (dry run)' : ''}`);
    for (const p of report.written) console.log(`  + ${p}`);
    for (const p of report.updated) console.log(`  ~ ${p}`);
    for (const p of report.skipped) console.log(`  = ${p} (exists, use --force to overwrite)`);
  }
  console.log(`\n[workspace]${values['dry-run'] ? ' (dry run)' : ''}`);
  for (const p of workspace.written) console.log(`  + ${p}`);
  for (const p of workspace.updated) console.log(`  ~ ${p}`);
  for (const p of workspace.skipped) console.log(`  = ${p}`);
  if (mcp?.addedServers?.length) {
    console.log(`\n[mcp] configured: ${mcp.addedServers.join(', ')}`);
  }
  if (mcp?.unknown?.length) {
    console.log(
      `[mcp] noted in constitution only (no preset): ${mcp.unknown.join(', ')} (use "ai-dev-team mcp add <name> --command/--url" to configure)`,
    );
  }
}

async function runMcp(values, args) {
  const subcommand = args[0] ?? (values.presets ? 'list' : undefined);
  const serverArgs = args.slice(1);

  if (!subcommand || !['add', 'remove', 'list'].includes(subcommand)) {
    console.log(USAGE);
    process.exit(1);
  }

  const targets = values.all
    ? Object.keys(TARGETS)
    : values.target?.length
      ? values.target
      : await detectTargets(values.dir);

  if (subcommand === 'list') {
    const info = await listMcpServers({ dir: values.dir, targets });
    if (values.presets) {
      console.log('Built-in MCP server presets:');
      for (const [name, p] of Object.entries(info.presets)) {
        console.log(`  ${name.padEnd(20)} ${p.description}`);
      }
      return;
    }
    for (const [target, data] of Object.entries(info.configured)) {
      const names = Object.keys(data.servers);
      console.log(`\n[${target}] ${data.path}${data.exists ? '' : ' (not created)'}`);
      if (names.length === 0) {
        console.log('  (no MCP servers configured)');
      } else {
        for (const n of names) {
          const entry = data.servers[n];
          const detail = entry.url ? entry.url : [entry.command, ...(entry.args ?? [])].join(' ');
          console.log(`  - ${n}: ${detail}`);
        }
      }
    }
    console.log(`\nAvailable presets (${Object.keys(info.presets).length}): ${Object.keys(info.presets).join(', ')}`);
    return;
  }

  if (subcommand === 'add') {
    if (serverArgs.length === 0) {
      throw new Error('Specify at least one MCP server to add (e.g. "ai-dev-team mcp add github postgres")');
    }
    const hasCustom = Boolean(values.command || values.url);
    if (hasCustom && serverArgs.length > 1) {
      throw new Error('Custom --command / --url options can only be used when adding a single MCP server');
    }
    const custom = hasCustom
      ? {
          command: values.command,
          args: parseCliArgs(values.args),
          env: parseCliEnv(values.env),
          url: values.url,
        }
      : null;

    const report = await addMcpServers({
      targets,
      servers: serverArgs,
      custom,
      dir: values.dir,
      force: values.force,
      dryRun: values['dry-run'],
      updateConstitution: true,
    });
    console.log(`[mcp add]${values['dry-run'] ? ' (dry run)' : ''}`);
    for (const p of report.written) console.log(`  + ${p}`);
    for (const p of report.updated) console.log(`  ~ ${p}`);
    for (const p of report.skipped) console.log(`  = ${p} (unchanged, use --force to overwrite)`);
    return;
  }

  if (subcommand === 'remove') {
    if (serverArgs.length === 0) {
      throw new Error('Specify at least one MCP server to remove (e.g. "ai-dev-team mcp remove github")');
    }
    const report = await removeMcpServers({
      targets,
      servers: serverArgs,
      dir: values.dir,
      dryRun: values['dry-run'],
      updateConstitution: true,
    });
    console.log(`[mcp remove]${values['dry-run'] ? ' (dry run)' : ''}`);
    for (const p of report.removed) console.log(`  - ${p}`);
    for (const p of report.updated) console.log(`  ~ ${p}`);
    for (const p of report.skipped) console.log(`  = ${p}`);
  }
}

async function runInstall(values) {
  const targets = values.all ? Object.keys(TARGETS) : values.target;
  if (!targets?.length) {
    console.log(USAGE);
    process.exit(1);
  }
  for (const target of targets) {
    const report = await install({ target, dir: values.dir, force: values.force, dryRun: values['dry-run'] });
    console.log(`\n[${target}]${values['dry-run'] ? ' (dry run)' : ''}`);
    for (const p of report.written) console.log(`  + ${p}`);
    for (const p of report.updated) console.log(`  ~ ${p}`);
    for (const p of report.skipped) console.log(`  = ${p} (exists, use --force to overwrite)`);
  }
}

async function runUninstall(values) {
  const targets = values.all ? Object.keys(TARGETS) : values.target;
  if (!targets?.length) {
    console.log(USAGE);
    process.exit(1);
  }
  for (const target of targets) {
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
