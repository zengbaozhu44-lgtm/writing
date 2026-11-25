/**
 * Conflict Detector — 每章至少一种冲突类型；缺因果依据时降级通过（no_causal_basis）
 */
const CONFLICT_TYPES = [
  'resource',
  'relationship',
  'interest',
  'rule',
  'values',
  'information',
];

export function evaluateConflict(ctx, intent) {
  const detected = new Set();
  const evidence = [];

  const corpus = [
    intent.mainGoal,
    ...intent.obstacles,
    intent.turningPoint,
    intent.bargain,
    intent.mustLose,
    ...intent.scenes.map((s) => `${s.goal} ${s.conflict}`),
    ctx.stateBoard,
    ctx.chapterTask['博弈'] || '',
  ].join('\n');

  if (/资源|金钱|资金|体力|弹药|筹码|代价|失去|消耗/.test(corpus)) {
    detected.add('resource');
    evidence.push({ type: 'resource', source: '资源/代价关键词' });
  }
  if (/关系|信任|敌意|债务|背叛|合作破裂/.test(corpus) || ctx.relationships.some((e) => e.hostility >= 3)) {
    detected.add('relationship');
    evidence.push({ type: 'relationship', source: '关系图或关系关键词' });
  }
  if (/利益|交换|博弈|交易|筹码|要价/.test(corpus) || intent.bargain) {
    detected.add('interest');
    evidence.push({ type: 'interest', source: '利益博弈' });
  }
  if (/规则|禁令|法律|秩维|帷幕|铁律|违规/.test(corpus) || ctx.worldBible.includes('铁律')) {
    detected.add('rule');
    evidence.push({ type: 'rule', source: '世界规则冲突' });
  }
  if (/价值观|底线|恐惧|执念|道德/.test(corpus)) {
    detected.add('values');
    evidence.push({ type: 'values', source: '价值观冲突' });
  }
  if (/不知道|未知|信息差|秘密|误导|隐瞒|情报/.test(corpus) || (ctx.knowledge.matrix?.length > 0)) {
    detected.add('information');
    evidence.push({ type: 'information', source: '信息差' });
  }

  const pass = detected.size >= 1;
  // D2（Phase 4 · Step 4-D2）：计划明确携带 no_causal_basis（缺因果依据）时，
  // 不硬拦、不补假因果——以 degraded 通过，让薄场景照常执行。
  // 若无冲突且无 no_causal_basis，仍返回 no_causal_basis 作为诚实重试建议：
  // 下一轮计划 obstacle 变成该标记后即 degraded 通过，恰一次有界重试，不死循环。
  const noBasis = corpus.includes('no_causal_basis');
  const degraded = noBasis && !pass;

  // B 派生前瞻卡（deriveNextChapterIntent，目标带「追查：/承接：」前缀）：
  // 代价/博弈字段已剥离，关键词桶天然稀薄；前瞻目标本身即指定的冲突方向，
  // 以单一丰富种子（≥20 字）呈现，复用 analyzeMetricsFeedback 的
  // singleRichConflictSeed 豁免语义，避免与 Metrics 门禁互相喂养成死循环。
  const forwardGoal = String(intent?.mainGoal || '').trim();
  const isDerivedForwardGoal = /^(追查|承接)：/.test(forwardGoal)
    && forwardGoal.replace(/\s/g, '').length >= 20;
  if (isDerivedForwardGoal && detected.size < 2) {
    detected.clear();
    detected.add(forwardGoal);
    evidence.push({ type: 'forward_seed', source: 'deriveNextChapterIntent' });
  }

  return {
    pass: pass || noBasis || isDerivedForwardGoal,
    degraded,
    types: degraded ? ['no_causal_basis'] : [...detected],
    required: CONFLICT_TYPES,
    evidence,
    primary: degraded ? 'no_causal_basis' : [...detected][0] || null,
    suggestObstacle: pass ? null : 'no_causal_basis',
  };
}
