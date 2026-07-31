/**
 * Runtime Reader — 只读 Runtime 产出物
 * 禁止：业务计算、状态写入、Story Health 重算
 */
import path from 'node:path';
import { exists, readJson, readText } from '../../inkos-core/src/lib/paths.js';
import { brainSystemDir } from '../../inkos-brain/src/loader.js';
import { loadPromptMetrics, aggregateMetrics } from '../../inkos-prompt/src/metrics.js';
import { loadBrainRun } from '../../inkos-brain/src/runtime/brain-runtime.js';
import { loadStoryHealth } from '../../inkos-brain/src/health/story-health.js';
import { listSnapshots, diffSnapshots } from '../../inkos-brain/src/memory/git-memory.js';
import {
  getBookMeta,
  loadScenes,
  loadPlan,
  loadNovelModule,
  parseStateTable,
  parseStateBoard,
} from './book-service.js';

/** 从 runtime_state.json 读取 phase 展示字段（非业务计算） */
export function readRuntimeStatus(daemon) {
  const status = daemon.getStatus();
  return {
    phase: inferPhaseDisplay(status),
    ...status,
  };
}

function inferPhaseDisplay(status) {
  if (status.running && status.queueSize > 0) return 'Updating Memory';
  if (status.running) return 'Scene Writing';
  if (status.status === 'running') return 'Planning';
  if (status.lastFailure) return 'Reviewing';
  return 'Idle';
}

/** Story Health — 原样透传，禁止重算 */
export function readHealth(bookDir) {
  const data = loadStoryHealth(bookDir);
  return {
    overall: data?.current?.overallScore ?? 0,
    source: 'story_health.json',
    raw: data?.current ?? null,
    full: data,
  };
}

export function readState(bookDir) {
  const md = loadNovelModule(bookDir, 'current_state') || '';
  return { source: '08_current_state.md', fields: parseStateTable(md), raw: md };
}

export function readWorld(bookDir) {
  const md = loadNovelModule(bookDir, 'state_board') || '';
  return { source: '07_state_board.md', factions: parseStateBoard(md), raw: md };
}

export function readBrainStages(run, plan) {
  const stages = [
    { id: 'planner', label: 'Planner', status: plan ? 'done' : 'waiting' },
    { id: 'decision', label: 'Decision', status: plan?.decisionResult?.pass ? 'done' : plan ? 'failed' : 'waiting' },
    { id: 'conflict', label: 'Conflict', status: plan?.conflictResult?.pass ? 'done' : plan ? 'failed' : 'waiting' },
    { id: 'consistency', label: 'Consistency', status: 'waiting' },
    { id: 'reader', label: 'Reader', status: 'waiting' },
    { id: 'critic', label: 'Critic', status: 'waiting' },
  ];
  if (!run?.log) return stages;
  const stageMap = { metrics: null, reader: 'reader', critic: 'critic', validation: 'consistency', consistency: 'consistency' };
  for (const entry of run.log) {
    const id = stageMap[entry.stage] || entry.stage;
    const s = stages.find((x) => x.id === id);
    if (s) s.status = entry.pass === false ? 'failed' : 'done';
  }
  return stages;
}

export function readConsole(run, scenes, status) {
  const lines = [];
  for (const s of scenes?.scenes ?? []) {
    lines.push({
      label: `Scene ${s.index}`,
      status: s.status === 'done' ? 'pass' : s.status === 'writing' ? 'writing' : 'waiting',
    });
  }
  for (const entry of run?.log ?? []) {
    lines.push({
      label: entry.stage,
      status: entry.pass === false ? 'fail' : 'pass',
      detail: entry.overall ?? entry.readingDrive,
    });
  }
  if (status.lastMemoryUpdate) {
    lines.push({ label: 'Memory', status: 'pass', detail: 'Updated' });
  }
  return lines;
}

export function readAdaptive(bookDir) {
  const file = path.join(brainSystemDir(bookDir), 'adaptive_state.json');
  if (!exists(file)) return { weights: null, history: [] };
  const data = readJson(file);
  return { weights: data.weights, history: (data.history || []).slice(-10) };
}

export function readMemorySnapshots(bookDir) {
  return listSnapshots(bookDir);
}

export function readMemoryDiff(bookDir, fromId, toId) {
  return diffSnapshots(bookDir, fromId, toId);
}

/** Prompt Analytics — 只读 prompt_metrics.json */
export function readPromptAnalytics(bookDir, chapter) {
  const metrics = loadPromptMetrics(bookDir, chapter);
  const aggregate = aggregateMetrics(metrics);
  return {
    source: 'prompt_metrics.json',
    chapter,
    scenes: metrics.scenes || [],
    aggregate,
  };
}

export function assembleDashboard(bookDir, chapter, daemon, eventBuffer) {
  const status = readRuntimeStatus(daemon);
  const scenes = loadScenes(bookDir, chapter);
  const plan = loadPlan(bookDir, chapter);
  const run = loadBrainRun(bookDir, chapter);
  const health = readHealth(bookDir);
  const state = readState(bookDir);
  const world = readWorld(bookDir);
  const adaptive = readAdaptive(bookDir);
  const promptAnalytics = readPromptAnalytics(bookDir, chapter);
  const events = [...(eventBuffer || []), ...daemon.getEventLog(0)].slice(-80);

  return {
    book: getBookMeta(bookDir),
    chapter,
    runtime: status,
    health,
    healthRaw: health.raw,
    scenes: scenes.scenes || [],
    plan,
    run,
    brainStages: readBrainStages(run, plan),
    state: state.fields,
    world: world.factions,
    events,
    adaptive: adaptive.weights,
    adaptiveHistory: adaptive.history,
    console: readConsole(run, scenes, status),
    promptAnalytics,
  };
}
