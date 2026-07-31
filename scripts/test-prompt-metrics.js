/**
 * @inkos/prompt-metrics 单元验证 — LLM 指标 + Budget Usage
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { recordScenePromptMetrics, loadChapterMetrics } from '../packages/inkos-prompt-metrics/src/index.js';

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'inkos-pmetrics-'));
const scene = { index: 1, id: 'ch1_s1' };

recordScenePromptMetrics(tmp, 1, scene, {
  input_tokens: 1200,
  output_tokens: 850,
  cached_tokens: 200,
  cache_hit: true,
  compile_time_ms: 12,
  llm_latency_ms: 3400,
  retry: 1,
  temperature: 0.7,
  commercial_score: 88,
  quality: 88,
  model: 'deepseek-chat',
  budget: { totalTokens: 2100, sceneType: 'dialogue' },
});

const rollup = loadChapterMetrics(tmp, 1);
console.log('scenes', rollup.scenes.length);
console.log('aggregate', rollup.aggregate?.avgBudgetUsage);

const m = rollup.scenes[0];
const fields = [
  'input_tokens', 'output_tokens', 'cached_tokens', 'cache_hit',
  'compile_time_ms', 'llm_latency_ms', 'retry', 'temperature',
  'cost', 'usd_cost', 'quality', 'commercial_score', 'budget_usage',
];
for (const f of fields) {
  if (m[f] === undefined && f !== 'quality') {
    console.error('FAIL: missing field', f);
    process.exit(1);
  }
}
if (m.budget_usage == null || m.budget_usage < 50) {
  console.error('FAIL: budget_usage', m.budget_usage);
  process.exit(1);
}
if (rollup.aggregate?.avgBudgetUsage == null) {
  console.error('FAIL: aggregate avgBudgetUsage');
  process.exit(1);
}
console.log('OK');
