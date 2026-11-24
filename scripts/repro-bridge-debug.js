/**
 * Debug repro — bridge plan hook seq9 之后逻辑逐步打点
 * 真实数据 loadBrainContext(ch7) + 真实 bridge 内联复刻
 * 目标：定位「budgetAllocated → storyMemoryUpdated」之间真正的抛错点
 */
import path from 'node:path';
import { loadBrainContext } from '../packages/inkos-brain/src/loader.js';
import { readJson } from '../packages/inkos-core/src/lib/paths.js';
import { runHashDependencyCheck } from '@inkos/hash-dependency';
import { runDynamicBudget, allocationToCompilerBudget } from '@inkos/dynamic-budget';
import { loadAdaptiveAdjustments, applyAdjustmentsToBudget } from '@inkos/adaptive-learning';
import { runContextRanking } from '@inkos/context-ranking';
import { runStoryMemory } from '@inkos/story-memory';
import { readStoryDna, readSystemFile } from '../packages/inkos-studio-server/src/system-store.js';
import { loadPriorChapterAnchor } from '../packages/inkos-brain/src/planner/planner.js';

const BOOK = '/Users/zora/Desktop/ai/InkOS/books/我的小说/books/赛博修仙我靠玩家暴打克苏鲁旧日神';
const CHAPTER = 7;

const plan = readJson(path.join(BOOK, 'novel/_system/brain/ch_0007_plan.json'));
const intent = plan.intent;
const priorAnchor = loadPriorChapterAnchor(BOOK, CHAPTER - 1, { required: false });
const ctx = loadBrainContext(BOOK, { chapter: CHAPTER, pov: intent.pov, present: intent.present });
if (priorAnchor) ctx.priorAnchor = priorAnchor;
ctx.bookDir = BOOK;

const storyDna = readStoryDna(BOOK) || {};
const styleDna = readSystemFile(BOOK, 'style_dna') || {};
const scene = intent.scenes[0];
scene._hashDependency = null;

function mark(label, fn) {
  const t0 = performance.now();
  try {
    const r = fn();
    console.log(`[OK]   ${label} (${Math.round(performance.now() - t0)}ms)`, r !== undefined ? '' : '');
    return r;
  } catch (err) {
    console.log(`[FAIL] ${label} (${Math.round(performance.now() - t0)}ms)`);
    console.log(`  ${err?.constructor?.name}: ${err?.message}`);
    console.log(`  ${(err?.stack || '').split('\n').slice(0, 6).join('\n  ')}`);
    return null;
  }
}

console.log(`\n=== bridge seq9-after 逐步复刻 (ch${CHAPTER}) ===`);
console.log('scene1 _hashDependency:', JSON.stringify(scene._hashDependency));
console.log('ctx keys:', Object.keys(ctx).join(', '));
console.log('ctx.chars:', ctx.characters ? `Object(${Object.keys(ctx.characters).length})` : 'undefined');
console.log('ctx.facts:', Array.isArray(ctx.facts) ? `Array(${ctx.facts.length})` : typeof ctx.facts);
console.log('ctx.foreshadow:', Array.isArray(ctx.foreshadow) ? `Array(${ctx.foreshadow.length})` : typeof ctx.foreshadow);

// 1. hashDependency (persistState:false)
const hashDep = mark('runHashDependencyCheck(persist=false)', () =>
  runHashDependencyCheck({ bookDir: BOOK, chapter: CHAPTER, scene, ctx, storyDna, styleDna, persistState: false }));
if (hashDep?.mustRecompile) scene._hashDependency = hashDep;
console.log('  hashDep.mustRecompile:', hashDep?.mustRecompile, 'changed:', hashDep?.changed);

// 2. dynamic budget
const budgetResult = mark('runDynamicBudget', () =>
  runDynamicBudget({ bookDir: BOOK, chapter: CHAPTER, scene, intent, ctx }));
if (!budgetResult) process.exit(1);
console.log('  budget sceneType:', budgetResult.budget?.sceneType);

// 3. allocationToCompilerBudget
const compilerBudget = mark('allocationToCompilerBudget', () =>
  allocationToCompilerBudget(budgetResult.budget.allocation));

// 4. loadAdaptiveAdjustments
const adaptiveAdj = mark('loadAdaptiveAdjustments', () => loadAdaptiveAdjustments(BOOK));

// 5. applyAdjustmentsToBudget
let compilerBudget2 = compilerBudget;
mark('applyAdjustmentsToBudget', () => {
  compilerBudget2 = adaptiveAdj
    ? applyAdjustmentsToBudget(compilerBudget, adaptiveAdj, scene)
    : compilerBudget;
});

// 6. runContextRanking
const contextRank = mark('runContextRanking', () =>
  runContextRanking({
    bookDir: BOOK, chapter: CHAPTER, scene, intent, ctx, storyDna,
    budget: compilerBudget2, budgetChars: budgetResult.contextCharBudget,
  }));

// 7. runStoryMemory
const storyMem = mark('runStoryMemory', () =>
  runStoryMemory({ bookDir: BOOK, chapter: CHAPTER, scene, ctx, storyDna }));

console.log('\n=== done ===');
console.log('contextRank:', contextRank ? `topK=${contextRank.topK?.length}` : 'null');
console.log('storyMem:', storyMem ? `reportPath=${storyMem.reportPath}` : 'null');
process.exit(0);
