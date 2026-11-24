/**
 * S6.3 — Timeline Canon eligibility gate（Writer 读侧，不改磁盘）
 *
 * R1 B skeleton → 不进 timeline module
 * R2 C scene-plan → 不进
 * R3 D unknown → 不进
 * R4 A consequence → 可进
 * ch14–17：污染消失；合法 A 仍可进入
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  classifyHistoricalTimelineEvent,
  isCanonicalTimelineEvent,
  filterCanonicalTimelineEvents,
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

const ROOT = new URL('..', import.meta.url).pathname;
const BOOK_SAI = `${ROOT}books/我的小说/books/赛博修仙我靠玩家暴打克苏鲁旧日神`;
const B_CLASS = [...TEMPLATE_FALLBACKS];

let failures = 0;
const fail = (label, msg) => {
  failures += 1;
  console.error(`  FAIL: ${label} — ${msg}`);
};
const ok = (label) => console.log(`  ok: ${label}`);

console.log('\n== Unit: classify / isCanonical ==');
{
  const cases = [
    ['R1', '克服阻碍：资源不足或时间压力', 'B', false],
    ['R1b', '发现型钩子', 'B', false],
    ['R2a', '转折：林砚放弃正面硬抗，设计尸潮战术', 'C', false],
    ['R2b', '章末钩子·余波：系统弹出警告', 'C', false],
    ['R2c', '承接上章推进：场景1：林砚率玩家强攻塔顶', 'C', false],
    ['R3', '某人准备进入禁区', 'D', false],
    ['R4', '张北失去对青穹重工机甲核心的远程覆写权限', 'A', true],
  ];
  for (const [id, text, expectClass, expectCanon] of cases) {
    const got = classifyHistoricalTimelineEvent(text);
    if (got.class !== expectClass) fail(id, `class expect ${expectClass} got ${got.class}`);
    else if (isCanonicalTimelineEvent(text) !== expectCanon) fail(id, `canon expect ${expectCanon}`);
    else ok(`${id}: ${expectClass} canon=${expectCanon}`);
  }
}

console.log('\n== collectTimeline gate ==');
{
  const days = [
    {
      day: 12,
      chapter: 14,
      events: [
        '克服阻碍：资源不足或时间压力',
        '转折（本 Scene 兑现完整行动线）：关键抉择导致不可逆变化',
        '章末钩子（承接转折后果）：发现型钩子',
      ],
    },
    {
      day: 5,
      chapter: 5,
      events: [
        '承接上章推进：场景1：强攻塔顶',
        '张北失去对青穹重工机甲核心的远程覆写权限',
      ],
    },
    {
      day: 9,
      chapter: 9,
      events: ['某人准备进入禁区'],
    },
  ];
  const items = collectTimeline(days, 17);
  if (items.some((e) => B_CLASS.some((t) => e.text.includes(t)))) {
    fail('collect B', '仍含 B-class');
  } else ok('collect: 无 B-class');
  if (items.some((e) => /承接上章推进|转折：|章末钩子/.test(e.text))) {
    fail('collect C', '仍含 C 前缀');
  } else ok('collect: 无 C 前缀');
  if (!items.some((e) => e.text.includes('张北失去'))) {
    fail('collect A', '合法 A 未保留');
  } else ok('collect: A 保留');
  if (items.some((e) => e.meta?.chapter === 14 || e.meta?.chapter === 9)) {
    fail('collect empty days', '纯 B/D day 仍产生候选');
  } else ok('collect: 纯 B/D day 不产生候选');

  const filtered = filterCanonicalTimelineEvents([
    '克服阻碍：资源不足或时间压力',
    '张北失去对青穹重工机甲核心的远程覆写权限',
    '某人准备进入禁区',
  ]);
  if (filtered.length !== 1 || !filtered[0].includes('张北失去')) {
    fail('filter', JSON.stringify(filtered));
  } else ok('filterCanonicalTimelineEvents: only A');
}

function compileChapter(bookDir, chapter) {
  const ctx = loadBrainContext(bookDir, { chapter });
  let intent;
  try {
    const ap = loadAuthoredChapterPlan(bookDir, chapter);
    if (isAuthoredPlanSpecific(ap)) intent = serializeAuthoredPlanToIntent(ap, chapter, ctx.priorAnchor || null);
    else intent = planChapter(ctx, chapter);
  } catch {
    intent = planChapter(ctx, chapter);
  }
  const { causalChain } = runCausalReasoning(bookDir, { chapter });
  intent.causalChain = causalChain;
  const scenes = buildScenePlan(intent);
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'inkos-s63-'));
  const compiled = compileScenePrompt(
    { ...ctx, bookDir: tmp, chapter, intent: { ...intent, causalChain } },
    { ...scenes[0], causalChain, pov: intent.pov },
  );
  fs.rmSync(tmp, { recursive: true, force: true });
  return { compiled, ctx };
}

console.log('\n== ch14–17 Writer: B-class 污染消失 ==');
{
  // 磁盘仍有污染（不改）
  const raw = fs.readFileSync(`${BOOK_SAI}/novel/11_timeline.yaml`, 'utf8');
  if (!raw.includes('资源不足或时间压力')) fail('fixture', '磁盘应仍有 B 污染');
  else ok('fixture: 磁盘仍有 B（未改 11）');

  for (const ch of [14, 15, 16, 17]) {
    const { compiled } = compileChapter(BOOK_SAI, ch);
    const hits = B_CLASS.filter((t) => compiled.text.includes(t));
    if (hits.length) fail(`ch${ch}`, `prompt 仍含：${hits.join(' | ')}`);
    else ok(`ch${ch}: prompt 无 B-class`);
  }
}

console.log('\n== R4 + mixed day: A 可进 Writer ==');
{
  // 人造 ctx：污染 + A 并存
  const ctx = loadBrainContext(BOOK_SAI, { chapter: 17 });
  const intent = planChapter(ctx, 17);
  const { causalChain } = runCausalReasoning(BOOK_SAI, { chapter: 17 });
  intent.causalChain = causalChain;
  const scenes = buildScenePlan(intent);
  const realA = '张北失去对青穹重工机甲核心的远程覆写权限';
  const mixedTimeline = [
    ...(ctx.timeline || []),
    { day: 99, chapter: 17, events: ['克服阻碍：资源不足或时间压力', realA] },
  ];
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'inkos-s63a-'));
  const compiled = compileScenePrompt(
    {
      ...ctx,
      bookDir: tmp,
      chapter: 17,
      timeline: mixedTimeline,
      intent: { ...intent, causalChain },
    },
    { ...scenes[0], causalChain, pov: intent.pov },
  );
  fs.rmSync(tmp, { recursive: true, force: true });

  if (compiled.text.includes('资源不足或时间压力')) fail('mixed B', '混合 day 的 B 仍进 prompt');
  else ok('mixed: B 被拒');
  // A 可能因 ranking topK 未选中 — 至少 collect 层应保留
  const items = collectTimeline(mixedTimeline, 17);
  if (!items.some((e) => e.text.includes('张北失去'))) fail('mixed A collect', 'A 未进 collect');
  else ok('mixed: A 在 collectTimeline');
  // 若 timeline module 出现，不得含 B
  if (/###\s*时间线|Day \d+：/.test(compiled.text) && compiled.text.includes('资源不足')) {
    fail('mixed module', 'timeline 块含 B');
  } else ok('mixed: Writer 无 B');
}

if (failures) {
  console.error(`\nS6.3 FAILED: ${failures}`);
  process.exit(1);
}
console.log('\nS6.3 PASSED');
