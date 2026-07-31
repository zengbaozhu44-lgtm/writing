/**
 * Living Novel Engine V3.7 — 章节前后闭环（Studio Server 层）
 * Pre: Story Context → Chapter Plan → Canon
 * Post: AI Editor → Character Evolution → World State
 */
import { writeModule, readModule } from './module-service.js';
import { getChapterText } from './chapter-service.js';
import {
  readStoryDna,
  readWorldState,
  writeWorldState,
  readChapterPlan,
  writeChapterPlan,
  readEditorFeedback,
  writeEditorFeedback,
  listCharacterBrains,
  readCharacterBrain,
  writeCharacterBrain,
  readSystemFile,
} from './system-store.js';
import { syncContextToCanon, buildNovelIntelligenceContext } from './story-context-provider.js';
import { normalizeBrainContextForRun, resolveProtagonistName, resolveEffectiveChapterPov, getTimelineLastDay, resolveStoryDayForChapterRun, syncStoryDayAfterChapter } from './brain-context-sync.js';
import { runAiEditor, analyzeCharacterBrain } from './creator-intelligence.js';
import { isLlmConfigured } from '../../inkos-brain/src/writer/llm-writer.js';
import { loadInkOsConfig } from '../../inkos-core/src/lib/config.js';
import { chatCompletion } from '../../inkos-brain/src/writer/llm-writer.js';
import {
  loadLivingPrepareInput,
  MemoryUnit,
} from '../../inkos-runtime/src/memory/memory-unit.js';

function clamp(n, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Number(n) || 0));
}

/** 持久化 Chapter Director 计划 */
export function persistChapterPlan(bookDir, chapter, plan) {
  const saved = writeChapterPlan(bookDir, chapter, {
    chapter,
    goal: plan.goal,
    conflict: plan.conflict,
    climax: plan.climax,
    cost: plan.cost,
    hook: plan.hook,
    scenes: plan.scenes,
    emotional_beat: plan.emotional_beat,
    obstacle1: plan.conflict,
    ending: plan.hook,
    pov: plan.pov || resolveEffectiveChapterPov(bookDir, chapter).pov || resolveProtagonistName(bookDir) || '主角',
    time: plan.time || resolveStoryDayForChapterRun(chapter, getTimelineLastDay(bookDir)),
    updatedAt: new Date().toISOString(),
  });
  const { md } = syncContextToCanon(bookDir, chapter, saved);
  writeModule(bookDir, 'chapter-task', { content: md });
  return { plan: saved, chapterTaskMd: md };
}

/** 章节生成前：注入 Living Context；可应用上一章 livingPrepare 提案 */
export async function prepareChapterRun(bookDir, chapter, plan = null) {
  const applied = applyLivingPrepareToRuntime(bookDir, chapter - 1);

  const existingPlan = plan || readChapterPlan(bookDir, chapter);
  let result;
  if (existingPlan?.goal) {
    result = persistChapterPlan(bookDir, chapter, existingPlan);
  } else {
    const { md, context } = syncContextToCanon(bookDir, chapter, plan);
    writeModule(bookDir, 'chapter-task', { content: md });
    result = { plan: context.chapterPlan, chapterTaskMd: md, context };
  }
  const povSync = normalizeBrainContextForRun(bookDir, chapter);
  return { ...result, povSync, livingPrepareApplied: applied };
}

/** 应用上一章 livingPrepare 到运行态 — 仅允许在下一章 Prepare */
export function applyLivingPrepareToRuntime(bookDir, fromChapter) {
  if (!fromChapter || fromChapter < 1) return null;
  const prep = loadLivingPrepareInput(bookDir, fromChapter);
  if (!prep) return null;

  if (prep.worldProposal && !prep.worldProposal._applied) {
    const { _proposal, ...ws } = prep.worldProposal;
    writeWorldState(bookDir, { ...ws, updatedAt: new Date().toISOString() });
  }
  for (const row of prep.characterProposals || []) {
    if (!row?.name || !row?.brain) continue;
    const { _proposal, ...brain } = row.brain;
    writeCharacterBrain(bookDir, row.name, brain);
  }
  return { fromChapter, appliedAt: new Date().toISOString() };
}

