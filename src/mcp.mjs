import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, isAbsolute, relative, resolve } from 'node:path';
import { TARGETS } from './targets.mjs';

export const TARGET_MCP_PATHS = {
  antigravity: '.agents/mcp_config.json',
  'claude-code': '.mcp.json',
  cursor: '.cursor/mcp.json',
};

const SERVER_NAME_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,63}$/;
const IGNORED_MCP_TOKENS = new Set(['none', 'n/a', 'na', 'no', 'null', 'false', '-']);

/**
 * Built-in MCP server presets. Credentials always use environment variable placeholders
 * so secrets are never hardcoded or committed into repository files.
 */
export const MCP_PRESETS = {
  github: {
    description: 'GitHub repositories, issues, pull requests, and actions',
    config: {
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-github'],
      env: {
        GITHUB_PERSONAL_ACCESS_TOKEN: '${GITHUB_PERSONAL_ACCESS_TOKEN}',
      },
    },
  },
  gitlab: {
    description: 'GitLab repositories, merge requests, issues, and pipelines',
    config: {
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-gitlab'],
      env: {
        GITLAB_PERSONAL_ACCESS_TOKEN: '${GITLAB_PERSONAL_ACCESS_TOKEN}',
        GITLAB_API_URL: '${GITLAB_API_URL}',
      },
    },
  },
  linear: {
    description: 'Linear issue tracking, projects, and cycles',
    config: {
      command: 'npx',
      args: ['-y', 'mcp-remote', 'https://mcp.linear.app/mcp'],
      env: {
        LINEAR_API_KEY: '${LINEAR_API_KEY}',
      },
    },
  },
  jira: {
    description: 'Atlassian Jira issues, sprints, and projects',
    config: {
      command: 'npx',
      args: ['-y', '@aashari/mcp-server-atlassian-jira'],
      env: {
        ATLASSIAN_SITE_NAME: '${ATLASSIAN_SITE_NAME}',
        ATLASSIAN_USER_EMAIL: '${ATLASSIAN_USER_EMAIL}',
        ATLASSIAN_API_TOKEN: '${ATLASSIAN_API_TOKEN}',
      },
    },
  },
  postgres: {
    description: 'PostgreSQL read-only schema inspection and querying',
    config: {
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-postgres', '${DATABASE_URL}'],
    },
  },
  sqlite: {
    description: 'SQLite local database inspection and querying',
    config: {
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-sqlite', './database.sqlite'],
    },
  },
  redis: {
    description: 'Redis key-value inspection and operations',
    config: {
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-redis', '${REDIS_URL}'],
    },
  },
  supabase: {
    description: 'Supabase projects, Postgres database, and edge functions',
    config: {
      command: 'npx',
      args: ['-y', '@supabase/mcp-server-supabase@latest', '--access-token', '${SUPABASE_ACCESS_TOKEN}'],
    },
  },
  playwright: {
    description: 'Playwright browser automation and end-to-end testing',
    config: {
      command: 'npx',
      args: ['-y', '@playwright/mcp@latest'],
    },
  },
  sentry: {
    description: 'Sentry error tracking, stack traces, and release health',
    config: {
      command: 'npx',
      args: ['-y', '@sentry/mcp-server@latest'],
      env: {
        SENTRY_AUTH_TOKEN: '${SENTRY_AUTH_TOKEN}',
      },
    },
  },
  context7: {
    description: 'Up-to-date library and framework documentation via Context7',
    config: {
      command: 'npx',
      args: ['-y', '@upstash/context7-mcp@latest'],
    },
  },
  filesystem: {
    description: 'Local workspace filesystem access',
    config: {
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-filesystem', '.'],
    },
  },
  fetch: {
    description: 'Web page fetching and Markdown conversion',
    config: {
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-fetch'],
    },
  },
  memory: {
    description: 'Persistent knowledge-graph memory across sessions',
    config: {
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-memory'],
    },
  },
  'sequential-thinking': {
    description: 'Structured step-by-step reasoning and problem decomposition',
    config: {
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-sequential-thinking'],
    },
  },
};

/**
 * Parses a comma-, semicolon-, or whitespace-separated MCP server list into normalized tokens.
 * Filters out sentinel values like "none" or "n/a".
 */
