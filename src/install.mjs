import { mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { basename, dirname, resolve, relative, isAbsolute } from 'node:path';
import { loadPack, DEFAULT_CORE_DIR } from './pack.mjs';
import { TARGETS } from './targets.mjs';

export const BLOCK_START = '<!-- ai-dev-team:start -->';
export const BLOCK_END = '<!-- ai-dev-team:end -->';

export const TARGET_DIRS = {
  antigravity: '.agents',
  'claude-code': '.claude',
  cursor: '.cursor',
};

const GITIGNORE_ENTRY = '.ai-team/**/events.jsonl';

/**
 * Detects which target tool directories (.agents, .claude, .cursor) already exist in `dir`.
 * Returns detected target names in canonical order, or all targets if none exist.
 */
export async function detectTargets(dir = '.') {
  const root = resolve(dir);
  const found = [];
  for (const [target, folder] of Object.entries(TARGET_DIRS)) {
    try {
      const s = await stat(resolve(root, folder));
      if (s.isDirectory()) found.push(target);
    } catch {
      // Directory does not exist
    }
  }
  return found.length > 0 ? found : Object.keys(TARGETS);
}

/**
 * Parses an interactive target selection string (e.g. "1,2", "antigravity", "4", "all", or "")
 * into a validated list of target names.
 */
export function parseTargetSelection(input, defaultTargets = Object.keys(TARGETS)) {
  const raw = String(input ?? '').trim();
  if (!raw) return [...defaultTargets];
  const allTargets = Object.keys(TARGETS);
  const indexMap = { '1': 'antigravity', '2': 'claude-code', '3': 'cursor' };
  const tokens = raw.split(/[\s,]+/).map((t) => t.toLowerCase()).filter(Boolean);
  if (tokens.includes('4') || tokens.includes('all')) return allTargets;

  const selected = [];
  for (const token of tokens) {
    const mapped = indexMap[token] ?? token;
    if (!TARGETS[mapped]) {
      throw new Error(`Invalid target selection "${token}". Choose 1-4 or ${allTargets.join(', ')}`);
    }
    if (!selected.includes(mapped)) selected.push(mapped);
  }
  return selected.length > 0 ? selected : [...defaultTargets];
}

/**
 * Inspects a project directory to suggest default answers for the interactive init wizard.
 */
export async function detectProjectInfo(dir = '.') {
  const root = resolve(dir);
  let project = basename(root) || 'project';
  const stackParts = [];
  let buildCmd = 'none';
  let lintCmd = 'none';
  let testCmd = 'npm test';

  const pkgRaw = await readOptional(resolve(root, 'package.json'));
  if (pkgRaw) {
    try {
      const pkg = JSON.parse(pkgRaw);
      if (pkg.name) {
        project = pkg.description ? `${pkg.name} — ${pkg.description}` : pkg.name;
      }
      stackParts.push('Node.js');
      const deps = { ...pkg.dependencies, ...pkg.devDependencies };
      if (deps.typescript || (await readOptional(resolve(root, 'tsconfig.json'))) !== null) {
        stackParts.push('TypeScript');
      } else {
        stackParts.push('JavaScript');
      }
      for (const fw of ['next', 'react', 'vue', 'svelte', 'express', 'fastify', 'nestjs', '@nestjs/core', 'prisma', 'drizzle-orm']) {
        if (deps[fw]) stackParts.push(fw.replace('@nestjs/core', 'NestJS'));
      }
      const scripts = pkg.scripts ?? {};
      if (scripts.build) buildCmd = 'npm run build';
      if (scripts.lint && scripts.typecheck) lintCmd = 'npm run lint && npm run typecheck';
      else if (scripts.lint) lintCmd = 'npm run lint';
      else if (scripts.typecheck) lintCmd = 'npm run typecheck';
      if (scripts.test) testCmd = 'npm test';
    } catch {
      // Ignore malformed package.json
    }
  } else if ((await readOptional(resolve(root, 'pyproject.toml'))) !== null || (await readOptional(resolve(root, 'requirements.txt'))) !== null) {
    stackParts.push('Python');
    lintCmd = 'ruff check .';
    testCmd = 'pytest';
  } else if ((await readOptional(resolve(root, 'go.mod'))) !== null) {
    stackParts.push('Go');
    buildCmd = 'go build ./...';
    lintCmd = 'go vet ./...';
    testCmd = 'go test ./...';
  } else if ((await readOptional(resolve(root, 'Cargo.toml'))) !== null) {
    stackParts.push('Rust');
    buildCmd = 'cargo build';
    lintCmd = 'cargo clippy';
    testCmd = 'cargo test';
  }

  return {
    project,
    techStack: stackParts.length > 0 ? stackParts.join(', ') : 'Not specified',
    mcpServers: 'github',
    requirements: 'None specified',
    buildCmd,
    lintCmd,
    testCmd,
  };
}

/**
 * Renders `.ai-team/constitution.md` from user-provided or detected project metadata.
 */
export function renderConstitution(info = {}) {
  const date = info.date ?? new Date().toISOString().slice(0, 10);
  const project = info.project?.trim() || 'Not specified';
  const techStack = info.techStack?.trim() || 'Not specified';
  const mcpServers = info.mcpServers?.trim() || 'none';
  const requirements = info.requirements?.trim() || 'None specified';
  const buildCmd = info.buildCmd?.trim() || 'none';
  const lintCmd = info.lintCmd?.trim() || 'none';
  const testCmd = info.testCmd?.trim() || 'none';

  const reqLines = requirements
    .split(/\r?\n|;/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => (s.startsWith('- ') ? s : `- ${s}`))
    .join('\n');

  return `# Project Constitution

Non-negotiable principles and context for this project. Every spec, design and task is checked against this file. Changing a principle needs explicit user approval and a version bump.

- **Version:** 1.0 · **Last amended:** ${date}

## Project Overview
- **Project:** ${project}
- **Technology Stack:** ${techStack}
- **MCP Servers & Integrations:** ${mcpServers}

## Principles
Draft defaults — adjust for this project. Each principle should be testable.

1. **Simplicity first.** Smallest change that solves the problem; no speculative abstraction.
2. **Follow existing conventions.** Reuse the project's patterns, utilities and structure.
3. **Test-first.** New behavior starts with a failing test; no merging with failing or weakened tests.
4. **Secure by default.** Validate external input, enforce authorization, never hardcode or log secrets.
5. **Explicit errors.** Handle expected errors explicitly; no silent failure.
6. **Backward compatible.** Breaking changes to APIs, data or behavior need explicit approval and a migration path.
7. **Dependencies are a cost.** Add one only with a stated reason.

## Project-specific principles
<!-- e.g. accessibility level, supported platforms, performance budgets, compliance rules, code ownership -->
${reqLines || '- None specified'}

## Quality gates
- Build: \`${buildCmd}\`
- Lint / types: \`${lintCmd}\`
- Tests: \`${testCmd}\`
`;
}

/**
 * Initializes a project by installing into detected (or specified) targets and scaffolding
 * `.ai-team/.gitkeep`, `.ai-team/constitution.md` (when `projectInfo` is provided), and `.gitignore`.
 */
export async function initProject({
  targets,
  dir = '.',
  force = false,
  dryRun = false,
  coreDir = DEFAULT_CORE_DIR,
  projectInfo = null,
} = {}) {
  const resolvedTargets = targets?.length ? targets : await detectTargets(dir);
  const results = {};
  for (const target of resolvedTargets) {
    results[target] = await install({ target, dir, force, dryRun, coreDir });
  }

  const root = resolve(dir);
  const workspace = { written: [], updated: [], skipped: [] };

  const gitkeepAbs = resolve(root, '.ai-team/.gitkeep');
  const existingGitkeep = await readOptional(gitkeepAbs);
  if (existingGitkeep === null) {
    workspace.written.push('.ai-team/.gitkeep');
    if (!dryRun) await writeFileEnsured(gitkeepAbs, '');
  } else {
    workspace.skipped.push('.ai-team/.gitkeep');
  }

  if (projectInfo) {
    const constitutionAbs = resolve(root, '.ai-team/constitution.md');
    const existingConstitution = await readOptional(constitutionAbs);
    const content = renderConstitution(projectInfo);
    if (existingConstitution === null) {
      workspace.written.push('.ai-team/constitution.md');
      if (!dryRun) await writeFileEnsured(constitutionAbs, content);
    } else if (force) {
      workspace.updated.push('.ai-team/constitution.md');
      if (!dryRun) await writeFileEnsured(constitutionAbs, content);
    } else {
      workspace.skipped.push('.ai-team/constitution.md');
    }
  }

  const gitignoreAbs = resolve(root, '.gitignore');
  const existingGitignore = await readOptional(gitignoreAbs);
  if (existingGitignore === null) {
    workspace.written.push('.gitignore');
    if (!dryRun) await writeFileEnsured(gitignoreAbs, `${GITIGNORE_ENTRY}\n`);
  } else if (existingGitignore.split(/\r?\n/).some((line) => line.trim() === GITIGNORE_ENTRY)) {
    workspace.skipped.push('.gitignore');
  } else {
    workspace.updated.push('.gitignore');
    const prefix = existingGitignore.length > 0 && !existingGitignore.endsWith('\n')
      ? `${existingGitignore}\n`
      : existingGitignore;
    if (!dryRun) await writeFileEnsured(gitignoreAbs, `${prefix}${GITIGNORE_ENTRY}\n`);
  }

  return { targets: resolvedTargets, results, workspace };
}

/**
 * Installs the pack into a project. Existing standalone files are skipped unless `force`
 * is set, so user-customized agents are never overwritten silently.
 */
export async function install({ target, dir = '.', force = false, dryRun = false, coreDir = DEFAULT_CORE_DIR }) {
  const build = TARGETS[target];
  if (!build) {
    throw new Error(`Unknown target "${target}". Valid targets: ${Object.keys(TARGETS).join(', ')}`);
  }
  const root = resolve(dir);
  const pack = await loadPack(coreDir);
  const report = { written: [], skipped: [], updated: [] };

  for (const file of build(pack)) {
    const abs = resolve(root, file.path);
    const rel = relative(root, abs);
    if (rel.startsWith('..') || isAbsolute(rel)) {
      throw new Error(`Refusing to write outside project root: ${file.path}`);
    }
    const existing = await readOptional(abs);

    if (file.mode === 'block') {
      const next = upsertBlock(existing ?? '', file.content);
      if (next === existing) {
        report.skipped.push(file.path);
        continue;
      }
      (existing === null ? report.written : report.updated).push(file.path);
      if (!dryRun) await writeFileEnsured(abs, next);
      continue;
    }

    if (existing !== null && !force) {
      report.skipped.push(file.path);
      continue;
    }
    (existing === null ? report.written : report.updated).push(file.path);
    if (!dryRun) await writeFileEnsured(abs, file.content);
  }
  return report;
}

/**
 * Removes generated pack files for a target and strips managed blocks from shared files.
 */
export async function uninstall({ target, dir = '.', dryRun = false, coreDir = DEFAULT_CORE_DIR }) {
  const build = TARGETS[target];
  if (!build) {
    throw new Error(`Unknown target "${target}". Valid targets: ${Object.keys(TARGETS).join(', ')}`);
  }
  const root = resolve(dir);
  const pack = await loadPack(coreDir);
  const report = { removed: [], updated: [], missing: [] };

  for (const file of build(pack)) {
    const abs = resolve(root, file.path);
    const rel = relative(root, abs);
    if (rel.startsWith('..') || isAbsolute(rel)) {
      throw new Error(`Refusing to modify outside project root: ${file.path}`);
    }
    const existing = await readOptional(abs);
    if (existing === null) {
      report.missing.push(file.path);
      continue;
    }

    if (file.mode === 'block') {
      const next = removeBlock(existing);
      if (next === existing) {
        report.missing.push(file.path);
        continue;
      }
      if (!next) {
        report.removed.push(file.path);
        if (!dryRun) await rm(abs, { force: true });
      } else {
        report.updated.push(file.path);
        if (!dryRun) await writeFileEnsured(abs, next);
      }
      continue;
    }

    report.removed.push(file.path);
    if (!dryRun) await rm(abs, { force: true });
  }
  return report;
}

export function upsertBlock(existing, content) {
  const block = `${BLOCK_START}\n${content.trimEnd()}\n${BLOCK_END}`;
  const start = existing.indexOf(BLOCK_START);
  const end = existing.indexOf(BLOCK_END);
  if (start !== -1 && end > start) {
    return existing.slice(0, start) + block + existing.slice(end + BLOCK_END.length);
  }
  if (!existing.trim()) return `${block}\n`;
  return `${existing.trimEnd()}\n\n${block}\n`;
}

export function removeBlock(existing) {
  const start = existing.indexOf(BLOCK_START);
  const end = existing.indexOf(BLOCK_END);
  if (start === -1 || end <= start) return existing;
  const before = existing.slice(0, start).trimEnd();
  const after = existing.slice(end + BLOCK_END.length).replace(/^\n+/, '').trimEnd();
  if (!before && !after) return '';
  if (before && after) return `${before}\n\n${after}\n`;
  return `${before || after}\n`;
}

async function readOptional(path) {
  try {
    return await readFile(path, 'utf8');
  } catch (err) {
    if (err.code === 'ENOENT') return null;
    throw err;
  }
}

async function writeFileEnsured(path, content) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, content, 'utf8');
}
