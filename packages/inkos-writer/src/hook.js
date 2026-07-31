/**
 * Hook Model — 章末钩子评分与 Planner 建议
 */
export function scoreHook(scene, text = '') {
  const corpus = `${scene.goal} ${text}`;
  const hook = /发现|真相|危险|意外|威胁|秘密|线索/.test(corpus) ? 75 : 45;
  const suspense = /但是|然而|却|没想到|门|声音|影子/.test(corpus) ? 70 : 40;
  const commercial = scene.beat === 'hook' ? 80 : 50;
  const expectation = text.length > 100 ? 65 : 35;
  const overall = Math.round((hook + suspense + commercial + expectation) / 4);
  return { hook, suspense, commercial, expectation, overall };
}

export function buildHookBlock(scene) {
  if (scene.beat !== 'hook') return '';
  return [
    '## 钩子要求',
    '章末必须：发现型悬念 + 读者期待下一章。',
    '禁止圆满收束，禁止解释全部设定。',
  ].join('\n');
}

export function plannerHookHints(scene, text) {
  const s = scoreHook(scene, text);
  if (s.overall >= 65) return [];
  return [{
    type: 'hookWeak',
    scores: s,
    suggestion: '下一章开篇加强悬念承接，提升 Commercial Hook',
  }];
}