export function parseMcpServerList(input) {
  if (!input) return [];
  const raw = Array.isArray(input) ? input.join(',') : String(input);
  const seen = new Set();
  const result = [];
  for (const part of raw.split(/[\s,;]+/)) {
    const token = part.trim().toLowerCase();
    if (!token || IGNORED_MCP_TOKENS.has(token)) continue;
    if (!seen.has(token)) {
      seen.add(token);
      result.push(token);
    }
  }
  return result;
}

/**
 * Validates an MCP server identifier.
 */
export function validateServerName(name) {
  if (typeof name !== 'string' || !SERVER_NAME_PATTERN.test(name)) {
    throw new Error(
      `Invalid MCP server name "${name}". Must match ^[a-zA-Z0-9][a-zA-Z0-9_-]{0,63}$`,
    );
  }
  return name;
}

/**
 * Builds an MCP server config object from a preset name or explicit custom options.
 */
export function resolveMcpServerEntry(name, custom = null) {
  validateServerName(name);

  if (custom && (custom.command || custom.url)) {
    if (custom.command && custom.url) {
      throw new Error(`MCP server "${name}" cannot specify both --command and --url`);
    }
    if (custom.url) {
      let parsed;
      try {
        parsed = new URL(custom.url);
      } catch {
        throw new Error(`Invalid MCP server URL "${custom.url}". Must be a valid http(s) URL`);
      }
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        throw new Error(`Invalid MCP server URL "${custom.url}". Protocol must be http: or https:`);
      }
      const entry = { url: custom.url };
      if (custom.env && Object.keys(custom.env).length > 0) {
        entry.env = { ...custom.env };
      }
      return entry;
    }

    const command = String(custom.command).trim();
    if (!command) {
      throw new Error(`MCP server "${name}" requires a non-empty command`);
    }
    const entry = { command };
    if (Array.isArray(custom.args) && custom.args.length > 0) {
      entry.args = custom.args.map((a) => String(a));
    }
    if (custom.env && Object.keys(custom.env).length > 0) {
      entry.env = { ...custom.env };
    }
    return entry;
  }

  const preset = MCP_PRESETS[name.toLowerCase()];
  if (!preset) {
    const available = Object.keys(MCP_PRESETS).join(', ');
    throw new Error(
      `Unknown MCP server preset "${name}". Available presets: ${available} (or pass --command / --url for a custom server)`,
    );
  }
  return structuredClone(preset.config);
}

/**
 * Parses CLI `--args` values (repeatable or comma-separated) into a flat array of strings.
 */
export function parseCliArgs(rawArgs) {
  if (!rawArgs) return [];
  const items = Array.isArray(rawArgs) ? rawArgs : [rawArgs];
  const out = [];
  for (const item of items) {
    for (const part of String(item).split(',')) {
      const trimmed = part.trim();
      if (trimmed) out.push(trimmed);
    }
  }
  return out;
}

/**
 * Parses CLI `--env` values (`KEY=VALUE`, repeatable or comma-separated) into an object.
 */
export function parseCliEnv(rawEnv) {
  if (!rawEnv) return {};
  const items = Array.isArray(rawEnv) ? rawEnv : [rawEnv];
  const env = {};
  for (const item of items) {
    const str = String(item).trim();
    if (!str) continue;
    const eqIdx = str.indexOf('=');
    if (eqIdx <= 0) {
      throw new Error(`Invalid --env entry "${str}". Expected KEY=VALUE format`);
    }
    const key = str.slice(0, eqIdx).trim();
    const val = str.slice(eqIdx + 1).trim();
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(key)) {
      throw new Error(`Invalid environment variable name "${key}"`);
    }
    env[key] = val;
  }
  return env;
}

/**
 * Adds or updates MCP servers in target MCP config files (`.agents/mcp_config.json`, `.mcp.json`, `.cursor/mcp.json`).
 * Preserves existing user-configured servers unless `force` is true.
 */
