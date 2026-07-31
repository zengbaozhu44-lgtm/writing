/**
 * Writer Craft Runtime — 职业作者写作工艺层（P0）
 * 不是 Analyzer：只在 Writer Runtime / Beat Execution / Prompt 内边写边验边改
 *
 * Director 决定写什么；Writer Craft 决定怎么写得好看。
 * 阅读体验 > 规则完成
 */

export const WRITER_CRAFT_POLICY = {
  version: 'writer-craft-1',
  core: 'Director 决定故事写什么；Writer Runtime 决定故事如何写得好看。',
  ask: '职业作者会不会这样写？',
  notAsk: '规则有没有完成？',
  priority: '阅读体验 > 规则完成',
  order: '画面 → 动作 → 对白 → 信息 → 最后才允许极短解释',
  modules: [
    'Show Dont Tell',
    'Scene Visualization',
    'Sentence Rhythm',
    'Information Density',
    'Language Variation',
    'Professional Dialogue',
    'Paragraph Purpose',
  ],
};

/** 禁止直接解释的心理/认知标签 */
export const TELL_BANS = [
  '意识到', '觉得', '感到', '知道', '明白',
  '害怕', '紧张', '震惊', '恐惧', '难过',
  '十分震惊', '十分紧张', '很害怕', '很紧张',
  '事情严重', '前所未有', '心中一紧', '隐约觉得',
];

const CRAFT_AI_PHRASES = [
  '深吸一口气', '心跳加速', '意识到', '心中一紧',
  '隐约觉得', '无法承受', '改变一切', '时间窗口收窄',
  '前所未有的紧张', '一股莫名',
];

const TELL_PATTERNS = [
  /他(很|十分|非常)?(害怕|紧张|震惊|恐惧|难过|担心)/u,
  /她(很|十分|非常)?(害怕|紧张|震惊|恐惧|难过|担心)/u,
  /(林\S{0,2}|他|她)(意识到|觉得|感到|知道|明白)/u,
  /心中(一紧|一凛|暗道)/u,
  /感到(恐惧|紧张|震惊|危险)/u,
];

function stripSpace(s = '') {
  return String(s || '').replace(/\s+/g, '');
}

function sentences(text = '') {
  return String(text || '')
    .split(/[。！？!?\n]+/u)
    .map((s) => s.trim())
    .filter((s) => s.length >= 2);
}

function avgSentenceLen(text = '') {
  const s = sentences(text);
  if (!s.length) return 0;
  const total = s.reduce((n, x) => n + stripSpace(x).length, 0);
  return total / s.length;
}

function hasDialogue(text = '') {
  return /[「」『』]/.test(text) || /"[^"]{2,}"/.test(text);
}

function hasConcreteAction(text = '') {
  return /按|推|拉|插|拔|跑|冲|停|握|咬|开门|关门|抬眼|回头|蹲下|站起|写入|敲|锁|塞|扔|踩|退|迈/u.test(text);
}

function hasVisual(text = '') {
  return /光|风|门|屏|灯|影|色|冷|热|声|尘|雨|血|字|表针|风扇|走廊|瞳|手/u.test(text)
    || /看见|眼前|墙上|脚下|门口/u.test(text);
}

/**
 * 1) Show, Don't Tell
 */
export function evaluateShowDontTell(text = '') {
  const hits = [];
  for (const re of TELL_PATTERNS) {
    const m = text.match(re);
    if (m) hits.push(m[0]);
  }
  for (const w of TELL_BANS) {
    if (text.includes(w) && !hits.includes(w)) hits.push(w);
  }
  // 允许对白内偶尔出现口语“我知道”，但对旁白解释仍打
  const narrativeHits = hits.filter((h) => {
    // 粗略：若整段几乎全是对白且命中在引号内，放宽
    return true;
  });

  const pass = narrativeHits.length === 0;
  return {
    kind: 'showDontTell',
    hits: narrativeHits.slice(0, 6),
    pass,
    failReasons: pass ? [] : [
      `Show Don't Tell：禁止直接解释心理/认知（${narrativeHits.slice(0, 4).join('、')}）→ 改为动作/对白/画面`,
    ],
  };
}

/**
 * 2) Scene Visualization — 每段至少一个动作/画面/对白
 */
