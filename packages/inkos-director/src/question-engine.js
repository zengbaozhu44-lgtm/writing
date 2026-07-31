/**
 * Question Engine v2 — Reader Question 优先
 * 作者问题 ≠ 读者问题；Reader Question 驱动追读
 */
const QUESTION_MARK = /[？?]$/;
const IMMEDIATE_STAKE = /今晚|天亮|妹妹|能不能|会死|来不及|三十秒|倒计时|活下去|救|危险|代价/u;
const AUTHOR_MACRO = /文明|系统来源|宇宙|未来|真相究竟是什么|为什么世界|重置机制|算法/u;

function norm(v = '') {
  return String(v || '').trim();
}

function ensureQuestion(text = '', fallback = '') {
  const t = norm(text);
  if (!t) return fallback;
  return QUESTION_MARK.test(t) ? t : `${t}？`;
}

function stripQuestion(text = '') {
  return norm(text).replace(/[？?]+$/, '');
}

/**
 * 构建 Reader Question 条目
 */
export function buildReaderQuestionEntry({
  authorQuestion = '',
  readerQuestion = '',
  answerProgress = 0,
  importance = 90,
  source = 'inferred',
} = {}) {
  return {
    authorQuestion: ensureQuestion(authorQuestion, ''),
    readerQuestion: ensureQuestion(readerQuestion, authorQuestion),
    answerProgress: Math.min(100, Math.max(0, answerProgress ?? 0)),
    importance: importance ?? 90,
    source,
  };
}

/**
 * 从作者问题推导读者真正关心的问题
 */
export function deriveReaderQuestion({
  authorQuestion = '',
  plan = {},
  scene = {},
  intent = {},
  chapter = 1,
  sceneIndex = 1,
} = {}) {
  const authorQ = ensureQuestion(authorQuestion);
  const cliff = norm(plan.cliffhanger || scene.cliffhanger || scene.hook);
  const goal = norm(plan.goal || scene.goal || intent.mainGoal);
  const obstacle = norm(plan.obstacle || scene.obstacle || scene.conflict);
  const pov = intent.pov || '主角';

  if (cliff && IMMEDIATE_STAKE.test(cliff)) {
    return buildReaderQuestionEntry({
      authorQuestion: authorQ,
      readerQuestion: cliff,
      importance: 95,
      answerProgress: 0,
      source: 'actionHook',
    });
  }
  if (goal && IMMEDIATE_STAKE.test(goal)) {
    return buildReaderQuestionEntry({
      authorQuestion: authorQ,
      readerQuestion: ensureQuestion(`${pov}${goal.includes('？') ? '' : '能否'}${stripQuestion(goal)}`),
      importance: 92,
      source: 'goal',
    });
  }
  if (obstacle && IMMEDIATE_STAKE.test(obstacle)) {
    return buildReaderQuestionEntry({
      authorQuestion: authorQ,
      readerQuestion: ensureQuestion(`${pov}能否突破：${stripQuestion(obstacle)}`),
      importance: 88,
      source: 'obstacle',
    });
  }

  const cliffQ = cliff && /[？?]|谁|什么|为什么|怎么/u.test(cliff)
    ? ensureQuestion(cliff.slice(0, 50))
    : null;
  if (cliffQ) {
    return buildReaderQuestionEntry({
      authorQuestion: authorQ,
      readerQuestion: cliffQ,
      importance: 85,
      source: 'cliffhanger',
    });
  }

  if (AUTHOR_MACRO.test(authorQ) && chapter <= 3) {
    return buildReaderQuestionEntry({
      authorQuestion: authorQ,
      readerQuestion: ensureQuestion(`${pov}今晚能不能活下来`),
      importance: 90,
      source: 'macroToImmediate',
    });
  }

  const templates = [
    ensureQuestion(`${pov}这一步会付出什么代价`),
    ensureQuestion('如果现在不行动，谁会受伤'),
    ensureQuestion('信任的人还能相信吗'),
    ensureQuestion('倒计时结束前能否破局'),
  ];
  return buildReaderQuestionEntry({
    authorQuestion: authorQ,
    readerQuestion: templates[(sceneIndex - 1) % templates.length],
    importance: 80,
    source: 'template',
  });
}

export function buildBookQuestion(storyDna = {}, intent = {}) {
  const raw = storyDna.bookQuestion
    || storyDna.main_question
    || storyDna.core_hook
    || intent.mainQuestion
    || intent.bookQuestion
    || '真相究竟是什么';
  return ensureQuestion(raw, '真相究竟是什么？');
}

