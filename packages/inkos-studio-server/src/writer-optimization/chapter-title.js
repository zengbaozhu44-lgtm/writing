/**
 * 章标题 — 必须是悬念句，禁止「第 X 章」
 */
const GENERIC_TITLE_RE = /^第\s*\d+\s*章$/;
const SUSPENSE_MARKERS = /[？?]|谁|什么|为什么|能否|会不会|到底|究竟|难道|秘密|真相|消失|刷新|倒计时/;

function cleanTitle(text) {
  return String(text || '')
    .replace(/^[#\s]+/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function isSuspenseTitle(text) {
  const t = cleanTitle(text);
  if (!t || t.length < 4) return false;
  if (GENERIC_TITLE_RE.test(t)) return false;
  if (/^第\d+章/.test(t)) return false;
  return SUSPENSE_MARKERS.test(t) || t.length >= 6;
}

function buildFromIntent(intent = {}, chapter = 1, storyDna = {}) {
  const question = intent.mainQuestion || storyDna.main_question || storyDna.core_hook || '';
  const goal = intent.mainGoal || intent.chapterIntent || '';
  const ending = intent.ending || intent.newForeshadow || '';
  const obstacle = intent.obstacles?.[0] || '';

  if (question && question.length >= 4) {
    const q = cleanTitle(question);
    return q.endsWith('？') || q.endsWith('?') ? q : `${q}？`;
  }
  if (ending && ending.length >= 4) {
    return cleanTitle(ending).slice(0, 24);
  }
  if (obstacle && obstacle.length >= 4) {
    return `${cleanTitle(obstacle).slice(0, 18)}，还能撑多久？`;
  }
  if (goal && goal.length >= 4) {
    return `${cleanTitle(goal).slice(0, 16)}，代价是什么？`;
  }
  return chapter === 1 ? '异常从第一秒开始' : `第 ${chapter} 章的未解之问`;
}

/**
 * 解析章悬念标题（用于文件名与章首）
 */
export function resolveChapterSuspenseTitle(intent = {}, chapter = 1, storyDna = {}) {
  const candidates = [
    intent.chapterTitle,
    intent.title,
    intent.suspenseTitle,
  ].map(cleanTitle).filter(Boolean);

  for (const c of candidates) {
    if (isSuspenseTitle(c)) return c;
  }

  return buildFromIntent(intent, chapter, storyDna);
}

export function sanitizeChapterFilename(title) {
  return String(title || '章')
    .replace(/[\\/:*?"<>|]/g, '')
    .replace(/\s+/g, '')
    .slice(0, 32) || '章';
}

export function buildChapterTitleBlock(intent = {}, chapter = 1, storyDna = {}) {
  const title = resolveChapterSuspenseTitle(intent, chapter, storyDna);
  return [
    '## 章标题规则',
    `- **本章悬念标题**：${title}`,
    '- 章标题必须是悬念句/问句，禁止「第 X 章」式命名',
    '- 正文内不要输出章标题（标题由系统写入章文件）',
  ].join('\n');
}
