/**
 * S8.2-R4-A — character-transformation 假成长清理
 *
 * Case 1: 有 choice、无 authored TX → missing，禁止 after.belief
 * Case 2: authored transformation → before/after 保留
 * Case 3: 强 conflict / situation，无人物变化声明 → 不生成成长
 */
import {
  buildSceneCharacterTransformation,
  formatCharacterTransformationBlock,
  formatCharacterTransformationBrief,
} from '../packages/inkos-director/src/character-transformation.js';

let failures = 0;
const fail = (label, msg) => {
  failures += 1;
  console.error(`  FAIL: ${label} — ${msg}`);
};
const ok = (label) => console.log(`  ok: ${label}`);

console.log('== Case 1: 有 choice、无 transformation ==');
{
  const tx = buildSceneCharacterTransformation({
    desire: { name: '林夜', belief: '相信规则', fear: '失去妹妹' },
    plan: {
      choice: '为了妹妹欺骗系统',
      consequence: '妹妹知道世界重置',
      goal: '打开后门',
    },
    scene: {},
    situation: {},
  });
  if (tx.missing !== true) fail('Case1 missing', String(tx.missing));
  else ok('Case1: missing=true');
  if (tx.after !== null && tx.after !== undefined && Object.keys(tx.after || {}).length) {
    fail('Case1 after', JSON.stringify(tx.after));
  } else ok('Case1: after 空/null');
  if (tx.before !== null && tx.before !== undefined && Object.keys(tx.before || {}).length) {
    fail('Case1 before', JSON.stringify(tx.before));
  } else ok('Case1: before 空/null');
  if (!Array.isArray(tx.changedDimensions) || tx.changedDimensions.length !== 0) {
    fail('Case1 dims', JSON.stringify(tx.changedDimensions));
  } else ok('Case1: changedDimensions=[]');
  if (tx.after?.belief) fail('Case1 禁止 after.belief', tx.after.belief);
  else ok('Case1: 无 after.belief');
  if (tx.valid !== false) fail('Case1 valid', String(tx.valid));
  else ok('Case1: valid=false（无 evidence）');
  if (/必须|须写出人物变化|须可见/.test(tx.writerMust || '')) {
    fail('Case1 writerMust 强制成长', tx.writerMust);
  } else ok('Case1: writerMust 不强制成长');
  const block = formatCharacterTransformationBlock(tx);
  if (/开始反抗|相信规则可以保护|After · Belief/.test(block)) {
    fail('Case1 block 预写成长', block);
  } else ok('Case1: Prompt 无预写 After');
  if (formatCharacterTransformationBrief(tx)) fail('Case1 brief', '应为空');
  else ok('Case1: brief 空');
}

console.log('== Case 2: authored transformation ==');
{
  const authored = {
    before: { belief: '林夜相信规则可以保护自己', fear: '再次失去妹妹' },
    after: { belief: '林夜开始主动反抗系统', fear: '再次失去妹妹' },
    changedDimensions: ['belief'],
    writerMust: '写出信念从守规则到反抗',
  };
  const tx = buildSceneCharacterTransformation({
    desire: { name: '林夜' },
    plan: { choice: '欺骗系统' },
    scene: { characterTransformation: authored },
  });
  if (tx.missing) fail('Case2 missing', '不应 missing');
  else ok('Case2: 非 missing');
  if (tx.before?.belief !== authored.before.belief) fail('Case2 before', tx.before?.belief);
  else ok('Case2: before 保留');
  if (tx.after?.belief !== authored.after.belief) fail('Case2 after', tx.after?.belief);
  else ok('Case2: after 保留');
  if (!tx.changedDimensions.includes('belief')) fail('Case2 dims', JSON.stringify(tx.changedDimensions));
  else ok('Case2: changedDimensions 保留');
  if (tx.valid !== true) fail('Case2 valid', String(tx.valid));
  else ok('Case2: valid=true（evidence exists）');
  const block = formatCharacterTransformationBlock(tx);
  if (!block.includes(authored.after.belief.slice(0, 20))) fail('Case2 block', block);
  else ok('Case2: Prompt 含 authored after');
}

console.log('== Case 3: 强 conflict / situation、无人物变化声明 ==');
{
  const tx = buildSceneCharacterTransformation({
    desire: { name: '林夜', belief: '相信规则', fear: '失去妹妹', changeArc: '从逃避到反抗' },
    plan: {
      choice: '牺牲自己救妹妹',
      consequence: '永远无法回头',
      conflict: '祭司逼她献祭',
      obstacle: '最大恐惧具象化',
    },
    scene: {
      conflict: '双线危机同时爆发，代价是失去妹妹',
      goal: '活着离开塔顶',
    },
    situation: {
      worldState: { before: '世界正常', after: '重置被确认' },
      characterState: { before: '林夜相信规则', after: '林夜开始反抗' },
      relationshipState: { before: '同事', after: '知情者' },
      dimensionsChanged: 3,
    },
  });
  if (tx.missing !== true) fail('Case3 missing', String(tx.missing));
  else ok('Case3: missing=true');
  if (tx.after?.belief || /反抗|成长/.test(JSON.stringify(tx.after || {}))) {
    fail('Case3 禁止生成成长', JSON.stringify(tx.after));
  } else ok('Case3: 不生成 after 成长');
  if (tx.changedDimensions?.length) fail('Case3 dims', JSON.stringify(tx.changedDimensions));
  else ok('Case3: changedDimensions=[]');
}

console.log(`\n${failures === 0 ? 'ALL PASS' : `${failures} FAILURE(S)`}`);
process.exit(failures === 0 ? 0 : 1);
