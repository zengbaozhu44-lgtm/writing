/**
 * Writer Optimization — Prompt 约束（Studio 层）
 * 样本驱动改造：默认只保留少量正向约束；旧长清单仅 legacy 模式使用。
 */
import {
  COMMERCIAL_WRITER_CORE,
  SCENE_NEW_CONTENT_RULE,
  COMMERCIAL_PRINCIPLES,
  BEAT_COMMERCIAL_PRINCIPLES,
} from './commercial-writer-rules.js';

/** 精简正向规则（默认注入 P0） */
export const WRITER_SLIM_RULES = [
  '用画面、动作、对白推进；情绪写在身体与停顿里，少贴标签。',
  '承接上文情绪，写到本 Scene 钩子即停；不要重新介绍已出场角色/设定。',
  '每个 Scene 至少一次空间锚定（位置 / 朝向 / 光线或气味）。',
  '允许长短句交错：动作可短，情感/对峙可长。',
];

/** @deprecated 旧版禁令堆叠；INKOS_PROMPT_RULES=legacy 时启用 */
export const WRITER_FIXED_RULES = [
  ...BEAT_COMMERCIAL_PRINCIPLES.map((p) => p.replace(/^原则\d+：/, '')),
  ...COMMERCIAL_WRITER_CORE.map((r) => r.replace(/^\*\*[^*]+\*\*[：:]\s*/, '')),
  '前 300 字内必须出现异常事件或冲突；禁止开篇介绍背景、世界观、人物履历',
  '每个 Beat 必须改变局势、推动剧情；禁止连续两个 Beat 做同一件事',
  '每 400～600 字须出现爆点：冲突/真相/反转/选择/危机/死亡/新规则',
  '多写动作与对白，少写心理分析，身体动作优先于心理描写',
  ...SCENE_NEW_CONTENT_RULE
    .filter((r) => r.startsWith('-'))
    .map((r) => r.replace(/^-\s*/, '')),
  '禁止重复介绍角色（姓名、身份、外貌已在上一 Scene 出现过的不得再写）',
  '禁止重复世界设定（已交代过的规则/背景不得复述）',
  '必须承接上一段（从续写锚点自然延续，不得重新开篇）',
  '必须在 Hook 处停止（写到本 Scene 结尾钩子即停，不得继续）',
];

export function buildPromptRulesBlock() {
  const legacy = String(process.env.INKOS_PROMPT_RULES || '').toLowerCase() === 'legacy';
  if (legacy) {
    return [
      '## Writer Optimization · 硬性约束',
      '',
      '### 商业铁律（摘要）',
      ...COMMERCIAL_PRINCIPLES.map((p) => `- **原则${p.id}** · ${p.title}：${p.must}`),
      '',
      ...WRITER_FIXED_RULES.map((r, i) => `${i + 1}. ${r}`),
    ].join('\n');
  }

  return [
    '## 写作要点（正向）',
    ...WRITER_SLIM_RULES.map((r, i) => `${i + 1}. ${r}`),
  ].join('\n');
}
