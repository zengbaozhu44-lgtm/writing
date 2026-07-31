/**
 * Scene Summary — 从前序 Scene 文本提取摘要，供 Scene2+ 引用
 */
export function extractSceneSummary(scene, text) {
  if (!text?.trim()) return null;
  const clean = text.replace(/\s+/g, ' ').trim();
  const sentences = clean.split(/[。！？]/).filter((s) => s.length > 4);
  const summary = sentences.slice(0, 2).join('。') + (sentences.length ? '。' : '');
  return {
    sceneId: scene.id,
    index: scene.index,
    title: scene.title,
    summary: summary.slice(0, 200) || clean.slice(0, 120),
    wordCount: clean.replace(/\s/g, '').length,
    newFacts: [],
    resourceDiff: {},
    relationshipDiff: {},
    knowledgeDiff: {},
    generatedAt: new Date().toISOString(),
  };
}

export function formatPreviousSummaries(summaries) {
  if (!summaries?.length) return '';
  const lines = ['### 前序 Scene 摘要'];
  for (const s of summaries) {
    lines.push(`- **Scene ${s.index}** (${s.title}): ${s.summary}`);
  }
  return lines.join('\n');
}

export function buildContinuationBlock(sceneIndex, prevSummary) {
  if (sceneIndex <= 1) return '';
  return [
    '### 续写指令',
    `Continue from Scene ${sceneIndex - 1}.`,
    'Do NOT repeat previous narration.',
    'Maintain tone. Continue naturally.',
    prevSummary ? `Previous: ${prevSummary}` : '',
  ].filter(Boolean).join('\n');
}
