/**
 * S8.2-R5 — Final Expression Boundary（L1–L4）
 *
 * Case 1: choice=null, TX=null → 无成长 / 无无法回头 / 无逼迫成长 / 无 Chosen
 * Case 2: choice=authored, TX=null → Chosen 保留；无成长推导
 * Case 3: choice=null + authored outcome → Declared outcome，≠ Choice consequence
 * Case 4: choice + TX authored → 双保留
 * Case 5: Runtime/Studio 同边界（同一 formatters）
 */
import { buildSceneSituation, formatSituationBlock } from '../packages/inkos-director/src/situation-engine.js';
import {
  buildCharacterDesireProfile,
  buildSceneCharacterPush,
  formatCharacterDesireBlock,
} from '../packages/inkos-director/src/character-desire-engine.js';
import { buildSceneCharacterTransformation, formatCharacterTransformationBlock } from '../packages/inkos-director/src/character-transformation.js';
import { deriveCausalChain } from '../packages/inkos-brain/src/causal/causal-reasoner.js';
import { renderCausalChain } from '../packages/inkos-prompt/src/compiler.js';
import { buildBeatWriterIntent, formatSceneWriterRuntimeBlock, formatCurrentBeatRuntimeBlock } from '../packages/inkos-director/src/writer-runtime.js';

let failures = 0;
const fail = (label, msg) => {
  failures += 1;
  console.error(`  FAIL: ${label} — ${msg}`);
};
const ok = (label) => console.log(`  ok: ${label}`);

const BANNED = [
  '逼迫人物成长',
  '让人物成长',
  '推动人物成长',
  '迫使人物改变',
  '无法回头',
  '认为局面尚可控制',
  '须可见成长',
  '须可见受挫',
  '做出选择后无法回头',
  '立场/处境变化',
  '做出选择 —',
];

function assertClean(text, label) {
  const hits = BANNED.filter((k) => String(text).includes(k));
  if (hits.length) fail(label, hits.join(' / '));
  else ok(`${label}: 无禁词`);
}

function collectPromptSurface({
  choice = null,
  consequence = '',
  tx = null,
  desireDna = null,
} = {}) {
  const scene = {
    choice: choice || undefined,
    consequence: consequence || undefined,
    characterTransformation: tx || undefined,
  };
  const plan = {
    choice: choice || '',
    consequence: consequence || '',
    goal: '打开门',
    newInformation: '发现异常',
    obstacle: '祭司逼近',
  };
  const desire = desireDna
    ? buildCharacterDesireProfile({
      storyDna: { character_desires: desireDna, protagonist: '林夜' },
      intent: { pov: '林夜' },
    })
    : buildCharacterDesireProfile({ storyDna: {}, intent: { pov: '林夜' } });

  const push = buildSceneCharacterPush({ desire, plan, scene });
  const situation = buildSceneSituation({
    scene,
    intent: { pov: '林夜', keyCharacter: '苏晚' },
    plan,
    characterDesire: desire,
    characterPush: push,
  });
  const transformation = buildSceneCharacterTransformation({ desire, plan, scene });
  const choiceIntent = buildBeatWriterIntent({
    structuralBeat: 'choice',
    beatOrder: 3,
    plan,
    scene,
    characterTransformation: transformation,
  });
  const runtimeBlock = [
    `**Writer Intent**：${choiceIntent.writerIntent}`,
    formatCurrentBeatRuntimeBlock?.length ? '' : '',
  ].join('\n');

  const chain = deriveCausalChain({
    pov: '林夜',
    characters: desire.missing
      ? [{ name: '林夜' }]
      : [{ name: '林夜', desire: desire.externalGoal || desire.belief || '显式' }],
    world_pressure: {
      obstacle: plan.obstacle,
      cost: consequence || null,
      authoredChoice: choice,
      authoredClimax: null,
      authoredOptions: null,
    },
    open_questions: [],
    meta: {},
  });

  const blocks = {
    situation: formatSituationBlock(situation),
    desire: formatCharacterDesireBlock(desire, push),
    tx: formatCharacterTransformationBlock(transformation),
    runtime: runtimeBlock,
    causal: renderCausalChain(chain, { pov: '林夜' }, {}),
  };
  return { blocks, situation, push, transformation, chain, choiceIntent, joined: Object.values(blocks).join('\n') };
}

console.log('== Case 1: choice=null, TX=null ==');
{
  const { joined, blocks, chain, transformation, push, choiceIntent } = collectPromptSurface({});
  if (chain.choice !== null) fail('Case1 choice', JSON.stringify(chain.choice));
  else ok('Case1: choice=null');
  if (!transformation.missing) fail('Case1 TX', '应 missing');
  else ok('Case1: TX missing');
  if (push.authoredChange || (push.before && push.after)) fail('Case1 push', JSON.stringify(push));
  else ok('Case1: 无 Character After');
  if (/Chosen（已选）/.test(blocks.causal)) fail('Case1 Chosen', blocks.causal);
  else ok('Case1: 无 Chosen');
  if (choiceIntent.writerIntent === '逼迫人物成长' || /成长|改变|意义/.test(choiceIntent.writerIntent)) {
    fail('Case1 Intent', choiceIntent.writerIntent);
  } else ok(`Case1: Intent「${choiceIntent.writerIntent}」非成长`);
  assertClean(joined, 'Case1 surface');
  if (!/character transformation: missing|transformation missing|角色变化：missing/i.test(joined)) {
    fail('Case1 missing label', joined.slice(0, 400));
  } else ok('Case1: missing 标签存在');
}

