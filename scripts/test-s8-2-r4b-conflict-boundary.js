/**
 * S8.2-R4-B — conflict 表达边界
 *
 * Case 1: 无 authored consequence + conflict infer → Writer 不出现 Choice consequence 语义
 * Case 2: authored consequence → 正常可展示
 * Case 3: conflict.cost 非升格路径 → 不得进入 Choice consequence / arc.consequence
 *
 * 验收重点：搜 Prompt 关键词污染
 */
import {
  buildSceneConflict,
  formatConflictBlock,
} from '../packages/inkos-director/src/conflict-engine.js';
import { buildWriterSceneArc, formatWriterSceneArcBlock } from '../packages/inkos-director/src/writer-scene-arc.js';
import {
  buildWriterExecutionChecklist,
  formatWriterExecutionChecklist,
} from '../packages/inkos-director/src/writer-first.js';

let failures = 0;
const fail = (label, msg) => {
  failures += 1;
  console.error(`  FAIL: ${label} — ${msg}`);
};
const ok = (label) => console.log(`  ok: ${label}`);

const POLLUTE = [
  '付出代价',
  '付出的代价',
  '做成也要付',
  '必失之物',
  '选择导致',
  '必须牺牲',
  '选择后的牺牲',
  '每条路都有代价',
  '任何选择都会伤及',
  '无法回到冲突前',
  '从此无法回头',
];

function assertCleanPrompt(text, label, { allowAuthoredCostLang = false } = {}) {
  const hits = POLLUTE.filter((k) => text.includes(k));
  // authored 路径允许「Authored cost」展示真实代价文案，但仍禁铁律套话
  const bannedAlways = hits.filter((k) => !(allowAuthoredCostLang && /Authored cost/.test(text) && k === '付出代价'));
  // 付出代价永远禁止作为铁律
  if (hits.length) {
    fail(label, `Prompt 污染：${hits.join(' / ')}`);
  } else {
    ok(`${label}: 无污染关键词`);
  }
  void bannedAlways;
}

console.log('== Case 1: 无 authored consequence + conflict infer ==');
{
  const conflict = buildSceneConflict({
    plan: {
      goal: '打开后门',
      choice: '为了妹妹欺骗系统',
      obstacle: '祭司逼近塔顶',
      // 无 consequence
    },
    scene: {},
    intent: { pov: '林夜', keyCharacter: '苏晚' },
    characterDesire: { fear: '失去妹妹' },
    sceneIndex: 2,
    sceneCount: 4,
  });

  if (conflict.irreversibleChange) {
    fail('Case1 irrev', `无 basis 不应发明：${conflict.irreversibleChange}`);
  } else ok('Case1: irreversibleChange 空');

  if (/每条路都有代价|任何选择都会/.test(conflict.opposition || '')) {
    fail('Case1 opposition', conflict.opposition);
  } else ok('Case1: opposition 无选择必伤句');

  if (/拖延或选错|不可逆恶化/.test(conflict.risk || '')) {
    fail('Case1 risk', conflict.risk);
  } else ok('Case1: risk 无默认恶化句');

  const block = formatConflictBlock(conflict);
  assertCleanPrompt(block, 'Case1 formatConflictBlock');
  if (/Choice consequence|Conflict Situation ≠ Choice Consequence/.test(block)) {
    ok('Case1: 边界标注存在');
  } else fail('Case1 边界', block.slice(0, 200));

  if (/付出代价|做成也要付|必失/.test(block)) {
    fail('Case1 代价话术', block);
  } else ok('Case1: 无代价铁律话术');

  const arc = buildWriterSceneArc({
    executionPlan: { scenePlan: { choice: '欺骗系统', consequence: '', _consequenceMissing: true } },
    conflict,
  });
  const consStep = arc.sequence.find((s) => s.id === 'consequence');
  if (consStep?.content && !/missing/.test(consStep.content) && conflict.cost && consStep.content.includes(conflict.cost)) {
    fail('Case1 arc', `conflict.cost 进了 consequence：${consStep.content}`);
  } else ok('Case1: arc.consequence 未吃 conflict.cost');

  const arcBlock = formatWriterSceneArcBlock(arc);
  if (/付出代价/.test(arcBlock)) fail('Case1 arcBlock 付出代价', '');
  else ok('Case1: arcBlock 无「付出代价」');

  // Writer 侧：checklist 若提及 cost/irrev 必须带 not Choice consequence
  const checklist = formatWriterExecutionChecklist(
    buildWriterExecutionChecklist({
      executionPlan: { conflict, scenePlan: {} },
      intent: {},
      chapter: 1,
      sceneIndex: 2,
    }),
  );
  if (conflict.cost && checklist.includes(conflict.cost) && !/not Choice consequence|≠.*Choice consequence/i.test(checklist)) {
    fail('Case1 checklist', 'cost 未标明非 Choice consequence');
  } else ok('Case1: checklist 隔离或无 cost');
}

