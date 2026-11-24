/**
 * S6.2 — Historical Timeline Canon Audit（只读，不改磁盘）
 *
 * 对 11_timeline.yaml 逐 event 分类：
 *   A real consequence | B planner skeleton | C goal masquerading | D unknown
 *
 * 并模拟 Writer 读侧：collectTimeline → rankContextForCompiler → prompt
 *
 * Golden 样例（H1–H4）仅作分类断言，不修改 Canon。
 */
import fs from 'node:fs';
import path from 'node:path';
import yaml from 'yaml';
import {
  classifyHistoricalTimelineEvent,
  isCanonicalTimelineEvent,
  collectTimeline,
} from '../packages/inkos-context-ranking/src/index.js';
import { TEMPLATE_FALLBACKS } from '../packages/inkos-brain/src/authored/authored-input-sanitize.js';
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
import { rankContextForCompiler } from '../packages/inkos-context-ranking/src/compiler-rank.js';
import os from 'node:os';

const ROOT = new URL('..', import.meta.url).pathname;
const BOOK_SAI = `${ROOT}books/我的小说/books/赛博修仙我靠玩家暴打克苏鲁旧日神`;
const BOOK_ERSHOU = `${ROOT}books/我的小说/books/二手书店老板的最后一周`;
const B_CLASS = [...TEMPLATE_FALLBACKS];

// classifyHistoricalTimelineEvent 已迁入 @inkos/context-ranking（S6.3 生产门禁）


function loadTimeline(bookDir) {
  const p = path.join(bookDir, 'novel/11_timeline.yaml');
  const doc = yaml.parse(fs.readFileSync(p, 'utf8'));
  return { path: p, days: doc?.days || [], meta: doc?.meta || {} };
}

function auditBook(bookDir, label) {
  const { days, path: tlPath } = loadTimeline(bookDir);
  const byClass = { A: [], B: [], C: [], D: [] };
  const unique = new Map();

  for (const day of days) {
    for (const ev of day.events || []) {
      const key = String(ev).trim();
      if (!key || unique.has(key)) continue;
      const c = classifyHistoricalTimelineEvent(key);
      unique.set(key, { ...c, chapter: day.chapter, day: day.day, sample: key.slice(0, 100) });
      byClass[c.class].push(unique.get(key));
    }
  }

  // Day-entry blobs（Writer ranking 实际消费单位：每 day 一条，events 前 4 条用；拼接）
  const blobs = collectTimeline(days, 17);
  const blobAuditFixed = blobs.map((b) => {
    const parts = b.text.replace(/^Day \d+：/, '').split('；');
    const hits = { A: 0, B: 0, C: 0, D: 0 };
    for (const p of parts) {
      hits[classifyHistoricalTimelineEvent(p).class] += 1;
    }
    return {
      chapter: b.meta?.chapter,
      day: b.meta?.day,
      hasBClass: B_CLASS.some((t) => b.text.includes(t)),
      s61WouldAcceptBlob: isCanonicalTimelineEvent(b.text),
      classMix: hits,
      preview: b.text.slice(0, 100),
    };
  });

  return { label, tlPath, dayCount: days.length, uniqueCount: unique.size, byClass, blobAudit: blobAuditFixed };
}

function simulateWriterTimeline(bookDir, chapter) {
  const ctx = loadBrainContext(bookDir, { chapter });
  let intent;
  try {
    const ap = loadAuthoredChapterPlan(bookDir, chapter);
    if (isAuthoredPlanSpecific(ap)) intent = serializeAuthoredPlanToIntent(ap, chapter, ctx.priorAnchor || null);
    else intent = planChapter(ctx, chapter);
  } catch { intent = planChapter(ctx, chapter); }
  const { causalChain } = runCausalReasoning(bookDir, { chapter });
  intent.causalChain = causalChain;
  const scenes = buildScenePlan(intent);
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 's62-'));
  const scene = { ...scenes[0], causalChain, pov: intent.pov };
  const ranked = rankContextForCompiler({ ...ctx, bookDir: tmp, chapter }, scene, intent, { chapter });
  const compiled = compileScenePrompt({ ...ctx, bookDir: tmp, chapter, intent: { ...intent, causalChain } }, scene);
  fs.rmSync(tmp, { recursive: true, force: true });

  const tlSelected = ranked.bySource.timeline.selected || [];
  const bInPrompt = B_CLASS.filter((t) => compiled.text.includes(t));
  return {
    chapter,
    timelineModule: compiled.modules.some((m) => m.key === 'timeline'),
    selectedCount: tlSelected.length,
    selected: tlSelected.map((e) => ({
      rel: e.scores?.relevance,
      chapter: e.meta?.chapter,
      hasBClass: B_CLASS.some((t) => e.text.includes(t)),
      preview: e.text.slice(0, 140),
    })),
    bClassInPrompt: bInPrompt,
  };
}

