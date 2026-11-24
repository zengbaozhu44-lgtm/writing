/**
 * Director 编排 — 五层拆分：Story / Chapter / Scene / Scene Review / Chapter Review
 * 最高目标：Reader Addiction — Director 只负责规划；Review 不阻塞 Writer
 */
import { runStoryDirector } from './story-director.js';
import { runChapterDirector } from './chapter-director.js';
import { runSceneDirector } from './scene-director.js';
import { runSceneReview } from './scene-review.js';
import { runChapterReview } from './chapter-review.js';
import {
  loadAdaptiveHints,
  buildAdaptivePlannerBlock,
  buildWriterAdaptiveDirectives,
  recordAdaptiveHint,
  hintsFromStoryThread,
  loadDirectorOverrides,
} from './adaptive-planner.js';
import { runStoryMemory } from '@inkos/story-memory';
import { buildReaderFeedbackDirectorBlock, loadReaderFeedbackState, getReaderFeedbackAdjustmentsForChapter } from './reader-feedback.js';
import { mergeAdaptiveIntoIntent } from './writer-first.js';

/** @deprecated Writer 内禁止调用；保留导出以免旧代码 import 失败 */
export const MAX_DIRECTOR_REWRITES = 0;

/**
 * @deprecated Writer 生成过程中禁止 Director 检测
 */
export async function runDirectorWritten() {
  throw new Error(
    'runDirectorWritten 已废弃：Director 只负责规划，正文检查请使用 runSceneReview（Review 阶段）',
  );
}

function mergeDirectorBriefs(...parts) {
  return parts.filter(Boolean).join('\n\n');
}

