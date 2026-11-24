#!/usr/bin/env node
/**
 * replan 三态测试 — _resolveChapterResult 有界重入单元测试（无需真实 LLM）
 *
 * _resolveChapterResult 是 replanIntent 重入 _runChapter 的唯一出口（orchestrator.js:331）。
 * 测试直接以它为入口，用 stub _runChapter 统计重入次数：
 *
 *   态1  pass:false 无 replanIntent        → 不重入，原样返回（_runChapter 零次）
 *   态2  pass:false + replanIntent 预算内  → presetIntent 重入 1 次后通过，计数递增
 *   态3  pass:false + replanIntent 预算打满 → 第 maxReplan 次后 replanExhausted，不再递归
 *   态4  guardReset 失败                   → 拒绝重入，replanExhausted + 报错
 *
 * 用法：node tests/golden-baseline/replan-three-state.js
 * 或：import { runReplanThreeState } from './replan-three-state.js'
 */
import { RuntimeOrchestrator } from '../../packages/inkos-runtime/src/pipeline/orchestrator.js';

const trace = { recordStage: () => {} };

/**
 * 构造测试 orchestrator。
 * _runChapter stub：记录每次调用 → 从 runResults 取结果 → 交回真实 _resolveChapterResult 决策。
 * （镜像真实流程：_runChapter 内部经 _resolveChapterResult 决定是否再次重入）
 */
function makeOrchestrator({ runResults, maxReplan, resetGuard }) {
  const runtime = new RuntimeOrchestrator('/tmp/golden-nonexistent-book', { writer: null });
  runtime.maxReplan = maxReplan;
  const calls = [];
  runtime._runChapter = async (options) => {
    calls.push(options);
    const r = runResults[calls.length - 1];
    return runtime._resolveChapterResult(r.chapter ?? 1, r, { ...options, _execCtx: options._execCtx }, {}, trace);
  };
  if (resetGuard) runtime._resetGuardForReplan = resetGuard;
  return { runtime, calls };
}

export async function runReplanThreeState() {
  let failures = 0;
  const assert = (cond, msg) => {
    if (!cond) {
      failures += 1;
      console.error('  ✗', msg);
    }
  };

  // ---- 态1：无 replanIntent，不重入 ----
  {
    const { runtime, calls } = makeOrchestrator({ runResults: [], maxReplan: 3 });
    const result = { pass: false, error: 'Critic 拒绝' };
    const out = await runtime._resolveChapterResult(1, result, {}, {}, trace);
    assert(out === result, '态1: 无 replanIntent → 原样返回同一对象');
    assert(calls.length === 0, '态1: _runChapter 零次重入');
    console.log('✓ 态1  无 replanIntent → 不重入原样返回');
  }

  // ---- 态2：replanIntent + 预算内，重入一次后通过 ----
  {
    const { runtime, calls } = makeOrchestrator({
      runResults: [{ chapter: 1, pass: true }],
      maxReplan: 3,
    });
    const out = await runtime._resolveChapterResult(1, {
      pass: false,
      replanIntent: { mainGoal: '原始目标' },
      error: 'Validation 八项未全部通过 — 重新规划',
    }, {}, {}, trace);
    assert(out.pass === true, '态2: 重入后第二次 run 通过');
    assert(calls.length === 1, `态2: 恰好 1 次重入（实际 ${calls.length}）`);
    assert(calls[0].presetIntent?.mainGoal === '原始目标', '态2: 重入携带原 replanIntent 为 presetIntent');
    assert(calls[0]._execCtx?.chapterReplanCount === 1, `态2: chapterReplanCount 递增到 1（实际 ${calls[0]?._execCtx?.chapterReplanCount}）`);
    assert(calls[0].presetIntent?._replanSource === 'validation_replan', '态2: 来源标记 validation_replan');
    console.log('✓ 态2  replanIntent + 预算内 → presetIntent 有界重入 1 次');
  }

  // ---- 态3：预算打满 → replanExhausted，不再递归 ----
  {
    const { runtime, calls } = makeOrchestrator({
      runResults: [
        { chapter: 1, pass: false, replanIntent: { mainGoal: 'g1' }, error: 'Metrics 反馈触发重新规划' },
        { chapter: 1, pass: false, replanIntent: { mainGoal: 'g2' }, error: 'Metrics 反馈触发重新规划' },
      ],
      maxReplan: 2,
    });
    const out = await runtime._resolveChapterResult(1, {
      pass: false,
      replanIntent: { mainGoal: 'g0' },
      error: 'Metrics 反馈触发重新规划',
    }, {}, {}, trace);
    assert(out.replanExhausted === true, '态3: replanExhausted 标志置位');
    assert(out.pass === false, '态3: 仍为失败');
    assert(calls.length === 2, `态3: 恰达 maxReplan=2 后终止，无第 3 次递归（实际 ${calls.length}）`);
    assert(calls[1]._execCtx?.chapterReplanCount === 2, `态3: 预算计数打到 2（实际 ${calls[1]?._execCtx?.chapterReplanCount}）`);
    console.log('✓ 态3  replanIntent + 预算打满 → replanExhausted，无无限递归');
  }

  // ---- 态4：guardReset 失败 → 拒绝重入 ----
  {
    const { runtime, calls } = makeOrchestrator({
      runResults: [],
      maxReplan: 3,
      resetGuard: () => ({ error: 'ExecutionGuard 单调闸复位失败' }),
    });
    const out = await runtime._resolveChapterResult(1, {
      pass: false,
      replanIntent: { mainGoal: 'g' },
      error: 'Validation 八项未全部通过 — 重新规划',
    }, {}, {}, trace);
    assert(out.replanExhausted === true, '态4: guardReset 失败 → replanExhausted');
    assert(String(out.error).includes('ExecutionGuard 重置失败'), '态4: 错误信息包含守卫失败原因');
    assert(calls.length === 0, `态4: 守卫失败不重入（实际 ${calls.length}）`);
    console.log('✓ 态4  guardReset 失败 → 拒绝重入 + 报错终止');
  }

  if (failures) {
    console.error(`✗ replan 三态测试失败 ${failures} 项`);
    process.exitCode = 1;
    return false;
  }
  console.log('✓ replan 三态测试全部通过（态1 不重入 / 态2 有界重入 / 态3 预算耗尽 / 态4 守卫失败）');
  return true;
}

// 仅直接执行时自跑
import { pathToFileURL } from 'node:url';
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await runReplanThreeState();
}
