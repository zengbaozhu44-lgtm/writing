/**
 * Emotion Sample — Runtime 路径的情绪表达范例 + 脏话预算约束
 * 解决「Writer 总用「操」表达情绪」：给 Writer 看到「不用脏话也能表达情绪」的范例，
 * 并限制脏话频率，迫使情绪落到动作/停顿/生理反应/回忆里。
 */
import fs from 'node:fs';
import path from 'node:path';

const SAMPLE_MAX_CHARS = 260;

function clipChars(text, max = SAMPLE_MAX_CHARS) {
  const s = String(text || '').trim();
  if (s.length <= max) return s;
  return `${s.slice(0, max)}\n…[sample-clipped]`;
}

/** 读取书级 style_sample.md（若存在） */
function readBookStyleSample(bookDir) {
  if (!bookDir) return '';
  try {
    const file = path.join(bookDir, 'novel', '_system', 'style_sample.md');
    if (!fs.existsSync(file)) return '';
    const t = String(fs.readFileSync(file, 'utf8') || '').trim();
    return t.length >= 40 ? clipChars(t) : '';
  } catch {
    return '';
  }
}

/**
 * 脏话预算约束：整章脏话 ≤2 次，且只在情绪峰值。
 * 其余情绪必须用动作/停顿/生理反应/回忆/沉默表达。
 */
function buildProfanityBudget() {
  return [
    '## 脏话预算（强制）',
    '- 整章脏话（操/妈的/他妈的/我操等）≤ 2 次，且只能在情绪真正到顶时使用一次。',
    '- 禁止把「操」当作句间口头禅、禁止连续多段都用脏话。',
    '- 其余情绪一律用：动作的停顿、发白的指节、颤抖的手、空白的凝视、生理反应、回忆闪回、沉默。',
    '- 范例：「他数到七才动」「指节发白，血渗进掌纹」「喉咙里滚了半圈，什么也没说出来」。',
  ].join('\n');
}

/** 组合情绪范例 + 脏话预算 */
export function buildEmotionSampleBlock(ctx) {
  const bookDir = ctx?.bookDir;
  const sample = readBookStyleSample(bookDir);
  const lines = ['<!-- writer-emotion-sample v1 -->'];
  if (sample) {
    lines.push('## 情绪表达范例（本书记住这个质感，别退化成脏话）');
    lines.push(sample);
  }
  lines.push('', buildProfanityBudget());
  return lines.join('\n\n');
}
