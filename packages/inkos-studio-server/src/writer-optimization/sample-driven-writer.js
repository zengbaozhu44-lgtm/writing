/**
 * Sample-Driven Writer — 样本优先 + 精简约束
 *
 * 默认走 Beat Slimmer；Scene 仅作严格例外（短情绪流 + 显式申请）。
 * System：黄金样本≤400 + ≤5 硬规则；低频禁令留给 Optimizer 写后修。
 */
import fs from 'node:fs';
import path from 'node:path';
import { exists, readJson, readText } from '../../../inkos-core/src/lib/paths.js';
import { renderBeatForWriter } from '@inkos/runtime';
import {
  createWriterRuntimeSession,
  validateWriterRuntimeV2,
} from '@inkos/director';
import {
  loadBookStyleGene,
  resolveGeneSampleForScene,
  buildGeneSystemAppendix,
} from '../style-genebank/index.js';
import { pickDarkMonarchSampleForSceneType } from '../style-genebank/dark-monarch.js';
import {
  buildSlimBeatSystem,
  clipChars,
  formatStoryMapWriterBrief,
  resolveWriterMode as resolveWriterModeDefault,
  resolveWriterModeForScene,
  takeContinuationTail,
  BEAT_SAMPLE_MAX_CHARS,
} from './beat-slimmer.js';

/** 默认黄金样本（网文质感：画面 + 身体细节 + 信息藏动作）· ≤400 字 */
export const DEFAULT_GOLDEN_SAMPLE = [
  '雨滴砸在滑轨上，溅开成暗红色的水花。林异的手套已经磨破了三道口子，第四道正在渗血。',
  '他把尸体拖上推车，编号栏写着“数据溢出——认知污染”。第九区的夜雨裹着机油味，打在防护服的帽檐上，噼啪作响。',
  '',
  '“快点。”对讲机里传来调度员的声音，“天眼三分钟后过境。”',
  '',
  '林异没答话。他拽着滑轨往焚化区走，推车的轮子卡在裂缝里，尸体晃了一下，一只手从白布下滑出来——指甲全没了。',
  '',
  '他停了两秒。然后继续拖。',
].join('\n');

/** Scene 类型 → 温度 / 句长（不同场面不同写法） */
export const SCENE_WRITING_PROFILES = Object.freeze({
  action: { temp: 0.85, sentenceStyle: '短句硬切', maxLength: 18, label: '动作' },
  climax: { temp: 0.85, sentenceStyle: '短句硬切', maxLength: 18, label: '高潮' },
  opening: { temp: 0.82, sentenceStyle: '长短交错', maxLength: 28, label: '开场' },
  dialogue: { temp: 0.8, sentenceStyle: '对白推进', maxLength: 28, label: '对白' },
  emotional: { temp: 0.9, sentenceStyle: '长短交错', maxLength: 50, label: '情感' },
  exposition: { temp: 0.75, sentenceStyle: '信息藏动作', maxLength: 25, label: '铺陈' },
  reveal: { temp: 0.75, sentenceStyle: '信息密集', maxLength: 22, label: '揭示' },
  ending: { temp: 0.82, sentenceStyle: '钩子收束', maxLength: 24, label: '收束' },
  standard: { temp: 0.85, sentenceStyle: '长短交错', maxLength: 30, label: '标准' },
});

/**
 * Writer 模式：默认 beat；INKOS_WRITER_MODE=scene 可强制全 Scene（调试）
 * 单 Scene 例外见 resolveWriterModeForScene
 */
export function resolveWriterMode() {
  return resolveWriterModeDefault();
}

export { resolveWriterModeForScene };

export function resolveSceneWritingProfile(sceneType = 'standard') {
  const key = String(sceneType || 'standard').toLowerCase();
  if (SCENE_WRITING_PROFILES[key]) return { ...SCENE_WRITING_PROFILES[key], sceneType: key };
  if (/emotion|情感|对峙/.test(key)) return { ...SCENE_WRITING_PROFILES.emotional, sceneType: key };
  return { ...SCENE_WRITING_PROFILES.standard, sceneType: key || 'standard' };
}

