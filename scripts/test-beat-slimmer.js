#!/usr/bin/env node
/**
 * Beat Slimmer 冒烟 — 默认 Beat、严格 Scene 例外、Prompt 硬上限、续写末句、V2 降配路径
 */
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const toUrl = (p) => pathToFileURL(p).href;
let n = 0;
function ok(label) {
  n += 1;
  console.log(`✓ ${label}`);
}

const {
  resolveWriterMode,
  resolveWriterModeForScene,
  BEAT_HARD_RULES,
  BEAT_SAMPLE_MAX_CHARS,
  BEAT_LORE_MAX_CHARS,
  BEAT_PROMPT_CHAR_BUDGET,
  BEAT_MAP_MAX_LINES,
  buildSlimBeatSystem,
  compileSlimBeatUserPrompt,
  formatStoryMapWriterBrief,
  slimLoreForBeat,
  takeContinuationTail,
  buildTransitionHint,
  validateStateChange,
  clipChars,
} = await import(
  toUrl(path.join(root, 'packages/inkos-studio-server/src/writer-optimization/beat-slimmer.js'))
);

const {
  compileSingleBeatPrompt,
  writeBeatWithRuntimeV2,
  takeLastTwoSentences,
} = await import(
  toUrl(path.join(root, 'packages/inkos-studio-server/src/writer-optimization/beat-execution.js'))
);

const { resolveWriterMode: resolveModeFromSample } = await import(
  toUrl(path.join(root, 'packages/inkos-studio-server/src/writer-optimization/sample-driven-writer.js'))
);

{
  assert.equal(resolveWriterMode(), 'beat');
  assert.equal(resolveModeFromSample(), 'beat');
  ok('default INKOS_WRITER_MODE = beat');
}

{
  const d = resolveWriterModeForScene({
    scene: { sceneType: 'action', wordTarget: 1200 },
    executionPlan: { sceneType: 'action', wordTarget: 1200 },
  });
  assert.equal(d.mode, 'beat');
  assert.equal(d.reason, 'default_beat');
  ok('action / long scene stays beat');
}

{
  const emotionalLong = resolveWriterModeForScene({
    scene: { sceneType: 'emotional', wordTarget: 1200, uninterruptedEmotionFlow: true },
    executionPlan: { sceneType: 'emotional', wordTarget: 1200 },
  });
  assert.equal(emotionalLong.mode, 'beat', 'long emotional must stay beat');
  ok('emotional >800 stays beat even with flow flag');
}

{
  const noFlow = resolveWriterModeForScene({
    scene: { sceneType: 'dialogue', wordTarget: 600 },
    executionPlan: { sceneType: 'dialogue', wordTarget: 600 },
  });
  assert.equal(noFlow.mode, 'beat');
  ok('short dialogue without uninterruptedEmotionFlow stays beat');
}

{
  const okScene = resolveWriterModeForScene({
    scene: { sceneType: 'emotional', wordTarget: 500, uninterruptedEmotionFlow: true },
    executionPlan: { sceneType: 'emotional', wordTarget: 500 },
  });
  assert.equal(okScene.mode, 'scene');
  assert.match(okScene.reason, /short_emotional/);
  ok('Scene exception: short emotional + uninterruptedEmotionFlow');
}

{
  const forced = resolveWriterModeForScene({
    scene: { forceSceneWrite: true, wordTarget: 2000 },
    executionPlan: { sceneType: 'action' },
  });
  assert.equal(forced.mode, 'scene');
  assert.equal(forced.reason, 'explicit_forceScene');
  ok('Scene exception: explicit forceSceneWrite');
}

