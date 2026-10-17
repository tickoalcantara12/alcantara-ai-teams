import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, rm, access } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { install, uninstall, upsertBlock, removeBlock, BLOCK_START } from '../src/install.mjs';
import { loadPack } from '../src/pack.mjs';
import { parseFrontmatter, serializeFrontmatter } from '../src/frontmatter.mjs';

const ROLES = ['architect', 'implementer', 'reviewer', 'security', 'qa'];
const SKILLS = ['system-design', 'implement-task', 'code-review', 'security-assessment', 'test-verification'];
const COMMANDS = ['new-feature', 'bug-fix', 'review', 'review-pr', 'pr-feedback', 'spec'];
const SDD_TEMPLATES = ['spec.md', 'tasks.md', 'constitution.md', 'analysis.md', 'design.md'];

async function withTempDir(fn) {
  const dir = await mkdtemp(join(tmpdir(), 'ai-dev-team-'));
  try {
    await fn(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

const exists = (p) => access(p).then(() => true, () => false);

test('core pack loads with all roles, skills and commands', async () => {
  const pack = await loadPack();
  assert.deepEqual(pack.roles.map((r) => r.data.name).sort(), [...ROLES].sort());
  assert.deepEqual(pack.skills.map((s) => s.data.name).sort(), [...SKILLS].sort());
  assert.deepEqual(pack.commands.map((c) => c.data.name).sort(), [...COMMANDS].sort());
  for (const role of pack.roles) assert.ok(role.skill, `${role.data.name} has a skill`);
});

test('frontmatter round-trips values needing quotes and booleans', () => {
  const data = {
    name: 'x',
    'argument-hint': '[branch, path]',
    description: 'a: b # c',
    alwaysApply: true,
    disabled: false,
  };
  const { data: parsed, body } = parseFrontmatter(serializeFrontmatter(data, 'Body'));
  assert.deepEqual(parsed, data);
  assert.equal(typeof parsed.alwaysApply, 'boolean');
  assert.equal(typeof parsed.disabled, 'boolean');
  assert.equal(body, 'Body\n');
});

test('frontmatter rejects unterminated block', () => {
  assert.throws(() => parseFrontmatter('---\nname: x\n'), /Unterminated/);
});

test('every target tells agents to report status events and ships local event.mjs', async () => {
  const probes = {
    antigravity: ['.agents/skills/qa/SKILL.md', '.agents/workflows/new-feature.md', '.agents/ai-team/workflow.md', '.agents/ai-team/event.mjs'],
    'claude-code': ['.claude/agents/qa.md', '.claude/commands/new-feature.md', '.claude/ai-team/workflow.md', '.claude/ai-team/event.mjs'],
    cursor: ['.cursor/rules/ai-team-qa.mdc', '.cursor/commands/new-feature.md', '.cursor/ai-team/workflow.md', '.cursor/ai-team/event.mjs'],
  };
  for (const [target, files] of Object.entries(probes)) {
    await withTempDir(async (dir) => {
      await install({ target, dir });
      for (const f of files) {
        const text = await readFile(join(dir, f), 'utf8');
        if (f.endsWith('event.mjs')) {
          assert.ok(text.includes('events.jsonl'), `${target}: ${f} missing events.jsonl logic`);
        } else {
          assert.ok(text.includes('Report events'), `${target}: ${f} lacks event-reporting guidance`);
        }
      }
    });
  }
});

test('pack ships all spec-driven templates', async () => {
  const pack = await loadPack();
  const names = pack.templates.map((t) => t.name);
  for (const t of SDD_TEMPLATES) assert.ok(names.includes(t), `missing template ${t}`);
});

test('new-feature enforces both approval gates and spec/tasks artifacts', async () => {
  const pack = await loadPack();
  const cmd = pack.commands.find((c) => c.data.name === 'new-feature');
  for (const needle of ['Gate 1', 'Gate 2', 'spec.md', 'tasks.md', 'analysis.md', 'Spec sync']) {
    assert.ok(cmd.body.includes(needle), `new-feature missing "${needle}"`);
  }
  const spec = pack.commands.find((c) => c.data.name === 'spec');
  assert.ok(spec.body.includes('Gate 1'));
  assert.ok(!spec.body.includes('Gate 2'));
});

test('antigravity install writes role skills with inlined procedures, rules, workflows and AGENTS block', async () => {
  await withTempDir(async (dir) => {
    await install({ target: 'antigravity', dir });
    for (const n of [...ROLES, ...SKILLS]) {
      const { data } = parseFrontmatter(await readFile(join(dir, `.agents/skills/${n}/SKILL.md`), 'utf8'));
      assert.equal(data.name, n);
      assert.ok(data.description);
    }
    const archSkill = await readFile(join(dir, '.agents/skills/architect/SKILL.md'), 'utf8');
    assert.ok(archSkill.includes('\n---\n\n'), 'role skill should inline the role skill body');
    for (const c of COMMANDS) {
      const text = await readFile(join(dir, `.agents/workflows/${c}.md`), 'utf8');
      assert.ok(parseFrontmatter(text).data.description);
      assert.ok(!text.includes('$ARGUMENTS'));
      assert.ok(text.includes('## Execution'));
    }
    assert.ok(await exists(join(dir, '.agents/rules/ai-dev-team.md')));
    assert.ok((await readFile(join(dir, '.agents/AGENTS.md'), 'utf8')).includes(BLOCK_START));
    assert.ok(await exists(join(dir, '.agents/ai-team/templates/security-report.md')));
    assert.ok(await exists(join(dir, '.agents/ai-team/event.mjs')));
  });
});

test('claude-code install writes subagents with tools, skills and commands', async () => {
  await withTempDir(async (dir) => {
    await install({ target: 'claude-code', dir });
    for (const r of ROLES) {
      const { data } = parseFrontmatter(await readFile(join(dir, `.claude/agents/${r}.md`), 'utf8'));
      assert.equal(data.name, r);
      assert.ok(data.tools);
    }
    for (const s of SKILLS) assert.ok(await exists(join(dir, `.claude/skills/${s}/SKILL.md`)));
    const review = await readFile(join(dir, '.claude/commands/review.md'), 'utf8');
    assert.ok(review.includes('$ARGUMENTS'));
    assert.equal(parseFrontmatter(review).data['argument-hint'].startsWith('['), true);
    assert.ok(await exists(join(dir, 'CLAUDE.md')));
  });
});

test('cursor install writes role rules, core rule and commands', async () => {
  await withTempDir(async (dir) => {
    await install({ target: 'cursor', dir });
    for (const r of ROLES) assert.ok(await exists(join(dir, `.cursor/rules/ai-team-${r}.mdc`)));
    const core = parseFrontmatter(await readFile(join(dir, '.cursor/rules/ai-team-core.mdc'), 'utf8'));
    assert.equal(core.data.alwaysApply, true);
    for (const c of COMMANDS) assert.ok(await exists(join(dir, `.cursor/commands/${c}.md`)));
  });
});

test('existing files are skipped without --force and overwritten with it', async () => {
  await withTempDir(async (dir) => {
    await install({ target: 'claude-code', dir });
    const file = join(dir, '.claude/agents/qa.md');
    await writeFile(file, 'custom');
    const second = await install({ target: 'claude-code', dir });
    assert.ok(second.skipped.includes('.claude/agents/qa.md'));
    assert.equal(await readFile(file, 'utf8'), 'custom');
    await install({ target: 'claude-code', dir, force: true });
    assert.notEqual(await readFile(file, 'utf8'), 'custom');
  });
});

test('managed block preserves user content and is idempotent', async () => {
  await withTempDir(async (dir) => {
    const claudeMd = join(dir, 'CLAUDE.md');
    await writeFile(claudeMd, '# My project rules\n');
    await install({ target: 'claude-code', dir });
    const once = await readFile(claudeMd, 'utf8');
    await install({ target: 'claude-code', dir });
    const twice = await readFile(claudeMd, 'utf8');
    assert.ok(once.startsWith('# My project rules'));
    assert.equal(once, twice);
    assert.equal(once.split(BLOCK_START).length, 2);
  });
});

test('upsertBlock replaces an existing block in place and removeBlock strips it cleanly', () => {
  const first = upsertBlock('top\n', 'v1');
  const second = upsertBlock(`${first}bottom\n`, 'v2');
  assert.ok(second.includes('v2') && !second.includes('v1'));
  assert.ok(second.startsWith('top') && second.trimEnd().endsWith('bottom'));
  assert.equal(removeBlock(second), 'top\n\nbottom\n');
  assert.equal(removeBlock(upsertBlock('', 'v1')), '');
});

test('uninstall removes generated files and preserves user content in shared block files', async () => {
  await withTempDir(async (dir) => {
    const claudeMd = join(dir, 'CLAUDE.md');
    await writeFile(claudeMd, '# My project rules\n');
    await install({ target: 'claude-code', dir });
    const report = await uninstall({ target: 'claude-code', dir });
    assert.ok(report.removed.includes('.claude/agents/architect.md'));
    assert.ok(report.updated.includes('CLAUDE.md'));
    assert.equal(await exists(join(dir, '.claude/agents/architect.md')), false);
    assert.equal(await readFile(claudeMd, 'utf8'), '# My project rules\n');
  });
});

test('dry run writes nothing', async () => {
  await withTempDir(async (dir) => {
    const report = await install({ target: 'cursor', dir, dryRun: true });
    assert.ok(report.written.length > 0);
    assert.equal(await exists(join(dir, '.cursor')), false);
  });
});

test('unknown target is rejected', async () => {
  await assert.rejects(install({ target: 'vim', dir: '.' }), /Unknown target/);
  await assert.rejects(uninstall({ target: 'vim', dir: '.' }), /Unknown target/);
});
