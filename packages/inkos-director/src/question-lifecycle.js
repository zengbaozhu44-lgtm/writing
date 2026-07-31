/**
 * Question Lifecycle — 追问生命周期管理
 * Created → Growing → Answered / Partially Answered → Expired
 * 避免百章后谜团无限堆积
 */

export const QUESTION_STATES = {
  created: { id: 'created', label: '新建', priority: 1 },
  growing: { id: 'growing', label: '升温', priority: 2 },
  partially_answered: { id: 'partially_answered', label: '部分回答', priority: 3 },
  answered: { id: 'answered', label: '已回答', priority: 4 },
  expired: { id: 'expired', label: '已过期', priority: 5 },
};

const DEFAULT_MAX_ACTIVE = 12;
const EXPIRE_HORIZON = {
  small: 3,
  medium: 8,
  main: 25,
};

function norm(v = '') {
  return String(v || '').trim();
}

function questionKey(text = '') {
  return norm(text).replace(/[？?]+$/, '').slice(0, 40);
}

function classifyQuestionHorizon(text = '', importance = 80) {
  if (/世界|文明|重置|真相|系统来源/u.test(text) || importance >= 90) return 'main';
  if (/身份|背叛|信任|隐藏/u.test(text) || importance >= 75) return 'medium';
  return 'small';
}

export function createQuestionEntry({
  readerQuestion = '',
  authorQuestion = '',
  importance = 80,
  chapter = 1,
  sceneIndex = 1,
  answerProgress = 0,
  state = 'created',
} = {}) {
  const rq = norm(readerQuestion);
  const horizon = classifyQuestionHorizon(rq, importance);
  return {
    id: `q_${questionKey(rq).slice(0, 12)}_${chapter}_${sceneIndex}`,
    readerQuestion: rq,
    authorQuestion: norm(authorQuestion),
    importance,
    state,
    answerProgress: Math.min(100, Math.max(0, answerProgress)),
    horizon,
    createdChapter: chapter,
    createdSceneIndex: sceneIndex,
    lastTouchedChapter: chapter,
    expireByChapter: chapter + EXPIRE_HORIZON[horizon],
  };
}

/**
 * 从 Story Memory + 前序 Scene 构建追问注册表
 */
export function buildQuestionRegistry({
  intent = {},
  chapter = 1,
  sceneIndex = 1,
  storyMemory = {},
  maxActive = DEFAULT_MAX_ACTIVE,
} = {}) {
  const registry = new Map();

  for (const s of (intent.scenes || []).filter((sc) => (sc.index ?? 0) < sceneIndex)) {
    const ch = intent._chapter ?? chapter;
    const qs = s.scenePlan?.questions || s.executionPlan?.questions;
    if (!qs) continue;

    for (const q of (qs.newReaderQuestions || []).map((item) => (
      typeof item === 'string' ? { readerQuestion: item } : item
    ))) {
      const key = questionKey(q.readerQuestion);
      if (!key) continue;
      const existing = registry.get(key);
      const entry = createQuestionEntry({
        readerQuestion: q.readerQuestion,
        authorQuestion: q.authorQuestion,
        importance: q.importance ?? 80,
        chapter: ch,
        sceneIndex: s.index,
        state: existing ? 'growing' : 'created',
        answerProgress: q.answerProgress ?? 0,
      });
      if (existing) {
        entry.state = 'growing';
        entry.createdChapter = existing.createdChapter;
        entry.answerProgress = Math.max(existing.answerProgress, entry.answerProgress);
      }
      registry.set(key, entry);
    }

    const answered = qs.answeredReaderQuestion?.readerQuestion || qs.answeredQuestion;
    if (answered) {
      const key = questionKey(answered);
      const entry = registry.get(key) || createQuestionEntry({
        readerQuestion: answered,
        chapter: ch,
        sceneIndex: s.index,
      });
      entry.state = entry.answerProgress >= 100 ? 'answered' : 'partially_answered';
      entry.answerProgress = Math.max(entry.answerProgress, 60);
      entry.lastTouchedChapter = ch;
      registry.set(key, entry);
    }
  }

  for (const h of storyMemory.hint || storyMemory.openQuestions || []) {
    const text = norm(h.text || h.question);
    if (!text) continue;
    const key = questionKey(text);
    if (!registry.has(key)) {
      registry.set(key, createQuestionEntry({
        readerQuestion: text,
        chapter: 1,
        sceneIndex: 1,
        state: 'growing',
        importance: 85,
      }));
    }
  }

  const now = chapter;
  for (const [key, entry] of registry) {
    if (entry.state === 'answered' || entry.state === 'expired') continue;
    if (now > entry.expireByChapter && entry.answerProgress < 30) {
      entry.state = 'expired';
    }
  }

  const active = [...registry.values()]
    .filter((e) => e.state !== 'answered' && e.state !== 'expired')
    .sort((a, b) => b.importance - a.importance);

  const expired = [...registry.values()].filter((e) => e.state === 'expired');

  return {
    registry: [...registry.values()],
    active: active.slice(0, maxActive),
    expired: expired.slice(-5),
    maxActive,
    mustExpireCount: expired.length,
    rule: '活跃追问 ≤12；超时未推进的追问标记 Expired，Writer 不得再铺陈',
  };
}

