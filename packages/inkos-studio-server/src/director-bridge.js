/**
 * Director ↔ Runtime 桥接（Studio 层）
 * Runtime 仅通过 sceneLifecycleHook 感知 Director
 */
import { runDirectorPhase, persistDirectorLog } from '@inkos/director';
import { studioEmitRuntimeEvent } from './event-stream.js';

export function createSceneLifecycleHook(bookDir, bookId) {
  return async function sceneLifecycleHook(phase, payload) {
    studioEmitRuntimeEvent(bookDir, bookId, 'pipelineStage', {
      chapter: payload.chapter,
      scene: payload.scene?.index,
      stage: 'director',
      status: 'running',
      detail: `Director · ${phase}`,
    });

    const result = await runDirectorPhase(phase, { ...payload, bookDir, bookId });

    if (phase === 'reviewed' && payload.chapter && payload.scene) {
      persistDirectorLog(bookDir, payload.chapter, payload.scene, {
        phase,
        pass: result.pass,
        failures: result.failures,
        checkpoints: result.checkpoints,
      });
    }

    studioEmitRuntimeEvent(bookDir, bookId, 'pipelineStage', {
      chapter: payload.chapter,
      scene: payload.scene?.index,
      stage: 'director',
      status: 'done',
      detail: `Director · ${phase} 完成`,
    });

    return result;
  };
}
