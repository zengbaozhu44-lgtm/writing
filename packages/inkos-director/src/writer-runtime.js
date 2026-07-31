/**
 * Professional Writer Runtime — 职业作者执行层
 * 不新增 Engine/Analyzer；将既有 Director 规划转化为 Writer 可执行指令
 * 每个 Beat 第一目标：完成 Writer Intent，不是完成剧情流程
 */
import { resolveSentenceRhythm, BANNED_AI_PHRASES } from './voice-dna.js';

/** 最高原则 — Writer 完成读者体验，不是完成剧情 */
export const WRITER_RUNTIME_POLICY = {
  version: 'writer-runtime-2',
  core: 'Director 负责规划；Writer Runtime 负责把规划写成读者愿意一直看下去的正文。',
  questions: [
    '这一段是否让读者想知道？',
    '这一段是否让读者开始害怕？',
    '这一段是否让读者开始期待？',
    '这一段是否让读者获得满足？',
    '这一段是否让读者忍不住翻页？',
  ],
  priority: 'Author Mode > Story State 变化 > Cause→Effect > Writer Intent > 剧情结构',
  rules: [
    '不是检查剧情有没有写完，而是检查读者有没有一直想继续看',
    '每段 Before Story State ≠ After；禁止调查→继续调查',
    '每个事件须 Cause → Event → Effect，并承接上一 Effect',
    '每个 Beat 至少完成：新信息/危险/关系/行动/Promise 中两项，否则立即重写',
    'Live Monitor：禁复读、禁 AI 套话、禁连续解释',
    '动作 > 对白 > 事件 > 解释 — 永远',
  ],
};

/**
 * Author Mode — 职业作者处理这一幕的方式（不是剧情目标）
 * 解决「知道写什么，但写出来像 AI」：告诉 Writer 怎么操纵读者认知
 */
const AUTHOR_MODE_TEMPLATES = {
  doubt_then_confirm: {
    id: 'doubt_then_confirm',
    tensionControl: '前半压抑证明欲：只给异常信号，不给定论；后半用无法否认的事实打脸',
    sceneFocus: '认知落差 —— 先让读者站「POV 可能疯了」一边，再被迫改站「世界真有问题」',
    characterStrategy: 'POV 克制、自我怀疑、不敢大声说；用细节与反应说服读者，不是用旁白宣布真相',
    readerManipulation: '让读者先怀疑林夜疯了，再让读者发现世界真的有问题。不要马上证明。制造认知落差。',
    ban: '禁止开场就「发现异常并确认」；禁止立刻给出设定解释',
  },
  pressure_delay_reveal: {
    id: 'pressure_delay_reveal',
    tensionControl: '压力先升、真相后揭：每多加一次阻力，就少给一条答案',
    sceneFocus: '代价逼近 —— 读者关心「来不及了」胜过「是什么」',
    characterStrategy: '人物为活/为救人而动，不是为调查而调查；选择短促、对白带刺',
    readerManipulation: '先让读者替 POV 着急，再局部兑现信息；兑现后立刻加更大威胁',
    ban: '禁止解释完设定再写冲突；禁止调查→发现→继续调查',
  },
  mislead_then_flip: {
    id: 'mislead_then_flip',
    tensionControl: '故意引导错误归因：合理线索指向假答案，真答案用一个动作揭穿',
    sceneFocus: '误导与打脸 —— 读者以为懂了，再被事件推翻',
    characterStrategy: 'POV 也可能被骗；用对白种错因，用物件/时间戳打脸',
    readerManipulation: '先让读者相信一个「说得通」的假解释，再用不可辩驳的事实打脸',
    ban: '禁止提前剧透真答案；禁止用「其实……」作者旁白翻盘',
  },
  payoff_then_threat: {
    id: 'payoff_then_threat',
    tensionControl: '先给一口爽/答案，立刻收紧退路；释放幅度须小于新威胁',
    sceneFocus: '兑现 → 更大危机 —— 读者刚喘口气就不敢停',
    characterStrategy: '胜利要薄、代价要厚；人物刚得到就被迫再选一次',
    readerManipulation: '让读者先满足一拍，再制造「刚才的胜利不够用了」的紧迫',
    ban: '禁止兑现后长段抒情；禁止释放后无新威胁',
  },
  irreversible_cost: {
    id: 'irreversible_cost',
    tensionControl: '把情绪顶到「回不去」：后果可见、信息泄漏、关系裂开',
    sceneFocus: '不可逆改变 —— 世界/人物/关系至少一项永久位移',
    characterStrategy: '写人物意识到代价却仍做出选择后的空白与硬动作，不写后悔独白',
    readerManipulation: '让读者感到「从这里开始故事无法重置」—— 恐惧来自损失，不是来自形容词',
    ban: '禁止冲突后世界恢复原状；禁止用心理总结代替落地后果',
  },
  page_turn_hook: {
    id: 'page_turn_hook',
    tensionControl: '末句切断：动作未完成 / 倒计时 / 新威胁刚露面',
    sceneFocus: '翻页欲望 —— 读者必须带着问题离开本 Scene',
    characterStrategy: '人物刚做出下一步意图就被打断；不许收束章感',
    readerManipulation: '把读者留在「下一秒会发生什么」的悬崖边，禁止温吞收束',
    ban: '禁止总结本场；禁止哲理金句收尾',
  },
};

