/**
 * Event Pipeline — Scene / Chapter 事件链定义与执行
 */
import { runScenePipeline } from './scene-pipeline.js';
import { runChapterPipeline } from './chapter-pipeline.js';

export const SCENE_PIPELINE = ['analysis', 'adaptive_hints', 'memory'];
/** @deprecated Scene 级硬质检环已拆除 */
export const SCENE_PIPELINE_LEGACY = ['review', 'consistency', 'decision', 'memory'];
export const CHAPTER_PIPELINE = [
  'consistency',
  'metrics',
  'reader',
  'critic',
  'validation',
  'readerSimulator',
  'adaptive',
  'storyHealth',
  'stateUpdate',
  'gitMemory',
  'nextPlanner',
];

export async function executeSceneEventChain(bookDir, payload, bus) {
  const result = await runScenePipeline(bookDir, { ...payload, bus });
  if (result.pass && bus) {
    await bus.emit('memoryUpdated', {
      bookDir,
      chapter: payload.chapter,
      scope: 'scene',
      sceneId: result.scene?.id,
    });
  }
  return result;
}

export async function executeChapterEventChain(bookDir, payload, bus) {
  return runChapterPipeline(bookDir, payload, bus);
}
