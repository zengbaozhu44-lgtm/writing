/**
 * @inkos/director
 *
 * 五层 Director — 最高目标：Reader Addiction（不是 Story Quality）
 * - Story Director   — 长期悬念/伏笔/高潮/角色成长
 * - Chapter Director — Hook / Mystery / Payoff 三条曲线
 * - Scene Director   — 五要素 + 读者追读动力
 * - Scene Review     — Reader Addiction 维度评分（不阻塞）
 * - Chapter Review   — Reader Curve + nextChapterGuidance
 *
 * Director 输出标准：不只规划剧情，须回答读者为什么会继续看。
 */
export {
  runDirectorPhase,
  runDirectorWritten,
  MAX_DIRECTOR_REWRITES,
  runStoryDirector,
  runChapterDirector,
  runSceneDirector,
  runSceneReview,
  runChapterReview,
  loadAdaptiveHints,
  buildAdaptivePlannerBlock,
  recordAdaptiveHint,
  hintsFromStoryThread,
  loadDirectorOverrides,
  buildWriterAdaptiveDirectives,
} from './director.js';

export {
  buildStoryDirectorBrief,
  buildStoryAddictionArc,
} from './story-director.js';

export {
  buildChapterDirectorBrief,
} from './chapter-director.js';

export {
  buildChapterBlueprint,
  validateChapterBlueprint,
  answerBlueprintFourQuestions,
  formatChapterBlueprintBrief,
  blendRhythmDna,
  normalizeEnding,
  ChapterBlueprint,
  ENDING_TYPES,
  ENDING_TYPE_MAP,
  RHYTHM_GENES,
} from './chapter-blueprint.js';

export {
  buildChapterAuthorGoal,
  formatChapterAuthorGoalBlock,
  formatChapterAuthorGoalBrief,
} from './chapter-author-goal.js';

export {
  buildSceneDirectorBrief,
  buildScenePlan,
  buildSceneReaderWhy,
  runDirectorPlan,
  buildDirectorPlanBrief,
} from './scene-director.js';

export {
  persistSceneReviewReport,
  persistChapterReviewReport,
  persistReaderCurveReport,
  loadReaderCurveReport,
  loadSceneReviewReports,
  getReviewReportDir,
} from './review-report.js';

export {
  computeSceneQualityScore,
  resolveReviewVerdict,
  buildReviewSuggestions,
  REVIEW_DIMENSIONS,
  COMMERCIAL_REVIEW_DIMENSIONS,
  SUPPORT_REVIEW_DIMENSIONS,
  REVIEW_PASS_MIN,
  REVIEW_WARNING_MIN,
  scoreHookDensity,
  scoreQuestionDensity,
  scorePayoffDensity,
  scoreReaderCuriosity,
  scoreTwistStrength,
  scoreDialogue,
  scoreConflict,
  scoreHook,
  scoreEmotion,
  scoreStyle,
  scorePacing,
} from './quality-score.js';

export {
  buildChapterCurvePlan,
  analyzeSceneReaderCurves,
  buildReaderCurveReport,
  computeReaderAddictionScore,
  buildReaderWhyContinueSummary,
} from './reader-curve.js';

export {
  analyzeReaderSimulation,
  processSceneReaderFeedback,
  finalizeChapterReaderFeedback,
  loadReaderFeedbackState,
  getReaderFeedbackAdjustmentsForChapter,
  buildReaderFeedbackDirectorBlock,
  applyFeedbackToCurvePlan,
  buildAdjustedChapterCurvePlan,
  mergeStoryMemoryDirectives,
  FEEDBACK_THRESHOLDS,
} from './reader-feedback.js';

export {
  READER_PREFERENCE_ELEMENTS,
  PREFERENCE_WINDOW_CHAPTERS,
  detectSceneElementWeights,
  computeElementEngagement,
  aggregateChapterElementScores,
  analyzeReaderPreferences,
  buildReaderPreference,
  applyPreferenceToAdjustments,
  formatReaderPreferenceBlock,
  mergePreferenceAdjustments,
  getPreferenceElementById,
} from './reader-preference.js';

export {
  REWARD_TYPES,
  PROMISE_TYPES,
  classifyPromise,
  enrichPromise,
  buildSceneReward,
  collectOpenPromises,
  detectRewardDelivery,
  formatRewardBrief,
  formatRewardBlock,
  formatTensionRewardThreatBlock,
  getRewardTypeById,
} from './reward-engine.js';

