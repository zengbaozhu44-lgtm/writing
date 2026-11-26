/**
 * Style Adapter — 文风蒸馏，不膨胀 Prompt
 */
const STYLE_HINTS = {
  default: '动作先行。感官只在对白、动作或判断需要时出现，且必须承担至少一项叙事功能：揭示角色判断/情绪、引入障碍/线索、改变信息理解。连续环境/感官描写不超过 3 句。限知第三人称。禁止解释设定。',
  mystery: '信息寄生。异常反噬。渐进揭秘。对话是博弈。感官描写必须携带线索。',
  epic: '利益驱动。世界不围主角转。每章不可逆变化。动作先行，氛围为叙事功能服务。',
};

export function distillStyle(ctx, scene) {
  const wb = ctx.writingBible || '';
  if (/诡秘|宿命|君王|克苏鲁/.test(wb + scene.goal)) return STYLE_HINTS.mystery;
  if (/史诗|王朝|战争/.test(wb + scene.goal)) return STYLE_HINTS.epic;
  return STYLE_HINTS.default;
}

export function buildStyleBlock(ctx, scene) {
  return `## 文风约束（蒸馏）\n${distillStyle(ctx, scene)}`;
}
