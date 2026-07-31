/**
 * Scene Planner & Scene Writer prompts
 */
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
  const lines = [
    '# Scene Lore Seed',
    '',
    `Scene ${scene.index}/${intent.scenes.length} · POV ${intent.pov}`,
    `- 目标: ${scene.goal}`,
    `- 冲突: ${scene.conflict}`,
    `- 节拍: ${scene.beat}`,
    scene.wordTarget ? `- 字数: ~${scene.wordTarget}` : '',
    intent.mainGoal ? `- 章目标: ${intent.mainGoal}` : '',
    intent.mustLose ? `- 代价: ${intent.mustLose}` : '',
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
  return scenes
    .filter((s) => s.text)
    .map((s) => s.text.trim())
    .join('\n\n');
}
