/**
 * Writer First — 模块三接线验证
 * Adaptive → Director Overrides → Writer Prompt 执行清单
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  buildAdaptiveDirectorOverrides,
  mergeAdaptiveIntoIntent,
  buildWriterExecutionChecklist,
  formatWriterExecutionChecklist,
  formatWriterFirstPolicyBlock,
  formatAdaptiveDirectorBrief,
  recordAdaptiveHint,
  loadDirectorOverrides,
  buildChapterDirectorBrief,
} from '../packages/inkos-director/src/index.js';
import { compileStudioWriterPrompt } from '../packages/inkos-studio-server/src/writer-optimization/compile-writer-prompt.js';

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'inkos-wf-'));
const bookDir = path.join(tmp, 'book');
fs.mkdirSync(path.join(bookDir, 'novel', '_system'), { recursive: true });

const overrides = buildAdaptiveDirectorOverrides({
  adjustments: {
    mysteryBoost: 10,
    firstScreenExplosion: true,
    libraryPrefer: ['Twist', 'Danger'],
  },
  readerPreference: {
    favoriteElement: 'twist',
    favoriteElementName: '反转',
    score: 82,
    recommendation: '读者偏好反转 — 下一章提高 Mystery Curve',
  },
  directives: ['提高 Mystery Curve', '章尾 Action Hook 逼 POV 行动'],
});

recordAdaptiveHint(bookDir, 2, {
  source: 'test',
  adjustments: overrides,
  readerPreference: overrides.readerPreference,
  items: overrides.writerDirectives,
});

const loaded = loadDirectorOverrides(bookDir, 2);
if (!loaded?.libraryPrefer?.includes('Twist')) {
  console.error('FAIL: director overrides not persisted', loaded);
  process.exit(1);
}

const adaptiveBrief = formatAdaptiveDirectorBrief(loaded);
if (!adaptiveBrief.includes('Beat Library 优先') || !adaptiveBrief.includes('反转')) {
  console.error('FAIL: adaptive director brief', adaptiveBrief);
  process.exit(1);
}

const intent = mergeAdaptiveIntoIntent(
  { pov: '林晓', scenes: [{ index: 1, goal: '追查阴谋' }] },
  loaded,
);
const chapterDir = buildChapterDirectorBrief(intent, 2, { bookDir });
if (!chapterDir.libraryPrefer?.includes('Twist')) {
  console.error('FAIL: chapter director libraryPrefer', chapterDir.libraryPrefer);
  process.exit(1);
}
if (!chapterDir.brief.includes('Adaptive → 本章 Director')) {
  console.error('FAIL: chapter brief missing adaptive block');
  process.exit(1);
}

const executionPlan = {
  sceneIndex: 1,
  situation: {
    openingWorldState: '信用档案正常',
    closingWorldState: '信用档案亮黄灯',
  },
  questions: {
    answeredQuestion: '谁在凌晨四点刷新世界？',
    newQuestions: ['黄灯意味着什么？', '上报还是隐瞒？'],
  },
  reward: {
    valid: true,
    promise: '系统会给出解释',
    payoff: '日志暴露未加密阴谋',
    deliveryBeat: 'newInformation',
  },
  hookOutput: {
    actionDeadline: '必须在天亮前上报',
    newAction: '潜入配送网',
  },
};

const checklist = buildWriterExecutionChecklist({
  executionPlan,
  intent: { ...intent, readerPreference: loaded.readerPreference },
  chapter: 2,
  sceneIndex: 1,
});
const checklistBlock = formatWriterExecutionChecklist(checklist);
if (!checklistBlock.includes('Writer 执行清单') || !checklistBlock.includes('兑现 Promise')) {
  console.error('FAIL: writer checklist', checklistBlock);
  process.exit(1);
}
if (!checklist.items.some((i) => i.id === 'adaptive_opening')) {
  console.error('FAIL: adaptive opening not in checklist', checklist.items);
  process.exit(1);
}

const policy = formatWriterFirstPolicyBlock();
if (!policy.includes('Writer First') || !policy.includes('禁止新增 Engine')) {
  console.error('FAIL: writer first policy');
  process.exit(1);
}

const scene = { index: 1, goal: '追查阴谋', conflict: '系统封锁' };
const compiled = compileStudioWriterPrompt({
  basePrompt: '### base',
  scene,
  chapter: 2,
  intent: { ...intent, _adaptiveDirectorOverrides: loaded },
  ctx: { bookDir },
  storyDna: { core_hook: '切片人生' },
  chapterDir,
});

if (!compiled.prompt.includes('writer-first-execution-checklist')) {
  console.error('FAIL: compiled prompt missing writer checklist');
  process.exit(1);
}
if (!compiled.prompt.includes('Writer First · 系统最高原则')) {
  console.error('FAIL: compiled prompt missing writer first policy');
  process.exit(1);
}
if (!compiled.prompt.includes('inkos-adaptive-writer-directives')) {
  console.error('FAIL: compiled prompt missing adaptive writer directives');
  process.exit(1);
}

fs.rmSync(tmp, { recursive: true, force: true });
console.log('OK: Writer First wiring');