{
  assert.ok(BEAT_HARD_RULES.length <= 5);
  assert.ok(BEAT_SAMPLE_MAX_CHARS <= 400);
  assert.ok(BEAT_LORE_MAX_CHARS <= 300);
  assert.ok(BEAT_MAP_MAX_LINES <= 10);
  assert.ok(BEAT_PROMPT_CHAR_BUDGET <= 1500);
  const sys = buildSlimBeatSystem('雨砸在滑轨上。他没停。推车轮子卡进裂缝，尸体晃了一下。');
  assert.ok(sys.length < 900, `system too long: ${sys.length}`);
  assert.match(sys, /风格样本/);
  assert.match(sys, /Before≠After/);
  const banHits = (sys.match(/禁止/g) || []).length;
  assert.ok(banHits <= 2, `too many 禁止 in system: ${banHits}`);
  assert.doesNotMatch(sys, /深吸一口气|心跳加速|心中一紧/);
  ok('System ≤5 rules, sample clipped, low-frequency bans absent');
}

{
  const fatSample = '甲'.repeat(800);
  const sys = buildSlimBeatSystem(fatSample);
  assert.ok(!sys.includes('甲'.repeat(401)));
  assert.ok(clipChars(fatSample, BEAT_SAMPLE_MAX_CHARS).length <= BEAT_SAMPLE_MAX_CHARS);
  ok('golden sample hard-capped at 400');
}

{
  const brief = formatStoryMapWriterBrief({
    volumeName: '卷一',
    arcPhase: '上升',
    chapterFunction: '推进',
    distanceToMilestone: 3,
    nextMilestone: '发现伊甸真相',
    pov: '苏晚',
    whyThisPov: '她异常行为需偷跑',
    activeThreads: [{ threadName: '伊甸', thisChapterEvent: '空白短信预埋' }],
    milestoneMustHave: ['完整 must_have 长文不应进入 Writer', '第二条'],
    upcomingHiddenReveals: [{ event: '真身揭露', ch: 40 }],
    emotionalCurve: '不安→怀疑',
  });
  const lines = brief.split('\n').filter((l) => l.trim());
  assert.ok(lines.length <= BEAT_MAP_MAX_LINES + 1);
  assert.match(brief, /作者笔记（导航）/);
  assert.match(brief, /距里程碑/);
  assert.doesNotMatch(brief, /完整 must_have/);
  ok('Story Map Writer brief ≤10 lines, no raw must_have');
}

{
  const lore = [
    '## 角色·林异',
    '清运工，手套磨破。',
    '## 角色·苏晚',
    '异常行为，空白短信。',
    '## 世界观长设定',
    '甲'.repeat(500),
  ].join('\n');
  const slim = slimLoreForBeat(lore, { label: '对峙', content: '苏晚收到空白短信', characters: ['苏晚'] });
  assert.ok(slim.length <= BEAT_LORE_MAX_CHARS);
  assert.match(slim, /苏晚/);
  assert.doesNotMatch(slim, /甲{50}/);
  ok('slimLoreForBeat ≤300, keyword-filtered');
}

{
  // 末句够长 → 只取 1 句；过短则补到 2 句
  const longTail = '雨停了。他把手套丢进焚化口，火星溅了一地。';
  assert.equal(takeContinuationTail(longTail, { preferOne: true }), '他把手套丢进焚化口，火星溅了一地。');
  const shortTail = '雨停了。推车空了。';
  assert.equal(takeContinuationTail(shortTail, { preferOne: true }), '雨停了。推车空了。');
  assert.equal(takeLastTwoSentences(longTail), '他把手套丢进焚化口，火星溅了一地。');
  const hint = buildTransitionHint(
    { afterState: '手套已丢', label: '清理' },
    { beforeState: '面对调度', label: '对峙' },
  );
  assert.match(hint, /手套已丢/);
  assert.match(hint, /面对调度/);
  ok('continuation = last sentence + transitionHint');
}

