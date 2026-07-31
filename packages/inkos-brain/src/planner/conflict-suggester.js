/**
 * Conflict / Decision 重试建议 — 禁止含旧误拦触发词（底线、背叛…）
 */

export const SAFE_RETRY_SUGGESTIONS = [
  '尝试让主角的核心原则受到挑战，被迫改变策略',
  '用信任破裂事件触发转折',
  '让主角面临两难选择，无论选哪边都有代价',
  '增加利益交换或信息差阻碍',
  '资源短缺迫使替代方案',
  '先获取情报再行动',
];

/** Decision values/content 硬拦后的安全建议 */
export const CONTENT_HARD_BLOCK_SUGGESTION = '调整表述，避开政治敏感表述后继续推进';

/** Conflict 未检出冲突时的安全建议 */
export const CONFLICT_MISSING_SUGGESTION = '增加利益交换或信息差阻碍';

/**
 * 按失败维度取安全建议（永不返回含「底线受阻」的毒文案）
 * @param {string} [dimension]
 * @param {string} [fallback]
 */
export function suggestSafeObstacle(dimension = '', fallback = '') {
  const map = {
    values: CONTENT_HARD_BLOCK_SUGGESTION,
    content: CONTENT_HARD_BLOCK_SUGGESTION,
    interest: '增加与真实目标的利益绑定',
    resources: '资源短缺迫使替代方案',
    knowledge: '先获取情报再行动',
    relationship: '关系冲突阻碍合作',
    risk: '身体或资源代价',
    conflict: CONFLICT_MISSING_SUGGESTION,
    metrics: '外部阻力或信息差',
  };
  const picked = map[dimension] || fallback || SAFE_RETRY_SUGGESTIONS[0];
  // 二次消毒：任何含旧毒词的建议一律替换
  if (/底线受阻|价值观冲突，?需改/.test(picked)) {
    return SAFE_RETRY_SUGGESTIONS[0];
  }
  return picked;
}

export function pickRetrySuggestion(index = 0) {
  const i = Math.abs(Number(index) || 0) % SAFE_RETRY_SUGGESTIONS.length;
  return SAFE_RETRY_SUGGESTIONS[i];
}