/**
 * 将生命周期应用到本 Scene Question Plan
 */
export function applyQuestionLifecycle({
  questions = {},
  registry = {},
  chapter = 1,
  sceneIndex = 1,
} = {}) {
  const active = registry.active || [];
  const answeredKey = questionKey(
    questions.answeredReaderQuestion?.readerQuestion || questions.answeredQuestion,
  );

  const answeredEntry = active.find((e) => questionKey(e.readerQuestion) === answeredKey)
    || (answeredKey ? createQuestionEntry({
      readerQuestion: questions.answeredReaderQuestion?.readerQuestion || questions.answeredQuestion,
      chapter,
      sceneIndex,
      state: 'partially_answered',
      answerProgress: 50,
    }) : null);

  if (answeredEntry) {
    answeredEntry.state = answeredEntry.answerProgress >= 100 ? 'answered' : 'partially_answered';
    answeredEntry.answerProgress = Math.min(100, answeredEntry.answerProgress + 40);
    answeredEntry.lastTouchedChapter = chapter;
  }

  const newEntries = (questions.newReaderQuestions || []).map((q, i) => {
    const item = typeof q === 'string' ? { readerQuestion: q } : q;
    const key = questionKey(item.readerQuestion);
    const existing = active.find((e) => questionKey(e.readerQuestion) === key);
    if (existing) {
      return { ...existing, state: 'growing', lastTouchedChapter: chapter };
    }
    return createQuestionEntry({
      readerQuestion: item.readerQuestion,
      authorQuestion: item.authorQuestion,
      importance: item.importance ?? (88 - i * 4),
      chapter,
      sceneIndex,
      state: 'created',
    });
  });

  const expiredToClose = (registry.expired || []).slice(0, 2);

  return {
    ...questions,
    lifecycle: {
      answered: answeredEntry,
      created: newEntries,
      activeCount: active.length,
      expiredClosed: expiredToClose,
      rule: '回答 1 个（可 Partially）+ 新建 2 个；Expired 追问不再展开',
    },
    answeredReaderQuestion: answeredEntry
      ? { ...questions.answeredReaderQuestion, state: answeredEntry.state, answerProgress: answeredEntry.answerProgress }
      : questions.answeredReaderQuestion,
    newReaderQuestions: newEntries.map((e) => ({
      ...questions.newReaderQuestions?.find((q) => questionKey(
        typeof q === 'string' ? q : q.readerQuestion,
      ) === questionKey(e.readerQuestion)),
      readerQuestion: e.readerQuestion,
      state: e.state,
      importance: e.importance,
      expireByChapter: e.expireByChapter,
    })),
  };
}

export function formatQuestionLifecycleBlock(lifecycle = {}, registry = {}) {
  if (!lifecycle?.answered && !lifecycle?.created?.length && !registry?.active?.length) return '';

  const lines = [
    '### Question Lifecycle · 追问管理（P2）',
    '**避免谜团堆积**：Created → Growing → Answered/Partial → Expired',
    '',
  ];

  if (lifecycle.answered) {
    lines.push(
      `- **本 Scene 回答**：${lifecycle.answered.readerQuestion} → **${QUESTION_STATES[lifecycle.answered.state]?.label || lifecycle.answered.state}**（${lifecycle.answered.answerProgress}%）`,
    );
  }
  if (lifecycle.created?.length) {
    lines.push(`- **新建追问**：${lifecycle.created.map((e) => `${e.readerQuestion?.slice(0, 25)}[${e.state}]`).join(' · ')}`);
  }
  if (registry.active?.length) {
    lines.push(`- **活跃追问**：${registry.active.length}/${registry.maxActive || 12}`);
  }
  if (lifecycle.expiredClosed?.length) {
    lines.push(`- **本 Scene 收口过期**：${lifecycle.expiredClosed.map((e) => e.readerQuestion?.slice(0, 20)).join('、')}（不再展开）`);
  }

  lines.push('', '- **铁律**：百章后不得无限堆谜团 — 须回答、部分回答或标记 Expired');
  return lines.join('\n');
}

export function formatChapterQuestionRegistryBlock(registry = {}) {
  if (!registry?.active?.length) return '';
  const active = registry.active.slice(0, 6);
  return [
    '### Question Registry · 章级追问管理',
    `- **活跃追问**：${registry.active.length}/${registry.maxActive || 12}`,
    ...active.map((e) => `- [${e.state}] ${e.readerQuestion?.slice(0, 35)}（${e.answerProgress}% · 第 ${e.expireByChapter} 章前须推进）`),
    registry.expired?.length
      ? `- **已过期收口**：${registry.expired.length} 条 — 不再铺陈`
      : '',
    '- **铁律**：Created → Growing → Answered/Partial → Expired，禁止百章堆谜团',
  ].filter(Boolean).join('\n');
}
