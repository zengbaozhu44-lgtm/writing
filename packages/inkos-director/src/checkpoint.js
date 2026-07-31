import { CHECKPOINT_CHARS, charCount, splitCheckpoints } from './utils.js';
import { analyzeOpeningDrag } from './analyzers/opening.js';
import { analyzeConflictEscalation } from './analyzers/conflict.js';
import { analyzeDialogueDensity } from './analyzers/dialogue.js';
import { analyzeEmotionChange } from './analyzers/emotion.js';
import { analyzeInformationOverload } from './analyzers/information.js';
import { analyzeHookFormed } from './analyzers/hook.js';
import { analyzePacing } from '../pacing/index.js';
import { buildDirectorRewritePrompt } from './rewrite.js';
import { buildPacingRewriteSection } from './rewrite.js';

/**
 * 每 500 字检测一次 Scene 正文
 */
export function analyzeSceneCheckpoints(text, scene = {}, intent = {}) {
  const windows = splitCheckpoints(text, CHECKPOINT_CHARS);
  const checkpoints = [];
  const failures = [];

  for (let i = 0; i < windows.length; i++) {
    const win = windows[i];
    const ctx = {
      isFirst: i === 0,
      isLast: i === windows.length - 1,
      windowIndex: i,
      scene,
      intent,
      fullText: text,
      charCount: win.charCount,
    };

    const dims = {
      opening: analyzeOpeningDrag(win.text, ctx),
      conflict: analyzeConflictEscalation(win.text, ctx),
      dialogue: analyzeDialogueDensity(win.text, ctx),
      information: analyzeInformationOverload(win.text),
      hook: analyzeHookFormed(win.text, ctx),
    };

    const winFailures = Object.values(dims).flatMap((d) => d.failures);
    failures.push(...winFailures);

    checkpoints.push({
      index: i,
      charRange: `${i * CHECKPOINT_CHARS}-${(i + 1) * CHECKPOINT_CHARS}`,
      charCount: win.charCount,
      pass: winFailures.length === 0,
      failures: winFailures,
      dimensions: dims,
    });
  }

  const emotion = analyzeEmotionChange(text);
  if (!emotion.pass) failures.push(...emotion.failures);

  const pacing = analyzePacing(text, scene, intent);
  if (!pacing.pass) failures.push(...pacing.failures);

  const pass = failures.length === 0;

  return {
    pass,
    shouldStopScene: !pass,
    shouldRewrite: !pass,
    failures: [...new Set(failures)],
    checkpoints,
    emotion,
    pacing,
    totalChars: charCount(text),
    windowCount: windows.length,
    rewriteInstructions: pass
      ? ''
      : buildDirectorRewritePrompt({ failures, checkpoints, scene, intent, pacing }),
  };
}
