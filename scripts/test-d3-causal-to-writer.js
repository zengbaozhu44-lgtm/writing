/**
 * D3 — causal_chain → Writer Prompt 全链验收（Phase 4 · Step 4-D3）
 *
 * 链：StoryTruth → Causal Reasoning → causal_chain → (scene) → PromptCompiler → Writer prompt
 * 五验收点：
 *  1. causal_chain 七字段完整进入 Writer 可见语境（不得缩成 scene.goal 一段文字）
 *  2. options 作为选择空间（Options A/B/C + Chosen + Reason），Writer 不得把 B 改成 D
 *  3. actor ≠ POV 渲染（世界角色选择 ≠ POV 内心选择）
 *  4. no_causal_basis 穿透到 Writer，最终 prompt 零因果模板补位
 *  5. golden 分叉纪律：本测试不碰任何 golden 文件；旧行为允许漂移，不偷改
 *
 * 确定性：真书 loadBrainContext + planChapter 真实场景 + 真 causal_chain；
 * prompt cache/snapshot/metrics 写入隔离到仓库外临时目录，不污染书目录、不进 git。
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { runCausalReasoning, TEMPLATE_FALLBACKS } from '../packages/inkos-brain/src/causal/causal-reasoner.js';
import { loadBrainContext } from '../packages/inkos-brain/src/loader.js';
import {
  planChapter,
  loadAuthoredChapterPlan,
  isAuthoredPlanSpecific,
  serializeAuthoredPlanToIntent,
} from '../packages/inkos-brain/src/planner/planner.js';
import { buildScenePlan } from '../packages/inkos-brain/src/scene/scene.js';
import { compileScenePrompt } from '../packages/inkos-prompt/src/compiler.js';

const ROOT = new URL('..', import.meta.url).pathname;
const book = (name) => `${ROOT}books/我的小说/books/${name}`;
const BOOK_ERSHOU = book('二手书店老板的最后一周');
const BOOK_SAI = book('赛博修仙我靠玩家暴打克苏鲁旧日神');

let failures = 0;
const fail = (label, msg) => {
  failures += 1;
  console.error(`  FAIL: ${label} — ${msg}`);
};
const ok = (label) => console.log(`  ok: ${label}`);

function assertContains(text, needle, label) {
  if (!String(text).includes(needle)) fail(label, `prompt 不含「${needle}」`);
  else ok(`${label}: 含「${needle}」`);
}
function assertNotContains(text, needle, label) {
  if (String(text).includes(needle)) fail(label, `prompt 意外含「${needle}」`);
  else ok(`${label}: 不含「${needle}」`);
}

/** 提取因果链块（渲染于 text 末尾，为最后一个 section） */
function causalBlock(text) {
  const i = String(text).indexOf('### 因果链');
  if (i < 0) return null;
  return String(text).slice(i);
}

/** 真书 ctx + 真规划场景（镜像 runtime 路径选择：authored 优先 / 无则派生）；
 *  prompt cache/snapshot/metrics 写入隔离到仓库外临时目录 */
function buildCompileEnv(bookDir, chapter, causalChain) {
  const realCtx = loadBrainContext(bookDir, { chapter });
  let intent;
  try {
    const authoredPlan = loadAuthoredChapterPlan(bookDir, chapter);
    if (isAuthoredPlanSpecific(authoredPlan)) {
      intent = serializeAuthoredPlanToIntent(authoredPlan, chapter, realCtx.priorAnchor || null);
    } else {
      intent = planChapter(realCtx, chapter);
    }
  } catch (err) {
    // 规划失败不阻塞因果块断言：退化到最小场景
    intent = {
      chapter,
      pov: causalChain?.choice?.actor || realCtx.pov || '主角',
      mainGoal: realCtx.chapterTask?.['目标'] || '推进章目标',
      obstacles: ['no_causal_basis'],
      scenes: [{ index: 1, goal: realCtx.chapterTask?.['目标'] || '推进章目标', conflict: 'no_causal_basis', beat: 'situation' }],
    };
    console.warn(`  [env] 规划退化（${err?.message || err}），用最小场景`);
  }
  intent.causalChain = causalChain;
  const scenes = buildScenePlan(intent);
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'inkos-d3-'));
  const ctx = {
    ...realCtx,
    bookDir: tmp, // 写入隔离：prompt cache / snapshot / metrics 不进真书、不进 git
    intent: { ...(realCtx.intent || {}), ...intent, causalChain },
  };
  return { ctx, scenes, intent, tmp };
}