export {
  buildSceneSituation,
  buildSituationBeatChain,
  formatSituationBlock,
  formatSituationBrief,
  detectStagnantWriting,
  SITUATION_DIMENSIONS,
  SITUATION_AXES,
} from './situation-engine.js';

export {
  buildBookQuestion,
  buildChapterQuestion,
  buildSceneQuestionPlan,
  formatQuestionBlock,
  formatQuestionBrief,
  formatChapterQuestionBlock,
} from './question-engine.js';

export {
  LIBRARY_BEAT_TYPES,
  STRUCTURAL_BEATS,
  LIBRARY_BEAT_DEFS,
  assignLibraryBeats,
  libraryBeatInstruction,
  sanitizeLibraryBeat,
  isDecisionHintAllowed,
} from './beat-library.js';

export {
  HOOK_LADDER_LEVELS,
  buildHookLadder,
  buildChapterHookLadder,
  getSceneHookLadderEntry,
  formatHookLadderInstruction,
  formatHookLadderBrief,
  formatHookOutputBlock,
  computeHookLevel,
  buildHookOutput,
  buildActionHookOutput,
  extractHookOutput,
  HOOK_COGNITIVE_STAGES,
  getHookStageByLevel,
  getHookStageByType,
} from './hook-ladder.js';

export {
  extractBeatStateDelta,
  mergeBeatMemory,
  formatBeatMemoryBlock,
} from './beat-memory.js';

export {
  STATE_CHANGE_DIMENSIONS,
  STATE_BEAT_SEQUENCE,
  buildSceneBeatPlan,
  buildSceneBeatPlans,
  detectStateChanges,
  validateBeatStateChange,
  formatBeatStatePlanBlock,
  formatBeatStateSequenceBlock,
  migrateScenePlan,
  normalizeStructuralBeat,
} from './beat-state.js';

export {
  SCENE_BEAT_PROFILES,
  inferSceneTypeForExecution,
  resolveSceneBeatProfile,
  resolveWordShare,
  resolveLibraryPools,
  getBeatHint,
} from './beat-pattern.js';

export {
  buildSceneExecutionPlan,
  buildBeatExecutionPromptBlock,
  buildSceneEngineBundle,
  derivePriorityGoal,
  deriveSceneFear,
  deriveSceneChoice,
} from './scene-execution.js';

export {
  buildCharacterDesireProfile,
  buildSceneCharacterPush,
  resolvePovCharacter,
  resolveCharactersFromDna,
  formatCharacterDesireBrief,
  formatCharacterDesireBlock,
} from './character-desire-engine.js';

export {
  buildSceneEmotionCurvePlan,
  formatEmotionCurveBrief,
  formatEmotionCurveBlock,
  EMOTION_LABELS,
} from './emotion-curve-engine.js';

export {
  buildReaderQuestionEntry,
  deriveReaderQuestion,
} from './question-engine.js';

export {
  PROMPT_PRIORITIES,
  buildWriterPromptLayers,
  formatLayeredWriterPrompt,
  compileLayeredStudioBlock,
} from './prompt-priority.js';

export {
  buildSceneConflict,
  formatConflictBlock,
  formatConflictBrief,
} from './conflict-engine.js';

export {
  buildChapterClimaxPlan,
  buildSceneClimaxRole,
  formatChapterClimaxBlock,
  formatClimaxSceneBlock,
  formatClimaxBrief,
} from './climax-engine.js';

export {
  resolveVoiceDna,
  formatVoiceDnaBlock,
  formatVoiceDnaBrief,
  BANNED_AI_PHRASES,
  GENRE_VOICE_PRESETS,
} from './voice-dna.js';

export {
  QUESTION_STATES,
  buildQuestionRegistry,
  applyQuestionLifecycle,
  createQuestionEntry,
  formatQuestionLifecycleBlock,
  formatChapterQuestionRegistryBlock,
} from './question-lifecycle.js';

export {
  PROMISE_STAGES,
  buildScenePromiseLifecycle,
  buildChapterPromisePlan,
  formatPromiseLifecycleBlock,
  formatPromiseLifecycleBrief,
  formatChapterPromisePlanBlock,
} from './promise-lifecycle.js';

export {
  buildReaderEmotionCurve,
  formatReaderEmotionBlock,
  formatReaderEmotionBrief,
  READER_EMOTIONS,
} from './reader-emotion-engine.js';

export {
  buildWriterSceneArc,
  formatWriterSceneArcBlock,
  getBeatRequiredDimensions,
  detectStagnantLoop,
  STATE_DIMENSIONS,
  SCENE_ARC_SEQUENCE,
} from './writer-scene-arc.js';

