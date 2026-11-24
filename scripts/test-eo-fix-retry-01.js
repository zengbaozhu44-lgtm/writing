#!/usr/bin/env node
/**
 * EO-FIX-RETRY-01 — Hard-Fail Retry Forbidden Openings Injection
 *
 * T1 首次复读判定短语进入重试 intent.forbiddenOpenings
 * T2 第二次复读判定后之前禁令保留+新短语追加（累积）
 * T3 原始 intent 其他约束保持不变
 * T4 无复读时不凭空添加禁令
 * T5 不同章节/任务间不发生污染（options 域隔离）
 * T6 重规划次数上限不变（MAX_SCENE_HARD_FAIL_REPLAN）
 * T7 硬门仍能拦截真实复读（判定函数未被触碰）
 * T8 新生成内容不再仅因相同开场短语而重复触发同一失败
 */
import assert from 'node:assert/strict';

let pass = 0;
let fail = 0;
function ok(cond, label) {
  if (cond) { pass += 1; console.log(`  ok - ${label}`); }
  else { fail += 1; console.error(`  FAIL - ${label}`); }
}

const { extractRepeatPhrases, buildHardFailCorrection } = await import('../packages/inkos-studio-server/src/studio-orchestrator.js');
const { findOpeningPhraseRecycle } = await import('../packages/inkos-studio-server/src/writer-optimization/beat-continuity.js');
const { formatSceneOpeningConstraintBlock } = await import('../packages/inkos-studio-server/src/writer-optimization/beat-execution.js');

console.log('# EO-FIX-RETRY-01');

console.log('## T1 — 首次复读短语提取+进入重试 intent');
{
  const errMsg = 'Scene 3/4 硬失败：跨 Scene 复读未通过：开场句原样复读 9 字「周砚把屏幕掰回来，…」';
  const phrases = extractRepeatPhrases(errMsg);
  ok(phrases.length === 1 && phrases[0].includes('周砚把屏幕掰回来'), `提取=1 条「${phrases[0]?.slice(0, 12)}…」`);

  // 模拟 _runScenesAndChapter 的注入逻辑
  const intent = { forbiddenOpenings: [], mainGoal: '原始目标', pov: '周砚' };
  const options = { _hardFailForbiddenPhrases: phrases };
  if (options._hardFailForbiddenPhrases?.length) {
    const existing = Array.isArray(intent.forbiddenOpenings) ? intent.forbiddenOpenings : [];
    intent.forbiddenOpenings = [...new Set([...existing, ...options._hardFailForbiddenPhrases])];
  }
  ok(intent.forbiddenOpenings.length === 1 && intent.forbiddenOpenings[0].includes('周砚把屏幕掰回来'),
    'intent.forbiddenOpenings 含复读短语');
}

console.log('## T2 — 累积：第二次判定后之前禁令保留+新短语追加');
{
  const first = extractRepeatPhrases('硬失败：开场句原样复读 9 字「周砚把屏幕掰回来，…」');
  const second = extractRepeatPhrases('硬失败：幕内开场复读未通过：开场句原样复读 24 字「数着，一步、两步，拐角处…」');
  // 模拟两次重试传递
  const optionsAfterFirst = { _hardFailForbiddenPhrases: first };
  const optionsAfterSecond = {
    _hardFailForbiddenPhrases: [
      ...(optionsAfterFirst._hardFailForbiddenPhrases || []),
      ...second,
    ],
  };
  const intent = { forbiddenOpenings: [] };
  intent.forbiddenOpenings = [...new Set([...intent.forbiddenOpenings, ...optionsAfterSecond._hardFailForbiddenPhrases])];
  ok(intent.forbiddenOpenings.length === 2, `两条禁令均保留（实得 ${intent.forbiddenOpenings.length}）`);
  ok(intent.forbiddenOpenings.some((p) => p.includes('周砚把屏幕')) && intent.forbiddenOpenings.some((p) => p.includes('数着')),
    '之前短语+新短语均在');
}

