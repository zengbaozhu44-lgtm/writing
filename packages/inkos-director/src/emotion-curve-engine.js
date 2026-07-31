/**
 * Emotion Curve Engine — Director 侧情绪规划
 * 控制读者情绪起伏，禁止整章单一情绪
 * 分析侧 emotion-curve.js 仅学习；此处驱动 Writer
 */

const EMOTION_LABELS = [
  '疑惑', '紧张', '恐惧', '震惊', '愤怒', '绝望', '希望', '释放', '期待', '感动',
];

/** Scene 情绪弧模板 — 紧张→释放→更大恐惧→希望 */
const SCENE_EMOTION_ARCS = [
  { start: '疑惑', middle: '紧张', peak: '震惊', end: '恐惧' },
  { start: '恐惧', middle: '挣扎', peak: '绝望', end: '希望' },
  { start: '紧张', middle: '愤怒', peak: '震惊', end: '释放' },
  { start: '希望', middle: '紧张', peak: '恐惧', end: '绝望' },
  { start: '疑惑', middle: '期待', peak: '震惊', end: '紧张' },
];

const CHAPTER_END_EMOTIONS = ['恐惧', '绝望', '紧张', '期待'];

function pickArc(sceneIndex = 1, sceneCount = 4, prevEnd = null) {
  const idx = (sceneIndex - 1) % SCENE_EMOTION_ARCS.length;
  let arc = { ...SCENE_EMOTION_ARCS[idx] };

  if (prevEnd && arc.start === prevEnd) {
    arc.start = arc.start === '恐惧' ? '紧张' : '疑惑';
  }
  if (sceneIndex === sceneCount) {
    arc.end = CHAPTER_END_EMOTIONS[sceneIndex % CHAPTER_END_EMOTIONS.length];
    arc.peak = '震惊';
  }
  return arc;
}

/**
 * Scene 情绪曲线规划
 */
export function buildSceneEmotionCurvePlan({
  scene = {},
  sceneIndex = 1,
  sceneCount = 4,
  chapter = 1,
  sceneType = null,
  prevEmotionEnd = null,
  hookLadder = null,
} = {}) {
  if (scene.emotionCurve?.emotionStart) {
    return normalizeEmotionCurve(scene.emotionCurve, sceneIndex);
  }

  const arc = pickArc(sceneIndex, sceneCount, prevEmotionEnd);
  const hookEntry = hookLadder?.find((h) => h.sceneIndex === sceneIndex);
  const hookType = hookEntry?.type || hookEntry?.name || '';

  let peak = arc.peak;
  if (/Truth|真相|PointOfNoReturn/u.test(hookType)) peak = '震惊';
  if (/Danger|Cost/u.test(hookType)) peak = '恐惧';

  const curve = {
    emotionStart: arc.start,
    emotionMiddle: arc.middle,
    emotionPeak: peak,
    emotionEnd: arc.end,
    sceneIndex,
    chapter,
    sceneType,
    rule: '禁止整章单一情绪 — 须紧张→释放→更大危机→希望交替',
    beats: mapEmotionToBeats(arc, peak),
  };

  curve.hasVariation = new Set([
    curve.emotionStart,
    curve.emotionMiddle,
    curve.emotionPeak,
    curve.emotionEnd,
  ]).size >= 3;

  curve.valid = curve.hasVariation && curve.emotionStart !== curve.emotionEnd;
  return curve;
}

function mapEmotionToBeats(arc, peak) {
  return {
    goal: arc.start,
    obstacle: '紧张',
    choice: arc.middle,
    consequence: peak,
    newInformation: peak,
    hook: arc.end,
  };
}

function normalizeEmotionCurve(c = {}, sceneIndex = 1) {
  const curve = {
    emotionStart: c.emotionStart || c.start || '疑惑',
    emotionMiddle: c.emotionMiddle || c.middle || '紧张',
    emotionPeak: c.emotionPeak || c.peak || '震惊',
    emotionEnd: c.emotionEnd || c.end || '恐惧',
    sceneIndex: c.sceneIndex ?? sceneIndex,
    rule: c.rule || '禁止整章单一情绪',
    beats: c.beats || mapEmotionToBeats(
      { start: c.emotionStart, middle: c.emotionMiddle, end: c.emotionEnd },
      c.emotionPeak,
    ),
  };
  curve.hasVariation = new Set([
    curve.emotionStart, curve.emotionMiddle, curve.emotionPeak, curve.emotionEnd,
  ]).size >= 3;
  curve.valid = curve.hasVariation;
  return curve;
}

export function formatEmotionCurveBrief(curve = {}) {
  if (!curve?.emotionStart) return '';
  return [
    '### Emotion Curve · 情绪起伏',
    `- **起**：${curve.emotionStart} → **中**：${curve.emotionMiddle} → **峰**：${curve.emotionPeak} → **收**：${curve.emotionEnd}`,
    '- 禁止整章一种情绪；须紧张→释放→更大危机交替',
    curve.beats?.goal ? `- Beat 映射：Goal=${curve.beats.goal} · Hook=${curve.beats.hook}` : '',
  ].filter(Boolean).join('\n');
}

/** Priority 1 辅助 — 情绪须落地到 Beat */
export function formatEmotionCurveBlock(curve = {}) {
  if (!curve?.emotionStart) return '';
  return [
    '### Emotion Curve · 情绪控制（P1 辅助）',
    `- **Scene 情绪弧**：${curve.emotionStart} → ${curve.emotionMiddle} → ${curve.emotionPeak} → ${curve.emotionEnd}`,
    '- **禁止**：全程恐怖/全程紧张 — 读者会疲劳',
    '- **必须**：至少一次释放或希望，再推入更大危机',
    '- **落地**：情绪用动作/对白/节奏体现，禁止贴标签式心理描写',
  ].join('\n');
}

export { EMOTION_LABELS };
