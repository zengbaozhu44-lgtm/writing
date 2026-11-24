#!/usr/bin/env node
// ============================================================================
// IRP v0.1 · Pilot — 1 章协议化 A/B 对比 + 泄漏检查
// ----------------------------------------------------------------------------
// 目的（docs/inkos-intent-rendering-protocol-v0.1.md 第 7 节验收标准）：
//   同一大纲（ch2）：
//     A) 纯文本 plan（committed chapter_0002.yaml）
//     B) 协议化 plan（生成器 IRP v0.1 渲染，前缀进 serializer 白名单）
//   各跑一次真实生产 writer（createStudioLlmWriter → Beat Execution → DeepSeek），
//   对比：
//     1. 正文差异（缺口推进感 / 角色一致性）
//     2. 括号泄漏（正文 grep 不到 【】/gap_0XX/指令词）
//     3. 前缀是否真的到模型（per-beat userPrompt grep）
//     4. 防复读硬失败闸（hardFail / needsHumanReview 计数）
//
// 隔离：把整本书拷到 /tmp/inkos-pilot-ab-book 再跑，不污染真实书运行状态。
//
// 用法：
//   node _tools/pilot-protocol-ab.mjs            # scene 1,2 双变体
//   node _tools/pilot-protocol-ab.mjs --scenes 1,2,3
//   node _tools/pilot-protocol-ab.mjs --scenes 1
// ============================================================================

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BOOK = path.resolve(__dirname, '..'); // 二手书店老板的最后一周
const TMP = path.join(os.tmpdir(), 'inkos-pilot-ab-book');
const PREFIXED_PLAN = path.join(os.tmpdir(), 'inkos-pilot', 'chapter_0002_prefixed.yaml');

const args = process.argv.slice(2);
const scenesArg = args.find((a) => a.startsWith('--scenes'));
const SCENES = scenesArg ? scenesArg.split('=')[1].split(',').map(Number) : [1, 2];
const rateArg = args.find((a) => a.startsWith('--rate'));
const RATE = rateArg ? Number(rateArg.split('=')[1] || 1) : 1; // >1 = 场景1重复次数（算硬失败率）
const SAMPLE = args.includes('--sample'); // 每个变体重试到拿到一份成功正文（上限 6 次）

const OUT_DIR = path.join(os.tmpdir(), 'inkos-pilot-ab');

import { readYaml } from '../../../../../packages/inkos-core/src/lib/yaml-store.js';
import { serializeAuthoredPlanToIntent } from '../../../../../packages/inkos-brain/src/planner/planner.js';
import { applyStoryMapToIntent } from '../../../../../packages/inkos-brain/src/planner/story-map.js';
import { loadBrainContext } from '../../../../../packages/inkos-brain/src/loader.js';
import { buildScenePlan, buildSceneWritePrompt } from '../../../../../packages/inkos-brain/src/scene/scene.js';
import { buildDynamicPrompt } from '../../../../../packages/inkos-brain/src/prompt/dynamic-prompt.js';
import { createStudioLlmWriter } from '../../../../../packages/inkos-studio-server/src/studio-llm-writer.js';

const CHAPTER = 2;

// ---------------------------------------------------------------------------
// 0. 隔离：拷贝整本书到临时目录（含 novel/_system 供 writer 读写状态）
// ---------------------------------------------------------------------------
function prepTempBook() {
  fs.rmSync(TMP, { recursive: true, force: true });
  fs.cpSync(BOOK, TMP, { recursive: true });
  console.log(`[pilot] 隔离书目录：${TMP}`);
}

// ---------------------------------------------------------------------------
// 1. 两份 plan：纯文本（committed）+ 协议化（生成器渲染）
// ---------------------------------------------------------------------------
function loadPlans() {
  const plain = readYaml(path.join(BOOK, 'novel/_system/chapter_plans/chapter_0002.yaml'));
  if (!fs.existsSync(PREFIXED_PLAN)) {
    const r = spawnSync(process.execPath, ['_tools/generate-chapter-plan.mjs', '2', '--out', PREFIXED_PLAN], {
      cwd: BOOK,
      encoding: 'utf8',
    });
    if (r.status !== 0) throw new Error(`生成器失败：${r.stderr || r.stdout}`);
  }
  const prefixed = readYaml(PREFIXED_PLAN);
  return { plain, prefixed };
}

// ---------------------------------------------------------------------------
// 2. 构造真实生产 intent + ctx + scene.prompt（与 orchestrator 同构）
// ---------------------------------------------------------------------------
function buildSceneRun(plan, sceneIndex) {
  const intent = serializeAuthoredPlanToIntent(plan, CHAPTER, null, null);
  applyStoryMapToIntent(intent, TMP, CHAPTER);
  intent.scenes = buildScenePlan(intent);
  const ctx = loadBrainContext(TMP, { chapter: CHAPTER, pov: intent.pov });
  const scene = intent.scenes[sceneIndex - 1];
  if (!scene) throw new Error(`无 scene ${sceneIndex}`);
  const dynamicPrompt = buildDynamicPrompt(ctx, scene);
  scene.prompt = buildSceneWritePrompt(ctx, intent, scene, dynamicPrompt);
  scene.dynamic = dynamicPrompt;
  return { intent, ctx, scene };
}

