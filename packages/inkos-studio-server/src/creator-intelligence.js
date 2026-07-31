/**
 * Creator Intelligence V3.6 — Story Director / World Sim / Character Brain / AI Editor
 * 仅 Studio Server，不修改 Runtime / Brain / Prompt Compiler
 */
import { chatCompletion, isLlmConfigured } from '../../inkos-brain/src/writer/llm-writer.js';
import { loadInkOsConfig } from '../../inkos-core/src/lib/config.js';
import { readModule } from './module-service.js';
import { getCreationInsights } from './canon-analyzer.js';
import {
  readStoryDna, writeStoryDna, writeSystemFile, readSystemFile,
  writeCharacterBrain, readCharacterBrain,
} from './system-store.js';
import { presetToDimensions } from './creator-loop.js';
import { getPreset } from './presets.js';

function readVolumeCompleteness(bookDir) {
  try {
    const vol = readModule(bookDir, 'volume');
    let content = vol.content || '';
    if (vol.files?.length) {
      content = readModule(bookDir, 'volume', vol.files[0].name).content || '';
    }
    const trimmed = content.trim();
    const hasGoal = /卷目标|##\s*卷|高潮|chapterCount/i.test(trimmed);
    const pct = trimmed.length > 200 && hasGoal ? 100
      : trimmed.length > 80 ? 70
        : trimmed.length > 0 ? 40 : 0;
    return { hasOutline: trimmed.length > 80 && hasGoal, pct };
  } catch {
    return { hasOutline: false, pct: 0 };
  }
}

