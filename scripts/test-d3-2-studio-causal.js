/**
 * D3.2 — Studio causal injection gate（Phase 4 · Step 4-D3.2）
 *
 * 硬门槛：同一章 Runtime 与 Studio Writer prompt 中的 causal_chain
 * 必须来自同一个 chapter-level reasoning 结果（共享 ensureChapterCausalChain），
 * 而不是两条路径各自推理出「看起来一样」的东西。
 *
 * 验收：
 *  1. Studio 生产 PromptCompiler（runtime）能看到完整 causal chain
 *  2. options / choice / consequence / new_information / next_pressure 存在
 *  3. actor ≠ POV 正确渲染
 *  4. no_causal_basis 穿透
 *  5. causal chain 改变 → prompt 改变
 *  6. Runtime + Studio 使用同一条链（对象同一 + 因果块文本同一）
 *  7. Causal Reasoning 每章一次（ensure 二次调用 reasoned=false）
 *
 * 不做：authored 清洗 / golden / Director 删除 / Compiler 大一统
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  ensureChapterCausalChain,
  runCausalReasoning,
  TEMPLATE_FALLBACKS,
} from '../packages/inkos-brain/src/causal/causal-reasoner.js';
import { loadBrainContext } from '../packages/inkos-brain/src/loader.js';
import {
  planChapter,
  loadAuthoredChapterPlan,
  isAuthoredPlanSpecific,
  serializeAuthoredPlanToIntent,
} from '../packages/inkos-brain/src/planner/planner.js';
import { buildScenePlan } from '../packages/inkos-brain/src/scene/scene.js';
import { compileScenePrompt, renderCausalChain } from '../packages/inkos-prompt/src/compiler.js';
import { compile as compileStudioPrompt } from '../packages/inkos-runtime/src/compiler/prompt-compiler.js';

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
  if (!String(text).includes(needle)) fail(label, `不含「${needle}」`);
  else ok(label);
}
function assertNotContains(text, needle, label) {
  if (String(text).includes(needle)) fail(label, `意外含「${needle}」`);
  else ok(label);
}

function causalBlock(text) {
  const i = String(text).indexOf('### 因果链');
  if (i < 0) return null;
  return String(text).slice(i);
}

function buildIntent(bookDir, chapter) {
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
    intent = {
      chapter,
      pov: realCtx.pov || '主角',
      mainGoal: realCtx.chapterTask?.['目标'] || '推进章目标',
      obstacles: ['no_causal_basis'],
      scenes: [{ index: 1, goal: '推进章目标', conflict: 'no_causal_basis', beat: 'situation' }],
    };
    console.warn(`  [env] 规划退化（${err?.message || err}）`);
  }
  intent.chapter = chapter;
  return { intent, realCtx };
}

/** Runtime 消费面：inkos-prompt compileScenePrompt */
function compileRuntimeWriter(bookDir, chapter, intent, scene) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'inkos-d32-rt-'));
  const realCtx = loadBrainContext(bookDir, { chapter });
  const ctx = {
    ...realCtx,
    bookDir: tmp,
    intent: { ...(realCtx.intent || {}), ...intent },
  };
  const compiled = compileScenePrompt(ctx, { ...scene, causalChain: intent.causalChain, pov: intent.pov });
  return { text: compiled.text, tmp };
}

/** Studio 生产消费面：runtime PromptCompiler.compile（compileStudioWriterPrompt 的底层） */
function compileStudioWriter(chapter, intent, scene) {
  const sealed = compileStudioPrompt({
    scene: { ...scene, causalChain: scene.causalChain || intent.causalChain },
    chapter,
    intent,
    executionPlan: {
      scenePlan: { goal: scene.goal, obstacle: scene.conflict },
      beats: [{ order: 1, structuralBeat: 'situation', libraryBeat: 'open' }],
    },
    wordBudget: scene.wordTarget || 800,
  });
  return { text: sealed.text, sealed };
}

console.log('\n== D3.2-1: ensureChapterCausalChain 每章一次 + 失败不抛 ==');
{
  const { intent } = buildIntent(BOOK_ERSHOU, 1);
  const a = ensureChapterCausalChain(BOOK_ERSHOU, intent, { chapter: 1 });
  if (!a.reasoned) fail('ensure#1', '首次应 reasoned=true');
  else ok('ensure#1 reasoned=true');
  if (!intent.causalChain) fail('ensure#1', '未挂 intent.causalChain');
  else ok('ensure#1 已挂 intent.causalChain');

  const ref = intent.causalChain;
  const b = ensureChapterCausalChain(BOOK_ERSHOU, intent, { chapter: 1 });
  if (b.reasoned) fail('ensure#2', '已有链时不得再推理');
  else ok('ensure#2 reasoned=false（不重推）');
  if (b.causalChain !== ref || intent.causalChain !== ref) {
    fail('ensure#2', '必须返回同一对象引用');
  } else {
    ok('ensure#2 同一 causalChain 对象引用');
  }

  // provider/投影失败不抛
  const badIntent = { chapter: 1, pov: 'x', scenes: [] };
  let threw = false;
  let c;
  try {
    c = ensureChapterCausalChain('/nonexistent/book/dir', badIntent, { chapter: 1 });
  } catch (err) {
    threw = true;
    fail('ensure fail-soft', err?.message || err);
  }
  if (!threw) {
    if (c.reasoned) fail('ensure fail-soft', '失败路径不应 claimed reasoned');
    else ok('ensure fail-soft：不抛、不伪挂链');
  }
}