function normText(v = '') {
  return String(v || '').trim();
}

function inferAuthorModeId({
  structuralBeat = null,
  plan = {},
  sceneIndex = 1,
  climaxRole = null,
  conflict = null,
  sceneEnding = null,
  writerIntent = '',
  isRewardBeat = false,
} = {}) {
  const blob = [
    plan.goal, plan.obstacle, plan.choice, plan.consequence,
    plan.newInformation, plan.cliffhanger, writerIntent,
  ].map(normText).join(' ');

  if (structuralBeat === 'hook' || sceneEnding?.type === 'countdown') {
    return 'page_turn_hook';
  }
  if (conflict?.irreversibleChange || structuralBeat === 'consequence') {
    return 'irreversible_cost';
  }
  if (isRewardBeat || structuralBeat === 'newInformation') {
    return 'payoff_then_threat';
  }
  // 开篇/异常：优先认知落差（先怀疑 POV，再确认世界），不要急着证明
  if (
    (sceneIndex <= 2 || structuralBeat === 'goal')
    && /异常|疯|记忆|重置|幻觉|不信|世界/u.test(blob)
  ) {
    return 'doubt_then_confirm';
  }
  if (/欺骗|误导|隐瞒|假装|反转|其实/u.test(blob) || writerIntent === '误导读者') {
    return 'mislead_then_flip';
  }
  if (climaxRole?.isClimax || climaxRole?.isPreClimax) {
    return 'pressure_delay_reveal';
  }
  return 'pressure_delay_reveal';
}

function personalizeReaderManipulation(template, plan = {}, storyDna = {}) {
  const name = normText(storyDna.protagonist || plan.pov || 'POV');
  const anomaly = normText(plan.newInformation || plan.obstacle || plan.goal || '异常');
  const choice = normText(plan.choice);

  if (template.id === 'doubt_then_confirm') {
    return `让读者先怀疑${name}疯了（或看错了），再让读者发现世界真的有问题（${anomaly.slice(0, 28)}）。不要马上证明。制造认知落差。`;
  }
  if (template.id === 'mislead_then_flip' && choice) {
    return `先顺着「${choice.slice(0, 24)}」让读者觉得合理，再在后段用事件打脸。不要作者旁白揭穿。`;
  }
  if (template.id === 'irreversible_cost' && plan.consequence) {
    return `让读者感到${normText(plan.consequence).slice(0, 36)}之后故事回不去了——用落地事实，不用情绪形容词。`;
  }
  return template.readerManipulation.replace(/林夜/g, name);
}

/**
 * Scene / Beat 级 Author Mode — 职业作者会怎么处理这一幕
 */
