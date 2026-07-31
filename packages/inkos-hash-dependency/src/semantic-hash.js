import { hashContent } from './hash.js';

const PUNCT_RE = /[，。！？、；：""''【】（）\s,.!?;:'"()[\]{}]/g;

function normalizeSemanticText(text) {
  return String(text || '')
    .replace(PUNCT_RE, '')
    .replace(/\s+/g, '')
    .trim()
    .toLowerCase();
}

function charBigrams(text) {
  const norm = normalizeSemanticText(text);
  if (norm.length < 2) return norm ? [norm] : [];
  const grams = [];
  for (let i = 0; i < norm.length - 1; i += 1) {
    grams.push(norm.slice(i, i + 2));
  }
  return grams;
}

/**
 * 语义指纹 — 用于 Semantic Hash Cache
 */
export function semanticFingerprint(text) {
  const norm = normalizeSemanticText(text);
  if (!norm) return 'empty';
  const grams = charBigrams(norm).slice(0, 400);
  return hashContent(grams.join('|'));
}

/**
 * Bigram Jaccard 相似度
 */
export function semanticSimilarity(a, b) {
  const na = normalizeSemanticText(a);
  const nb = normalizeSemanticText(b);
  if (!na && !nb) return 1;
  if (!na || !nb) return 0;
  if (na === nb) return 1;

  if (na.includes(nb) || nb.includes(na)) {
    const shorter = Math.min(na.length, nb.length);
    const longer = Math.max(na.length, nb.length);
    return Math.max(0.9, shorter / longer);
  }

  const ga = new Set(charBigrams(a));
  const gb = new Set(charBigrams(b));
  if (!ga.size && !gb.size) return 1;
  if (!ga.size || !gb.size) return 0;
  let inter = 0;
  for (const g of ga) {
    if (gb.has(g)) inter += 1;
  }
  const union = new Set([...ga, ...gb]).size;
  return union ? inter / union : 0;
}

const MODULE_THRESHOLDS = {
  world: 0.72,
  character: 0.82,
  facts: 0.85,
  timeline: 0.86,
  relationship: 0.85,
  knowledge: 0.84,
  resources: 0.84,
  style: 0.88,
  writing: 0.72,
  storyDna: 0.88,
  default: 0.80,
};

function lengthRatio(a, b) {
  const na = normalizeSemanticText(a);
  const nb = normalizeSemanticText(b);
  if (!na || !nb) return 0;
  return Math.min(na.length, nb.length) / Math.max(na.length, nb.length);
}

/** 追加内容占比 — 仅在前缀追加时计算，防止「短文本 + 大段新增」被误判为等价 */
function appendedContentRatio(prevText, nextText) {
  const na = normalizeSemanticText(prevText);
  const nb = normalizeSemanticText(nextText);
  if (!na || !nb) return 0;
  if (nb.startsWith(na)) return (nb.length - na.length) / nb.length;
  if (na.startsWith(nb)) return (na.length - nb.length) / na.length;
  return 0;
}

/**
 * 语义等价 — 微小措辞变化不触发 Cache 失效（如「冷漠」→「更加冷漠」）
 */
export function isSemanticallyEquivalent(prevText, nextText, module = 'default') {
  if (prevText === nextText) return true;
  if (!prevText && !nextText) return true;

  const appended = appendedContentRatio(prevText, nextText);
  if (appended > 0.22) return false;

  const sim = semanticSimilarity(prevText, nextText);
  const threshold = MODULE_THRESHOLDS[module] ?? MODULE_THRESHOLDS.default;
  if (sim >= threshold) return true;

  const ratio = lengthRatio(prevText, nextText);
  if (ratio >= 0.92 && sim >= 0.68) return true;
  if (ratio >= 0.96 && sim >= 0.55) return true;

  return false;
}

export function computeSemanticHashes(moduleTexts = {}) {
  const out = {};
  for (const [k, v] of Object.entries(moduleTexts)) {
    out[k] = semanticFingerprint(v);
  }
  return out;
}