console.log('\n== D3.2-2: 硬门槛 — Runtime + Studio 共用同一章级推理结果 ==');
{
  const chapter = 1;
  const { intent } = buildIntent(BOOK_ERSHOU, chapter);
  const scenes = buildScenePlan(intent);

  // 模拟 Runtime 路径：ensure 一次
  const r = ensureChapterCausalChain(BOOK_ERSHOU, intent, { chapter });
  if (!r.reasoned) fail('shared: Runtime ensure', '应推理一次');
  else ok('shared: Runtime ensure reasoned=true');
  const chapterChain = intent.causalChain;

  // 模拟 Studio 路径：同一 intent 再 ensure（生产上 Studio 覆写循环也会调 ensure）
  const s = ensureChapterCausalChain(BOOK_ERSHOU, intent, { chapter });
  if (s.reasoned) fail('shared: Studio ensure', '不得第二次推理');
  else ok('shared: Studio ensure reasoned=false');
  if (intent.causalChain !== chapterChain) fail('shared: 链对象被替换', '');
  else ok('shared: Studio 持有同一章级 causalChain 对象');

  const scene = { ...scenes[0], causalChain: intent.causalChain || null };
  if (scene.causalChain !== chapterChain) fail('shared: scene 挂载', 'scene.causalChain 必须 === intent.causalChain');
  else ok('shared: scene.causalChain === intent.causalChain');

  const rt = compileRuntimeWriter(BOOK_ERSHOU, chapter, intent, scene);
  const st = compileStudioWriter(chapter, intent, scene);
  const blockRt = causalBlock(rt.text);
  const blockSt = causalBlock(st.text);

  if (!blockRt) fail('shared: Runtime prompt', '缺因果块');
  else ok('shared: Runtime prompt 含因果块');
  if (!blockSt) fail('shared: Studio prompt', '缺因果块');
  else ok('shared: Studio prompt 含因果块');

  // 同一 renderCausalChain 输出 → 两路径因果块正文一致（允许周围 prompt 不同）
  const expected = renderCausalChain(chapterChain, scene, { pov: intent.pov || '' });
  if (!expected || !blockRt.includes(expected.split('\n')[0])) {
    fail('shared: Runtime 块', '与 renderCausalChain 不一致');
  } else {
    ok('shared: Runtime 因果块来自 renderCausalChain');
  }
  if (!blockSt.includes(expected.trim())) {
    // Studio 块可能被包在 P1 里，整块应完整出现
    fail('shared: Studio 块', 'P1 未完整嵌入同一 renderCausalChain 输出');
  } else {
    ok('shared: Studio 因果块 === 同一 renderCausalChain 输出');
  }
  if (blockRt.includes(expected.trim()) && blockSt.includes(expected.trim())) {
    ok('shared: 硬门槛成立 — 同一章级链 → 双路径同块');
  }

  fs.rmSync(rt.tmp, { recursive: true, force: true });
}

console.log('\n== D3.2-3: Studio 真书 prompt 七字段 + Options ==');
{
  const chapter = 1;
  const { intent } = buildIntent(BOOK_ERSHOU, chapter);
  ensureChapterCausalChain(BOOK_ERSHOU, intent, { chapter });
  const scenes = buildScenePlan(intent);
  const scene = { ...scenes[0], causalChain: intent.causalChain, pov: intent.pov };
  const { text } = compileStudioWriter(chapter, intent, scene);
  const cb = causalBlock(text);
  if (!cb) fail('studio-fields', '缺因果块');
  else {
    for (const [label, needle] of [
      ['欲望', '欲望（desire）'],
      ['压力', '压力（pressure）'],
      ['Authorial Planned Direction', 'Authorial Planned Direction'],
      ['Authored outcome', 'Authored / Declared outcome'],
      ['新信息', '新信息（new_information）'],
      ['下一压力', '下一压力（next_pressure）'],
    ]) {
      assertContains(cb, needle, `studio-fields: ${label}`);
    }
    if (intent.causalChain.options?.length) {
      assertContains(cb, 'Options（作者给定选项空间）', 'studio-fields: Options');
      intent.causalChain.options.forEach((_, i) => {
        assertContains(cb, `${'ABCDEFGH'[i]}.`, `studio-fields: Options ${'ABCDEFGH'[i]}`);
      });
    } else {
      assertNotContains(cb, '不得另选', 'studio-fields: 无 options 不得「不得另选」');
      ok('studio-fields: options=[]（S8.2-R3）');
    }
  }
}

