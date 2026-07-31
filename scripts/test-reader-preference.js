/**
 * Reader Preference Learning 单元验证
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  detectSceneElementWeights,
  computeElementEngagement,
  analyzeReaderPreferences,
  buildReaderPreference,
  getReaderFeedbackAdjustmentsForChapter,
  processSceneReaderFeedback,
  finalizeChapterReaderFeedback,
  assignLibraryBeats,
} from '../packages/inkos-director/src/index.js';

const relationshipText = [
  '林晓盯着对方，沉默了三秒。',
  '「你信不信我？」她问。',
  '他犹豫了一下，还是点了点头。',
  '这一刻，他们成了盟友。',
  '但门外传来了脚步声——',
].join('');

const weights = detectSceneElementWeights({
  text: relationshipText,
  executionPlan: {
    sceneType: 'dialogue',
    libraryTypesUsed: ['Relationship', 'Decision', 'Twist'],
    reward: { type: 'Relationship' },
  },
});

if ((weights.relationship ?? 0) < 0.3) {
  console.error('FAIL: relationship weight too low', weights);
  process.exit(1);
}

const engagement = computeElementEngagement(weights, {
  continueProbability: 90,
  curiosity: 72,
});

if (!engagement.relationship || engagement.relationship.score < 50) {
  console.error('FAIL: relationship engagement', engagement);
  process.exit(1);
}

const history = [];
for (let ch = 1; ch <= 5; ch += 1) {
  history.push({
    chapter: ch,
    elementScores: {
      relationship: 82 + ch,
      twist: 60,
      action: 55,
      conspiracy: 58,
    },
    avgContinueProbability: 88 + ch,
    avgCuriosity: 70,
  });
}

const analysis = analyzeReaderPreferences(history);
if (!analysis.readerPreference) {
  console.error('FAIL: expected readerPreference', analysis);
  process.exit(1);
}
if (analysis.readerPreference.favoriteElement !== 'relationship') {
  console.error('FAIL: favorite should be relationship', analysis.readerPreference);
  process.exit(1);
}
if (!analysis.readerPreference.recommendation.includes('Relationship')) {
  console.error('FAIL: recommendation missing Relationship', analysis.readerPreference);
  process.exit(1);
}
if (!analysis.adjustments.relationshipBeatBoost) {
  console.error('FAIL: should boost relationship beat', analysis.adjustments);
  process.exit(1);
}

const twistHistory = history.map((h) => ({
  ...h,
  elementScores: { ...h.elementScores, twist: 92, relationship: 65 },
}));
const twistAnalysis = analyzeReaderPreferences(twistHistory);
if (twistAnalysis.readerPreference?.favoriteElement !== 'twist') {
  console.error('FAIL: twist should win', twistAnalysis.readerPreference);
  process.exit(1);
}
if ((twistAnalysis.adjustments.mysteryBoost || 0) < 10) {
  console.error('FAIL: twist should boost mystery', twistAnalysis.adjustments);
  process.exit(1);
}

const pref = buildReaderPreference({ id: 'relationship', name: '角色关系', score: 88 }, {
  avgContinueProbability: 90,
  windowChapters: 5,
});
if (!pref.favoriteElement || pref.score !== 88) {
  console.error('FAIL: buildReaderPreference', pref);
  process.exit(1);
}

const libDefault = assignLibraryBeats(4, { prevLastType: null });
const libRel = assignLibraryBeats(4, {
  prevLastType: null,
  preferLibraryBeats: ['Relationship'],
});
if (libRel.goal !== 'Relationship' && !Object.values(libRel).includes('Relationship')) {
  console.error('FAIL: preferLibraryBeats should pick Relationship', { libDefault, libRel });
  process.exit(1);
}

// Integration: temp book dir feedback loop
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'inkos-pref-'));
const bookDir = tmp;
try {
  for (let ch = 1; ch <= 3; ch += 1) {
    for (let si = 1; si <= 2; si += 1) {
      processSceneReaderFeedback({
        bookDir,
        chapter: ch,
        scene: { index: si },
        intent: { sceneCount: 2 },
        readerSimulation: { continueProbability: 90, curiosity: 75, questionCount: 3, dropRisk: 20 },
        executionPlan: {
          sceneType: 'dialogue',
          libraryTypesUsed: ['Relationship', 'Twist', 'Discovery'],
          reward: { type: 'Relationship' },
        },
        draftText: relationshipText,
      });
    }
    finalizeChapterReaderFeedback({ bookDir, chapter: ch });
  }

  const adj = getReaderFeedbackAdjustmentsForChapter(bookDir, 4);
  if (!adj.readerPreference?.favoriteElement) {
    console.error('FAIL: chapter 4 should have readerPreference', adj);
    process.exit(1);
  }
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}

console.log('preference', analysis.readerPreference.favoriteElement, analysis.readerPreference.score);
console.log('recommendation', analysis.readerPreference.recommendation.slice(0, 50));
console.log('OK');
