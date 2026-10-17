import { serializeFrontmatter } from './frontmatter.mjs';

// Each builder returns a list of { path, content, mode } relative to the project root.
// mode "file" = standalone generated file; mode "block" = managed section inside a shared file.

const EVENT_RUNNER_SCRIPT = `#!/usr/bin/env node
import { appendFile, mkdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { parseArgs } from 'node:util';

const AGENTS = ['architect', 'implementer', 'reviewer', 'security', 'qa'];
const EVENT_TYPES = ['started', 'progress', 'handoff', 'gate_waiting', 'gate_approved', 'verdict', 'loop', 'escalated', 'done'];
const VERDICTS = ['APPROVED', 'CHANGES_REQUESTED', 'CLEARED', 'BLOCKED', 'PASS', 'FAIL', 'CONSISTENT', 'GAPS_FOUND'];
const WORK_ID_PATTERN = /^[a-z0-9][a-z0-9-]{0,63}$/;
const STAGE_PATTERN = /^[a-z0-9][a-z0-9-]{0,31}$/;
const REQUIRED_BY_TYPE = { handoff: ['to'], verdict: ['verdict'], loop: ['loop'] };

const { values } = parseArgs({
  allowPositionals: true,
  options: {
    'work-id': { type: 'string' },
    agent: { type: 'string' },
    event: { type: 'string' },
    stage: { type: 'string' },
    message: { type: 'string' },
    verdict: { type: 'string' },
    loop: { type: 'string' },
    to: { type: 'string' },
    dir: { type: 'string', short: 'd', default: '.' },
  },
});

const workId = values['work-id'];
const agent = values.agent;
const event = values.event;
const stage = values.stage;
const verdict = values.verdict;
const loop = values.loop === undefined ? undefined : Number(values.loop);
const to = values.to;
const rawMessage = values.message;

if (typeof workId !== 'string' || !WORK_ID_PATTERN.test(workId)) throw new Error('workId must match ^[a-z0-9][a-z0-9-]{0,63}$');
if (!AGENTS.includes(agent)) throw new Error(\`agent must be one of: \${AGENTS.join(', ')}\`);
if (!EVENT_TYPES.includes(event)) throw new Error(\`event must be one of: \${EVENT_TYPES.join(', ')}\`);
if (stage !== undefined && !STAGE_PATTERN.test(stage)) throw new Error('stage must match ^[a-z0-9][a-z0-9-]{0,31}$');
if (verdict !== undefined && !VERDICTS.includes(verdict)) throw new Error(\`verdict must be one of: \${VERDICTS.join(', ')}\`);
if (loop !== undefined && !(Number.isInteger(loop) && loop >= 1 && loop <= 99)) throw new Error('loop must be an integer between 1 and 99');
if (to !== undefined && !AGENTS.includes(to)) throw new Error(\`to must be one of: \${AGENTS.join(', ')}\`);

const record = { ts: new Date().toISOString(), workId, agent, event };
if (stage !== undefined) record.stage = stage;
if (rawMessage !== undefined) {
  const cleaned = rawMessage.replace(/[\\u0000-\\u001f\\u007f]+/g, ' ').trim();
  record.message = cleaned.length > 300 ? \`\${cleaned.slice(0, 299)}…\` : cleaned;
}
if (verdict !== undefined) record.verdict = verdict;
if (loop !== undefined) record.loop = loop;
if (to !== undefined) record.to = to;

for (const field of REQUIRED_BY_TYPE[event] ?? []) {
  if (record[field] === undefined) throw new Error(\`event "\${event}" requires "\${field}"\`);
}

const file = join(resolve(values.dir), '.ai-team', workId, 'events.jsonl');
await mkdir(join(file, '..'), { recursive: true });
await appendFile(file, \`\${JSON.stringify(record)}\\n\`, 'utf8');
console.log(\`event recorded: \${record.agent} \${record.event}\${record.stage ? \` (\${record.stage})\` : ''}\`);
`;

function supportFiles(baseDir, pack) {
  return [
    { path: `${baseDir}/workflow.md`, content: pack.workflow, mode: 'file' },
    { path: `${baseDir}/event.mjs`, content: EVENT_RUNNER_SCRIPT, mode: 'file' },
    ...pack.templates.map((t) => ({
      path: `${baseDir}/templates/${t.name}`,
      content: t.content,
      mode: 'file',
    })),
  ];
}

