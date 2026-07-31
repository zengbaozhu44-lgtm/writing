/**
 * 跨 Beat 连续性：状态摘要 / 身体闸 / reveal 闸 / Scene goal 瘦身
 */
import {
  createContinuityState,
  mergeContinuityState,
  validateCrossBeatConsistency,
  formatBeatContinuitySummary,
  slimSceneGoalLine,
} from '../packages/inkos-studio-server/src/writer-optimization/beat-continuity.js';
import { compileSlimBeatUserPrompt } from '../packages/inkos-studio-server/src/writer-optimization/beat-slimmer.js';
import { planChapter } from '../packages/inkos-brain/src/planner/planner.js';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

let st = createContinuityState();
st = mergeContinuityState(st, '机械左臂卡在承重柱，液压油混着血淌。');
assert(st.leftArm === 'damaged' || st.leftArm === 'disabled' || st.leftArm === 'severed', `leftArm=${st.leftArm}`);
st = mergeContinuityState(st, '他的左臂从肘部以下完全没了，断口渗着冷却液。');
assert(st.leftArm === 'severed', `should upgrade to severed, got ${st.leftArm}`);
st = mergeContinuityState(st, '完好的左臂挥剑砍向敌人');
assert(st.leftArm === 'severed', 'damage must not regress');

const badArm = validateCrossBeatConsistency(
  '林砚左臂挥出一记重拳，抓住栏杆。',
  createContinuityState({ leftArm: 'severed', location: '焚化区', revealed: ['gm_auth'] }),
);
assert(!badArm.pass, 'severed arm action must fail');

const badReveal = validateCrossBeatConsistency(
  '眼前第一次浮现【GM权限】，他从未见过这样的系统。',
  createContinuityState({ revealed: ['gm_auth'], location: '焚化区' }),
);
assert(!badReveal.pass, 'repeat first-reveal must fail');

const badLoc = validateCrossBeatConsistency(
  '观测塔上，林砚趴着看青穹舰队。',
  createContinuityState({ location: '焚化区' }),
);
assert(!badLoc.pass, 'location jump without bridge must fail');

const okLoc = validateCrossBeatConsistency(
  '他顺着裂缝爬向观测塔，趴着看青穹舰队。',
  createContinuityState({ location: '焚化区' }),
);
assert(okLoc.pass, `bridged transition should pass: ${okLoc.issues.join(';')}`);

const summary = formatBeatContinuitySummary(
  createContinuityState({
    leftArm: 'severed',
    location: '焚化区',
    revealed: ['gm_auth'],
    threat: '青穹重工军事压力',
    lastAfterState: '门合拢，他滑坐在地',
  }),
  { lastAfterState: '门合拢，他滑坐在地' },
);
assert(/身体/.test(summary) && /已揭示/.test(summary) && /GM/.test(summary), summary);

const prompt = compileSlimBeatUserPrompt({
  beat: {
    order: 2,
    label: '阻碍',
    libraryBeat: 'Obstacle',
    beforeState: '受伤',
    afterState: '更糟',
    content: '推进',
    wordBudget: 180,
  },
  executionPlan: {
    beats: [
      { order: 1, label: '目标' },
      { order: 2, label: '阻碍' },
      { order: 3, label: '抉择' },
    ],
    scenePlan: { goal: '克服阻碍：焚化区门锁死' },
  },
  intent: {
    mainGoal: '林砚在浮空城陷落、神魂破碎的濒死绝境中，觉醒【世界管理员GM权限】，窥见世界为高维测试服务器的真相，并回溯时间重生',
  },
  scene: { index: 1, goal: '克服阻碍：焚化区门锁死' },
  continuityState: createContinuityState({
    leftArm: 'severed',
    location: '焚化区',
    revealed: ['gm_auth'],
  }),
  accumulatedText: '液压油混着血往下淌。',
});
assert(/已完成状态摘要/.test(prompt), 'prompt must include continuity summary');
assert(!/觉醒【世界管理员GM权限】，窥见世界/.test(prompt), 'prompt must not dump full chapter pitch');
assert(/接着上文|不要重新开场|紧接上文/.test(prompt), prompt.slice(-120));
assert(/紧接续写/.test(prompt), 'must keep continuation tail');

// 动作链重演闸
const replay = validateCrossBeatConsistency(
  '掌心触到的那截冰凉东西，比义体残片重得多。林砚的指腹压进去。',
  createContinuityState({
    location: '焚化区',
    doneActions: ['hand_touch'],
  }),
  { beatOrder: 2 },
);
assert(!replay.pass, `action replay must fail: ${replay.issues.join(';')}`);

const anti = validateCrossBeatConsistency(
  '地面在动——不是震颤，是呼吸。温度渗进来——不是烫，是幻痛。',
  createContinuityState({ location: '焚化区', doneActions: ['kneel_ash'] }),
  { beatOrder: 2 },
);
assert(!anti.pass, `antithesis spam must fail: ${anti.issues.join(';')}`);

const st2 = mergeContinuityState(
  createContinuityState({ location: '焚化区' }),
  '他伸手去推，掌心碰到一截冰凉的东西，随后猛地抽回手。',
);
assert(st2.doneActions.includes('hand_touch'), `doneActions=${st2.doneActions}`);
assert(st2.doneActions.includes('hand_withdraw'), `doneActions=${st2.doneActions}`);
assert(/已发生动作/.test(formatBeatContinuitySummary(st2)), 'summary must list done actions');