/** 从 style_dna / writing bible / 风格基因库 / 默认样本解析黄金样本 */
export function resolveGoldenSample({ bookDir = null, styleDna = null, writingBible = '', sceneType = 'standard' } = {}) {
  const dna = styleDna && typeof styleDna === 'object' ? styleDna : {};

  // 风格基因包：按 sceneType 匹配微场景（优先于通用 style_sample）
  if (bookDir) {
    try {
      const gene = loadBookStyleGene(bookDir);
      if (gene?.packId) {
        const micro = resolveGeneSampleForScene(bookDir, sceneType);
        if (micro?.sample) return clipChars(micro.sample, BEAT_SAMPLE_MAX_CHARS);
      }
    } catch { /* genebank optional */ }
  }

  if (dna.genePackId === 'dark-monarch' || dna.genePackId === '暗夜君王') {
    const micro = pickDarkMonarchSampleForSceneType(sceneType);
    if (micro?.sample) return clipChars(micro.sample, BEAT_SAMPLE_MAX_CHARS);
  }

  const fromDna = [
    dna.goldenSample,
    dna.sampleText,
    dna.voice?.sampleText,
    ...(Array.isArray(dna.sampleLines) ? [dna.sampleLines.join('\n')] : []),
  ].map((s) => String(s || '').trim()).filter((s) => s.length >= 80);

  if (fromDna[0]) return clipChars(fromDna[0], BEAT_SAMPLE_MAX_CHARS);

  if (bookDir) {
    const file = path.join(bookDir, 'novel', '_system', 'style_sample.md');
    if (exists(file)) {
      const t = String(readText(file) || '').trim();
      if (t.length >= 80) return clipChars(t, BEAT_SAMPLE_MAX_CHARS);
    }
    try {
      const jsonPath = path.join(bookDir, 'novel', '_system', 'style_dna.json');
      if (exists(jsonPath)) {
        const j = readJson(jsonPath);
        if (j?.genePackId === 'dark-monarch') {
          const micro = pickDarkMonarchSampleForSceneType(sceneType);
          if (micro?.sample) return clipChars(micro.sample, BEAT_SAMPLE_MAX_CHARS);
        }
        const s = String(j?.goldenSample || j?.sampleText || (j?.sampleLines || []).join('\n') || '').trim();
        if (s.length >= 80) return clipChars(s, BEAT_SAMPLE_MAX_CHARS);
      }
    } catch { /* */ }
  }

  const bible = String(writingBible || '');
  const sampleMatch = bible.match(/风格样本[：:]\s*([\s\S]{80,500})/);
  if (sampleMatch) return clipChars(sampleMatch[1].trim(), BEAT_SAMPLE_MAX_CHARS);

  return clipChars(DEFAULT_GOLDEN_SAMPLE, BEAT_SAMPLE_MAX_CHARS);
}

/**
 * System Prompt：样本≤400 + ≤5 硬规则
 * geneAppendix 仅作极短技法提示（≤80），不再二次贴样本
 */
export function buildSampleDrivenSystem(goldenSample = DEFAULT_GOLDEN_SAMPLE, geneAppendix = '') {
  const hint = String(geneAppendix || '').trim();
  const slimHint = hint && !hint.includes('---')
    ? clipChars(hint, 80)
    : '';
  const base = buildSlimBeatSystem(goldenSample || DEFAULT_GOLDEN_SAMPLE);
  return slimHint ? `${base}\n${slimHint}` : base;
}

/** P0 永不裁剪的样本块（仍硬上限 400） */
export function formatGoldenSampleBlock(goldenSample = DEFAULT_GOLDEN_SAMPLE) {
  return [
    '### 风格样本（模仿质感，不要复述样本情节）',
    '---',
    clipChars(goldenSample || DEFAULT_GOLDEN_SAMPLE, BEAT_SAMPLE_MAX_CHARS),
    '---',
  ].join('\n');
}

/**
 * 作者笔记：导航短摘要（Map ≤10 行）+ 本 Scene 情绪目标
 */
export function buildAuthorNotesBlock({ executionPlan = {}, scene = {}, intent = {} } = {}) {
  const goal = executionPlan.chapterAuthorGoal || intent.chapterAuthorGoal || {};
  const plan = executionPlan.scenePlan || scene.scenePlan || {};
  const emotion = executionPlan.emotionCurve || executionPlan.readerEmotion || {};
  const pov = intent.storyMap?.pov || executionPlan.pov || scene.pov || intent.pov || '主角';
  const sceneGoal = plan.goal || scene.goal || intent.mainGoal || '';
  const feeling = goal.mainFeeling
    || emotion.targetEmotion
    || emotion.end
    || goal.readerEmotionEnd
    || '不安与好奇交织';

  const mapNotes = formatStoryMapWriterBrief(intent.storyMap);

  return [
    mapNotes,
    '',
    '【本 Scene】',
    `- POV「${pov}」应感到「${String(feeling).slice(0, 28)}」`,
    sceneGoal ? `- 推进：${String(sceneGoal).slice(0, 48)}` : '',
    goal.mustRemember ? `- 须记住：${String(goal.mustRemember).slice(0, 36)}` : '',
  ].filter(Boolean).join('\n');
}