function contextFooter(baseDir) {
  return `\n\n## Pack resources\n- Workflow: \`${baseDir}/workflow.md\`\n- Event helper: \`node ${baseDir}/event.mjs\` (or \`npx ai-dev-team event\`)\n- Templates: \`${baseDir}/templates/\`\n- Artifacts: \`.ai-team/<work-id>/\`\n- Status reporting: follow "Report events" in \`${baseDir}/workflow.md\` using \`node ${baseDir}/event.mjs\` (or \`npx ai-dev-team event\`, agent name = your role name)\n`;
}

function rulesBlock(pack, baseDir) {
  return `# AI Dev Team\n\n${pack.rules.trim()}\n\nFull workflow: \`${baseDir}/workflow.md\`.\n`;
}

function antigravity(pack) {
  const base = '.agents/ai-team';
  const footer = contextFooter(base);
  const delegation =
    '\n\n## Execution\nDelegate each stage to a subagent (or activate the matching role skill: `architect`, `implementer`, `reviewer`, `security`, `qa`) and pass the work id and `.ai-team/<work-id>/` artifact paths between them.\n';
  return [
    ...pack.roles.map((r) => ({
      path: `.agents/skills/${r.data.name}/SKILL.md`,
      content: serializeFrontmatter(
        { name: r.data.name, description: r.data.description },
        `${r.body}\n\n---\n\n${r.skill.body}${footer}`,
      ),
      mode: 'file',
    })),
    ...pack.skills.map((s) => ({
      path: `.agents/skills/${s.data.name}/SKILL.md`,
      content: serializeFrontmatter({ name: s.data.name, description: s.data.description }, s.body + footer),
      mode: 'file',
    })),
    ...pack.commands.map((c) => ({
      path: `.agents/workflows/${c.data.name}.md`,
      content: serializeFrontmatter(
        { description: c.data.description },
        c.body.replaceAll('$ARGUMENTS', "the user's request") + delegation + footer,
      ),
      mode: 'file',
    })),
    ...supportFiles(base, pack),
    { path: '.agents/rules/ai-dev-team.md', content: rulesBlock(pack, base), mode: 'file' },
    { path: '.agents/AGENTS.md', content: rulesBlock(pack, base), mode: 'block' },
  ];
}

function claudeCode(pack) {
  const base = '.claude/ai-team';
  const footer = contextFooter(base);
  const delegation =
    '\n\n## Execution\nDelegate each stage to the matching subagent (`architect`, `implementer`, `reviewer`, `security`, `qa`) and pass the work id and artifact paths between them.\n';
  return [
    ...pack.roles.map((r) => ({
      path: `.claude/agents/${r.data.name}.md`,
      content: serializeFrontmatter(
        { name: r.data.name, description: r.data.description, tools: r.data.tools },
        r.body + footer,
      ),
      mode: 'file',
    })),
    ...pack.skills.map((s) => ({
      path: `.claude/skills/${s.data.name}/SKILL.md`,
      content: serializeFrontmatter({ name: s.data.name, description: s.data.description }, s.body + footer),
      mode: 'file',
    })),
    ...pack.commands.map((c) => ({
      path: `.claude/commands/${c.data.name}.md`,
      content: serializeFrontmatter(
        { description: c.data.description, 'argument-hint': c.data['argument-hint'] },
        c.body + delegation + footer,
      ),
      mode: 'file',
    })),
    ...supportFiles(base, pack),
    { path: 'CLAUDE.md', content: rulesBlock(pack, base), mode: 'block' },
  ];
}

function cursor(pack) {
  const base = '.cursor/ai-team';
  const footer = contextFooter(base);
  return [
    ...pack.roles.map((r) => ({
      path: `.cursor/rules/ai-team-${r.data.name}.mdc`,
      content: serializeFrontmatter(
        { description: r.data.description, alwaysApply: false },
        `${r.body}\n\n---\n\n${r.skill.body}${footer}`,
      ),
      mode: 'file',
    })),
    {
      path: '.cursor/rules/ai-team-core.mdc',
      content: serializeFrontmatter(
        { description: 'AI Dev Team shared engineering rules', alwaysApply: true },
        rulesBlock(pack, base),
      ),
      mode: 'file',
    },
    ...pack.commands.map((c) => ({
      path: `.cursor/commands/${c.data.name}.md`,
      content: c.body.replaceAll('$ARGUMENTS', "the user's request") + footer,
      mode: 'file',
    })),
    ...supportFiles(base, pack),
  ];
}

export const TARGETS = { antigravity, 'claude-code': claudeCode, cursor };
