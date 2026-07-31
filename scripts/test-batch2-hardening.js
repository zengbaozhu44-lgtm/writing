#!/usr/bin/env node
/**
 * 冒烟：AB 共享骨架 / Anchor 状态机 / Reader 校准 / Trace / Voice DNA 保护
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const {
  runTemperatureAbTest,
  fingerprintExecutionPlan,
  validateSharedExecutionPlan,
  parseSimulatorJson,
  mergeConservativeReviewers,
  computeDynamicHookThreshold,
  createChapterTrace,
  compilePrompt,
  resolveProtectedVoiceDna,
  buildChapterAnchor,
} = await import(path.join(root, 'packages/inkos-runtime/src/index.js'));

const {
  applyAnchorConstraints,
  filterActiveBannedElements,
} = await import(path.join(root, 'packages/inkos-brain/src/index.js'));

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'inkos-batch2-'));
const bookDir = path.join(tmp, 'book');
fs.mkdirSync(path.join(bookDir, 'novel', '_system', 'brain'), { recursive: true });
fs.mkdirSync(path.join(bookDir, 'states'), { recursive: true });

let passed = 0;
function ok(name) {
  passed += 1;
  console.log(`✓ ${name}`);
}

// ── 1. AB：共享 ExecutionPlan + invalidTest ──
{
  const shared = {
    sceneIndex: 1,
    sceneType: 'confrontation',
    wordTarget: 1200,
    beats: [
      { order: 1, id: 'b1', libraryBeat: 'hook', content: '撞见异常', beforeState: '平静', afterState: '警觉', wordBudget: 200 },
      { order: 2, id: 'b2', libraryBeat: 'escalation', content: '规则显现', beforeState: '警觉', afterState: '被迫行动', wordBudget: 220 },
    ],
  };
  const fp = fingerprintExecutionPlan(shared);
  assert.ok(fp.includes('撞见异常'));

  const validRun = await runTemperatureAbTest({
    executionPlan: shared,
    temperatures: [0.55, 0.8],
    persist: false,
    generateFn: async (temperature, label, { executionPlan }) => ({
      text: `文笔${label} 温度${temperature}：他抬头。系统提示闪了一下。`,
      meta: { executionPlan },
    }),
  });
  assert.equal(validRun.invalidTest, false);
  assert.ok(validRun.winner);

  const badRun = await runTemperatureAbTest({
    executionPlan: shared,
    temperatures: [0.55, 0.8],
    persist: false,
    generateFn: async (temperature, label, { executionPlan }) => {
      if (label.startsWith('B')) {
        const mutated = JSON.parse(JSON.stringify(executionPlan));
        mutated.beats[0].content = '完全不同的剧情骨架';
        return { text: '另一套剧情', meta: { executionPlan: mutated } };
      }
      return { text: '正常文笔', meta: { executionPlan } };
    },
  });
  assert.equal(badRun.invalidTest, true);
  assert.equal(badRun.winner, null);
  assert.match(badRun.report.reason, /不一致|骨架/);

  const guard = validateSharedExecutionPlan(shared, [
    { label: 'A', meta: { executionPlan: shared } },
    { label: 'B', meta: { executionPlan: { ...shared, beats: [{ ...shared.beats[0], beforeState: '改了' }] } } },
  ]);
  assert.equal(guard.invalidTest, true);
  ok('AB 共享 ExecutionPlan + invalidTest');
}

// ── 2. Anchor：expectedTransition / expiresAtChapter / override ──
{
  const anchor = buildChapterAnchor(2, {
    intent: {
      pov: '林晓',
      time: '第3天凌晨',
      location: '便利店后门',
      mainGoal: '确认刷新规则',
      bargain: true,
      mustLose: '错过末班地铁',
      bannedElementsExplicit: ['禁止兄妹关系直到第 5 章'],
      voiceDna: {
        id: 'cold-urban',
        label: '冷感都市短句',
        sentenceLength: 'short',
        rhythm: 'staccato',
        dialogueRatio: 0.5,
        actionDensity: 'high',
        descriptionDensity: 'low',
      },
    },
    scenes: [{ entities: ['林晓', '便利店店员'] }],
  });
  assert.equal(anchor.version, 'chapter-anchor-2');
  assert.ok(anchor.relationship_state.edges[0].expectedTransition?.toStatus);
  assert.ok(anchor.voiceDna.forced);
  const siblingBan = anchor.banned_elements.find((b) => String(b.text).includes('兄妹'));
  assert.equal(siblingBan.expiresAtChapter, 5);

  const activeAt5 = filterActiveBannedElements(anchor.banned_elements, 5);
  assert.ok(activeAt5.some((b) => b.text.includes('兄妹')));
  const activeAt6 = filterActiveBannedElements(anchor.banned_elements, 6);
  assert.ok(!activeAt6.some((b) => b.text.includes('兄妹')));

  const rejected = applyAnchorConstraints(
    { chapter: 3, relationshipOverride: { edges: [{ from: '林晓', to: '店员', status: '同盟' }] } },
    anchor,
  );
  assert.match(rejected.relationshipOverrideRejected || '', /transition/i);

  const allowed = applyAnchorConstraints(
    {
      chapter: 3,
      relationshipOverride: { edges: [{ from: '林晓', to: '店员', status: '同盟' }] },
      relationshipTransitionReason: '共同目击刷新后结盟',
    },
    anchor,
  );
  assert.equal(allowed.relationshipState.overridden, true);
  assert.equal(allowed.voiceDna.inherited, true);
  assert.equal(allowed.voiceDna.id, 'cold-urban');
  ok('Anchor expectedTransition / expiresAtChapter / override+VoiceDNA');
}

// ── 3. Reader Simulator 解析容错 + 基准线 + 保守分 ──
{
  const regexParsed = parseSimulatorJson('hookScore: 7\n摘要：还能追\ndragSections: ["大段风光线描写"]');
  assert.equal(regexParsed._parseMode, 'regex-fallback');
  assert.equal(regexParsed.hookScore, 7);
  assert.ok(regexParsed.dragSections.length >= 1);

  const merged = mergeConservativeReviewers([
    { label: 'a', hookScore: 8, summary: '长摘要……还能看', dragSections: [] },
    { label: 'b', hookScore: 5, summary: '短', dragSections: ['注水'] },
  ], 6);
  assert.equal(merged.hookScore, 5);
  assert.equal(merged.softFail, true);
  assert.ok(merged.dragSections.includes('注水'));

  assert.equal(computeDynamicHookThreshold({ count: 0 }), 6);
  assert.equal(computeDynamicHookThreshold({ count: 4, median: 5 }), 5);
  ok('Reader Simulator 容错 / 基准线 / 双评审保守分');
}

// ── 4. Trace HTML ──
{
  const trace = createChapterTrace(bookDir, 1, { label: 'smoke' });
  assert.match(trace.traceId, /^tr_ch0001_/);
  trace.recordStage('planner', { pass: true, summary: '确认规则' });
  trace.recordBeat(1, 1, {
    libraryBeat: 'hook',
    userPrompt: '写撞见异常',
    text: '他推开后门。',
    validation: { pass: true },
    score: { hookScore: 7 },
  });
  const { htmlPath, meta } = trace.finalize({ pass: true });
  assert.ok(fs.existsSync(htmlPath));
  const html = fs.readFileSync(htmlPath, 'utf8');
  assert.match(html, /Chapter Trace/);
  assert.match(html, /撞见异常|写撞见异常/);
  assert.match(html, /他推开后门/);
  assert.equal(meta.traceId, trace.traceId);
  ok('Trace stages/beats + debug.html');
}

// ── 5. Voice DNA 进 P0 不可裁剪 ──
{
  const dna = {
    id: 'cold-urban',
    label: '冷感都市短句',
    sentenceLength: 'short',
    rhythm: 'staccato',
    dialogueRatio: 0.5,
    actionDensity: 'high',
    descriptionDensity: 'low',
    inherited: true,
  };
  const protectedDna = resolveProtectedVoiceDna({
    intent: { voiceDna: dna, priorAnchor: { voiceDna: dna } },
  });
  assert.equal(protectedDna.forced, true);

  const compiled = compilePrompt({
    chapter: 3,
    scene: { index: 1, goal: '确认规则' },
    intent: { pov: '林晓', mainGoal: '确认规则', voiceDna: dna, priorAnchor: { voiceDna: dna } },
    voiceDna: dna,
    loreText: `${'世界观设定 '.repeat(400)}\n### 人物：路人甲\n恒定属性：无\n身份：路人`,
    storyMemoryBlock: '记忆块 '.repeat(600),
    adaptiveBlock: '自适应 '.repeat(200),
    priorExcerpt: '上文 '.repeat(300),
    tokenBudget: { total: 1800, floors: { p2: 80, p3: 200 } },
  });
  assert.equal(compiled.meta.voiceDnaProtected, true);
  assert.match(compiled.layers.p0, /Voice DNA|冷感都市/);
  assert.ok(!/冷感都市/.test(compiled.layers.p2), 'Voice DNA 不得再出现在可裁剪 P2');
  // 即使预算裁剪，P0 仍保留 Voice DNA
  assert.match(compiled.text, /冷感都市|Voice DNA/);
  ok('Voice DNA 移入 P0 Anchor 保护层');
}

console.log(`\n全部通过 ${passed}/5 · tmp=${tmp}`);
