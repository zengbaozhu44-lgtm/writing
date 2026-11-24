/**
 * S5 — 删除 currentChapterMd → chapter_task 整卡注入 + 正式投影 intent.mainGoal
 *
 * Case S5-A：ch17 — 无 09 卡 / 无 09-only B 类；有 canonical mainGoal
 * Case S5-B：ch5 + 09=ch17 — 有 yaml goal；无 ch17 goal / 无 B 类（跨章后门关闭）
 * Case S5-C：二手书店 — 无 chapter-task 空卡骨架、无新 fallback
 * Case S5-D：不把 required_event 扩成 Writer instruction
 *
 * 负向锁：谁把 currentChapterMd 接回 chapter_task，本门禁直接红。
 *
 * Day/timeline 历史模板（S6）不在本轮追杀范围；S5-A 用隔离编译证明 09 路径已死。
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { loadBrainContext } from '../packages/inkos-brain/src/loader.js';
import {
  planChapter,
  loadAuthoredChapterPlan,
  isAuthoredPlanSpecific,
  serializeAuthoredPlanToIntent,
} from '../packages/inkos-brain/src/planner/planner.js';
import { buildScenePlan } from '../packages/inkos-brain/src/scene/scene.js';
import { runCausalReasoning } from '../packages/inkos-brain/src/causal/causal-reasoner.js';
import { compileScenePrompt } from '../packages/inkos-prompt/src/compiler.js';
import { TEMPLATE_FALLBACKS } from '../packages/inkos-brain/src/authored/authored-input-sanitize.js';

const ROOT = new URL('..', import.meta.url).pathname;
const BOOK_SAI = `${ROOT}books/我的小说/books/赛博修仙我靠玩家暴打克苏鲁旧日神`;
const BOOK_ERSHOU = `${ROOT}books/我的小说/books/二手书店老板的最后一周`;

/** 与 polluted 09 对齐的 B 类精确串（负向断言） */
const B_CLASS_EXACT = [
  '资源不足或时间压力',
  '信息不完整',
  '关键抉择导致不可逆变化',
  '时间或身体代价',
  '发现型钩子',
];

let failures = 0;
const fail = (label, msg) => {
  failures += 1;
  console.error(`  FAIL: ${label} — ${msg}`);
};
const ok = (label) => console.log(`  ok: ${label}`);

function resolveIntent(bookDir, chapter, ctx) {
  try {
    const ap = loadAuthoredChapterPlan(bookDir, chapter);
    if (isAuthoredPlanSpecific(ap)) {
      return serializeAuthoredPlanToIntent(ap, chapter, ctx.priorAnchor || null);
    }
  } catch { /* fall through */ }
  return planChapter(ctx, chapter);
}

function compileForChapter(bookDir, chapter, { stripHistory = false } = {}) {
  const realCtx = loadBrainContext(bookDir, { chapter });
  const intent = resolveIntent(bookDir, chapter, realCtx);
  const { causalChain } = runCausalReasoning(bookDir, { chapter });
  intent.causalChain = causalChain;
  const scenes = buildScenePlan(intent);
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'inkos-s5-'));
  const ctx = {
    ...realCtx,
    bookDir: tmp,
    intent: { ...intent, causalChain },
  };
  if (stripHistory) {
    // 隔离 Day/facts（S6）—— 只验证 09→prompt 后门是否关闭
    ctx.facts = [];
    ctx.timeline = '';
    ctx.currentStateMd = '';
    ctx.stateBoard = '';
  }
  const scene = { ...scenes[0], causalChain, pov: intent.pov };
  const compiled = compileScenePrompt(ctx, scene);
  return { compiled, intent, causalChain, realCtx, tmp, scene };
}

function assertNoRaw09Card(text, modules, label) {
  if (modules.some((m) => m.key === 'chapter_task')) {
    fail(label, '仍有 module key=chapter_task（raw 09 后门未删）');
  } else ok(`${label}: 无 chapter_task module`);

  if (/#\s*09\s*Current\s*Chapter/i.test(text)) {
    fail(label, 'prompt 仍含「# 09 Current Chapter」');
  } else ok(`${label}: 无 09 标题`);

  if (/###\s*本章任务/.test(text)) {
    fail(label, 'prompt 仍含「### 本章任务」整卡块');
  } else ok(`${label}: 无「本章任务」块`);

  if (/-\s*\*\*第一阻碍\*\*/.test(text) || /-\s*\*\*第二阻碍\*\*/.test(text)) {
    fail(label, 'prompt 仍含 09 卡字段骨架（第一/第二阻碍）');
  } else ok(`${label}: 无 09 字段骨架`);
}

