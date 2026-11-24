/**
 * S6.1 + EO-P2 — plan / modelled causal / scene plan fields ↛ timeline.events
 *
 * Case T1：污染 scene.goal 不得进 events
 * Case T2：no_causal_basis / 骨架 goal 不得写入
 * Case T3：EO-P2 — plan/modelled/scene consequence 亦不得写入（无 Authority Act）
 * Case T4：新 delta 不再把 Planner skeleton 写入 timeline（断闭环）
 *
 * 宁缺勿滥：无 Authority-backed 后果 → events=[]；禁止 mainGoal/scene.goal 顶替。
 */
import {
  buildStateDelta,
  resolveTimelineEvents,
  isActualTimelineEvent,
} from '../packages/inkos-brain/src/memory/state-updater.js';

const B_CLASS = [
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

function assertNoBClass(events, label) {
  const blob = (events || []).join('\n');
  const hits = B_CLASS.filter((t) => blob.includes(t));
  if (hits.length) fail(label, `events 含 B 类：「${hits.join(' | ')}」`);
  else ok(label);
}

function assertNoSkeletonGoals(events, label) {
  const bad = (events || []).filter(
    (e) => /克服阻碍|转折（本 Scene|章末钩子（|进入现场并确立危机/.test(e),
  );
  if (bad.length) fail(label, `仍含骨架：「${bad.join(' | ')}」`);
  else ok(label);
}

// ─── isActualTimelineEvent 单元 ─────────────────────────────
console.log('\n== isActualTimelineEvent 单元 ==');
{
  if (isActualTimelineEvent('克服阻碍：资源不足或时间压力')) fail('u1', '骨架应拒绝');
  else ok('u1: 拒绝「克服阻碍：资源不足…」');
  if (isActualTimelineEvent('克服阻碍：no_causal_basis')) fail('u2', 'no_causal 骨架应拒绝');
  else ok('u2: 拒绝「克服阻碍：no_causal_basis」');
  if (isActualTimelineEvent('no_causal_basis')) fail('u3', 'no_causal_basis 应拒绝');
  else ok('u3: 拒绝 no_causal_basis');
  if (isActualTimelineEvent('发现型钩子')) fail('u4', 'B 类应拒绝');
  else ok('u4: 拒绝 B 类精确串');
  if (isActualTimelineEvent('')) fail('u5', '空串应拒绝');
  else ok('u5: 拒绝空串');
  const real = '林砚失去对青穹重工机甲核心的远程覆写权限';
  if (!isActualTimelineEvent(real)) fail('u6', '真实后果应接受');
  else ok('u6: 接受真实后果');
}

// ─── Case T1 ────────────────────────────────────────────────
console.log('\n== Case T1: 旧污染 scene.goal 不进 timeline.events ==');
{
  const scenes = [
    { goal: '克服阻碍：资源不足或时间压力' },
    { goal: '转折（本 Scene 兑现完整行动线）：关键抉择导致不可逆变化' },
    { goal: '章末钩子（承接转折后果）：发现型钩子' },
  ];
  const events = resolveTimelineEvents({
    intent: { mainGoal: '第17章：神级计算器', pov: '林砚' },
    scenes,
  });
  if (events.length !== 0) fail('T1 empty', `期望 []，得到 ${JSON.stringify(events)}`);
  else ok('T1: events=[]');
  assertNoBClass(events, 'T1: 无 B 类');
  assertNoSkeletonGoals(events, 'T1: 无骨架前缀');

  const delta = buildStateDelta('/tmp/inkos-s61-t1', 17, {
    intent: { mainGoal: '第17章：神级计算器', pov: '林砚', time: 'Day 12' },
    scenes,
    chapterText: '正文'.repeat(20),
  });
  if (delta.timeline.events.some((e) => scenes.some((s) => s.goal === e))) {
    fail('T1 delta', 'scene.goal 仍被写入 timeline.events');
  } else ok('T1: buildStateDelta 未映射 scene.goal');
  assertNoBClass(delta.timeline.events, 'T1 delta: 无 B 类');
}

// ─── Case T2 ────────────────────────────────────────────────
console.log('\n== Case T2: no_causal_basis 不写入 ==');
{
  const scenes = [
    { goal: '克服阻碍：no_causal_basis' },
    { goal: 'no_causal_basis' },
    { goal: '转折（本 Scene 兑现完整行动线）：no_causal_basis' },
  ];
  const events = resolveTimelineEvents({
    intent: { mainGoal: 'no_causal_basis', obstacles: ['no_causal_basis'] },
    scenes,
  });
  if (events.length) fail('T2', `不应写入：${JSON.stringify(events)}`);
  else ok('T2: events=[]');

  const delta = buildStateDelta('/tmp/inkos-s61-t2', 17, {
    intent: { mainGoal: 'no_causal_basis', pov: '林砚' },
    scenes,
  });
  if (delta.timeline.events.includes('no_causal_basis')) {
    fail('T2 delta', 'no_causal_basis 被写入 events');
  } else ok('T2: delta 无 no_causal_basis');
  // 禁止用 mainGoal 顶替空事件
  if (delta.timeline.events.includes('no_causal_basis') || delta.timeline.events.length > 0) {
    // length>0 with only bad would fail above; if mainGoal sneaks in:
  }
  if (delta.timeline.events.some((e) => e === 'no_causal_basis' || /推进主线/.test(e))) {
    fail('T2 mainGoal', '用 mainGoal/推进主线 顶替了 timeline');
  } else ok('T2: 未用 mainGoal 顶替');
}

// ─── Case T3 ────────────────────────────────────────────────
console.log('\n== Case T3: EO-P2 — plan/modelled consequence 不得进 timeline ==');
{
  const real = '角色失去对 X 的访问权；与 A 的关系转为敌对';
  const events = resolveTimelineEvents({
    intent: { mainGoal: '占领数据塔', pov: '林砚' },
    scenes: [
      { goal: '克服阻碍：资源不足或时间压力', consequence: real },
    ],
    causalChain: {
      consequence: {
        immediate: real,
        long_term: '资源进一步减少',
        source: 'test',
      },
    },
  });
  if (events.length !== 0) {
    fail('T3 empty', `EO-P2 期望 []，得到 ${JSON.stringify(events)}`);
  } else ok('T3: plan/modelled/scene consequence → events=[]');
  if (events.some((e) => e.includes('克服阻碍'))) fail('T3 goal leak', 'scene.goal 泄漏');
  else ok('T3: scene.goal 未泄漏');

  const delta = buildStateDelta('/tmp/inkos-s61-t3', 5, {
    intent: {
      mainGoal: '占领环形数据塔',
      pov: '林砚',
      causalChain: { consequence: { immediate: real } },
    },
    scenes: [{ goal: '克服阻碍：信息不完整', consequence: real }],
  });
  if (delta.timeline.events.length !== 0) {
    fail('T3 delta', `EO-P2 delta 不得写入 plan consequence，得到 ${JSON.stringify(delta.timeline.events)}`);
  } else ok('T3: buildStateDelta timeline.events=[]');
  if ((delta.facts || []).length !== 0) {
    fail('T3 facts', `EO-P2 facts 应为空，得到 ${JSON.stringify(delta.facts)}`);
  } else ok('T3: buildStateDelta facts=[] (no L02)');
  assertNoBClass(delta.timeline.events, 'T3 delta: 无 B 类');
}

// ─── Case T4 ────────────────────────────────────────────────
console.log('\n== Case T4: 新写路径切断 skeleton → Canon 闭环 ==');
{
  // 模拟 ch17 收章：历史式污染 scenes + 无真实 consequence
  const pollutedScenes = [
    { goal: '进入现场并确立危机：第17章：神级计算器 **概念战斗**' },
    { goal: '克服阻碍：资源不足或时间压力' },
    { goal: '转折（本 Scene 兑现完整行动线）：关键抉择导致不可逆变化' },
    { goal: '章末钩子（承接转折后果）：发现型钩子' },
  ];
  const delta = buildStateDelta('/tmp/inkos-s61-t4', 17, {
    intent: {
      mainGoal: '第17章：神级计算器 **概念战斗**：混沌之核试图用数学规则抹除玩家',
      pov: '林砚',
      time: 'Day 12',
      present: ['林砚'],
    },
    scenes: pollutedScenes,
    chapterText: 'x'.repeat(100),
  });

  assertNoBClass(delta.timeline.events, 'T4: 新 events 无 B 类');
  assertNoSkeletonGoals(delta.timeline.events, 'T4: 新 events 无骨架');
  if (delta.timeline.events.length !== 0) {
    fail('T4 empty', `无 consequence 时应为空，得到 ${JSON.stringify(delta.timeline.events)}`);
  } else ok('T4: 无真实后果 → events=[]（宁缺勿滥）');

  // 显式：旧逻辑 scenes.map(goal) 不得复现
  const legacyWouldHave = pollutedScenes.map((s) => s.goal);
  const leaked = delta.timeline.events.filter((e) => legacyWouldHave.includes(e));
  if (leaked.length) fail('T4 legacy', `旧 map(goal) 复现：${leaked.join(' | ')}`);
  else ok('T4: 旧 scenes.map(s=>s.goal) 路径已死');

  // 跨章语义：把「本应写入的假历史」当作下章上下文时不得携带 B 类
  // （新 delta 即下章将消费的 Canon 增量；历史磁盘清理属 S6.2+）
  const asNextCtxEvents = delta.timeline.events;
  const crossHits = B_CLASS.filter((t) => asNextCtxEvents.some((e) => e.includes(t)));
  if (crossHits.length) fail('T4 cross', `新 Canon 增量仍含：${crossHits.join(' | ')}`);
  else ok('T4: 新 Canon 增量不会向后章喂 B 类');
}

if (failures) {
  console.error(`\nS6.1 FAILED: ${failures} assertion(s)`);
  process.exit(1);
}
console.log('\nS6.1 PASSED');
