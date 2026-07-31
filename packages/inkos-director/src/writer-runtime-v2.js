/**
 * Writer Runtime V2 — 正文边写边验边改（不是 Analyzer）
 * Story State · Cause–Effect · Micro Scene · Live Monitor · Writer Craft（P0）
 *
 * Director 负责规划；Writer Runtime 负责把规划写成读者愿意一直看的正文。
 * 验证不通过 → rewriteCurrentBeat，不是 Scene 写完再 Optimizer。
 */
import {
  validateWriterCraft,
  extractExpressions,
  resolveCraftMode,
  WRITER_CRAFT_POLICY,
} from './writer-craft-runtime.js';

/** V2 最高原则 */
export const WRITER_RUNTIME_V2_POLICY = {
  version: 'writer-runtime-v2',
  core: 'Director 负责规划；Writer Runtime 负责把规划写成读者愿意一直看下去的正文。',
  notCheck: '不是检查「剧情有没有写完」',
  mustCheck: '而是检查「读者有没有一直想继续看」',
  loop: '生成 → Runtime 验证 → 不通过立即重写 → 通过再下一段',
  paragraphMust: [
    '推进人物',
    '推进冲突',
    '推进关系',
    '推进世界',
    '推进谜团',
    '兑现期待',
  ],
};

/** Live Monitor 高频 AI 套话 — 命中须替换为动作/对白/事件 */
export const LIVE_AI_PHRASES = [
  '深吸一口气',
  '心跳加速',
  '心跳几乎停止',
  '意识到',
  '他知道',
  '她知道',
  '他明白',
  '她明白',
  '心中一紧',
  '心猛地一跳',
  '隐约觉得',
  '隐约感到',
  '时间窗口收窄',
  '时间窗口正在收窄',
  '无法承受',
  '改变一切',
  '前所未有的紧张',
  '门自己开了',
  '仿佛凝固',
  '时间仿佛',
  '一股莫名',
  '他感到',
  '她感到',
];

const STAGNANT_PATTERNS = [
  /调查.{0,12}发现异常.{0,12}继续调查/u,
  /发现异常.{0,20}继续发现/u,
  /异常.{0,8}异常.{0,8}异常/u,
];

function stripSpace(s = '') {
  return String(s || '').replace(/\s+/g, '');
}

function sentences(text = '') {
  return String(text || '')
    .split(/[。！？\n]+/u)
    .map((s) => s.trim())
    .filter((s) => s.length >= 4);
}

