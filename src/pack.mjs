import { readdir, readFile } from 'node:fs/promises';
import { join, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseFrontmatter } from './frontmatter.mjs';

export const DEFAULT_CORE_DIR = fileURLToPath(new URL('../core/', import.meta.url));

const REQUIRED = {
  roles: ['name', 'title', 'description', 'skill'],
  skills: ['name', 'description'],
  commands: ['name', 'description'],
};

export async function loadPack(coreDir = DEFAULT_CORE_DIR) {
  const [roles, skills, commands, templates, workflow, rules] = await Promise.all([
    loadDocs(join(coreDir, 'roles'), 'roles'),
    loadSkills(join(coreDir, 'skills')),
    loadDocs(join(coreDir, 'commands'), 'commands'),
    loadTemplates(join(coreDir, 'templates')),
    readFile(join(coreDir, 'workflow.md'), 'utf8'),
    readFile(join(coreDir, 'rules.md'), 'utf8'),
  ]);

  const skillNames = new Set(skills.map((s) => s.data.name));
  for (const role of roles) {
    if (!skillNames.has(role.data.skill)) {
      throw new Error(`Role "${role.data.name}" references unknown skill "${role.data.skill}"`);
    }
    role.skill = skills.find((s) => s.data.name === role.data.skill);
  }

  return { roles, skills, commands, templates, workflow, rules };
}

async function loadDocs(dir, kind) {
  const files = (await readdir(dir)).filter((f) => f.endsWith('.md')).sort();
  return Promise.all(files.map((f) => loadDoc(join(dir, f), kind)));
}

async function loadSkills(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const dirs = entries.filter((e) => e.isDirectory()).map((e) => e.name).sort();
  return Promise.all(dirs.map((d) => loadDoc(join(dir, d, 'SKILL.md'), 'skills')));
}

async function loadDoc(path, kind) {
  const { data, body } = parseFrontmatter(await readFile(path, 'utf8'));
  const missing = REQUIRED[kind].filter((key) => !data[key]);
  if (missing.length) {
    throw new Error(`${path}: missing frontmatter field(s): ${missing.join(', ')}`);
  }
  return { data, body, path };
}

async function loadTemplates(dir) {
  const files = (await readdir(dir)).filter((f) => f.endsWith('.md')).sort();
  return Promise.all(
    files.map(async (f) => ({ name: basename(f), content: await readFile(join(dir, f), 'utf8') })),
  );
}