export function buildAuthorMode({
  structuralBeat = null,
  plan = {},
  scene = {},
  storyDna = {},
  sceneIndex = 1,
  climaxRole = null,
  conflict = null,
  sceneEnding = null,
  writerIntent = '',
  isRewardBeat = false,
  emotionCurve = null,
  readerEmotion = null,
} = {}) {
  if (scene.authorMode?.readerManipulation || plan.authorMode?.readerManipulation) {
    const given = scene.authorMode || plan.authorMode;
    return {
      version: 'author-mode-1',
      id: given.id || 'custom',
      tensionControl: given.tensionControl || '',
      sceneFocus: given.sceneFocus || '',
      characterStrategy: given.characterStrategy || '',
      readerManipulation: given.readerManipulation || '',
      ban: given.ban || '禁止马上证明；禁止设定说明腔',
      writerIntent: writerIntent || given.writerIntent || '',
      valid: true,
    };
  }

  const id = inferAuthorModeId({
    structuralBeat,
    plan,
    sceneIndex,
    climaxRole,
    conflict,
    sceneEnding,
    writerIntent,
    isRewardBeat,
  });
  const template = AUTHOR_MODE_TEMPLATES[id] || AUTHOR_MODE_TEMPLATES.pressure_delay_reveal;
  const readerManipulation = personalizeReaderManipulation(template, {
    ...plan,
    pov: storyDna.protagonist || plan.pov,
  }, storyDna);

  let tensionControl = template.tensionControl;
  if (emotionCurve?.emotionPeak) {
    tensionControl = `${tensionControl}；本场情绪峰落在「${emotionCurve.emotionPeak}」，用动作堆到该峰，禁止贴标签`;
  }
  if (readerEmotion?.dramaticIrony) {
    tensionControl = `${tensionControl}；可保留信息差：读者可比 POV 先一步不安`;
  }

  return {
    version: 'author-mode-1',
    id: template.id,
    tensionControl,
    sceneFocus: template.sceneFocus,
    characterStrategy: template.characterStrategy,
    readerManipulation,
    ban: template.ban,
    writerIntent: writerIntent || '',
    valid: Boolean(readerManipulation),
    craftRule: '不是写「事件发生」，而是写「职业作者怎样操纵读者认知」',
  };
}

export function formatAuthorModeBlock(authorMode = {}, { compact = false } = {}) {
  if (!authorMode?.readerManipulation) return '';

  if (compact) {
    return [
      '**Author Mode（职业作者处理法）**：',
      authorMode.readerManipulation,
      authorMode.ban ? `禁止：${authorMode.ban}` : '',
    ].filter(Boolean).join('\n');
  }

  return [
    '### Author Mode · 职业作者怎么处理这一幕',
    '**不是写剧情目标，而是写读者被怎么带着走。**',
    '',
    `- **tensionControl**：${authorMode.tensionControl}`,
    `- **sceneFocus**：${authorMode.sceneFocus}`,
    `- **characterStrategy**：${authorMode.characterStrategy}`,
    `- **readerManipulation**：${authorMode.readerManipulation}`,
    authorMode.ban ? `- **禁止**：${authorMode.ban}` : '',
    '',
    '❌ 写：林夜发现异常。',
    `✅ 写：${authorMode.readerManipulation}`,
  ].filter(Boolean).join('\n');
}

/** 扩展 AI 味禁用表达 — 直接注入 Writer Prompt */
export const RUNTIME_BANNED_EXPRESSIONS = [
  ...BANNED_AI_PHRASES,
  '她感觉',
  '他感觉',
  '她意识到',
  '他意识到',
  '心中一震',
  '眉头微皱',
  '心头一紧',
  '后背发凉',
  '后背一凉',
  '瞳孔一缩',
  '倒吸一口凉气',
  '一股寒意',
  '莫名地',
  '说不清',
  '说不清为什么',
];

/** Reader Experience 标签 — Prompt 执行目标，非评分 */
export const READER_EXPERIENCES = [
  { id: 'curious', label: 'Curious', zh: '好奇' },
  { id: 'fear', label: 'Fear', zh: '恐惧' },
  { id: 'hope', label: 'Hope', zh: '期待' },
  { id: 'shock', label: 'Shock', zh: '震惊' },
  { id: 'satisfied', label: 'Satisfied', zh: '满足' },
  { id: 'urgent', label: 'Urgent', zh: '紧迫' },
  { id: 'relief', label: 'Relief', zh: '释放' },
  { id: 'anxious', label: 'Anxious', zh: '焦虑' },
  { id: 'misled', label: 'Misled', zh: '被误导' },
  { id: 'betrayed', label: 'Betrayed', zh: '被打脸' },
];

