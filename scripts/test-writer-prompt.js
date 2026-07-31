/**
 * Commercial Writer Prompt 规则单元验证
 */
import {
  buildCommercialWriterRulesBlock,
  compileStudioWriterPrompt,
  resolveChapterSuspenseTitle,
  buildChapterTitleBlock,
  deriveSceneBoundaries,
  buildBoundaryBlock,
} from '../packages/inkos-studio-server/src/writer-optimization/index.js';

const scene = {
  index: 1,
  goal: '在维修与取药之间做出选择',
  conflict: '系统拒绝跨区处方',
  obstacle: '系统拒绝跨区处方',
  escalation: '信用档案亮黄灯',
  newInformation: '配送网存在未加密阴谋日志',
  cliffhanger: '上报还是假装没看见？',
};

const intent = {
  pov: '林晓',
  mainGoal: scene.goal,
  mainQuestion: '谁在凌晨四点刷新世界？',
  obstacles: [scene.conflict],
  scenes: [scene],
};

const ch1Rules = buildCommercialWriterRulesBlock({ chapter: 1, scene, intent });
if (!ch1Rules.includes('原则 1') || !ch1Rules.includes('事件改变局势')) {
  console.error('FAIL: ch1 commercial principles');
  process.exit(1);
}
if (!ch1Rules.includes('Reader Preference Learning') || !ch1Rules.includes('Reward Engine')) {
  console.error('FAIL: commercial pipeline block');
  process.exit(1);
}
if (!ch1Rules.includes('剧情推进但读者无感')) {
  console.error('FAIL: completion goals');
  process.exit(1);
}
if (!ch1Rules.includes('300') || !ch1Rules.includes('上瘾')) {
  console.error('FAIL: ch1 commercial rules');
  process.exit(1);
}
if (!ch1Rules.includes('唯一主 POV')) {
  console.error('FAIL: ch1 single POV rule');
  process.exit(1);
}
if (!ch1Rules.includes('400～600')) {
  console.error('FAIL: rhythm beat rule');
  process.exit(1);
}
if (!ch1Rules.includes('Goal') || !ch1Rules.includes('Cliffhanger')) {
  console.error('FAIL: scene structure');
  process.exit(1);
}

const title = resolveChapterSuspenseTitle(intent, 1, {});
if (title.includes('第1章') || title === '第 1 章') {
  console.error('FAIL: generic chapter title', title);
  process.exit(1);
}
if (!title.includes('？') && !title.includes('?')) {
  console.error('FAIL: suspense title should be question-like', title);
  process.exit(1);
}

const titleBlock = buildChapterTitleBlock(intent, 1, {});
if (!titleBlock.includes('禁止「第 X 章」')) {
  console.error('FAIL: chapter title block');
  process.exit(1);
}

const boundaries = deriveSceneBoundaries(scene, intent, { chapter: 1 });
const boundaryBlock = buildBoundaryBlock(boundaries);
if (!boundaryBlock.includes('New Information') || !boundaryBlock.includes('Escalation')) {
  console.error('FAIL: five-part boundary');
  process.exit(1);
}

const compiled = compileStudioWriterPrompt({
  basePrompt: '### base',
  scene,
  chapter: 1,
  intent,
  ctx: {},
  storyDna: { core_hook: '切片人生' },
});

if (!compiled.prompt.includes('commercial-writer-rules')) {
  console.error('FAIL: compiled prompt missing commercial rules');
  process.exit(1);
}
if (!compiled.prompt.includes('原则 2') || !compiled.prompt.includes('紧张 → 释放 → 更大危机')) {
  console.error('FAIL: compiled prompt missing commercial principles');
  process.exit(1);
}
if (!compiled.prompt.includes('Writer Optimization · 硬性约束')) {
  console.error('FAIL: compiled prompt missing hard rules');
  process.exit(1);
}
if (!compiled.prompt.includes('谁在凌晨四点刷新世界')) {
  console.error('FAIL: chapter title in prompt');
  process.exit(1);
}
if (!compiled.meta.chapterTitle) {
  console.error('FAIL: meta chapterTitle');
  process.exit(1);
}

const ch2Scene = { ...scene, index: 2 };
const ch2Rules = buildCommercialWriterRulesBlock({ chapter: 2, scene: ch2Scene, intent });
if (ch2Rules.includes('唯一主 POV')) {
  console.error('FAIL: ch2 should not have ch1-only POV lock');
  process.exit(1);
}

console.log('title', title);
console.log('OK');
