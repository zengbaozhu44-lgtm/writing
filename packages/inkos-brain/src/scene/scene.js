/**
 * Scene Planner & Scene Writer prompts
 */
import { resolveStoryClock, formatStoryClockForPrompt } from '../../../inkos-core/src/lib/story-clock.js';

export function buildScenePlan(intent) {
  return intent.scenes.map((scene) => ({
    ...scene,
    status: 'pending',
    wordTarget: scene.beat === 'hook' ? 600 : 800,
    reviewRequired: true,
  }));
}

export function buildSceneWritePrompt(ctx, intent, scene, dynamicPrompt) {
  // Lore seed only — 最终 Prompt 必须经 Runtime PromptCompiler.compile()，禁止外部再拼接
  const lore = typeof dynamicPrompt === 'string'
    ? dynamicPrompt
    : (dynamicPrompt?.text || '');
  const clock = resolveStoryClock({ ctx, intent, scene });
  const clockBlock = formatStoryClockForPrompt(clock);
  const lines = [
    '# Scene Lore Seed',
    '',
    `Scene ${scene.index}/${intent.scenes.length} · POV ${intent.pov}`,
    `- 目标: ${scene.goal}`,
    `- 冲突: ${scene.conflict}`,
    `- 节拍: ${scene.beat}`,
    scene.wordTarget ? `- 字数: ~${scene.wordTarget}` : '',
    intent.mainGoal ? `- 章目标: ${intent.mainGoal}` : '',
    intent.actionLine ? `- 本章行动线（各 Scene 推进同一条线）: ${intent.actionLine}` : '',
    intent.mustLose ? `- 代价: ${intent.mustLose}` : '',
    '',
    '## 信息边界（Phase 1.R · 必守）',
    '- Scene 目标 / 冲突 / 章目标中的事实 = 写作任务与世界信息，**不是** POV 角色的先验 Awareness。',
    '- 若 Character Subjective State 中该角色 Awareness = omit：禁止写成其「已经知道 / 亲眼看见 / 确知」这些任务事实；允许本场新获知并写出获得过程。',
    '- World / Narration ≠ Character Knowledge。',
    '',
    clockBlock,
    '',
    lore,
  ];
  return lines.filter(Boolean).join('\n');
}

export function reviewScene(scene, text, options = {}) {
  const issues = [];
  const len = text.replace(/\s/g, '').length;

  if (!options.importMode && len < scene.wordTarget * 0.4) {
    issues.push({ level: 'warning', msg: `Scene 过短（${len} 字）` });
  }
  if (/然后|接着|突然|之后/.test(text)) issues.push({ level: 'warning', msg: '含顺承词，违反硬切规则' });
  if (/他想起|他意识到|他觉得|他知道/.test(text)) issues.push({ level: 'warning', msg: '含禁词内心标记' });
  if (!text.trim()) issues.push({ level: 'critical', msg: 'Scene 正文为空' });

  const pass = !issues.some((i) => i.level === 'critical');
  return { sceneId: scene.id, pass, wordCount: len, issues };
}

export function assembleChapter(scenes) {
  // 防碎片：同一 scene.index 出现多次时只保留最后一个草稿（重开草稿堆叠时取最新一稿）
  const byIndex = new Map();
  for (const s of scenes) {
    if (!s || !s.text?.trim()) continue;
    const key = s.index != null ? s.index : (s.id || 'x');
    byIndex.set(key, s.text.trim());
  }
  return [...byIndex.values()].join('\n\n');
}
