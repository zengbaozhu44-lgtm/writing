/**
 * Causal Reasoning — D1 数据流验证（Phase 4 · Step 4-D1）
 *
 * 三场景对照 4-B 人工仿真：
 *  1. 二手书店 ch1   — StoryTruth 丰富  → generated（desire 来自 core_desire，fear 显式）
 *  2. 赛博 ch17      — 目标文本富/状态板空 → partial/degraded（obstacle=模板 → missing_pressure）
 *  3. 赛博 ch5       — 薄数据           → authored 优先（choice 来自 climax）+ 明确降级
 *
 * 全局断言：causal_chain 序列化后不含任何 TEMPLATE_FALLBACKS 占位字符串。
 * 不接 LLM、不 wire 生产路径、golden 不动。
 */
import { runCausalReasoning, TEMPLATE_FALLBACKS } from '../packages/inkos-brain/src/causal/causal-reasoner.js';

const ROOT = new URL('..', import.meta.url).pathname;
const book = (name) => `${ROOT}books/我的小说/books/${name}`;

const BOOK_ERSHOU = book('二手书店老板的最后一周');
const BOOK_SAI = book('赛博修仙我靠玩家暴打克苏鲁旧日神');

let failures = 0;
const fail = (label, msg) => {
  failures += 1;
  console.error(`  FAIL: ${label} — ${msg}`);
};
const ok = (label) => console.log(`  ok: ${label}`);

function assertNoTemplates(causalChain, label) {
  const json = JSON.stringify(causalChain);
  const hits = [...TEMPLATE_FALLBACKS].filter((t) => t && json.includes(t));
  if (hits.length) {
    fail(`${label}: 因果链含模板占位符`, hits.join(', '));
  } else {
    ok(`${label}: 无模板占位符`);
  }
}

function summarize(chain) {
  return {
    grade: chain.confidence.grade,
    desire: chain.desire ? `${chain.desire.who} → ${String(chain.desire.wants).slice(0, 40)}` : null,
    choice_source: chain.choice?.source || null,
    no_causal_basis: chain.no_causal_basis,
    degradation: chain.trace.degradation,
    new_information_source: chain.new_information?.source || null,
  };
}

console.log('== Scenario 1: 二手书店 ch1（StoryTruth 丰富）==');
{
  const { storyTruth, causalChain } = runCausalReasoning(BOOK_ERSHOU, { chapter: 1 });
  console.log(JSON.stringify(summarize(causalChain), null, 2));
  const lin = storyTruth.characters.find((c) => c.name === '林守常');
  if (storyTruth.open_questions.length < 3) fail('ch1: 认知缺口不足', `got ${storyTruth.open_questions.length}`);
  else ok(`ch1: 认知缺口 ${storyTruth.open_questions.length} 条（梧桐叶/等你/照片…）`);
  if (!lin?.desire?.includes('维持现状')) fail('ch1: 林守常 desire 应含 core_desire「维持现状」', String(lin?.desire));
  else ok(`ch1: 林守常 core_desire 投影成功 → ${lin.desire}`);
  if (lin?.fear) ok(`ch1: 林守常 core_fear 显式 → ${lin.fear}`);
  else fail('ch1: core_fear 缺失');
  if (causalChain.desire?.who !== '林守常') fail('ch1: desire.who 应为 林守常', causalChain.desire?.who);
  else ok('ch1: desire.who=林守常');
  if (causalChain.confidence.grade === 'degraded') fail('ch1: 不应 degraded', '');
  else ok(`ch1: grade=${causalChain.confidence.grade}`);
  if (causalChain.trace.degradation.includes('fear_unknown')) fail('ch1: fear 有显式来源，不应 fear_unknown', '');
  else ok('ch1: fear 非 unknown');
  if (causalChain.trace.degradation.includes('relationship_missing')) fail('ch1: 老周卡含「林守常的老朋友」散文证据，不应 relationship_missing', causalChain.trace.degradation.join(','));
  else ok('ch1: 关系从角色卡散文推导（老周 → 老朋友）');
  assertNoTemplates(causalChain, 'ch1');
}

console.log('== Scenario 2: 赛博 ch17（目标文本富 / 状态板空）==');
{
  const { storyTruth, causalChain } = runCausalReasoning(BOOK_SAI, { chapter: 17 });
  console.log(JSON.stringify(summarize(causalChain), null, 2));
  if (!storyTruth.meta.stateBoardEmpty) fail('ch17: 状态板应为空壳', '');
  else ok('ch17: 状态板空壳 detected');
  if (!causalChain.no_causal_basis.includes('missing_pressure')) {
    // obstacle 是第一阻碍模板 → 应判缺失
    fail('ch17: obstacle=模板应判 missing_pressure', JSON.stringify(causalChain.no_causal_basis));
  } else ok('ch17: 模板 obstacle 被正确判为缺失（missing_pressure）');
  if (causalChain.confidence.grade === 'full') fail('ch17: 状态板空+无 gap，不应 full', '');
  else ok(`ch17: grade=${causalChain.confidence.grade}（降级诚实）`);
  assertNoTemplates(causalChain, 'ch17');
}

console.log('== Scenario 3: 赛博 ch5（薄数据压力测试）==');
{
  const { storyTruth, causalChain } = runCausalReasoning(BOOK_SAI, { chapter: 5 });
  console.log(JSON.stringify(summarize(causalChain), null, 2));
  if (!storyTruth.meta.authoredPlanPresent) fail('ch5: 应有 authored plan', '');
  else ok('ch5: authored plan 存在');
  if (causalChain.choice?.source !== 'authored_plan.climax') fail('ch5: authored 明确因果应优先（choice 来自 climax）', causalChain.choice?.source);
  else ok('ch5: authored 优先 — choice 来自 authored_plan.climax（作者因果保留）');
  // 校正（2026-08-21）：05_relationship_graph 文件缺失 ≠ 关系缺失——林薇卡「与主角关系」是动机源。
  if (!storyTruth.characters.some((c) => c.relationship)) fail('ch5: 应消费 林薇「与主角关系」关系证据（动机源）', '');
  else ok('ch5: 林薇「与主角关系」关系证据被投影（动机源保留）');
  const deg = causalChain.trace.degradation;
  if (!deg.includes('fear_unknown')) fail('ch5: 应降级 fear_unknown', deg.join(','));
  else ok('ch5: fear_unknown 诚实降级（mock 不推断，留给 LLM provider）');
  if (!deg.includes('state_board_empty')) fail('ch5: 应降级 state_board_empty（状态板为第0章模板）', deg.join(','));
  else ok('ch5: state_board_empty 诚实降级（当前世界状态缺失）');
  if (causalChain.confidence.grade === 'full') fail('ch5: 状态板空+fear 未知不应 full', '');
  else ok(`ch5: grade=${causalChain.confidence.grade}（未滑回模板）`);
  assertNoTemplates(causalChain, 'ch5');
}

console.log(`\n${failures === 0 ? 'ALL PASS' : `${failures} FAILURE(S)`}`);
process.exit(failures === 0 ? 0 : 1);
