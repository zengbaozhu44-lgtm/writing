/**
 * Voice DNA — 作品级文风控制
 * 句长 · 节奏 · 对话比例 · 动作/描写密度 · 禁止 AI 常用表达
 * 驱动 Writer P3，不同作品不同文风
 */

export const BANNED_AI_PHRASES = [
  '不禁',
  '心中一凛',
  '隐约感到',
  '莫名',
  '仿佛',
  '似乎',
  '不由得',
  '内心深处',
  '这一刻',
  '空气仿佛凝固',
  '时间仿佛静止',
  '嘴角微微上扬',
  '眼中闪过一丝',
  '心中暗道',
  '脑海中浮现',
  '一股莫名的',
  '难以言喻',
  '说不清道不明',
  '她感觉',
  '他感觉',
  '她意识到',
  '他意识到',
  '心中一震',
  '眉头微皱',
  '心头一紧',
  '后背发凉',
];

export const GENRE_VOICE_PRESETS = {
  mystery: {
    id: 'mystery',
    label: '悬疑紧凑',
    sentenceLength: 'short',
    rhythm: 'staccato',
    dialogueRatio: 0.5,
    actionDensity: 'high',
    descriptionDensity: 'minimal',
    pov: '限知第三人称',
    notes: '信息寄生对白；异常反噬；禁止解释设定',
  },
  urban: {
    id: 'urban',
    label: '都市快节奏',
    sentenceLength: 'mixed',
    rhythm: 'varied',
    dialogueRatio: 0.45,
    actionDensity: 'high',
    descriptionDensity: 'low',
    pov: '限知第三人称',
    notes: '身体先行；硬切；环境一笔带过',
  },
  epic: {
    id: 'epic',
    label: '史诗沉稳',
    sentenceLength: 'medium',
    rhythm: 'flowing',
    dialogueRatio: 0.35,
    actionDensity: 'medium',
    descriptionDensity: 'medium',
    pov: '限知第三人称',
    notes: '利益驱动；世界不围主角转；代价可见',
  },
  default: {
    id: 'default',
    label: '商业快节奏',
    sentenceLength: 'short',
    rhythm: 'staccato',
    dialogueRatio: 0.42,
    actionDensity: 'high',
    descriptionDensity: 'low',
    pov: '限知第三人称',
    notes: '对白推动剧情；动作优先于心理；禁止总结句',
  },
};

function norm(v = '') {
  return String(v || '').trim();
}

function inferGenrePreset(storyDna = {}) {
  const genre = norm(storyDna.genre || storyDna.题材 || '');
  const hook = norm(storyDna.core_hook || storyDna.main_question || '');
  if (/悬疑|推理|诡秘|克苏鲁/u.test(`${genre}${hook}`)) return GENRE_VOICE_PRESETS.mystery;
  if (/史诗|王朝|战争|玄幻/u.test(`${genre}${hook}`)) return GENRE_VOICE_PRESETS.epic;
  if (/都市|现代|科幻|近未来/u.test(`${genre}${hook}`)) return GENRE_VOICE_PRESETS.urban;
  return GENRE_VOICE_PRESETS.default;
}

/**
 * 解析作品 Voice DNA — 合并 Story DNA / Style DNA / Intent
 */
export function resolveVoiceDna({
  storyDna = {},
  styleDna = {},
  intent = {},
  sceneRhythm = null,
  climaxRole = null,
  readerEmotion = null,
} = {}) {
  const preset = inferGenrePreset(storyDna);
  const dnaVoice = storyDna.voice_dna || storyDna.voiceDna || {};
  const styleDims = styleDna.dimensions || styleDna.voice || {};
  const styleWriting = styleDna.writing || {};

  const dialogueRatio = styleDims.dialogueRatio
    ?? dnaVoice.dialogueRatio
    ?? (styleDims.dialogue != null ? styleDims.dialogue / 100 : preset.dialogueRatio);

  const sentenceRhythm = resolveSentenceRhythm({
    sceneRhythm,
    climaxRole,
    readerEmotion,
    preset,
    dnaVoice,
  });

  return {
    version: 'voice-dna-2',
    presetId: preset.id,
    label: dnaVoice.label || styleDna.name || preset.label,
    sentenceLength: dnaVoice.sentenceLength || styleDims.sentenceLength || preset.sentenceLength,
    rhythm: dnaVoice.rhythm || styleDims.rhythm || preset.rhythm,
    sentenceRhythm,
    dialogueRatio: Math.min(0.7, Math.max(0.25, Number(dialogueRatio) || preset.dialogueRatio)),
    actionDensity: dnaVoice.actionDensity || styleDims.actionDensity || preset.actionDensity,
    descriptionDensity: dnaVoice.descriptionDensity || styleDims.descriptionDensity || preset.descriptionDensity,
    pov: dnaVoice.pov || styleWriting.pov || intent.povStyle || preset.pov,
    notes: dnaVoice.notes || styleWriting.notes || preset.notes,
    bannedPhrases: [
      ...BANNED_AI_PHRASES,
      ...(dnaVoice.bannedPhrases || styleDims.bannedPhrases || []),
    ].slice(0, 24),
    sampleLines: styleDna.sampleLines || styleWriting.sampleLines || dnaVoice.sampleLines || [],
    goldenSample: styleDna.goldenSample || styleDna.sampleText || dnaVoice.goldenSample || '',
  };
}

