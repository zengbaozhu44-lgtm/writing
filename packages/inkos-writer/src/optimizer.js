/**
 * Writer Optimizer — Prompt Compiler 与 DeepSeek 之间的优化层
 */
import { buildStyleBlock } from './style-adapter.js';
import { buildRhythmBlock } from './rhythm.js';
import { buildInfoReleaseBlock } from './info-release.js';
import { buildConflictBlock, analyzeConflict } from './conflict.js';
import { buildHookBlock, scoreHook, plannerHookHints } from './hook.js';
import { countTokens } from '../../inkos-prompt/src/token-meter.js';

const OPTIMIZER_TOKEN_BUDGET = 180;

export function optimizeWriterPrompt({ prompt, scene, ctx, intent }) {
  if (!prompt || !scene) return { prompt: prompt || '', meta: {} };

  const blocks = [
    buildRhythmBlock(scene),
    buildStyleBlock(ctx, scene),
    buildInfoReleaseBlock(scene, ctx),
    buildConflictBlock(scene),
    buildHookBlock(scene),
  ].filter(Boolean);

  let optimizerBlock = blocks.join('\n\n');
  if (countTokens(optimizerBlock) > OPTIMIZER_TOKEN_BUDGET) {
    optimizerBlock = blocks.slice(0, 2).join('\n\n');
  }

  const conflict = analyzeConflict(scene);
  const hookScores = scene.beat === 'hook' ? scoreHook(scene) : null;

  const optimized = [
    prompt,
    '',
    '<!-- writer-optimizer v1 -->',
    optimizerBlock,
  ].filter(Boolean).join('\n');

  return {
    prompt: optimized,
    meta: {
      rhythm: scene.beat,
      conflict,
      hookScores,
      plannerHints: [
        ...plannerHookHints(scene),
      ],
      optimizerTokens: countTokens(optimizerBlock),
    },
  };
}

export function wrapWriter(baseWriter, options = {}) {
  return async function optimizedWriter(args) {
    const { prompt, scene, ctx, intent, bookDir, chapter } = args;
    const { prompt: optimizedPrompt, meta } = optimizeWriterPrompt({ prompt, scene, ctx, intent });

    let retryCount = 0;
    const maxRetries = options.maxRetries ?? 0;
    let lastError;

    while (retryCount <= maxRetries) {
      try {
        const text = await baseWriter({ ...args, prompt: optimizedPrompt, _optimizerMeta: meta });
        return text;
      } catch (err) {
        lastError = err;
        retryCount += 1;
        if (retryCount > maxRetries) throw lastError;
      }
    }
    throw lastError;
  };
}
