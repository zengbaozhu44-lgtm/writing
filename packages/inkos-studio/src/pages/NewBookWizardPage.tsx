import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, WizardContent, WritingDimensions, StoryDna } from '../api/client';
import { WizardSubStep } from '../components/WizardStepProgress';
import { WritingStyleBuilder } from '../components/WritingStyleBuilder';
import { WorldBuilder } from '../components/WorldBuilder';
import { StoryDirectorPanel } from '../components/StoryDirectorPanel';
import { ConversationCreator } from '../components/ConversationCreator';
import {
  EntityManager,
  EntityRecord,
  characterFieldsForGenre,
  FACTION_FIELDS,
  wizardCharacterToRecord,
  wizardFactionToRecord,
  recordsToWizardCharacters,
  recordsToWizardFactions,
} from '../components/entity-manager';
import { GENRE_TEMPLATES, getGenreTemplate, GenreTemplateId } from '../components/wizard/genreTemplates';
import { Step7ChapterTones } from '../components/wizard/Step7ChapterTones';
import { tonesAreComplete } from '../components/wizard/chapterTones';
import {
  WizardContext,
  createDefaultWizardContext,
  analyzeCharacterHints,
  findIsolatedFactions,
  buildConflictChecks,
  pushHint,
  WorldRuleItem,
} from '../components/wizard/wizardContext';
import {
  STYLE_GENE_PACKS,
  getStyleGenePack,
  darkMonarchVoice,
  pickDarkMonarchSampleForSceneType,
} from '../style-genebank';
import { FactionRelationGraph } from '../components/wizard/FactionRelationGraph';
import { VolumeOutlineEditor } from '../components/wizard/VolumeOutlineEditor';

/** 轻量指纹（向导内存态）— 分模块，便于精确 stale diff */
function wizardUpstreamParts(parts: {
  worldMd: string;
  characters: unknown[];
  factions: unknown[];
  conflictBrief: string;
  openingHook: string;
  coreMystery: string;
  chapterTones?: unknown[];
  volumeChapterCount?: number;
  worldRules?: unknown[];
}) {
  return {
    world: String(parts.worldMd || ''),
    characters: JSON.stringify(parts.characters || []),
    factions: JSON.stringify(parts.factions || []),
    conflict: [
      parts.conflictBrief || '',
      parts.openingHook || '',
      parts.coreMystery || '',
      JSON.stringify(parts.chapterTones || []),
      String(parts.volumeChapterCount || 30),
      JSON.stringify(parts.worldRules || []),
    ].join('\n'),
  };
}

function wizardUpstreamKey(parts: Parameters<typeof wizardUpstreamParts>[0]) {
  const p = wizardUpstreamParts(parts);
  return [p.world, p.characters, p.factions, p.conflict].join('\n§\n');
}

/** 8 步状态机（UI 1-based 标签） */
const STEPS = [
  '故事导演',
  '文风',
  '世界构建',
  '主要角色',
  '势力组织',
  '冲突校准',
  '前三章基调',
  '确认试写',
];

const WORLD_SUB_STEPS = ['时代背景', '世界历史', '世界规则', '力量体系', '地图', '社会结构'];
const SENSORY_OPTS = ['视觉', '触觉', '听觉', '嗅觉'];

type GenStatus = 'idle' | 'running' | 'done' | 'failed';
type StepKey = 'writing' | 'world' | 'characters' | 'factions' | 'volume' | 'chapterTask';

interface Positioning {
  title?: string;
  genre?: string;
  hook?: string;
  audience?: string;
  mainConflict?: string;
  sellingPoint?: string;
  theme?: string;
}

async function animateSubSteps(
  labels: string[],
  onUpdate: (steps: WizardSubStep[]) => void,
  task: () => Promise<unknown>,
) {
  const steps: WizardSubStep[] = labels.map((label) => ({ label, status: 'pending' }));
  onUpdate([...steps]);
  const tick = setInterval(() => {
    const runningIdx = steps.findIndex((s) => s.status === 'running');
    const nextPending = steps.findIndex((s) => s.status === 'pending');
    if (runningIdx >= 0) steps[runningIdx].status = 'done';
    if (nextPending >= 0) steps[nextPending].status = 'running';
    else if (runningIdx >= 0) steps[runningIdx].status = 'done';
    onUpdate([...steps]);
  }, 500);
  try {
    const result = await task();
    clearInterval(tick);
    onUpdate(labels.map((label) => ({ label, status: 'done' })));
    return result;
  } catch (e) {
    clearInterval(tick);
    const failedIdx = steps.findIndex((s) => s.status === 'running' || s.status === 'pending');
    if (failedIdx >= 0) steps[failedIdx].status = 'failed';
    onUpdate([...steps]);
    throw e;
  }
}

