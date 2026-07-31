#!/usr/bin/env node
/**
 * Prompt Regression v2 — Token / Ranking / Adaptive Budget / Cache Validator
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadBrainContext } from '../../packages/inkos-brain/src/loader.js';
import { buildDynamicPrompt } from '../../packages/inkos-brain/src/prompt/dynamic-prompt.js';
import { SCENE_INPUT_MAX_TOKENS } from '../../packages/inkos-prompt/src/adaptive-budget.js';
import { loadPromptMetrics, aggregateMetrics } from '../../packages/inkos-prompt/src/metrics.js';
import { optimizeWriterPrompt } from '../../packages/inkos-writer/src/optimizer.js';
import { countTokens } from '../../packages/inkos-prompt/src/token-meter.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');
const BOOK_DIR = path.join(ROOT, 'books/我的小说/books/_runtime-test');
const PLAN_FILE = path.join(BOOK_DIR, 'novel/_system/brain/ch_0001_plan.json');

const TARGET_AVG_TOKENS = 2200;

function assert(cond, msg) {
  if (!cond) throw new Error(`PROMPT REGRESSION FAIL: ${msg}`);
}

function loadScenes() {
  const plan = JSON.parse(fs.readFileSync(PLAN_FILE, 'utf8'));
  return plan.intent.scenes;
}

function runPromptRegression() {
  assert(fs.existsSync(BOOK_DIR), `Test book missing: ${BOOK_DIR}`);

  const cacheDir = path.join(BOOK_DIR, 'novel/_system/brain/prompt-cache/ch_0001');
  if (fs.existsSync(cacheDir)) fs.rmSync(cacheDir, { recursive: true });

  const ctx = loadBrainContext(BOOK_DIR, { chapter: 1 });
  const scenes = loadScenes();
  const results = [];
  let totalTokens = 0;

  for (const scene of scenes) {
    const t0 = performance.now();
    const prompt = buildDynamicPrompt(ctx, scene);
    const elapsed = performance.now() - t0;

    results.push(prompt);
    totalTokens += prompt.totalTokens || 0;

    assert((prompt.totalTokens || 0) <= SCENE_INPUT_MAX_TOKENS, `Scene ${scene.index} exceeds token budget (${prompt.totalTokens})`);
    assert(prompt.compileMs < 50 || elapsed < 50, `Scene ${scene.index} compile too slow (${prompt.compileMs}ms)`);
    assert(prompt.text.includes('tokens='), `Scene ${scene.index} missing token header`);

    if (scene.index > 1) {
      assert(prompt.text.includes('续写') || prompt.text.includes('Continue'), `Scene ${scene.index} missing continuation`);
      assert(prompt.profile, `Scene ${scene.index} missing adaptive profile`);
    }

    if (scene.index > 1) {
      assert(prompt.cacheHitRate >= 50 || prompt.cacheHit, `Scene ${scene.index} cache hit too low (${prompt.cacheHitRate}%)`);
    }

    const optimized = optimizeWriterPrompt({ prompt: prompt.text, scene, ctx, intent: { scenes } });
    assert(optimized.prompt.includes('writer-optimizer'), 'Writer optimizer not applied');
    assert(countTokens(optimized.prompt) > prompt.totalTokens, 'Optimizer should add minimal blocks');
  }

  const metrics = loadPromptMetrics(BOOK_DIR, 1);
  const agg = aggregateMetrics(metrics);
  assert(agg, 'prompt_metrics.json missing aggregate');
  assert(agg.avgInputTokens <= TARGET_AVG_TOKENS, `Avg tokens ${agg.avgInputTokens} > ${TARGET_AVG_TOKENS}`);
  assert(agg.cacheHitRate >= 50, `Cache hit ${agg.cacheHitRate}% < 50%`);
  assert(metrics.scenes[0]?.input_tokens != null, 'Metrics must use input_tokens not chars');
  assert(fs.existsSync(path.join(cacheDir, 'cache_validator.json')), 'cache_validator.json missing');

  console.log('Prompt Regression v2 Report');
  console.log('─'.repeat(40));
  for (let i = 0; i < scenes.length; i += 1) {
    const p = results[i];
    console.log(`  Scene ${scenes[i].index}: ${p.totalTokens} tok | ${p.profile} | cache ${p.cacheHitRate}% | compile ${p.compileMs}ms | drop ${p.rankingDrop ?? 0}`);
  }
  console.log(`  Total tokens: ${totalTokens} | avg ${agg.avgInputTokens} | cache ${agg.cacheHitRate}%`);
  console.log(`✓ Prompt regression v2 passed`);
}

runPromptRegression();