const BEAT_INTENT_BASE = {
  goal: {
    writerIntent: '建立目标',
    intentDetail: '用动作或对白让读者立刻知道「主角要干什么」，禁止背景综述',
    readerExperience: 'curious',
    experienceShift: '平静 → 好奇',
  },
  obstacle: {
    writerIntent: '制造压力',
    intentDetail: '让读者感到「事情变难了」，危险须具体可感',
    readerExperience: 'anxious',
    experienceShift: '好奇 → 焦虑',
  },
  choice: {
    writerIntent: '逼迫人物成长',
    intentDetail: '让读者感到 POV 无路可退 — 选哪边都有代价',
    readerExperience: 'urgent',
    experienceShift: '焦虑 → 紧迫',
  },
  consequence: {
    writerIntent: '让读者感受到代价',
    intentDetail: '代价必须落地可见，读者须感到「回不去了」',
    readerExperience: 'shock',
    experienceShift: '紧迫 → 震惊',
  },
  newInformation: {
    writerIntent: '兑现爽点',
    intentDetail: '释放认知或奖励，让读者感到「赚到了」',
    readerExperience: 'satisfied',
    experienceShift: '震惊 → 满足',
  },
  hook: {
    writerIntent: '逼读者翻页',
    intentDetail: '段末须让读者无法停下 — 未完成动作/致命追问/新威胁',
    readerExperience: 'urgent',
    experienceShift: '满足 → 更紧迫',
  },
  escalation: {
    writerIntent: '升级冲突',
    intentDetail: '压力再上一层，禁止重复上一 Beat',
    readerExperience: 'anxious',
    experienceShift: '焦虑加深',
  },
};

const EMOTION_SHOW_TECHNIQUES = {
  恐惧: ['手抖', '停顿', '呼吸变浅', '视线躲闪', '对白断裂', '后退半步'],
  紧张: ['语速加快', '动作变快', '反复确认', '握紧物体', '短句连打'],
  震惊: ['愣住', '失声', '动作中断', '对白戛然而止', '物体掉落'],
  愤怒: ['咬牙', '拍桌', '对白变短变狠', '动作幅度变大'],
  疑惑: ['停顿', '重复对方的话', '视线搜索', '试探性对白'],
  希望: ['呼吸放松', '动作果断', '对白变坚定', '步伐加快'],
  绝望: ['动作变慢', '沉默', '放弃某个动作', '对白变少'],
  期待: ['屏息', '前倾', '追问', '目光锁定'],
  释放: ['呼气', '肩膀落下', '短暂停顿后更快行动'],
  感动: ['沉默', '动作变轻', '对白变短'],
};

const EMOTION_FORBIDDEN_LABELS = [
  '他害怕了', '她害怕了', '他感到恐惧', '她感到恐惧',
  '他意识到', '她意识到', '他感觉', '她感觉',
  '心中一震', '心头一紧', '后背发凉',
];

function pickExperience(id) {
  return READER_EXPERIENCES.find((e) => e.id === id) || { id, label: id, zh: id };
}