export function NewBookWizardPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<'step' | 'cocreate'>('step');
  const [step, setStep] = useState(0);
  const [pitch, setPitch] = useState('');
  const [preset, setPreset] = useState('暗夜君王');
  const [dimensions, setDimensions] = useState<WritingDimensions>({});
  const [presets, setPresets] = useState<{ id: string; description: string }[]>([]);
  const [storyDna, setStoryDna] = useState<StoryDna | null>(null);
  const [positioning, setPositioning] = useState<Positioning | null>(null);
  const [content, setContent] = useState<WizardContent>({});
  const [wizardContext, setWizardContext] = useState<WizardContext>(createDefaultWizardContext);
  const [genStatus, setGenStatus] = useState<Record<StepKey, GenStatus>>({
    writing: 'idle', world: 'idle', characters: 'idle', factions: 'idle', volume: 'idle', chapterTask: 'idle',
  });
  const [subSteps, setSubSteps] = useState<WizardSubStep[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [boundaryBusy, setBoundaryBusy] = useState(false);
  const [trialBusy, setTrialBusy] = useState(false);
  /** 卷纲生成时绑定的上游快照；变更后判定 stale */
  const [volumeBoundKey, setVolumeBoundKey] = useState('');
  const [volumeBoundParts, setVolumeBoundParts] = useState<Record<string, string> | null>(null);
  const [volumeDismissedKey, setVolumeDismissedKey] = useState('');

  const title = storyDna?.title || positioning?.title || pitch.slice(0, 12) || '未命名';
  const genre = wizardContext.genreTemplate || storyDna?.genre || positioning?.genre || '';
  const base = { pitch, preset, title, storyDna: storyDna || undefined };

  const characterRecords = useMemo(
    () => (content.characters?.characters || []).map(wizardCharacterToRecord),
    [content.characters],
  );
  const factionRecords = useMemo(
    () => (content.factions?.factions || []).map((f) => wizardFactionToRecord(f)),
    [content.factions],
  );
  const characterFields = useMemo(() => characterFieldsForGenre(genre), [genre]);
  const characterHints = useMemo(() => analyzeCharacterHints(characterRecords), [characterRecords]);
  const isolatedFactions = useMemo(() => findIsolatedFactions(factionRecords), [factionRecords]);
  const conflictChecks = useMemo(() => {
    const protagonist = characterRecords.find((r) => /主角|protagonist/i.test(r.fields.role || ''))
      || characterRecords[0];
    return buildConflictChecks({
      protagonistGoal: protagonist?.fields.goal || '',
      worldMd: content.world?.markdown || '',
      factions: factionRecords,
      characters: characterRecords,
    });
  }, [characterRecords, factionRecords, content.world?.markdown]);

  const conflictBrief = useMemo(() => {
    const lines = conflictChecks.map((c) => `${c.ok ? 'OK' : 'WARN'} ${c.label}：${c.detail}`);
    const main = wizardContext.conflictCore
      || positioning?.mainConflict
      || storyDna?.main_conflict
      || '';
    const stakes = wizardContext.conflictStakes || '';
    return [
      main && `主线冲突：${main}`,
      stakes && `赌注：${stakes}`,
      ...lines,
    ].filter(Boolean).join('\n');
  }, [
    conflictChecks,
    positioning?.mainConflict,
    storyDna?.main_conflict,
    wizardContext.conflictCore,
    wizardContext.conflictStakes,
  ]);

  const upstreamParts = useMemo(() => wizardUpstreamParts({
    worldMd: content.world?.markdown || '',
    characters: content.characters?.characters || [],
    factions: content.factions?.factions || [],
    conflictBrief,
    openingHook: wizardContext.openingHook,
    coreMystery: wizardContext.coreMystery,
    chapterTones: wizardContext.chapterTones,
    volumeChapterCount: wizardContext.volumeChapterCount,
    worldRules: wizardContext.worldRules,
  }), [
    content.world?.markdown,
    content.characters?.characters,
    content.factions?.factions,
    conflictBrief,
    wizardContext.openingHook,
    wizardContext.coreMystery,
    wizardContext.chapterTones,
    wizardContext.volumeChapterCount,
    wizardContext.worldRules,
  ]);

  const upstreamKey = useMemo(
    () => [upstreamParts.world, upstreamParts.characters, upstreamParts.factions, upstreamParts.conflict].join('\n§\n'),
    [upstreamParts],
  );

  const volumeChangedParts = useMemo(() => {
    if (!content.volume?.markdown || !volumeBoundParts) return [] as string[];
    return (['world', 'characters', 'factions', 'conflict'] as const)
      .filter((k) => volumeBoundParts[k] !== upstreamParts[k]);
  }, [content.volume?.markdown, volumeBoundParts, upstreamParts]);

  const volumeStale = Boolean(
    content.volume?.markdown
    && volumeBoundKey
    && volumeChangedParts.length > 0
    && volumeDismissedKey !== upstreamKey,
  );

  const buildVolumeContext = () => ({
    upstreamBrief: [
      `预估章数：${wizardContext.volumeChapterCount || 30}`,
      wizardContext.openingHook ? `开篇钩子：${wizardContext.openingHook}` : '',
      wizardContext.coreMystery ? `长线悬念：${wizardContext.coreMystery}` : '',
      conflictBrief ? `冲突校准：\n${conflictBrief}` : '',
      characterRecords.length
        ? `主要角色：\n${characterRecords.slice(0, 12).map((r) =>
          `- ${r.fields.name || '未命名'}｜${r.fields.role || r.fields.identity || ''}｜目标：${r.fields.goal || ''}｜秘密：${String(r.fields.secret || '').slice(0, 40)}`,
        ).join('\n')}`
        : '',
      factionRecords.length
        ? `势力组织：\n${factionRecords.slice(0, 12).map((r) =>
          `- ${r.fields.name || '势力'}：${String(r.fields.intro || r.fields.hostile || '').slice(0, 80)}`,
        ).join('\n')}`
        : '',
      wizardContext.chapterTones?.length
        ? `前三章基调：\n${wizardContext.chapterTones.map((t) =>
          `- 第${t.chapterIndex}章 · ${t.tone}｜${t.coreEvent}｜结尾：${t.endingDirection}`,
        ).join('\n')}`
        : '',
      wizardContext.worldRules?.length
        ? `规则条目：\n${wizardContext.worldRules.map((r) => `- ${r.text}`).join('\n')}`
        : '',
      content.world?.markdown
        ? `世界构建摘要：\n${String(content.world.markdown).slice(0, 2500)}`
        : '',
    ].filter(Boolean).join('\n\n'),
  });

  useEffect(() => { api.listPresets().then(setPresets).catch(() => { }); }, []);

  // 联动：规则体系变化 → 提示角色规则免疫
  useEffect(() => {
    if (!wizardContext.ruleSystem && !wizardContext.worldRules.length) return;
    setWizardContext((ctx) => {
      const next = pushHint(ctx.linkageHints, '世界含规则体系：是否需要为角色添加规则免疫能力？');
      if (next === ctx.linkageHints) return ctx;
      return { ...ctx, linkageHints: next };
    });
  }, [wizardContext.ruleSystem, wizardContext.worldRules.length]);

  // 联动：反派 tag → 建议势力
  useEffect(() => {
    const hasVillainTag = characterRecords.some((r) =>
      /villain|反派/i.test(`${r.fields.tag || ''} ${r.fields.role || ''}`),
    );
    if (!hasVillainTag) return;
    setWizardContext((ctx) => {
      const next = pushHint(ctx.linkageHints, '检测到反派标签：是否创建对应反派势力？');
      if (next === ctx.linkageHints) return ctx;
      return { ...ctx, linkageHints: next };
    });
  }, [characterRecords]);

  const setStatus = (key: StepKey, status: GenStatus) => {
    setGenStatus((s) => ({ ...s, [key]: status }));
  };

  const patchCtx = (partial: Partial<WizardContext>) => {
    setWizardContext((c) => ({ ...c, ...partial }));
  };

  const applyGenreTemplate = (id: GenreTemplateId) => {
    const prev = getGenreTemplate(wizardContext.genreTemplate);
    const next = getGenreTemplate(id);
    // 题材切换：按「离开上一模板」清空不兼容字段
    if (prev && next && prev.id !== next.id) {
      const clearKeys = prev.clearOnLeave || [];
      if (clearKeys.length && content.characters?.characters?.length) {
        setContent((c) => ({
          ...c,
          characters: {
            characters: (c.characters?.characters || []).map((ch) => {
              const fields = { ...(ch.fields || {}) };
              for (const k of clearKeys) delete fields[k];
              return { ...ch, fields };
            }),
          },
        }));
      }
    }
    if (!next) {
      patchCtx({ genreTemplate: '' });
      return;
    }
    patchCtx({
      genreTemplate: id,
      openingHook: wizardContext.openingHook || next.openingHookHint,
      coreMystery: wizardContext.coreMystery || next.coreMysteryHint,
      sentenceStyle: next.writing.sentenceStyle,
      dialogueRatio: next.writing.dialogueRatio,
      sensoryPriority: [...next.writing.sensoryPriority],
      worldRules: next.showRulesForm && !wizardContext.worldRules.length
        ? [{ id: `r_${Date.now()}`, text: '禁止在规则空间内说出自己的真名' }]
        : wizardContext.worldRules,
    });
    if (next.writing.dimensions) setDimensions((d) => ({ ...d, ...next.writing.dimensions }));
    setPreset(next.presetHint);
    setStoryDna((dna) => (dna ? { ...dna, genre: next.genre } : dna));
    setPositioning((p) => ({ ...(p || {}), genre: next.genre }));
    setContent((c) => ({
      ...c,
      world: {
        ...c.world,
        markdown: c.world?.markdown?.trim()
          ? c.world.markdown
          : next.worldSeed,
      },
    }));
  };

  const step1SyncWriting = async () => {
    const res = await api.optimizeWritingDimensions({
      dimensions, suggestion: '保持当前维度，生成完整 Writing Bible', preset, title,
    });
    setDimensions(res.dimensions);
    setContent((c) => ({ ...c, writing: { markdown: res.markdown, fields: res.fields as Record<string, string> } }));
    setStatus('writing', 'done');
  };

  const runCocreate = async () => {
    setBusy(true);
    setError('');
    try {
      const res = await api.aiCocreate({ pitch, preset, title, storyDna: storyDna || undefined });
      const r = res.result as WizardContent & { dimensions?: WritingDimensions };
      setContent({
        writing: r.writing, world: r.world, characters: r.characters,
        factions: r.factions, volume: r.volume, chapterTask: r.chapterTask,
      });
      if (r.dimensions) setDimensions(r.dimensions);
      setGenStatus({
        writing: 'done', world: 'done', characters: 'done', factions: 'done', volume: 'done', chapterTask: 'done',
      });
      // 共创一次性生成：绑定当前上游，后续修改可检测过期
      const bound = wizardUpstreamParts({
        worldMd: r.world?.markdown || '',
        characters: r.characters?.characters || [],
        factions: r.factions?.factions || [],
        conflictBrief: '',
        openingHook: '',
        coreMystery: '',
      });
      setVolumeBoundParts(bound);
      setVolumeBoundKey([bound.world, bound.characters, bound.factions, bound.conflict].join('\n§\n'));
      setVolumeDismissedKey('');
      setStep(1);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const step1GenerateWriting = async () => {
    setBusy(true);
    setError('');
    setStatus('writing', 'running');
    try {
      await step1SyncWriting();
    } catch (e) {
      setStatus('writing', 'failed');
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const step2GenerateWorld = async () => {
    setBusy(true);
    setError('');
    setStatus('world', 'running');
    setSubSteps([]);
    try {
      const res = await animateSubSteps(
        WORLD_SUB_STEPS,
        setSubSteps,
        () => api.aiGenerateWorld(base),
      ) as { result: WizardContent['world'] };
      setContent((c) => ({ ...c, world: res.result }));
      setStatus('world', 'done');
    } catch (e) {
      setStatus('world', 'failed');
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const step3GenerateCharacters = async () => {
    setBusy(true);
    setError('');
    setStatus('characters', 'running');
    try {
      const res = await api.aiGenerateCharacters(base);
      setContent((c) => ({ ...c, characters: res.result as WizardContent['characters'] }));
      setStatus('characters', 'done');
    } catch (e) {
      setStatus('characters', 'failed');
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const step4GenerateFactions = async () => {
    setBusy(true);
    setError('');
    setStatus('factions', 'running');
    try {
      const res = await api.aiGenerateFactions(base);
      setContent((c) => ({ ...c, factions: res.result as WizardContent['factions'] }));
      setStatus('factions', 'done');
    } catch (e) {
      setStatus('factions', 'failed');
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const step6GenerateVolume = async () => {
    setBusy(true);
    setError('');
    setStatus('volume', 'running');
    try {
      const ctx = buildVolumeContext();
      const [volRes, taskRes] = await Promise.all([
        api.aiGenerateVolume({ ...base, context: ctx }),
        api.aiGenerateChapterTask({ ...base, context: ctx }),
      ]);
      setContent((c) => ({
        ...c,
        volume: volRes.result as WizardContent['volume'],
        chapterTask: taskRes.result as WizardContent['chapterTask'],
      }));
      setVolumeBoundKey(upstreamKey);
      setVolumeBoundParts({ ...upstreamParts });
      setVolumeDismissedKey('');
      setStatus('volume', 'done');
      setStatus('chapterTask', 'done');
    } catch (e) {
      setStatus('volume', 'failed');
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const runWorldBoundary = async () => {
    setBoundaryBusy(true);
    try {
      const rulesBlock = wizardContext.worldRules.length
        ? `\n\n## 规则条目\n${wizardContext.worldRules.map((r, i) => `${i + 1}. ${r.text}`).join('\n')}`
        : '';
      const res = await api.checkWorldBoundary({
        worldMarkdown: `${content.world?.markdown || ''}${rulesBlock}\n${wizardContext.ruleSystem}`,
        genre,
        title,
      });
      patchCtx({ worldBoundaryReport: res.report });
    } catch (e) {
      patchCtx({ worldBoundaryReport: (e as Error).message });
    } finally {
      setBoundaryBusy(false);
    }
  };

  const runTrialPreview = async () => {
    setTrialBusy(true);
    setError('');
    try {
      const protagonist = characterRecords.find((r) => /主角/i.test(r.fields.role || ''))
        || characterRecords[0];
      const res = await api.trialWriteOpening({
        title,
        genre,
        openingHook: wizardContext.openingHook,
        coreMystery: wizardContext.coreMystery,
        beatPlan: {
          beat1: wizardContext.chapterTones[0]?.coreEvent || '',
          beat2: wizardContext.chapterTones[0]?.endingDirection || '',
        },
        chapter1Hook: wizardContext.chapterTones[0]?.endingDirection || '',
        protagonist: protagonist ? `${protagonist.fields.name}（${protagonist.fields.identity}）` : '',
        sentenceStyle: wizardContext.sentenceStyle,
        worldExcerpt: content.world?.markdown || '',
      });
      if (res.error) setError(res.error);
      patchCtx({ trialPreview: res.text || '' });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setTrialBusy(false);
    }
  };

  const finish = async () => {
    if (volumeStale) {
      const go = window.confirm(
        '上游设定已变更，第一卷规划可能过时。\n\n确定仍用当前卷纲建书？\n建议先返回「前三章基调」基于最新设定重新生成。',
      );
      if (!go) return;
    }
    setBusy(true);
    setError('');
    try {
      // 将向导扩展字段并入 storyDna / content，不触发 pipeline
      const enrichedDna: StoryDna = {
        ...(storyDna || { pitch }),
        genre: genre || storyDna?.genre,
        core_hook: wizardContext.openingHook || storyDna?.core_hook,
        main_question: wizardContext.coreMystery || storyDna?.main_question,
        main_conflict: wizardContext.conflictCore
          || positioning?.mainConflict
          || storyDna?.main_conflict
          || '',
        pitch,
      };
      const volumeExtra = [
        content.volume?.markdown || `# 第 1 卷\n\n预估约 ${wizardContext.volumeChapterCount} 章。\n`,
        // 避免重复追加基调块
        /##\s*前三章基调/.test(content.volume?.markdown || '')
          ? ''
          : [
            '',
            '## 前三章基调',
            ...wizardContext.chapterTones.map((t) =>
              `- 第${t.chapterIndex}章 · ${t.tone}｜事件：${t.coreEvent}｜结尾：${t.endingDirection}｜字数：${t.wordTarget}`,
            ),
          ].join('\n'),
        wizardContext.worldRules.length
          && !/##\s*规则条目/.test(content.volume?.markdown || '')
          ? `\n## 规则条目\n${wizardContext.worldRules.map((r) => `- ${r.text}`).join('\n')}`
          : '',
      ].filter(Boolean).join('\n');
      const payload: WizardContent = {
        ...content,
        volume: { ...content.volume, markdown: volumeExtra },
        writing: {
          ...content.writing,
          fields: {
            ...(content.writing?.fields || {}),
            sentenceStyle: wizardContext.sentenceStyle,
            dialogueRatio: String(wizardContext.dialogueRatio),
            sensoryPriority: wizardContext.sensoryPriority.join('>'),
            styleSample: wizardContext.styleSample,
            styleGenePack: wizardContext.styleGenePack,
          },
        },
      };
      const protagonist = characterRecords.find((r) => /主角|protagonist/i.test(r.fields.role || ''))
        || characterRecords[0];
      const res = await api.createBook({
        title,
        pitch,
        preset,
        content: payload,
        storyDna: enrichedDna,
        chapterTones: wizardContext.chapterTones,
        volumeChapterCount: wizardContext.volumeChapterCount,
        styleSample: wizardContext.styleSample,
        styleGenePack: wizardContext.styleGenePack,
        openingHook: wizardContext.openingHook,
        coreMystery: wizardContext.coreMystery,
        primaryPov: characterRecords.map((r) => r.fields.name).filter(Boolean)[0] || '',
        secondaryPov: characterRecords.map((r) => r.fields.name).filter(Boolean)[1] || '',
        conflictCalibration: {
          core_conflict: wizardContext.conflictCore
            || positioning?.mainConflict
            || storyDna?.main_conflict
            || wizardContext.openingHook
            || '',
          stakes: wizardContext.conflictStakes
            || protagonist?.fields.goal
            || wizardContext.coreMystery
            || storyDna?.main_question
            || '',
          escalation_phases: wizardContext.chapterTones.map((t) => ({
            chapter: t.chapterIndex,
            tone: t.tone,
            event: t.coreEvent,
            ending: t.endingDirection,
          })),
        },
      });
      navigate(`/book/${encodeURIComponent(res.bookId)}/ide`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const statusBanner = (key: StepKey, label: string, retry: () => void) => {
    if (genStatus[key] !== 'failed') return null;
    return (
      <div className="wizard-fail-banner">
        <span>{label}生成失败</span>
        <button type="button" className="btn btn-primary" onClick={retry}>重新生成{label}</button>
      </div>
    );
  };

  const canLeaveStep0 = Boolean(
    wizardContext.openingHook.trim()
    && wizardContext.coreMystery.trim()
    && (storyDna || pitch.trim()),
  );

  const canLeaveStep6 = tonesAreComplete(wizardContext.chapterTones);

  const addWorldRule = () => {
    const item: WorldRuleItem = { id: `r_${Date.now()}`, text: '' };
    patchCtx({ worldRules: [...wizardContext.worldRules, item] });
  };

  const updateWorldRule = (id: string, text: string) => {
    patchCtx({
      worldRules: wizardContext.worldRules.map((r) => (r.id === id ? { ...r, text } : r)),
    });
  };

  const removeWorldRule = (id: string) => {
    patchCtx({ worldRules: wizardContext.worldRules.filter((r) => r.id !== id) });
  };

  const fixConflict = (id: string) => {
    if (id === 'faction-conflict') {
      const name = '阻碍联盟';
      const rec = wizardFactionToRecord({
        name,
        markdown: [
          `# ${name}`,
          '',
          '- **简介**：专门阻碍主角目标的对立势力',
          '- **敌对**：主角阵营',
          '- **类型**：势力',
        ].join('\n'),
      });
      setContent((c) => ({
        ...c,
        factions: recordsToWizardFactions([
          ...factionRecords,
          rec,
        ]),
      }));
      setStatus('factions', 'done');
    } else if (id === 'goal-vs-world') {
      setContent((c) => ({
        ...c,
        world: {
          ...c.world,
          markdown: `${c.world?.markdown || ''}\n\n## 阻碍规则\n主角追求的目标必然触犯既有秩序，每次推进都会付出可见代价。\n`,
        },
      }));
    } else if (id === 'char-entangle' && characterRecords[0]) {
      const updated = characterRecords.map((r, i) => {
        if (i > 1) return r;
        return {
          ...r,
          fields: {
            ...r.fields,
            secret: r.fields.secret || '隐藏着与另一角色相关的旧账',
            innerConflict: r.fields.innerConflict || '想接近对方却害怕暴露真相',
          },
        };
      });
      setContent((c) => ({ ...c, characters: recordsToWizardCharacters(updated) }));
    }
  };

  const toggleSensory = (s: string) => {
    const cur = wizardContext.sensoryPriority;
    if (cur.includes(s)) {
      patchCtx({ sensoryPriority: cur.filter((x) => x !== s) });
    } else {
      patchCtx({ sensoryPriority: [...cur, s] });
    }
  };

  const dismissHint = (text: string) => {
    patchCtx({ linkageHints: wizardContext.linkageHints.filter((h) => h !== text) });
  };

  return (
    <div className="wizard-page">
      <div className="wizard-card wizard-card-wide">
        <h1>创建新小说</h1>
        <div className="wizard-mode-toggle">
          <button type="button" className={`btn ${mode === 'step' ? 'btn-primary' : ''}`} onClick={() => setMode('step')}>
            分步创作
          </button>
          <button type="button" className={`btn ${mode === 'cocreate' ? 'btn-primary' : ''}`} onClick={() => setMode('cocreate')}>
            AI 共创模式
          </button>
        </div>
        <div className="wizard-steps wizard-steps-8">
          {STEPS.map((s, i) => (
            <span key={s} className={i <= step ? 'active' : ''} title={s}>{i + 1}. {s}</span>
          ))}
        </div>
        {error && <p className="error-text">{error}</p>}
        {wizardContext.linkageHints.length > 0 && (
          <div className="wizard-linkage-hints">
            {wizardContext.linkageHints.map((h) => (
              <div key={h} className="wizard-hint-row">
                <span>💡 {h}</span>
                <button type="button" className="btn btn-sm" onClick={() => dismissHint(h)}>知道了</button>
              </div>
            ))}
          </div>
        )}

        {/* ── Step 0 / UI Step1：故事导演 ── */}
        {step === 0 && mode === 'cocreate' && (
          <>
            <ConversationCreator
              onPitchChange={setPitch}
              onDnaReady={(dna) => {
                setStoryDna(dna);
                setPitch(dna.pitch || pitch);
                setPositioning({
                  title: dna.title, genre: dna.genre, sellingPoint: dna.selling_point,
                  mainConflict: dna.main_conflict, audience: dna.audience, theme: dna.theme,
                });
              }}
            />
            <div className="preset-row" style={{ marginTop: 12 }}>
              <span>文风参考:</span>
              {(presets.length ? presets : [{ id: '暗夜君王' }, { id: '诡秘之主' }]).map((p) => (
                <button key={p.id} type="button" className={`btn ${preset === p.id ? 'btn-primary' : ''}`}
                  onClick={() => setPreset(p.id)}>{p.id}</button>
              ))}
            </div>
            {storyDna && (
              <div className="wizard-actions">
                <button type="button" className="btn btn-primary" disabled={busy} onClick={runCocreate}>
                  {busy ? '生成中…' : '基于方案开始创作'}
                </button>
                <button type="button" className="btn" onClick={() => setStep(1)}>逐模块审核</button>
              </div>
            )}
          </>
        )}

        {step === 0 && mode === 'step' && (
          <>
            <StoryDirectorPanel
              pitch={pitch}
              onPitchChange={setPitch}
              dna={storyDna}
              onDnaChange={setStoryDna}
              onAccept={() => {
                if (storyDna) {
                  setPositioning({
                    title: storyDna.title, genre: storyDna.genre, hook: storyDna.core_hook,
                    audience: storyDna.audience, mainConflict: storyDna.main_conflict,
                    sellingPoint: storyDna.selling_point, theme: storyDna.theme,
                  });
                }
              }}
            />
            <div className="wizard-extra-fields panel">
              <label className="form-field">
                <span className="form-label">题材模板 *</span>
                <select
                  value={wizardContext.genreTemplate}
                  onChange={(e) => applyGenreTemplate(e.target.value as GenreTemplateId)}
                >
                  <option value="">选择题材模板…</option>
                  {GENRE_TEMPLATES.map((t) => (
                    <option key={t.id} value={t.id}>{t.label}</option>
                  ))}
                </select>
              </label>
              <label className="form-field">
                <span className="form-label">第1章第1段发生什么？ *（≤300字）</span>
                <textarea
                  value={wizardContext.openingHook}
                  maxLength={300}
                  rows={3}
                  placeholder="开篇钩子：读者第一眼看到的事件"
                  onChange={(e) => patchCtx({ openingHook: e.target.value })}
                />
                <span className="text-dim">{wizardContext.openingHook.length}/200</span>
              </label>
              <label className="form-field">
                <span className="form-label">读者追更到第30章是为了知道什么？ *</span>
                <textarea
                  value={wizardContext.coreMystery}
                  rows={3}
                  placeholder="核心悬念 / 长线追更动力"
                  onChange={(e) => patchCtx({ coreMystery: e.target.value })}
                />
              </label>
            </div>
            <div className="wizard-actions">
              <button
                type="button"
                className="btn btn-primary"
                disabled={!canLeaveStep0}
                onClick={() => setStep(1)}
              >
                下一步
              </button>
            </div>
          </>
        )}

        {/* ── Step 1 / UI Step2：文风 ── */}
        {step === 1 && (
          <>
            <h2 className="wizard-q">文风</h2>
            <WritingStyleBuilder
              preset={preset}
              dimensions={dimensions}
              markdown={content.writing?.markdown}
              pitch={pitch}
              title={title}
              onPresetChange={setPreset}
              onDimensionsChange={setDimensions}
              onMarkdownChange={(md) => setContent((c) => ({ ...c, writing: { ...c.writing, markdown: md } }))}
            />
            <div className="wizard-extra-fields panel">
              <div className="panel-title">细粒度文风</div>
              <div className="form-field">
                <span className="form-label">风格基因库</span>
                <div className="wizard-radio-row">
                  <button
                    type="button"
                    className={`btn btn-sm ${!wizardContext.styleGenePack ? 'btn-primary' : ''}`}
                    onClick={() => patchCtx({ styleGenePack: '' })}
                  >
                    不使用
                  </button>
                  {STYLE_GENE_PACKS.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      className={`btn btn-sm ${wizardContext.styleGenePack === p.id ? 'btn-primary' : ''}`}
                      onClick={() => {
                        const sample = pickDarkMonarchSampleForSceneType('opening').sample;
                        patchCtx({
                          styleGenePack: p.id,
                          styleSample: wizardContext.styleSample?.trim()
                            ? wizardContext.styleSample
                            : sample,
                          sentenceStyle: wizardContext.sentenceStyle || '长短交错',
                          dialogueRatio: Math.max(wizardContext.dialogueRatio, 35),
                        });
                      }}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
                {wizardContext.styleGenePack && (
                  <p className="text-dim" style={{ marginTop: 6 }}>
                    {getStyleGenePack(wizardContext.styleGenePack)?.blurb}
                    {' · '}招牌技法：{darkMonarchVoice.signatureMoves.slice(0, 3).join('；')}…
                  </p>
                )}
              </div>
              <div className="wizard-radio-row">
                {(['短句为主', '长短交错', '长句铺陈'] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    className={`btn btn-sm ${wizardContext.sentenceStyle === s ? 'btn-primary' : ''}`}
                    onClick={() => patchCtx({ sentenceStyle: s })}
                  >
                    {s}
                  </button>
                ))}
              </div>
              <label className="form-field">
                <span className="form-label">对白占比预估：{wizardContext.dialogueRatio}%</span>
                <input
                  type="range"
                  min={10}
                  max={60}
                  value={wizardContext.dialogueRatio}
                  onChange={(e) => patchCtx({ dialogueRatio: Number(e.target.value) })}
                />
              </label>
              <div className="form-field">
                <span className="form-label">感官优先级（多选排序）</span>
                <div className="wizard-radio-row">
                  {SENSORY_OPTS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      className={`btn btn-sm ${wizardContext.sensoryPriority.includes(s) ? 'btn-primary' : ''}`}
                      onClick={() => toggleSensory(s)}
                    >
                      {s}
                      {wizardContext.sensoryPriority.includes(s)
                        ? ` ·${wizardContext.sensoryPriority.indexOf(s) + 1}`
                        : ''}
                    </button>
                  ))}
                </div>
              </div>
              <label className="form-field">
                <span className="form-label">理想风格样本（强烈推荐 · 约 200–400 字）</span>
                <textarea
                  rows={6}
                  placeholder="贴一段你想要的正文质感：画面 + 身体细节 + 信息藏在动作/对白。系统会模仿它写，而不是背一堆禁令。"
                  value={wizardContext.styleSample}
                  onChange={(e) => patchCtx({ styleSample: e.target.value })}
                />
                <span className="text-dim">写入 P0，永不裁剪。留空则用默认网文样本。</span>
              </label>
            </div>
            {statusBanner('writing', '写作规则', step1GenerateWriting)}
            <div className="wizard-actions">
              <button type="button" className="btn" onClick={() => setStep(0)}>上一步</button>
              <button type="button" className="btn btn-primary" disabled={busy}
                onClick={async () => {
                  if (!content.writing?.markdown) await step1GenerateWriting();
                  setStep(2);
                }}>
                下一步
              </button>
            </div>
          </>
        )}

        {/* ── Step 2 / UI Step3：世界 ── */}
        {step === 2 && (
          <>
            <h2 className="wizard-q">世界构建</h2>
            <WorldBuilder
              wizard
              markdown={content.world?.markdown || ''}
              pitch={pitch}
              preset={preset}
              title={title}
              storyDna={storyDna}
              onChange={(md) => {
                setContent((c) => ({ ...c, world: { ...c.world, markdown: md } }));
                if (/规则/.test(md)) patchCtx({ ruleSystem: 'detected' });
              }}
            />
            {(wizardContext.genreTemplate === '规则怪谈' || /规则怪谈/.test(genre)) && (
              <div className="wizard-extra-fields panel">
                <div className="panel-title">规则条目</div>
                {wizardContext.worldRules.map((r) => (
                  <div key={r.id} className="wizard-rule-row">
                    <input
                      value={r.text}
                      placeholder="规则内容…"
                      onChange={(e) => updateWorldRule(r.id, e.target.value)}
                    />
                    <button type="button" className="btn btn-sm btn-danger" onClick={() => removeWorldRule(r.id)}>删</button>
                  </div>
                ))}
                <button type="button" className="btn btn-sm" onClick={addWorldRule}>+ 规则</button>
              </div>
            )}
            <div className="wizard-actions" style={{ marginTop: 8 }}>
              <button type="button" className="btn" disabled={boundaryBusy} onClick={() => void runWorldBoundary()}>
                {boundaryBusy ? '检查中…' : '世界边界检查'}
              </button>
            </div>
            {wizardContext.worldBoundaryReport && (
              <pre className="wizard-boundary-report">{wizardContext.worldBoundaryReport}</pre>
            )}
            {statusBanner('world', '世界', step2GenerateWorld)}
            <div className="wizard-actions">
              <button type="button" className="btn" onClick={() => setStep(1)}>上一步</button>
              <button type="button" className="btn" disabled={busy} onClick={() => void step2GenerateWorld()}>AI 生成世界</button>
              <button type="button" className="btn btn-primary" disabled={!content.world?.markdown}
                onClick={() => { setStep(3); if (!content.characters) void step3GenerateCharacters(); }}>
                下一步
              </button>
            </div>
          </>
        )}

        {/* ── Step 3 / UI Step4：角色 ── */}
        {step === 3 && (
          <>
            <h2 className="wizard-q">主要角色</h2>
            {busy && <p className="text-dim">正在生成人物…</p>}
            <EntityManager
              entityType="character"
              title="人物卡"
              fields={characterFields}
              genre={genre}
              minCount={0}
              maxCount={50}
              value={characterRecords}
              onChange={(records: EntityRecord[]) => {
                setContent((c) => ({ ...c, characters: recordsToWizardCharacters(records) }));
                if (records.length) setStatus('characters', 'done');
              }}
            />
            {characterHints.length > 0 && (
              <ul className="wizard-check-list">
                {characterHints.map((h) => <li key={h}>⚠️ {h}</li>)}
              </ul>
            )}
            {statusBanner('characters', '人物', step3GenerateCharacters)}
            <div className="wizard-actions">
              <button type="button" className="btn" onClick={() => setStep(2)}>上一步</button>
              <button type="button" className="btn" onClick={() => void step3GenerateCharacters()} disabled={busy}>AI 生成</button>
              <button type="button" className="btn btn-primary"
                onClick={() => { setStep(4); if (!content.factions) void step4GenerateFactions(); }}>
                下一步
              </button>
            </div>
          </>
        )}

        {/* ── Step 4 / UI Step5：势力 ── */}
        {step === 4 && (
          <>
            <h2 className="wizard-q">势力组织</h2>
            {busy && <p className="text-dim">正在生成势力…</p>}
            <EntityManager
              entityType="faction"
              title="势力 / 组织"
              fields={FACTION_FIELDS}
              minCount={0}
              maxCount={50}
              value={factionRecords}
              onChange={(records: EntityRecord[]) => {
                setContent((c) => ({ ...c, factions: recordsToWizardFactions(records) }));
                if (records.length) setStatus('factions', 'done');
              }}
            />
            <FactionRelationGraph factions={factionRecords} />
            {isolatedFactions.length > 0 && (
              <p className="wizard-warn">⚠️ 孤立势力（无敌对/友好）：{isolatedFactions.join('、')}</p>
            )}
            {statusBanner('factions', '势力', step4GenerateFactions)}
            <div className="wizard-actions">
              <button type="button" className="btn" onClick={() => setStep(3)}>上一步</button>
              <button type="button" className="btn" onClick={() => void step4GenerateFactions()} disabled={busy}>AI 生成</button>
              <button type="button" className="btn btn-primary" onClick={() => setStep(5)}>下一步</button>
            </div>
          </>
        )}

        {/* ── Step 5 / UI Step6：冲突校准 ── */}
        {step === 5 && (
          <>
            <h2 className="wizard-q">核心冲突校准</h2>
            <p className="text-dim">汇总前五步数据，检查冲突是否立得住；可手写核心冲突与赌注（建书时写入 YAML）</p>
            <div className="wizard-conflict-table">
              {conflictChecks.map((c) => (
                <div key={c.id} className={`wizard-conflict-row ${c.ok ? 'ok' : 'warn'}`}>
                  <div>
                    <strong>{c.ok ? '✅' : '⚠️'} {c.label}</strong>
                    <p className="text-dim">{c.detail}</p>
                  </div>
                  {!c.ok && c.fixSuggestion && (
                    <button type="button" className="btn btn-sm" onClick={() => fixConflict(c.id)}>
                      一键修复建议
                    </button>
                  )}
                </div>
              ))}
            </div>
            <div className="wizard-extra-fields panel" style={{ marginTop: 12 }}>
              <div className="panel-title">冲突校准草稿</div>
              <label className="form-field">
                <span className="form-label">核心冲突 core_conflict</span>
                <textarea
                  rows={2}
                  placeholder={positioning?.mainConflict || storyDna?.main_conflict || '主角目标与世界秩序的根本对立'}
                  value={wizardContext.conflictCore}
                  onChange={(e) => patchCtx({ conflictCore: e.target.value })}
                />
              </label>
              <label className="form-field">
                <span className="form-label">赌注 stakes</span>
                <textarea
                  rows={2}
                  placeholder="失败会失去什么 / 读者为什么紧张"
                  value={wizardContext.conflictStakes}
                  onChange={(e) => patchCtx({ conflictStakes: e.target.value })}
                />
              </label>
              <p className="text-dim">升级阶段将由前三章基调自动生成；建书后可在「大纲」页继续编辑。</p>
            </div>
            <div className="wizard-actions">
              <button type="button" className="btn" onClick={() => setStep(4)}>上一步</button>
              <button type="button" className="btn btn-primary"
                onClick={() => {
                  // 空草稿时用 DNA / 定位预填，便于卷纲吃到冲突
                  if (!wizardContext.conflictCore.trim()) {
                    patchCtx({
                      conflictCore: positioning?.mainConflict || storyDna?.main_conflict || wizardContext.openingHook || '',
                    });
                  }
                  setStep(6);
                  if (!content.volume) void step6GenerateVolume();
                }}>
                下一步
              </button>
            </div>
          </>
        )}

        {/* ── Step 6 / UI Step7：前三章基调 + 第一卷规划 ── */}
        {step === 6 && (
          <>
            <Step7ChapterTones
              tones={wizardContext.chapterTones}
              genre={genre}
              volumeChapterCount={wizardContext.volumeChapterCount}
              onChangeTones={(chapterTones) => patchCtx({ chapterTones })}
              onChangeVolumeCount={(volumeChapterCount) => patchCtx({ volumeChapterCount })}
            />
            {statusBanner('volume', '第一卷', step6GenerateVolume)}
            <VolumeOutlineEditor
              markdown={content.volume?.markdown || ''}
              onChange={(md) => {
                setContent((c) => ({ ...c, volume: { ...c.volume, markdown: md } }));
                if (md.trim()) setStatus('volume', 'done');
              }}
              isStale={volumeStale}
              changedParts={volumeChangedParts}
              onRegenerate={() => void step6GenerateVolume()}
              onKeepCurrent={() => {
                setVolumeDismissedKey(upstreamKey);
                setVolumeBoundParts({ ...upstreamParts });
                setVolumeBoundKey(upstreamKey);
              }}
              showSave={false}
              busy={busy}
              regenerateLabel={content.volume?.markdown ? '基于最新设定重新生成' : '生成第一卷规划'}
            />
            <div className="wizard-actions">
              <button type="button" className="btn" onClick={() => setStep(5)}>上一步</button>
              <button
                type="button"
                className="btn btn-primary"
                disabled={!canLeaveStep6}
                onClick={() => {
                  if (volumeStale && !window.confirm('上游设定已变更，卷纲可能过时。仍继续？')) return;
                  setStep(7);
                }}
              >
                下一步
              </button>
            </div>
          </>
        )}

        {/* ── Step 7 / UI Step8：确认试写 ── */}
        {step === 7 && (
          <>
            <h2 className="wizard-q">确认与试写预览</h2>
            <div className="wizard-config-card panel">
              <div className="panel-title">书籍配置卡片</div>
              <p><strong>书名</strong>：{title}</p>
              <p><strong>题材</strong>：{genre || '—'}</p>
              <p><strong>开篇钩子</strong>：{wizardContext.openingHook || '—'}</p>
              <p><strong>长线悬念</strong>：{wizardContext.coreMystery || '—'}</p>
              <p><strong>文风</strong>：{preset} · {wizardContext.sentenceStyle || '—'} · 对白 {wizardContext.dialogueRatio}%</p>
              <p><strong>角色</strong>：{characterRecords.map((r) => r.fields.name).filter(Boolean).join('、') || '—'}</p>
              <p><strong>势力</strong>：{factionRecords.map((r) => r.fields.name).filter(Boolean).join('、') || '—'}</p>
              <p><strong>前三章基调</strong>：</p>
              <ul>
                {wizardContext.chapterTones.map((t) => (
                  <li key={t.chapterIndex}>
                    Ch{t.chapterIndex} · {t.tone} — {t.coreEvent.slice(0, 40)}
                    {t.coreEvent.length > 40 ? '…' : ''}
                  </li>
                ))}
              </ul>
              <p className="text-dim">
                建书时将自动脚手架「故事地图」（四卷弧线 / POV 前12章 / 主线+里程碑）。
                生成章节时 Planner 会读取地图：章功能、距里程碑距离、视角调度。
              </p>
            </div>
            <div className="wizard-actions">
              <button type="button" className="btn btn-ai" disabled={trialBusy} onClick={() => void runTrialPreview()}>
                {trialBusy ? '试写中…' : '试写第1章第1段'}
              </button>
            </div>
            {wizardContext.trialPreview && (
              <div className="wizard-trial-preview panel">
                <div className="panel-title">试读预览（不写入书籍）</div>
                <div className="reader-body">{wizardContext.trialPreview}</div>
              </div>
            )}
            <div className="wizard-actions">
              <button type="button" className="btn" onClick={() => setStep(6)}>返回修改</button>
              <button type="button" className="btn" onClick={() => setStep(0)}>回到导演</button>
              <button type="button" className="btn btn-primary" disabled={busy} onClick={() => void finish()}>
                {busy ? '创建中…' : '满意，创建书籍'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
