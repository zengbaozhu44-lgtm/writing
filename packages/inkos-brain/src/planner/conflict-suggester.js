/**
 * Conflict / Decision 重试建议 — 禁止含旧误拦触发词（底线、背叛…）
 *
 * D2（Phase 4 · Step 4-D2）：切断模板因果。
 * 结构占位符（「增加利益交换或信息差阻碍」「身体或资源代价」…）一旦落入 plan 的
 * obstacle 字段就成了假因果——宁可薄场景，不假因果。所有通用重试建议统一为
 * no_causal_basis 标记；唯一保留的是内容安全指令（调整表述…），它不是因果声明。
 */

export const SAFE_RETRY_SUGGESTIONS = ['no_causal_basis'];

/** Decision values/content 硬拦后的安全建议（内容安全指令，非因果声明，保留） */
export const CONTENT_HARD_BLOCK_SUGGESTION = '调整表述，避开政治敏感表述后继续推进';

/** Conflict 未检出冲突时的安全建议（D2：不再用关键词自洽的假因果，用诚实标记） */
export const CONFLICT_MISSING_SUGGESTION = 'no_causal_basis';

/**
 * 按失败维度取安全建议（永不返回含「底线受阻」的毒文案）
 * @param {string} [dimension]
 * @param {string} [fallback]
 */
export function suggestSafeObstacle(dimension = '', fallback = '') {
  const map = {
    values: CONTENT_HARD_BLOCK_SUGGESTION,
    content: CONTENT_HARD_BLOCK_SUGGESTION,
    // D2：其余维度缺因果依据 → no_causal_basis（不补「资源短缺/关系冲突/代价」等假因果）
    interest: 'no_causal_basis',
    resources: 'no_causal_basis',
    knowledge: 'no_causal_basis',
    relationship: 'no_causal_basis',
    risk: 'no_causal_basis',
    conflict: 'no_causal_basis',
    metrics: 'no_causal_basis',
  };
  const picked = map[dimension] || fallback || 'no_causal_basis';
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