function assertNoExactBClass(text, label) {
  const hits = B_CLASS_EXACT.filter((t) => text.includes(t));
  if (hits.length) fail(label, `仍含 B 类：「${hits.join(' | ')}」`);
  else ok(`${label}: 无 B 类精确串`);
}

function assertHasChapterGoalModule(compiled, mainGoal, label) {
  const mod = compiled.modules.find((m) => m.key === 'chapter_goal');
  if (!mod) {
    fail(label, '缺少 module key=chapter_goal');
    return;
  }
  ok(`${label}: 有 chapter_goal module`);
  if (!/###\s*本章目标/.test(compiled.text)) {
    fail(label, '缺少「### 本章目标」块');
  } else ok(`${label}: 有「本章目标」块`);
  const g = String(mainGoal || '').trim();
  if (g && !compiled.text.includes(g)) {
    fail(label, `prompt 未投影完整 mainGoal（截断或丢失）`);
  } else if (g) ok(`${label}: mainGoal 完整投影`);
}

// ─── Case S5-A ─────────────────────────────────────────────
console.log('\n== Case S5-A: ch17 — 删 raw 09，保留 canonical goal ==');
{
  // 隔离编译：证明 09 路径关闭后 B 类全部消失（不受 S6 Day 干扰）
  const iso = compileForChapter(BOOK_SAI, 17, { stripHistory: true });
  try {
    assertNoRaw09Card(iso.compiled.text, iso.compiled.modules, 'S5-A iso');
    assertNoExactBClass(iso.compiled.text, 'S5-A iso B-class');
    if (!/神级计算器|概念战斗|位面引擎/.test(iso.compiled.text)) {
      fail('S5-A iso goal', '缺少神级计算器/概念战斗/位面引擎');
    } else ok('S5-A iso: 有章级目标关键词');
    assertHasChapterGoalModule(iso.compiled, iso.intent.mainGoal, 'S5-A iso');
    // 09 原文仍在 ctx，但不得进 prompt
    if (!iso.realCtx.currentChapterMd?.includes('资源不足或时间压力')) {
      fail('S5-A fixture', '预期磁盘 09 仍含模板（测后门关闭）');
    } else ok('S5-A: 磁盘 09 仍污染，但 prompt 已隔离');
  } finally {
    fs.rmSync(iso.tmp, { recursive: true, force: true });
  }

  // 全量编译：负向锁 09 卡；09-only 模板必须消失；Day 残留仅记录
  const full = compileForChapter(BOOK_SAI, 17, { stripHistory: false });
  try {
    assertNoRaw09Card(full.compiled.text, full.compiled.modules, 'S5-A full');
    assertHasChapterGoalModule(full.compiled, full.intent.mainGoal, 'S5-A full');
    const onlyFrom09 = ['信息不完整', '时间或身体代价'];
    const leaked = onlyFrom09.filter((t) => full.compiled.text.includes(t));
    if (leaked.length) fail('S5-A full 09-only', `仍泄漏：「${leaked.join(' | ')}」`);
    else ok('S5-A full: 09-only B 类已消失');
    const dayResidual = ['资源不足或时间压力', '关键抉择导致不可逆变化', '发现型钩子']
      .filter((t) => full.compiled.text.includes(t));
    if (dayResidual.length) {
      fail('S5-A full Day residual', `S6.3 后门应已关，仍见：${dayResidual.join(' | ')}`);
    } else {
      ok('S5-A full: 无 Day/timeline B 残留（S6.3 Canon gate）');
    }
  } finally {
    fs.rmSync(full.tmp, { recursive: true, force: true });
  }
}

