/**
 * Scene Pipeline Analysis Only — 无 Replan / 不因软失败阻断
 */
import { runScenePipeline } from '../packages/inkos-runtime/src/pipeline/scene-pipeline.js';
import { runSceneReview, hintsFromSceneReview } from '../packages/inkos-director/src/index.js';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'inkos-scene-soft-'));
const bookDir = tmp;

const intent = {
  pov: '林夜',
  mainGoal: '进入机房',
  scenes: [],
};

const scene = {
  id: 's1',
  index: 1,
  goal: '进入机房',
  conflict: '门锁',
  text: '他推开门。冷风扑面。权限栏没有亮。\n「谁改了名单？」苏晚的声音发紧。\n倒计时在墙上跳了两下。',
};

const empty = await runScenePipeline(bookDir, {
  chapter: 1,
  scene: { ...scene, text: '' },
  intent,
  ctx: { facts: [], characters: [] },
});
if (!empty.awaiting || empty.pass) {
  console.error('FAIL empty should await writer', empty);
  process.exit(1);
}

const ok = await runScenePipeline(bookDir, {
  chapter: 1,
  scene: { ...scene },
  intent,
  ctx: { facts: [], characters: [] },
  bus: { emit: async () => {} },
});

if (!ok.pass || ok.analysisOnly !== true || ok.blocking !== false) {
  console.error('FAIL soft pass', ok);
  process.exit(1);
}
if (ok.scene.status !== 'done') {
  console.error('FAIL status', ok.scene.status);
  process.exit(1);
}

const review = runSceneReview({
  text: scene.text,
  scene,
  intent,
  chapter: 1,
  bookDir,
});
if (review.blocking !== false || review.analysisOnly !== true || review.pass !== true || review.retry !== false) {
  console.error('FAIL review soft flags', review);
  process.exit(1);
}

const hint = hintsFromSceneReview({
  ...review,
  pass: review.analysisPass,
  verdict: review.quality?.verdict || review.verdict,
  quality: review.quality,
});
// hint may be null if score high enough — both ok

console.log('OK scene-analysis-only', {
  pipelinePass: ok.pass,
  reviewMode: review.mode,
  hint: Boolean(hint),
});

fs.rmSync(tmp, { recursive: true, force: true });
