/**
 * EO-4.4.1d-R-S1 — AA20 certificate-language demotion (renderCausalChain only)
 * Run: npm run test:attribution-s1
 *
 * S1 scope: header / outcome / options certificate strings.
 * Chosen demotion covered by EO-S2 (test:attribution-s2).
 */
import assert from 'node:assert/strict';
import { renderCausalChain } from '../packages/inkos-prompt/src/compiler.js';

let passed = 0;
function ok(name) {
  passed += 1;
  console.log(`  PASS ${name}`);
}

console.log('test:attribution-s1');

const withChoice = {
  desire: { who: 'Alice', wants: '离开' },
  pressure: { obstacle: '门锁住' },
  options: [{ action: '推门', derivation: 'authored' }, { action: '留下', derivation: 'authored' }],
  choice: { actor: 'Alice', action: '推门离开', reason: 'authored_plan.choice', source: 'authored_plan.choice' },
  consequence: { immediate: '门开了', long_term: null },
};

const noChoice = {
  desire: { who: 'Alice', wants: '离开' },
  pressure: { obstacle: '门锁住' },
  choice: null,
  consequence: { immediate: '代价未明', long_term: null },
  no_causal_basis: ['missing_choice_basis'],
};

{
  const block = renderCausalChain(withChoice, { pov: 'Alice' }, {});
  assert.ok(block.includes('### 因果链 · 叙事草图（作者向 · 非角色已决事实）'));
  assert.ok(!/已确定，禁止重推因果/.test(block));
  assert.ok(block.includes('Narrative Fuel'));
  assert.ok(block.includes('≠ Character Choice'));
  assert.ok(block.includes('≠ Attribution'));
  assert.ok(block.includes('推门离开'));
  assert.ok(block.includes('欲望（desire）'));
  assert.ok(block.includes('压力（pressure）'));
  assert.ok(block.includes('Options（作者给定选项空间）'));
  assert.ok(!/不得另选/.test(block));
  assert.ok(!/^- 后果（consequence）:/m.test(block));
  assert.ok(block.includes('Authored / Declared outcome'));
  assert.ok(block.includes('门开了'));
  assert.ok(block.includes('Authorial Planned Direction'));
  ok('S1-A withChoice: header/outcome demoted; fuel kept');
}

{
  const block = renderCausalChain(noChoice, { pov: 'Alice' }, {});
  assert.ok(block.includes('叙事草图（作者向 · 非角色已决事实）'));
  assert.ok(!/已确定，禁止重推因果/.test(block));
  assert.ok(!/^- 后果（consequence）:/m.test(block));
  assert.ok(block.includes('Authored / Declared outcome'));
  assert.ok(block.includes('missing_choice_basis'));
  assert.ok(block.includes('Authorial Planned Direction'));
  ok('S1-B noChoice: non-cert header+outcome');
}

{
  const a = renderCausalChain(withChoice, { pov: 'Alice' }, { pov: 'Alice' });
  const b = renderCausalChain(withChoice, { pov: 'Alice' }, { pov: 'Alice' });
  assert.equal(a, b);
  ok('S1-C deterministic shared renderer');
}

console.log(`\nOK ${passed} tests`);
