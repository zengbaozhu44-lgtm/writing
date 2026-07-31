/**
 * Conflict Model — 检查 Scene 冲突维度，不足时注入提示（不触发 Replan）
 */
const CONFLICT_TYPES = {
  interest: /利益|代价|交换|筹码|谈判/,
  resource: /资源|金钱|时间|体力|装备|能力/,
  cognition: /真相|秘密|误导|认知|信息|线索/,
  value: /底线|价值观|道德|信念|恐惧/,
};

export function analyzeConflict(scene) {
  const corpus = `${scene.goal} ${scene.conflict}`;
  const present = {};
  for (const [type, re] of Object.entries(CONFLICT_TYPES)) {
    present[type] = re.test(corpus);
  }
  const score = Object.values(present).filter(Boolean).length;
  const missing = Object.entries(present).filter(([, v]) => !v).map(([k]) => k);
  return { present, score, missing, sufficient: score >= 2 };
}

export function buildConflictBlock(scene) {
  const { sufficient, missing, score } = analyzeConflict(scene);
  if (sufficient) return '';
  const labels = { interest: '利益', resource: '资源', cognition: '认知', value: '价值' };
  const need = missing.map((m) => labels[m]).join('、');
  return `## 冲突强化\n本 Scene 冲突维度不足（${score}/4）。请强化：${need}冲突。`;
}

export function plannerConflictHints(scene) {
  const { missing } = analyzeConflict(scene);
  if (!missing.length) return [];
  return missing.map((type) => ({ type: 'conflictGap', dimension: type, suggestion: `下章加强${type}冲突` }));
}
