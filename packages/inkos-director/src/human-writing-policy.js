/**
 * Anti-AI Writing Policy — 禁止 AI 逻辑，不只是禁止词
 * 增强 Voice DNA：真人写作结构，直接注入 Writer Prompt
 */

export const HUMAN_WRITING_POLICY = {
  version: 'human-writing-1',
  core: '禁止 AI 逻辑，不只是禁止词。事件 → 反应 → 留白，禁止事情 → 原因 → 结果写全。',
  rules: [
    {
      id: 'no_emotion_summary',
      title: '禁止情绪总结',
      wrong: '他感到恐惧。',
      right: '他的手摸到门把时停了一秒。',
    },
    {
      id: 'no_character_explain',
      title: '禁止解释人物',
      wrong: '她很聪明。',
      right: '会议结束前，她已经找出了三个漏洞。',
    },
    {
      id: 'no_over_complete',
      title: '禁止过度完整',
      wrong: '事情 → 原因 → 结果（写全）',
      right: '事件 → 反应 → 留白（故意缺一块）',
    },
    {
      id: 'no_psychology_label',
      title: '禁止心理贴标签',
      wrong: '他意识到事情不对。',
      right: '门自己开了。他的手停在半空。',
    },
    {
      id: 'no_trait_adjective',
      title: '禁止性格形容词代替行为',
      wrong: '她很大胆 / 他很谨慎。',
      right: '她先推开门；他把手机倒扣在桌上。',
    },
  ],
  flowBan: '事情 → 原因 → 结果',
  flowMust: '事件 → 反应 → 留白',
  priority: '动作 > 对白 > 事件 > 解释；留白 > 写全',
};

/**
 * 可附带 Scene 上下文的人性化写法指令
 */
export function buildHumanWritingPolicy({
  sceneRhythm = null,
  climaxRole = null,
  authorMode = null,
} = {}) {
  const beatHint = climaxRole?.isClimax
    ? '高潮段：短句 + 动作 + 对白；禁止事后分析整场因果'
    : sceneRhythm?.phase === 'slow'
      ? '缓冲/揭秘段：一句揭一层，允许留白，禁止一口气解释完'
      : '推进段：事件落地后只写反应，原因留给后文或对白裂缝';

  return {
    ...HUMAN_WRITING_POLICY,
    beatHint,
    authorModeEcho: authorMode?.readerManipulation
      ? `服从 Author Mode：${authorMode.readerManipulation.slice(0, 50)} — 仍禁止用旁白「说明」该意图`
      : '',
    valid: true,
  };
}

export function formatHumanWritingPolicyBlock(policy = HUMAN_WRITING_POLICY) {
  const p = policy?.rules ? policy : HUMAN_WRITING_POLICY;
  const lines = [
    '### Human Writing Policy · 真人化（禁止 AI 逻辑）',
    '',
    `**${p.core}**`,
    '',
    `**禁止写作流**：${p.flowBan}`,
    `**必须写作流**：${p.flowMust}`,
    '',
  ];

  for (const r of p.rules) {
    lines.push(
      `**${r.title}**`,
      `❌ ${r.wrong}`,
      `✅ ${r.right}`,
      '',
    );
  }

  if (p.beatHint) {
    lines.push(`- **本 Scene**：${p.beatHint}`);
  }
  if (p.authorModeEcho) {
    lines.push(`- ${p.authorModeEcho}`);
  }

  lines.push(
    '',
    `- **优先级**：${p.priority}`,
    '- Voice DNA 禁词仍生效；本层管的是**写法逻辑**，不是词表',
  );

  return lines.filter(Boolean).join('\n');
}

export function formatHumanWritingPolicyBrief(policy = HUMAN_WRITING_POLICY) {
  return `Human Writing：${(policy || HUMAN_WRITING_POLICY).flowMust} · 禁情绪总结/解释人物/写全因果`;
}
