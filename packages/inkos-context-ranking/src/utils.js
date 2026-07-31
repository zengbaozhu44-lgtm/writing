export const DEFAULT_TOP_K = 12;
export const DEFAULT_BUDGET_CHARS = 4000;

export const SOURCE_TYPES = [
  'facts',
  'knowledge',
  'resources',
  'relationships',
  'timeline',
];

export function charCount(text) {
  return String(text || '').replace(/\s/g, '').length;
}

export function extractKeywords(text) {
  const words = new Set();
  const re = /[\u4e00-\u9fa5]{2,4}/g;
  let m;
  while ((m = re.exec(String(text || ''))) !== null) {
    const w = m[0];
    if (!/因此|所以|一个|这种|他们|我们|可以|已经|进行|通过|展现|之间|做出/.test(w)) {
      words.add(w);
    }
  }
  return [...words];
}

export function keywordOverlap(text, keywords) {
  if (!keywords.length) return 0;
  let hits = 0;
  const body = String(text || '');
  for (const kw of keywords) {
    if (body.includes(kw)) hits += 1;
  }
  return hits / Math.min(keywords.length, 10);
}