// ---------------------------------------------------------------------------
// 3. 泄漏 / 前缀到达检查
// ---------------------------------------------------------------------------
const LEAK_RE = /【|】|gap_\d+|节拍功能|认知缺口|钩子类型|角色代价|伏笔回收|新伏笔|IRP|v0\.1/u;

function leakCheck(text) {
  const m = text ? text.match(LEAK_RE) : null;
  return m ? { leaked: true, sample: text.slice(Math.max(0, m.index - 15), m.index + 15) } : { leaked: false };
}

function promptReach(userPrompts, needles) {
  const joined = userPrompts.join('\n');
  const hits = {};
  for (const n of needles) hits[n] = joined.includes(n);
  return hits;
}

// ---------------------------------------------------------------------------
// 4. 主流程
// ---------------------------------------------------------------------------
async function runVariant(label, plan) {
  const writer = createStudioLlmWriter(TMP, 'pilot-ab', null);
  const out = { label, scenes: [] };
  const sceneIndexes = RATE > 1 ? [1] : SCENES; // rate 模式只跑场景 1，重复 RATE 次
  for (const sceneIndex of sceneIndexes) {
    const runs = RATE > 1 ? Array.from({ length: RATE }, (_, i) => i + 1) : [1];
    for (const run of runs) {
      const { intent, ctx, scene } = buildSceneRun(plan, sceneIndex);
      const record = { index: sceneIndex, run, beats: [] };
      try {
        scene.text = null;
        const text = await writer({ scene, prompt: scene.prompt, chapter: CHAPTER, bookDir: TMP, ctx, intent });
        record.text = text;
        record.textLen = String(text || '').replace(/\s/g, '').length;
      } catch (err) {
        record.error = err.message;
      }
      const beats = scene.beatArtifacts || [];
      record.hardFailCount = beats.filter((b) => b.needsHumanReview).length;
      // _reopenedDraft 不进 beatArtifacts → 从 validation 的 continuity issues 反推重开
      const REOPEN_RE = /ACTION_REPLAY|EVENT_LOOP|REPEAT_REVEAL|场景跳跃|禁止重新开场|禁止重启开场/u;
      const reopenCount = (b) => {
        const v = JSON.stringify(b.validation || b.runtimeV2 || '');
        return REOPEN_RE.test(v) ? 1 : 0;
      };
      record.reopenedCount = beats.reduce((n, b) => n + reopenCount(b), 0);
      record.beats = beats.map((b) => ({
        order: b.order,
        libraryBeat: b.libraryBeat,
        chars: b.chars || 0,
        needsHumanReview: b.needsHumanReview,
        degraded: b.degraded,
        reopened: b._reopenedDraft,
        prompt: String(b.userPrompt || b.prompt || ''),
        text: String(b.text || ''),
        validation: b.validation || null,
      }));
      out.scenes.push(record);
      fs.mkdirSync(OUT_DIR, { recursive: true });
      fs.writeFileSync(path.join(OUT_DIR, `${label}-s${sceneIndex}-r${run}.json`), JSON.stringify(record, null, 2));
      console.log(`[pilot] ${label} · scene ${sceneIndex} · run ${run} → ${record.error ? `HARD_FAIL ${record.error.slice(0, 90)}` : `${record.textLen} 字 / ${record.beats.length} beats（重开稿 ${record.reopenedCount}）`}`);
    }
  }
  return out;
}

function summarize(out) {
  for (const s of out.scenes) {
    const leaks = s.beats.filter((b) => leakCheck(b.text).leaked);
    const finalLeak = leakCheck(s.text);
    const promptHits = promptReach(
      s.beats.map((b) => b.prompt),
      ['【主线推进', '【缺口管理', '【节拍功能', '【认知缺口', 'gap_002', '【角色代价', '【钩子类型', '【新伏笔'],
    );
    const hardFail = s.beats.filter((b) => b.needsHumanReview);
    console.log(`\n── ${out.label} · scene ${s.index} ──`);
    console.log(`  正文 ${s.textLen} 字 · ${s.beats.length} beats · 最终泄漏: ${finalLeak.leaked ? `是「${finalLeak.sample}」` : '无'}`);
    console.log(`  逐 beat 泄漏: ${leaks.length ? leaks.map((b) => `b${b.order}`).join(',') : '无'}`);
    console.log(`  前缀到模型: ${Object.entries(promptHits).filter(([, v]) => v).map(([k]) => k).join(', ') || '无'}`);
    console.log(`  防复读闸: hardFail 场景=${s.hardFailCount} · needsHumanReview beats=${hardFail.map((b) => `b${b.order}`).join(',') || '无'}`);
    const diffText = s.text || '';
    if (diffText) console.log(`  正文预览: ${diffText.slice(0, 160).replace(/\n/g, ' ')}…`);
  }
}