export async function addMcpServers({
  targets,
  servers,
  custom = null,
  dir = '.',
  force = false,
  dryRun = false,
  allowUnknownPresets = false,
  updateConstitution = false,
} = {}) {
  const root = resolve(dir);
  validateTargets(targets);

  const serverList = Array.isArray(servers) ? servers : parseMcpServerList(servers);
  const resolvedEntries = {};
  const unknown = [];

  for (const rawName of serverList) {
    const name = rawName.trim();
    if (!name || IGNORED_MCP_TOKENS.has(name.toLowerCase())) continue;
    const key = custom && (custom.command || custom.url) ? name : name.toLowerCase();
    if (!custom && !MCP_PRESETS[key]) {
      if (allowUnknownPresets) {
        unknown.push(name);
        continue;
      }
    }
    resolvedEntries[key] = resolveMcpServerEntry(key, custom);
  }

  const report = {
    written: [],
    updated: [],
    skipped: [],
    addedServers: Object.keys(resolvedEntries),
    unknown,
    byTarget: {},
  };

  if (Object.keys(resolvedEntries).length === 0) {
    return report;
  }

  for (const target of targets) {
    const relPath = TARGET_MCP_PATHS[target];
    const absPath = resolveSafe(root, relPath);
    const existingRaw = await readOptional(absPath);
    const parsed = existingRaw !== null ? parseMcpJson(existingRaw, relPath) : { mcpServers: {} };

    const targetStatus = { path: relPath, added: [], updated: [], skipped: [] };
    let changed = false;

    for (const [serverName, serverConfig] of Object.entries(resolvedEntries)) {
      const existingEntry = parsed.mcpServers[serverName];
      if (existingEntry !== undefined) {
        if (!force || JSON.stringify(existingEntry) === JSON.stringify(serverConfig)) {
          targetStatus.skipped.push(serverName);
          continue;
        }
        parsed.mcpServers[serverName] = serverConfig;
        targetStatus.updated.push(serverName);
        changed = true;
      } else {
        parsed.mcpServers[serverName] = serverConfig;
        targetStatus.added.push(serverName);
        changed = true;
      }
    }

    report.byTarget[target] = targetStatus;

    if (!changed) {
      report.skipped.push(relPath);
      continue;
    }

    const serialized = `${JSON.stringify(parsed, null, 2)}\n`;
    if (existingRaw === null) {
      report.written.push(relPath);
    } else {
      report.updated.push(relPath);
    }
    if (!dryRun) {
      await writeFileEnsured(absPath, serialized);
    }
  }

  if (updateConstitution) {
    const constStatus = await syncConstitutionMcp(root, {
      add: Object.keys(resolvedEntries),
      dryRun,
    });
    if (constStatus === 'updated') report.updated.push('.ai-team/constitution.md');
  }

  return report;
}

/**
 * Removes MCP servers from target MCP config files.
 * Preserves any other servers or top-level properties in the file.
 */
export async function removeMcpServers({
  targets,
  servers,
  dir = '.',
  dryRun = false,
  updateConstitution = false,
} = {}) {
  const root = resolve(dir);
  validateTargets(targets);

  const serverList = (Array.isArray(servers) ? servers : parseMcpServerList(servers))
    .map((s) => s.trim())
    .filter(Boolean);

  if (serverList.length === 0) {
    throw new Error('Specify at least one MCP server name to remove');
  }

  const report = {
    updated: [],
    removed: [],
    skipped: [],
    byTarget: {},
  };

  for (const target of targets) {
    const relPath = TARGET_MCP_PATHS[target];
    const absPath = resolveSafe(root, relPath);
    const existingRaw = await readOptional(absPath);
    const targetStatus = { path: relPath, removed: [], missing: [] };
    report.byTarget[target] = targetStatus;

    if (existingRaw === null) {
      targetStatus.missing.push(...serverList);
      report.skipped.push(relPath);
      continue;
    }

    const parsed = parseMcpJson(existingRaw, relPath);
    let changed = false;

    for (const name of serverList) {
      const key = Object.keys(parsed.mcpServers).find(
        (k) => k === name || k.toLowerCase() === name.toLowerCase(),
      );
      if (key) {
        delete parsed.mcpServers[key];
        targetStatus.removed.push(key);
        changed = true;
      } else {
        targetStatus.missing.push(name);
      }
    }

    if (!changed) {
      report.skipped.push(relPath);
      continue;
    }

    const otherTopKeys = Object.keys(parsed).filter((k) => k !== 'mcpServers');
    if (Object.keys(parsed.mcpServers).length === 0 && otherTopKeys.length === 0) {
      report.removed.push(relPath);
      if (!dryRun) {
        await rm(absPath, { force: true });
      }
    } else {
      report.updated.push(relPath);
      if (!dryRun) {
        await writeFileEnsured(absPath, `${JSON.stringify(parsed, null, 2)}\n`);
      }
    }
  }

  if (updateConstitution) {
    const constStatus = await syncConstitutionMcp(root, {
      remove: serverList,
      dryRun,
    });
    if (constStatus === 'updated') report.updated.push('.ai-team/constitution.md');
  }

  return report;
}

