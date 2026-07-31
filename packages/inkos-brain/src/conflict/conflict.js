/**
 * Conflict Engine — 每章至少一种冲突类型
 */
import { CONFLICT_MISSING_SUGGESTION } from '../planner/conflict-suggester.js';

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
  return {
    pass,
    types: [...detected],
    required: CONFLICT_TYPES,
    evidence,
    primary: [...detected][0] || null,
    suggestObstacle: pass ? null : CONFLICT_MISSING_SUGGESTION,
  };
}
