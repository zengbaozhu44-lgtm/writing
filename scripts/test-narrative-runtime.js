/**
 * Narrative Runtime 模块 1（Review 修正）冒烟
 */
import {
  createNarrativeState,
  createReaderState,
  computeMomentumDelta,
  evaluateStoryMomentum,
  applyNarrativeBeat,
  validateEmotionWave,
  validateEmotionWaveAgainstPlan,
  validateInformationGapRealization,
  assertInformationGapMeaningful,
  directorHintsFromReaderState,
  MOMENTUM_PASS_SCORE,
  EMOTION_WAVE,
} from '../packages/inkos-director/src/narrative-runtime.js';

const before = createNarrativeState({
  readerState: createReaderState({ curiosity: 50, expectation: 50 }),
  emotionWaveIndex: 0,
});

// 禁止 StoryState 字段进入 NarrativeState
if ('worldState' in before || 'dangerLevel' in before || 'protagonistState' in before) {
  console.error('FAIL NarrativeState must not carry StoryState fields', before);
  process.exit(1);
}

const zero = evaluateStoryMomentum({
  text: '机房很安静。灯管闪了一下。空气有点冷。',
  beat: { structuralBeat: 'goal' },
});
if (zero.pass || !zero.zero || zero.score !== 0) {
  console.error('FAIL expected zero momentum', zero);
  process.exit(1);
}
if (!zero.rewriteHint.includes('Zero Momentum')) {
  console.error('FAIL rewrite hint', zero.rewriteHint);
  process.exit(1);
}

const richText = '林夜踹开门，警报炸响。他用左手抵住门轴，右手被划开一道血口，却仍按下权限键。苏晚在耳机里改口：「我信你一次。」名单上第三个名字变成红色。';
const delta = computeMomentumDelta({
  text: richText,
  beat: { structuralBeat: 'consequence', beforeState: '门外', afterState: '门开权限已用' },
});
if (!delta.pass || delta.score < MOMENTUM_PASS_SCORE) {
  console.error('FAIL expected weighted pass', delta);
  process.exit(1);
}
// Delta 形状收敛
for (const k of ['stateChanged', 'relationshipChanged', 'choiceMade', 'costPaid']) {
  if (typeof delta[k] !== 'boolean') {
    console.error('FAIL delta shape', delta);
    process.exit(1);
  }
}
if ('worldChanged' in delta || 'dangerChanged' in delta || 'protagonistChanged' in delta) {
  console.error('FAIL delta must not include removed fields', delta);
  process.exit(1);
}

const ok = evaluateStoryMomentum({ text: richText, beat: { afterState: '门已开', beforeState: '门外' } });
if (!ok.pass) {
  console.error('FAIL expected pass', ok);
  process.exit(1);
}

const step = applyNarrativeBeat({
  narrativeState: before,
  text: richText,
  beat: {
    structuralBeat: 'choice',
    targetEmotion: 'Tension',
    order: 1,
    informationGap: {
      readerKnows: ['门后有杀手'],
      heroKnows: [],
      enemyKnows: ['入侵已开始'],
    },
  },
  executionPlan: { informationGap: { readerKnows: ['门后有杀手'], heroKnows: [], enemyKnows: ['入侵已开始'] } },
});
if (!step.pass || !step.after?.readerState || step.after.updatedAtBeat == null) {
  console.error('FAIL applyNarrativeBeat', step);
  process.exit(1);
}
if (step.after.worldState || step.after.dangerLevel) {
  console.error('FAIL after must stay slim', step.after);
  process.exit(1);
}

const hints = directorHintsFromReaderState(createReaderState({ fatigue: 70, expectation: 30 }));
if (!hints.increaseAction || !hints.payoffPromiseEarly) {
  console.error('FAIL reader→director hints', hints);
  process.exit(1);
}

const waveFail = validateEmotionWave(['Tension', 'Pressure'], 'Shock');
if (waveFail.pass) {
  console.error('FAIL peak streak', waveFail);
  process.exit(1);
}

const planWave = validateEmotionWaveAgainstPlan({
  plannedEmotion: 'Curiosity',
  observedEmotion: 'Shock',
});
if (planWave.pass) {
  console.error('FAIL severe wave deviation should fail', planWave);
  process.exit(1);
}

const gapBad = assertInformationGapMeaningful({
  readerKnows: ['名单'], heroKnows: ['名单'], enemyKnows: ['名单'],
});
if (gapBad.pass) {
  console.error('FAIL same knowledge');
  process.exit(1);
}

const gapReal = validateInformationGapRealization(
  { readerKnows: ['名单'], heroKnows: [], enemyKnows: ['监控'] },
  '屏幕上的名单变成红色',
);
if (!gapReal.pass) {
  console.error('FAIL gap realization', gapReal);
  process.exit(1);
}

if (EMOTION_WAVE.length !== 6) {
  console.error('FAIL wave length');
  process.exit(1);
}

console.log('OK narrative-runtime module-1-review', {
  score: delta.score,
  passScore: MOMENTUM_PASS_SCORE,
  slim: true,
  readerCuriosity: step.after.readerState.curiosity,
});
