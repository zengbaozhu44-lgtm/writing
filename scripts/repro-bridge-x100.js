/**
 * 压力复现 — 连续 50 次真实 bridge plan hook
 * 目的：在不重启 server 的情况下，看 bridge 是否间歇抛错
 * 若抛错，_invokeSceneLifecycleHook 的 catch + INKOS_DEBUG 会落盘到
 * runtime-debug/scene-lifecycle-hook-error.log
 */
import path from 'node:path';
import { RuntimeOrchestrator } from '../packages/inkos-runtime/src/pipeline/orchestrator.js';
import { createSceneLifecycleHook } from '../packages/inkos-studio-server/src/scene-lifecycle-bridge.js';
import { loadBrainContext } from '../packages/inkos-brain/src/loader.js';
import { readJson } from '../packages/inkos-core/src/lib/paths.js';
import { loadPriorChapterAnchor } from '../packages/inkos-brain/src/planner/planner.js';

const BOOK = '/Users/zora/Desktop/ai/InkOS/books/我的小说/books/赛博修仙我靠玩家暴打克苏鲁旧日神';
const CHAPTER = 7;

const plan = readJson(path.join(BOOK, 'novel/_system/brain/ch_0007_plan.json'));
const intent = plan.intent;
const priorAnchor = loadPriorChapterAnchor(BOOK, CHAPTER - 1, { required: false });
const ctx = loadBrainContext(BOOK, { chapter: CHAPTER, pov: intent.pov, present: intent.present });
if (priorAnchor) ctx.priorAnchor = priorAnchor;
ctx.bookDir = BOOK;

// 用真实 orchestrator 的 _invokeSceneLifecycleHook（含 debug 落盘 catch）
const orch = new RuntimeOrchestrator(BOOK, {
  sceneLifecycleHook: createSceneLifecycleHook(BOOK, '赛博修仙我靠玩家暴打克苏鲁旧日神'),
});

console.log(`=== 连续 50 次 bridge plan hook (ch${CHAPTER}) ===`);
let ok = 0, fail = 0;
for (let i = 1; i <= 50; i++) {
  // 每次用 plan 的原始 scene（隔离 _hashDependency 污染）
  const scene = JSON.parse(JSON.stringify(intent.scenes[(i - 1) % intent.scenes.length]));
  const t0 = performance.now();
  try {
    const r = await orch._invokeSceneLifecycleHook('plan', { chapter: CHAPTER, scene, intent, ctx });
    if (r === null) {
      fail++;
      console.log(`[${i}] HOOK 返回 null (抛错被吞) in ${Math.round(performance.now() - t0)}ms`);
    } else {
      ok++;
    }
  } catch (err) {
    fail++;
    console.log(`[${i}] HOOK 直接抛: ${err?.constructor?.name}: ${err?.message}`);
  }
}
console.log(`\n结果: ${ok} 成功, ${fail} 失败/被吞`);
console.log('若 fail>0，检查 runtime-debug/scene-lifecycle-hook-error.log');
process.exit(0);