/** Scene 级句读节奏 — 高潮/揭秘/情绪段不同写法 */
export function resolveSentenceRhythm({
  sceneRhythm = null,
  climaxRole = null,
  readerEmotion = null,
  preset = {},
  dnaVoice = {},
} = {}) {
  if (dnaVoice.sentenceRhythm) return dnaVoice.sentenceRhythm;

  if (readerEmotion?.dramaticIrony && /揪心|不忍|紧张/u.test(readerEmotion.readerEmotionPeak || '')) {
    return {
      mode: 'emotion',
      label: '读者情绪/信息差',
      rules: ['减少解释。', '增加动作与对白。', '让读者比 POV 更紧张 — 用细节不用旁白。'],
    };
  }

  const phase = sceneRhythm?.phase;
  if (phase === 'explosion' || climaxRole?.isClimax) {
    return {
      mode: 'climax',
      label: '高潮',
      rules: ['短句。', '动作连续。', '对白快速。', '禁止长段解释。'],
    };
  }
  if (phase === 'slow') {
    return {
      mode: 'reveal',
      label: '揭秘/缓冲',
      rules: ['放慢节奏。', '增加停顿与留白。', '对白可拉长但须推信息。'],
    };
  }
  if (phase === 'fast') {
    return {
      mode: 'action',
      label: '推进',
      rules: ['减少解释。', '增加动作与对白。', '一句一事。'],
    };
  }
  return {
    mode: preset.rhythm || 'staccato',
    label: '默认',
    rules: ['动作 > 对白 > 事件 > 解释', '禁止心理总结句'],
  };
}

export function formatVoiceDnaBlock(voiceDna = {}) {
  if (!voiceDna?.presetId && !(voiceDna?.sampleLines?.length) && !voiceDna?.goldenSample) return '';

  const dialoguePct = Math.round((voiceDna.dialogueRatio || 0.42) * 100);
  const banned = (voiceDna.bannedPhrases || BANNED_AI_PHRASES).slice(0, 6).join('、');
  const sample = String(voiceDna.goldenSample || '').trim()
    || (Array.isArray(voiceDna.sampleLines) ? voiceDna.sampleLines.filter(Boolean).join('\n') : '');

  return [
    '### Voice DNA · 文风（模仿优先）',
    voiceDna.label || voiceDna.presetId
      ? `**作品文风**：${voiceDna.label || voiceDna.presetId}`
      : '',
    '',
    sample
      ? [
        '**风格样本（请模仿质感，勿复述情节）**：',
        '---',
        sample.slice(0, 700),
        '---',
      ].join('\n')
      : '',
    `- **句长**：${voiceDna.sentenceLength || 'mixed'}（情感场面可长句；动作场面短句）`,
    `- **节奏**：${voiceDna.rhythm || 'staccato'}`,
    `- **对话比例**：约 ${dialoguePct}%`,
    `- **动作密度**：${voiceDna.actionDensity || 'high'}（身体动作先于心理标签）`,
    `- **描写密度**：${voiceDna.descriptionDensity || 'medium'}`,
    `- **POV**：${voiceDna.pov || 'limited'}`,
    voiceDna.notes ? `- **风格备注**：${voiceDna.notes}` : '',
    voiceDna.sentenceRhythm?.rules?.length
      ? [
        '',
        `**本 Scene 句读节奏 · ${voiceDna.sentenceRhythm.label}**：`,
        ...voiceDna.sentenceRhythm.rules.map((r) => `- ${r}`),
      ].join('\n')
      : '',
    '',
    banned ? `少用套话：${banned}` : '',
    '对白像真人：允许口语、打断、省略；不要每句都「完成任务」。',
  ].filter(Boolean).join('\n');
}

export function formatVoiceDnaBrief(voiceDna = {}) {
  if (!voiceDna?.presetId) return '';
  const dialoguePct = Math.round((voiceDna.dialogueRatio || 0.42) * 100);
  return `Voice DNA：${voiceDna.label} · 对话${dialoguePct}% · ${voiceDna.sentenceLength}句 · ${voiceDna.rhythm}节奏`;
}
