#!/usr/bin/env node
/**
 * 冒烟：P3 tension/hook · P4 momentum/hierarchy/cost · P5 doctor
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const {
  buildTensionArc,
  applyTensionArcToBeats,
  resolveCraftFromTension,
  applyHookTypeRotation,
  validateHookRotation,
  buildSceneExecutionPlan,
} = await import(path.join(root, 'packages/inkos-director/src/index.js'));

const {
  buildChapterAnchor,
  buildNarrativeMomentum,
  updateMemoryHierarchy,
  compressOldChapters,
  loadMemoryHierarchy,
  shouldTriggerOptimizer,
  shouldRunAbTest,
  resolveV2ValidationMode,
  runDoctor,
  createChapterTrace,
} = await import(path.join(root, 'packages/inkos-runtime/src/index.js'));

const { applyAnchorConstraints } = await import(
  path.join(root, 'packages/inkos-brain/src/index.js')
);

const { formatSceneOpeningConstraintBlock, compileSingleBeatPrompt } = await import(
  path.join(root, 'packages/inkos-studio-server/src/writer-optimization/beat-execution.js')
);

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'inkos-p345-'));
const bookDir = path.join(tmp, 'book');
fs.mkdirSync(path.join(bookDir, 'novel', '_system', 'brain'), { recursive: true });
fs.mkdirSync(path.join(bookDir, 'states'), { recursive: true });
fs.mkdirSync(path.join(bookDir, 'chapters'), { recursive: true });
fs.writeFileSync(
  path.join(bookDir, 'novel', '_system', 'story_dna.yaml'),
  'genre: suspense\ncore_hook: 世界刷新\n',
);

let n = 0;
function ok(label) {
  n += 1;
  console.log(`✓ ${label}`);
}

// ── P3.1 tensionArc ──
{
  const arc = buildTensionArc({
    storyDna: { genre: '悬疑' },
    beatCount: 6,
  });
  assert.ok(arc.profile?.levels?.length || arc.beatLevels?.length);
  const beats = [
    { order: 1, structuralBeat: 'goal', label: '目标', content: '撞见异常', libraryBeat: 'Discovery' },
    { order: 2, structuralBeat: 'escalation', label: '升级', content: '压力升高', libraryBeat: 'Danger' },
    { order: 3, structuralBeat: 'newInformation', label: '新信息', content: '规则', libraryBeat: 'Revelation' },
    { order: 4, structuralBeat: 'choice', label: '选择', content: '抉择', libraryBeat: 'Choice' },
    { order: 5, structuralBeat: 'consequence', label: '后果', content: '代价', libraryBeat: 'Cost' },
    { order: 6, structuralBeat: 'hook', label: '钩子', content: '倒计时', libraryBeat: 'Hook' },
  ];
  const tensed = applyTensionArcToBeats(beats, arc);
  assert.ok(tensed.every((b) => b.tensionLevel != null && b.craftMode));
  const craft = resolveCraftFromTension(9, 'short-sensory', { structuralBeat: 'consequence' });
  assert.equal(craft.directives.sentenceLength, 'short');
  assert.ok(craft.directives.sensory);
  assert.ok(craft.directives.transition);

  const plan = buildSceneExecutionPlan({
    scene: { index: 1, id: 's1', goal: '确认规则', conflict: '时间不够' },
    intent: { pov: '林晓', mainGoal: '活过今晚', genre: '悬疑' },
    storyDna: { genre: '悬疑' },
    chapter: 1,
  });
  assert.ok(plan.tensionArc);
  assert.ok(plan.beats.every((b) => b.tensionLevel != null));
  assert.ok(plan.beats[0].craftMode);
  ok('P3 tensionArc + craftMode on beats');
}

// ── P3.2 hookType 轮换 + Trace ──
{
  const sameHooks = [
    { order: 1, structuralBeat: 'goal', hookType: 'Curiosity' },
    { order: 2, structuralBeat: 'escalation', hookType: 'Curiosity' },
    { order: 3, structuralBeat: 'hook', hookType: 'Curiosity' },
  ];
  const { beats: rotated, hookRotation } = applyHookTypeRotation(sameHooks);
  assert.equal(hookRotation.adjacentOk, true);
  assert.ok(hookRotation.rotations.length >= 1);
  assert.equal(validateHookRotation(rotated).valid, true);
  assert.notEqual(rotated[0].hookType, rotated[1].hookType);

  const plan = buildSceneExecutionPlan({
    scene: { index: 1, id: 's1', goal: '追' },
    intent: { pov: 'A', mainGoal: '逃' },
    storyDna: { genre: 'commercial' },
  });
  assert.ok(plan.hookRotation?.sequence?.length);
  assert.equal(validateHookRotation(plan.beats).valid, true);

  const trace = createChapterTrace(bookDir, 1, { label: 'p3' });
  trace.recordBeat(1, 1, {
    hookType: plan.beats[0].hookType,
    tensionLevel: plan.beats[0].tensionLevel,
    craftMode: plan.beats[0].craftMode,
    hookRotation: plan.hookRotation,
    text: '他推门。',
  });
  const { htmlPath } = trace.finalize({ pass: true });
  const html = fs.readFileSync(htmlPath, 'utf8');
  assert.match(html, /hookType|hookRotation/);
  ok('P3 hookType rotation + Trace marker');
}

// ── P4.3 narrative_momentum ──
{
  const momentum = buildNarrativeMomentum(1, {
    chapterText: '门后传来倒计时。他还来得及吗？',
    readerSimulator: { summary: '紧迫追读' },
  }, {});
  assert.ok(momentum.closing_emotion);
  assert.ok(momentum.forbidden_openings.some((x) => /天气|闹钟/.test(x)));

  const anchor = buildChapterAnchor(1, {
    intent: {
      pov: '林晓',
      location: '便利店',
      time: '凌晨',
      closingEmotion: '紧迫·倒计时压迫',
      voiceDna: { id: 'x', label: '短句' },
    },
    chapterText: '门后传来倒计时。他还来得及吗？',
  });
  assert.equal(anchor.narrative_momentum.closing_emotion, '紧迫·倒计时压迫');

  const next = applyAnchorConstraints(
    { chapter: 2, scenes: [{ index: 1, goal: '追查' }, { index: 2, goal: '对峙' }] },
    anchor,
  );
  assert.equal(next.scenes[0].inheritedEmotion, '紧迫·倒计时压迫');
  assert.ok(next.scenes[0].forbiddenOpenings?.length);
  assert.match(next.scenes[0].openingConstraint || '', /承接|延续/);

  const opening = formatSceneOpeningConstraintBlock(next.scenes[0], next);
  assert.match(opening, /Opening Constraint|承接情绪/);
  ok('P4 narrative_momentum + Scene1 inherit');
}

// ── P4.4 memory hierarchy ──
{
  for (let ch = 1; ch <= 5; ch += 1) {
    updateMemoryHierarchy(bookDir, ch, {
      anchor: {
        pov: '林晓',
        location: '街',
        current_date: `D${ch}`,
        voiceDna: { id: 'x', label: '短句' },
        banned_elements: [{ text: '禁复读', expiresAtChapter: null }],
        narrative_momentum: { closing_emotion: `e${ch}` },
      },
      chapterText: `第${ch}章正文，门后有倒计时。他必须行动。`.repeat(20),
      scenes: [{ index: 1, goal: '活', text: '他推门，系统闪烁。他还来得及吗？', entities: ['林晓'] }],
    });
  }
  const hier = loadMemoryHierarchy(bookDir);
  assert.ok(hier.L1.voiceDna);
  assert.ok(hier.L2.chapters.length <= 5);
  assert.ok(hier.compressions.length >= 1);
  assert.equal(hier.compressions.at(-1).atChapter, 5);
  ok('P4 memory hierarchy L1-L4 + compress@5');
}

// ── P4.5 cost controls ──
{
  assert.equal(resolveV2ValidationMode({ rewriteAttempt: 0 }), 'light');
  assert.equal(resolveV2ValidationMode({ rewriteAttempt: 1 }), 'full');
  assert.equal(shouldTriggerOptimizer({ hookScore: 8, dragSections: [] }), false);
  assert.equal(shouldTriggerOptimizer({ hookScore: 6, dragSections: [] }), true);
  assert.equal(shouldRunAbTest(5), true);
  assert.equal(shouldRunAbTest(4), false);
  assert.equal(shouldRunAbTest(10), true);
  ok('P4 cost: V2 light / Optimizer<7 / AB every 5');
}

// ── P5 doctor ──
{
  fs.writeFileSync(path.join(bookDir, 'chapters', '0005_五.md'), '他推门。系统闪烁。还来得及吗？倒计时开始。');
  // 写一份带 tension/hook 的 plan 供 doctor 读
  const plan = buildSceneExecutionPlan({
    scene: { index: 1, id: 's1', goal: '确认' },
    intent: { pov: '林晓', mainGoal: '活' },
    storyDna: { genre: 'suspense' },
  });
  fs.writeFileSync(
    path.join(bookDir, 'novel', '_system', 'brain', 'ch_0005_plan.json'),
    JSON.stringify({ scenes: [{ executionPlan: plan }] }, null, 2),
  );
  fs.writeFileSync(
    path.join(bookDir, 'states', 'ch_0005_anchor.yaml'),
    [
      'version: chapter-anchor-2',
      'chapter: 5',
      'pov: 林晓',
      'location: 街',
      'current_date: D5',
      'voiceDna:',
      '  id: x',
      '  label: 短句',
      'relationship_state:',
      '  edges: []',
      'narrative_momentum:',
      '  closing_emotion: 紧迫',
      '  forbidden_openings:',
      '    - 禁止用天气开场',
      'banned_elements: []',
    ].join('\n'),
  );

  const report = runDoctor(bookDir, { chapter: 5 });
  assert.ok(report.checks.some((c) => c.id === 'anchor'));
  assert.ok(report.checks.some((c) => c.id === 'tension'));
  assert.ok(report.checks.some((c) => c.id === 'cost'));
  assert.ok(Array.isArray(report.fixes));
  ok('P5 inkos doctor diagnostics');
}

// compileSingleBeatPrompt 注入 tension/hook/opening
{
  const plan = buildSceneExecutionPlan({
    scene: {
      index: 1,
      id: 's1',
      goal: '承接',
      inheritedEmotion: '紧迫·倒计时压迫',
      forbiddenOpenings: ['禁止用天气/闹钟开场'],
      openingConstraint: '开场必须延续情绪：紧迫·倒计时压迫',
    },
    intent: {
      pov: '林晓',
      mainGoal: '活',
      closingEmotion: '紧迫·倒计时压迫',
      forbiddenOpenings: ['禁止用天气/闹钟开场'],
    },
    storyDna: { genre: 'suspense' },
  });
  const prompt = compileSingleBeatPrompt({
    beat: plan.beats[0],
    executionPlan: plan,
    basePrompt: '基础',
    scene: {
      index: 1,
      inheritedEmotion: '紧迫·倒计时压迫',
      forbiddenOpenings: ['禁止用天气/闹钟开场'],
      openingConstraint: '开场必须延续情绪：紧迫·倒计时压迫',
    },
    intent: { closingEmotion: '紧迫·倒计时压迫' },
  });
  assert.match(prompt, /Tension Craft|tensionLevel/);
  assert.match(prompt, /钩子类型|Curiosity|Danger|Promise|Truth|Cost|Pressure/);
  assert.match(prompt, /Opening Constraint|承接情绪/);
  ok('Beat prompt injects craft/hook/opening');
}

console.log(`\n全部通过 ${n}/7 · tmp=${tmp}`);
