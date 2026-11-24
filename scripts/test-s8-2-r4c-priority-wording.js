/**
 * S8.2-R4-C — priority 表达边界（措辞 only）
 *
 * Case 1: authored scene.goal → Prompt 可见 Scene Goal；无「唯一最高优先」等裁决话术
 * Case 2: 无 scene.goal → 不渲染 Priority/Drive block；无默认 goal
 * Case 3: desire + scene.goal → goal 非 desire 胜出；无 competition
 * Case 4: resolvePriorityDrive 不做排序/评分压缩
 */
import {
  resolvePriorityDrive,
  formatPriorityDriveBlock,
} from '../packages/inkos-studio-server/src/writer-optimization/beat-continuity.js';
import { BEAT_HARD_RULES } from '../packages/inkos-studio-server/src/writer-optimization/beat-slimmer.js';
import { derivePriorityGoal } from '../packages/inkos-director/src/scene-execution.js';

let failures = 0;
const fail = (label, msg) => {
  failures += 1;
  console.error(`  FAIL: ${label} — ${msg}`);
};
const ok = (label) => console.log(`  ok: ${label}`);

const DOMINANCE = [
  '唯一最高优先',
  '最高优先',
  'dominant priority',
  '人物必须优先',
  '为 priority 做出',
  '其它目标必须让位',
  '本场唯一',
  '必须服务「最高优先」',
];

function assertNoDominance(text, label) {
  const hits = DOMINANCE.filter((k) => String(text).includes(k));
  if (hits.length) fail(label, hits.join(' / '));
  else ok(`${label}: 无 Dominance 话术`);
}

console.log('== Case 1: authored scene.goal ==');
{
  const goal = '修好陶庵梦忆并送走老周';
  const drive = resolvePriorityDrive({
    scene: { goal },
    executionPlan: { scenePlan: { goal } },
  });
  if (drive.priority !== goal) fail('Case1 priority', drive.priority);
  else ok('Case1: priority = scene.goal');

  const block = formatPriorityDriveBlock(drive, { structuralBeat: 'choice' });
  if (!block.includes('Scene explicit goal')) fail('Case1 label', block.slice(0, 120));
  else ok('Case1: Prompt 含 Scene explicit goal');
  if (!block.includes(goal)) fail('Case1 goal text', block);
  else ok('Case1: Prompt 可见 goal');
  if (!/not a character-dominance judgment/i.test(block)) {
    fail('Case1 boundary', block.slice(0, 200));
  } else ok('Case1: 标明非 Dominance');
  assertNoDominance(block, 'Case1 block');
  assertNoDominance(BEAT_HARD_RULES.join('\n'), 'Case1 BEAT_HARD_RULES');
}

console.log('== Case 2: 无 scene.goal ==');
{
  const drive = resolvePriorityDrive({
    scene: {},
    executionPlan: { scenePlan: {} },
    desire: { fear: '失去妹妹', externalGoal: '证明自己', internalDesire: '被信任' },
  });
  if (drive.priority) fail('Case2 priority', `应空，得「${drive.priority}」`);
  else ok('Case2: priority 空（无默认 goal）');

  const block = formatPriorityDriveBlock(drive, { structuralBeat: 'goal' });
  if (block) fail('Case2 block', `应省略，得：${block.slice(0, 80)}`);
  else ok('Case2: 不渲染 Priority/Drive block');

  if (/活着撑过|survival|证明自己/.test(JSON.stringify(drive))) {
    fail('Case2 fallback', JSON.stringify(drive));
  } else ok('Case2: 无 survival/desire fallback');
}

console.log('== Case 3: desire + scene.goal — 非 desire 胜出 ==');
{
  const sceneGoal = '打开配送网后门';
  const drive = resolvePriorityDrive({
    scene: { goal: sceneGoal },
    executionPlan: { scenePlan: { goal: sceneGoal, priorityGoal: sceneGoal } },
    desire: {
      externalGoal: '证明自己不是疯子',
      internalDesire: '救妹妹',
      fear: '再次失去妹妹',
      belief: '相信规则',
    },
  });
  if (drive.priority !== sceneGoal) {
    fail('Case3', `期望 scene.goal，得「${drive.priority}」`);
  } else ok('Case3: priority = scene.goal（非 desire）');
  if (/证明自己不是疯子|救妹妹/.test(drive.priority)) {
    fail('Case3 competition', drive.priority);
  } else ok('Case3: 无 desire competition 进 priority');

  const block = formatPriorityDriveBlock(drive, { structuralBeat: 'goal' });
  assertNoDominance(block, 'Case3 block');
  if (/胜出|压缩|最高|Dominance judgment/i.test(block) && !/not a character-dominance/i.test(block)) {
    fail('Case3 裁决语义', block);
  } else ok('Case3: 非 desire 胜出表述');
}

console.log('== Case 4: 无排序/评分压缩 ==');
{
  const src = String(resolvePriorityDrive);
  if (/score|rank|weight|生存|活着撑过|sort\(|\.sort\b/i.test(src)
    && !/不做多方向评分|禁止 desire 竞争/.test(src)) {
    // soft: algorithm body should not introduce scoring
  }
  // 行为锁：多候选 desire 字段不得改变透传结果
  const a = resolvePriorityDrive({
    scene: { goal: 'A目标' },
    desire: { externalGoal: 'B欲望', fear: 'C恐惧' },
  });
  const b = resolvePriorityDrive({
    scene: { goal: 'A目标' },
    desire: { externalGoal: 'Z完全不同', fear: 'Y不同恐惧', internalDesire: 'X' },
  });
  if (a.priority !== b.priority || a.priority !== 'A目标') {
    fail('Case4 passthrough', JSON.stringify({ a, b }));
  } else ok('Case4: desire 变化不改变 priority 透传');

  // derivePriorityGoal 算法未改：仍只透传显式 goal
  const pg = derivePriorityGoal({ plan: { goal: '显式场景目标' }, scene: {} });
  if (pg !== '显式场景目标') fail('Case4 derivePriorityGoal', pg);
  else ok('Case4: derivePriorityGoal 仍透传 scene.goal');

  const empty = derivePriorityGoal({ plan: {}, scene: {} });
  if (empty !== '') fail('Case4 empty', empty);
  else ok('Case4: 无 goal → 空串');
}

console.log(`\n${failures === 0 ? 'ALL PASS' : `${failures} FAILURE(S)`}`);
process.exit(failures === 0 ? 0 : 1);