/** 从 world_simulation 同步 world_state */
export function syncWorldStateFromSimulation(bookDir) {
  const sim = readSystemFile(bookDir, 'world_simulation');
  const timeline = sim?.timeline;
  const latest = Array.isArray(timeline) && timeline.length ? timeline[timeline.length - 1] : null;
  if (!latest) return initWorldStateIfNeeded(bookDir);
  return writeWorldState(bookDir, {
    year: latest.year || sim?.startYear || 2052,
    ai_control: latest.ai_control ?? 93,
    social_stability: latest.social_stability ?? 87,
    rebellion_level: 20,
    deep_zone_activity: 30,
    updatedAt: new Date().toISOString(),
  });
}

/** 初始化 world_state（从 world_simulation 或默认值） */
export function initWorldStateIfNeeded(bookDir) {
  let ws = readWorldState(bookDir);
  if (ws) return ws;
  const sim = readSystemFile(bookDir, 'world_simulation');
  const timeline = sim?.timeline;
  const latest = Array.isArray(timeline) && timeline.length ? timeline[timeline.length - 1] : null;
  ws = {
    year: latest?.year || sim?.startYear || 2052,
    ai_control: latest?.ai_control ?? 93,
    social_stability: latest?.social_stability ?? 87,
    rebellion_level: 20,
    deep_zone_activity: 30,
    updatedAt: new Date().toISOString(),
  };
  return writeWorldState(bookDir, ws);
}

/** 世界状态演化 — 只返回提案，不写运行态（由下一章 Living Prepare / MemoryUnit 消费） */
export async function evolveWorldState(bookDir, chapter, chapterText = '', { persist = false } = {}) {
  initWorldStateIfNeeded(bookDir);
  const ws = readWorldState(bookDir) || {};
  const text = chapterText || getChapterText(bookDir, chapter).text || '';
  const updated = { ...ws, lastChapter: chapter, updatedAt: new Date().toISOString() };

  if (/摧毁|破坏|设施|反抗|起义|叛乱/.test(text)) {
    updated.ai_control = clamp((updated.ai_control ?? 90) - 3);
    updated.rebellion_level = clamp((updated.rebellion_level ?? 20) + 8);
  }
  if (/AI|控制|监控|审查/.test(text)) {
    updated.ai_control = clamp((updated.ai_control ?? 90) + 1);
  }
  if (/遗忘|消失|记忆/.test(text)) {
    updated.deep_zone_activity = clamp((updated.deep_zone_activity ?? 30) + 5);
  }
  if (/稳定|和平|妥协/.test(text)) {
    updated.social_stability = clamp((updated.social_stability ?? 60) + 3);
  }
  if (/混乱|暴动|冲突/.test(text)) {
    updated.social_stability = clamp((updated.social_stability ?? 60) - 5);
  }
  updated.year = (updated.year || 2052) + (chapter % 5 === 0 ? 1 : 0);

  if (isLlmConfigured() && text.length > 200) {
    try {
      const config = loadInkOsConfig().llm;
      const res = await chatCompletion({
        baseUrl: config.baseUrl,
        apiKey: config.apiKey,
        model: config.model,
        messages: [{
          role: 'user',
          content: `根据章节内容更新世界状态 JSON（仅输出JSON）：当前${JSON.stringify(ws)}\n章节摘要：${text.slice(0, 2000)}\n字段：year,ai_control,social_stability,rebellion_level,deep_zone_activity`,
        }],
        maxTokens: 500,
        temperature: 0.5,
      });
      const m = res.content?.match(/\{[\s\S]*\}/);
      if (m) Object.assign(updated, JSON.parse(m[0]));
    } catch { /* heuristic only */ }
  }

  if (persist) {
    console.warn('[living] evolveWorldState(persist=true) 已弃用；请经 MemoryUnit / Living Prepare');
    return writeWorldState(bookDir, updated);
  }
  return { ...updated, _proposal: true };
}

