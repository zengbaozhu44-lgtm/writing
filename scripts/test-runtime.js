#!/usr/bin/env node
/**
 * Runtime 2.0 集成测试 — 不调用 LLM，验证事件管线与模块加载
 */
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { EventBus } from '../packages/inkos-runtime/src/event-bus.js';
import { Dispatcher } from '../packages/inkos-runtime/src/dispatcher.js';
import { evaluateDecisions } from '../packages/inkos-brain/src/decision/decision.js';
import { checkConsistency } from '../packages/inkos-brain/src/consistency/consistency.js';
import { computeMetrics, analyzeMetricsFeedback } from '../packages/inkos-brain/src/metrics/metrics.js';
import { runCritic } from '../packages/inkos-brain/src/critic/critic.js';
import { validateChapter } from '../packages/inkos-brain/src/validation/validation.js';
import { buildDynamicPrompt } from '../packages/inkos-brain/src/prompt/dynamic-prompt.js';
import { planChapter } from '../packages/inkos-brain/src/planner/planner.js';
import { applyAdaptiveFeedback } from '../packages/inkos-brain/src/planner/adaptive.js';
import { simulateReaders } from '../packages/inkos-brain/src/reader/reader.js';
import { reviewScene } from '../packages/inkos-brain/src/scene/scene.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

function assert(cond, msg) {
  if (!cond) throw new Error(`FAIL: ${msg}`);
}

function mockCtx() {
  return {
    bookDir: '/tmp/test',
    chapter: 1,
    pov: '林深',
    present: ['老周'],
    chapterTask: { 目标: '进入废弃医院', 第一阻碍: '监视', 第二阻碍: '灰印失控', 博弈: '与老周试探' },
    state: { 地点: '城北', 时间: 'Day 3', 任务: '找线索' },
    stateBoard: '秩维局：调取监控',
    volume: { goals: ['进入世界'] },
    facts: [{ fact: '残页已消耗', chapter: 1 }],
    timeline: [{ day: 2, chapter: 1 }],
    knowledge: { matrix: [{ info: '灰印来源', 林深: 'partial', 老周: 'unknown' }] },
    relationships: [{ from: '林深', to: '老周', trust: -1, hostility: 2 }],
    resources: { by_character: { 林深: { cash: 0 } } },
    characters: {
      林深: { name: '林深', realGoal: '证明父母', bottomLine: '不出卖他人', raw: '林深档案' },
      老周: { name: '老周', realGoal: '收集证据', raw: '老周档案' },
    },
    factions: { 秩维局: { name: '秩维局', raw: '秩维局势力' } },
    writingBible: '身体先行。禁止然后。',
    worldBible: '情感是物质。禁止解释设定。',
    foreshadow: [],
    currentChapterMd: '',
    currentStateMd: '',
  };
}

async function testEventBus() {
  const bus = new EventBus();
  let fired = 0;
  bus.on('sceneFinished', () => { fired += 1; });
  await bus.emit('sceneFinished', { scene: { id: 's1' } });
  assert(fired === 1, 'EventBus sceneFinished');
}

async function testDispatcher() {
  const bus = new EventBus();
  let completed = false;
  const dispatcher = new Dispatcher(bus, {
    onPipelineCompleted: async () => { completed = true; },
  });
  dispatcher.wire();
  await bus.emit('pipelineCompleted', {});
  assert(completed, 'Dispatcher pipelineCompleted');
}

function testPlannerDecision() {
  const ctx = mockCtx();
  const intent = planChapter(ctx, 1);
  assert(intent.scenes.length >= 3, 'Planner scenes');
  const decision = evaluateDecisions(ctx, intent);
  assert(decision.decisions.length > 0, 'Decision results');
}

function testScenePipeline() {
  const ctx = mockCtx();
  const intent = planChapter(ctx, 1);
  const scene = { ...intent.scenes[0], text: '林深掌心在跳。灰印往腕上爬。他没有停。门轴响了。' };
  const review = reviewScene(scene, scene.text);
  assert(review.pass, 'Scene review');
  const consistency = checkConsistency(ctx, intent, '', scene);
  assert(consistency.pass, 'Scene consistency');
}

function testDynamicPrompt() {
  const ctx = mockCtx();
  const intent = planChapter(ctx, 1);
  const scene = intent.scenes[0];
  scene.entities = ['林深', '秩维局'];
  const prompt = buildDynamicPrompt(ctx, scene);
  assert(prompt.totalChars > 0 || prompt.totalTokens > 0, 'Dynamic prompt tokens');
  assert((prompt.totalTokens || 0) <= 2200, 'Dynamic prompt token budget');
  assert(!prompt.modules.some((m) => m.key.includes('秩维局') === false && m.label.includes('势力')), 'Faction loaded when in scene');
}

function testChapterValidation() {
  const ctx = mockCtx();
  const intent = planChapter(ctx, 1);
  const text = '林深推门。灰印在跳。老周在暗处。但是他必须进去。下一步：三楼。威胁还在。墙上发现新刻痕。';
  const metrics = computeMetrics(text, intent, intent.scenes, { types: ['information'] });
  const reader = simulateReaders(text, intent, metrics);
  const critic = runCritic(text, intent, metrics, reader);
  const validation = validateChapter(text, intent, metrics, reader);
  assert(validation.pass, `Validation 7-check (${validation.passed}/7)`);
  assert(critic.overall > 0, 'Critic score');
}

function testMetricsFeedback() {
  const intent = planChapter(mockCtx(), 1);
  const text = '短';
  const metrics = computeMetrics(text, intent, intent.scenes, { types: [] });
  const feedback = analyzeMetricsFeedback(metrics, { chapters: [metrics] }, intent.scenes);
  assert(feedback.low === true, 'Metrics low detection');
  assert(feedback.suggestions.length > 0, 'Metrics suggestions');
}

function testAdaptive() {
  const tmpDir = path.join(ROOT, 'books/我的小说/books');
  const books = fs.existsSync(tmpDir) ? fs.readdirSync(tmpDir).filter((d) => {
    const p = path.join(tmpDir, d, 'book.json');
    return fs.existsSync(p);
  }) : [];
  if (!books.length) {
    console.log('  skip adaptive (no book)');
    return;
  }
  const bookDir = path.join(tmpDir, books[0]);
  const state = applyAdaptiveFeedback(bookDir, {
    metrics: { conflictDensity: 1, mindRatio: 0.1, wordCount: 2500 },
    reader: { readingDrive: 55 },
    critic: { overall: 58, plannerHints: [{ type: 'conflictPriority', delta: 0.1 }] },
    dashboard: { chapters: [{ conflictDensity: 1, dialogueRatio: 0.2 }] },
  });
  assert(state.weights.conflictPriority >= 1, 'Adaptive conflictPriority');
}

async function main() {
  const tests = [
    ['EventBus', testEventBus],
    ['Dispatcher', testDispatcher],
    ['Planner+Decision', () => testPlannerDecision()],
    ['Scene Pipeline', () => testScenePipeline()],
    ['Dynamic Prompt', () => testDynamicPrompt()],
    ['Chapter Validation', () => testChapterValidation()],
    ['Metrics Feedback', () => testMetricsFeedback()],
    ['Adaptive Brain', () => testAdaptive()],
  ];

  let passed = 0;
  for (const [name, fn] of tests) {
    try {
      await fn();
      console.log(`✓ ${name}`);
      passed += 1;
    } catch (err) {
      console.error(`✗ ${name}: ${err.message}`);
      process.exitCode = 1;
    }
  }
  console.log(`\n${passed}/${tests.length} passed`);
}

main();
