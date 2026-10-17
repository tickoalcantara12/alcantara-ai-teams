import { mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { dirname, resolve, relative, isAbsolute } from 'node:path';
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
 * Initializes a project by installing into detected (or specified) targets and scaffolding
 * `.ai-team/.gitkeep` and `.gitignore`.
 */
export async function initProject({
  targets,
  dir = '.',
  force = false,
  dryRun = false,
  coreDir = DEFAULT_CORE_DIR,
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