export function buildChapterQuestion({
  chapter = 1,
  intent = {},
  storyDna = {},
  bookQuestion = '',
} = {}) {
  const bookQ = bookQuestion || buildBookQuestion(storyDna, intent);
  if (intent.chapterQuestion) return ensureQuestion(intent.chapterQuestion);
  if (storyDna.chapter_questions?.[chapter - 1]) {
    return ensureQuestion(storyDna.chapter_questions[chapter - 1]);
  }

  const pov = intent.pov || '主角';
  const chapterSeeds = [
    [1, '为什么不对劲？'],
    [2, '为什么只有主角记得？'],
    [3, '追查下去会付出什么代价？'],
    [4, '谁在操控这一切？'],
    [5, '如果选这条路，还能回头吗？'],
  ];

  const seed = chapterSeeds.find(([c]) => c === chapter)?.[1];
  if (seed) {
    if (chapter === 2) return ensureQuestion(`为什么只有${pov}记得？`);
    return ensureQuestion(seed);
  }

  const mainGoal = intent.mainGoal || intent.chapterIntent || '';
  if (mainGoal && /为什么|谁|什么|怎么|究竟/u.test(mainGoal)) {
    return ensureQuestion(mainGoal);
  }

  const bookStem = stripQuestion(bookQ).slice(0, 20);
  return ensureQuestion(`第 ${chapter} 章须回答：在「${bookStem}」之下，本章核心追问是什么`);
}

export function buildSceneQuestionPlan({
  scene = {},
  intent = {},
  plan = {},
  chapter = 1,
  sceneIndex = 1,
  sceneCount = 4,
  bookQuestion = '',
  chapterQuestion = '',
  prevSceneQuestions = null,
} = {}) {
  if (scene.questions?.readerQuestion?.readerQuestion) {
    return normalizeQuestionPlan(scene.questions);
  }

  const bookQ = bookQuestion || buildBookQuestion(intent._storyDna || intent.storyDna || {}, intent);
  const chapterQ = chapterQuestion || buildChapterQuestion({ chapter, intent, bookQuestion: bookQ });

  const sceneQuestion = scene.sceneQuestion
    || plan.sceneQuestion
    || deriveSceneQuestion(plan, scene, sceneIndex, chapterQ);

  const readerQuestion = deriveReaderQuestion({
    authorQuestion: sceneQuestion,
    plan,
    scene,
    intent,
    chapter,
    sceneIndex,
  });

  const answerTarget = prevSceneQuestions?.newReaderQuestions?.[0]?.readerQuestion
    || prevSceneQuestions?.newQuestions?.[0]
    || (sceneIndex === 1 ? readerQuestion.readerQuestion : prevSceneQuestions?.readerQuestion?.readerQuestion)
    || readerQuestion.readerQuestion;

  const answeredReaderQuestion = buildReaderQuestionEntry({
    authorQuestion: chapterQ,
    readerQuestion: ensureQuestion(stripQuestion(answerTarget) || stripQuestion(readerQuestion.readerQuestion)),
    answerProgress: 0,
    importance: readerQuestion.importance,
    source: 'answerTarget',
  });

  const newReaderQuestions = deriveNewReaderQuestions(plan, scene, readerQuestion, chapterQ, sceneIndex);

  return {
    bookQuestion: bookQ,
    chapterQuestion: chapterQ,
    sceneQuestion,
    authorQuestion: buildReaderQuestionEntry({
      authorQuestion: sceneQuestion,
      readerQuestion: sceneQuestion,
      importance: 60,
      source: 'author',
    }),
    readerQuestion,
    answeredReaderQuestion,
    newReaderQuestions,
    answeredQuestion: answeredReaderQuestion.readerQuestion,
    newQuestions: newReaderQuestions.map((q) => q.readerQuestion),
    rule: '每 Scene：回答 1 个 Reader Question + 提出 2 个新 Reader Question（优先于 Author Question）',
  };
}

function deriveSceneQuestion(plan = {}, scene = {}, sceneIndex = 1, chapterQ = '') {
  const cliff = plan.cliffhanger || scene.cliffhanger || scene.hook || '';
  if (cliff && /[？?]|谁|什么|为什么|怎么|究竟/u.test(cliff)) {
    return ensureQuestion(cliff.slice(0, 50));
  }
  const info = plan.newInformation || scene.newInformation || '';
  if (info && /[？?]|谁|什么|为什么/u.test(info)) {
    return ensureQuestion(info.slice(0, 50));
  }
  const templates = [
    '本 Scene 的核心追问是什么',
    '镜子上的血字是谁写的',
    '系统为什么要锁定妹妹',
    '四点重置时谁在旁观',
  ];
  return ensureQuestion(templates[(sceneIndex - 1) % templates.length] || stripQuestion(chapterQ));
}

