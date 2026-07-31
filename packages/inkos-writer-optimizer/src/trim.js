const CROSS_SCENE_MARKERS = [
  /meanwhile/i,
  /与此同时/,
  /另一边/,
  /镜头切到/,
  /下一[个]?场景/,
  /Scene\s*\d/i,
];

const SUMMARY_PATTERNS = [
  /总之[，,]/,
  /综上所述/,
  /这意味着/,
  /由此可见/,
  /世界观[：:]/,
  /设定[：:]/,
];

/** Review 前轻量裁剪 — 不改变剧情，只截断越界/总结段 */
export function trimSceneText(text, boundaries = null) {
  let out = String(text || '').trim();
  if (!out) return { text: out, trimmed: false, reasons: [] };

  const reasons = [];
  const paras = out.split(/\n{2,}/);

  for (const marker of CROSS_SCENE_MARKERS) {
    const idx = out.search(marker);
    if (idx > out.length * 0.5) {
      out = out.slice(0, idx).trim();
      reasons.push(`裁剪跨 Scene 标记：${String(marker)}`);
      break;
    }
  }

  for (const p of SUMMARY_PATTERNS) {
    const m = out.match(p);
    if (m && m.index > out.length * 0.6) {
      out = out.slice(0, m.index).trim();
      reasons.push('裁剪总结解释段');
      break;
    }
  }

  if (paras.length > 8) {
    out = paras.slice(0, 8).join('\n\n').trim();
    reasons.push('裁剪超长段落（>8段）');
  }

  if (boundaries?.hook && out.length > 4000) {
    out = out.slice(0, 4000).trim();
    reasons.push('裁剪超长 Scene');
  }

  return { text: out, trimmed: reasons.length > 0, reasons };
}
