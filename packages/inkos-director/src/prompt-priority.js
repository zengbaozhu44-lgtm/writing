/**
 * Prompt Priority Layer — 防止 Writer 规则淹没
 * P1 强制执行 > P2 剧情增强 > P3 参考信息
 * 高优先级覆盖低优先级；P3 不得压过 P1
 */
import { formatSituationBlock } from './situation-engine.js';
import { formatQuestionBlock } from './question-engine.js';
import {
  formatRewardBrief,
  formatTensionRewardThreatBlock,
} from './reward-engine.js';
import {
  formatCharacterDesireBlock,
} from './character-desire-engine.js';
import { formatEmotionCurveBlock } from './emotion-curve-engine.js';
import { formatHookOutputBlock } from './hook-ladder.js';
import { formatBeatStateSequenceBlock } from './beat-state.js';
import { formatConflictBlock } from './conflict-engine.js';
import { formatClimaxSceneBlock } from './climax-engine.js';
import { formatVoiceDnaBlock } from './voice-dna.js';
import { formatWriterSceneArcBlock } from './writer-scene-arc.js';
import { formatReaderEmotionBlock } from './reader-emotion-engine.js';
import { formatQuestionLifecycleBlock } from './question-lifecycle.js';
import { formatPromiseLifecycleBlock } from './promise-lifecycle.js';
import { formatCharacterTransformationBlock } from './character-transformation.js';
import { formatCharacterBehaviorBlock } from './character-behavior.js';
import { formatSceneEntertainmentBlock } from './scene-entertainment.js';
import { formatHumanWritingPolicyBlock } from './human-writing-policy.js';
import { formatChapterAuthorGoalBlock } from './chapter-author-goal.js';
import { formatReaderSatisfactionBlock } from './reader-satisfaction.js';
import { formatSceneRhythmBlock } from './chapter-rhythm.js';
import { formatSceneEndingBlock } from './scene-ending-library.js';
import {
  formatSceneWriterRuntimeBlock,
  formatWriterRuntimePolicyBlock,
} from './writer-runtime.js';
import { formatWriterCraftPromptBlock, resolveCraftMode } from './writer-craft-runtime.js';

export const PROMPT_PRIORITIES = {
  p0: { id: 'p0', label: 'P0 · Writer Craft', rule: '职业作者会不会这样写？阅读体验 > 规则完成' },
  p1: { id: 'p1', label: 'P1 · 强制执行', rule: '违反即 Scene 无效' },
  p2: { id: 'p2', label: 'P2 · 剧情增强', rule: '应完成，可被 P1 覆盖' },
  p3: { id: 'p3', label: 'P3 · 参考信息', rule: '辅助自然感，不得压过 P0/P1/P2' },
};

function formatConflictP1(executionPlan = {}) {
  if (executionPlan.conflict?.opponent) {
    return formatConflictBlock(executionPlan.conflict);
  }
  const plan = executionPlan.scenePlan || {};
  const outcome = executionPlan.sceneOutcome || {};
  if (!plan.goal && !plan.obstacle) return '';

  return [
    '### Conflict · 冲突必落地（P1）',
    `- **Character Goal**：${plan.goal || '—'}`,
    `- **Conflict / Obstacle**：${plan.obstacle || '—'}`,
    `- **Consequence 须落地**：${outcome.consequence || plan.consequence || '—'}`,
    '- 用动作与对白体现冲突，禁止贴标签式说明',
  ].join('\n');
}

function formatBeatSequenceCore(executionPlan = {}) {
  if (!executionPlan.beats?.length) return '';

  const lines = [
    '### Beat 序列 · 逐段执行（P2）',
    '按序完成；每 Beat After ≠ Before。',
  ];

  for (const b of executionPlan.beats) {
    lines.push(
      `${b.order}. **${b.label}** [${b.libraryBeat}] · 约 ${b.wordBudget} 字`,
      `   ${(b.action || b.content || '').slice(0, 90)}`,
    );
    if (b.isRewardBeat && b.reward?.payoff) {
      lines.push(`   Payoff：${b.reward.payoff.slice(0, 50)}`);
    }
  }
  return lines.join('\n');
}

function wrapP3Reference(title, content = '') {
  if (!content?.trim()) return '';
  return [
    `### ${title}（P3 · 参考）`,
    '以下辅助一致性与自然感，**不得**让每句话都像在「完成任务」。',
    content,
  ].join('\n\n');
}

/**
 * 将 Writer 输入拆为三层优先级
 */
