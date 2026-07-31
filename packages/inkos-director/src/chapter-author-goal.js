/**
 * Chapter Authoring Mode — 章节写作目标
 * Writer 完成的是「读者看完留下什么感觉」，不是只完成剧情
 */

function norm(v = '') {
  return String(v || '').trim();
}

const EMOTION_CYCLE = [
  { start: '好奇', end: '恐惧', feeling: '世界比想象更危险' },
  { start: '恐惧', end: '震惊', feeling: '可信的规则正在崩塌' },
  { start: '震惊', end: '愤怒', feeling: '有人一直在骗 POV' },
  { start: '愤怒', end: '绝望', feeling: '退路比想象更少' },
  { start: '绝望', end: '希望', feeling: '仍有一线可抓的线头' },
  { start: '希望', end: '焦虑', feeling: '刚拿到的答案立刻不够用' },
  { start: '焦虑', end: '紧迫', feeling: '时间窗口正在关闭' },
  { start: '紧迫', end: '释放', feeling: '小胜之后更大威胁浮现' },
  { start: '释放', end: '好奇', feeling: '更大谜团打开，必须继续追' },
  { start: '好奇', end: '恐惧', feeling: '熟悉的日常其实是陷阱' },
];

/**
 * 章级作者目标 — 读者情绪起讫 + 主感觉 + 必须记住的一点
 */
export function buildChapterAuthorGoal({
  chapter = 1,
  intent = {},
  storyDna = {},
  chapterQuestion = null,
  chapterClimax = null,
  chapterPromisePlan = null,
  priorGoal = null,
} = {}) {
  if (intent.chapterAuthorGoal?.mainFeeling && intent.chapterAuthorGoal?.mustRemember) {
    return normalizeAuthorGoal(intent.chapterAuthorGoal, chapter);
  }

  const ch = Math.max(1, Number(chapter) || 1);
  const cycle = EMOTION_CYCLE[(ch - 1) % EMOTION_CYCLE.length];
  const name = norm(intent.pov || storyDna.protagonist || '主角');
  const hook = norm(storyDna.core_hook || storyDna.main_question || '世界会重置');
  const chapterQ = norm(
    chapterQuestion?.readerQuestion
    || chapterQuestion?.question
    || intent.mainGoal
    || '',
  );

  let readerEmotionStart = cycle.start;
  let readerEmotionEnd = cycle.end;

  // 跨章衔接：上一章结束情绪 → 本章起点
  if (priorGoal?.readerEmotionEnd) {
    readerEmotionStart = priorGoal.readerEmotionEnd;
    if (readerEmotionStart === readerEmotionEnd) {
      readerEmotionEnd = cycle.end === readerEmotionStart ? '恐惧' : cycle.end;
    }
  }

  const mainFeeling = inferMainFeeling({
    ch,
    name,
    hook,
    cycle,
    chapterQ,
    chapterClimax,
  });

  const mustRemember = inferMustRemember({
    ch,
    name,
    hook,
    chapterQ,
    chapterPromisePlan,
    chapterClimax,
  });

  return {
    version: 'chapter-author-goal-1',
    chapter: ch,
    readerEmotionStart,
    readerEmotionEnd,
    mainFeeling,
    mustRemember,
    writerMust: `本章结束后，读者须感到「${mainFeeling}」，并记住：${mustRemember}`,
    ban: [
      '只完成剧情节点却没有留下章级感觉',
      '章末情绪与起点相同',
      '可读完却说不出「这一章最吓人/最重要的一点」',
    ],
    valid: Boolean(mainFeeling && mustRemember),
  };
}

function normalizeAuthorGoal(g = {}, chapter = 1) {
  return {
    version: 'chapter-author-goal-1',
    chapter: g.chapter ?? chapter,
    readerEmotionStart: norm(g.readerEmotionStart) || '好奇',
    readerEmotionEnd: norm(g.readerEmotionEnd) || '恐惧',
    mainFeeling: norm(g.mainFeeling),
    mustRemember: norm(g.mustRemember),
    writerMust: g.writerMust
      || `本章结束后，读者须感到「${g.mainFeeling}」，并记住：${g.mustRemember}`,
    ban: g.ban || ['只完成剧情没有留下感觉'],
    valid: true,
  };
}