/**
 * 情绪摘要：续写窗 = 末 1–2 句（不再用 200 字锚）
 */
export function buildEmotionAnchorBlock({
  priorText = '',
  prevScene = null,
  executionPlan = {},
  intent = {},
  scene = {},
} = {}) {
  const closing = scene?.inheritedEmotion
    || intent?.closingEmotion
    || intent?.narrativeMomentum?.closing_emotion
    || prevScene?.sceneOutcome?.emotion
    || executionPlan?.emotionCurve?.start
    || executionPlan?.readerEmotion?.start
    || null;

  const endFeeling = executionPlan?.emotionCurve?.end
    || executionPlan?.readerEmotion?.end
    || executionPlan?.chapterAuthorGoal?.readerEmotionEnd
    || null;

  const tail = String(priorText || prevScene?.text || '').trim();
  const excerpt = takeContinuationTail(tail, { preferOne: false });

  return [
    '### 前文情绪锚定',
    closing ? `- 上段情绪：「${closing}」` : '- 上段情绪：从续写句读取',
    excerpt ? `- 紧接续写（末句，严禁复读）：\n---\n${excerpt}\n---` : '- 本章开篇：动作/异常直入',
    endFeeling ? `- 本段推向：「${endFeeling}」` : '',
  ].filter(Boolean).join('\n');
}

/**
 * Scene 级 User Prompt（例外路径；仍保持精简）
 */
export function compileSingleScenePrompt({
  basePrompt = '',
  executionPlan = {},
  scene = {},
  intent = {},
  priorSceneText = '',
  goldenSample = DEFAULT_GOLDEN_SAMPLE,
  profile = null,
  bookDir = null,
  geneAppendix = '',
  rewriteHint = '',
} = {}) {
  const sceneType = executionPlan.sceneType || scene.sceneType || 'standard';
  const writing = profile || resolveSceneWritingProfile(sceneType);
  const beats = executionPlan.beats || [];
  const beatTrail = beats.map((b) => b.label || b.libraryBeat || b.structuralBeat).filter(Boolean).join(' → ');
  const plan = executionPlan.scenePlan || {};
  const wordTarget = scene.wordTarget || executionPlan.wordTarget || 800;

  const resolvedSample = resolveGoldenSample({
    bookDir: bookDir || intent?._bookDir || scene?._bookDir,
    styleDna: intent?.styleDna || intent?._styleDna,
    sceneType,
  }) || goldenSample;

  const authorNotes = buildAuthorNotesBlock({ executionPlan, scene, intent });
  const emotionBlock = buildEmotionAnchorBlock({
    priorText: priorSceneText,
    prevScene: (intent.scenes || []).find((s) => s.index === (scene.index ?? 1) - 1),
    executionPlan,
    intent,
    scene,
  });

  const slimBase = slimSealedPromptForScene(basePrompt);
  // Scene 例外也要控长：base 再砍
  const baseClip = slimBase.length > 800 ? `${slimBase.slice(0, 800)}…` : slimBase;

  return [
    formatGoldenSampleBlock(resolvedSample),
    geneAppendix && !String(geneAppendix).includes('---') ? clipChars(geneAppendix, 80) : '',
    '',
    baseClip,
    '',
    `Scene：${plan.goal || scene.goal || intent.mainGoal || '推进局势'}`,
    beatTrail ? `节拍参考：${beatTrail}` : '',
    `类型：${writing.label} · 约 ${wordTarget} 字`,
    '',
    authorNotes,
    '',
    emotionBlock,
    rewriteHint ? String(rewriteHint).slice(0, 200) : '',
    '',
    '写完整 Scene 正文。开头承接末句，结尾留钩子。只输出正文。',
  ].filter(Boolean).join('\n');
}

