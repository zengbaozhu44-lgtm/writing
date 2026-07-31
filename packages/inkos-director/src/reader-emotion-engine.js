/**
 * Reader Emotion Engine — 读者情绪曲线 + Emotion Wave
 *
 * 不维护孤立「Danger」分数；维护情绪波浪：
 * Curiosity → Tension → Pressure → Hope → Shock → Relief
 *
 * Director 必须规划波浪；禁止连续平平平平；禁止一直高潮。
 * 与角色情绪分离：信息差制造读者压力，不是 POV 心理堆砌。
 */

import {
  EMOTION_WAVE,
  PEAK_EMOTIONS,
  FLAT_EMOTIONS,
  validateEmotionWave,
  suggestNextEmotion,
} from './narrative-runtime.js';

export const READER_EMOTIONS = [
  '好奇', '紧张', '揪心', '震惊', '愤怒', '不忍', '期待', '后怕', '难以置信', '迫不及待',
];

/** 中文 ↔ Emotion Wave 映射 */
export const ZH_TO_WAVE = Object.freeze({
  好奇: 'Curiosity',
  期待: 'Curiosity',
  紧张: 'Tension',
  揪心: 'Pressure',
  不忍: 'Pressure',
  压力: 'Pressure',
  希望: 'Hope',
  释然: 'Relief',
  轻松: 'Hope',
  震惊: 'Shock',
  愤怒: 'Shock',
  难以置信: 'Shock',
  后怕: 'Relief',
  迫不及待: 'Tension',
});

export const WAVE_TO_ZH = Object.freeze({
  Curiosity: '好奇',
  Tension: '紧张',
  Pressure: '揪心',
  Hope: '希望',
  Shock: '震惊',
  Relief: '后怕',
});

function norm(v = '') {
  return String(v || '').trim();
}

export function mapZhToWave(zh = '') {
  const t = norm(zh);
  if (EMOTION_WAVE.includes(t)) return t;
  for (const [k, w] of Object.entries(ZH_TO_WAVE)) {
    if (t.includes(k)) return w;
  }
  return 'Curiosity';
}

export function mapWaveToZh(wave = '') {
  const w = norm(wave);
  return WAVE_TO_ZH[w] || w || '好奇';
}

/**
 * Director：为 Scene 内 Beats 规划情绪波浪（压→放→压→放→爆）
 *
 * @returns {{
 *   version: string,
 *   wave: string[],
 *   beatTargets: { beatOrder: number, targetEmotion: string, zh: string }[],
 *   start: string,
 *   end: string,
 *   valid: boolean,
 *   failReasons: string[],
 *   rule: string,
 * }}
 */