// 事件循环：已有界面再「发现」
const stUi = mergeContinuityState(
  createContinuityState({ location: '浮空城坠落区' }),
  '掌心向上——那团数据流正悬在焦烂的皮肉上方三寸，像一颗被剥了壳的活心脏。',
);
assert(stUi.activeInterfaces.some((x) => x.id === 'data_orb'), `ifaces=${JSON.stringify(stUi.activeInterfaces)}`);
assert(['discovered', 'operating'].includes(stUi.eventPhase), `phase=${stUi.eventPhase}`);

const eventLoop = validateCrossBeatConsistency(
  '他抬起右手，焦毁的指尖悬在光团上方。视野边缘跳出一行字：权限层级：测试员。',
  stUi,
  { beatOrder: 5 },
);
assert(!eventLoop.pass, `event loop must fail: ${eventLoop.issues.join(';')}`);
assert(eventLoop.issues.some((x) => /EVENT_LOOP/.test(x)), eventLoop.issues.join(';'));

const eventAdvance = validateCrossBeatConsistency(
  '他把光团摁进骨髓腔。「锁定我。」权限降级的提示跳出，他承受代价，右臂神经烧断。',
  { ...stUi, eventPhase: 'operating' },
  { beatOrder: 3 },
);
assert(eventAdvance.pass, `operate/choose should pass: ${eventAdvance.issues.join(';')}`);

const promptUi = compileSlimBeatUserPrompt({
  beat: {
    order: 3,
    structuralBeat: 'choice',
    label: '抉择',
    libraryBeat: 'Discovery',
    libraryInstruction: 'Discovery：揭示未知细节/线索',
    beforeState: '已持有光团',
    afterState: '做出选择',
    content: '选择',
    wordBudget: 180,
  },
  executionPlan: {
    beats: [
      { order: 1, label: '目标' },
      { order: 2, label: '阻碍' },
      { order: 3, label: '抉择' },
    ],
    scenePlan: { goal: '激活权限' },
  },
  scene: { index: 4, goal: '激活权限' },
  continuityState: stUi,
  accumulatedText: '那团数据流悬在掌心。他盯着它。',
});
assert(/事件相位|活跃界面|禁止再「发现|选择→代价/.test(promptUi), promptUi.slice(0, 400));
assert(/已发现的界面|做出有代价的选择|读出新约束/.test(promptUi), 'Discovery must be remapped');

const prompt2 = compileSlimBeatUserPrompt({
  beat: {
    order: 2,
    label: '阻碍',
    libraryBeat: 'Obstacle',
    beforeState: '已触碰',
    afterState: '发现尸体',
    content: '推进',
    wordBudget: 180,
  },
  executionPlan: {
    beats: [
      { order: 1, label: '目标' },
      { order: 2, label: '阻碍' },
      { order: 3, label: '抉择' },
    ],
    scenePlan: { goal: '克服阻碍：焚化区门锁死' },
  },
  intent: {
    mainGoal: '林砚在浮空城陷落、神魂破碎的濒死绝境中，觉醒【世界管理员GM权限】，窥见世界为高维测试服务器的真相，并回溯时间重生',
  },
  scene: { index: 1, goal: '克服阻碍：焚化区门锁死' },
  continuityState: st2,
  accumulatedText: '传送带卡了。掌心碰到一截冰凉的东西。是手指。他猛地抽回手。',
});
assert(/已发生动作/.test(prompt2), 'beat2 prompt must warn done actions');
assert(/紧接续写/.test(prompt2) && /抽回手/.test(prompt2), 'must keep multi-sentence tail');
assert(!/章目标/.test(prompt2), 'beat2+ must not re-inject chapter pitch');
assert(/禁止「不是A是B」|禁止「不是A，是B」/.test(prompt2) || /不是A是B/.test(prompt2), prompt2.slice(-100));

const tmpBook = fs.mkdtempSync(path.join(os.tmpdir(), 'inkos-cont-'));
fs.mkdirSync(path.join(tmpBook, 'novel', '_system', 'brain'), { recursive: true });

const intent = planChapter({
  chapter: 1,
  chapterTask: {
    目标: '林砚在浮空城陷落、神魂破碎的濒死绝境中，觉醒【世界管理员GM权限】，窥见世界为高维测试服务器的真相，并回溯时间重生至三年前邪神入侵与财团叛变的关键节点',
    第一阻碍: '濒死与围攻',
    第二阻碍: '信息不完整',
    高潮: '权限激活',
    结尾: '重生倒计时',
  },
  state: {},
  volume: { goals: [], sceneSeeds: [] },
  facts: [],
  pov: '林砚',
  present: ['林砚'],
  bookDir: tmpBook,
}, 1, { weights: {} });

for (const s of intent.scenes) {
  assert(!/高维测试服务器/.test(s.goal || ''), `scene ${s.index} goal still fat: ${s.goal}`);
  assert((s.goal || '').length < 80, `scene ${s.index} goal too long: ${s.goal}`);
  assert(s.spatialAnchor?.location, `scene ${s.index} missing spatialAnchor`);
  if (s.index > 1) {
    assert(s.revealPolicy?.advanceOnly === true, `scene ${s.index} should advanceOnly`);
  }
}
assert(slimSceneGoalLine('建立 POV（林砚）当下目标：林砚在浮空城陷落、神魂破碎').length < 50, 'slim goal');

fs.rmSync(tmpBook, { recursive: true, force: true });
console.log('OK test-beat-continuity');
console.log('scenes:', intent.scenes.map((s) => `${s.index}:${s.goal}`).join(' | '));