console.log('\n== D3.2-4: actor ≠ POV（Studio 生产 compiler）==');
{
  const chapter = 5;
  const { intent } = buildIntent(BOOK_SAI, chapter);
  ensureChapterCausalChain(BOOK_SAI, intent, { chapter });
  const scenes = buildScenePlan(intent);
  const scene = { ...scenes[0], causalChain: intent.causalChain, pov: intent.pov };
  const { text } = compileStudioWriter(chapter, intent, scene);
  assertContains(text, '### 因果链', 'ch5 studio: 因果块');
  assertContains(text, '林砚', 'ch5 studio: actor=林砚');
  assertContains(text, '非 POV', 'ch5 studio: 非 POV 注明');
  assertContains(text, '世界角色', 'ch5 studio: 世界角色语义');
}

console.log('\n== D3.2-5: no_causal_basis 穿透（Studio）==');
{
  const chapter = 17;
  const { intent } = buildIntent(BOOK_SAI, chapter);
  ensureChapterCausalChain(BOOK_SAI, intent, { chapter });
  const chain = intent.causalChain;
  if (!chain?.no_causal_basis?.length) fail('ch17', '链应有 no_causal_basis');
  else ok(`ch17: no_causal_basis=${JSON.stringify(chain.no_causal_basis)}`);
  const scenes = buildScenePlan(intent);
  const scene = { ...scenes[0], causalChain: chain, pov: intent.pov };
  const { text } = compileStudioWriter(chapter, intent, scene);
  assertContains(text, 'no_causal_basis', 'ch17 studio: marker 穿透');
  const cb = causalBlock(text);
  const tpl = [...TEMPLATE_FALLBACKS].filter((t) => t && cb?.includes(t));
  if (tpl.length) fail('ch17 studio: causal 块模板', tpl.join(', '));
  else ok('ch17 studio: causal 块零模板补位');
}

console.log('\n== D3.2-6: causal chain 改变 → Studio prompt 改变 ==');
{
  const chapter = 1;
  const { intent } = buildIntent(BOOK_ERSHOU, chapter);
  ensureChapterCausalChain(BOOK_ERSHOU, intent, { chapter });
  const scenes = buildScenePlan(intent);
  const scene = { ...scenes[0], causalChain: intent.causalChain, pov: intent.pov };
  const a = compileStudioWriter(chapter, intent, scene).text;

  const mutated = {
    ...intent.causalChain,
    consequence: {
      ...(intent.causalChain.consequence || {}),
      immediate: `D32_MUTATION_MARKER_${Date.now()}`,
    },
  };
  intent.causalChain = mutated;
  scene.causalChain = mutated;
  const b = compileStudioWriter(chapter, intent, scene).text;
  if (a === b) fail('prompt-delta', '链变更后 Studio prompt 未变');
  else ok('prompt-delta: 链变更 → Studio prompt 改变');
  assertContains(b, 'D32_MUTATION_MARKER_', 'prompt-delta: 新 consequence 进入 prompt');
  // inkos-prompt 侧（Runtime）也应随链变（cache hash / 正文）
  const { causalChain: fresh } = runCausalReasoning(BOOK_ERSHOU, { chapter: 1 });
  const envA = { intent: { ...intent, causalChain: fresh }, scene: { ...scene, causalChain: fresh } };
  const rt1 = compileRuntimeWriter(BOOK_ERSHOU, 1, envA.intent, envA.scene);
  const flipped = {
    ...fresh,
    desire: { ...(fresh.desire || {}), wants: `D32_RT_DELTA_${Date.now()}` },
  };
  const envB = { intent: { ...intent, causalChain: flipped }, scene: { ...scene, causalChain: flipped } };
  const rt2 = compileRuntimeWriter(BOOK_ERSHOU, 1, envB.intent, envB.scene);
  if (rt1.text === rt2.text) fail('prompt-delta rt', 'Runtime prompt 未随链变');
  else ok('prompt-delta: Runtime prompt 亦随链变');
  fs.rmSync(rt1.tmp, { recursive: true, force: true });
  fs.rmSync(rt2.tmp, { recursive: true, force: true });
}

console.log(`\nD3.2 Studio causal gate ${failures === 0 ? 'PASS' : `FAIL（${failures} 项）`}`);
process.exit(failures === 0 ? 0 : 1);