export function buildEmotionWavePlan({
  beatCount = 6,
  priorWaveEnd = null,
  priorBeatEmotions = [],
  sceneIndex = 1,
  preferShockAt = null,
} = {}) {
  const n = Math.max(2, Number(beatCount) || 6);
  const startIdx = (() => {
    if (priorWaveEnd && EMOTION_WAVE.includes(priorWaveEnd)) {
      const i = EMOTION_WAVE.indexOf(priorWaveEnd);
      return (i + 1) % EMOTION_WAVE.length;
    }
    // Scene 节奏：中段偏压，末段可 Shock
    if (sceneIndex <= 1) return 0; // Curiosity
    if (sceneIndex === 2) return 1; // Tension
    return 2; // Pressure
  })();

  /** 经典浪形：Curiosity → Tension → Pressure → Hope → Shock → Relief（截断/循环对齐 beatCount） */
  const canonical = [...EMOTION_WAVE];
  const wave = [];
  for (let i = 0; i < n; i += 1) {
    wave.push(canonical[(startIdx + i) % canonical.length]);
  }

  // 末拍优先 Shock 或 Relief（禁止末拍停在平 Curiosity）
  if (wave[n - 1] === 'Curiosity') {
    wave[n - 1] = sceneIndex >= 3 ? 'Shock' : 'Tension';
  }
  if (preferShockAt != null && preferShockAt >= 0 && preferShockAt < n) {
    wave[preferShockAt] = 'Shock';
    if (preferShockAt + 1 < n) wave[preferShockAt + 1] = 'Relief';
  }

  // 局部纠偏：禁止连续 ≥3 高潮；禁止连续 ≥4 平
  for (let i = 0; i < wave.length; i += 1) {
    const recent = wave.slice(Math.max(0, i - 3), i);
    let guard = 0;
    while (guard < 4) {
      const check = validateEmotionWave(recent, wave[i]);
      if (check.pass) break;
      wave[i] = check.suggested || suggestNextEmotion(recent);
      guard += 1;
    }
  }

  const beatTargets = wave.map((targetEmotion, i) => ({
    beatOrder: i + 1,
    targetEmotion,
    zh: mapWaveToZh(targetEmotion),
    phase: PEAK_EMOTIONS.has(targetEmotion)
      ? 'press'
      : (FLAT_EMOTIONS.has(targetEmotion) ? 'release' : 'turn'),
  }));

  const history = [...(priorBeatEmotions || []).map(mapZhToWave), ...wave];
  const failReasons = [];
  for (let i = 0; i < history.length; i += 1) {
    const recent = history.slice(Math.max(0, i - 3), i);
    const v = validateEmotionWave(recent, history[i]);
    if (!v.pass) failReasons.push(...v.failReasons);
  }

  return {
    version: 'emotion-wave-1',
    wave,
    beatTargets,
    start: wave[0],
    end: wave[wave.length - 1],
    startZh: mapWaveToZh(wave[0]),
    endZh: mapWaveToZh(wave[wave.length - 1]),
    valid: failReasons.length === 0 && new Set(wave).size >= 3,
    failReasons: [...new Set(failReasons)],
    pattern: '压 → 放 → 压 → 放 → 爆',
    rule: '禁止连续平平平平；禁止一直高潮；Director 须规划情绪波浪',
  };
}

/**
 * 校验既有曲线是否符合波浪纪律（给 Director / Narrative 复用）
 */
export function validateReaderEmotionWave(curve = {}, { priorBeatEmotions = [] } = {}) {
  const seq = [
    ...(priorBeatEmotions || []),
    curve.emotionWave?.start || mapZhToWave(curve.readerEmotionStart),
    curve.emotionWave?.mid || mapZhToWave(curve.readerEmotionMiddle),
    curve.emotionWave?.peak || mapZhToWave(curve.readerEmotionPeak),
    curve.emotionWave?.end || mapZhToWave(curve.readerEmotionEnd),
  ].filter(Boolean);

  const fails = [];
  for (let i = 0; i < seq.length; i += 1) {
    const v = validateEmotionWave(seq.slice(Math.max(0, i - 3), i), seq[i]);
    if (!v.pass) fails.push(...v.failReasons);
  }
  return {
    pass: fails.length === 0,
    failReasons: [...new Set(fails)],
    sequence: seq,
  };
}

/**
 * 构建读者情绪曲线（与角色情绪曲线对照）+ Emotion Wave
 */
