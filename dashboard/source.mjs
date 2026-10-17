import { lstat, open, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { WORK_ID_PATTERN, eventsPath, parseEventLine } from '../src/events.mjs';

const MAX_READ_BYTES = 1024 * 1024;
const MAX_WORKS = 100;
const EVENTS_DIR = '.ai-team';

/**
 * Reads events from `<project>/.ai-team/<work-id>/events.jsonl`.
 * Symlinked work directories or files are ignored so a link cannot expose files outside the project.
 */
export function createFileSource(projectDir) {
  return {
    async listWorks() {
      const root = join(projectDir, EVENTS_DIR);
      let entries;
      try {
        entries = await readdir(root, { withFileTypes: true });
      } catch (err) {
        if (err.code === 'ENOENT') return [];
        throw err;
      }
      const works = [];
      for (const entry of entries) {
        if (!entry.isDirectory() || !WORK_ID_PATTERN.test(entry.name)) continue;
        const info = await statEventsFile(projectDir, entry.name);
        if (info) works.push({ workId: entry.name, updatedAt: info.mtime.toISOString(), bytes: info.size });
      }
      works.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
      return works.slice(0, MAX_WORKS);
    },

    async readEvents(workId) {
      const info = await statEventsFile(projectDir, workId);
      if (!info) return [];
      const handle = await open(eventsPath(projectDir, workId), 'r');
      try {
        const start = Math.max(0, info.size - MAX_READ_BYTES);
        const buffer = Buffer.alloc(info.size - start);
        await handle.read(buffer, 0, buffer.length, start);
        let text = buffer.toString('utf8');
        // A tail read starts mid-line; drop the partial first line.
        if (start > 0) text = text.slice(text.indexOf('\n') + 1);
        return text.split('\n').map(parseEventLine).filter(Boolean);
      } finally {
        await handle.close();
      }
    },

    async signature(workId) {
      const info = await statEventsFile(projectDir, workId);
      return info ? `${info.size}:${info.mtimeMs}` : 'missing';
    },
  };
}

async function statEventsFile(projectDir, workId) {
  if (!WORK_ID_PATTERN.test(workId)) return null;
  const file = eventsPath(projectDir, workId);
  try {
    const dir = await lstat(join(projectDir, EVENTS_DIR, workId));
    if (!dir.isDirectory()) return null;
    const info = await lstat(file);
    return info.isFile() ? info : null;
  } catch (err) {
    if (err.code === 'ENOENT' || err.code === 'ENOTDIR') return null;
    throw err;
  }
}
