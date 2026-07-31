/**
 * Story Context Provider — 组合 Novel Intelligence Context 并同步至 Runtime 可读 Canon
 * 不修改 Runtime / Brain / Prompt Compiler
 */
import { resolveProtagonistName } from './brain-context-sync.js';
import {
  readStoryDna,
  readSystemFile,
  readWorldState,
  readChapterPlan,
  readEditorFeedback,
  listCharacterBrains,
  readCharacterBrain,
} from './system-store.js';

function padChapter(n) {
  return String(n).padStart(4, '0');
}

/** 构建 Story DNA 写作指令块 */
export function buildStoryDnaDirectives(storyDna = {}) {
  const lines = [];
  const theme = storyDna.theme || storyDna.core_theme;
  const hook = storyDna.core_hook || storyDna.main_hook;
  const question = storyDna.main_question;
  const conflict = storyDna.main_conflict;
  const tone = storyDna.tone || storyDna.genre;

  if (theme) lines.push(`保持核心主题：${theme}`);
  if (hook) lines.push(`每章强化核心卖点：${hook}`);
  if (question) lines.push(`不要提前解释核心悬念：${question}`);
  if (conflict) lines.push(`冲突优先通过人物选择产生：${conflict}`);
  if (tone) lines.push(`整体基调：${tone}`);
  lines.push('保持未知感，信息渐进释放');
  return lines;
}

/** 构建 Style DNA 指令 */
export function buildStyleDnaDirectives(styleDna = {}) {
  const lines = [];
  if (styleDna.rhythm) lines.push(`节奏：${styleDna.rhythm}`);
  if (styleDna.atmosphere) lines.push(`氛围：${styleDna.atmosphere}`);
  if (styleDna.sentence?.length) lines.push(`句式：${styleDna.sentence.length}`);
  if (styleDna.dialogue?.style) lines.push(`对白：${styleDna.dialogue.style}`);
  if (styleDna.conflict?.type) lines.push(`冲突类型：${styleDna.conflict.type}`);
  if (styleDna.chapter?.ending_hook) lines.push('章末必须有钩子');
  return lines;
}

/** 读取全部 Living Novel 上下文 */
export function buildNovelIntelligenceContext(bookDir, chapter) {
  const storyDna = readStoryDna(bookDir) || {};
  const styleDna = readSystemFile(bookDir, 'style_dna') || {};
  const worldSim = readSystemFile(bookDir, 'world_simulation') || {};
  const worldState = readWorldState(bookDir) || {};
  const chapterPlan = readChapterPlan(bookDir, chapter) || {};
  const editorFeedback = readEditorFeedback(bookDir, chapter - 1) || readEditorFeedback(bookDir, chapter) || {};

  const characterStates = {};
  for (const name of listCharacterBrains(bookDir)) {
    const brain = readCharacterBrain(bookDir, name);
    if (brain) characterStates[name] = brain.current_state || brain;
  }

  const storyDirectives = buildStoryDnaDirectives(storyDna);
  const styleDirectives = buildStyleDnaDirectives(styleDna);

  const adaptiveHints = [];
  const suggestionMap = {
    increase_pressure: '提高冲突强度 +20%，增加对抗与压力',
    deepen_relationship: '深化人物关系与内心冲突',
    strengthen_chapter_hook: '强化章末钩子与悬念',
    conflict_low: '补足冲突设计，避免平铺直叙',
    character_flat: '人物动机与反应需更鲜明',
  };
  if (editorFeedback.suggestions?.length) {
    for (const s of editorFeedback.suggestions) {
      adaptiveHints.push(suggestionMap[s] || String(s));
    }
  }
  if (editorFeedback.problems?.includes('conflict_low') || (editorFeedback.commercial_score && editorFeedback.commercial_score < 70)) {
    adaptiveHints.push(suggestionMap.increase_pressure);
  }
  if (editorFeedback.problems?.includes('character_flat')) {
    adaptiveHints.push(suggestionMap.deepen_relationship);
  }
  if (editorFeedback.problems?.includes('hook_weak')) {
    adaptiveHints.push(suggestionMap.strengthen_chapter_hook);
  }

  return {
    storyDna,
    styleDna,
    worldSim,
    worldState,
    chapterPlan,
    editorFeedback,
    characterStates,
    storyDirectives,
    styleDirectives,
    adaptiveHints,
    promptBlock: formatIntelligencePromptBlock({
      storyDirectives,
      styleDirectives,
      worldState,
      characterStates,
      chapterPlan,
      adaptiveHints,
      editorFeedback,
    }),
  };
}