export function buildReaderEmotionCurve({
  characterEmotionCurve = {},
  plan = {},
  scene = {},
  questions = {},
  conflict = {},
  hookOutput = {},
  situation = {},
  beatCount = 6,
  priorWaveEnd = null,
  priorBeatEmotions = [],
  sceneIndex = 1,
  informationGap = null,
} = {}) {
  const charStart = characterEmotionCurve.emotionStart || '疑惑';
  const charEnd = characterEmotionCurve.emotionEnd || '恐惧';

  const readerKnows = norm(plan.newInformation || scene.newInformation)
    || norm(questions.readerQuestion?.readerQuestion)
    || norm(conflict?.risk)
    || norm(hookOutput?.plantedPromise);

  const heroKnows = norm(situation.characterState?.before)
    || norm(plan.goal)
    || '';
  const enemyKnows = norm(conflict?.opposition || conflict?.enemyKnows || '');

  const povOblivious = /相信|正常|还不知道|以为|尚/u.test(
    `${situation.characterState?.before || ''}${plan.goal || ''}`,
  );

  const wavePlan = buildEmotionWavePlan({
    beatCount,
    priorWaveEnd: priorWaveEnd ? mapZhToWave(priorWaveEnd) : null,
    priorBeatEmotions,
    sceneIndex: scene.index ?? sceneIndex,
    preferShockAt: /震惊|真相|背叛/u.test(readerKnows) ? Math.max(1, beatCount - 2) : null,
  });

  // 中文四拍与波浪对齐（兼容旧字段）
  let readerStart = mapWaveToZh(wavePlan.wave[0]);
  let readerMiddle = mapWaveToZh(wavePlan.wave[Math.floor((wavePlan.wave.length - 1) / 3)] || wavePlan.wave[1]);
  let readerPeak = mapWaveToZh(
    wavePlan.wave.find((w) => w === 'Shock' || w === 'Pressure') || wavePlan.wave[wavePlan.wave.length - 2],
  );
  let readerEnd = mapWaveToZh(wavePlan.wave[wavePlan.wave.length - 1]);

  if (readerKnows && povOblivious) {
    // 信息差加压：起点至少 Tension，峰值 Shock/Pressure
    if (wavePlan.wave[0] === 'Curiosity') {
      wavePlan.wave[0] = 'Tension';
      readerStart = '紧张';
    }
    readerMiddle = '揪心';
    readerPeak = '不忍';
    readerEnd = mapWaveToZh(wavePlan.wave[wavePlan.wave.length - 1]) || '迫不及待';
  } else if (/震惊|真相|背叛/u.test(readerKnows)) {
    readerPeak = '震惊';
    readerEnd = '难以置信';
  } else if (conflict?.cost && /死|失去|妹妹/u.test(conflict.cost)) {
    readerPeak = '揪心';
    readerEnd = '后怕';
  }

  const knowledgeGap = readerKnows && povOblivious
    ? '读者领先 POV — 读者已知危险，角色尚未察觉'
    : (readerKnows ? '读者与 POV 同步收紧' : '读者随 POV 发现');

  const dramaticIrony = readerKnows && povOblivious
    ? `读者知道而 POV 不知道：${readerKnows.slice(0, 55)} — 正文须让读者「想喊出来」`
    : (conflict?.risk ? `读者压力源：${conflict.risk.slice(0, 45)}` : null);

  const gap = {
    readerKnows: uniq([
      ...(informationGap?.readerKnows || []),
      ...(readerKnows ? [readerKnows.slice(0, 60)] : []),
    ]),
    heroKnows: uniq([
      ...(informationGap?.heroKnows || []),
      ...(heroKnows && !povOblivious ? [heroKnows.slice(0, 60)] : []),
    ]),
    enemyKnows: uniq([
      ...(informationGap?.enemyKnows || []),
      ...(enemyKnows ? [enemyKnows.slice(0, 60)] : []),
    ]),
  };

  // 若三角全同且非空，拆开制造信息差
  const joined = `${gap.readerKnows.join('|')}|${gap.heroKnows.join('|')}|${gap.enemyKnows.join('|')}`;
  if (gap.readerKnows.length && gap.readerKnows.join('|') === gap.heroKnows.join('|')
    && gap.heroKnows.join('|') === gap.enemyKnows.join('|')) {
    gap.heroKnows = [];
    gap.enemyKnows = enemyKnows ? [enemyKnows.slice(0, 60)] : ['敌人尚不知 POV 已行动'];
  }
  void joined;

  const waveCheck = validateReaderEmotionWave({
    readerEmotionStart: readerStart,
    readerEmotionMiddle: readerMiddle,
    readerEmotionPeak: readerPeak,
    readerEmotionEnd: readerEnd,
    emotionWave: {
      start: mapZhToWave(readerStart),
      mid: mapZhToWave(readerMiddle),
      peak: mapZhToWave(readerPeak),
      end: mapZhToWave(readerEnd),
    },
  }, { priorBeatEmotions });

  return {
    version: 'reader-emotion-2',
    readerEmotionStart: readerStart,
    readerEmotionMiddle: readerMiddle,
    readerEmotionPeak: readerPeak,
    readerEmotionEnd: readerEnd,
    characterEmotionStart: charStart,
    characterEmotionEnd: charEnd,
    knowledgeGap,
    dramaticIrony,
    informationGap: gap,
    emotionWave: {
      version: wavePlan.version,
      sequence: wavePlan.wave,
      beatTargets: wavePlan.beatTargets,
      start: wavePlan.start,
      end: wavePlan.end,
      pattern: wavePlan.pattern,
      valid: wavePlan.valid && waveCheck.pass,
      failReasons: [...wavePlan.failReasons, ...waveCheck.failReasons],
    },
    rule: '禁止角色一直害怕 — 用信息差制造读者紧张；Director 须压→放→压→放→爆',
    waveRule: wavePlan.rule,
    valid: readerStart !== readerEnd && (wavePlan.valid || waveCheck.pass),
  };
}