{
  const beats = [
    { order: 1, label: 'Goal', beforeState: '未知', afterState: '有目标', content: '发现备忘录', wordBudget: 200 },
    { order: 2, label: 'Conflict', beforeState: '有目标', afterState: '受阻', content: '门锁内侧抓痕', wordBudget: 180 },
  ];
  const user = compileSlimBeatUserPrompt({
    beat: beats[1],
    executionPlan: { beats, sceneIndex: 1, scenePlan: { goal: '确认循环' }, pov: '苏晚' },
    intent: {
      mainGoal: '确认循环',
      storyMap: {
        chapterFunction: '推进',
        distanceToMilestone: 3,
        nextMilestone: '伊甸真相',
        pov: '苏晚',
      },
    },
    accumulatedText: '苏晚盯着手机。雨从后颈流进衣领。',
    basePrompt: '## 角色·苏晚\n异常。\n## 长设定\n' + '乙'.repeat(400),
    prevBeat: beats[0],
  });
  assert.ok(user.length <= BEAT_PROMPT_CHAR_BUDGET, `user prompt ${user.length} > ${BEAT_PROMPT_CHAR_BUDGET}`);
  assert.match(user, /当前 Beat 2/);
  assert.match(user, /Before：/);
  assert.match(user, /After：/);
  assert.match(user, /紧接续写/);
  assert.match(user, /衔接：/);
  assert.doesNotMatch(user, /乙{50}/);
  ok('compileSlimBeatUserPrompt within char budget');
}

{
  const viaExec = compileSingleBeatPrompt({
    beat: { order: 1, label: 'Goal（主角目标）', beforeState: 'A', afterState: 'B', content: '去天台', wordBudget: 160 },
    executionPlan: { beats: [{ order: 1, label: 'Goal（主角目标）' }], sceneIndex: 1 },
    basePrompt: '设定',
    accumulatedText: '',
  });
  assert.match(viaExec, /Beat 1/);
  assert.match(viaExec, /Goal/);
  ok('compileSingleBeatPrompt delegates to Slimmer');
}

{
  const pass = validateStateChange({
    text: '他把门踹开。门外站着苏晚，手里捏着一张空白短信，纸角还在滴水。她没有说话，只是把短信翻过来给他看。',
    beforeState: '门关着',
    afterState: '见到苏晚',
  });
  assert.equal(pass.pass, true);
  const fail = validateStateChange({
    text: '他意识到自己很害怕。',
    beforeState: '平静',
    afterState: '恐惧',
  });
  assert.equal(fail.pass, false);
  ok('validateStateChange shared gate (Beat/Scene)');
}

{
  let calls = 0;
  const badThenOk = async ({ beat }) => {
    calls += 1;
    if (calls <= 2) {
      return '他意识到事情不对。深吸一口气。';
    }
    // 降配后仍给贴标签，逼出 needsHumanReview；或给合格文
    if (beat?._degraded) {
      return '他意识到还是不行。';
    }
    return '他把门踹开，短信掉在地上。';
  };

  const beat = {
    order: 1,
    label: 'Hook',
    beforeState: '门外无人',
    afterState: '局面撕裂',
    content: '踹门见人',
    wordBudget: 200,
    beatPlan: { beforeState: '门外无人', afterState: '局面撕裂' },
  };
  const result = await writeBeatWithRuntimeV2({
    beat,
    executionPlan: { beats: [beat], sceneType: 'action', climaxRole: 'build', sceneRhythm: 'rising' },
    basePrompt: '',
    llmFn: badThenOk,
    maxRewrites: 2,
  });
  assert.ok(calls >= 3, `expected degrade retry, calls=${calls}`);
  assert.equal(result.needsHumanReview, true);
  assert.equal(result.degraded, true);
  ok('V2 hard gate: rewrite → degrade → needsHumanReview');
}

{
  let calls = 0;
  const alwaysGood = async () => {
    calls += 1;
    return '雨砸在锁孔上。苏晚拧开门，备忘录掉出来，笔迹像她自己的。她没有捡。';
  };
  const beat = {
    order: 1,
    label: 'Goal',
    beforeState: '门外',
    afterState: '看见备忘录',
    content: '开门发现备忘录',
    wordBudget: 160,
    beatPlan: { beforeState: '门外', afterState: '看见备忘录' },
  };
  const result = await writeBeatWithRuntimeV2({
    beat,
    executionPlan: { beats: [beat], sceneType: 'opening' },
    basePrompt: '',
    llmFn: alwaysGood,
    maxRewrites: 2,
  });
  assert.equal(calls, 1);
  assert.equal(result.needsHumanReview, false);
  assert.equal(result.validation?.pass, true);
  ok('V2 pass on first write');
}

console.log(`\nAll ${n} checks passed.`);
