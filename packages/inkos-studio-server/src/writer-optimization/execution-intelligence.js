/**
 * Writer Execution Intelligence — 追读动力分析编排
 * Writer First：learning-only，仅供 Reader Feedback 学习，不阻塞 Writer、不替代 Writer Prompt
 */
import fs from 'node:fs';
import path from 'node:path';
import { computeHookLevel, detectRewardDelivery } from '@inkos/director';
import { analyzeBeatCompliance } from '@inkos/writer-optimizer';
import { buildSceneEmotionCurve } from './emotion-curve.js';
import { simulateReader } from './reader-simulation.js';
import { getWriterOptimizationDir } from './compile-writer-prompt.js';

/** 分析模块仅学习，不驱动正文阻塞 */
export const EXECUTION_INTELLIGENCE_MODE = 'learning-only';

/**
 * 聚合 Beat Memory、Emotion Curve、Reader Simulation、Beat Compliance
 */
export function buildExecutionIntelligence({
  beatResult = {},
  executionPlan = null,
  scene = {},
  intent = {},
  draftText = '',
} = {}) {
  const parts = beatResult.parts || [];
  const beatMemory = beatResult.beatMemory || {};
  const text = String(draftText || beatResult.text || '').trim();

  const emotionCurve = buildSceneEmotionCurve(parts);
  emotionCurve.sceneIndex = scene.index ?? executionPlan?.sceneIndex ?? null;

  const hookPart = parts.find((p) => p.beat?.structuralBeat === 'hook');
  const hookEntry = executionPlan?.hookLadderEntry || hookPart?.beat?.hookLadder || {};
  const hookLevel = hookPart
    ? computeHookLevel(hookPart.text, hookEntry)
    : null;

  const readerSimulation = simulateReader({
    text,
    scene,
    intent,
    beatMemory,
    emotionCurve,
  });

  const beatCompliance = analyzeBeatCompliance({
    text,
    executionPlan,
    beatParts: parts,
  });

  if (hookLevel) {
    beatCompliance.hookImpact = hookLevel.hookLevel;
    beatCompliance.hookOutput = hookLevel.hookOutput;
    beatCompliance.hookBreakdown = {
      hookLevel: hookLevel.hookLevel,
      hookOutput: hookLevel.hookOutput,
      stageMatch: hookLevel.stageMatch,
      cognitiveUpgrade: hookLevel.cognitiveUpgrade,
      emotionalImpact: hookLevel.emotionalImpact,
      characterCost: hookLevel.characterCost,
      targetType: hookEntry.type ?? null,
      targetLevel: hookEntry.level ?? null,
    };
  }

  const reward = executionPlan?.reward || scene.scenePlan?.reward || null;
  const rewardDelivery = reward ? detectRewardDelivery(text, reward) : null;
  if (rewardDelivery) {
    beatCompliance.rewardDelivery = rewardDelivery;
  }

  return {
    version: 'writer-execution-intelligence-2',
    role: 'writer-execution-intelligence',
    mode: EXECUTION_INTELLIGENCE_MODE,
    learningOnly: true,
    sceneIndex: scene.index ?? executionPlan?.sceneIndex ?? null,
    sceneType: executionPlan?.sceneType ?? null,
    beatMemory,
    beatStateDeltas: beatResult.beatStateDeltas || [],
    emotionCurve,
    readerSimulation,
    beatCompliance,
    hookLevel,
    reward,
    rewardDelivery,
    blocking: false,
    generatedAt: new Date().toISOString(),
  };
}

export function persistExecutionIntelligence(bookDir, chapter, scene, report) {
  try {
    const dir = path.join(
      getWriterOptimizationDir(bookDir),
      `ch_${String(chapter).padStart(4, '0')}`,
    );
    fs.mkdirSync(dir, { recursive: true });
    const file = path.join(
      dir,
      `scene_${String(scene?.index ?? 0).padStart(2, '0')}_intelligence.json`,
    );
    fs.writeFileSync(file, JSON.stringify(report, null, 2), 'utf8');
    return file;
  } catch {
    return null;
  }
}
