/**
 * Decision 内容审核入口（对外 API）
 * 实现见 ../decision/content-policy.js
 */
import {
  CONTENT_POLICY,
  TOXIC_OBSTACLE_PATTERNS,
  checkContentPolicy,
  checkSceneContentPolicy,
  sanitizeObstacleSuggestion,
} from '../decision/content-policy.js';

export {
  CONTENT_POLICY,
  TOXIC_OBSTACLE_PATTERNS,
  checkContentPolicy,
  checkSceneContentPolicy,
  sanitizeObstacleSuggestion,
};

/**
 * 兼容冒烟测试命名：可传 { goal, conflict } 或任意对象/字符串
 * @param {string|{goal?: string, conflict?: string}} [input]
 */
export function checkValues(input = {}) {
  if (typeof input === 'string') return checkContentPolicy(input);
  if (input && (input.goal != null || input.conflict != null)) {
    return checkSceneContentPolicy(input, {});
  }
  return checkContentPolicy(JSON.stringify(input ?? {}));
}
