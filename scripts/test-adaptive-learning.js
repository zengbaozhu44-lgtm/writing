/**
 * @inkos/adaptive-learning 单元验证
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  runAdaptiveLearning,
  analyzeLearningTrends,
  buildPromptAdjustments,
  LEARNING_DIMENSIONS,
  LOW_SCORE_THRESHOLD,
} from '../packages/inkos-adaptive-learning/src/index.js';

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'inkos-adaptive-'));

function writeReview(chapter, sceneIndex, scores) {
  const dir = path.join(
    tmp,
    'novel',
    '_system',
    'studio',
    'director',
    'reviews',
    `ch_${String(chapter).padStart(4, '0')}`,
    `scene_${String(sceneIndex).padStart(2, '0')}`,
  );
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'review_report.json'), JSON.stringify({
    scene: { index: sceneIndex },
    scores,
    weightedScore: 65,
  }, null, 2), 'utf8');
}

for (let ch = 1; ch <= 4; ch += 1) {
  writeReview(ch, 1, {
    hook: 62,
    conflict: 75,
    dialogue: 68,
    pacing: 72,
    emotion: 70,
    style: 74,
  });
}

const result = runAdaptiveLearning(tmp);
console.log('active', result.adjustments?.activeDimensions);

if (LEARNING_DIMENSIONS.length !== 6) {
  console.error('FAIL: expected 6 dimensions');
  process.exit(1);
}
if (!result.adjustments?.activeDimensions?.includes('hook')) {
  console.error('FAIL: hook should need boost', result.trends?.hook);
  process.exit(1);
}
if (!result.adjustments?.promptLines?.length) {
  console.error('FAIL: prompt lines missing');
  process.exit(1);
}
if (!result.adjustments?.endingBudgetBoost) {
  console.error('FAIL: ending budget boost for hook');
  process.exit(1);
}

const trends = analyzeLearningTrends([
  { dimScores: { hook: 65, conflict: 80, dialogue: 75, pacing: 72, emotion: 70, style: 74 } },
  { dimScores: { hook: 62, conflict: 78, dialogue: 74, pacing: 71, emotion: 69, style: 73 } },
  { dimScores: { hook: 60, conflict: 76, dialogue: 72, pacing: 70, emotion: 68, style: 72 } },
]);
const adj = buildPromptAdjustments(trends);
if (!adj.activeDimensions.includes('hook')) {
  console.error('FAIL: trend analysis hook boost');
  process.exit(1);
}
if (trends.hook.average >= LOW_SCORE_THRESHOLD) {
  console.error('FAIL: hook average should be low');
  process.exit(1);
}

console.log('OK');
