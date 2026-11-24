/**
 * Studio AI Service — DeepSeek 内容生成（不修改 Brain/Runtime）
 */
import { chatCompletion, isLlmConfigured } from '../../inkos-brain/src/writer/llm-writer.js';
import { loadInkOsConfig } from '../../inkos-core/src/lib/config.js';
import { getPreset } from './presets.js';
import {
  serializeWorldMd,
  serializeWritingMd,
  serializeChapterTaskMd,
  serializeCharacterMd,
} from './ai-serializers.js';
import { buildStoryBrief, storyDnaConstraint } from './story-dna-context.js';
import { buildVolumeUpstreamContext } from './volume-plan.js';

function promptBrief({ pitch, title, storyDna }) {
  return buildStoryBrief({ pitch, title, storyDna });
}

function extractJson(text) {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try { return JSON.parse(match[0]); } catch { return null; }
}

async function callLlm(system, user, maxTokens = 3000, temperature = 0.85) {
  const config = loadInkOsConfig().llm;
  if (!config.apiKey) throw new Error('未配置 LLM API Key');

  const timeoutMs = Number(process.env.INKOS_AI_TIMEOUT_MS || 90000);
  const llmPromise = chatCompletion({
    baseUrl: config.baseUrl,
    apiKey: config.apiKey,
    model: config.model,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    maxTokens,
    temperature,
  });

  const result = await Promise.race([
    llmPromise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error('AI 生成超时，请稍后重试')), timeoutMs);
    }),
  ]);

  return result.content;
}

function fallbackWorld(pitch, preset, title, storyDna) {
  if (storyDna?.core_hook || storyDna?.main_conflict) {
    const genre = storyDna.genre || getPreset(preset).genre;
    const w = {
      title: title || storyDna.title || pitch.slice(0, 20),
      era: `${genre}。${storyDna.core_hook || pitch}`,
      history: storyDna.main_question
        ? `核心悬念背景：${storyDna.main_question}`
        : `与主线「${storyDna.main_conflict || pitch}」相关的历史脉络`,
      rules: storyDna.theme ? `世界法则围绕主题「${storyDna.theme}」` : '符合故事设定的特殊规则',
      powerSystem: storyDna.power_fantasy || '与故事卖点匹配的力量/能力体系',
      map: '与主线冲突直接相关的关键地理节点',
      cities: '',
      dangerZones: '',
      socialStructure: storyDna.reader || storyDna.audience
        ? `面向${storyDna.reader || storyDna.audience}的社会结构`
        : '与冲突相关的阶层分布',
      factions: storyDna.main_conflict
        ? `围绕「${storyDna.main_conflict}」对立的核心势力`
        : '与故事冲突相关的势力',
      places: '',
    };
    return { fields: w, markdown: serializeWorldMd(w), source: 'story_dna' };
  }
  const p = getPreset(preset);
  const w = { ...p.world, title: title || pitch.slice(0, 20) };
  w.era = `${w.era}\n\n【创意】${pitch}`;
  return { fields: w, markdown: serializeWorldMd(w), source: 'preset' };
}

function fallbackWriting(preset, title) {
  const p = getPreset(preset);
  const f = { title: title || p.id, stylePreset: preset, ...p.writing };
  return { fields: f, markdown: serializeWritingMd(f), source: 'preset' };
}

function fallbackCharacters(pitch, preset, storyDna) {
  const names = preset.includes('修仙') ? ['林凡', '韩立'] : ['主角', '老周', '调查员'];
  const goalBase = storyDna?.main_conflict || storyDna?.core_hook || pitch;
  return names.map((name) => {
    const f = {
      name,
      identity: name === '主角' ? '故事核心 POV' : '关键配角',
      goal: String(goalBase).slice(0, 40),
      values: '生存与真相',
      bottomLine: '不出卖无辜者',
      secret: '隐藏过去',
      catchphrase: '',
      growth: '从被动到主动',
      importance: name === '主角' ? 100 : 70,
    };
    return { fields: f, markdown: serializeCharacterMd(f) };
  });
}

function fallbackFactions(preset, storyDna) {
  const p = getPreset(preset);
  const conflictHint = storyDna?.main_conflict ? `，围绕「${storyDna.main_conflict}」` : '';
  const names = (p.world.factions || '势力A、势力B').split(/[,，、]/).map((s) => s.trim()).filter(Boolean);
  return names.slice(0, 8).map((name) => ({
    name,
    markdown: [
      `# ${name}`, '', '- **简介**：' + `与故事主线相关的核心势力${conflictHint}`,
      '- **领导者**：待定', '- **成员**：核心干部若干',
      '- **资源**：情报与武力', '- **敌对**：对立势力',
      '- **友好**：潜在盟友', '- **控制区域**：关键据点',
      '- **类型**：势力',
    ].join('\n'),
  }));
}