export function evaluateSceneVisualization(text = '') {
  const ok = hasConcreteAction(text) || hasVisual(text) || hasDialogue(text);
  const onlyExplain = !ok && /(知道|明白|意识到|觉得|感到|紧张|害怕)/u.test(text);
  return {
    kind: 'visualization',
    hasAction: hasConcreteAction(text),
    hasVisual: hasVisual(text),
    hasDialogue: hasDialogue(text),
    pass: ok,
    failReasons: ok ? [] : [
      onlyExplain
        ? 'Scene Visualization：只有解释/心理，缺少画面、动作或对白'
        : 'Scene Visualization：须至少有一个具体动作 / 具体画面 / 一句对白',
    ],
  };
}

/**
 * 3) Sentence Rhythm — 按场景模式检查句长
 */
export function evaluateSentenceRhythm(text = '', { craftMode = 'action' } = {}) {
  const avg = avgSentenceLen(text);
  const sents = sentences(text);
  const longCount = sents.filter((s) => stripSpace(s).length > 28).length;

  let pass = true;
  const failReasons = [];

  if (craftMode === 'climax') {
    if (avg > 18 || longCount >= Math.max(2, Math.ceil(sents.length * 0.5))) {
      pass = false;
      failReasons.push('Sentence Rhythm · 高潮：须短句/停顿/动作/对白，一句一画面，禁止长段解释');
    }
  } else if (craftMode === 'emotion') {
    if (/他很难过|她很难过|十分悲伤/u.test(text) && !hasConcreteAction(text)) {
      pass = false;
      failReasons.push('Sentence Rhythm · 情绪：用握拳/停顿/沉默/对白，禁止「他很难过」');
    }
  }
  // reveal/action：宽松

  return {
    kind: 'sentenceRhythm',
    mode: craftMode,
    avgSentenceLen: Math.round(avg * 10) / 10,
    pass,
    failReasons,
  };
}

/**
 * 4) Information Density — 每 150~200 字须有信息增量信号
 */
export function evaluateInformationDensity(text = '') {
  const len = stripSpace(text).length;
  if (len < 80) {
    // 短片段放宽，但仍需有信号
    const light = detectInfoSignals(text);
    return {
      kind: 'infoDensity',
      length: len,
      signals: light,
      pass: light.count >= 1 || len < 40,
      failReasons: light.count >= 1 || len < 40
        ? []
        : ['Information Density：短段也须至少落地一项新信息/代价/行动'],
    };
  }

  const signals = detectInfoSignals(text);
  // 约每 180 字一项
  const need = Math.max(1, Math.floor(len / 180));
  const pass = signals.count >= need;

  return {
    kind: 'infoDensity',
    length: len,
    need,
    signals,
    pass,
    failReasons: pass ? [] : [
      `Information Density：约 ${len} 字仅 ${signals.count} 项增量，须 ≥${need}（世界/人物/关系/规则/谜团/线索/代价/Promise/Payoff）`,
    ],
  };
}

function detectInfoSignals(text = '') {
  const flags = {
    世界信息: /重置|规则|系统|空间|世界|节点/u.test(text),
    人物信息: /记忆|死亡|第\d+次|不是唯一|秘密|伤口/u.test(text),
    关系变化: /苏晚|妹妹|信任|背叛|同盟|名字/u.test(text),
    规则变化: /权限|锁定|清除|名单|归档|改写/u.test(text),
    谜团: /谁|为什么|什么|第一次|不是/u.test(text),
    线索: /照片|记录|日志|密码|耳机|倒计时/u.test(text),
    代价: /失去|牺牲|标记|切断|暴露/u.test(text),
    Promise: /答应|保证|说好|一定会/u.test(text),
    Payoff: /兑现|找到|救下|拿到|打开/u.test(text),
  };
  const hit = Object.entries(flags).filter(([, v]) => v).map(([k]) => k);
  return { count: hit.length, hit };
}

/**
 * 5) Language Variation — 句式/主语/突然/套话重复
 */
