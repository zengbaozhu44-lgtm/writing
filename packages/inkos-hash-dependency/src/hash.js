import crypto from 'node:crypto';

export function hashContent(text) {
  if (text == null || text === '') return 'empty';
  const payload = typeof text === 'string' ? text : JSON.stringify(text);
  return crypto.createHash('sha256').update(payload).digest('hex').slice(0, 16);
}

export function hashCombined(hashes = {}) {
  const ordered = Object.keys(hashes).sort().map((k) => `${k}:${hashes[k]}`);
  return hashContent(ordered.join('|'));
}
