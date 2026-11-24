/**
 * Repro ch7「系统内部错误」v3 — 精确复现 writer mustRecompile 分支
 * 原始失败时序（事件日志 seq 10/12 双 hashDependencyTreeUpdated）：
 *   bridge plan → hashDep.mustRecompile=true → scene._hashDependency 设置
 *   writer: runHashDependencyCheck(mustRecompile, regenerating)  [171行 hash 事件]
 *          → compileScenePrompt(ctx, scene)                     [200行]
 *          → runHashDependencyCheck(persist)                    [210行 hash 事件]
 *          → runStoryMemory                                     [220行]
 *          → compileStudioWriterPrompt                          [230行]  ← 失败段
 */
import path from 'node:path';
import { createSceneLifecycleHook } from '../packages/inkos-studio-server/src/scene-lifecycle-bridge.js';
import { loadBrainContext } from '../packages/inkos-brain/src/loader.js';
import { loadPriorChapterAnchor } from '../packages/inkos-brain/src/planner/planner.js';
import { readJson } from '../packages/inkos-core/src/lib/paths.js';
import { runHashDependencyCheck } from '@inkos/hash-dependency';
import { readStoryDna, readSystemFile } from '../packages/inkos-studio-server/src/system-store.js';
import { compileScenePrompt } from '../packages/inkos-prompt/src/index.js';

const BOOK = '/Users/zora/Desktop/ai/InkOS/books/我的小说/books/赛博修仙我靠玩家暴打克苏鲁旧日神';
const CHAPTER = 7;

const plan = readJson(path.join(BOOK, 'novel/_system/brain/ch_0007_plan.json'));
const intent = plan.intent;
const priorAnchor = loadPriorChapterAnchor(BOOK, CHAPTER - 1, { required: false });
const ctx = loadBrainContext(BOOK, { chapter: CHAPTER, pov: intent.pov, present: intent.present });
if (priorAnchor) ctx.priorAnchor = priorAnchor;
ctx.bookDir = BOOK;

// scene 取 plan 的原始 scene（无 text），模拟原始失败时的状态
const scene = intent.scenes[0];
const storyDna = readStoryDna(BOOK) || {};
const styleDna = readSystemFile(BOOK, 'style_dna') || {};

// 1) bridge plan phase → 产生 hashDep + 改写 scene
const hook = createSceneLifecycleHook(BOOK, '赛博修仙我靠玩家暴打克苏鲁旧日神');
const planHook = await hook('plan', { chapter: CHAPTER, scene, intent, ctx });
console.log('bridge plan OK. _hashDependency:', JSON.stringify(scene._hashDependency ? { mustRecompile: scene._hashDependency.mustRecompile, changed: scene._hashDependency.changed } : null));

// 2) writer mustRecompile 分支 — 强制 mustRecompile 以复现原始失败路径
scene._hashDependency = { mustRecompile: true, changed: ['writing'], invalidated: false };
{
  console.log('\n[writer] mustRecompile=true（强制）→ 走 regenerating 分支');
  let hashDep = runHashDependencyCheck({
    bookDir: BOOK, chapter: CHAPTER, scene, ctx, storyDna, styleDna,
    persistState: false, regenerating: true,
  });
  console.log('  hashDep(regenerating): mustRecompile=', hashDep.mustRecompile, 'changed=', hashDep.changed);

  // compileScenePrompt — 原始失败 seq 12 前执行
  try {
    const compiled = compileScenePrompt(ctx, scene);
    console.log('  compileScenePrompt OK. text len:', compiled.text?.length);
    const basePrompt = compiled.text;

    // persist hash
    const persisted = runHashDependencyCheck({
      bookDir: BOOK, chapter: CHAPTER, scene, ctx, storyDna, styleDna,
      persistState: true,
    });
    console.log('  hash persist OK');

    // runStoryMemory
    const { runStoryMemory } = await import('@inkos/story-memory');
    const storyMem = runStoryMemory({ bookDir: BOOK, chapter: CHAPTER, scene, ctx, storyDna });
    console.log('  runStoryMemory OK. writerBlock len:', storyMem.writerBlock?.length);

    // compileStudioWriterPrompt
    const { compileStudioWriterPrompt } = await import('../packages/inkos-studio-server/src/writer-optimization/index.js');
    try {
      const { prompt, compiled: c2, meta } = compileStudioWriterPrompt({
        basePrompt,
        scene,
        chapter: CHAPTER,
        intent,
        ctx: { ...ctx, bookDir: BOOK, styleDna },
        storyMemoryBlock: storyMem.writerBlock,
        storyMemory: storyMem,
        storyDna,
      });
      console.log('  compileStudioWriterPrompt OK. prompt len:', prompt?.length, 'tokens:', meta.tokens?.total);
    } catch (err) {
      console.error('\n✗ compileStudioWriterPrompt THREW (真实异常):');
      console.error('  ', err.constructor.name + ':', err.message);
      console.error(err.stack);
    }
  } catch (err) {
    console.error('\n✗ compileScenePrompt THREW (真实异常):');
    console.error('  ', err.constructor.name + ':', err.message);
    console.error(err.stack);
  }
}