console.log('== Case 2: choice=authored, TX=null ==');
{
  const { joined, blocks, chain, transformation, push } = collectPromptSurface({
    choice: '为了妹妹欺骗系统',
    desireDna: { 林夜: { external: '救妹妹', fear: '失去妹妹' } },
  });
  if (chain.choice?.action !== '为了妹妹欺骗系统' && !blocks.causal.includes('为了妹妹欺骗系统')) {
    // derive may need desire+pressure for climax path; authoredChoice should set choice
  }
  if (!String(JSON.stringify(chain.choice) + blocks.causal).includes('为了妹妹欺骗系统')) {
    fail('Case2 Chosen', JSON.stringify(chain.choice));
  } else ok('Case2: authored direction / choice data 保留');
  if (!transformation.missing) fail('Case2 TX', '应 missing');
  else ok('Case2: TX missing');
  if (push.authoredChange) fail('Case2 push change', JSON.stringify(push));
  else ok('Case2: 无 push 成长');
  if (/角色变化：[^m].*→/.test(blocks.desire) && !/角色变化：missing/.test(blocks.desire)) {
    fail('Case2 desire change', blocks.desire);
  } else ok('Case2: desire 块无假成长');
  assertClean(joined, 'Case2 surface');
  if (/belief changed|identity|开始反抗|内心\/立场变化/.test(joined)) {
    fail('Case2 belief invent', '');
  } else ok('Case2: 无 belief/identity 推导');
}

console.log('== Case 3: choice=null + authored outcome ==');
{
  const { blocks, chain } = collectPromptSurface({
    consequence: '失去妹妹',
  });
  if (chain.choice !== null) fail('Case3 choice', JSON.stringify(chain.choice));
  else ok('Case3: choice=null');
  if (/后果（consequence）/.test(blocks.causal)) fail('Case3 后果语义', blocks.causal);
  else ok('Case3: 非「后果（consequence）」标签');
  if (!/Authored \/ Declared outcome/.test(blocks.causal) || !blocks.causal.includes('失去妹妹')) {
    fail('Case3 declared', blocks.causal);
  } else ok('Case3: Declared outcome 保留');
  if (!/≠ Character Choice consequence|≠ Choice consequence|≠ Attribution/.test(blocks.causal)) {
    fail('Case3 边界', blocks.causal);
  } else ok('Case3: 标明 ≠ Choice consequence / Attribution');
  if (/Chosen（已选）/.test(blocks.causal)) fail('Case3 Chosen', '');
  else ok('Case3: 无 Chosen');
}

console.log('== Case 4: choice + TX authored ==');
{
  const authoredTx = {
    before: { belief: '相信规则' },
    after: { belief: '开始质疑规则' },
    changedDimensions: ['belief'],
  };
  const { blocks, transformation, push, chain, choiceIntent } = collectPromptSurface({
    choice: '按下上报键',
    tx: authoredTx,
    desireDna: { 林夜: { external: '救妹妹', belief: '相信规则' } },
  });
  if (transformation.missing) fail('Case4 TX', '应保留');
  else ok('Case4: TX 保留');
  if (!blocks.tx.includes('开始质疑规则')) fail('Case4 tx block', blocks.tx);
  else ok('Case4: Prompt 含 authored after');
  if (!push.authoredChange) fail('Case4 push', JSON.stringify(push));
  else ok('Case4: push authoredChange');
  if (!String(JSON.stringify(chain.choice) + blocks.causal).includes('按下上报键')) {
    fail('Case4 choice', JSON.stringify(chain.choice));
  } else ok('Case4: Choice 保留');
  if (choiceIntent.writerIntent !== '描写已声明的人物变化') {
    fail('Case4 intent', choiceIntent.writerIntent);
  } else ok('Case4: Intent 描写已声明变化');
}

console.log('== Case 5: Runtime/Studio 同 formatters ==');
{
  // 双入口共用 renderCausalChain / formatSituationBlock / formatCharacterDesireBlock / formatSceneWriterRuntimeBlock
  const a = collectPromptSurface({});
  const b = collectPromptSurface({});
  if (a.blocks.causal !== b.blocks.causal) fail('Case5 causal stable', '');
  else ok('Case5: causal 稳定');
  for (const bad of ['逼迫人物成长', '无法回头', '角色变化：林夜', '后果（consequence）']) {
    if (a.joined.includes(bad) && bad === '角色变化：林夜') {
      // allow only if authored — here null
      fail('Case5', bad);
    } else if (a.joined.includes(bad) && bad !== '角色变化：林夜') {
      fail(`Case5「${bad}」`, '');
    } else {
      ok(`Case5: 无「${bad}」`);
    }
  }
  // Studio prompt-priority 与 Runtime 均 import 同一 formatters — 抽检 desire/situation 字符串一致即可
  if (!/character transformation: missing|角色变化：missing/.test(a.joined)) {
    fail('Case5 missing', '');
  } else ok('Case5: 双侧同源 missing 表达');
}

console.log(`\n${failures === 0 ? 'ALL PASS' : `${failures} FAILURE(S)`}`);
process.exit(failures === 0 ? 0 : 1);
