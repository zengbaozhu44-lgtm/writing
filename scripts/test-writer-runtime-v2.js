/**
 * Writer Runtime V2 — Story State · Cause-Effect · Micro Scene · Live Monitor
 */
import {
  evaluateStoryStateChange,
  evaluateCauseEffect,
  evaluateMicroScene,
  evaluateLiveMonitor,
  validateWriterRuntimeV2,
  createWriterRuntimeSession,
  applyBeatToRuntimeSession,
  formatWriterRuntimeV2PromptBlock,
  WRITER_RUNTIME_V2_POLICY,
  buildSceneExecutionPlan,
  buildChapterDirectorBrief,
} from '../packages/inkos-director/src/index.js';
import {
  compileSingleBeatPrompt,
  writeBeatWithRuntimeV2,
  executeBeatSequence,
} from '../packages/inkos-studio-server/src/writer-optimization/beat-execution.js';

// --- unit: bad AI text should fail ---
const badText = [
  '林夜深吸一口气。',
  '林夜心跳加速。',
  '林夜意识到时间窗口正在收窄。',
  '他知道这一切将改变一切。',
  '门自己开了。',
  '他继续调查，发现异常，继续调查。',
].join('');

const badBeat = {
  order: 1,
  structuralBeat: 'goal',
  label: 'Goal',
  beforeState: '妹妹安全',
  afterState: '妹妹安全',
  content: '调查异常',
};

const story = evaluateStoryStateChange({ text: badText, beat: badBeat, beforeState: '妹妹安全' });
if (story.pass && !story.stagnant) {
  // may fail stagnant or unchanged
}
if (!story.stagnant && story.before === story.after) {
  console.error('FAIL: expected stagnant or unchanged', story);
  process.exit(1);
}

const live = evaluateLiveMonitor({ text: badText, recentParagraphs: [], accumulatedText: '' });
if (live.pass) {
  console.error('FAIL: live monitor should reject AI phrases', live);
  process.exit(1);
}

const microBad = evaluateMicroScene({ text: '门打开了。', beat: badBeat });
if (microBad.pass) {
  console.error('FAIL: bare door open should fail micro scene', microBad);
  process.exit(1);
}

// --- unit: good text should pass ---
const goodText = [
  '他按下确认。权限栏变红。',
  '「名单上有第二个人。」林薇的声音很轻。',
  '门外电子锁咬死，倒计时跳到二十九。',
  '他塞进口袋那张半烧的照片——昨天本该不存在。',
].join('');

const goodBeat = {
  order: 2,
  structuralBeat: 'newInformation',
  label: 'New Information',
  beforeState: '不知道名单',
  afterState: '知道名单有第二个人',
  content: '读取名单',
  isRewardBeat: true,
  consequence: '系统锁门',
};

const goodStory = evaluateStoryStateChange({
  text: goodText,
  beat: goodBeat,
  beforeState: '不知道名单',
});
if (!goodStory.pass) {
  console.error('FAIL: good story state', goodStory);
  process.exit(1);
}

const goodCause = evaluateCauseEffect({
  text: goodText,
  beat: goodBeat,
  lastEvent: { effect: '破解权限' },
});
if (!goodCause.pass) {
  console.error('FAIL: good cause-effect', goodCause);
  process.exit(1);
}

const goodMicro = evaluateMicroScene({ text: goodText, beat: goodBeat, executionPlan: { reward: { payoff: '名单' } } });
if (!goodMicro.pass || goodMicro.passed.length < 2) {
  console.error('FAIL: good micro', goodMicro);
  process.exit(1);
}

const goodLive = evaluateLiveMonitor({ text: goodText, recentParagraphs: ['上一场景已结束。'], accumulatedText: '上一场景已结束。' });
if (!goodLive.pass) {
  console.error('FAIL: good live', goodLive);
  process.exit(1);
}

const all = validateWriterRuntimeV2({
  text: goodText,
  beat: goodBeat,
  lastEvent: { effect: '破解权限' },
  beforeState: '不知道名单',
  recentParagraphs: [],
  accumulatedText: '',
  executionPlan: { reward: { payoff: '名单' } },
});
if (!all.pass) {
  console.error('FAIL: validate good', all.failReasons);
  process.exit(1);
}

const allBad = validateWriterRuntimeV2({
  text: badText,
  beat: badBeat,
  beforeState: '妹妹安全',
  recentParagraphs: [],
  accumulatedText: '',
});
if (allBad.pass) {
  console.error('FAIL: validate bad should fail');
  process.exit(1);
}
if (!allBad.rewriteHint.includes('重写')) {
  console.error('FAIL: rewrite hint');
  process.exit(1);
}