function fallbackVolume(pitch, preset, storyDna) {
  const hook = storyDna?.core_hook || pitch;
  const conflict = storyDna?.main_conflict || 'no_causal_basis';
  // D2：缺因果依据时用 no_causal_basis 标记，不用「第一次失败与代价」等伪因果占位
  return `# 第 1 卷 · ${storyDna?.title || preset}\n\n## 卷目标\n1. ${hook}\n2. ${conflict}\n3. no_causal_basis\n4. no_causal_basis\n5. no_causal_basis\n\n## 卷末验收\n- [ ] 主角完成阶段目标\n- [ ] no_causal_basis`;
}

function fallbackChapterTask(pitch, preset) {
  // D2：因果字段一律 no_causal_basis（缺数据不伪造因果）；goal=pitch 是真实材料，保留
  const f = {
    pov: '主角',
    goal: pitch,
    obstacle1: 'no_causal_basis',
    obstacle2: 'no_causal_basis',
    bargain: 'no_causal_basis',
    climax: 'no_causal_basis',
    cost: 'no_causal_basis',
    foreshadow: 'no_causal_basis',
    ending: 'no_causal_basis',
  };
  return { fields: f, markdown: serializeChapterTaskMd(f), source: 'preset' };
}

function fallbackPositioning(pitch, preset) {
  const p = getPreset(preset);
  return {
    positioning: {
      title: pitch.slice(0, 12),
      genre: p.genre,
      hook: pitch,
      audience: '男频都市奇幻读者',
      mainConflict: '主角在秩序与黑暗力量之间的抉择',
      sellingPoint: `${p.id}风格 + 渐进揭秘 + 强冲突`,
      theme: '权力与代价',
    },
    source: 'preset',
  };
}