export function evaluateLanguageVariation(text = '', {
  recentExpressions = [],
  recentParagraphs = [],
} = {}) {
  const failReasons = [];
  const sents = sentences(text);

  // 连续同一主语开头
  let streak = 0;
  let prev = '';
  for (const s of sents) {
    const open = s.slice(0, 2);
    if (open && open === prev) streak += 1;
    else streak = 0;
    prev = open;
    if (streak >= 2) {
      failReasons.push('Language Variation：连续多句同一主语开头（如「林夜…林夜…」）');
      break;
    }
  }

  // 「突然」过密
  const sudden = (text.match(/突然/g) || []).length;
  if (sudden >= 2) {
    failReasons.push('Language Variation：禁止反复「突然」');
  }

  // AI 套话
  const craftHits = [];
  for (const p of [...CRAFT_AI_PHRASES, ...TELL_BANS]) {
    if (text.includes(p)) craftHits.push(p);
  }
  if (craftHits.some((p) => /深吸一口气|心跳加速|意识到|心中一紧|无法承受|改变一切|隐约觉得/.test(p))) {
    failReasons.push(`Language Variation：AI 高频表达须改写（${craftHits.slice(0, 4).join('、')}）`);
  }

  // 与 recentExpressions 撞车
  const compact = stripSpace(text).slice(0, 40);
  for (const expr of (recentExpressions || []).slice(-12)) {
    if (expr && compact.includes(stripSpace(expr).slice(0, 10)) && stripSpace(expr).length >= 8) {
      failReasons.push('Language Variation：与近期表达重复，换动词/句式');
      break;
    }
  }

  return {
    kind: 'languageVariation',
    craftHits: craftHits.slice(0, 8),
    pass: failReasons.length === 0,
    failReasons: [...new Set(failReasons)],
  };
}

/**
 * 6) Professional Dialogue — 有对白须推剧情；关键信息优先对白（启发）
 */
export function evaluateProfessionalDialogue(text = {}) {
  const t = typeof text === 'string' ? text : '';
  const failReasons = [];
  const dialogue = hasDialogue(t);

  if (dialogue) {
    const pushes = /[？?]|别|必须|逃|锁|名单|重置|权限|谁|你|我|不行|该死/u.test(t)
      || detectInfoSignals(t).count >= 1
      || /冲突|骗|信|撒谎|走|停/u.test(t);
    if (!pushes && stripSpace(t).length > 30) {
      failReasons.push('Professional Dialogue：对白须推进剧情/冲突/关系/线索/误导，禁止闲聊');
    }
  } else {
    // 关键信息却全是旁白解释
    if (/(监视|危险|严重|锁定)/u.test(t) && /(意识到|知道|觉得|感到)/u.test(t)) {
      failReasons.push('Professional Dialogue：关键信息优先进入对白，不要旁白解释（如「别回头，它在你后面」）');
    }
  }

  return {
    kind: 'dialogue',
    hasDialogue: dialogue,
    pass: failReasons.length === 0,
    failReasons,
  };
}

/**
 * 7) Paragraph Purpose
 */
export function evaluateParagraphPurpose(text = '') {
  const purposes = {
    推进人物: /选择|拒绝|敢|迈|转身|决定|破例/u.test(text),
    推进关系: /苏晚|妹妹|信任|背叛|名字|「/u.test(text),
    推进冲突: /锁|警告|倒计时|追杀|封|抢|挡/u.test(text),
    推进世界: /重置|规则|系统|节点|世界/u.test(text),
    推进谜团: /谁|为什么|什么|第\d+次|不是/u.test(text),
    兑现Promise: /兑现|救|拿到|活|打开/u.test(text),
    制造Hook: /未|突然停|门外|倒计时|还没|刚要/u.test(text) || /[？?]\s*$/u.test(text.trim()),
  };
  const hit = Object.entries(purposes).filter(([, v]) => v).map(([k]) => k);
  const pass = hit.length >= 1 || stripSpace(text).length < 25;

  return {
    kind: 'paragraphPurpose',
    purposes: hit,
    pass,
    failReasons: pass ? [] : [
      'Paragraph Purpose：本段缺少存在意义（须推进人物/关系/冲突/世界/谜团/Promise/Hook 之一）',
    ],
  };
}

export function resolveCraftMode({
  climaxRole = null,
  sceneRhythm = null,
  beat = null,
} = {}) {
  if (climaxRole?.isClimax || sceneRhythm?.phase === 'explosion' || beat?.structuralBeat === 'consequence') {
    return 'climax';
  }
  if (sceneRhythm?.phase === 'slow' || beat?.structuralBeat === 'newInformation') {
    return 'reveal';
  }
  if (beat?.structuralBeat === 'choice') {
    return 'emotion';
  }
  return 'action';
}

/**
 * Craft 总闸 — 并入 Writer Runtime 边写边验
 */