function inferIntentVariant(structural, ctx = {}) {
  const { plan = {}, sceneEnding = {}, characterTransformation = {}, hookOutput = {} } = ctx;
  const choice = String(plan.choice || '');
  const info = String(plan.newInformation || '');

  if (structural === 'choice') {
    if (/欺骗|误导|隐瞒|假装/u.test(choice)) return '误导读者';
    if (characterTransformation?.changedDimensions?.includes('belief')) return '逼迫人物成长';
    return '逼迫人物成长';
  }
  if (structural === 'obstacle') {
    if (/倒计时|秒|分钟/u.test(`${plan.cliffhanger}${plan.obstacle}`)) return '制造焦虑';
    return '制造压力';
  }
  if (structural === 'newInformation') {
    if (/反转|其实|真相|不是/u.test(info)) return '打脸反转';
    if (ctx.isRewardBeat) return '兑现爽点';
    return '让读者产生追问';
  }
  if (structural === 'hook') {
    if (sceneEnding?.type === 'reversal') return '反转收尾';
    if (hookOutput?.type === 'Danger') return '制造恐惧';
    if (sceneEnding?.type === 'countdown') return '倒计时逼翻页';
    return '逼读者翻页';
  }
  if (structural === 'goal' && (ctx.sceneIndex === 1 || ctx.beatOrder === 1)) {
    return '直接进入事件';
  }
  if (structural === 'consequence' && ctx.irreversibleChange) {
    return '让读者感受不可逆代价';
  }
  return null;
}

function mapEmotionToBeat(structural, emotionCurve = {}) {
  const beats = emotionCurve.beats || {};
  return beats[structural]
    || emotionCurve[`emotion${structural}`]
    || {
      goal: emotionCurve.emotionStart,
      obstacle: '紧张',
      choice: emotionCurve.emotionMiddle,
      consequence: emotionCurve.emotionPeak,
      newInformation: emotionCurve.emotionPeak,
      hook: emotionCurve.emotionEnd,
    }[structural]
    || '紧张';
}

function buildBeatEmotionDirective(emotionLabel = '紧张', structural = '') {
  const techniques = EMOTION_SHOW_TECHNIQUES[emotionLabel]
    || EMOTION_SHOW_TECHNIQUES.紧张;

  return {
    emotion: emotionLabel,
    showDontTell: techniques,
    forbidden: EMOTION_FORBIDDEN_LABELS,
    directive: `不要解释${emotionLabel}。用动作表现：${techniques.slice(0, 4).join('、')}`,
    exampleWrong: emotionLabel === '恐惧' ? '他害怕了。' : `他感到${emotionLabel}。`,
    exampleRight: emotionLabel === '恐惧'
      ? '他的手停在半空。呼吸很轻。'
      : '门自己开了。她没动。',
    structuralBeat: structural,
  };
}

function buildBeatRhythmDirective({
  structural,
  sceneRhythm = null,
  climaxRole = null,
  readerEmotion = null,
  beatOrder = 1,
  sceneCount = 4,
} = {}) {
  const isClimaxBeat = climaxRole?.isClimax
    || (structural === 'consequence' && beatOrder >= 4)
    || sceneRhythm?.phase === 'explosion';
  const isRevealBeat = structural === 'newInformation'
    || sceneRhythm?.phase === 'slow';
  const isEmotionBeat = structural === 'choice'
    || readerEmotion?.dramaticIrony;

  let mode = 'action';
  let rules = ['减少解释', '增加动作与对白', '一句一事'];

  if (isClimaxBeat) {
    mode = 'climax';
    rules = ['短句', '动作连续', '对白快速', '禁止长段解释'];
  } else if (isRevealBeat) {
    mode = 'reveal';
    rules = ['放慢', '停顿', '留白', '一句一句揭开'];
  } else if (isEmotionBeat) {
    mode = 'emotion';
    rules = ['动作', '对白', '不要解释', '禁止心理总结'];
  } else if (structural === 'hook') {
    mode = 'hook';
    rules = ['极短句收尾', '未完成动作', '禁止总结', '硬切结束'];
  } else if (structural === 'goal' && beatOrder === 1) {
    mode = 'opening';
    rules = ['动作或对白直入', '禁止背景', '禁止人物介绍', '前两句须有事件'];
  }

  const sentenceRhythm = resolveSentenceRhythm({
    sceneRhythm: isClimaxBeat ? { phase: 'explosion' } : sceneRhythm,
    climaxRole: isClimaxBeat ? { isClimax: true } : climaxRole,
    readerEmotion,
  });

  return {
    mode,
    label: sentenceRhythm?.label || mode,
    rules: [...new Set([...rules, ...(sentenceRhythm?.rules || [])])].slice(0, 5),
    structuralBeat: structural,
  };
}

/**
 * 单 Beat Writer Intent — 职业作者执行核心
 */