export function buildWriterPromptLayers({
  executionPlan = {},
  storyMemoryBlock = '',
  adaptiveBlock = '',
  commercialRules = '',
  continuationBlock = '',
  boundaryBlock = '',
  revealBlock = '',
  hookBlock = '',
  promptRulesBlock = '',
  chapterTitleBlock = '',
  voiceDna = null,
} = {}) {
  const ep = executionPlan;
  const hookP1 = ep.hookOutput
    ? formatHookOutputBlock(ep.hookOutput)
    : (ep.hookLadderEntry?.hookOutput
      ? formatHookOutputBlock(ep.hookLadderEntry.hookOutput)
      : '');

  const climaxBlock = formatClimaxSceneBlock(ep.climaxRole, ep.chapterClimax);

  const runtimeBlock = formatSceneWriterRuntimeBlock(ep.writerRuntime);
  const craftMode = resolveCraftMode({
    climaxRole: ep.climaxRole,
    sceneRhythm: ep.sceneRhythm,
    beat: ep.beats?.[0],
  });
  const craftBlock = formatWriterCraftPromptBlock({
    craftMode,
    climaxRole: ep.climaxRole,
  });

  const p0 = craftBlock;

  const p1 = [
    runtimeBlock,
    formatChapterAuthorGoalBlock(ep.chapterAuthorGoal),
    formatWriterSceneArcBlock(ep.writerSceneArc),
    formatCharacterTransformationBlock(ep.characterTransformation),
    formatCharacterBehaviorBlock(ep.characterBehavior),
    formatHumanWritingPolicyBlock(ep.humanWritingPolicy),
    formatCharacterDesireBlock(ep.characterDesire, ep.characterPush),
    formatConflictP1(ep),
    climaxBlock,
    formatSituationBlock(ep.situation),
    formatEmotionCurveBlock(ep.emotionCurve),
    formatReaderEmotionBlock(ep.readerEmotion),
    hookP1,
  ].filter(Boolean).join('\n\n');

  const questionLifecycleBlock = formatQuestionLifecycleBlock(
    ep.questions?.lifecycle,
    ep.questionRegistry,
  );

  const p2 = [
    formatSceneEntertainmentBlock(ep.sceneEntertainment),
    formatQuestionBlock(ep.questions),
    questionLifecycleBlock,
    formatPromiseLifecycleBlock(ep.promiseLifecycle),
    formatReaderSatisfactionBlock(ep.readerSatisfaction),
    formatSceneEndingBlock(ep.sceneEnding),
    formatTensionRewardThreatBlock(ep.reward),
    formatRewardBrief(ep.reward),
    formatSceneRhythmBlock(ep.sceneRhythm),
    formatBeatStateSequenceBlock(ep.beatStatePlans),
    formatBeatSequenceCore(ep),
  ].filter(Boolean).join('\n\n');

  const p3 = [
    formatVoiceDnaBlock(voiceDna),
    wrapP3Reference('Story Memory', storyMemoryBlock),
    wrapP3Reference('Adaptive / Preference', adaptiveBlock),
    wrapP3Reference('商业写法与风格', commercialRules),
    chapterTitleBlock ? wrapP3Reference('章标题', chapterTitleBlock) : '',
    wrapP3Reference('硬性约束', promptRulesBlock),
    wrapP3Reference('承接上文', continuationBlock),
    wrapP3Reference('Scene 边界', boundaryBlock),
    wrapP3Reference('Reveal 节奏', revealBlock),
    wrapP3Reference('Hook 参考', hookBlock),
  ].filter(Boolean).join('\n\n');

  return { p0, p1, p2, p3 };
}

export function formatLayeredWriterPrompt(layers = {}, {
  writerChecklist = '',
  policyBlock = '',
} = {}) {
  const parts = [
    '<!-- writer-prompt-priority-v2-craft -->',
    policyBlock,
    writerChecklist,
    '',
    '## Priority 0 · Professional Writer Craft',
    `**${PROMPT_PRIORITIES.p0.rule}**`,
    '',
    layers.p0 || '（无 Craft 块）',
    '',
    '## Priority 1 · Writer Runtime 强制执行',
    `**${PROMPT_PRIORITIES.p1.rule}** — Runtime V2 · Story State · Conflict · Transformation · Action Hook`,
    '',
    layers.p1 || '（无 P1 块）',
    '',
    '## Priority 2 · 剧情增强',
    `**${PROMPT_PRIORITIES.p2.rule}** — Question · Promise · Payoff · Rhythm · Entertainment`,
    '',
    layers.p2 || '',
    '',
    '## Priority 3 · 参考信息',
    `**${PROMPT_PRIORITIES.p3.rule}** — Memory · Style · Voice DNA · Preference`,
    '',
    layers.p3 || '',
  ];

  return parts.filter(Boolean).join('\n\n');
}

export function compileLayeredStudioBlock(opts = {}) {
  const layers = buildWriterPromptLayers(opts);
  return formatLayeredWriterPrompt(layers, {
    writerChecklist: opts.writerChecklist || '',
    policyBlock: opts.policyBlock || '',
  });
}