export function validateWriterCraft({
  text = '',
  beat = {},
  climaxRole = null,
  sceneRhythm = null,
  recentExpressions = [],
  recentParagraphs = [],
  light = false,
} = {}) {
  const craftMode = beat.craftMode || resolveCraftMode({ climaxRole, sceneRhythm, beat });
  const checks = light
    ? [
      evaluateShowDontTell(text),
      evaluateSceneVisualization(text),
      evaluateSentenceRhythm(text, { craftMode }),
      evaluateInformationDensity(text),
    ]
    : [
      evaluateShowDontTell(text),
      evaluateSceneVisualization(text),
      evaluateSentenceRhythm(text, { craftMode }),
      evaluateInformationDensity(text),
      evaluateLanguageVariation(text, { recentExpressions, recentParagraphs }),
      evaluateProfessionalDialogue(text),
      evaluateParagraphPurpose(text),
    ];
  const failReasons = checks.flatMap((c) => c.failReasons || []);
  const pass = checks.every((c) => c.pass);

  return {
    version: light ? 'writer-craft-1-light' : 'writer-craft-1',
    craftMode,
    pass,
    failReasons,
    checks,
    rewriteHint: pass ? '' : buildCraftRewriteHint(failReasons, craftMode),
  };
}

function buildCraftRewriteHint(failReasons, craftMode) {
  return [
    '【Writer Craft · P0 重写】上一版不像职业作者，立即整段重写（只输出正文）：',
    ...failReasons.slice(0, 7).map((r) => `- ${r}`),
    '',
    '职业作者会不会这样写？阅读体验 > 规则完成。',
    '',
    'Show Don\'t Tell：禁止「意识到/觉得/害怕/紧张」→ 钥匙插三次 / 声音发抖',
    '顺序：画面 → 动作 → 对白 → 信息（最后才解释）',
    craftMode === 'climax' ? '高潮节奏：短句。停顿。对白。动作。一句一画面。' : '',
    '信息优先进对白；对白须推剧情。',
    '禁止：深吸一口气、心跳加速、意识到、心中一紧、无法承受、改变一切',
  ].filter(Boolean).join('\n');
}

export function formatWriterCraftPromptBlock({
  craftMode = 'action',
  climaxRole = null,
} = {}) {
  const mode = craftMode || resolveCraftMode({ climaxRole });
  const rhythmLine = mode === 'climax'
    ? '高潮：短句。停顿。对白。动作。一句一画面。禁止解释与长段心理。'
    : mode === 'reveal'
      ? '揭秘：中长句可，信息递进，留白，禁止一口气讲完。'
      : mode === 'emotion'
        ? '情绪：握拳/停顿/沉默/对白，禁止「他很难过」。'
        : '推进：画面→动作→对白→信息。';

  return [
    '<!-- writer-craft-p0 -->',
    '## Priority 0 · Professional Writer Craft',
    `**${WRITER_CRAFT_POLICY.core}**`,
    `**先问**：${WRITER_CRAFT_POLICY.ask}`,
    `**优先级**：${WRITER_CRAFT_POLICY.priority}`,
    '',
    '### Show, Don\'t Tell',
    '禁止：意识到 / 觉得 / 知道 / 害怕 / 紧张 / 震惊 / 恐惧',
    '必须：动作 → 对白 → 画面。❌「林夜很紧张」✅「钥匙插了三次才插进去」',
    '',
    '### Scene Visualization',
    '每段须有：具体动作 或 具体画面 或 对白。禁止只有解释/心理/总结。',
    '',
    '### Sentence Rhythm',
    rhythmLine,
    '',
    '### Information Density',
    '每 150~200 字至少新增：世界/人物/关系/规则/谜团/线索/代价/Promise/Payoff 之一',
    '',
    '### Language Variation',
    '禁止复读主语句式与「突然」；命中 AI 套话立即改写',
    '',
    '### Professional Dialogue',
    '信息优先进入对白，不是旁白。对白须：推进剧情/冲突/关系/线索/误导。禁止闲聊。',
    '',
    '### Paragraph Purpose',
    '不问「写完没」——问「这段存在意义」：人物|关系|冲突|世界|谜团|Promise|Hook',
  ].join('\n');
}

export function extractExpressions(text = '') {
  return sentences(text)
    .map((s) => s.slice(0, 16))
    .filter((s) => s.length >= 4)
    .slice(0, 8);
}