function uniq(list = []) {
  const out = [];
  const seen = new Set();
  for (const x of list) {
    const s = norm(x);
    if (!s || seen.has(s)) continue;
    seen.add(s);
    out.push(s);
  }
  return out;
}

export function formatReaderEmotionBlock(curve = {}) {
  if (!curve?.readerEmotionStart) return '';

  const wave = curve.emotionWave?.sequence?.length
    ? curve.emotionWave.sequence.join(' → ')
    : '';

  return [
    '### Reader Emotion · 读者情绪（P1 辅助）',
    '**与角色情绪分离** — 控制读者追读压力，不是 POV 内心戏',
    '',
    `- **读者情绪**：${curve.readerEmotionStart} → ${curve.readerEmotionMiddle} → ${curve.readerEmotionPeak} → ${curve.readerEmotionEnd}`,
    wave ? `- **Emotion Wave**：${wave}` : '',
    curve.emotionWave?.pattern ? `- **波浪形态**：${curve.emotionWave.pattern}` : '',
    `- **角色情绪（对照）**：${curve.characterEmotionStart} → ${curve.characterEmotionEnd}`,
    `- **信息差**：${curve.knowledgeGap}`,
    curve.dramaticIrony ? `- **戏剧反讽**：${curve.dramaticIrony}` : '',
    curve.informationGap?.readerKnows?.length
      ? `- **readerKnows**：${curve.informationGap.readerKnows.slice(0, 2).join('；')}`
      : '',
    curve.informationGap?.heroKnows?.length
      ? `- **heroKnows**：${curve.informationGap.heroKnows.slice(0, 2).join('；')}`
      : '',
    curve.informationGap?.enemyKnows?.length
      ? `- **enemyKnows**：${curve.informationGap.enemyKnows.slice(0, 2).join('；')}`
      : '',
    '',
    '**铁律**：',
    '- 读者可以比 POV 更紧张（读者知道危险，角色不知道）',
    '- 禁止角色全程恐惧 — 用事件与信息差推读者情绪',
    '- 禁止连续平平平平；禁止一直高潮；须压→放→压→放→爆',
    '- 用镜头/对白/细节让读者「揪心」，禁止旁白解释',
    '- 禁止所有角色知道同样的信息 — 必须制造信息差',
  ].filter(Boolean).join('\n');
}

export function formatReaderEmotionBrief(curve = {}) {
  if (!curve?.readerEmotionStart) return '';
  const w = curve.emotionWave?.sequence?.slice(0, 4).join('→') || '';
  return `Reader Emotion：${curve.readerEmotionStart}→${curve.readerEmotionEnd}${w ? ` · Wave ${w}` : ''} · ${curve.knowledgeGap?.slice(0, 20) || ''}`;
}

export {
  EMOTION_WAVE,
  PEAK_EMOTIONS,
  FLAT_EMOTIONS,
  validateEmotionWave,
  suggestNextEmotion,
};
