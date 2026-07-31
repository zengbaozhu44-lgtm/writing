#!/usr/bin/env node
/**
 * 冒烟：样本驱动 Writer（默认 Beat；Scene 为例外路径）
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
  DEFAULT_GOLDEN_SAMPLE,
  resolveWriterMode,
  resolveWriterModeForScene,
  resolveSceneWritingProfile,
  buildSampleDrivenSystem,
  formatGoldenSampleBlock,
  buildAuthorNotesBlock,
  buildEmotionAnchorBlock,
  compileSingleScenePrompt,
  slimSealedPromptForScene,
  resolveGoldenSample,
} = await import(toUrl(path.join(root, 'packages/inkos-studio-server/src/writer-optimization/sample-driven-writer.js')));

const { buildPromptRulesBlock } = await import(
  toUrl(path.join(root, 'packages/inkos-studio-server/src/writer-optimization/prompt-rules.js'))
);

{
  assert.equal(resolveWriterMode(), 'beat');
  ok('default writer mode = beat');
}

{
  const d = resolveWriterModeForScene({
    scene: { sceneType: 'emotional', wordTarget: 500, uninterruptedEmotionFlow: true },
    executionPlan: { sceneType: 'emotional', wordTarget: 500 },
  });
  assert.equal(d.mode, 'scene');
  ok('Scene exception only when short + emotion flow');
}

{
  const sys = buildSampleDrivenSystem(DEFAULT_GOLDEN_SAMPLE);
  assert.match(sys, /风格样本/);
  assert.match(sys, /只输出本 Beat 正文|只输出正文/);
  assert.doesNotMatch(sys, /禁止深吸一口气/);
  assert.ok(sys.length < 1200);
  ok('sample-driven system is short + imitation-first');
}

{
  const rules = buildPromptRulesBlock();
  assert.match(rules, /写作要点/);
  assert.doesNotMatch(rules, /硬性约束/);
  const banCount = (rules.match(/禁止/g) || []).length;
  assert.ok(banCount <= 2, `slim rules should have few 禁止, got ${banCount}`);
  ok('prompt rules slimmed (positive-first)');
}

{
  const emotional = resolveSceneWritingProfile('emotional');
  assert.equal(emotional.temp, 0.9);
  assert.ok(emotional.maxLength >= 40);
  const action = resolveSceneWritingProfile('action');
  assert.ok(action.maxLength <= 20);
  ok('sceneType dynamic temp / sentence length');
}

{
  const notes = buildAuthorNotesBlock({
    executionPlan: {
      pov: '苏晚',
      scenePlan: { goal: '上天台确认备忘录', conflict: '备忘录笔迹像自己但不记得' },
      chapterAuthorGoal: {
        mainFeeling: '熟悉的恐惧',
        readerEmotionStart: '不安',
        readerEmotionEnd: '更深的怀疑',
        mustRemember: '门锁内侧的抓痕',
        writerMust: '她不得不去，不是勇敢',
      },
      situation: { location: '天台门', time: '凌晨' },
    },
  });
  assert.match(notes, /本 Scene/);
  assert.match(notes, /苏晚/);
  assert.match(notes, /须记住/);
  assert.doesNotMatch(notes, /建立\s*POV/);
  ok('author notes are navigation + scene emotion');
}

{
  const emo = buildEmotionAnchorBlock({
    priorText: '苏晚盯着手机。雨从后颈流进衣领。她停住，手心全是汗。',
    executionPlan: { emotionCurve: { end: '试探性的同盟' } },
  });
  assert.match(emo, /前文情绪锚定/);
  assert.match(emo, /紧接续写|末句/);
  ok('emotion anchor uses last-sentence continuation');
}

{
  const fat = [
    '## Writer Optimization · 硬性约束',
    '1. 禁止深吸一口气',
    '2. 禁止意识到',
    '## P1 · Narrative Task',
    'Scene 目标：上天台',
  ].join('\n');
  const slim = slimSealedPromptForScene(fat);
  assert.doesNotMatch(slim, /硬性约束/);
  assert.match(slim, /Scene 目标/);
  ok('slimSealedPrompt strips ban stacks');
}

{
  const prompt = compileSingleScenePrompt({
    basePrompt: '## P1\nScene 目标：确认循环',
    executionPlan: {
      sceneType: 'opening',
      scenePlan: { goal: '发现备忘录', conflict: '笔迹陌生又熟悉' },
      beats: [{ label: 'Goal' }, { label: 'Conflict' }, { label: 'Hook' }],
      chapterAuthorGoal: { mainFeeling: '熟悉的恐惧', readerEmotionStart: '不安', readerEmotionEnd: '怀疑', mustRemember: '抓痕', writerMust: '不得不去' },
    },
    scene: { index: 1, wordTarget: 900 },
    intent: { pov: '苏晚', mainGoal: '确认循环' },
    priorSceneText: '',
  });
  assert.match(prompt, /风格样本/);
  assert.match(prompt, /约 900 字/);
  assert.match(prompt, /写完整 Scene 正文/);
  assert.doesNotMatch(prompt, /只写 \*\*Goal\*\* 这一段/);
  ok('compileSingleScenePrompt remains scene-level exception path');
}

{
  const sample = resolveGoldenSample({});
  assert.ok(sample.includes('雨滴') || sample.length > 80);
  assert.ok(sample.length <= 400);
  const block = formatGoldenSampleBlock(sample);
  assert.match(block, /风格样本/);
  ok('golden sample resolve + capped P0 block');
}

console.log(`\nAll ${n} checks passed.`);