// ─── Case S5-B ─────────────────────────────────────────────
console.log('\n== Case S5-B: ch5 yaml + 09=ch17 — 跨章后门关闭 ==');
{
  const { compiled, intent, realCtx, tmp } = compileForChapter(BOOK_SAI, 5);
  try {
    assertNoRaw09Card(compiled.text, compiled.modules, 'S5-B');
    assertNoExactBClass(compiled.text, 'S5-B');

    const yamlGoal = '占领环形数据塔，获取第一块位面碎片';
    if (!compiled.text.includes(yamlGoal) && !String(intent.mainGoal || '').includes('占领环形数据塔')) {
      fail('S5-B yaml', 'intent/prompt 缺少 ch5 yaml goal');
    } else if (!compiled.text.includes('占领环形数据塔')) {
      fail('S5-B yaml prompt', 'prompt 未投影 ch5 yaml/mainGoal');
    } else ok('S5-B: 有 ch5 yaml goal');

    // 磁盘 09 仍是 ch17
    if (!/神级计算器/.test(realCtx.currentChapterMd || '')) {
      fail('S5-B fixture', '预期 09 仍为 ch17 卡');
    } else ok('S5-B: 磁盘 09=ch17（污染源仍在）');

    if (/神级计算器|位面引擎|概念战斗/.test(compiled.text)) {
      fail('S5-B cross-chapter', 'prompt 仍含 ch17 goal（跨章后门）');
    } else ok('S5-B: 无 ch17 goal');

    assertHasChapterGoalModule(compiled, intent.mainGoal, 'S5-B');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

// ─── Case S5-C ─────────────────────────────────────────────
console.log('\n== Case S5-C: 二手书店 — 空 09 不注入骨架 ==');
{
  const { compiled, intent, realCtx, tmp } = compileForChapter(BOOK_ERSHOU, 1);
  try {
    assertNoRaw09Card(compiled.text, compiled.modules, 'S5-C');
    if (/上限\s*300\s*字/.test(compiled.text)) {
      fail('S5-C', '仍出现空卡「上限 300 字」骨架');
    } else ok('S5-C: 无空卡骨架');
    // 不得因删 09 而发明新的 chapter-task fallback 文案
    if (/本章任务卡|下一章任务卡|自动生成\s*—\s*下一章/.test(compiled.text)) {
      fail('S5-C', '出现新的 chapter-task fallback 文案');
    } else ok('S5-C: 无新 fallback 文案');
    // 空 09 时 mainGoal 应来自别的 canonical；有则投影，无则不强造
    const g = String(intent.mainGoal || '').trim();
    if (g && g !== 'no_causal_basis') {
      assertHasChapterGoalModule(compiled, g, 'S5-C');
    } else {
      if (compiled.modules.some((m) => m.key === 'chapter_goal')) {
        fail('S5-C', 'mainGoal 空却注入了 chapter_goal');
      } else ok('S5-C: mainGoal 空 → 不注入 chapter_goal');
    }
    if (!realCtx.currentChapterMd?.includes('09 Current Chapter')) {
      fail('S5-C fixture', '预期磁盘有空 09 模板');
    } else ok('S5-C: 磁盘空 09 存在但不进 prompt');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

// ─── Case S5-D ─────────────────────────────────────────────
console.log('\n== Case S5-D: required_event 不扩成 Writer instruction ==');
{
  const { compiled, causalChain, tmp } = compileForChapter(BOOK_SAI, 5);
  try {
    if (compiled.modules.some((m) => /required_event/i.test(m.key) || /required.?event/i.test(m.label || ''))) {
      fail('S5-D', '出现 required_event prompt module');
    } else ok('S5-D: 无 required_event module');
    if (/###\s*required_event|必须事件\s*[:：]|Writer.*required_event/i.test(compiled.text)) {
      fail('S5-D', 'prompt 出现 required_event Writer 指令块');
    } else ok('S5-D: 无 required_event Writer 指令块');
    // WorldPressure 可有 required_event；只要没当 Writer instruction 扩进去即可
    const re = causalChain?.world_pressure?.required_event
      || causalChain?.storyTruth?.world_pressure?.required_event;
    if (re) {
      console.log(`  note: StoryTruth 可有 required_event（S3.3），本轮不进 Writer 专用块`);
    }
    ok('S5-D: S3.3 边界保持');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

// ─── Negative: TEMPLATE_FALLBACKS 集合与断言列表一致 ─────────
console.log('\n== Negative lock: B_CLASS ⊆ TEMPLATE_FALLBACKS ==');
{
  const missing = B_CLASS_EXACT.filter((t) => ![...TEMPLATE_FALLBACKS].includes(t));
  if (missing.length) fail('neg lock', `B_CLASS 不在 TEMPLATE_FALLBACKS：${missing.join(',')}`);
  else ok('B_CLASS 均在 TEMPLATE_FALLBACKS');
}

if (failures) {
  console.error(`\nS5 FAILED: ${failures} assertion(s)`);
  process.exit(1);
}
console.log('\nS5 PASSED');
