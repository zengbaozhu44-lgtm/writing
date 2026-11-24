/**
 * S8.2-R3 — causal options 降级（表达边界）
 *
 * Case 1: desire + pressure、无 authored choice → choice=null、options=[]
 * Case 2: authored climax → choice 保留；authored options 保留（无则空，禁止 mock）
 * Case 3: choice=null 时 renderCausalChain 不得出现 Options / 不得另选 / 选择过程
 */
import { deriveCausalChain } from '../packages/inkos-brain/src/causal/causal-reasoner.js';
import { renderCausalChain } from '../packages/inkos-prompt/src/compiler.js';

let failures = 0;
const fail = (label, msg) => {
  failures += 1;
  console.error(`  FAIL: ${label} — ${msg}`);
};
const ok = (label) => console.log(`  ok: ${label}`);

function baseTruth(wpExtra = {}, charExtra = {}) {
  return {
    pov: '林守常',
    characters: [{ name: '林守常', desire: '维持现状', ...charExtra }],
    world_pressure: {
      event: '还书',
      obstacle: '书脊脱胶的分歧',
      authoredChoice: null,
      authoredClimax: null,
      authoredOptions: null,
      ...wpExtra,
    },
    open_questions: [],
    meta: {},
  };
}

console.log('== Case 1: desire + pressure、无 authored choice ==');
{
  const chain = deriveCausalChain(baseTruth());
  if (chain.choice !== null) fail('Case1 choice', `期望 null，得 ${JSON.stringify(chain.choice)}`);
  else ok('Case1: choice === null');
  if (!Array.isArray(chain.options) || chain.options.length !== 0) {
    fail('Case1 options', `期望 []，得 ${JSON.stringify(chain.options)}`);
  } else ok('Case1: options.length === 0');
  const blob = JSON.stringify(chain);
  if (/正面推进/.test(blob)) fail('Case1 禁止正面推进', 'options/choice 仍含默认方向');
  else ok('Case1: 无「正面推进」');
  if (chain.choice?.action === '正面推进') fail('Case1', 'choice===正面推进');
  if (!chain.no_causal_basis?.includes('missing_choice_basis')) {
    fail('Case1 basis', JSON.stringify(chain.no_causal_basis));
  } else ok('Case1: missing_choice_basis');
  if (!chain.options_analysis?.missing_basis && chain.options_analysis?.reason !== 'missing_basis') {
    fail('Case1 optionsAnalysis', JSON.stringify(chain.options_analysis));
  } else ok('Case1: options_analysis.missing_basis');
}

console.log('== Case 2: authored climax ==');
{
  const climax = '把橘子剥开，一瓣留给自己，其余收进抽屉。';
  const chain = deriveCausalChain(baseTruth({ authoredClimax: climax }));
  if (chain.choice?.action !== climax) fail('Case2 choice', String(chain.choice?.action));
  else ok('Case2: choice 保留（authored climax）');
  if (chain.choice?.source !== 'authored_plan.climax') fail('Case2 source', chain.choice?.source);
  else ok('Case2: source=authored_plan.climax');
  if (chain.options.length !== 0) fail('Case2 options empty', '无 authored options 时应 []');
  else ok('Case2: 无 authored options → options=[]');
  if (/正面推进|放弃/.test(JSON.stringify(chain.options))) fail('Case2 mock', '仍有默认方向');
  else ok('Case2: 无默认行动方向');
}

console.log('== Case 2b: authored climax + authored options ==');
{
  const climax = '正面不写进 options，只写 climax';
  const chain = deriveCausalChain(baseTruth({
    authoredClimax: climax,
    authoredOptions: ['守住体面', '戳穿窘迫'],
  }));
  if (chain.choice?.action !== climax) fail('Case2b choice', String(chain.choice?.action));
  else ok('Case2b: choice 保留');
  if (chain.options.length !== 2) fail('Case2b options len', String(chain.options.length));
  else ok('Case2b: authored options 保留 length=2');
  if (chain.options.some((o) => o.derivation !== 'authored')) fail('Case2b derivation', '');
  else ok('Case2b: derivation=authored');
  if (chain.options.map((o) => o.action).join('|') !== '守住体面|戳穿窘迫') {
    fail('Case2b actions', chain.options.map((o) => o.action).join('|'));
  } else ok('Case2b: options 文案透传');
}

console.log('== Case 3: renderCausalChain choice==null ==');
{
  const chain = deriveCausalChain(baseTruth());
  const block = renderCausalChain(chain, { pov: '林守常' }, {});
  if (!block.includes('Authorial Planned Direction: missing_choice_basis')
    && !block.includes('Authorial Planned Direction: 未确认')) {
    fail('Case3 Authorial Planned Direction 缺口行', block);
  } else ok('Case3: Authorial Planned Direction 缺口行');
  for (const bad of ['Options（选项空间）', '不得另选', '选择过程', '正面推进', 'Chosen（已选）']) {
    if (block.includes(bad)) fail(`Case3 禁止「${bad}」`, '');
    else ok(`Case3: 无「${bad}」`);
  }
}

console.log(`\n${failures === 0 ? 'ALL PASS' : `${failures} FAILURE(S)`}`);
process.exit(failures === 0 ? 0 : 1);