export function buildBeatWriterIntent({
  structuralBeat = 'goal',
  beatOrder = 1,
  sceneIndex = 1,
  sceneCount = 4,
  emotionCurve = null,
  sceneRhythm = null,
  climaxRole = null,
  readerEmotion = null,
  plan = {},
  scene = {},
  storyDna = {},
  sceneEnding = null,
  characterTransformation = null,
  hookOutput = null,
  isRewardBeat = false,
  irreversibleChange = null,
  conflict = null,
  sceneAuthorMode = null,
} = {}) {
  const base = BEAT_INTENT_BASE[structuralBeat] || BEAT_INTENT_BASE.goal;
  const variant = inferIntentVariant(structuralBeat, {
    plan,
    sceneEnding,
    characterTransformation,
    hookOutput,
    isRewardBeat,
    irreversibleChange,
    sceneIndex,
    beatOrder,
  });

  const emotionLabel = mapEmotionToBeat(structuralBeat, emotionCurve || {});
  const readerExp = pickExperience(base.readerExperience);
  const writerIntent = variant || base.writerIntent;

  const authorMode = sceneAuthorMode?.readerManipulation
    ? {
      ...sceneAuthorMode,
      // Beat 可微调：按结构强调不同操纵侧面
      beatBias: structuralBeat === 'goal'
        ? '本 Beat 只播种怀疑，不要揭底'
        : structuralBeat === 'newInformation'
          ? '本 Beat 可揭一部分，但立刻制造新不确定性'
          : structuralBeat === 'hook'
            ? '本 Beat 切断证明欲，留下缺口'
            : '服从 Scene Author Mode，用动作落地',
    }
    : buildAuthorMode({
      structuralBeat,
      plan,
      scene,
      storyDna,
      sceneIndex,
      climaxRole,
      conflict: conflict || (irreversibleChange ? { irreversibleChange } : null),
      sceneEnding,
      writerIntent,
      isRewardBeat,
      emotionCurve,
      readerEmotion,
    });

  return {
    structuralBeat,
    beatOrder,
    writerIntent,
    intentDetail: base.intentDetail,
    readerExperience: readerExp,
    experienceShift: base.experienceShift,
    emotionDirective: buildBeatEmotionDirective(emotionLabel, structuralBeat),
    writerRhythm: buildBeatRhythmDirective({
      structural: structuralBeat,
      sceneRhythm,
      climaxRole,
      readerEmotion,
      beatOrder,
      sceneCount,
    }),
    authorMode,
    priority: 'Author Mode > Writer Intent > 剧情结构',
  };
}

/**
 * 职业作者 Scene 写法 — 页级节奏，非 Goal→Conflict 流程说明
 */
export function buildProfessionalSceneWriting({
  beats = [],
  sceneIndex = 1,
  sceneCount = 4,
  wordTarget = 800,
} = {}) {
  const total = beats.length || 6;
  const pages = [
    {
      phase: 'opening',
      beats: [1],
      label: '第一屏',
      directive: '直接进入事件。不要背景、不要设定、不要介绍人物。',
      writerIntent: '骗读者以为安全，然后立刻打破',
    },
    {
      phase: 'escalation',
      beats: [2, 3],
      label: '中段升级',
      directive: '不断升级冲突 — 每一 Beat 比上一 Beat 更紧。',
      writerIntent: '制造焦虑，让读者替 POV 着急',
    },
    {
      phase: 'payoff',
      beats: [4, 5],
      label: '兑现与代价',
      directive: '兑现一次期待，同时让读者感受代价或不归路。',
      writerIntent: '先让读者爽一下，再推入更大危机',
    },
    {
      phase: 'cliffhanger',
      beats: [total],
      label: '最后',
      directive: '必须翻页 — 未完成动作/倒计时/致命追问，禁止平收。',
      writerIntent: '逼读者翻页',
    },
  ];

  return {
    version: 'professional-scene-1',
    sceneIndex,
    sceneCount,
    wordTarget,
    pages,
    rule: '不是完成 Goal→Conflict 流程，是完成四段阅读体验',
    writerMust: pages.map((p) => `${p.label}：${p.directive}`).join(' → '),
  };
}

