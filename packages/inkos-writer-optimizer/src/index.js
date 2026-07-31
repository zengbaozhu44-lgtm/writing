/**
 * @inkos/writer-optimizer
 *
 * Prompt Compiler → LLM → Writer Optimizer → Auto Polish → Novel
 */
export {
  runWriterOptimizer,
  buildOptimizerReport,
  persistOptimizerReport,
  persistDraftArtifacts,
  getWriterOptimizerDir,
} from './analyzer.js';

export {
  runAutoPolish,
  applyRuleAutoPolish,
  buildPolishInstructions,
  extractPolishTail,
  POLISH_TAIL_MIN,
  POLISH_TAIL_MAX,
} from './auto-polish.js';

export {
  runModuleOptimizers,
  MODULE_OPTIMIZERS,
  extractDialogueRegions,
  extractConflictRegions,
  extractDescriptionRegions,
  extractEndingRegion,
  scoreModuleFragment,
} from './module-optimizers.js';

export { buildLineDiff, summarizeDiff } from './diff.js';

export {
  computeWriterOptimizerScore,
  OPTIMIZER_DIMENSIONS,
  scorePacingRhythm,
  scoreClimax,
  scoreHook,
  scoreCommercialPleasure,
  scoreStyleConsistency,
  scoreCharacterConsistency,
  scoreInfoRelease,
} from './quality-score.js';

/** @deprecated 旧商业规则 API，保留兼容 */
export {
  analyzeCommercialScene,
  MAX_REWRITES,
  COMMERCIAL_THRESHOLD,
} from './optimizer.js';

export { computeCommercialScore, computeSuspenseScore } from './commercial-score.js';

export {
  analyzeOpening,
  analyzePacing,
  analyzeConflictChain,
  analyzeDialogue,
  analyzeEmotion,
  analyzeInfoDensity,
  analyzeHookEnd,
} from './analyzers/index.js';

export { analyzeBeatCompliance } from './analyzers/beat-compliance.js';