export {
  buildSceneCharacterTransformation,
  formatCharacterTransformationBlock,
  formatCharacterTransformationBrief,
  TRANSFORMATION_DIMENSIONS,
} from './character-transformation.js';

export {
  buildChoiceBehaviorLogic,
  formatCharacterBehaviorBlock,
  formatCharacterBehaviorBrief,
} from './character-behavior.js';

export {
  buildSceneEntertainment,
  formatSceneEntertainmentBlock,
  formatSceneEntertainmentBrief,
} from './scene-entertainment.js';

export {
  HUMAN_WRITING_POLICY,
  buildHumanWritingPolicy,
  formatHumanWritingPolicyBlock,
  formatHumanWritingPolicyBrief,
} from './human-writing-policy.js';

export {
  buildReaderSatisfaction,
  buildChapterReaderSatisfaction,
  formatReaderSatisfactionBlock,
  formatChapterReaderSatisfactionBlock,
  formatReaderSatisfactionBrief,
} from './reader-satisfaction.js';

export {
  RHYTHM_PHASES,
  buildChapterRhythmPlan,
  getSceneRhythmRole,
  formatChapterRhythmBlock,
  formatSceneRhythmBlock,
} from './chapter-rhythm.js';

export {
  SCENE_ENDING_TYPES,
  selectSceneEnding,
  formatSceneEndingBlock,
  formatSceneEndingBrief,
} from './scene-ending-library.js';

export {
  resolveSentenceRhythm,
} from './voice-dna.js';

export {
  WRITER_RUNTIME_POLICY,
  RUNTIME_BANNED_EXPRESSIONS,
  READER_EXPERIENCES,
  buildAuthorMode,
  formatAuthorModeBlock,
  buildBeatWriterIntent,
  buildProfessionalSceneWriting,
  enrichBeatsWithWriterRuntime,
  buildSceneWriterRuntime,
  formatWriterRuntimePolicyBlock,
  formatBeatWriterRuntimeBlock,
  formatSceneWriterRuntimeBlock,
  formatCurrentBeatRuntimeBlock,
} from './writer-runtime.js';

export {
  WRITER_RUNTIME_V2_POLICY,
  LIVE_AI_PHRASES,
  evaluateStoryStateChange,
  evaluateCauseEffect,
  evaluateMicroScene,
  evaluateLiveMonitor,
  validateWriterRuntimeV2,
  detectFourGramRepeat,
  formatWriterRuntimeV2PromptBlock,
  createWriterRuntimeSession,
  applyBeatToRuntimeSession,
} from './writer-runtime-v2.js';

export {
  TENSION_PROFILES,
  resolveTensionProfile,
  buildTensionArc,
  applyTensionArcToBeats,
  resolveCraftFromTension,
  formatTensionCraftBlock,
  clampTension,
} from './tension-arc.js';

export {
  BEAT_HOOK_TYPES,
  applyHookTypeRotation,
  validateHookRotation,
  formatHookTypeBlock,
} from './hook-rotation.js';

export {
  WRITER_CRAFT_POLICY,
  TELL_BANS,
  evaluateShowDontTell,
  evaluateSceneVisualization,
  evaluateSentenceRhythm,
  evaluateInformationDensity,
  evaluateLanguageVariation,
  evaluateProfessionalDialogue,
  evaluateParagraphPurpose,
  resolveCraftMode,
  validateWriterCraft,
  formatWriterCraftPromptBlock,
  extractExpressions,
} from './writer-craft-runtime.js';

export {
  WRITER_FIRST_POLICY,
  WRITER_QUALITY_MODULES,
  buildWriterExecutionChecklist,
  formatWriterExecutionChecklist,
  buildAdaptiveDirectorOverrides,
  applyAdaptiveDirectorOverrides,
  formatWriterFirstPolicyBlock,
  formatAdaptiveDirectorBrief,
  mergeAdaptiveIntoIntent,
} from './writer-first.js';

export {
  resolveGenreProfile,
  getGenreWeights,
  resolveReviewWeights,
  computeWeightedScore,
} from './genre-weights.js';

export { hintsFromSceneReview } from './adaptive-planner.js';

export { buildDirectorRewritePrompt, buildPacingRewriteSection } from './rewrite.js';
export { CHECKPOINT_CHARS, splitCheckpoints } from './utils.js';
export { persistDirectorLog, getDirectorLogDir } from './log.js';

export {
  analyzePacing,
  buildPacingReport,
  persistPacingReport,
  analyzeRealtimeWindow,
  analyzeEventBands,
  analyzeBeatSequence,
  getPacingReportDir,
} from '../pacing/index.js';
