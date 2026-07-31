/**
 * Emotion Wave / Reader Emotion 模块 3 冒烟
 */
import {
  buildReaderEmotionCurve,
  buildEmotionWavePlan,
  validateReaderEmotionWave,
  mapZhToWave,
  EMOTION_WAVE,
} from '../packages/inkos-director/src/reader-emotion-engine.js';

const wave = buildEmotionWavePlan({ beatCount: 6, sceneIndex: 1 });
if (wave.wave.length !== 6 || !wave.valid) {
  console.error('FAIL wave plan', wave);
  process.exit(1);
}
if (new Set(wave.wave).size < 3) {
  console.error('FAIL wave lack variation', wave.wave);
  process.exit(1);
}

// 一直高潮应被纠偏
const peaky = buildEmotionWavePlan({
  beatCount: 4,
  priorWaveEnd: 'Tension',
  preferShockAt: 1,
});
const peakCheck = [];
for (let i = 0; i < peaky.wave.length; i += 1) {
  const { validateEmotionWave } = await import('../packages/inkos-director/src/narrative-runtime.js');
  const v = validateEmotionWave(peaky.wave.slice(Math.max(0, i - 3), i), peaky.wave[i]);
  if (!v.pass) peakCheck.push(v.failReasons);
}
if (peakCheck.length) {
  console.error('FAIL wave still has peak streak after correction', peaky.wave, peakCheck);
  process.exit(1);
}

const curve = buildReaderEmotionCurve({
  characterEmotionCurve: { emotionStart: '疑惑', emotionEnd: '恐惧' },
  plan: { newInformation: '门后有杀手', goal: '他以为只是开会' },
  situation: { characterState: { before: '还不知道危险' } },
  conflict: { risk: '暗杀', opposition: '监视者已知入侵', cost: '失去妹妹' },
  hookOutput: {},
  scene: { index: 2 },
  beatCount: 6,
});

if (!curve.emotionWave?.sequence?.length || !curve.informationGap) {
  console.error('FAIL curve missing wave/gap', curve);
  process.exit(1);
}
if (!curve.dramaticIrony) {
  console.error('FAIL expected dramatic irony', curve);
  process.exit(1);
}
const same = curve.informationGap.readerKnows.join('|') === curve.informationGap.heroKnows.join('|')
  && curve.informationGap.heroKnows.join('|') === curve.informationGap.enemyKnows.join('|')
  && curve.informationGap.readerKnows.length > 0;
if (same) {
  console.error('FAIL informationGap collapsed to identical sets', curve.informationGap);
  process.exit(1);
}

const badFlat = validateReaderEmotionWave({
  readerEmotionStart: '好奇',
  readerEmotionMiddle: '好奇',
  readerEmotionPeak: '好奇',
  readerEmotionEnd: '好奇',
}, { priorBeatEmotions: ['Curiosity'] });
if (badFlat.pass) {
  console.error('FAIL flat curve should fail', badFlat);
  process.exit(1);
}

if (mapZhToWave('紧张') !== 'Tension' || EMOTION_WAVE[0] !== 'Curiosity') {
  console.error('FAIL mapping');
  process.exit(1);
}

console.log('OK reader-emotion module-3', {
  wave: curve.emotionWave.sequence.join('→'),
  start: curve.readerEmotionStart,
  gapReader: curve.informationGap.readerKnows[0]?.slice(0, 20),
});