// ─── H1–H4 分类断言 ─────────────────────────────────────────
console.log('\n== S6.2 Golden samples (classification only) ==');
let fails = 0;
const assertClass = (label, text, expect) => {
  const got = classifyHistoricalTimelineEvent(text).class;
  if (got !== expect) {
    fails += 1;
    console.error(`  FAIL ${label}: expect ${expect}, got ${got}`);
  } else console.log(`  ok: ${label} → ${expect}`);
};

assertClass('H1 skeleton', '克服阻碍：资源不足或时间压力', 'B');
assertClass('H2 real', '张北失去对青穹重工机甲核心的远程覆写权限', 'A');
assertClass('H3 goal', '完成神级计算器', 'C');
assertClass('H3b goal scaffold', '承接上章推进：场景1：林砚率玩家军团强攻塔顶', 'C');
assertClass('H4 unknown', '某人准备进入禁区', 'D');
assertClass('B exact', '发现型钩子', 'B');

// ─── 赛博全书 audit ─────────────────────────────────────────
console.log('\n== S6.2 Audit: 赛博修仙 ==');
const sai = auditBook(BOOK_SAI, '赛博');
console.log(`  file: ${sai.tlPath}`);
console.log(`  day entries: ${sai.dayCount} | unique event strings: ${sai.uniqueCount}`);
for (const cls of ['A', 'B', 'C', 'D']) {
  console.log(`  ${cls}: ${sai.byClass[cls].length} unique strings`);
}
console.log('\n  B samples:');
for (const x of sai.byClass.B.slice(0, 6)) console.log(`    ch${x.chapter} · ${x.reason} · ${x.sample}`);
console.log('\n  C samples (first 4):');
for (const x of sai.byClass.C.slice(0, 4)) console.log(`    ch${x.chapter} · ${x.sample.slice(0, 90)}…`);

const pollutedDays = sai.blobAudit.filter((b) => b.hasBClass);
console.log(`\n  day-entry blobs with B-class: ${pollutedDays.length}/${sai.blobAudit.length}`);
for (const b of pollutedDays) {
  console.log(`    ch${b.chapter} day${b.day} mix=${JSON.stringify(b.classMix)} · ${b.preview}…`);
}

console.log('\n== Writer read simulation (赛博) ==');
for (const ch of [5, 14, 15, 16, 17]) {
  const sim = simulateWriterTimeline(BOOK_SAI, ch);
  console.log(`  ch${ch}: timelineModule=${sim.timelineModule} selected=${sim.selectedCount} B_in_prompt=[${sim.bClassInPrompt.join('|') || 'none'}]`);
  for (const s of sim.selected.filter((x) => x.hasBClass)) {
    console.log(`    ⚠ selected ch${s.chapter} rel=${s.rel?.toFixed?.(2)} · ${s.preview}`);
  }
}

// ─── 二手书店 audit ─────────────────────────────────────────
console.log('\n== S6.2 Audit: 二手书店 ==');
const es = auditBook(BOOK_ERSHOU, '二手书店');
console.log(`  day entries: ${es.dayCount} | unique events: ${es.uniqueCount}`);
for (const cls of ['A', 'B', 'C', 'D']) console.log(`  ${cls}: ${es.byClass[cls].length}`);
const esSim = simulateWriterTimeline(BOOK_ERSHOU, 1);
console.log(`  ch1 Writer: timeline selected=${esSim.selectedCount} B_in_prompt=[${esSim.bClassInPrompt.join('|') || 'none'}]`);

// ─── S6.2 裁决摘要 ─────────────────────────────────────────
console.log('\n== S6.2 Verdicts ==');
console.log('  V1 历史水库：赛博 ch14–16 day entries 纯 B（4/4 skeleton），Writer ch14–17 仍消费');
console.log('  V2 赛博 unique events：A≈1 / B≈27 / C≈28 / D≈5 —— 绝大多数无 Canon 资格');
console.log('  V3 C 类常包裹真实剧情（承接上章推进/转折：/章末钩子·），但身份是 scene plan，不是已发生事实');
console.log('  V4 读侧无资格过滤：collectTimeline 整 day 拼接 → ranking 选中即可进 Writer');
console.log('  V5 ch5 无 B 类 = ranking 偶然，不是安全默认');
console.log('  V6 禁止全盘清空：C 中嵌套剧情可能是唯一历史摘要；S6.3 应「拒 B + 降权/剥离 C」而非 rm -rf');
console.log('  V7 二手书店：0 B，6/6 C（scene plan as timeline）—— 无模板毒药，但仍非 S6.1 意义下的 consequence');
console.log('  V8 下一步 S6.3：读侧拒绝 B；C/D 默认不进 Writer；仅 A 或经剥离后的真实后果可进');

if (fails) {
  console.error(`\nS6.2 classification samples FAILED: ${fails}`);
  process.exit(1);
}
console.log('\nS6.2 AUDIT COMPLETE (read-only)');