/** 去掉过长禁令堆叠，保留任务与设定 */
export function slimSealedPromptForScene(basePrompt = '') {
  const text = String(basePrompt || '');
  if (!text) return '';
  let out = text
    .replace(/## Writer Optimization · 硬性约束[\s\S]*?(?=\n## |\n### |\n---|\n$)/u, '')
    .replace(/### 商业铁律[\s\S]*?(?=\n## |\n### |\n---|\n$)/u, '')
    .replace(/^\d+\.\s*禁止[^\n]*\n/gmu, '')
    .replace(/^-\s*\*\*禁止[^\n]*\n/gmu, '');

  if (out.length > 6000) {
    out = `…[前文规则已压缩]…\n\n${out.slice(-4500)}`;
  }
  return out.trim();
}

/**
 * Scene 级一次生成 — 复用同一套 validateWriterRuntimeV2（opening/closing 当大 Beat）
 */
export async function executeSceneWrite({
  executionPlan,
  basePrompt,
  llmFn,
  intent = null,
  scene = null,
  goldenSample = DEFAULT_GOLDEN_SAMPLE,
  bookDir = null,
  onStart = null,
  onComplete = null,
  maxRewrites = Number(process.env.INKOS_SCENE_MAX_REWRITES || 2),
} = {}) {
  const profile = resolveSceneWritingProfile(executionPlan?.sceneType || scene?.sceneType);
  const prior = (intent?.scenes || []).find((s) => s.index === (scene?.index ?? 1) - 1);
  const priorText = prior?.text || '';
  const runBookDir = bookDir || intent?._bookDir || scene?._bookDir || null;
  const sceneType = executionPlan?.sceneType || scene?.sceneType || 'standard';
  // 样本已进 System；附录只留极短技法，避免二次堆样本
  const geneAppendix = runBookDir ? buildGeneSystemAppendix(runBookDir, sceneType) : '';
  const resolvedSample = resolveGoldenSample({
    bookDir: runBookDir,
    styleDna: intent?.styleDna || intent?._styleDna,
    sceneType,
  }) || goldenSample;

  const beats = executionPlan?.beats || [];
  const firstBeat = beats[0] || {};
  const lastBeat = beats[beats.length - 1] || firstBeat;
  const sceneAsBeat = {
    order: 0,
    label: 'Scene',
    libraryBeat: 'scene',
    beforeState: scene?.openingState
      || executionPlan?.openingState
      || firstBeat.beforeState
      || firstBeat.beatPlan?.beforeState
      || '局面尚未被本 Scene 改写',
    afterState: scene?.closingState
      || executionPlan?.closingState
      || lastBeat.afterState
      || lastBeat.beatPlan?.afterState
      || '局面必须改变',
    beatPlan: {
      beforeState: scene?.openingState || firstBeat.beforeState,
      afterState: scene?.closingState || lastBeat.afterState,
    },
    wordBudget: scene?.wordTarget || executionPlan?.wordTarget || 800,
  };

  onStart?.({ mode: 'scene', sceneType: profile.sceneType, temp: profile.temp });

  const system = buildSampleDrivenSystem(resolvedSample, geneAppendix);
  let wordTarget = scene?.wordTarget || executionPlan?.wordTarget || 1000;
  let rewriteHint = '';
  let cleaned = '';
  let validation = null;
  let attempts = 0;
  let lastUserPrompt = '';
  let needsHumanReview = false;

  while (attempts <= maxRewrites) {
    attempts += 1;
    const userPrompt = compileSingleScenePrompt({
      basePrompt,
      executionPlan,
      scene,
      intent,
      priorSceneText: priorText,
      goldenSample: resolvedSample,
      profile,
      bookDir: runBookDir,
      geneAppendix: '',
      rewriteHint,
    });
    lastUserPrompt = userPrompt;

    const text = await llmFn({
      system,
      userPrompt,
      beat: { ...sceneAsBeat, wordBudget: wordTarget },
      temperature: profile.temp,
      maxTokensHint: Math.min(2800, Math.round(wordTarget * 2.2)),
    });

    cleaned = String(text || '').trim();
    if (!cleaned) {
      rewriteHint = '【重写】上一版空正文。必须写出有动作与后果的完整 Scene。';
      continue;
    }

    validation = validateWriterRuntimeV2({
      text: cleaned,
      beat: sceneAsBeat,
      executionPlan,
      accumulatedText: priorText,
      beforeState: sceneAsBeat.beforeState,
      climaxRole: executionPlan?.climaxRole,
      sceneRhythm: executionPlan?.sceneRhythm,
      mode: attempts > 1 ? 'full' : 'light',
    });

    if (validation.pass) break;
    rewriteHint = validation.rewriteHint || '【重写】Before≠After 未成立；局面必须推进，禁止复读。';
  }

  // 降配再试 1 次
  if (validation && !validation.pass) {
    wordTarget = Math.max(200, Math.round(wordTarget / 2));
    attempts += 1;
    const userPrompt = compileSingleScenePrompt({
      basePrompt,
      executionPlan,
      scene,
      intent,
      priorSceneText: priorText,
      goldenSample: resolvedSample,
      profile,
      bookDir: runBookDir,
      geneAppendix: '',
      rewriteHint: `${rewriteHint}\n【降配】字数砍半，只写核心动作与一处信息落地。`,
    });
    lastUserPrompt = userPrompt;
    const text = await llmFn({
      system,
      userPrompt,
      beat: { ...sceneAsBeat, wordBudget: wordTarget },
      temperature: profile.temp,
      maxTokensHint: Math.min(1600, Math.round(wordTarget * 2.2)),
    });
    cleaned = String(text || '').trim() || cleaned;
    validation = validateWriterRuntimeV2({
      text: cleaned,
      beat: sceneAsBeat,
      executionPlan,
      accumulatedText: priorText,
      beforeState: sceneAsBeat.beforeState,
      climaxRole: executionPlan?.climaxRole,
      sceneRhythm: executionPlan?.sceneRhythm,
      mode: 'full',
    });
  }

  if (!cleaned) throw new Error('Scene 级写作返回空正文');
  if (validation && !validation.pass) needsHumanReview = true;

  const runtimeSession = createWriterRuntimeSession(executionPlan);
  const beatArtifacts = beats.map((b, i) => {
    const rendered = renderBeatForWriter({
      beat: b,
      intent: intent || {},
      scene: scene || {},
    });
    return {
      order: b.order ?? i + 1,
      beatOrder: b.order ?? i + 1,
      libraryBeat: b.libraryBeat || b.structuralBeat || null,
      hookType: b.hookType || null,
      tensionLevel: b.tensionLevel ?? null,
      craftMode: b.craftMode || null,
      content: rendered.content || b.content || '',
      beforeState: rendered.beforeState || '',
      afterState: rendered.afterState || '',
      prompt: i === 0 ? lastUserPrompt : '',
      userPrompt: i === 0 ? lastUserPrompt : '',
      text: i === 0 ? cleaned : '',
      validation: i === 0
        ? { ...validation, mode: 'scene-as-beat', needsHumanReview }
        : { pass: true, mode: 'scene-as-beat-proxy' },
      score: null,
      chars: i === 0 ? cleaned.replace(/\s/g, '').length : 0,
      beat: b,
    };
  });

  if (!beatArtifacts.length) {
    beatArtifacts.push({
      order: 1,
      beatOrder: 1,
      libraryBeat: 'scene',
      text: cleaned,
      prompt: lastUserPrompt,
      userPrompt: lastUserPrompt,
      validation: { ...validation, mode: 'scene-as-beat', needsHumanReview },
      chars: cleaned.replace(/\s/g, '').length,
    });
  }

  const result = {
    text: cleaned,
    parts: [{ text: cleaned, userPrompt: lastUserPrompt, validation, attempts }],
    beatArtifacts,
    executionPlan,
    hookRotation: executionPlan?.hookRotation || null,
    tensionArc: executionPlan?.tensionArc || null,
    beatMemory: null,
    beatStateDeltas: [],
    runtimeSession,
    sceneOutcome: executionPlan?.sceneOutcome || null,
    writerMode: 'scene',
    writingProfile: profile,
    needsHumanReview,
    validation,
    attempts,
  };

  onComplete?.(result);
  return result;
}

/** 持久化向导风格样本 */
export function saveStyleSample(bookDir, sampleText = '') {
  const text = String(sampleText || '').trim();
  if (!bookDir || text.length < 40) return null;
  const dir = path.join(bookDir, 'novel', '_system');
  fs.mkdirSync(dir, { recursive: true });
  const md = path.join(dir, 'style_sample.md');
  fs.writeFileSync(md, text, 'utf8');
  const jsonPath = path.join(dir, 'style_dna.json');
  try {
    const prev = exists(jsonPath) ? readJson(jsonPath) : {};
    const next = {
      ...prev,
      goldenSample: text.slice(0, 900),
      sampleLines: text.split(/\n+/).map((l) => l.trim()).filter(Boolean).slice(0, 12),
      updatedAt: new Date().toISOString(),
    };
    fs.writeFileSync(jsonPath, JSON.stringify(next, null, 2), 'utf8');
  } catch { /* */ }
  return md;
}