/**
 * 为 Scene 全部 Beat 注入 Writer Runtime
 */
export function enrichBeatsWithWriterRuntime(beats = [], ctx = {}) {
  const {
    emotionCurve,
    sceneRhythm,
    climaxRole,
    readerEmotion,
    plan,
    scene,
    storyDna,
    sceneEnding,
    characterTransformation,
    hookOutput,
    conflict,
    sceneIndex = 1,
    sceneCount = 4,
    authorMode = null,
  } = ctx;

  return beats.map((beat) => {
    const runtime = buildBeatWriterIntent({
      structuralBeat: beat.structuralBeat,
      beatOrder: beat.order,
      sceneIndex,
      sceneCount,
      emotionCurve,
      sceneRhythm,
      climaxRole,
      readerEmotion,
      plan,
      scene,
      storyDna,
      sceneEnding,
      characterTransformation,
      hookOutput: beat.hookOutput || hookOutput,
      isRewardBeat: beat.isRewardBeat,
      irreversibleChange: conflict?.irreversibleChange,
      conflict,
      sceneAuthorMode: authorMode,
    });

    return {
      ...beat,
      writerIntent: runtime.writerIntent,
      writerRuntime: runtime,
      authorMode: runtime.authorMode,
    };
  });
}

export function buildSceneWriterRuntime(executionPlan = {}) {
  const beats = executionPlan.beats || [];
  const plan = executionPlan.scenePlan || {};
  const sceneIndex = executionPlan.sceneIndex || 1;

  const authorMode = buildAuthorMode({
    plan,
    scene: executionPlan.scene || {},
    storyDna: executionPlan.storyDna || {},
    sceneIndex,
    climaxRole: executionPlan.climaxRole,
    conflict: executionPlan.conflict,
    sceneEnding: executionPlan.sceneEnding,
    emotionCurve: executionPlan.emotionCurve,
    readerEmotion: executionPlan.readerEmotion,
  });

  const enriched = enrichBeatsWithWriterRuntime(beats, {
    emotionCurve: executionPlan.emotionCurve,
    sceneRhythm: executionPlan.sceneRhythm,
    climaxRole: executionPlan.climaxRole,
    readerEmotion: executionPlan.readerEmotion,
    plan,
    scene: executionPlan.scene,
    storyDna: executionPlan.storyDna,
    sceneEnding: executionPlan.sceneEnding,
    characterTransformation: executionPlan.characterTransformation,
    hookOutput: executionPlan.hookOutput,
    conflict: executionPlan.conflict,
    sceneIndex,
    sceneCount: executionPlan.beats?.length || 4,
    authorMode,
  });

  const professionalScene = buildProfessionalSceneWriting({
    beats: enriched,
    sceneIndex,
    sceneCount: executionPlan.beats?.length || 4,
    wordTarget: executionPlan.wordTarget,
  });

  return {
    version: 'writer-runtime-2',
    policy: WRITER_RUNTIME_POLICY,
    authorMode,
    beats: enriched,
    professionalScene,
    bannedExpressions: RUNTIME_BANNED_EXPRESSIONS.slice(0, 20),
  };
}

export function formatWriterRuntimePolicyBlock() {
  return [
    '<!-- writer-runtime-policy-v1 -->',
    '## WRITER_RUNTIME_POLICY · 职业作者执行铁律',
    '',
    `**${WRITER_RUNTIME_POLICY.core}**`,
    '',
    '**不要问**：这一段剧情写完了吗？',
    '**要问**：',
    ...WRITER_RUNTIME_POLICY.questions.map((q) => `- ${q}`),
    '',
    '**优先级**：Author Mode > Writer Intent > Reader Experience > 剧情结构',
    '',
    ...WRITER_RUNTIME_POLICY.rules.map((r) => `- ${r}`),
  ].join('\n');
}

