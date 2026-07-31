/**
 * 构建 Rewrite 指令 — 只改表达，不改剧情
 */
export function buildRewritePrompt(analysis, boundaries = {}) {
  const lines = [
    '## Writer Optimizer 重写指令',
    '',
    '**硬性约束**：不得修改剧情事实、人物关系、事件结果；只能调整表达方式、节奏、对话与感官描写。',
    '',
    '### 未达标项',
    ...analysis.failures.map((f) => `- ${f}`),
    '',
    '### 商业指标（目标 commercial_score ≥ 85）',
    `- hook: ${analysis.scores.hook}`,
    `- conflict: ${analysis.scores.conflict}`,
    `- emotion: ${analysis.scores.emotion}`,
    `- dialogue: ${analysis.scores.dialogue}`,
    `- pacing: ${analysis.scores.pacing}`,
    `- suspense: ${analysis.scores.suspense}`,
    `- commercial_score: ${analysis.scores.commercial_score}`,
    '',
    '### Scene 边界（保持不变）',
    `- Goal：${boundaries.goal || '—'}`,
    `- Hook 停止点：${boundaries.hook || '段末留悬念'}`,
    '',
    '### 重写要点（Commercial Writer）',
    '- Opening：前 300 字内出现异常/事件；环境描写连续不超过 2 句',
    '- Beat：每 400～600 字一次节奏爆点（冲突/新信息/异常/对话/反转）',
    '- 结构：Goal → Obstacle → Escalation → New Information → Hook',
    '- 禁止重复同一信息；本 Scene 至少新增 1 条世界规则或谜团',
    '- 结尾留下问题/悬念，禁止平收',
  ];
  return lines.join('\n');
}
