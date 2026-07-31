/**
 * Beat Execution 单元验证 — 五 Beat 顺序 + Library + Hook Ladder + SFC
 */
import {
  buildSceneExecutionPlan,
  buildBeatExecutionPromptBlock,
  assignLibraryBeats,
  buildHookLadder,
  runSceneDirector,
  runChapterDirector,
} from '../packages/inkos-director/src/index.js';
import {
  resolveExecutionPlan,
  compileSingleBeatPrompt,
} from '../packages/inkos-studio-server/src/writer-optimization/beat-execution.js';
import { compileStudioWriterPrompt } from '../packages/inkos-studio-server/src/writer-optimization/compile-writer-prompt.js';

const scene = {
  index: 2,
  id: 'ch1_s2',
  goal: '在维修与取药之间做出选择',
  obstacle: '系统拒绝跨区处方',
  escalation: '信用档案亮黄灯',
  newInformation: '配送网存在未加密阴谋日志',
  cliffhanger: '上报还是假装没看见？',
};

const intent = {
  pov: '林晓',
  mainGoal: scene.goal,
  sceneCount: 4,
  scenes: [{ index: 1 }, scene],
};

const chapterDir = runChapterDirector({ intent, chapter: 1 });
const sceneDir = runSceneDirector({ scene, intent, chapterDir });

if (!chapterDir.hookLadder?.length) {
  console.error('FAIL: hook ladder missing');
  process.exit(1);
}
if (!chapterDir.brief.includes('Hook Ladder')) {
  console.error('FAIL: chapter brief hook ladder');
  process.exit(1);
}

const plan = sceneDir.executionPlan;
if (!plan?.beats || plan.beats.length !== 6) {
  console.error('FAIL: expected 6 structural beats', plan);
  process.exit(1);
}
if (plan.libraryBeatCount < 3) {
  console.error('FAIL: need >=3 library beat types', plan.libraryTypesUsed);
  process.exit(1);
}
if (!plan.sceneOutcome?.success || !plan.sceneOutcome?.failure || !plan.sceneOutcome?.consequence) {
  console.error('FAIL: scene outcome SFC missing', plan.sceneOutcome);
  process.exit(1);
}

for (let i = 1; i < plan.beats.length; i += 1) {
  if (plan.beats[i].libraryBeat === plan.beats[i - 1].libraryBeat) {
    console.error('FAIL: consecutive same library beat', plan.beats[i - 1].libraryBeat);
    process.exit(1);
  }
}

const hookBeat = plan.beats.find((b) => b.structuralBeat === 'hook');
if (!hookBeat?.hookLadder || hookBeat.hookLadder.level < 2) {
  console.error('FAIL: scene2 hook should be Danger+', hookBeat?.hookLadder);
  process.exit(1);
}
if (!hookBeat.hookOutput?.type) {
  console.error('FAIL: hook beat missing hookOutput');
  process.exit(1);
}
if (!plan.reward || !(plan.reward.type || plan.reward.deliveryBeat || plan.reward.requiresPromise)) {
  console.error('FAIL: execution plan missing reward', plan.reward);
  process.exit(1);
}

const ladder = buildHookLadder(5);
for (let i = 1; i < ladder.length; i += 1) {
  if (ladder[i].level <= ladder[i - 1].level) {
    console.error('FAIL: hook ladder not ascending', ladder);
    process.exit(1);
  }
  if (!ladder[i].type || !ladder[i].hookOutput) {
    console.error('FAIL: hook ladder missing cognitive stage', ladder[i]);
    process.exit(1);
  }
}

const block = buildBeatExecutionPromptBlock(plan);
if (!block.includes('Success / Failure / Consequence') || !block.includes('Goal')) {
  console.error('FAIL: beat prompt block');
  process.exit(1);
}

const resolved = resolveExecutionPlan({ ...scene, executionPlan: plan }, intent, chapterDir);
if (resolved.beats.length !== 6) {
  console.error('FAIL: resolveExecutionPlan');
  process.exit(1);
}

const single = compileSingleBeatPrompt({
  beat: plan.beats[0],
  executionPlan: plan,
  basePrompt: 'base',
  accumulatedText: '',
  sceneIndex: 2,
  totalBeats: 6,
});
if (!single.includes('Beat 1/6') || !single.includes('Goal（主角目标）')) {
  console.error('FAIL: single beat prompt should target beat 1 Goal');
  process.exit(1);
}
if (single.includes('只写 **Obstacle')) {
  console.error('FAIL: single beat prompt leaked obstacle instruction as current task');
  process.exit(1);
}

const compiled = compileStudioWriterPrompt({
  basePrompt: '### base',
  scene: { ...scene, executionPlan: plan },
  chapter: 1,
  intent,
  ctx: {},
  chapterDir,
});
// Beat 细节改由 Slimmer 按段注入；密封 prompt 只保留 meta.executionPlan
if (!compiled.meta.executionPlan?.beats?.length) {
  console.error('FAIL: meta executionPlan');
  process.exit(1);
}
if (compiled.meta.executionPlan.beats.length !== 6) {
  console.error('FAIL: meta executionPlan beat count', compiled.meta.executionPlan.beats.length);
  process.exit(1);
}

const lib = assignLibraryBeats(3, { prevLastType: 'Danger' });
const types = new Set(Object.values(lib));
if (types.size < 3) {
  console.error('FAIL: assignLibraryBeats variety', lib);
  process.exit(1);
}

console.log('beats', plan.beats.map((b) => `${b.structuralBeat}:${b.libraryBeat}`).join(' '));
console.log('hook', hookBeat.hookLadder.type);
console.log('reward', plan.reward.type || (plan.reward.requiresPromise ? 'requiresPromise' : plan.reward.deliveryBeat));
console.log('OK');
