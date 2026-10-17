const FENCE = '---';
const NEEDS_QUOTE = /^[\s[\]{}&*!|>'"%@`#,?:-]|:\s|\s#|\s$/;

export function parseFrontmatter(text) {
  const normalized = text.replace(/\r\n/g, '\n');
  if (!normalized.startsWith(`${FENCE}\n`)) {
    return { data: {}, body: normalized };
  }
  const end = normalized.indexOf(`\n${FENCE}`, FENCE.length);
  if (end === -1) {
    throw new Error('Unterminated frontmatter block');
  }
  const data = {};
  for (const line of normalized.slice(FENCE.length + 1, end).split('\n')) {
    if (!line.trim()) continue;
    const idx = line.indexOf(':');
    if (idx === -1) {
      throw new Error(`Invalid frontmatter line: "${line}"`);
    }
    data[line.slice(0, idx).trim()] = unquote(line.slice(idx + 1).trim());
  }
  const body = normalized.slice(end + FENCE.length + 1).replace(/^\n+/, '');
  return { data, body };
}

export function serializeFrontmatter(data, body) {
  const lines = Object.entries(data)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${k}: ${formatValue(v)}`);
  return `${FENCE}\n${lines.join('\n')}\n${FENCE}\n\n${body.trimEnd()}\n`;
}

function formatValue(value) {
  if (typeof value === 'boolean' || typeof value === 'number') return String(value);
  const str = String(value);
  return NEEDS_QUOTE.test(str) ? JSON.stringify(str) : str;
}

function unquote(value) {
  if (value.startsWith('"') && value.endsWith('"') && value.length >= 2) {
    return JSON.parse(value);
  }
  if (value.startsWith("'") && value.endsWith("'") && value.length >= 2) {
    return value.slice(1, -1).replace(/''/g, "'");
  }
  if (value === 'true') return true;
  if (value === 'false') return false;
  return value;
}