async function callIntelLlm(system, user, maxTokens = 3000) {
  const config = loadInkOsConfig().llm;
  if (!config.apiKey) return null;
  const timeoutMs = Number(process.env.INKOS_AI_TIMEOUT_MS || 90000);
  const result = await Promise.race([
    chatCompletion({
      baseUrl: config.baseUrl,
      apiKey: config.apiKey,
      model: config.model,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      maxTokens,
      temperature: 0.75,
    }),
    new Promise((_, reject) => setTimeout(() => reject(new Error('AI 超时')), timeoutMs)),
  ]);
  const content = result?.content;
  if (!content || typeof content !== 'string') return null;
  return content.replace(/```[\w]*\n?/g, '').trim();
}

function parseJsonBlock(text) {
  if (!text || typeof text !== 'string') return null;
  try {
    const m = text.match(/\{[\s\S]*\}/);
    return m ? JSON.parse(m[0]) : null;
  } catch {
    return null;
  }
}

/** 将 DNA 字段统一为字符串，避免前端渲染崩溃 */
export function sanitizeStoryDna(dna, pitch = '') {
  const str = (v) => {
    if (v == null) return '';
    if (typeof v === 'string') return v;
    if (typeof v === 'number' || typeof v === 'boolean') return String(v);
    if (Array.isArray(v)) return v.map(str).filter(Boolean).join('、');
    if (typeof v === 'object') return Object.values(v).map(str).filter(Boolean).join('；');
    return String(v);
  };
  const out = {};
  for (const [k, v] of Object.entries(dna || {})) {
    out[k] = str(v);
  }
  if (pitch && !out.pitch) out.pitch = pitch;
  return out;
}

function buildFallbackDna(pitch) {
  return sanitizeStoryDna({
    title: pitch.slice(0, 16) || '未命名',
    genre: pitch.includes('AI') || pitch.includes('科幻') ? '近未来科幻悬疑' : '都市奇幻',
    reader: '男性向悬疑',
    core_hook: pitch.slice(0, 40) || pitch,
    main_question: '真相究竟是什么？',
    main_conflict: '个人意志与系统秩序的对抗',
    power_fantasy: '在规则缝隙中掌控主动权',
    ending_direction: '代价与觉醒并存',
    commercial_direction: pitch.includes('升级') ? '升级流' : '悬疑揭秘流',
    estimated_length: '300万字长篇',
    selling_point: pitch,
    theme: '权力、记忆与身份',
    audience: '喜欢慢热悬疑与心理博弈的读者',
  }, pitch);
}

/** Story Director — 替代简单 Pitch */
export async function analyzeStoryDirector(pitch) {
  const safePitch = String(pitch || '').trim();
  const fallback = buildFallbackDna(safePitch);
  if (!safePitch) return { dna: fallback, source: 'fallback' };

  if (!isLlmConfigured()) return { dna: fallback, source: 'fallback' };

  try {
    const raw = await callIntelLlm(
      `你是资深网文策划「故事导演」。根据用户创意输出 JSON（不要代码块）：
{
  "title": "书名建议",
  "genre": "题材",
  "reader": "目标读者",
  "core_hook": "核心卖点一句话",
  "main_question": "全书核心悬念",
  "main_conflict": "主线冲突",
  "power_fantasy": "爽点/力量幻想",
  "ending_direction": "结局方向",
  "commercial_direction": "商业方向",
  "estimated_length": "预计篇幅",
  "selling_point": "差异化卖点",
  "theme": "主题",
  "audience": "读者画像"
}`,
      `用户创意：\n${safePitch}`,
    );
    const parsed = parseJsonBlock(raw);
    return { dna: sanitizeStoryDna({ ...fallback, ...(parsed || {}) }, safePitch), source: 'llm' };
  } catch {
    return { dna: fallback, source: 'fallback' };
  }
}

/** World Simulation — 模拟世界 N 年发展 */
export async function simulateWorld({ worldMarkdown, years = 10, storyDna }) {
  const startYear = storyDna?.start_year || 2052;
  const fallback = {
    startYear,
    spanYears: years,
    timeline: [
      { year: startYear, ai_control: 93, social_stability: 87, events: ['AI控制率93%', '社会稳定87%', '地下反抗组织萌芽'] },
      { year: startYear + 3, ai_control: 95, social_stability: 72, events: ['第一次AI叛乱被镇压', '记忆审查加强'] },
      { year: startYear + 6, ai_control: 96, social_stability: 58, events: ['遗忘者数量激增', '禁区扩大'] },
      { year: startYear + years, ai_control: 97, social_stability: 45, events: ['文明危机临界点', '多方势力对峙'] },
    ],
    factions: { underground: 'active', government: 'weakened', ai_council: 'dominant' },
    summary: `模拟${years}年：AI控制持续上升，社会稳定性下降，反抗与遗忘危机加剧。`,
  };

  if (!isLlmConfigured()) return { simulation: fallback, source: 'fallback' };

  try {
    const raw = await callIntelLlm(
      `你是世界观模拟引擎。根据世界设定模拟${years}年发展，输出 JSON：
{
  "startYear": 数字,
  "spanYears": ${years},
  "timeline": [{"year":数字,"ai_control":0-100,"social_stability":0-100,"events":["事件"]}],
  "factions": {"势力key":"状态"},
  "summary": "总结"
}`,
      `Story DNA：${JSON.stringify(storyDna || {})}\n\n世界设定：\n${worldMarkdown || '（空）'}`,
      4000,
    );
    const parsed = parseJsonBlock(raw);
    return { simulation: { ...fallback, ...parsed }, source: 'llm' };
  } catch {
    return { simulation: fallback, source: 'fallback' };
  }
}

/** Character Brain — 人物生命状态 */
export async function analyzeCharacterBrain({ characterMarkdown, characterName, storyDna }) {
  const fallback = {
    character: characterName,
    goals: { surface: '完成当前任务', hidden: '保护重要之人' },
    fears: ['被抛弃', '失去记忆'],
    bottom_line: '不伤害无辜者',
    current_state: {
      trust_protagonist: 60,
      fear: 30,
      betrayal_probability: 15,
      suspicion: 20,
      loyalty: 70,
    },
    growth_arc: '从怀疑到并肩，或走向对立',
    triggers: { lie: { trust: -20, suspicion: 30 }, betrayal: { betrayal_probability: 25 } },
  };

  if (!isLlmConfigured()) return { brain: fallback, source: 'fallback' };

  try {
    const raw = await callIntelLlm(
      `你是人物心理引擎。分析人物并输出 JSON：
{
  "character": "姓名",
  "goals": {"surface":"表面目标","hidden":"隐藏目标"},
  "fears": ["恐惧"],
  "bottom_line": "底线",
  "current_state": {"trust_protagonist":0-100,"fear":0-100,"betrayal_probability":0-100,"suspicion":0-100,"loyalty":0-100},
  "growth_arc": "成长弧线",
  "triggers": {"事件":{"trust":数字,"suspicion":数字}}
}`,
      `Story DNA：${JSON.stringify(storyDna || {})}\n\n人物卡：\n${characterMarkdown}`,
    );
    const parsed = parseJsonBlock(raw);
    return { brain: { ...fallback, ...parsed, character: characterName }, source: 'llm' };
  } catch {
    return { brain: fallback, source: 'fallback' };
  }
}

/** AI Editor — 商业/文学/连载三模式 */
export async function runAiEditor({ content, mode = 'commercial', chapter, context }) {
  const modes = {
    commercial: '商业编辑：检查前三章吸引力、爽点、卖点、读者留存钩子',
    literary: '文学编辑：检查人物深度、语言质感、氛围、主题表达',
    serialization: '连载编辑：检查章节结尾钩子、更新动力、悬念延续、追读欲',
  };
  const fallback = {
    mode,
    chapter: chapter || 1,
    scores: { commercial: 78, literary: 72, suspense: mode === 'serialization' ? 85 : 70 },
    issues: [
      { level: 'warning', text: '主角目标在前三章不够明确' },
      { level: 'warning', text: '反派存在感可加强' },
      { level: 'info', text: '章节结尾可增加爆点钩子' },
    ],
    summary: '整体可读，建议强化冲突与章末钩子。',
  };

  if (!isLlmConfigured()) return { review: fallback, source: 'fallback' };

  try {
    const raw = await callIntelLlm(
      `${modes[mode] || modes.commercial}。输出 JSON：
{
  "mode": "${mode}",
  "chapter": ${chapter || 1},
  "scores": {"commercial":0-100,"literary":0-100,"suspense":0-100},
  "issues": [{"level":"warning|info|error","text":"问题"}],
  "summary": "总结建议"
}`,
      `上下文：${JSON.stringify(context || {})}\n\n正文/设定：\n${content?.slice(0, 6000) || '（空）'}`,
    );
    const parsed = parseJsonBlock(raw);
    return { review: { ...fallback, ...parsed, mode }, source: 'llm' };
  } catch {
    return { review: fallback, source: 'fallback' };
  }
}

/** Style DNA — 文风参数化 */
export function presetToStyleDna(presetId) {
  const dims = presetToDimensions(presetId);
  const p = getPreset(presetId);
  return {
    source: presetId,
    sentence: { length: dims.rhythm?.includes('快') ? 'short' : 'medium' },
    description: { environment: dims.proseStyle?.includes('环境') ? 'high' : 'medium' },
    dialogue: { style: dims.dialogueRatio?.includes('25') ? 'restrained' : 'balanced' },
    emotion: { expression: dims.atmosphere?.includes('压抑') ? 'hidden' : 'moderate' },
    conflict: { type: dims.combat?.includes('心理') ? 'psychological' : 'action' },
    chapter: { ending_hook: true },
    rhythm: dims.rhythm || '慢热',
    atmosphere: dims.atmosphere || '压抑',
    info_release: dims.infoRelease || '渐进',
    hook: dims.hook || '延迟爆发',
    preset_ref: p.id,
  };
}

export async function extractStyleDna({ preset, sampleText }) {
  if (sampleText?.trim() && isLlmConfigured()) {
    try {
      const raw = await callIntelLlm(
        `分析小说片段的文风 DNA，输出 JSON：
{"sentence":{"length":"short|medium|long"},"description":{"environment":"low|medium|high"},"dialogue":{"style":"restrained|balanced|rich"},"emotion":{"expression":"hidden|moderate|direct"},"conflict":{"type":"psychological|action|social"},"chapter":{"ending_hook":true}}`,
        `片段：\n${sampleText.slice(0, 3000)}`,
      );
      const parsed = parseJsonBlock(raw);
      if (parsed) return { styleDna: { ...parsed, source: 'sample', analyzedAt: new Date().toISOString() }, source: 'llm' };
    } catch { /* fallback */ }
  }
  const dna = presetToStyleDna(preset || '暗夜君王');
  return { styleDna: { ...dna, source: preset || '暗夜君王' }, source: 'preset' };
}

/** Chapter Director — 章节生成前导演（读取 Living Novel 全上下文） */
export async function designChapterDirector({ bookDir, chapter, pitch }) {
  const { buildNovelIntelligenceContext } = await import('./story-context-provider.js');
  const intel = buildNovelIntelligenceContext(bookDir, chapter);
  const storyDna = intel.storyDna || readStoryDna(bookDir);
  let worldMd = '';
  let volumeMd = '';
  let chapterTaskMd = '';
  try { worldMd = readModule(bookDir, 'world').content || ''; } catch { /* */ }
  try {
    const vol = readModule(bookDir, 'volume');
    if (vol.files?.[0]) {
      volumeMd = readModule(bookDir, 'volume', vol.files[0].name).content || '';
    }
  } catch { /* */ }
  try { chapterTaskMd = readModule(bookDir, 'chapter-task').content || ''; } catch { /* */ }

  const fallback = {
    chapter,
    goal: pitch || '推进主线，揭露新线索',
    conflict: '主角发现关键信息被篡改',
    climax: '第一次正面对抗核心势力',
    cost: '失去一位盟友的信任',
    hook: '发现自己也可能是被删除的对象',
    scenes: ['调查现场', '对峙', '反转揭示'],
    emotional_beat: '怀疑 → 震惊 → 决心',
  };

  if (!isLlmConfigured()) return { plan: fallback, storyDna, source: 'fallback' };

  try {
    const raw = await callIntelLlm(
      `你是章节导演。设计第${chapter}章，输出 JSON：
{
  "chapter": ${chapter},
  "goal": "章节目标",
  "conflict": "核心冲突",
  "climax": "高潮",
  "cost": "代价",
  "hook": "章末钩子",
  "scenes": ["场景1","场景2"],
  "emotional_beat": "情绪曲线"
}`,
      `Story DNA：${JSON.stringify(storyDna || {})}\nWorld State：${JSON.stringify(intel.worldState || {})}\nCharacter States：${JSON.stringify(intel.characterStates || {})}\n上章编辑反馈：${JSON.stringify(intel.editorFeedback || {})}\nAdaptive：${(intel.adaptiveHints || []).join('；')}\n卷规划：\n${volumeMd}\n章节任务：\n${chapterTaskMd}\n世界：\n${worldMd?.slice(0, 2000)}`,
    );
    const parsed = parseJsonBlock(raw);
    return { plan: { ...fallback, ...parsed, chapter }, storyDna, source: 'llm' };
  } catch {
    return { plan: fallback, storyDna, source: 'fallback' };
  }
}

/** Prompt Quality Score */
export function scorePromptQuality({ pitch, storyDna, world, writing, characters, factions }) {
  const checks = [
    { key: 'story_dna', label: 'Story DNA', weight: 20, ok: !!storyDna?.core_hook },
    { key: 'pitch', label: '创意定位', weight: 15, ok: !!pitch?.trim() },
    { key: 'world', label: '世界观', weight: 15, ok: (world?.length || 0) > 200 },
    { key: 'writing', label: '文风规则', weight: 15, ok: (writing?.length || 0) > 100 },
    { key: 'characters', label: '人物', weight: 15, ok: (characters?.length || 0) > 0 },
    { key: 'factions', label: '势力', weight: 10, ok: (factions?.length || 0) > 0 },
    { key: 'conflict', label: '冲突设计', weight: 10, ok: !!storyDna?.main_conflict },
  ];
  let score = 0;
  const missing = [];
  for (const c of checks) {
    if (c.ok) score += c.weight;
    else missing.push({ key: c.key, label: c.label, penalty: c.weight });
  }
  const gaps = missing.map((m) => ({ ...m, suggestion: `补充${m.label}` }));
  return {
    score,
    grade: score >= 90 ? 'A' : score >= 75 ? 'B' : score >= 60 ? 'C' : 'D',
    missing: gaps,
    autoFix: gaps.slice(0, 3).map((g) => g.suggestion),
  };
}

/** Conversation Creation — 多轮共创 */
export async function conversationCreate({ messages = [], state = {} }) {
  const lastUser = [...messages].reverse().find((m) => m.role === 'user')?.content || '';
  const fallback = {
    reply: '好，我为你准备了三个方向：\nA. 黑暗科幻 — AI统治下的记忆战争\nB. 赛博悬疑 — 都市怪谈与数字幽灵\nC. AI战争 — 人类最后的认知防线\n\n请回复选择 A/B/C，或告诉我你的偏好。',
    state: { ...state, phase: 'direction_select', options: ['A', 'B', 'C'] },
    ready: false,
  };

  if (!isLlmConfigured()) return fallback;

  try {
    const history = messages.map((m) => `${m.role === 'user' ? '用户' : 'AI'}: ${m.content}`).join('\n');
    const raw = await callIntelLlm(
      `你是小说共创助手。多轮对话引导用户形成完整小说方案。输出 JSON：
{
  "reply": "回复用户（可含方案选项）",
  "state": {"phase":"阶段","selectedDirection":"如有"},
  "ready": false或true,
  "dna": null或{story_dna对象当ready为true时}
}
当用户已明确题材、卖点、冲突、文风时设 ready:true 并填 dna。`,
      `对话历史：\n${history}\n\n当前状态：${JSON.stringify(state)}`,
      3500,
    );
    const parsed = parseJsonBlock(raw);
    if (parsed) return { ...fallback, ...parsed, source: 'llm' };
  } catch { /* */ }
  return fallback;
}

/** Creative Dashboard — 创作任务中心 */
export async function getCreativeDashboard(bookDir) {
  const insights = await getCreationInsights(bookDir);
  const storyDna = readStoryDna(bookDir);
  const worldSim = readSystemFile(bookDir, 'world_simulation');
  const styleDna = readSystemFile(bookDir, 'style_dna');
  const volumeInfo = readVolumeCompleteness(bookDir);

  const modules = [
    { key: 'story_dna', label: 'Story DNA', done: !!storyDna, weight: 15 },
    { key: 'world', label: '世界', done: insights.world.completeness >= 60, weight: 20, pct: insights.world.completeness },
    { key: 'writing', label: '文风', done: insights.writing.completeness >= 50, weight: 15, pct: insights.writing.completeness },
    { key: 'characters', label: '人物', done: insights.characters.completeness >= 40, weight: 20, pct: insights.characters.completeness },
    { key: 'factions', label: '势力', done: insights.factions.completeness >= 40, weight: 15, pct: insights.factions.completeness },
    { key: 'volume', label: '第一卷', done: volumeInfo.hasOutline, weight: 15, pct: volumeInfo.pct },
  ];

  let completion = 0;
  for (const m of modules) {
    if (m.done) completion += m.weight;
    else if (m.pct) completion += Math.round(m.weight * m.pct / 100);
  }

  const tasks = [];
  if (!storyDna) tasks.push({ id: 'story_dna', label: '完成 Story Director 定位', priority: 'high', action: 'director' });
  if (insights.world.completeness < 80) tasks.push({ id: 'world', label: '完善世界设定', priority: 'high', action: 'world', suggestion: insights.world.suggestion });
  if (insights.characters.completeness < 60) tasks.push({ id: 'characters', label: '补充核心人物', priority: 'medium', action: 'characters' });
  if (!worldSim) tasks.push({ id: 'world_sim', label: '运行世界模拟（10年）', priority: 'medium', action: 'world_sim' });
  if (!volumeInfo.hasOutline) {
    tasks.push({ id: 'volume', label: '生成第一卷大纲', priority: insights.world.completeness >= 60 ? 'high' : 'low', action: 'volume', suggestion: '在创作向导或大纲页生成第一卷卷纲' });
  }

  return {
    completion: Math.min(100, completion),
    modules,
    tasks: tasks.slice(0, 5),
    storyDna,
    hasWorldSimulation: !!worldSim,
    hasStyleDna: !!styleDna,
    insights,
  };
}

export async function saveStoryDirector(bookDir, dna) {
  return writeStoryDna(bookDir, dna);
}

export async function saveWorldSimulation(bookDir, simulation) {
  return writeSystemFile(bookDir, 'world_simulation', { ...simulation, updatedAt: new Date().toISOString() });
}

export async function saveStyleDna(bookDir, styleDna) {
  return writeSystemFile(bookDir, 'style_dna', { ...styleDna, updatedAt: new Date().toISOString() });
}

export async function saveCharacterBrainState(bookDir, charName, brain) {
  return writeCharacterBrain(bookDir, charName, brain);
}

export function loadCharacterBrainState(bookDir, charName) {
  return readCharacterBrain(bookDir, charName);
}
