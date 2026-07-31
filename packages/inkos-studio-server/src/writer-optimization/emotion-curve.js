/**
 * Emotion Curve — 记录 fear / hope / anger / surprise / relief，控制章节情绪波动
 */
const EMOTION_SIGNALS = {
  fear: [/害怕|恐惧|紧张|不安|颤抖|冷汗|心跳|僵|屏息|危险|逼近/u, 1.2],
  hope: [/希望|期待|也许|可能|终于|还好|松了|庆幸|机会|办法/u, 1.0],
  anger: [/愤怒|怒|火|咬牙|攥拳|骂|恨|暴|冲|吼/u, 1.1],
  surprise: [/惊讶|震惊|愣|意外|竟然|居然|没想到|原来|不可能/u, 1.15],
  relief: [/松气|放松|如释|缓|安心|还好|暂时|逃过/u, 0.9],
};

function scoreEmotionDimension(text, patternEntry) {
  const t = String(text || '');
  const [re, w] = patternEntry;
  let hits = 0;
  let weight = 0;
  const count = (t.match(new RegExp(re.source, 'gu')) || []).length;
  if (count > 0) {
    hits += count;
    weight += count * w;
  }
  if (hits === 0) return 0;
  return Math.min(100, Math.round(20 + weight * 12 + hits * 5));
}

/**
 * 分析单 Beat/文本片段的五维情绪
 */
export function analyzeBeatEmotion(text = '') {
  const result = {};
  for (const [dim, patterns] of Object.entries(EMOTION_SIGNALS)) {
    result[dim] = scoreEmotionDimension(text, patterns);
  }
  result.dominant = Object.entries(result)
    .filter(([k]) => k !== 'dominant')
    .sort((a, b) => b[1] - a[1])[0]?.[0] || null;
  return result;
}

/**
 * 构建 Scene 级情绪曲线（逐 Beat 采样 + 汇总）
 */
export function buildSceneEmotionCurve(beatParts = []) {
  const beats = beatParts.map((part) => {
    const text = part.text || '';
    const emotion = analyzeBeatEmotion(text);
    return {
      order: part.beat?.order ?? part.order,
      structuralBeat: part.beat?.structuralBeat ?? part.structuralBeat,
      ...emotion,
    };
  });

  const aggregate = { fear: 0, hope: 0, anger: 0, surprise: 0, relief: 0 };
  for (const b of beats) {
    for (const dim of Object.keys(aggregate)) {
      aggregate[dim] = Math.max(aggregate[dim], b[dim] ?? 0);
    }
  }

  const values = Object.values(aggregate);
  const variance = values.length
    ? Math.max(...values) - Math.min(...values.filter((v) => v > 0).concat([0]))
    : 0;

  return {
    beats,
    scenePeak: aggregate,
    emotionalVariance: variance,
    hasFluctuation: variance >= 25,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * 合并多 Scene 为章级情绪曲线
 */
export function buildChapterEmotionCurve(sceneCurves = []) {
  const chapterPeak = { fear: 0, hope: 0, anger: 0, surprise: 0, relief: 0 };
  const scenes = [];

  for (const curve of sceneCurves) {
    if (!curve) continue;
    scenes.push({
      sceneIndex: curve.sceneIndex,
      scenePeak: curve.scenePeak,
      hasFluctuation: curve.hasFluctuation,
    });
    for (const dim of Object.keys(chapterPeak)) {
      chapterPeak[dim] = Math.max(chapterPeak[dim], curve.scenePeak?.[dim] ?? 0);
    }
  }

  const peakValues = Object.values(chapterPeak);
  const arcIntensity = peakValues.length ? Math.round(peakValues.reduce((a, b) => a + b, 0) / peakValues.length) : 0;

  return {
    scenes,
    chapterPeak,
    arcIntensity,
    generatedAt: new Date().toISOString(),
  };
}
