/**
 * @inkos/writer-optimizer 单元验证 — 四模块优化器
 */
import {
  runWriterOptimizer,
  computeWriterOptimizerScore,
  runModuleOptimizers,
  MODULE_OPTIMIZERS,
  OPTIMIZER_DIMENSIONS,
} from '../packages/inkos-writer-optimizer/src/index.js';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const scene = {
  index: 1,
  id: 'ch1_s1',
  goal: '林晓必须在维修任务与取药之间做出选择',
  conflict: '系统拒绝跨区处方，时间只剩十五分钟',
};

const intent = {
  pov: '林晓',
  mainGoal: scene.goal,
  obstacles: [scene.conflict],
};

const ctx = {
  pov: '林晓',
  present: ['林晓'],
  characters: { 林晓: { raw: '冷静、观察型、女儿药急' } },
  writingBible: '硬切、身体先行、短句',
};

const styleDna = { rhythm: '短句', atmosphere: '冷感' };

const goodText = `
林晓推开维修舱门，工具箱砸在脚边——他迟到了。

「还有几台？」调度 AI 的声音没有起伏。

「三台。」他抹了把汗，「但我女儿的药——」

「规则优先。」AI 打断他。

林晓攥紧扳手。十五分钟前，药房 AI 以跨区无效拒了药；现在，社区管理员还在听证会上。他必须在完成第六台维修与赶去线上授权之间选一条路——而信用档案已经亮起了黄灯。

他深吸一口气，转向最后一台机器人。芯片里一段未加密日志跳出来：有人要在共识日利用配送网传传单。林晓盯着屏幕，指尖发冷，心里却烧起来——他到底该上报，还是假装没看见？
`;

const weakEndingText = goodText.replace(/他到底该上报，还是假装没看见？/, '他继续工作。');

if (MODULE_OPTIMIZERS.length !== 4) {
  console.error('FAIL: expected 4 module optimizers');
  process.exit(1);
}

const good = computeWriterOptimizerScore({
  text: goodText,
  scene,
  chapter: 2,
  intent,
  ctx,
  styleDna,
});

if (OPTIMIZER_DIMENSIONS.length !== 7) {
  console.error('FAIL: expected 7 dimensions');
  process.exit(1);
}
if (good.total < 70) {
  console.error('FAIL: good sample should score high', good);
  process.exit(1);
}

const modResult = await runModuleOptimizers({
  text: weakEndingText,
  scene,
  intent,
});

if (!modResult.modules?.ending) {
  console.error('FAIL: ending module missing');
  process.exit(1);
}
if (!modResult.modules.dialogue && !modResult.modules.conflict && !modResult.modules.ending) {
  console.error('FAIL: modules object incomplete', modResult.modules);
  process.exit(1);
}

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'inkos-wo-'));
const result = await runWriterOptimizer({
  text: weakEndingText,
  scene,
  chapter: 2,
  intent,
  ctx,
  styleDna,
  bookDir: tmp,
});

if (!result.reportPath?.endsWith('optimizer_report.json')) {
  console.error('FAIL: report not written');
  process.exit(1);
}
if (!result.modules) {
  console.error('FAIL: modules in result');
  process.exit(1);
}
for (const key of MODULE_OPTIMIZERS) {
  const m = result.modules[key];
  if (!m || m.scoreBefore == null) {
    console.error('FAIL: module score missing', key, m);
    process.exit(1);
  }
}

const report = JSON.parse(fs.readFileSync(result.reportPath, 'utf8'));
if (!report.modules || report.version !== 'writer-optimizer-4') {
  console.error('FAIL: report modules or version', report.version);
  process.exit(1);
}

if (result.blocking !== false) {
  console.error('FAIL: optimizer must not block');
  process.exit(1);
}

console.log('modules', Object.keys(result.modules).join(','));
console.log('ending', result.modules.ending.scoreBefore, '→', result.modules.ending.scoreAfter);
console.log('total', result.totalBefore, '→', result.total);
console.log('OK');