// --- prompt wiring ---
const storyDna = { protagonist: '林夜', core_hook: '世界四点重置', genre: '悬疑' };
const plan = {
  goal: '读取名单',
  choice: '明知危险进入系统区域',
  consequence: '系统锁门',
  newInformation: '名单有第二个人',
  cliffhanger: '倒计时二十九秒',
  obstacle: '权限墙',
};
const scene = { index: 1, ...plan, wordTarget: 400 };
const chapterDir = buildChapterDirectorBrief(
  { pov: '林夜', mainGoal: plan.goal, scenes: [scene], sceneCount: 1 },
  1,
  { storyDna },
);
const executionPlan = buildSceneExecutionPlan({
  scene: { ...scene, scenePlan: plan },
  intent: { pov: '林夜', scenes: [scene], sceneCount: 1, _chapterDirector: chapterDir },
  chapter: 1,
  storyDna,
  chapterDir,
});
const session = createWriterRuntimeSession(executionPlan);
const beat = executionPlan.beats[0];
const prompt = compileSingleBeatPrompt({
  beat,
  executionPlan,
  basePrompt: 'base',
  runtimeSession: session,
  totalBeats: executionPlan.beats.length,
});
// Slimmer：V2 改为写后硬闸，不再整包塞进 Prompt；Prompt 只保留 Before≠After
if (!prompt.includes('Before：') || !prompt.includes('After：')) {
  console.error('FAIL: slim prompt missing Before/After', prompt.slice(0, 500));
  process.exit(1);
}
if (!prompt.includes('只写本 Beat') && !prompt.includes('写完立即停止')) {
  console.error('FAIL: slim prompt missing stop rule', prompt.slice(0, 300));
  process.exit(1);
}

// --- rewrite loop with mock llm ---
let calls = 0;
const mockLlm = async ({ userPrompt }) => {
  calls += 1;
  if (
    userPrompt.includes('【重写】')
    || userPrompt.includes('Writer Runtime V2 重写')
    || userPrompt.includes('Writer Craft · P0 重写')
    || userPrompt.includes('【降配')
    || calls > 1
  ) {
    return goodText;
  }
  return badText;
};

const written = await writeBeatWithRuntimeV2({
  beat: { ...goodBeat, ...beat, beforeState: '不知道名单', afterState: '知道名单有第二个人' },
  executionPlan,
  basePrompt: 'base',
  runtimeSession: session,
  llmFn: mockLlm,
  maxRewrites: 2,
});

if (!written.rewritten || written.attempts < 2) {
  console.error('FAIL: should rewrite at least once', written.attemptLogs);
  process.exit(1);
}
if (!written.validation.pass) {
  console.error('FAIL: final should pass', written.validation.failReasons);
  process.exit(1);
}

const nextSession = applyBeatToRuntimeSession(session, {
  text: written.text,
  validation: written.validation,
  beat,
});
if (!nextSession.lastEvent?.effect) {
  console.error('FAIL: lastEvent not updated', nextSession.lastEvent);
  process.exit(1);
}

// full sequence mock — always good after first fail pattern
let seqCalls = 0;
const seqLlm = async () => {
  seqCalls += 1;
  return [
    '他推开门禁。权限报警变红，必须立刻行动。',
    '「谁在名单第二行？」林薇问。倒计时开始，关系被迫摊牌。',
    '他按下诱饵指令。系统清除图标亮起——退路没了。',
    '妹妹的旧照片出现在屏幕，本该昨天烧毁。危险与信息同时落地。',
    '他转身逃跑，新行动已经发生。走廊灯一格格灭。',
    '门外脚步声停住。未完成的行动切断收束，读者必须翻页。',
  ][(seqCalls - 1) % 6];
};

const seq = await executeBeatSequence({
  executionPlan: {
    ...executionPlan,
    beats: executionPlan.beats.map((b, i) => ({
      ...b,
      beforeState: `状态${i}`,
      afterState: `状态${i + 1}`,
    })),
  },
  basePrompt: 'base',
  llmFn: seqLlm,
  maxRewrites: 1,
});

if (!seq.runtimeSession || !seq.text) {
  console.error('FAIL: sequence missing session/text', Boolean(seq.runtimeSession), Boolean(seq.text));
  process.exit(1);
}
if (!seq.parts?.length || !seq.beatArtifacts?.some((a) => a.validation)) {
  console.error('FAIL: sequence missing per-beat V2 validation', seq.parts?.length);
  process.exit(1);
}

console.log('policy', WRITER_RUNTIME_V2_POLICY.core.slice(0, 28));
console.log('bad reasons', allBad.failReasons.slice(0, 3).join(' | '));
console.log('rewrite attempts', written.attempts);
console.log('seq beats', seq.parts.length, 'chars', seq.text.replace(/\s/g, '').length);
console.log('OK: Writer Runtime V2');
