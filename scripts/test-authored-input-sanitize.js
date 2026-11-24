/**
 * Authored Input Sanitization — S2/S3 门禁
 *
 * S3.1 Case A：ch17 旧 09 —— 模板不进 intent / scenes
 * S3.1 Case D：真实长句含「资源不足」子串 —— 不得误杀
 * S3.2 Case C：有 chapter yaml → event 来自 yaml；无 yaml → 09 fallback
 * S3.3 Case B：required_event 显式槽；禁 goal 升级；禁进 choice.reason
 * S3.4 Case W：09 write provenance（generated / authored / unknown）
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { planChapter } from '../packages/inkos-brain/src/planner/planner.js';
import { loadBrainContext } from '../packages/inkos-brain/src/loader.js';
import { projectStoryTruth } from '../packages/inkos-brain/src/causal/causal-reasoner.js';
import { loadAuthoredChapterPlan } from '../packages/inkos-brain/src/planner/planner.js';
import {
  writeNextChapterTask,
  writeAuthoredChapterTask,
} from '../packages/inkos-brain/src/memory/state-updater.js';
import {
  isTemplateFallback,
  sanitizeAuthoredPlannerField,
  resolveChapterEvent,
  resolveAuthoredRequiredEvent,
  parseChapterTaskProvenance,
  TEMPLATE_FALLBACKS,
} from '../packages/inkos-brain/src/authored/authored-input-sanitize.js';
import { deriveCausalChain } from '../packages/inkos-brain/src/causal/causal-reasoner.js';

const ROOT = new URL('..', import.meta.url).pathname;
const BOOK_SAI = `${ROOT}books/我的小说/books/赛博修仙我靠玩家暴打克苏鲁旧日神`;
const BOOK_ERSHOU = `${ROOT}books/我的小说/books/二手书店老板的最后一周`;

let failures = 0;
const fail = (label, msg) => {
  failures += 1;
  console.error(`  FAIL: ${label} — ${msg}`);
};
const ok = (label) => console.log(`  ok: ${label}`);

function assertNotTemplate(value, label) {
  const s = String(value || '');
  if (isTemplateFallback(s) && s !== 'no_causal_basis') {
    fail(label, `仍为模板脚手架「${s}」`);
  } else if ([...TEMPLATE_FALLBACKS].some((t) => s === t)) {
    fail(label, `精确命中模板「${s}」`);
  } else {
    ok(label);
  }
}

function withTempBook(srcBook, fn) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'inkos-s34-'));
  fs.cpSync(srcBook, tmp, { recursive: true });
  try {
    return fn(tmp);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

console.log('\n== Case D: 真实长句含模板词子串 —— 不得误杀 ==');
{
  const preserved = '角色必须在资源不足的情况下决定是否进入禁区。';
  const out = sanitizeAuthoredPlannerField(preserved);
  if (out !== preserved) fail('Case D', `被误杀：${JSON.stringify(out)}`);
  else ok('Case D: 长句保留');
  if (isTemplateFallback(preserved)) fail('Case D isTemplateFallback', '长句被判模板');
  else ok('Case D: isTemplateFallback=false');
}

console.log('\n== Case A: ch17 planChapter —— 模板不进 intent ==');
{
  const ctx = loadBrainContext(BOOK_SAI, { chapter: 17 });
  const intent = planChapter(ctx, 17);

  if (!intent.mainGoal || intent.mainGoal === 'no_causal_basis') {
    fail('Case A mainGoal', '神级计算器目标应保留');
  } else if (!/神级计算器|概念战斗|位面引擎/.test(intent.mainGoal)) {
    fail('Case A mainGoal', `意外目标：${intent.mainGoal.slice(0, 60)}`);
  } else {
    ok('Case A: mainGoal 保留具体目标');
  }

  for (const [i, obs] of (intent.obstacles || []).entries()) {
    assertNotTemplate(obs, `Case A obstacles[${i}]`);
  }
  assertNotTemplate(intent.turningPoint, 'Case A turningPoint');
  assertNotTemplate(intent.ending, 'Case A ending');
  assertNotTemplate(intent.mustLose, 'Case A mustLose');

  if (intent.turningPoint !== 'no_causal_basis') {
    fail('Case A turningPoint', `应为 no_causal_basis，得 ${intent.turningPoint}`);
  } else ok('Case A: turningPoint=no_causal_basis');
  if (intent.ending !== 'no_causal_basis') {
    fail('Case A ending', `应为 no_causal_basis，得 ${intent.ending}`);
  } else ok('Case A: ending=no_causal_basis');
  if (intent.mustLose !== 'no_causal_basis') {
    fail('Case A mustLose', `应为 no_causal_basis，得 ${intent.mustLose}`);
  } else ok('Case A: mustLose=no_causal_basis');

  const scenePolluted = (intent.scenes || []).some((s) => {
    const blob = `${s.goal || ''} ${s.conflict || ''}`;
    return [...TEMPLATE_FALLBACKS].some((t) => blob.includes(t));
  });
  if (scenePolluted) fail('Case A scenes', 'scene goal/conflict 仍含模板串');
  else ok('Case A: scenes 无模板脚手架');
}

console.log('\n== Case C unit: resolveChapterEvent 优先级 + fallback ==');
{
  const polluted09 = { 目标: 'CH17_EVENT' };
  const r5 = resolveChapterEvent(polluted09, { goal: 'CH5_REAL_EVENT', conflict: 'x' });
  if (r5.event !== 'CH5_REAL_EVENT') fail('Case C unit ch5', `得 ${JSON.stringify(r5)}`);
  else ok('Case C unit: yaml 存在 → event=CH5_REAL_EVENT');
  if (r5.source !== 'authored_plan.goal') fail('Case C unit source', r5.source);
  else ok('Case C unit: source=authored_plan.goal');

  const r17 = resolveChapterEvent(polluted09, null);
  if (r17.event !== 'CH17_EVENT') fail('Case C unit ch17 fallback', `得 ${JSON.stringify(r17)}`);
  else ok('Case C unit: 无 yaml → event=CH17_EVENT（09 fallback）');
  if (r17.source !== 'chapter_task.目标') fail('Case C unit ch17 source', r17.source);
  else ok('Case C unit: source=chapter_task.目标');

  const rEmptyYaml = resolveChapterEvent(polluted09, { conflict: 'only conflict' });
  if (rEmptyYaml.event !== null) fail('Case C unit yaml无goal', `不得回退 09，得 ${rEmptyYaml.event}`);
  else ok('Case C unit: yaml 无 goal → null（09 不得补充）');
}

console.log('\n== Case C integration: 赛博 ch5 yaml vs 09=ch17 ==');
{
  const plan5 = loadAuthoredChapterPlan(BOOK_SAI, 5);
  const st5 = projectStoryTruth(BOOK_SAI, { chapter: 5 });
  const event5 = st5.world_pressure?.event || '';
  const goal5 = plan5?.goal || '';

  if (!goal5) fail('Case C ch5 setup', 'chapter_0005.yaml 无 goal');
  else if (event5 !== goal5) {
    fail('Case C ch5 event', `应为 yaml goal，得 ${event5.slice(0, 60)}…`);
  } else ok('Case C ch5: event === chapter_0005.yaml goal');
  if (/神级计算器|位面引擎/.test(event5)) {
    fail('Case C ch5 pollution', 'event 含 ch17 09 内容');
  } else ok('Case C ch5: 不含 ch17 09 污染');
  if (st5.world_pressure?.eventSource !== 'authored_plan.goal') {
    fail('Case C ch5 eventSource', st5.world_pressure?.eventSource);
  } else ok('Case C ch5: eventSource=authored_plan.goal');
}

console.log('\n== Case C integration: 赛博 ch17 无 yaml → 09 fallback ==');
{
  const plan17 = loadAuthoredChapterPlan(BOOK_SAI, 17);
  const st17 = projectStoryTruth(BOOK_SAI, { chapter: 17 });
  const event17 = st17.world_pressure?.event || '';

  if (plan17) fail('Case C ch17 setup', '不应存在 chapter_0017.yaml');
  else ok('Case C ch17: 无 chapter plan');
  if (!/神级计算器|概念战斗|位面引擎/.test(event17)) {
    fail('Case C ch17 event', `09 fallback 应含 ch17 目标，得 ${event17.slice(0, 60)}…`);
  } else ok('Case C ch17: event 来自 09 current task');
  if (st17.world_pressure?.eventSource !== 'chapter_task.目标') {
    fail('Case C ch17 eventSource', st17.world_pressure?.eventSource);
  }   else ok('Case C ch17: eventSource=chapter_task.目标');
}

console.log('\n== Case B-1: 真正 authored required_event → WorldPressure，不进 choice.reason ==');
{
  const text = '本章必须发生第一次不可逆代价';
  const r = resolveAuthoredRequiredEvent({
    goal: '占领数据塔',
    required_event: text,
  });
  if (r.required_event !== text) fail('B-1 resolve', JSON.stringify(r));
  else ok('B-1: required_event 保留显式槽');
  if (r.source !== 'authored_plan.required_event') fail('B-1 source', r.source);
  else ok('B-1: source=authored_plan.required_event');

  const chain = deriveCausalChain({
    pov: '林砚',
    characters: [{ name: '林砚', desire: '清算仇敌', fear: null, relationship: null }],
    world_pressure: {
      event: '占领数据塔',
      required_event: text,
      requiredEventSource: 'authored_plan.required_event',
      obstacle: '青穹重工阻击',
      cost: '神魂受损',
      authoredChoice: null,
      authoredClimax: '强制解除机甲',
      milestone_required_events: [],
    },
    open_questions: [],
    meta: {},
  });
  if (String(chain.choice?.reason || '').includes(text)) {
    fail('B-1 choice.reason', `不得引用 required_event：${chain.choice.reason}`);
  } else ok('B-1: choice.reason 未引用 required_event');
  if (JSON.stringify(chain).includes('"reason":"' + text)) {
    fail('B-1 leak', 'chain 某处把 required_event 当 reason');
  } else ok('B-1: chain 无 required_event→reason 泄漏');
}

console.log('\n== Case B-2: 只有 goal → required_event=null（禁止升级）==');
{
  const r = resolveAuthoredRequiredEvent({
    goal: '神级计算器 / 概念战斗 / 位面引擎',
  });
  if (r.required_event !== null) fail('B-2', `不得从 goal 升级，得 ${JSON.stringify(r)}`);
  else ok('B-2: 仅 goal → required_event=null');

  const st5 = projectStoryTruth(BOOK_SAI, { chapter: 5 });
  if (st5.world_pressure.required_event != null) {
    fail('B-2 ch5', `真书 ch5 无 required_event 槽，应得 null，得 ${JSON.stringify(st5.world_pressure.required_event)}`);
  } else ok('B-2 ch5: required_event=null（goal 未升级）');
  if (st5.world_pressure.event) ok('B-2 ch5: event 仍来自 yaml goal');
  else fail('B-2 ch5 event', 'event 应保留');
}

console.log('\n== Case B-3: 旧 09 模板 → required_event=null ==');
{
  const st17 = projectStoryTruth(BOOK_SAI, { chapter: 17 });
  if (st17.world_pressure.required_event != null) {
    fail('B-3', `09 模板不得升级，得 ${JSON.stringify(st17.world_pressure.required_event)}`);
  } else ok('B-3: ch17 无 yaml required_event → null');
  // 反向：即使把 B 类串塞进 yaml 槽也必须拒绝
  const rTpl = resolveAuthoredRequiredEvent({
    required_event: '关键抉择导致不可逆变化',
    goal: '具体目标',
  });
  if (rTpl.required_event !== null) fail('B-3 template slot', JSON.stringify(rTpl));
  else ok('B-3: B 类模板写入 required_event 槽仍被拒绝');
}

console.log('\n== Case B-4: 真约束含模板词子串 → 整句保留 ==');
{
  const long = '角色必须在资源不足的情况下完成第一次不可逆选择';
  const r = resolveAuthoredRequiredEvent({ required_event: long });
  if (r.required_event !== long) fail('B-4', `应保留整句，得 ${JSON.stringify(r)}`);
  else ok('B-4: 含「资源不足」的真实长句保留');
  if (isTemplateFallback(long)) fail('B-4 isTemplateFallback', '长句被误判模板');
  else ok('B-4: isTemplateFallback=false');
}

console.log('\n== Case W-1: writeNextChapterTask → generated provenance ==');
{
  withTempBook(BOOK_ERSHOU, (tmp) => {
    const r = writeNextChapterTask(tmp, 2, {
      pov: '林守常',
      mainGoal: 'W1_GOAL',
      obstacles: ['no_causal_basis', 'no_causal_basis'],
      turningPoint: 'no_causal_basis',
      mustLose: 'no_causal_basis',
      ending: 'no_causal_basis',
    }, { force: true });
    if (!r.written) fail('W-1 written', JSON.stringify(r));
    else ok('W-1: written=true');
    const md = fs.readFileSync(path.join(tmp, 'novel/09_current_chapter.md'), 'utf8');
    const p = parseChapterTaskProvenance(md);
    if (p.kind !== 'generated' || p.source !== 'writeNextChapterTask') {
      fail('W-1 provenance', JSON.stringify(p));
    } else ok('W-1: kind=generated source=writeNextChapterTask');
    if (!md.includes('W1_GOAL')) fail('W-1 content', '目标未写入');
    else ok('W-1: 字段已写入');
  });
}

console.log('\n== Case W-2: authored 写入不被 writeNextChapterTask 洗成 generated ==');
{
  withTempBook(BOOK_ERSHOU, (tmp) => {
    writeAuthoredChapterTask(tmp, '# 09 Current Chapter\n\n- **目标**：作者手写约束\n', {
      source: 'studio-user',
    });
    const before = parseChapterTaskProvenance(
      fs.readFileSync(path.join(tmp, 'novel/09_current_chapter.md'), 'utf8'),
    );
    if (before.kind !== 'authored' || before.source !== 'studio-user') {
      fail('W-2 authored stamp', JSON.stringify(before));
    } else ok('W-2: writeAuthoredChapterTask → authored');

    const skip = writeNextChapterTask(tmp, 3, { mainGoal: 'SHOULD_NOT_APPEAR' });
    if (!skip.skipped || skip.reason !== 'authored_preserved') {
      fail('W-2 skip', JSON.stringify(skip));
    } else ok('W-2: writeNextChapterTask 跳过 authored 卡');

    const md = fs.readFileSync(path.join(tmp, 'novel/09_current_chapter.md'), 'utf8');
    if (md.includes('SHOULD_NOT_APPEAR')) fail('W-2 overwrite', 'authored 内容被覆盖');
    else ok('W-2: authored 正文保留');
    if (parseChapterTaskProvenance(md).kind !== 'authored') {
      fail('W-2 kind', 'provenance 被改成 generated');
    } else ok('W-2: provenance 仍为 authored');

    const forced = writeNextChapterTask(tmp, 3, { mainGoal: 'FORCE_OK' }, { force: true });
    if (!forced.written || forced.provenance?.kind !== 'generated') {
      fail('W-2 force', JSON.stringify(forced));
    } else ok('W-2: force=true 可覆盖并标记 generated');
  });
}

console.log('\n== Case W-3: 旧 09 无 provenance → unknown ==');
{
  const legacy = `# 09 Current Chapter\n\n> 自动生成 — 下一章任务卡\n\n- **目标**：旧卡\n`;
  const p = parseChapterTaskProvenance(legacy);
  if (p.kind !== 'unknown' || p.source !== null) fail('W-3 unit', JSON.stringify(p));
  else ok('W-3 unit: 无标记 → unknown（≠ authored/generated）');

  const sai09 = fs.readFileSync(path.join(BOOK_SAI, 'novel/09_current_chapter.md'), 'utf8');
  const pSai = parseChapterTaskProvenance(sai09);
  if (pSai.kind !== 'unknown') fail('W-3 sai', `历史赛博 09 应为 unknown，得 ${JSON.stringify(pSai)}`);
  else ok('W-3: 真书赛博 09 = unknown（不回填）');
}

console.log(`\nAuthored sanitization ${failures === 0 ? 'PASS' : `FAIL（${failures}）`}`);
process.exit(failures === 0 ? 0 : 1);