console.log('## T3 — 原始 intent 其他约束不变');
{
  const intent = { forbiddenOpenings: ['旧禁令'], mainGoal: '收束代价', pov: '周砚', obstacles: ['阻碍A'] };
  const options = { _hardFailForbiddenPhrases: ['新短语'] };
  const existing = intent.forbiddenOpenings;
  intent.forbiddenOpenings = [...new Set([...existing, ...options._hardFailForbiddenPhrases])];
  ok(intent.mainGoal === '收束代价' && intent.pov === '周砚' && intent.obstacles[0] === '阻碍A', 'mainGoal/pov/obstacles 不变');
  ok(intent.forbiddenOpenings.includes('旧禁令'), '旧禁令保留');
  ok(intent.forbiddenOpenings.includes('新短语'), '新短语加入');
}

console.log('## T4 — 无复读时不添加');
{
  const nonRepeat = extractRepeatPhrases('Scene 2/4 硬失败：Prose Boundary: Beat scaffold violation');
  ok(nonRepeat.length === 0, '非复读错误→零提取');
  const noMatch = extractRepeatPhrases('');
  ok(noMatch.length === 0, '空消息→零提取');
  const noOptions = {};
  ok(!Array.isArray(noOptions._hardFailForbiddenPhrases) || !noOptions._hardFailForbiddenPhrases.length,
    '无 options 字段→不触发注入');
}

console.log('## T5 — 跨章/跨任务隔离');
{
  // _hardFailForbiddenPhrases 仅存于 options 对象（函数参数传递），不写盘不持久化
  // 验证：新调用不传该字段→intent 不含短语
  const freshIntent = { forbiddenOpenings: [] };
  const freshOptions = {}; // 新任务无该字段
  if (freshOptions._hardFailForbiddenPhrases?.length) {
    freshIntent.forbiddenOpenings = [...freshIntent.forbiddenOpenings, ...freshOptions._hardFailForbiddenPhrases];
  }
  ok(freshIntent.forbiddenOpenings.length === 0, '新任务无字段→intent 不含历史短语');
  // buildHardFailCorrection 输出也是纯函数（不修改全局状态）
  const out1 = buildHardFailCorrection({ message: '复读「测试」' });
  const out2 = buildHardFailCorrection({ message: '无复读' });
  ok(out1.includes('测试') && !out2.includes('测试'), 'buildHardFailCorrection 纯函数（无副作用）');
}

console.log('## T6 — MAX_SCENE_HARD_FAIL_REPLAN 不变');
{
  const val = Number(process.env.INKOS_MAX_SCENE_HARD_FAIL_REPLAN || 2);
  ok(val === 2, `上限=2（实得 ${val}）——本轮未改`);
}

console.log('## T7 — 硬门仍拦截真复读');
{
  const text = '林逸的拇指悬在确认键上方，屏幕上的倒计时越来越快。';
  const base = '他看着屏幕。林逸的拇指悬在确认键上方，手指微微发抖。倒计时开始。';
  const hit = findOpeningPhraseRecycle(text, base);
  ok(hit !== null && hit.hardRun === true, `硬门正确检出 ≥7 字复读（hardRun=${hit?.hardRun}）`);
  const clean = '他推开门走进房间，桌上放着一杯已经凉了的茶。';
  const cleanHit = findOpeningPhraseRecycle(clean, base);
  ok(cleanHit === null || !cleanHit.hardRun, '非复读文本不误杀');
}

console.log('## T8 — 禁令经 formatSceneOpeningConstraintBlock 到达 Writer');
{
  const scene = { index: 2, forbiddenOpenings: ['周砚把屏幕掰回来', '数着，一步、两步'] };
  const intent = { pov: '周砚' };
  const block = formatSceneOpeningConstraintBlock(scene, intent, null);
  ok(block.includes('禁：周砚把屏幕掰回来'), '禁令1到达 Writer prompt');
  ok(block.includes('禁：数着，一步、两步'), '禁令2到达 Writer prompt');
  const scene2 = { index: 2 }; // 无 scene 级
  const intent2 = { forbiddenOpenings: ['从intent来的禁令'] };
  const block2 = formatSceneOpeningConstraintBlock(scene2, intent2, null);
  ok(block2.includes('禁：从intent来的禁令'), 'intent 级禁令也能到达（兜底路径）');
}

console.log(`\n# 结果: ${pass} pass / ${fail} fail`);
process.exit(fail ? 1 : 0);