export function formatIntelligencePromptBlock({
  storyDirectives = [],
  styleDirectives = [],
  worldState = {},
  characterStates = {},
  chapterPlan = {},
  adaptiveHints = [],
  editorFeedback = {},
}) {
  const sections = [];

  if (storyDirectives.length) {
    sections.push('### Story DNA 指令', ...storyDirectives.map((l) => `- ${l}`));
  }
  if (styleDirectives.length) {
    sections.push('', '### Style DNA 指令', ...styleDirectives.map((l) => `- ${l}`));
  }
  if (Object.keys(worldState).length) {
    sections.push('', '### World State', `- 年份：${worldState.year ?? '—'}`, `- AI控制率：${worldState.ai_control ?? '—'}%`, `- 社会稳定：${worldState.social_stability ?? '—'}%`, `- 反抗等级：${worldState.rebellion_level ?? '—'}`);
  }
  if (Object.keys(characterStates).length) {
    sections.push('', '### Character Brain 状态');
    for (const [name, state] of Object.entries(characterStates)) {
      const cs = state.current_state || state;
      const metrics = Object.entries(cs).filter(([, v]) => typeof v === 'number').map(([k, v]) => `${k}:${v}`).join(', ');
      if (metrics) sections.push(`- ${name}：${metrics}`);
    }
  }
  if (chapterPlan.goal) {
    sections.push('', '### Chapter Plan（最高优先级）', `- 目标：${chapterPlan.goal}`, `- 冲突：${chapterPlan.conflict || chapterPlan.obstacle1 || ''}`, `- 高潮：${chapterPlan.climax || ''}`, `- 代价：${chapterPlan.cost || ''}`, `- 钩子：${chapterPlan.hook || chapterPlan.ending || ''}`);
  }
  if (editorFeedback.commercial_score != null) {
    sections.push('', '### 上章编辑反馈', `- 商业：${editorFeedback.commercial_score}`, `- 文学：${editorFeedback.literary_score ?? '—'}`, `- 连载：${editorFeedback.serial_score ?? editorFeedback.serialization_score ?? '—'}`);
  }
  if (adaptiveHints.length) {
    sections.push('', '### Adaptive Planner', ...adaptiveHints.map((h) => `- ${h}`));
  }

  return sections.join('\n');
}

/** 将 Intelligence Context 注入 chapter-task（Runtime 会读取） */
export function buildChapterTaskWithContext(plan, context, bookDir) {
  const p = plan || context.chapterPlan || {};
  const protagonist = bookDir ? resolveProtagonistName(bookDir) : null;
  const lines = [
    '# 09 Current Chapter',
    '',
    '> Studio Living Novel Engine · Intelligence Context Injected',
    '',
    `- **POV**：${p.pov || protagonist || '主角'}`,
    `- **目标**：${p.goal || ''}`,
    `- **第一阻碍**：${p.conflict || p.obstacle1 || ''}`,
    `- **第二阻碍**：${p.obstacle2 || ''}`,
    `- **博弈**：${p.bargain || ''}`,
    `- **高潮**：${p.climax || ''}`,
    `- **代价**：${p.cost || ''}`,
    `- **新增伏笔**：${p.foreshadow || p.hook || ''}`,
    `- **结尾**：${p.hook || p.ending || ''}`,
    '',
    '## Living Novel Intelligence Context',
    '',
    context.promptBlock || formatIntelligencePromptBlock(context),
  ];
  return lines.join('\n');
}

/** 同步上下文到 Canon（chapter-task） */
export function syncContextToCanon(bookDir, chapter, plan = null) {
  const ctx = buildNovelIntelligenceContext(bookDir, chapter);
  const effectivePlan = plan || ctx.chapterPlan || {};
  const md = buildChapterTaskWithContext(effectivePlan, ctx, bookDir);
  return { md, context: ctx };
}