function deriveNewReaderQuestions(plan = {}, scene = {}, primary = {}, chapterQ = '', sceneIndex = 1) {
  if (plan.newReaderQuestions?.length >= 2) {
    return plan.newReaderQuestions.slice(0, 2).map((q) => (
      typeof q === 'string'
        ? buildReaderQuestionEntry({ readerQuestion: q, authorQuestion: chapterQ, importance: 85 })
        : q
    ));
  }

  const cliff = plan.cliffhanger || scene.cliffhanger || '';
  const info = plan.newInformation || scene.newInformation || '';

  const q1Text = cliff && IMMEDIATE_STAKE.test(cliff)
    ? ensureQuestion(cliff.slice(0, 45))
    : cliff && /[？?]/u.test(cliff)
      ? ensureQuestion(cliff.slice(0, 45))
      : ensureQuestion(`如果不现在行动，${stripQuestion(primary.readerQuestion).slice(0, 15)}的后果是什么`);

  const q2Text = info && IMMEDIATE_STAKE.test(info)
    ? ensureQuestion(`「${info.slice(0, 20)}」对${sceneIndex > 1 ? '今晚' : '下一步'}意味着什么`)
    : ensureQuestion(`这与「${stripQuestion(chapterQ).slice(0, 15)}」有何关联`);

  return [
    buildReaderQuestionEntry({
      authorQuestion: chapterQ,
      readerQuestion: q1Text,
      importance: 88,
      source: 'new1',
    }),
    buildReaderQuestionEntry({
      authorQuestion: primary.authorQuestion || chapterQ,
      readerQuestion: q2Text,
      importance: 82,
      source: 'new2',
    }),
  ];
}

function normalizeQuestionPlan(q = {}) {
  const readerQuestion = q.readerQuestion?.readerQuestion
    ? q.readerQuestion
    : deriveReaderQuestion({ authorQuestion: q.sceneQuestion || q.chapterQuestion });

  const newReaderQuestions = (q.newReaderQuestions || q.newQuestions || []).slice(0, 2).map((item) => (
    typeof item === 'string'
      ? buildReaderQuestionEntry({ readerQuestion: item, importance: 85 })
      : item
  ));

  return {
    bookQuestion: ensureQuestion(q.bookQuestion),
    chapterQuestion: ensureQuestion(q.chapterQuestion),
    sceneQuestion: ensureQuestion(q.sceneQuestion),
    authorQuestion: q.authorQuestion || buildReaderQuestionEntry({
      authorQuestion: q.sceneQuestion,
      readerQuestion: q.sceneQuestion,
      importance: 60,
    }),
    readerQuestion,
    answeredReaderQuestion: q.answeredReaderQuestion || buildReaderQuestionEntry({
      readerQuestion: q.answeredQuestion,
      importance: readerQuestion.importance,
    }),
    newReaderQuestions,
    answeredQuestion: q.answeredQuestion || q.answeredReaderQuestion?.readerQuestion,
    newQuestions: (q.newQuestions || newReaderQuestions.map((r) => r.readerQuestion)),
    rule: q.rule || 'Reader Question 优先 — 回答 1 + 提出 2',
  };
}

export function formatQuestionBlock(questions = {}) {
  const rq = questions.readerQuestion;
  if (!rq?.readerQuestion && !questions.sceneQuestion) return '';

  return [
    '### Question Engine v2 · Reader Question 优先（P2）',
    '**读者真正想知道的**优先于作者宏观设定。',
    '',
    `- **Reader Question（本 Scene）**：${rq?.readerQuestion || '—'}（重要度 ${rq?.importance ?? '—'}）`,
    questions.authorQuestion?.authorQuestion
      ? `- **Author Question（参考）**：${questions.authorQuestion.authorQuestion}`
      : '',
    `- **须回答（Reader）**：${questions.answeredReaderQuestion?.readerQuestion || questions.answeredQuestion || '—'}`,
    `- **须提出（Reader ×2）**：${(questions.newReaderQuestions || []).map((q) => q.readerQuestion).join(' · ') || (questions.newQuestions || []).join(' · ')}`,
    '',
    '**铁律**：回答 1 个 Reader Question + 提出 2 个新 Reader Question',
    '禁止只铺陈世界观、不让读者关心「今晚能不能活」',
  ].filter(Boolean).join('\n');
}

export function formatQuestionBrief(questions = {}) {
  if (!questions?.bookQuestion) return '';
  const rq = questions.readerQuestion;
  return [
    '### Question · Reader 优先',
    `- **Reader**：${rq?.readerQuestion || questions.sceneQuestion}`,
    `- **须回答**：${questions.answeredReaderQuestion?.readerQuestion || questions.answeredQuestion}`,
    `- **须提出**：${(questions.newReaderQuestions || []).map((q) => q.readerQuestion).join(' / ') || (questions.newQuestions || []).join(' / ')}`,
    rq?.authorQuestion ? `- **Author（参考）**：${rq.authorQuestion}` : '',
  ].filter(Boolean).join('\n');
}

export function formatChapterQuestionBlock(bookQuestion = '', chapterQuestion = '') {
  if (!chapterQuestion) return '';
  return [
    '### Question Engine · 本章问题链',
    `- **Book Question（Author）**：${bookQuestion}`,
    `- **Chapter Question**：${chapterQuestion}`,
    '- 每 Scene 用 **Reader Question** 落地 — 回答 1 + 提出 2',
  ].join('\n');
}