console.log('== Case 2: authored consequence ==');
{
  const authoredCons = '妹妹知道世界重置，知情状态不可撤销';
  const conflict = buildSceneConflict({
    plan: {
      obstacle: '系统盘问',
      consequence: authoredCons,
      choice: '坦白一部分',
    },
    scene: {},
    intent: { pov: '林夜' },
    sceneIndex: 2,
    sceneCount: 4,
  });

  if (!conflict.costAuthored || conflict.cost !== authoredCons) {
    fail('Case2 cost', JSON.stringify({ cost: conflict.cost, costAuthored: conflict.costAuthored }));
  } else ok('Case2: cost 来自 authored consequence');

  const block = formatConflictBlock(conflict);
  if (!block.includes('Authored cost') || !block.includes(authoredCons.slice(0, 12))) {
    fail('Case2 block', block);
  } else ok('Case2: Prompt 正常渲染 authored cost');

  const arc = buildWriterSceneArc({
    executionPlan: { scenePlan: { consequence: authoredCons } },
    conflict,
  });
  const consStep = arc.sequence.find((s) => s.id === 'consequence');
  if (consStep?.content !== authoredCons) fail('Case2 arc', consStep?.content);
  else ok('Case2: arc.consequence = authored');
}

console.log('== Case 3: conflict.cost 存在但不得进 Choice consequence ==');
{
  // 显式 conflict.cost（authored 于 conflict 槽）——可展示，但 arc/choice consequence 不自动等同
  const conflict = buildSceneConflict({
    plan: {},
    scene: {
      conflict: {
        opponent: '祭司',
        cost: '失去妹妹',
        opposition: '双线危机',
      },
    },
    intent: { pov: '林夜' },
    sceneIndex: 3,
    sceneCount: 4,
  });

  if (conflict.cost !== '失去妹妹') fail('Case3 cost', conflict.cost);
  else ok('Case3: conflict.cost 保留');

  const block = formatConflictBlock(conflict);
  assertCleanPrompt(block, 'Case3 formatConflictBlock');
  if (!/not Choice consequence|≠ Choice Consequence/i.test(block)) {
    fail('Case3 边界', block.slice(0, 180));
  } else ok('Case3: 标明 ≠ Choice consequence');

  const arc = buildWriterSceneArc({
    executionPlan: {
      scenePlan: {
        consequence: '',
        _consequenceMissing: true,
        choice: '救妹妹',
      },
    },
    conflict,
  });
  const consStep = arc.sequence.find((s) => s.id === 'consequence');
  if (consStep?.content?.includes('失去妹妹')) {
    fail('Case3 arc 污染', consStep.content);
  } else ok('Case3:「失去妹妹」未进 arc.consequence');

  // 模拟：plan.consequence 仍 missing 时，Writer 块不得把 cost 写成选择后果铁律
  if (/选择导致|必须牺牲|做成也要付/.test(block)) fail('Case3 选择后果话术', block);
  else ok('Case3: 无选择后果话术');
}

console.log('== Prompt 关键词总扫（infer 默认路径）==');
{
  const conflict = buildSceneConflict({
    plan: { choice: '牺牲自己', obstacle: '门可以打开但是祭司在等' },
    scene: {},
    intent: { pov: '林夜', keyCharacter: '苏晚' },
    characterDesire: { fear: '失去妹妹' },
    climaxRole: { isClimax: true },
    sceneIndex: 4,
    sceneCount: 4,
  });
  const blob = [
    formatConflictBlock(conflict),
    formatWriterSceneArcBlock(buildWriterSceneArc({
      executionPlan: { scenePlan: { choice: '留下退路', _consequenceMissing: true } },
      conflict,
    })),
    // 不把 choice 原文「牺牲…」混进扫描，避免误伤 authored 文本
    JSON.stringify({
      opposition: conflict.opposition,
      risk: conflict.risk,
      cost: conflict.cost,
      irreversibleChange: conflict.irreversibleChange,
      writerMust: conflict.writerMust,
    }),
  ].join('\n');

  for (const k of ['付出代价', '付出的代价', '必失之物', '选择导致', '无法回到冲突前', '承担后果', '做成也要付', '必须牺牲', '选择后的牺牲']) {
    if (blob.includes(k)) fail(`关键词「${k}」`, '');
    else ok(`无「${k}」`);
  }
}

console.log(`\n${failures === 0 ? 'ALL PASS' : `${failures} FAILURE(S)`}`);
process.exit(failures === 0 ? 0 : 1);