function paragraphs(text = '') {
  return String(text || '')
    .split(/\n+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Story State Runtime — before ≠ after
 */
export function evaluateStoryStateChange({
  text = '',
  beat = {},
  beforeState = null,
} = {}) {
  const before = String(
    beforeState
    || beat.beforeState
    || beat.beatPlan?.beforeState
    || '局面尚未被本段改写',
  ).trim();

  const afterPlan = String(
    beat.afterState
    || beat.beatPlan?.afterState
    || '',
  ).trim();

  const body = stripSpace(text);
  const signal = detectStateSignals(text);
  const stagnant = STAGNANT_PATTERNS.some((re) => re.test(text))
    || (/调查/u.test(text) && /发现/u.test(text) && !signal.info && !signal.danger && !signal.relation);

  let after = afterPlan;
  if (!after || after === before) {
    after = inferAfterFromText(before, text, signal);
  }

  const changed = Boolean(after && after !== before && (signal.any || body.length >= 40));
  const pass = changed && !stagnant;

  return {
    kind: 'storyState',
    before,
    after,
    changed,
    stagnant,
    signals: signal,
    pass,
    failReasons: [
      !changed ? 'beforeStoryState == afterStoryState — 故事未真正改变' : '',
      stagnant ? '禁止：调查→发现异常→继续调查' : '',
    ].filter(Boolean),
  };
}

function detectStateSignals(text = '') {
  const t = text;
  const info = /名单|密码|记录|照片|死亡|第\d+次|不是唯一|闪过|显示|文件|权限/u.test(t);
  const danger = /锁定|清除|倒计时|警告|追杀|封禁|红灯|消失|清空|枪|刀|爆炸/u.test(t);
  const relation = /背叛|信任|同盟|分手|同行|名字|苏晚|妹妹|坦白|隐瞒/u.test(t);
  const character = /选择|拒绝|决定|迈|推门|拔脚|转身|不敢|破例/u.test(t);
  const world = /重置|规则|系统|节点|世界|空间|归档/u.test(t);
  const goal = /必须|逃|救|阻止|闯入|上报|诱饵/u.test(t);
  return {
    info, danger, relation, character, world, goal,
    any: info || danger || relation || character || world || goal,
  };
}

function inferAfterFromText(before, text, signal) {
  if (signal.info) return '认知更新：新信息已落地，局面无法装作不知道';
  if (signal.danger) return '危险升级：退路/安全态已失效';
  if (signal.relation) return '关系改写：信任或立场发生位移';
  if (signal.character) return '人物推进：选择/行动已改变立场';
  if (signal.world) return '世界认知改变：规则或系统状态可见变化';
  if (signal.goal) return '目标收紧：下一步行动被迫更新';
  if (stripSpace(text).length < 30) return before;
  return `${before} → 本段未见可验证位移`;
}

/**
 * Cause–Effect Runtime — 事件须有因有果，并承接 lastEvent
 */
export function evaluateCauseEffect({
  text = '',
  lastEvent = null,
  beat = {},
} = {}) {
  const t = text;
  const hasAction = /打开|关闭|按下|闯入|读取|输入|拔|逃|推|锁|闪|出现|消失|说|问|答/u.test(t);
  const hasEffect = /因此|于是|导致|结果|立刻|马上|被迫|只能|反而|却|于是门|警报|锁住|倒计时|标记/u.test(t)
    || /然后|接着|紧接着/u.test(t);
  const lastEffect = lastEvent?.effect ? String(lastEvent.effect) : '';
  const chainedFromLast = !lastEffect
    || t.includes(lastEffect.slice(0, 4))
    || /因此|于是|导致|接着|然后|紧接着|被迫|只好|只能|反而/u.test(t)
    || hasEffect
    || signalHeavy(t);

  // 启发式：有动作 +（有后果语言 或 Beat 有 consequence）视为有效因果
  const cause = lastEvent?.effect
    || beat.beatPlan?.beforeState
    || beat.beforeState
    || '上一局面的逼迫';
  const event = beat.action || beat.content || inferEventLabel(t);
  const effect = beat.beatPlan?.afterState
    || beat.afterState
    || (hasEffect ? '局面被迫进入下一步' : '');

  const pass = hasAction && (hasEffect || Boolean(beat.consequence) || signalHeavy(t)) && chainedFromLast;

  return {
    kind: 'causeEffect',
    lastEvent,
    cause,
    event,
    effect: effect || '（缺失：本段未写出可见后果）',
    pass,
    failReasons: [
      !hasAction ? 'Event 缺少可观察动作' : '',
      !(hasEffect || beat.consequence || signalHeavy(t)) ? 'Event 缺少 Effect（导致什么）' : '',
      !chainedFromLast ? '未承接上一事件的 Effect，像独立抛异常' : '',
    ].filter(Boolean),
    nextEvent: {
      cause,
      event: String(event).slice(0, 40),
      effect: String(effect || inferEffectFallback(t)).slice(0, 40),
    },
  };
}

function signalHeavy(t) {
  return detectStateSignals(t).any;
}

function inferEventLabel(t) {
  const first = sentences(t)[0] || t.slice(0, 24);
  return first.slice(0, 28);
}

function inferEffectFallback(t) {
  const s = detectStateSignals(t);
  if (s.danger) return '危险升级，必须立刻行动';
  if (s.info) return '信息改写认知，无法装不知道';
  return '迫使 POV 做出下一步';
}

/**
 * Micro Scene — Beat 结束至少满足 5 项中的 2 项
 */
export function evaluateMicroScene({
  text = '',
  beat = {},
  executionPlan = {},
} = {}) {
  const s = detectStateSignals(text);
  const checks = {
    新信息: s.info || beat.structuralBeat === 'newInformation' && /名单|记录|密码|照片|不是/u.test(text),
    关系: s.relation,
    危险: s.danger,
    Promise兑现: Boolean(beat.isRewardBeat && (/兑现|救下|活|拿到|得到/u.test(text) || executionPlan.reward?.payoff)),
    新行动: s.goal || /逃|冲|拔|跑|推|闯入|隐藏|上报|拒绝/u.test(text),
  };

  const passed = Object.entries(checks).filter(([, v]) => v).map(([k]) => k);
  const pass = passed.length >= 2;

  return {
    kind: 'microScene',
    checks,
    passed,
    required: 2,
    pass,
    failReasons: pass
      ? []
      : [`Micro Scene 仅满足 ${passed.length}/5（${passed.join('、') || '无'}），须至少两项：新信息/关系/危险/Promise/新行动`],
  };
}

/**
 * Live Writer Monitor — 重复句式 / 重复事件 / AI 套话 / 连续解释
 */
export function evaluateLiveMonitor({
  text = '',
  recentParagraphs = [],
  accumulatedText = '',
} = {}) {
  const fails = [];
  const hits = [];
  const body = String(text || '');
  const sents = sentences(body);
  const paras = paragraphs(body);

  // 1) 重复句式：连续以同一主语开句
  let sameOpen = 0;
  let prevOpen = '';
  for (const s of sents) {
    const open = s.slice(0, 2);
    if (open && open === prevOpen) sameOpen += 1;
    else sameOpen = 0;
    prevOpen = open;
    if (sameOpen >= 2) {
      fails.push('重复句式：连续多句同一主语开头（如「林夜…林夜…」）');
      break;
    }
  }

  // 2) 与近期段落高度重复
  const compact = stripSpace(body).slice(0, 80);
  for (const prev of recentParagraphs.slice(-4)) {
    const p = stripSpace(prev).slice(0, 80);
    if (compact.length >= 24 && p.length >= 24) {
      const overlap = overlapRatio(compact, p);
      if (overlap >= 0.55) {
        fails.push('重复事件/段落：与刚写过的内容高度相似，禁止复读');
        break;
      }
    }
  }

  // 同 Beat 内自我复读
  if (paras.length >= 2) {
    const a = stripSpace(paras[0]).slice(0, 60);
    const b = stripSpace(paras[paras.length - 1]).slice(0, 60);
    if (a.length >= 20 && overlapRatio(a, b) >= 0.6) {
      fails.push('段落内自我复读');
    }
  }

  // 3) AI 高频表达
  for (const phrase of LIVE_AI_PHRASES) {
    const count = body.split(phrase).length - 1;
    if (count >= 1) {
      hits.push(phrase);
    }
    if (count >= 2) {
      fails.push(`AI 套话重复：「${phrase}」`);
    } else if (
      count >= 1
      && /深吸一口气|心跳加速|意识到|心中一紧|时间窗口收窄|无法承受|改变一切|前所未有的紧张|一股莫名|他感到|她感到/u.test(phrase)
    ) {
      fails.push(`AI 套话命中：「${phrase}」— 改为动作/对白/事件`);
    }
  }
  // 累计命中过多
  if (hits.length >= 3) {
    fails.push(`AI 套话过多（${hits.slice(0, 5).join('、')}）`);
  }

  // 4) 连续解释
  let explainStreak = 0;
  for (const s of sents) {
    if (/^(他|她|林\S{0,2})(知道|明白|意识到|感到|觉得)/u.test(s) || /他知道|她知道|他明白|意识到/u.test(s)) {
      explainStreak += 1;
      if (explainStreak >= 2) {
        fails.push('连续解释超过两句 — 改为动作、对白或事件');
        break;
      }
    } else {
      explainStreak = 0;
    }
  }

  // 5) 段落驱动力：至少命中一项推进
  const drive = detectStateSignals(body);
  const hasDialogue = /[「」『』]/.test(body);
  const hasDrive = drive.any || hasDialogue;
  if (!hasDrive && stripSpace(body).length > 40) {
    fails.push('本段未推进人物/冲突/关系/世界/谜团/期待中的任一项');
  }

  // 与全文尾部雷同（跨 Beat 复读）
  const tail = stripSpace(accumulatedText).slice(-120);
  if (tail && compact.length >= 30 && overlapRatio(compact, tail) >= 0.5) {
    fails.push('与上一段结尾高度重复');
  }

  return {
    kind: 'liveMonitor',
    aiHits: hits,
    pass: fails.length === 0,
    failReasons: [...new Set(fails)],
  };
}

function overlapRatio(a, b) {
  if (!a || !b) return 0;
  const shorter = a.length <= b.length ? a : b;
  const longer = a.length <= b.length ? b : a;
  let hit = 0;
  const gram = 4;
  if (shorter.length < gram) return shorter === longer ? 1 : 0;
  for (let i = 0; i <= shorter.length - gram; i += 1) {
    if (longer.includes(shorter.slice(i, i + gram))) hit += 1;
  }
  return hit / (shorter.length - gram + 1);
}

/**
 * 简易 4-gram 重复检测（正文自重复 + 与上文尾部重叠）
 * @returns {{ pass: boolean, noRepeat: boolean, hits: string[], failReasons: string[], selfOverlap?: number, priorOverlap?: number }}
 */
export function detectFourGramRepeat(text = '', reference = '') {
  const compact = stripSpace(text);
  const fails = [];
  const hits = [];

  if (compact.length < 16) {
    return { pass: true, noRepeat: true, hits, failReasons: [] };
  }

  // 自重复：长度 ≥8 的片段在后文再次出现
  for (let len = 16; len >= 8; len -= 2) {
    const limit = Math.min(compact.length - len, 240);
    for (let i = 0; i <= limit; i += 1) {
      const chunk = compact.slice(i, i + len);
      if (/^(.)\1+$/u.test(chunk)) continue;
      const rest = compact.slice(i + len);
      if (rest.includes(chunk)) {
        hits.push(chunk.slice(0, 16));
        fails.push(`4-gram 自重复：「${chunk.slice(0, 16)}…」`);
        return {
          pass: false,
          noRepeat: false,
          hits,
          failReasons: fails,
          selfOverlap: 1,
        };
      }
    }
  }

  // 与上文：4-gram 重叠率过高
  const ref = stripSpace(reference).slice(-240);
  let priorOverlap = 0;
  if (ref.length >= 16) {
    priorOverlap = overlapRatio(compact, ref);
    if (priorOverlap >= 0.45) {
      fails.push(`与上文 4-gram 重叠过高（${Math.round(priorOverlap * 100)}%）`);
      return {
        pass: false,
        noRepeat: false,
        hits,
        failReasons: fails,
        priorOverlap,
      };
    }
  }

  return {
    pass: true,
    noRepeat: true,
    hits,
    failReasons: [],
    priorOverlap,
  };
}

/**
 * 汇总验证 — Writer Runtime V2 闸门
 * pass = formatPass && noRepeat && stateChange
 */
export function validateWriterRuntimeV2({
  text = '',
  beat = {},
  executionPlan = {},
  lastEvent = null,
  recentParagraphs = [],
  recentExpressions = [],
  accumulatedText = '',
  beforeState = null,
  climaxRole = null,
  sceneRhythm = null,
  mode = 'full',
} = {}) {
  const light = mode === 'light';
  const storyState = evaluateStoryStateChange({ text, beat, beforeState });
  const fourGram = detectFourGramRepeat(text, accumulatedText);
  const craft = validateWriterCraft({
    text,
    beat,
    climaxRole: climaxRole || executionPlan.climaxRole,
    sceneRhythm: sceneRhythm || executionPlan.sceneRhythm,
    recentExpressions: light ? [] : recentExpressions,
    recentParagraphs: light ? [] : recentParagraphs,
    light,
  });

  // light：跳过昂贵子项（causeEffect / microScene / liveMonitor 细节），保留格式·重复·状态
  const causeEffect = light
    ? { pass: true, failReasons: [] }
    : evaluateCauseEffect({ text, lastEvent, beat });
  const microScene = light
    ? { pass: true, failReasons: [], passed: [] }
    : evaluateMicroScene({ text, beat, executionPlan });
  const liveMonitor = light
    ? { pass: true, failReasons: [] }
    : evaluateLiveMonitor({ text, recentParagraphs, accumulatedText });

  const formatPass = Boolean(craft?.pass) && Boolean(String(text || '').trim());
  const stateChange = Boolean(storyState?.pass);
  const noRepeat = Boolean(fourGram?.pass)
    && !(liveMonitor?.failReasons || []).some((r) => /重复/u.test(String(r)));

  const pass = formatPass && noRepeat && stateChange;

  const gateFails = [];
  if (!formatPass) {
    gateFails.push(...(craft.failReasons || []).slice(0, 4));
    if (!String(text || '').trim()) gateFails.push('正文为空');
    if (!gateFails.length) gateFails.push('formatPass 失败');
  }
  if (!noRepeat) {
    gateFails.push(...(fourGram.failReasons || []));
    gateFails.push(...(liveMonitor.failReasons || []).filter((r) => /重复/u.test(String(r))));
  }
  if (!stateChange) {
    gateFails.push(...(storyState.failReasons || ['stateChange 失败：Before == After 或局面未推进']));
  }

  // 其它检查仅作 rewrite 提示，不再单独否决 pass
  const softFails = light
    ? []
    : [causeEffect, microScene, liveMonitor].flatMap((c) => c.failReasons || []);
  const failReasons = [...new Set([...gateFails, ...softFails])];

  const v2Hint = pass ? '' : buildRewriteHint(failReasons, {
    storyState,
    causeEffect,
    microScene,
    liveMonitor,
  });
  const craftHint = craft.pass ? '' : craft.rewriteHint;
  const rewriteHint = [craftHint, v2Hint].filter(Boolean).join('\n\n');

  return {
    version: light ? 'writer-runtime-v2+craft-light' : 'writer-runtime-v2+craft',
    mode: light ? 'light' : 'full',
    pass,
    formatPass,
    noRepeat,
    stateChange,
    failReasons,
    craft,
    storyState,
    causeEffect,
    microScene,
    liveMonitor,
    fourGram,
    rewriteHint,
  };
}

function buildRewriteHint(failReasons, detail) {
  const lines = [
    '【Writer Runtime V2 重写指令】上一版未通过，立即整段重写（只输出正文）：',
    ...failReasons.slice(0, 6).map((r) => `- ${r}`),
    '',
    `Current Story State Before：${detail.storyState.before}`,
    `必须 After ≠ Before。目标 After：${detail.storyState.after}`,
    '',
    'Every event must satisfy：Cause → Event → Effect',
    detail.causeEffect.lastEvent?.effect
      ? `承接上一 Effect：${detail.causeEffect.lastEvent.effect}`
      : '给出本段 Cause，并写出可见 Effect',
    '',
    'Micro Scene 至少完成两项：新信息 / 新危险 / 新关系 / 新行动 / Promise 回收',
    '',
    '禁止：深吸一口气、心跳加速、意识到、心中一紧、时间窗口收窄、门自己开了（复读）',
    '优先：动作 > 对白 > 事件；事件→反应→留白；禁止调查→继续调查',
  ];
  return lines.join('\n');
}

export function formatWriterRuntimeV2PromptBlock({
  beat = {},
  lastEvent = null,
  beforeState = null,
} = {}) {
  const before = beforeState
    || beat.beforeState
    || beat.beatPlan?.beforeState
    || '局面尚未改写';
  const after = beat.afterState
    || beat.beatPlan?.afterState
    || '本 Beat 结束后必须是不同局面';

  return [
    '### Writer Runtime V2 · 边写边验',
    `**${WRITER_RUNTIME_V2_POLICY.core}**`,
    '',
    '**Current Story State**',
    `- Before：${String(before).slice(0, 60)}`,
    `- After：${String(after).slice(0, 60)}`,
    '- 必须真正改变故事。禁止调查→继续调查→继续发现异常',
    '',
    '**Cause → Event → Effect**',
    lastEvent?.effect ? `- 上一事件 Effect（须承接）：${lastEvent.effect}` : '- 本事件须写清：为什么发生 → 发生了什么 → 导致什么',
    '',
    '**Micro Scene（本 Beat 至少 2 项）**：新信息 · 关系 · 危险 · Promise · 新行动',
    '',
    '**Live Monitor 禁止**：深吸一口气 / 心跳加速 / 意识到 / 心中一紧 / 时间窗口收窄 / 改变一切',
    '**每段至少一项**：推进人物|冲突|关系|世界|谜团|兑现期待 — 否则重写',
  ].join('\n');
}

/**
 * 创建/更新 Runtime 会话状态（Beat Execution 持有）
 */
export function createWriterRuntimeSession(executionPlan = {}) {
  const firstBeat = executionPlan.beats?.[0];
  return {
    version: 'writer-runtime-v2+craft',
    lastEvent: null,
    recentParagraphs: [],
    recentExpressions: [],
    craftMode: resolveCraftMode({
      climaxRole: executionPlan.climaxRole,
      sceneRhythm: executionPlan.sceneRhythm,
      beat: firstBeat,
    }),
    beforeState: firstBeat?.beforeState
      || firstBeat?.beatPlan?.beforeState
      || executionPlan.situation?.worldState?.before
      || executionPlan.situation?.openingWorldState
      || '开场局面',
    rewriteCounts: {},
    validations: [],
    craftPolicy: WRITER_CRAFT_POLICY.core,
  };
}

export function applyBeatToRuntimeSession(session, {
  text,
  validation,
  beat,
  executionPlan = null,
} = {}) {
  const next = { ...session };
  next.recentParagraphs = [...(session.recentParagraphs || []), text].slice(-8);
  next.recentExpressions = [
    ...(session.recentExpressions || []),
    ...extractExpressions(text),
  ].slice(-24);
  if (validation?.causeEffect?.nextEvent) {
    next.lastEvent = validation.causeEffect.nextEvent;
  }
  if (validation?.storyState?.after) {
    next.beforeState = validation.storyState.after;
  } else if (beat?.afterState) {
    next.beforeState = beat.afterState;
  }
  next.craftMode = resolveCraftMode({
    climaxRole: executionPlan?.climaxRole,
    sceneRhythm: executionPlan?.sceneRhythm,
    beat,
  });
  next.validations = [...(session.validations || []), {
    beatOrder: beat?.order,
    pass: validation?.pass,
    failReasons: validation?.failReasons || [],
    craftPass: validation?.craft?.pass,
  }].slice(-20);
  return next;
}