/** 人物大脑演化 — 只返回提案，默认不写磁盘 */
export async function evolveCharacterBrains(bookDir, chapter, chapterText = '', { persist = false } = {}) {
  const text = chapterText || getChapterText(bookDir, chapter).text || '';
  const storyDna = readStoryDna(bookDir);
  const results = [];

  const names = listCharacterBrains(bookDir);
  if (!names.length) {
    try {
      const chars = readModule(bookDir, 'characters');
      for (const f of chars.files || []) {
        const name = f.id || f.name?.replace(/\.md$/, '');
        if (name) names.push(name);
      }
    } catch { /* */ }
  }

  for (const name of names.slice(0, 8)) {
    let brain = readCharacterBrain(bookDir, name);
    if (!brain) {
      try {
        const md = readModule(bookDir, 'characters', `${name}.md`).content || '';
        const analyzed = await analyzeCharacterBrain({ characterMarkdown: md, characterName: name, storyDna });
        brain = analyzed.brain;
      } catch {
        continue;
      }
    }

    const state = { ...(brain.current_state || {}) };
    const nameInText = text.includes(name);

    if (nameInText) {
      if (/欺骗|撒谎|隐瞒/.test(text)) {
        state.trust_protagonist = clamp((state.trust_protagonist ?? 60) - 20);
        state.suspicion = clamp((state.suspicion ?? 20) + 30);
        state.betrayal_probability = clamp((state.betrayal_probability ?? 10) + 15);
      }
      if (/信任|合作|拯救|保护/.test(text)) {
        state.trust_protagonist = clamp((state.trust_protagonist ?? 60) + 10);
        state.loyalty = clamp((state.loyalty ?? 70) + 5);
      }
      if (/背叛|对立|攻击/.test(text)) {
        state.betrayal_probability = clamp((state.betrayal_probability ?? 10) + 20);
        state.trust_protagonist = clamp((state.trust_protagonist ?? 60) - 15);
      }
      if (/恐惧|威胁|危险/.test(text)) {
        state.fear = clamp((state.fear ?? 30) + 15);
      }
    }

    const nextBrain = {
      ...brain,
      current_state: state,
      lastChapter: chapter,
      evolutionLog: [...(brain.evolutionLog || []).slice(-9), { chapter, state: { ...state }, at: new Date().toISOString() }],
      _proposal: true,
    };

    if (persist) {
      console.warn('[living] evolveCharacterBrains(persist=true) 已弃用');
      results.push({ name, brain: writeCharacterBrain(bookDir, name, nextBrain) });
    } else {
      results.push({ name, brain: nextBrain });
    }
  }
  return results;
}

/** AI Editor 反馈闭环 */
export async function runEditorFeedbackLoop(bookDir, chapter, chapterText = '') {
  const text = chapterText || getChapterText(bookDir, chapter).text || '';
  const ctx = buildNovelIntelligenceContext(bookDir, chapter);

  let review = {
    mode: 'auto',
    chapter,
    scores: { commercial: 75, literary: 72, suspense: 78 },
    issues: [],
    summary: '自动审稿',
  };

  if (text.length > 100) {
    try {
      review = (await runAiEditor({ content: text, mode: 'serialization', chapter, context: ctx })).review || review;
    } catch { /* fallback scores */ }
  }

  const problems = [];
  const suggestions = [];
  const commercial = review.scores?.commercial ?? 75;
  const literary = review.scores?.literary ?? 72;
  const serial = review.scores?.suspense ?? review.scores?.serialization ?? 78;

  if (commercial < 75) problems.push('conflict_low');
  if (literary < 70) problems.push('character_flat');
  if (serial < 75) problems.push('hook_weak');

  if (problems.includes('conflict_low')) suggestions.push('increase_pressure');
  if (problems.includes('character_flat')) suggestions.push('deepen_relationship');
  if (problems.includes('hook_weak')) suggestions.push('strengthen_chapter_hook');

  for (const iss of review.issues || []) {
    if (iss.text?.includes('冲突')) suggestions.push('increase_pressure');
    if (iss.text?.includes('人物')) suggestions.push('deepen_relationship');
    if (iss.text?.includes('钩子') || iss.text?.includes('结尾')) suggestions.push('strengthen_chapter_hook');
  }

  const feedback = writeEditorFeedback(bookDir, chapter, {
    chapter,
    commercial_score: commercial,
    literary_score: literary,
    serial_score: serial,
    problems: [...new Set(problems)],
    suggestions: [...new Set(suggestions)],
    review_summary: review.summary,
    updatedAt: new Date().toISOString(),
  });

  return { feedback, review };
}