/**
 * Lists configured MCP servers across targets in a project directory, plus available presets.
 */
export async function listMcpServers({ dir = '.', targets = Object.keys(TARGETS) } = {}) {
  const root = resolve(dir);
  validateTargets(targets);

  const configured = {};
  for (const target of targets) {
    const relPath = TARGET_MCP_PATHS[target];
    const absPath = resolveSafe(root, relPath);
    const existingRaw = await readOptional(absPath);
    if (existingRaw === null) {
      configured[target] = { path: relPath, exists: false, servers: {} };
      continue;
    }
    const parsed = parseMcpJson(existingRaw, relPath);
    configured[target] = {
      path: relPath,
      exists: true,
      servers: parsed.mcpServers,
    };
  }

  return {
    configured,
    presets: MCP_PRESETS,
  };
}

/**
 * Updates the `- **MCP Servers & Integrations:** ...` line in `.ai-team/constitution.md` if it exists.
 */
async function syncConstitutionMcp(root, { add = [], remove = [], dryRun = false }) {
  const constitutionAbs = resolveSafe(root, '.ai-team/constitution.md');
  const existing = await readOptional(constitutionAbs);
  if (existing === null) return 'missing';

  const lineRegex = /^(- \*\*MCP Servers & Integrations:\*\*\s*)(.*)$/m;
  const match = existing.match(lineRegex);
  if (!match) return 'unchanged';

  const currentTokens = parseMcpServerList(match[2]);
  const removeLower = new Set(remove.map((r) => r.toLowerCase()));
  const nextList = currentTokens.filter((t) => !removeLower.has(t.toLowerCase()));

  for (const item of add) {
    if (!nextList.some((t) => t.toLowerCase() === item.toLowerCase())) {
      nextList.push(item);
    }
  }

  const nextValue = nextList.length > 0 ? nextList.join(', ') : 'none';
  const nextContent = existing.replace(lineRegex, `$1${nextValue}`);
  if (nextContent === existing) return 'unchanged';

  if (!dryRun) {
    await writeFileEnsured(constitutionAbs, nextContent);
  }
  return 'updated';
}

function validateTargets(targets) {
  if (!Array.isArray(targets) || targets.length === 0) {
    throw new Error(`At least one target is required (${Object.keys(TARGETS).join(', ')})`);
  }
  for (const target of targets) {
    if (!TARGETS[target]) {
      throw new Error(`Unknown target "${target}". Valid targets: ${Object.keys(TARGETS).join(', ')}`);
    }
  }
}

function resolveSafe(root, relPath) {
  const abs = resolve(root, relPath);
  const rel = relative(root, abs);
  if (rel.startsWith('..') || isAbsolute(rel)) {
    throw new Error(`Refusing to access outside project root: ${relPath}`);
  }
  return abs;
}

function parseMcpJson(raw, relPath) {
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    throw new Error(`Invalid JSON in ${relPath}: ${err.message}`);
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error(`Expected JSON object in ${relPath}`);
  }
  if (
    parsed.mcpServers !== undefined &&
    (typeof parsed.mcpServers !== 'object' || parsed.mcpServers === null || Array.isArray(parsed.mcpServers))
  ) {
    throw new Error(`Expected "mcpServers" in ${relPath} to be a JSON object`);
  }
  return {
    ...parsed,
    mcpServers: { ...(parsed.mcpServers ?? {}) },
  };
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