export function formatBeatWriterRuntimeBlock(beat = {}) {
  const rt = beat.writerRuntime;
  if (!rt) return '';

  const exp = rt.readerExperience;
  const emo = rt.emotionDirective;
  const rhythm = rt.writerRhythm;
  const am = rt.authorMode || beat.authorMode;

  return [
    `### Beat ${beat.order} · ${beat.label}`,
    am?.readerManipulation
      ? [
        `**Author Mode**：${am.readerManipulation}`,
        am.beatBias ? `- Beat 偏置：${am.beatBias}` : '',
      ].filter(Boolean).join('\n')
      : '',
    `**Writer Intent（第一优先）**：${rt.writerIntent}`,
    `- ${rt.intentDetail}`,
    `- **Reader Experience**：${exp?.zh || exp?.label}（${rt.experienceShift}）`,
    '',
    `**Emotion Directive**：${emo.directive}`,
    `- 用：${emo.showDontTell?.join('、')}`,
    `- 禁止：${emo.forbidden?.slice(0, 3).join('、')}`,
    `- ❌ ${emo.exampleWrong}`,
    `- ✅ ${emo.exampleRight}`,
    '',
    `**Writer Rhythm · ${rhythm.label}**：${rhythm.rules?.join(' · ')}`,
  ].filter(Boolean).join('\n');
}

export function formatSceneWriterRuntimeBlock(writerRuntime = {}) {
  if (!writerRuntime?.beats?.length) return '';

  const lines = [
    '## Professional Writer Runtime · Beat 执行层',
    '',
    formatWriterRuntimePolicyBlock(),
    '',
    formatAuthorModeBlock(writerRuntime.authorMode),
    '',
    '### 职业作者 Scene 写法',
    writerRuntime.professionalScene?.writerMust || '',
    '',
    '### 每 Beat Writer Intent',
  ];

  for (const beat of writerRuntime.beats) {
    lines.push('', formatBeatWriterRuntimeBlock(beat));
  }

  lines.push(
    '',
    '### 禁止 AI 味表达（出现即重写该句）',
    (writerRuntime.bannedExpressions || RUNTIME_BANNED_EXPRESSIONS.slice(0, 16)).join('、'),
    '',
    '**永远**：动作 > 对白 > 心理 > 解释',
  );

  return lines.filter(Boolean).join('\n');
}

export function formatCurrentBeatRuntimeBlock(beat = {}) {
  if (!beat?.writerRuntime) return formatBeatWriterRuntimeBlock(beat);
  const rt = beat.writerRuntime;
  const emo = rt.emotionDirective;
  const rhythm = rt.writerRhythm;
  const exp = rt.readerExperience;
  const am = rt.authorMode || beat.authorMode;

  return [
    '## 当前 Beat · Writer Runtime（第一优先执行）',
    '',
    am?.readerManipulation
      ? [
        '### Author Mode · 职业作者怎么处理',
        am.readerManipulation,
        `- tensionControl：${am.tensionControl || '—'}`,
        `- sceneFocus：${am.sceneFocus || '—'}`,
        `- characterStrategy：${am.characterStrategy || '—'}`,
        am.beatBias ? `- 本 Beat：${am.beatBias}` : '',
        am.ban ? `- 禁止：${am.ban}` : '',
        '',
        '❌ 写：林夜发现异常。',
        `✅ 写：${am.readerManipulation}`,
        '',
      ].filter(Boolean).join('\n')
      : '',
    `**Writer Intent**：${rt.writerIntent}`,
    rt.intentDetail,
    '',
    `**Reader Experience 目标**：${exp?.zh}（${rt.experienceShift}）`,
    '本 Beat 结束时读者感受须与 Beat 开始时不同，否则失败。',
    '',
    `**Emotion Directive**：${emo.directive}`,
    `用动作表现：${emo.showDontTell?.join('、')}`,
    `禁止写：${emo.forbidden?.slice(0, 4).join('、')}`,
    `❌ ${emo.exampleWrong}  →  ✅ ${emo.exampleRight}`,
    '',
    `**Writer Rhythm**：${rhythm.rules?.join(' · ')}`,
    '',
    '**铁律**：先想 Author Mode 怎么骗读者，再完成 Intent，再落地剧情。动作 > 对白 > 事件 > 解释。',
  ].filter(Boolean).join('\n');
}
