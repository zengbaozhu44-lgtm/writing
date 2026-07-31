import crypto from 'node:crypto';

export function hashContent(text) {
  if (!text) return 'empty';
  return crypto.createHash('sha256').update(text).digest('hex').slice(0, 16);
}

export function hashPrompt(parts) {
  return hashContent(JSON.stringify(parts));
}