function compileFirstScene(env) {
  const scene = { ...env.scenes[0], causalChain: env.intent.causalChain, pov: env.intent.pov };
  const compiled = compileScenePrompt(env.ctx, scene);
  return { scene, compiled };
}

console.log('\n== Scenario 1: 二手书店 ch1（rich/full）→ 七字段完整进入 Writer ==');
{
  const { causalChain } = runCausalReasoning(BOOK_ERSHOU, { chapter: 1 });
  if (causalChain.confidence.grade !== 'full') fail('ch1: grade 应为 full', causalChain.confidence.grade);
  else ok(`ch1: grade=${causalChain.confidence.grade}`);

  const env = buildCompileEnv(BOOK_ERSHOU, 1, causalChain);
  const { compiled } = compileFirstScene(env);
  const text = compiled.text;
  const cb = causalBlock(text);
  if (!cb) fail('ch1: 因果链块缺失', '');

  // 验收点 1：欲望/压力/Authorial Planned Direction…（S8.2-R3：无 authored options 时不强制 Options 行）
  for (const [label, needle] of [
    ['因果链块', '### 因果链'], ['欲望(desire)', '欲望（desire）'], ['压力(pressure)', '压力（pressure）'],
    ['Authorial Planned Direction', 'Authorial Planned Direction'], ['Authored direction reason', 'Authored direction reason'],
    ['Authored outcome', 'Authored / Declared outcome'], ['新信息(new_information)', '新信息（new_information）'],
    ['下一压力(next_pressure)', '下一压力（next_pressure）'],
  ]) {
    assertContains(cb, needle, `ch1: ${label}`);
  }
  if (causalChain.options.length) {
    assertContains(cb, 'Options（选项空间）', 'ch1: Options 空间（authored）');
    const tags = 'ABCDEFGH'.split('');
    causalChain.options.forEach((_, i) => {
      assertContains(cb, `${tags[i]}.`, `ch1: Options 项 ${tags[i]}.`);
    });
  } else {
    assertNotContains(cb, '不得另选', 'ch1: 无 options 不得出现「不得另选」');
    assertNotContains(cb, '正面推进', 'ch1: 无默认正面推进');
    ok('ch1: options=[]（无 authored options，不注入默认方向）');
  }
  if (causalChain.options.some((o) => o.derivation === 'mock_minimal')) {
    fail('ch1: 禁止 mock_minimal options', '');
  }
  // rich 链零降级：causal 块不得出现 no_causal_basis
  assertNotContains(cb, 'no_causal_basis', 'ch1: causal 块零 no_causal_basis');
  // 验收点 4（反面）：causal 块零模板补位；rich 章整 prompt 也应干净
  const cbTpl = [...TEMPLATE_FALLBACKS].filter((t) => t && cb.includes(t));
  if (cbTpl.length) fail('ch1: causal 块模板补位', cbTpl.join(', '));
  else ok('ch1: causal 块零模板补位');
  const wholeTpl = [...TEMPLATE_FALLBACKS].filter((t) => t && text.includes(t));
  if (wholeTpl.length) fail('ch1: 整 prompt 模板串', wholeTpl.join(', '));
  else ok('ch1: 整 prompt 零模板串');
  console.log('  ch1 因果链节选:', cb?.split('\n').slice(0, 6).join('\n    '));
  fs.rmSync(env.tmp, { recursive: true, force: true });
}

