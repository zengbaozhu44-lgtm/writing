/**
 * Writer Optimization Layer — Studio 稳定层
 * 不修改 Runtime Pipeline / Brain / Prompt Compiler 核心
 */
export { WRITER_FIXED_RULES, buildPromptRulesBlock } from './prompt-rules.js';
export {
  COMMERCIAL_WRITER_CORE,
  RHYTHM_BEAT_RULE,
  SCENE_STRUCTURE_RULE,
  FIRST_PAGE_RULE,
  ANTI_AI_FLAVOR_RULE,
  SCENE_NEW_CONTENT_RULE,
  COMPLETION_STANDARD,
  COMMERCIAL_PRINCIPLES,
  COMMERCIAL_PIPELINE,
  COMMERCIAL_COMPLETION_GOALS,
  BEAT_COMMERCIAL_PRINCIPLES,
  BEAT_ANTI_AI_RULES,
  buildBeatWriterDirective,
  buildCommercialPrinciplesBlock,
  buildCommercialPipelineBlock,
  buildCommercialCompletionBlock,
  buildCommercialWriterRulesBlock,
} from './commercial-writer-rules.js';
export {
  resolveChapterSuspenseTitle,
  sanitizeChapterFilename,
  buildChapterTitleBlock,
} from './chapter-title.js';
export { extractContinuationAnchor, buildContinuationBlock } from './continuation-engine.js';
export {
  deriveSceneBoundaries,
  buildBoundaryBlock,
  trimToSceneBoundary,
} from './scene-boundary.js';
export { getRevealBudget, buildRevealBlock, scoreWorldExposure } from './reveal-manager.js';
export { generateSceneHook, buildHookBlock, scoreHookQuality } from './hook-generator.js';
export {
  evaluateWriterMetrics,
  buildRewriteInstructions,
  computeRepetitionRate,
} from './writer-metrics.js';
export {
  compileStudioWriterPrompt,
  persistWriterOptimizationMeta,
  persistBeatExecutionLog,
  collectPriorScenesText,
  getWriterOptimizationDir,
} from './compile-writer-prompt.js';
export {
  executeBeatSequence,
  writeBeatWithRuntimeV2,
  resolveExecutionPlan,
  compileSingleBeatPrompt,
  takeLastTwoSentences,
  BEAT_GENERATION_TEMPERATURE,
  BEAT_SYSTEM,
  buildBeatSystem,
} from './beat-execution.js';
export {
  createContinuityState,
  mergeContinuityState,
  validateCrossBeatConsistency,
  formatBeatContinuitySummary,
  formatEventPhaseDirective,
  remapLibraryInstruction,
  slimSceneGoalLine,
  extractBodyStateFromText,
  extractActionMotifs,
  extractInterfaces,
  inferEventPhase,
  countAntithesis,
  REVEAL_KEY_PATTERNS,
  ACTION_MOTIF_PATTERNS,
  INTERFACE_PATTERNS,
} from './beat-continuity.js';
export {
  DEFAULT_GOLDEN_SAMPLE,
  SCENE_WRITING_PROFILES,
  resolveWriterMode,
  resolveWriterModeForScene,
  resolveSceneWritingProfile,
  resolveGoldenSample,
  buildSampleDrivenSystem,
  formatGoldenSampleBlock,
  buildAuthorNotesBlock,
  buildEmotionAnchorBlock,
  compileSingleScenePrompt,
  executeSceneWrite,
  saveStyleSample,
  slimSealedPromptForScene,
} from './sample-driven-writer.js';
export {
  BEAT_PROMPT_CHAR_BUDGET,
  BEAT_SAMPLE_MAX_CHARS,
  BEAT_HARD_RULES,
  resolveWriterModeForScene as resolveBeatWriterMode,
  buildSlimBeatSystem,
  compileSlimBeatUserPrompt,
  slimLoreForBeat,
  takeContinuationTail,
  formatStoryMapWriterBrief,
  validateStateChange,
} from './beat-slimmer.js';
export {
  buildExecutionIntelligence,
  persistExecutionIntelligence,
} from './execution-intelligence.js';
export {
  analyzeBeatEmotion,
  buildSceneEmotionCurve,
  buildChapterEmotionCurve,
} from './emotion-curve.js';
export { simulateReader } from './reader-simulation.js';
export {
  persistWriterMetricsLog,
  MAX_STUDIO_REWRITES,
} from './post-review.js';
export {
  analyzeCommercialScene,
  runWriterOptimizer,
  COMMERCIAL_THRESHOLD,
} from '@inkos/writer-optimizer';
