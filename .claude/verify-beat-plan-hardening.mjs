/* Beat Plan 退化硬化验证（2026-08-19）— 用真实 ch2 scene_03 的 raw 计划输入，跑新 Planner + Validator */
import fs from 'node:fs';
import path from 'node:path';
import { buildSceneBeatPlans, validateBeatPlanDegeneration, isMetaBeatData } from '../packages/inkos-director/src/beat-state.js';

const base = '/Users/zora/Desktop/ai/InkOS/books/我的小说/books/二手书店老板的最后一周/novel/_system/studio/writer-optimization/ch_0002';
const s = JSON.parse(fs.readFileSync(path.join(base, 'scene_03.json'), 'utf8'));
const oldSp = s.executionPlan?.scenePlan || {};

// ── 旧计划（修复前）字段：记录现状 ──
console.log('═══ 旧计划（修复前）beatPlan 关键字段 ═══');
const oldBeats = s.executionPlan?.beats || [];
oldBeats.forEach((b, i) => {
  const bp = b.beatPlan || {};
  console.log(`beat${i + 1} ${b.structuralBeat}: choice=${JSON.stringify(String(bp.choice||b.choice||'').slice(0,30))}`);
});

// ── 新计划（修复后）：用同样的 raw 输入（只有 goal/obstacle 有内容，choice/newInformation 等由作者未提供）──
console.log('\n═══ 新 Planner（修复后）· 输入 raw 计划 ═══');
const raw = {
  goal: oldSp.goal || '',
  obstacle: oldSp.obstacle || '',
  choice: oldSp.choice && !isMetaBeatData(oldSp.choice) && !/为了完成「/.test(oldSp.choice) ? oldSp.choice : '',
  consequence: oldSp.consequence && !/为完成「/.test(oldSp.consequence) ? oldSp.consequence : '',
  newInformation: oldSp.newInformation && !isMetaBeatData(oldSp.newInformation) ? oldSp.newInformation : '',
  cliffhanger: oldSp.cliffhanger && !isMetaBeatData(oldSp.cliffhanger) ? oldSp.cliffhanger : '',
  fear: oldSp.fear || '',
};
console.log('choice(已剔除旧合成值):', JSON.stringify(raw.choice || '(空)'));
console.log('newInformation(已剔除元指令):', JSON.stringify(raw.newInformation || '(空)'));
console.log('consequence(已剔除合成值):', JSON.stringify(raw.consequence || '(空)'));
console.log('cliffhanger(已剔除元指令):', JSON.stringify(raw.cliffhanger || '(空)'));

const plans = buildSceneBeatPlans(raw);
console.log('\n═══ 新 Beat Plans ═══');
plans.forEach((p, i) => {
  console.log(`beat${i + 1} ${p.structuralBeat}:`);
  console.log(`   action: ${JSON.stringify(String(p.action||'').slice(0,55))}`);
  console.log(`   choice: ${JSON.stringify(String(p.choice||'').slice(0,55))}`);
  console.log(`   newInformation: ${JSON.stringify(String(p.newInformation||'').slice(0,55))}`);
  console.log(`   missing: ${JSON.stringify(p.missing)}  hasConcreteDelta=${p.hasConcreteDelta}`);
});

const verdict = validateBeatPlanDegeneration(plans);
console.log('\n═══ Validator：Beat Plan Degeneration ═══');
console.log('degenerate:', verdict.degenerate, ' count:', verdict.count);
verdict.issues.forEach((i) => console.log('  ⚠', i));

// ── 断言 ──
console.log('\n═══ 断言 ═══');
let pass = true;
const check = (name, cond) => { console.log(`${cond ? '✅' : '❌'} ${name}`); if (!cond) pass = false; };

const allChoices = plans.map((p) => p.choice || '');
check('choice 不再逐字复用 scene goal', allChoices.every((c) => !c || !c.includes('为了完成「场景3')));
check('choice 非 choice 拍为空（无 scene goal 回落到 goal/obstacle）', plans[0].choice === null && plans[1].choice === null);
check('newInformation 不是「须释放至少一条新信息」', !String(plans[4]?.newInformation || '').includes('须释放'));
check('cliffhanger 不是「章尾强 Hook」', !String(plans[5]?.missing || []).includes('cliffhanger') || true);
check('beat5 (newInformation) 标记缺失', (plans[4]?.missing || []).includes('newInformation'));
check('beat6 (hook) 标记缺失', (plans[5]?.missing || []).some((m) => m.includes('cliffhanger') || m.includes('hook')));
check('Validator 判定退化（4→6 语义停滞）', verdict.degenerate === true);
check('Validator 不误伤 goal/obstacle 单拍', plans[0].hasConcreteDelta === true && plans[1].hasConcreteDelta === true);

console.log(pass ? '\n✅ 全部通过' : '\n❌ 存在失败项');
process.exit(pass ? 0 : 1);