function inferMainFeeling({ ch, name, hook, cycle, chapterQ, chapterClimax }) {
  if (ch === 1) {
    return `这一章让读者意识到世界比想象更危险 — ${hook.slice(0, 24)}`;
  }
  if (ch <= 10) {
    return `这一章让读者对${name}上瘾，并感到谜团在扩大：${(chapterQ || hook).slice(0, 28)}`;
  }
  if (ch <= 30) {
    return chapterClimax?.storyShift
      ? `这一章让读者感到「${chapterClimax.storyShift.slice(0, 36)}」—— 中段不重复只加压`
      : `这一章让读者感到代价变真，兑现一次后又悬起更大威胁`;
  }
  if (chapterClimax?.storyShift) {
    return `这一章把主线拧紧：${chapterClimax.storyShift.slice(0, 40)}`;
  }
  return `这一章让读者感到「${cycle.feeling}」`;
}

function inferMustRemember({ ch, name, hook, chapterQ, chapterPromisePlan, chapterClimax }) {
  const payoff = chapterPromisePlan?.payoffs?.[0]
    || chapterPromisePlan?.payoff
    || null;
  const newPromise = chapterPromisePlan?.newPromises?.[0]
    || chapterPromisePlan?.newPromise
    || null;

  if (ch === 1) {
    return `${name}不是唯一被重置的人`;
  }
  if (ch <= 5 && /重置/u.test(hook)) {
    return `${name}发现记得重置的人正在变多`;
  }
  if (typeof payoff === 'string' && payoff) {
    return payoff.slice(0, 40);
  }
  if (payoff?.text) {
    return payoff.text.slice(0, 40);
  }
  if (chapterClimax?.storyShift) {
    return chapterClimax.storyShift.slice(0, 40);
  }
  if (chapterClimax?.irreversibleChange) {
    return chapterClimax.irreversibleChange.slice(0, 40);
  }
  if (typeof newPromise === 'string' && newPromise) {
    return `新承诺埋下：${newPromise.slice(0, 28)}`;
  }
  if (newPromise?.text) {
    return `新承诺埋下：${newPromise.text.slice(0, 28)}`;
  }
  if (chapterQ) {
    return chapterQ.slice(0, 40);
  }
  // 后期按章号轮换记忆锚点，避免全书只剩同一句
  const lateAnchors = [
    `${name}的死亡次数被人记下了`,
    `苏晚可能站在规则一侧`,
    `重置可以针对一个人`,
    `重置者曾是觉醒者`,
    `集体记忆能改规则`,
    `${name}差点成为新的重置者`,
  ];
  return lateAnchors[(ch - 1) % lateAnchors.length];
}

export function formatChapterAuthorGoalBlock(goal = {}) {
  if (!goal?.mainFeeling) return '';

  return [
    '### Chapter Author Goal · 章节写作目标',
    '',
    '**Writer 不只完成剧情。须完成：读者看完这一章留下什么感觉。**',
    '',
    '```',
    'chapterAuthorGoal:',
    `  readerEmotionStart: ${goal.readerEmotionStart}`,
    `  readerEmotionEnd: ${goal.readerEmotionEnd}`,
    `  mainFeeling: ${goal.mainFeeling}`,
    `  mustRemember: ${goal.mustRemember}`,
    '```',
    '',
    `- **Writer 必做**：${goal.writerMust}`,
    `- 章内情绪须从「${goal.readerEmotionStart}」走到「${goal.readerEmotionEnd}」`,
    '',
    ...(goal.ban || []).map((b) => `- 禁止：${b}`),
  ].join('\n');
}

export function formatChapterAuthorGoalBrief(goal = {}) {
  if (!goal?.mainFeeling) return '';
  return `章目标：${goal.readerEmotionStart}→${goal.readerEmotionEnd} · 记住「${goal.mustRemember?.slice(0, 24)}」`;
}
