import {
  charCount,
  extractMainKeywords,
  splitSentences,
  SUB_THREAD_MARKERS,
  WORLD_THREAD_MARKERS,
  CHARACTER_THREAD_MARKERS,
  MAX_SUB_THREAD_RATIO,
} from './utils.js';

function scoreKeywordHits(text, keywords) {
  if (!keywords.length) return 0;
  let hits = 0;
  for (const kw of keywords) {
    if (text.includes(kw)) hits += 1;
  }
  return Math.min(100, Math.round((hits / Math.min(keywords.length, 8)) * 100));
}

function classifySentenceThread(sentence, keywords) {
  const c = charCount(sentence);
  if (!c) return null;

  if (SUB_THREAD_MARKERS.test(sentence)) return { type: 'sub', chars: c };
  if (WORLD_THREAD_MARKERS.test(sentence) && !keywords.some((k) => sentence.includes(k))) {
    return { type: 'world', chars: c };
  }
  if (CHARACTER_THREAD_MARKERS.test(sentence)) return { type: 'character', chars: c };
  if (keywords.some((k) => sentence.includes(k))) return { type: 'main', chars: c };

  return { type: 'main', chars: c };
}

/** 分析单 Scene 对各 Thread 的贡献 */
export function analyzeSceneThreads(text, scene = {}, intent = {}, storyDna = {}) {
  const body = String(text || '').trim();
  const keywords = extractMainKeywords(intent, storyDna);
  const sentences = splitSentences(body);

  const totals = { main: 0, sub: 0, world: 0, character: 0, other: 0 };
  for (const s of sentences) {
    const hit = classifySentenceThread(s, keywords);
    if (hit) totals[hit.type] = (totals[hit.type] || 0) + hit.chars;
  }

  const totalChars = charCount(body) || 1;
  const keywordScore = scoreKeywordHits(body, keywords);
  const goalKeywords = scene.goal ? extractMainKeywords({ mainGoal: scene.goal }, {}) : keywords;
  const goalHits = goalKeywords.filter((k) => body.includes(k)).length;
  const goalAligned = goalHits > 0 ? Math.min(25, goalHits * 8) : 0;
  const conflictAligned = /冲突|对抗|必须|不得不|代价|阻碍|但是|然而|升级/u.test(body) ? 10 : 0;

  const mainProgress = keywords.length
    ? Math.min(100, Math.round(keywordScore * 0.55 + goalAligned + conflictAligned))
    : Math.min(100, goalAligned + conflictAligned);
  const subRatio = totals.sub / totalChars;
  const worldRatio = totals.world / totalChars;
  const characterRatio = totals.character / totalChars;
  const mainRatio = Math.max(0, 1 - subRatio - worldRatio * 0.5);

  const failures = [];
  if (subRatio > MAX_SUB_THREAD_RATIO) {
    failures.push(`Story Thread：支线占比 ${(subRatio * 100).toFixed(1)}%（上限 ${MAX_SUB_THREAD_RATIO * 100}%）`);
  }

  return {
    threads: {
      main: {
        progress: mainProgress,
        ratio: Number(mainRatio.toFixed(3)),
        chars: totals.main,
      },
      sub: {
        progress: Math.round(subRatio * 100),
        ratio: Number(subRatio.toFixed(3)),
        chars: totals.sub,
      },
      world: {
        progress: Math.round(worldRatio * 100),
        ratio: Number(worldRatio.toFixed(3)),
        chars: totals.world,
      },
      character: {
        progress: Math.round(characterRatio * 100),
        ratio: Number(characterRatio.toFixed(3)),
        chars: totals.character,
      },
    },
    mainProgress,
    subRatio,
    subPercent: Math.round(subRatio * 100),
    totalChars,
    keywords,
    failures,
    advancesMainThread: mainProgress >= 5,
  };
}
