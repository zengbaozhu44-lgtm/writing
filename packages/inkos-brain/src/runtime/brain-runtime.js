/**
 * Brain Runtime — 默认委托 Runtime 2.0 Orchestrator
 */
import { createRuntime } from '../../../inkos-runtime/src/pipeline/orchestrator.js';
import {
  runBrainPipelineLegacy,
  getScenePrompt,
  loadBrainRun,
} from './brain-runtime-legacy.js';

export { getScenePrompt, loadBrainRun };

export function runBrainPipeline(bookDir, options = {}) {
  if (options.legacy) {
    return runBrainPipelineLegacy(bookDir, options);
  }
  const runtime = createRuntime(bookDir, { writer: options.writer });
  return runtime.runChapter(options);
}
