/**
 * text-similarity — 通用文本相似度工具（跨包共享，Runtime / Studio 均可引用）
 *
 * 反向依赖收口：原实现位于 studio writer-optimization/beat-continuity.js，
 * runtime 的 chapter-pipeline 反向 import 违反「Runtime 不得依赖 Studio」边界。
 * 本函数为纯函数、零依赖，迁入 inkos-core 供两侧共享。
 */

/**
 * 通用字符 n-gram 相似度（Jaccard）。白名单正则抓不住的新意象重复（如「悬在确认键上方」）
 * 靠它兜底：新片段与本章已有文本前 20 字做 3-gram 比对，>0.6 判定重复。
 */
export function similarityRatio(a = '', b = '', n = 3) {
  const sa = String(a || '');
  const sb = String(b || '');
  if (!sa || !sb || sa.length < n || sb.length < n) return 0;
  const grams = (s) => {
    const out = new Set();
    for (let i = 0; i <= s.length - n; i += 1) out.add(s.slice(i, i + n));
    return out;
  };
  const ga = grams(sa);
  const gb = grams(sb);
  let inter = 0;
  for (const g of ga) if (gb.has(g)) inter += 1;
  return inter / ga.size;
}