/** Runtime Lifecycle Hook — phase: plan | reviewed | memorized */
export async function runDirectorPhase(phase, payload = {}) {
  const {
    scene,
    intent,
    chapter,
    bookDir,
    sceneResult,
    storyDna = {},
  } = payload;

  switch (phase) {
    case 'plan': {
      const hints = bookDir ? loadAdaptiveHints(bookDir, chapter) : [];
      const directorOverrides = bookDir && chapter != null
        ? loadDirectorOverrides(bookDir, chapter)
        : null;
      const ctx = payload.ctx || {};
      const storyMemory = runStoryMemory({
        bookDir,
        chapter,
        scene,
        ctx,
        storyDna,
      });
      const adaptiveWriterDirectives = buildWriterAdaptiveDirectives(hints, directorOverrides);
      const adaptiveBlock = buildAdaptivePlannerBlock(hints, {
        sceneIndex: scene?.index,
        storyMemoryBlock: [
          storyMemory.writerBlock || storyMemory.block,
          chapter > 1 && bookDir
            ? buildReaderFeedbackDirectorBlock(loadReaderFeedbackState(bookDir, chapter - 1), { chapter })
            : '',
        ].filter(Boolean).join('\n\n'),
        directorOverrides,
      });

      const story = runStoryDirector({ storyDna, chapter });
      const chapterDir = runChapterDirector({ intent, chapter, bookDir, storyDna });
      const readerPref = bookDir && chapter != null
        ? getReaderFeedbackAdjustmentsForChapter(bookDir, chapter)
        : null;
      let enrichedIntent = {
        ...intent,
        _storyDirector: story,
        _chapterDirector: chapterDir,
        _storyDna: storyDna,
        hookLadder: chapterDir.hookLadder,
        hookCurve: chapterDir.hookCurve,
        mysteryCurve: chapterDir.mysteryCurve,
        payoffCurve: chapterDir.payoffCurve,
        nextChapterGuidanceInput: chapterDir.nextChapterGuidanceInput,
        readerWhyContinue: chapterDir.readerWhyContinue,
        readerAddictionGoal: chapterDir.curvePlan?.readerAddictionGoal,
        _readerPreference: readerPref?.adjustments || null,
        readerPreference: readerPref?.readerPreference || chapterDir.readerPreference || null,
        bookQuestion: chapterDir.bookQuestion,
        chapterQuestion: chapterDir.chapterQuestion,
        _storyMemory: storyMemory,
        _adaptiveDirectorOverrides: directorOverrides,
        _adaptiveWriterDirectives: adaptiveWriterDirectives,
      };
      enrichedIntent = mergeAdaptiveIntoIntent(enrichedIntent, directorOverrides);
      const sceneDir = runSceneDirector({
        scene,
        intent: enrichedIntent,
        adaptiveBlock,
        chapterDir,
      });

      const promptAppend = mergeDirectorBriefs(
        story.brief,
        chapterDir.brief,
        sceneDir.brief,
      );

      return {
        ...payload,
        intent: enrichedIntent,
        directors: {
          story,
          chapter: chapterDir,
          scene: sceneDir,
        },
        adaptiveHints: hints,
        storyMemory: {
          metrics: storyMemory.metrics,
          hints: storyMemory.hints,
          dashboard: storyMemory.dashboard,
        },
        promptAppend,
        scene: {
          ...scene,
          goal: sceneDir.scenePlan?.goal || scene.goal,
          obstacle: sceneDir.scenePlan?.obstacle || scene.obstacle,
          choice: sceneDir.scenePlan?.choice || scene.choice,
          consequence: sceneDir.scenePlan?.consequence || scene.consequence,
          escalation: sceneDir.scenePlan?.choice || scene.escalation,
          newInformation: sceneDir.scenePlan?.newInformation || scene.newInformation,
          cliffhanger: sceneDir.scenePlan?.cliffhanger || scene.cliffhanger,
          hook: sceneDir.scenePlan?.cliffhanger || scene.hook,
          directorBrief: sceneDir.brief,
          scenePlan: sceneDir.scenePlan,
          situation: sceneDir.situation,
          questions: sceneDir.questions,
          readerWhy: sceneDir.readerWhy,
          executionPlan: sceneDir.executionPlan,
          sceneOutcome: sceneDir.sceneOutcome,
        },
      };
    }

    case 'reviewed': {
      const text = sceneResult?.scene?.text || scene?.text || '';
      let review;
      try {
        review = runSceneReview({
          text,
          scene: sceneResult?.scene || scene,
          intent,
          chapter,
          bookDir,
          storyDna: payload.storyDna || storyDna,
          writingBible: payload.writingBible || payload.ctx?.writingBible || '',
        });
      } catch (err) {
        console.warn('[director] Scene Review 软分析失败（忽略）:', err?.message || err);
        return {
          phase,
          chapter,
          bookDir,
          sceneId: scene?.id,
          role: 'scene-review',
          mode: 'analysis-only',
          pass: true,
          blocking: false,
          analysisOnly: true,
          shouldReplan: false,
          softError: err?.message || String(err),
          note: 'Scene Review 异常已忽略，不阻断 nextScene',
        };
      }

      return {
        phase,
        chapter,
        bookDir,
        sceneId: scene?.id,
        role: 'scene-review',
        mode: 'analysis-only',
        pass: true,
        analysisPass: review.analysisPass,
        warning: review.warning,
        retry: false,
        verdict: review.verdict,
        weightedScore: review.weightedScore,
        total: review.weightedScore,
        scores: review.scores,
        weights: review.weights,
        suggestions: review.suggestions,
        weakest: review.weakest,
        blocking: false,
        analysisOnly: true,
        shouldReplan: false,
        replanReason: null,
        reportPath: review.reportPath,
        note: `Scene Review 软分析 ${review.weightedScore} 分 · Adaptive Hints 已记录 · 不阻断`,
        review,
      };
    }

    case 'memorized': {
      return {
        phase,
        chapter,
        bookDir,
        sceneId: scene?.id || sceneResult?.scene?.id,
        role: 'scene-director',
        archived: true,
        at: new Date().toISOString(),
      };
    }

    default:
      return { phase, skipped: true };
  }
}

export {
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
};