/** 章节完成后：只产 Living Prepare 提案（只读快照），不改运行态 */
export async function runPostChapterEvolution(bookDir, chapter) {
  const text = getChapterText(bookDir, chapter).text || '';
  const [editorResult, worldProposal, characterProposals] = await Promise.all([
    runEditorFeedbackLoop(bookDir, chapter, text),
    evolveWorldState(bookDir, chapter, text, { persist: false }),
    evolveCharacterBrains(bookDir, chapter, text, { persist: false }),
  ]);

  const livingPrepare = {
    version: 'living-prepare-1',
    fromChapter: chapter,
    forChapter: chapter + 1,
    worldProposal,
    characterProposals,
    editorFeedback: editorResult.feedback,
    createdAt: new Date().toISOString(),
  };

  // 只经 MemoryUnit 附着提案，禁止 Living 直接 writeJson / writeWorldState
  let attached = null;
  try {
    attached = MemoryUnit.commitLivingPrepare(bookDir, chapter, livingPrepare);
  } catch (err) {
    console.warn('[living] commitLivingPrepare 失败（提案仍返回内存）:', err?.message || err);
  }

  return {
    chapter,
    editorFeedback: editorResult.feedback,
    worldState: worldProposal,
    characterEvolutions: characterProposals,
    livingPrepare,
    memoryAttach: attached,
    daySync: { skipped: true, reason: 'day-sync-only-via-memory-unit' },
    analysisOnly: true,
  };
}

/** Living Novel 生命状态 Dashboard */
export function getLivingNovelStatus(bookDir) {
  initWorldStateIfNeeded(bookDir);
  const ctx = buildNovelIntelligenceContext(bookDir, 1);
  const ws = readWorldState(bookDir) || {};
  const storyDna = readStoryDna(bookDir) || {};

  const brains = listCharacterBrains(bookDir);
  let relationDelta = 0;
  for (const name of brains) {
    const b = readCharacterBrain(bookDir, name);
    const log = b?.evolutionLog || [];
    if (log.length >= 2) {
      const prev = log[log.length - 2]?.state?.trust_protagonist ?? 50;
      const curr = log[log.length - 1]?.state?.trust_protagonist ?? 50;
      relationDelta += curr - prev;
    }
  }

  const recentFeedback = [];
  for (let ch = 1; ch <= 20; ch++) {
    const fb = readEditorFeedback(bookDir, ch);
    if (fb) recentFeedback.push(fb);
  }
  const avgCommercial = recentFeedback.length
    ? Math.round(recentFeedback.reduce((s, f) => s + (f.commercial_score || 0), 0) / recentFeedback.length)
    : 75;

  const conflictIntensity = clamp(100 - (ws.social_stability ?? 60) + (ws.rebellion_level ?? 20));
  const suspenseIndex = clamp((ws.deep_zone_activity ?? 30) + avgCommercial / 2);

  const suggestions = [];
  const lowConflictCount = recentFeedback.slice(-3).filter((f) => f.problems?.includes('conflict_low')).length;
  if (lowConflictCount >= 2) {
    suggestions.push('连续多章冲突评分偏低，建议下一章提高压力与对抗');
  }
  if (Math.abs(relationDelta) < 5 && brains.length > 0) {
    suggestions.push('连续章节人物关系变化较小，建议增加关系冲突');
  }
  if ((ws.rebellion_level ?? 0) > 50 && (ws.ai_control ?? 100) > 90) {
    suggestions.push('世界处于高压对峙期，适合爆发性事件或代价抉择');
  }

  return {
    storyHealth: clamp(avgCommercial + (storyDna.core_hook ? 10 : 0)),
    worldStability: ws.social_stability ?? 65,
    relationChange: relationDelta,
    conflictIntensity,
    suspenseIndex,
    worldState: ws,
    hasStoryDna: !!storyDna.core_hook,
    characterBrainCount: brains.length,
    suggestions,
    metrics: {
      storyHealth: clamp(avgCommercial + (storyDna.core_hook ? 10 : 0)),
      worldStability: ws.social_stability ?? 65,
      relationChange: relationDelta,
      conflictIntensity,
      suspenseIndex,
    },
  };
}

export function getStoryContext(bookDir, chapter) {
  return buildNovelIntelligenceContext(bookDir, chapter || 1);
}
