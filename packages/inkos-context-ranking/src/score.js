import { charCount, extractKeywords, keywordOverlap } from './utils.js';

const WEIGHTS = {
  relevance: 0.45,
  importance: 0.25,
  freshness: 0.20,
  narrativePriority: 0.10,
};

function scoreRelevance(entry, sceneKeywords, intentKeywords) {
  const relScene = keywordOverlap(entry.text, sceneKeywords);
  const relIntent = keywordOverlap(entry.text, intentKeywords);
  const povHit = entry.meta?.isPov || entry.meta?.name === entry.meta?.character ? 0.2 : 0;
  return Math.min(100, Math.round((relScene * 0.5 + relIntent * 0.35 + povHit) * 100));
}

function scoreImportance(entry) {
  let score = 40;
  // EO-P7 I-05: immutable boosts *retention ranking* for Writer context, not obtains.
  if (entry.source === 'facts' && entry.meta?.immutable) score += 35;
  if (entry.source === 'relationships' && (entry.meta?.hostility >= 3 || entry.meta?.trust <= 2)) score += 25;
  if (entry.source === 'characters' && entry.meta?.isPov) score += 30;
  if (entry.source === 'knowledge') score += 15;
  if (entry.source === 'resources') score += 10;
  return Math.min(100, score);
}

function scoreFreshness(entry, chapter = 1) {
  if (entry.source === 'timeline') {
    const recency = entry.meta?.recency ?? 0;
    return Math.max(20, Math.min(100, 100 - recency * 15));
  }
  if (entry.source === 'facts' && entry.meta?.chapter) {
    const gap = chapter - entry.meta.chapter;
    return Math.max(30, Math.min(100, 100 - gap * 12));
  }
  if (entry.source === 'characters' || entry.source === 'relationships') return 75;
  if (entry.source === 'world') return 45;
  return 55;
}

function scoreStoryWeight(entry, storyDna = {}) {
  const corpus = [storyDna.core_hook, storyDna.main_conflict, storyDna.theme].filter(Boolean).join(' ');
  const kws = extractKeywords(corpus);
  return Math.min(100, Math.round(keywordOverlap(entry.text, kws) * 100 + (entry.source === 'facts' ? 20 : 0)));
}

function scoreSceneWeight(entry, scene = {}, present = []) {
  let score = 30;
  const goal = scene.goal || '';
  const entities = scene.entities || present || [];
  if (entities.some((e) => entry.text.includes(e))) score += 35;
  if (goal && keywordOverlap(entry.text, extractKeywords(goal)) > 0.2) score += 25;
  if (entry.source === 'characters' && entities.includes(entry.meta?.name)) score += 20;
  return Math.min(100, score);
}

function scoreNarrativePriority(entry, scene = {}, present = [], storyDna = {}) {
  const story = scoreStoryWeight(entry, storyDna);
  const sceneW = scoreSceneWeight(entry, scene, present);
  return Math.round(story * 0.4 + sceneW * 0.6);
}

export function scoreContextEntry(entry, options = {}) {
  const {
    scene = {},
    intent = {},
    storyDna = {},
    chapter = 1,
    present = [],
    budgetChars = 4000,
  } = options;

  const sceneKeywords = extractKeywords([scene.goal, scene.conflict, scene.title].filter(Boolean).join(' '));
  const intentKeywords = extractKeywords([intent.mainGoal, intent.chapterIntent, intent.pov].filter(Boolean).join(' '));

  const scores = {
    relevance: scoreRelevance(entry, sceneKeywords, intentKeywords),
    importance: scoreImportance(entry),
    freshness: scoreFreshness(entry, chapter),
    narrativePriority: scoreNarrativePriority(entry, scene, present, storyDna),
    budgetChars,
  };

  let finalScore = 0;
  for (const [k, w] of Object.entries(WEIGHTS)) {
    finalScore += (scores[k] ?? 0) * w;
  }
  scores.finalScore = Math.round(finalScore * 100) / 100;

  return { ...entry, scores };
}

export { WEIGHTS };
