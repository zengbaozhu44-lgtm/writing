/**
 * Dynamic Prompt Engine — 薄包装，委托 @inkos/prompt Compiler
 */
import { compileScenePrompt, compileChapterEntityContext } from '../../../inkos-prompt/src/index.js';

export function buildDynamicPrompt(ctx, scene) {
  return compileScenePrompt(ctx, scene);
}

export function buildDynamicContextForChapter(ctx, intent) {
  return compileChapterEntityContext(ctx, intent);
}