export async function generateModule({ module, action, pitch, preset, title, current, context, storyDna }) {
  const p = getPreset(preset || '都市异能');
  const act = action || 'generate';
  const brief = promptBrief({ pitch, title, storyDna });
  const dnaBlock = storyDnaConstraint(storyDna);
  const upstreamBlock = String(context?.upstreamBrief || context?.brief || '').trim();

  // 编辑类操作 — 优先于模块生成
  if (['optimize', 'rewrite', 'complete'].includes(act)) {
    if (!current) {
      return { message: '请先填写内容或选择条目', source: 'none' };
    }
    if (!isLlmConfigured()) {
      return { markdown: current, source: 'unchanged' };
    }
    const verb = { optimize: '优化', rewrite: '重写', complete: '补全' }[act];
    try {
      const raw = await callLlm(
        '你是小说编辑。输出优化后的完整 Markdown 内容，保持原有结构，不要代码块，不要解释。',
        `${verb}以下内容：\n\n${current}`,
      );
      return { markdown: raw.replace(/```[\w]*\n?/g, '').trim(), source: 'llm' };
    } catch (err) {
      return { markdown: current, error: err.message, source: 'unchanged' };
    }
  }

  if (!isLlmConfigured()) {
    return generateFallback({ module, pitch, preset: p.id, title, current, storyDna });
  }

  const system = '你是小说设定助手。只输出 JSON，不要 markdown 代码块，不要解释。字段用中文。设定必须严格服务于用户提供的 Story DNA，禁止套用无关的通用模板。';

  try {
    if (module === 'positioning') {
      const raw = await callLlm(system, `${dnaBlock ? `${dnaBlock}\n\n` : ''}分析以下故事方案，输出小说定位 JSON：{"title","genre","hook","audience","mainConflict","sellingPoint","theme"}\n\n${brief}`);
      const data = extractJson(raw);
      return { positioning: data || fallbackPositioning(pitch, p.id).positioning, source: 'llm' };
    }

    if (module === 'world') {
      const raw = await callLlm(system, [
        dnaBlock,
        `基于以下故事方案生成完整世界设定（文风「${p.id}」仅作叙事气质参考，不可替代故事内容）：`,
        brief,
        'JSON：{"title","era","history","rules","powerSystem","map","cities","dangerZones","socialStructure","factions","places"}',
      ].filter(Boolean).join('\n\n'));
      const data = extractJson(raw) || (storyDna ? fallbackWorld(pitch, p.id, title, storyDna).fields : p.world);
      data.title = title || data.title || pitch.slice(0, 20);
      if (data.cities && !data.places) data.places = data.cities;
      if (data.dangerZones && data.map) data.map = `${data.map}\n危险区域：${data.dangerZones}`;
      return { fields: data, markdown: serializeWorldMd(data), source: 'llm' };
    }

    if (module === 'writing') {
      const raw = await callLlm(system, `${dnaBlock ? `${dnaBlock}\n\n` : ''}为以下故事生成${p.id}气质的写作规则：\n${brief}\nJSON：{"narrative","prose","rhythm","infoRelease","pov","taboo","wordCount","dialogueRatio","conflictRules","suspenseRules","hookRules","chapterStructure"}`);
      const data = extractJson(raw) || p.writing;
      const f = { title: title || p.id, stylePreset: p.id, ...data };
      return { fields: f, markdown: serializeWritingMd(f), source: 'llm' };
    }

    if (module === 'character') {
      const roleHint = context?.role || '配角';
      const raw = await callLlm(system, `${dnaBlock ? `${dnaBlock}\n\n` : ''}为以下故事生成一个${roleHint}人物：\n${brief}\nJSON：{"name","identity","goal","values","bottomLine","secret","catchphrase","growth","importance","personality"}`);
      const data = extractJson(raw) || fallbackCharacters(pitch, p.id, storyDna)[0].fields;
      return { fields: data, markdown: serializeCharacterMd(data), source: 'llm' };
    }

    if (module === 'characters') {
      const raw = await callLlm(system, `${dnaBlock ? `${dnaBlock}\n\n` : ''}为以下故事生成 2～6 个核心人物（至少含主角与主要反派，可含关键 NPC；数量按故事需要，不要固定为恰好 3 个）：\n${brief}\nJSON：{"characters":[{name,identity,goal,values,bottomLine,secret,growth,importance,personality,role}]}`);
      const data = extractJson(raw);
      const chars = data?.characters || [];
      if (!chars.length) return generateFallback({ module, pitch, preset: p.id, title, current, storyDna });
      return { characters: chars.slice(0, 12).map((f) => ({ fields: f, markdown: serializeCharacterMd(f) })), source: 'llm' };
    }

    if (module === 'factions') {
      const raw = await callLlm(system, `${dnaBlock ? `${dnaBlock}\n\n` : ''}为以下故事生成 2～6 个与主线冲突直接相关的势力/组织（数量按故事需要，不要固定为恰好 3 个）：\n${brief}\nJSON：{"factions":[{"name","intro","leader","members","resources","hostile","friendly","region","kind"}]}`);
      const data = extractJson(raw);
      const list = data?.factions || [];
      if (!list.length) return generateFallback({ module, pitch, preset: p.id, title, current, storyDna });
      return {
        factions: list.slice(0, 12).map((f) => ({
          name: f.name,
          markdown: [`# ${f.name}`, '', `- **简介**：${f.intro || ''}`, `- **领导者**：${f.leader || ''}`,
            `- **成员**：${f.members || ''}`, `- **资源**：${f.resources || ''}`,
            `- **敌对**：${f.hostile || ''}`, `- **友好**：${f.friendly || ''}`,
            `- **控制区域**：${f.region || ''}`,
            `- **类型**：${f.kind || '势力'}`].join('\n'),
        })),
        source: 'llm',
      };
    }

    if (module === 'volume') {
      const raw = await callLlm(system, [
        dnaBlock,
        '你是职业网文策划。必须严格依据下方「已确认设定」生成第一卷大纲，禁止另起无关世界观/角色/势力。',
        `故事摘要：\n${brief}`,
        upstreamBlock ? `【已确认设定 — 必须吸收】\n${upstreamBlock}` : '',
        '输出 JSON：{"title","goal","chapterCount","mainConflicts","climax","markdown"}。markdown 为完整 Markdown 卷纲（含核心节奏/关键场景/卷末悬念）。',
      ].filter(Boolean).join('\n\n'));
      const data = extractJson(raw);
      const md = data?.markdown || raw.replace(/```[\w]*\n?/g, '').trim();
      return { fields: data, markdown: md || fallbackVolume(pitch, p.id, storyDna), source: 'llm' };
    }

    if (module === 'chapter-task') {
      const raw = await callLlm(system, [
        dnaBlock,
        `为下一章生成任务卡：\n${brief}`,
        upstreamBlock ? `【已确认设定】\n${upstreamBlock.slice(0, 2000)}` : '',
        'JSON：{"pov","goal","obstacle1","obstacle2","bargain","climax","cost","foreshadow","ending"}',
      ].filter(Boolean).join('\n\n'));
      const data = extractJson(raw) || fallbackChapterTask(pitch, p.id).fields;
      return { fields: data, markdown: serializeChapterTaskMd(data), source: 'llm' };
    }
  } catch (err) {
    return { ...generateFallback({ module, pitch, preset: p.id, title, current, storyDna }), error: err.message, source: 'preset_fallback' };
  }

  return generateFallback({ module, pitch, preset: p.id, title, current, storyDna });
}

function generateFallback({ module, pitch, preset, title, current, storyDna }) {
  if (module === 'positioning') return fallbackPositioning(pitch, preset);
  if (module === 'world') return fallbackWorld(pitch, preset, title, storyDna);
  if (module === 'writing') return fallbackWriting(preset, title);
  if (module === 'character') return fallbackCharacters(pitch, preset, storyDna)[0];
  if (module === 'characters') return { characters: fallbackCharacters(pitch, preset, storyDna), source: 'preset' };
  if (module === 'factions') return { factions: fallbackFactions(preset, storyDna), source: 'preset' };
  if (module === 'volume') return { markdown: fallbackVolume(pitch, preset, storyDna), source: 'preset' };
  if (module === 'chapter-task') return fallbackChapterTask(pitch, preset);
  if (current) return { markdown: current, source: 'unchanged' };
  return { message: '未知模块', source: 'none' };
}

export async function generateWizardContent({ title, pitch, preset, storyDna }) {
  // 先并发生成上游，再串行生成卷纲（必须吃进世界/角色/势力）
  const [world, writing, characters, factions] = await Promise.all([
    generateModule({ module: 'world', action: 'generate', pitch, preset, title, storyDna }),
    generateModule({ module: 'writing', action: 'generate', pitch, preset, title, storyDna }),
    generateModule({ module: 'characters', action: 'generate', pitch, preset, storyDna }),
    generateModule({ module: 'factions', action: 'generate', pitch, preset, storyDna }),
  ]);
  const upstreamBrief = buildVolumeUpstreamContext({
    worldMarkdown: world?.markdown || '',
    characters: characters?.characters || [],
    factions: factions?.factions || [],
    conflictBrief: [
      storyDna?.main_conflict || '',
      storyDna?.core_hook || '',
      storyDna?.main_question || '',
    ].filter(Boolean).join('\n'),
    openingHook: storyDna?.core_hook || '',
    coreMystery: storyDna?.main_question || '',
  });
  const ctx = { upstreamBrief };
  const [volume, chapterTask] = await Promise.all([
    generateModule({ module: 'volume', action: 'generate', pitch, preset, storyDna, context: ctx }),
    generateModule({ module: 'chapter-task', action: 'generate', pitch, preset, storyDna, context: ctx }),
  ]);
  return { world, writing, characters, factions, volume, chapterTask };
}

/**
 * 世界边界检查 — 轻量 prompt，不写盘、不跑 Pipeline
 */
export async function checkWorldBoundary({ worldMarkdown = '', genre = '', title = '' }) {
  const system = '你是网文世界观编辑。只指出明显逻辑漏洞，简洁中文，不超过 400 字。';
  const user = `书名：${title || '未命名'}\n题材：${genre || '未指定'}\n\n世界设定：\n${String(worldMarkdown || '').slice(0, 4000)}\n\n请检查是否有明显逻辑漏洞（规则自相矛盾、代价缺失、力量体系不可控等）。`;
  if (!isLlmConfigured()) {
    return {
      report: '（本地模式）请自检：规则是否自洽、代价是否存在、金手指是否无上限。',
      source: 'local',
    };
  }
  try {
    const report = await callLlm(system, user, 500, 0.4);
    return { report: String(report || '').trim(), source: 'llm' };
  } catch (e) {
    return { report: `检查失败：${e.message}`, source: 'error' };
  }
}

/**
 * 试写第1章第1段 — 预览 only，不写书籍目录
 * max_tokens 500, temperature 0.8
 */
export async function trialWriteOpening(body = {}) {
  const {
    title = '',
    genre = '',
    openingHook = '',
    coreMystery = '',
    beatPlan = {},
    chapter1Hook = '',
    protagonist = '',
    sentenceStyle = '',
    worldExcerpt = '',
  } = body;
  const system = '你是网文开篇写手。只写第1章第1段试读（约300字），不要标题，不要解释，不要续写整章。';
  const user = [
    `书名：${title}`,
    `题材：${genre}`,
    `句式：${sentenceStyle || '短句为主'}`,
    `开篇钩子：${openingHook}`,
    `核心悬念：${coreMystery}`,
    `主角：${protagonist}`,
    `Beat1：${beatPlan.beat1 || ''}`,
    `章末钩子参考：${chapter1Hook}`,
    `世界摘录：${String(worldExcerpt || '').slice(0, 800)}`,
    '',
    '请直接输出约300字正文试读。',
  ].join('\n');

  if (!isLlmConfigured()) {
    const fallback = `${openingHook || '门被推开。'} ${protagonist || '他'}站在原地，听见远处传来不合时宜的声响。空气里有一股说不清的味道——像旧纸，又像铁锈。他知道，从这一秒开始，日常已经结束了。`;
    return { text: fallback.slice(0, 320), source: 'local', previewOnly: true };
  }
  try {
    const text = await callLlm(system, user, 500, 0.8);
    return { text: String(text || '').trim().slice(0, 800), source: 'llm', previewOnly: true };
  } catch (e) {
    return { text: '', error: e.message, source: 'error', previewOnly: true };
  }
}
