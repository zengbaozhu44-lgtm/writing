/**
 * 内容审核策略 — 剧情词汇放行 / 政治敏感硬拦 / 血腥软提示
 *
 * 禁止再用「背叛」「底线」等网文常见词做 Decision 拦截（会死循环）。
 */

export const CONTENT_POLICY = {
  /** P0：硬拦截（政治敏感）— 极少且明确 */
  hardBlock: [
    /反党/i,
    /反国/i,
    /颠覆.{0,3}政权/i,
    /分裂.{0,3}国家/i,
    /暴乱/i,
    /颜色革命/i,
  ],

  /** P1：软提示（血腥暴力）— 不阻断 */
  softWarn: [
    /虐杀/i,
    /分尸/i,
    /活体.{0,3}解剖/i,
    /酷刑.{0,3}细节/i,
  ],

  /**
   * P2：剧情词汇 — 明确放行清单（文档用；校验逻辑不拦截这些词）
   * 含旧毒建议词「底线」，避免再被任何启发式误杀
   */
  allowList: [
    '背叛', '底线', '惨死', '死亡', '复仇', '牺牲', '阵亡',
    '黑化', '堕落', '欺骗', '利用', '抛弃', '绝望', '崩溃',
    '脏话', '他妈的', '该死', '去死',
    '触犯底线', '违反底线', '突破底线', '献祭', '无辜',
  ],
};

/** 旧 Decision 毒障碍文案（写回后会再次触发误拦） */
export const TOXIC_OBSTACLE_PATTERNS = [
  /^底线受阻需换路径$/,
  /底线受阻/,
  /价值观冲突，?需改路径/,
];

/**
 * @param {string} text
 * @returns {{
 *   pass: boolean,
 *   level?: 'HARD_BLOCK' | 'SOFT_WARN' | 'PASS',
 *   reason?: string,
 *   matched?: string,
 *   warnings?: Array<{ type: string, matched: string, message: string }>,
 *   suggestObstacle?: string,
 * }}
 */
export function checkContentPolicy(text = '') {
  const corpus = String(text || '');

  for (const pattern of CONTENT_POLICY.hardBlock) {
    if (pattern.test(corpus)) {
      return {
        pass: false,
        level: 'HARD_BLOCK',
        reason: '内容包含政治敏感表述，请修改后重试',
        matched: pattern.source,
        suggestObstacle: '调整表述，避开政治敏感表述后继续推进',
      };
    }
  }

  const warnings = [];
  for (const pattern of CONTENT_POLICY.softWarn) {
    if (pattern.test(corpus)) {
      warnings.push({
        type: 'GRAPHIC_CONTENT',
        matched: pattern.source,
        message: '检测到可能的重度血腥描写，请确认符合平台规范',
      });
    }
  }

  return {
    pass: true,
    level: warnings.length ? 'SOFT_WARN' : 'PASS',
    warnings: warnings.length ? warnings : undefined,
  };
}

/**
 * 场景级审核：拼 goal + conflict（剧情词一律放行）
 * @param {{ goal?: string, conflict?: string, title?: string }} [scene]
 * @param {{ mainGoal?: string, ending?: string, turningPoint?: string }} [intent]
 */
export function checkSceneContentPolicy(scene = {}, intent = {}) {
  const text = [
    scene.goal,
    scene.conflict,
    scene.title,
    intent.mainGoal,
    intent.ending,
    intent.turningPoint,
  ].filter(Boolean).join('\n');
  return checkContentPolicy(text);
}

/** 清洗毒障碍建议，避免写回 chapterTask 形成死循环；缺因果依据 → no_causal_basis */
export function sanitizeObstacleSuggestion(value, fallback = 'no_causal_basis') {
  const s = String(value || '').trim();
  if (!s) return fallback;
  if (TOXIC_OBSTACLE_PATTERNS.some((re) => re.test(s))) return fallback;
  return s;
}