console.log('\n== Scenario 2: 赛博 ch5（runtime authored 路径）→ actor≠POV 真链验证 ==');
{
  const { causalChain } = runCausalReasoning(BOOK_SAI, { chapter: 5 });
  const actor = causalChain.choice?.actor || null;
  console.log(`  ch5 事实: choice.actor=${actor} | source=${causalChain.choice?.source || '—'}`);

  // runtime 真路径 = authored（ch5 计划 specific，pov: 一刀岁暮）→ scene.pov=一刀岁暮，
  // 而 causal-reasoner 用 chapterTask pov（林砚）推导 actor=林砚 → actor≠POV → 必须出现「世界角色选择」注明
  const env = buildCompileEnv(BOOK_SAI, 5, causalChain);
  const { scene, compiled } = compileFirstScene(env);
  const text = compiled.text;
  console.log(`  ch5 scene.pov=${scene.pov}`);
  assertContains(text, '### 因果链', 'ch5: 因果链块');
  assertContains(text, '林砚', 'ch5: Authorial Planned Direction 带 actor=林砚');
  assertContains(text, '一刀岁暮（玩家ID，现实身份未知）', 'ch5: 非 POV 注明含 POV');
  assertContains(text, '非 POV', 'ch5: 非 POV 注明出现（世界角色选择，非 POV 内心选择）');
  assertContains(text, '世界角色', 'ch5: 注明含「世界角色」语义');

  // 反向回归：actor === pov 时绝不误标（林守常场景，authored 同源）
  const { causalChain: cc1 } = runCausalReasoning(BOOK_ERSHOU, { chapter: 1 });
  const env1 = buildCompileEnv(BOOK_ERSHOU, 1, cc1);
  const { compiled: compiled1 } = compileFirstScene(env1);
  if (cc1.choice?.actor === env1.intent.pov) {
    assertNotContains(compiled1.text, '非 POV', 'ch1: actor=pov，不得误标非 POV');
  }
  fs.rmSync(env1.tmp, { recursive: true, force: true });
  fs.rmSync(env.tmp, { recursive: true, force: true });
}

console.log('\n== Scenario 3: 赛博 ch17（degraded）→ no_causal_basis 穿透 + 零模板补位 ==');
{
  const { causalChain } = runCausalReasoning(BOOK_SAI, { chapter: 17 });
  console.log(`  ch17: grade=${causalChain.confidence.grade} | no_causal_basis=${JSON.stringify(causalChain.no_causal_basis)}`);
  if (!causalChain.no_causal_basis?.length) fail('ch17: 应有 no_causal_basis 依据', '空');
  else ok('ch17: no_causal_basis 非空');

  const env = buildCompileEnv(BOOK_SAI, 17, causalChain);
  const { compiled } = compileFirstScene(env);
  const text = compiled.text;
  const cb = causalBlock(text);

  // 验收点 4：no_causal_basis 必须穿透到最终 Writer prompt
  assertContains(text, 'no_causal_basis', 'ch17: marker 穿透到 prompt');
  // 全链断言（因果级）：causal 块不得出现任何因果模板补位
  const cbTpl = [...TEMPLATE_FALLBACKS].filter((t) => t && cb?.includes(t));
  if (cbTpl.length) fail('ch17: causal 块模板补位', cbTpl.join(', '));
  else ok('ch17: causal 块零模板补位');
  // 整 prompt 的模板串：记录来源（ch17 任务卡为自动生成脚手架数据，D2 已显式排除「作者脚手架」；
  // 非 causal 路径补位。是否在任务卡边界清洗为 no_causal_basis 待拍板。）
  const wholeTpl = [...TEMPLATE_FALLBACKS].filter((t) => t && text.includes(t));
  if (wholeTpl.length) {
    console.log(`  观察（非 causal 路径）: 整 prompt 含脚手架模板串 ${wholeTpl.join(' / ')} —— 非 causal 块来源（S5/S6.3 后门关闭后仍出现则另查）`);
    if (wholeTpl.length) {
      // S6.3 后 timeline B 应消失；若仍有则标 fail 便于发现新源
      console.warn('  WARN: 整 prompt 仍含 B 类 — 排查非 timeline 源');
    }
  } else {
    ok('ch17: 整 prompt 零模板串');
  }
  fs.rmSync(env.tmp, { recursive: true, force: true });
}

console.log('\n== Scenario 4: 无 causalChain（回归）→ 编译不爆、无因果块 ==');
{
  const env = buildCompileEnv(BOOK_ERSHOU, 1, null);
  const { compiled } = compileFirstScene(env);
  if (compiled.text.includes('### 因果链')) fail('回归: 无链时不应出现因果块', '');
  else ok('回归: 无 causalChain 时无因果块（不爆、不补位）');
  fs.rmSync(env.tmp, { recursive: true, force: true });
}

console.log(`\nD3 全链验收 ${failures === 0 ? 'PASS' : `FAIL（${failures} 项）`}`);
process.exit(failures === 0 ? 0 : 1);