async function main() {
  prepTempBook();
  const { plain, prefixed } = loadPlans();
  if (RATE > 1) {
    console.log(`[pilot] 率实验：scene 1 × ${RATE} 轮 × 2 变体（算硬失败率）`);
    const a = await runVariant('纯文本(plain)', plain);
    const b = await runVariant('协议化(prefixed)', prefixed);
    console.log('\n================ 硬失败率报告 ================');
    for (const o of [a, b]) {
      const fails = o.scenes.filter((s) => s.error).length;
      const opens = o.scenes.reduce((n, s) => n + (s.reopenedCount || 0), 0);
      const needsHR = o.scenes.filter((s) => s.hardFailCount).length;
      console.log(`${o.label}: 硬失败 ${fails}/${o.scenes.length} · 重开稿 beat 命中 ${opens} · 含 needsHumanReview beat 的场景 ${needsHR}`);
    }
    console.log('\n[结果] 率差异是否显著：看两变体硬失败数差距（≥2 才算提示信号；n 小仅作参考）');
    console.log(`[结果] 详情 JSON 在 ${OUT_DIR}/`);
    return;
  }
  if (args.includes('--disambig')) {
    // 消歧实验：把【节拍功能】从场景文本（每 beat 重复注入）挪到 chapter goal
    // （仅 beat1 的「章目标（导航）」槽）。若 C_once 的重开率≈plain << prefixed-full，
    // 则「【节拍功能: setup】逐 beat 重申入场锚」是重开放大器，once-only 渲染可行。
    console.log('[pilot] 消歧：prefixed-full vs C_once(节拍功能→goal) vs plain · scene 1 × 3');
    const once = structuredClone(prefixed);
    once.goal = once.goal.replace(/^【主线推进】/, '【主线推进】【节拍功能: setup】');
    once.scenes[0] = once.scenes[0].replace(/【节拍功能: [^】]+】/u, '');
    const ENTRY_RE = /^(小满|林守常推开|门缝|门里|影子|阳光|门外|门被|他推开|有人)/u;
    const runStats = [];
    for (const [label, plan] of [
      ['prefixed-full', prefixed],
      ['C_once(节拍→goal)', once],
      ['plain', plain],
    ]) {
      let fail = 0, entries = [], results = [];
      for (let i = 0; i < 3; i++) {
        const o = await runVariant(label, plan);
        const r = o.scenes[0];
        const restart = r.beats.slice(1).filter((b) => ENTRY_RE.test(String(b.text).trim().slice(0, 8))).length;
        if (r.error) fail++;
        results.push({ ok: !r.error, len: r.textLen || 0, restart });
        entries.push(restart);
      }
      runStats.push({ label, fail, entries });
      console.log(`  ${label}: 硬失败 ${fail}/3 · beats2-6 入场式重开 ${entries.join(', ')}`);
    }
    console.log('\n[结果] 若 C_once 重开数明显低于 prefixed-full 且≈plain → 重复注入【节拍功能】是放大器，once-only 修复有效');
    console.log(`[结果] 详情 JSON 在 ${OUT_DIR}/`);
    return;
  }
  if (SAMPLE) {
    console.log('[pilot] 采样模式：每变体重试 scene 1 直到成功（上限 6 次），保存成功正文供 A/B 对比');
    for (const [label, plan] of [['纯文本(plain)', plain], ['协议化(prefixed)', prefixed]]) {
      let ok = null;
      for (let i = 1; i <= 6 && !ok; i++) {
        const o = await runVariant(label, plan);
        ok = o.scenes[0].error ? null : o.scenes[0];
        console.log(`  → 第 ${i} 次：${ok ? '成功' : '硬失败'}`);
      }
      if (ok) {
        console.log(`\n──── ${label} · 成功正文（${ok.textLen} 字）────\n${ok.text}\n`);
        fs.writeFileSync(path.join(OUT_DIR, `sample-${label}.txt`), ok.text);
      } else {
        console.log(`\n──── ${label} · 6 次全部硬失败（该模型对本章 scene 1 重开倾向极强）────\n`);
      }
    }
    return;
  }
  console.log(`[pilot] ch${CHAPTER} · scenes ${SCENES.join(',')} · 双变体 A/B`);
  const a = await runVariant('纯文本(plain)', plain);
  const b = await runVariant('协议化(prefixed)', prefixed);
  console.log('\n================ A/B 报告 ================');
  summarize(a);
  summarize(b);

  // 交叉泄漏汇总
  const allLeaks = [a, b].flatMap((o) => o.scenes.flatMap((s) => s.beats.filter((b) => leakCheck(b.text).leaked)));
  console.log(`\n[结果] 括号泄漏 beats 总数: ${allLeaks.length}（0 = 模型消费干净）`);
  const hardFails = [a, b].flatMap((o) => o.scenes.filter((s) => s.error || s.hardFailCount));
  console.log(`[结果] 硬失败/异常 scene 数: ${hardFails.length}（0 = 无防复读闸误伤）`);
  console.log(`[结果] 详情 JSON 在 ${OUT_DIR}/`);
}

main().catch((err) => {
  console.error('[pilot] 失败:', err);
  process.exit(1);
});
