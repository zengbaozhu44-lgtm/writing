/**
 * Style Adapter — 文风蒸馏，不膨胀 Prompt
 */
const STYLE_HINTS = {
  default: '身体先行。感官优先。限知第三人称。禁止解释设定。',
  mystery: '信息寄生。异常反噬。渐进揭秘。对话是博弈。',
  epic: '利益驱动。世界不围主角转。每章不可逆变化。',
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
