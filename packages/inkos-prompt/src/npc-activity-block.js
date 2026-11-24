/**
 * WL-03: NPC off-screen life — prompt block formatter（@inkos/prompt 侧）
 *
 * Access 边界（写在块内，Writer 必读）：
 * - NPC 动向是世界层背景（负空间 / 世界仍在运动）。
 * - 仅当场景自然同框时 POV 才可感知；未同框 = POV 不可知晓。
 * - 禁止据此自动生成本场情节、目标或转折（NPC ≠ 情节生成器）。
 * - POV 自身的条目不进入本块（自己不是自己的 NPC）。
 */

export function formatNpcActivityForPrompt(npcActivity, { pov } = {}) {
  if (!npcActivity?.entries?.length) return '';
  const rows = npcActivity.entries.filter((e) => e.name && e.name !== pov);
  if (!rows.length) return '';

  const lines = ['## NPC 动向（世界层 · 非 POV 经验）'];
  if (npcActivity.day != null && npcActivity.day !== '') {
    lines.push(`（第 ${npcActivity.day} 日 · 场外推进）`);
  }
  for (const e of rows) {
    const parts = [`${e.name}：${e.today_goal}`];
    if (e.plan_location) parts.push(`位置 ${e.plan_location}`);
    if (e.may_meet?.length) parts.push(`可能与 ${e.may_meet.join('、')} 相遇`);
    if (e.plan_changed) parts.push('计划有变');
    if (e.world_impact) parts.push(`世界影响 ${e.world_impact}`);
    lines.push(`- ${parts.join('；')}`);
  }
  lines.push('边界：以上是场外世界仍在运动的背景（负空间）。仅当场景自然同框时 POV 才可感知；未同框 = POV 不可知晓，不得写入其认知；禁止据此自动生成本场情节、目标或转折。');
  return lines.join('\n');
}
