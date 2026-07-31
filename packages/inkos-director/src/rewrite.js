export function buildPacingRewriteSection(pacing) {
  if (!pacing?.failures?.length) return '';

  const lines = [
    '### Pacing 节奏（实时分析）',
    ...pacing.failures.map((f) => `- ${f}`),
  ];

  if (pacing.rewriteHints?.length) {
    lines.push('', '**修正方向**：', ...[...new Set(pacing.rewriteHints)].map((h) => `- ${h}`));
  }

  lines.push(
    '',
    '**Scene 节拍顺序**：动作 → 对白 → 冲突 → 解释 → 动作 → Hook',
    '**禁止**：连续 4 段纯解释',
    '**连续阈值**：说明 >250 字加事件；心理 >180 字加动作；设定 >150 字加对话',
    '**节奏带**：每 800~1200 字须发生至少 1 次事件',
  );

  return lines.join('\n');
}

export function buildDirectorRewritePrompt({ failures, checkpoints, scene, intent, pacing }) {
  const failedWindows = (checkpoints || []).filter((c) => !c.pass);
  const lines = [
    '## Director 重写指令 — 停止当前 Scene，重写本 Scene 正文',
    '',
    '**硬性约束**：不得修改剧情、人物关系、事件结果；只改表达、节奏、对话与感官描写。',
    '',
    '### 未通过检测',
    ...failures.map((f) => `- ${f}`),
    '',
  ];

  if (failedWindows.length) {
    lines.push('### 失败检测点（每 500 字）');
    for (const w of failedWindows) {
      lines.push(`- 窗口 ${w.index + 1}（约 ${w.charRange} 字）：${w.failures.join('；')}`);
    }
    lines.push('');
  }

  const pacingSection = buildPacingRewriteSection(pacing);
  if (pacingSection) {
    lines.push(pacingSection, '');
  }

  lines.push(
    '### Scene 边界（保持不变）',
    `- Goal：${scene?.goal || intent?.mainGoal || '—'}`,
    `- Conflict：${scene?.conflict || intent?.obstacles?.[0] || '—'}`,
    '',
    '### 重写要点',
    '- Opening：开篇 300 字内出现事件，禁止拖沓',
    '- Conflict：每段检测点体现冲突升级',
    '- Dialogue：每 500 字至少 1 次对话',
    '- Emotion：至少一次情绪变化',
    '- Information：世界观解释连续 ≤ 200 字',
    '- Hook：结尾留下问题/悬念',
    '- Pacing：动作→对白→冲突→解释→动作→Hook',
  );

  return lines.join('\n');
}
