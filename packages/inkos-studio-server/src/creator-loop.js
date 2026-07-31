/**
 * Creator Loop — 增量 AI 生成（Current + Suggestion → Updated）
 * 禁止全量重写无关部分
 */
import { chatCompletion, isLlmConfigured } from '../../inkos-brain/src/writer/llm-writer.js';
import { loadInkOsConfig } from '../../inkos-core/src/lib/config.js';
import { generateModule } from './ai-service.js';
import { buildVolumeUpstreamContext } from './volume-plan.js';
import {
  serializeWorldMd,
  serializeWritingMd,
  serializeCharacterMd,
  serializeChapterTaskMd,
} from './ai-serializers.js';
import { saveVersion } from './version-store.js';
import { writeModule, readModule } from './module-service.js';
import { getPreset, WRITING_DIMENSIONS } from './presets.js';
import { buildStoryBrief } from './story-dna-context.js';

const INCREMENTAL_SYSTEM = `你是小说设定协作助手。必须遵守 Creator Loop 增量原则：
1. 保留当前内容中所有与建议无关的部分，原文不动
2. 只修改与用户建议直接相关的部分
3. 禁止重写未提及的章节/段落/字段
4. 输出完整文档（与输入相同格式），不要解释，不要代码块包裹`;

async function callIncrementalLlm(current, suggestion, section, storyBrief) {
  const config = loadInkOsConfig().llm;
  if (!config.apiKey) return null;
  const user = [
    storyBrief ? `【故事方案 / Story DNA】\n${storyBrief}\n\n世界设定必须与此故事方案一致，禁止偏离。` : '',
    section ? `【仅修改此部分】${section}` : '',
    '【当前内容】',
    current,
    '',
    '【用户建议】',
    suggestion,
    '',
    '请输出更新后的完整内容。保留未涉及部分不变。',
  ].filter(Boolean).join('\n');

  const timeoutMs = Number(process.env.INKOS_AI_TIMEOUT_MS || 90000);
  const result = await Promise.race([
    chatCompletion({
      baseUrl: config.baseUrl,
      apiKey: config.apiKey,
      model: config.model,
      messages: [
        { role: 'system', content: INCREMENTAL_SYSTEM },
        { role: 'user', content: user },
      ],
      maxTokens: 4000,
      temperature: 0.7,
    }),
    new Promise((_, reject) => setTimeout(() => reject(new Error('AI 超时')), timeoutMs)),
  ]);
  return result.content.replace(/```[\w]*\n?/g, '').trim();
}

/** 世界模块切片 */
export const WORLD_SECTIONS = [
  { key: 'era', label: '时代背景', header: '## 1. 世界背景' },
  { key: 'powerSystem', label: '力量体系', header: '## 2. 超凡体系' },
  { key: 'rules', label: '世界规则', header: '## 3. 能力体系' },
  { key: 'factions', label: '势力概览', header: '## 4. 势力体系' },
  { key: 'history', label: '世界历史', header: '## 8. 历史' },
  { key: 'map', label: '地图地理', header: '## 9. 地理' },
  { key: 'social', label: '社会结构', header: '## 5. 社会结构' },
];

export function parseWorldSections(markdown = '') {
  const sections = {};
  for (const s of WORLD_SECTIONS) {
    const re = new RegExp(`${s.header.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[\\s\\S]*?(?=\\n## |$)`);
    const m = markdown.match(re);
    sections[s.key] = m ? m[0].replace(s.header, '').trim() : '';
  }
  return sections;
}

export function extractSection(markdown, sectionKey) {
  const def = WORLD_SECTIONS.find((s) => s.key === sectionKey);
  if (!def) return markdown;
  const re = new RegExp(`(${def.header.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[\\s\\S]*?)(?=\\n## \\d|$)`);
  const m = markdown.match(re);
  return m ? m[1] : def.header + '\n' + (parseWorldSections(markdown)[sectionKey] || '');
}

export function mergeSection(markdown, sectionKey, newSectionContent) {
  const def = WORLD_SECTIONS.find((s) => s.key === sectionKey);
  if (!def) return markdown;
  const block = `${def.header}\n${newSectionContent.trim()}`;
  const re = new RegExp(`${def.header.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[\\s\\S]*?(?=\\n## \\d|$)`);
  if (re.test(markdown)) return markdown.replace(re, block);
  return `${markdown.trim()}\n\n${block}`;
}

function fallbackIncremental(current, suggestion, section) {
  if (!section) return `${current}\n\n<!-- 建议已记录: ${suggestion} -->`;
  const extra = `\n\n[增量补充 · ${suggestion}]`;
  if (section === 'map') return mergeSection(current, 'map', (parseWorldSections(current).map || '') + extra);
  if (WORLD_SECTIONS.some((s) => s.key === section)) {
    const body = (parseWorldSections(current)[section] || '') + extra;
    return mergeSection(current, section, body);
  }
  return current + extra;
}

export async function incrementalUpdate({
  module,
  current,
  suggestion,
  section,
  pitch,
  preset,
  title,
  storyDna,
  action = 'optimize',
}) {
  const storyBrief = buildStoryBrief({ pitch, title, storyDna });

  if (!current?.trim()) {
    const gen = await generateModule({ module, action: 'generate', pitch, preset, title, storyDna });
    return { markdown: gen.markdown || '', source: gen.source || 'generate', fields: gen.fields };
  }

  const focus = section
    ? extractSection(current, section)
    : current;

  let updated = null;
  if (isLlmConfigured()) {
    try {
      updated = await callIncrementalLlm(focus, suggestion || '优化并完善', section, storyBrief);
    } catch { /* fallback */ }
  }

  if (!updated) {
    updated = fallbackIncremental(current, suggestion, section);
  } else if (section && module === 'world') {
    const body = updated.replace(WORLD_SECTIONS.find((s) => s.key === section)?.header || '', '').trim();
    updated = mergeSection(current, section, body || updated);
  } else if (!section) {
    // full doc incremental — use LLM output as whole
  }

  return { markdown: updated, source: isLlmConfigured() ? 'llm_incremental' : 'preset_incremental' };
}

export async function incrementalUpdateAndSave(bookDir, moduleKey, {
  current,
  suggestion,
  section,
  pitch,
  preset,
  title,
  storyDna,
  fileName,
  action,
}) {
  const mod = moduleKey === 'chapter-task' ? 'chapter-task' : moduleKey;
  let baseContent = current;
  if (!baseContent?.trim()) {
    try {
      const existing = readModule(bookDir, mod, fileName);
      baseContent = existing.content || '';
    } catch { /* new */ }
  }

  if (baseContent?.trim()) {
    saveVersion(bookDir, mod, baseContent, { fileBase: fileName || '_single', label: '修改前快照', suggestion });
  }

  const result = await incrementalUpdate({
    module: mod,
    current: baseContent,
    suggestion,
    section,
    pitch,
    preset,
    title,
    storyDna,
    action,
  });

  if (fileName) {
    writeModule(bookDir, mod, { content: result.markdown }, fileName);
  } else {
    writeModule(bookDir, mod, { content: result.markdown });
  }

  const ver = saveVersion(bookDir, mod, result.markdown, {
    fileBase: fileName || '_single',
    label: suggestion?.slice(0, 40) || 'AI 增量更新',
    suggestion,
  });

  return { ...result, version: ver };
}

export function dimensionsToWritingMd(dimensions, title, sourcePreset) {
  const d = dimensions || {};
  const f = {
    title: title || sourcePreset || '自定义文风',
    stylePreset: sourcePreset || '自定义',
    narrative: d.narrative || `节奏:${d.rhythm || '慢热'}\n氛围:${d.atmosphere || '压抑'}`,
    prose: d.prose || `文笔:${d.proseStyle || '细腻'}\n战斗:${d.combat || '心理博弈'}`,
    rhythm: d.rhythm || '慢热',
    infoRelease: d.infoRelease || '渐进',
    pov: d.pov || '限知第三人称',
    taboo: d.taboo || '解释设定',
    wordCount: d.wordCount || '3000',
    dialogueRatio: d.dialogueRatio || '25%–40%',
    conflictRules: `爽点:${d.hook || '延迟爆发'}`,
    suspenseRules: d.suspense || '章末钩子',
    hookRules: d.hook || '延迟爆发',
    chapterStructure: d.chapterStructure || '起承转合',
  };
  return { fields: f, markdown: serializeWritingMd(f), dimensions: d };
}

export async function optimizeWritingDimensions(dimensions, suggestion, preset) {
  const current = JSON.stringify(dimensions, null, 2);
  let updated = null;
  if (isLlmConfigured()) {
    try {
      const raw = await callIncrementalLlm(
        current,
        suggestion,
        '文风维度',
      );
      const parsed = JSON.parse(raw.match(/\{[\s\S]*\}/)?.[0] || '{}');
      updated = { ...dimensions, ...parsed };
    } catch { /* fallback */ }
  }
  if (!updated) {
    updated = { ...dimensions };
    if (suggestion?.includes('快')) updated.rhythm = '快节奏';
    if (suggestion?.includes('黑暗') || suggestion?.includes('暗')) updated.atmosphere = '黑暗压抑';
    if (suggestion?.includes('对白') || suggestion?.includes('对话')) updated.dialogueRatio = '25%–35%';
    if (suggestion?.includes('环境')) updated.proseStyle = '环境描写丰富';
    if (suggestion?.includes('爽')) updated.hook = '克制爽点';
  }
  return updated;
}

export function presetToDimensions(presetId) {
  const p = getPreset(presetId);
  const dims = WRITING_DIMENSIONS[presetId] || WRITING_DIMENSIONS['暗夜君王'];
  return {
    ...dims,
    narrative: p.writing?.narrative,
    prose: p.writing?.prose,
    wordCount: p.writing?.wordCount,
    dialogueRatio: p.writing?.dialogueRatio,
    infoRelease: p.writing?.infoRelease,
    pov: p.writing?.pov,
    taboo: p.writing?.taboo,
  };
}

export async function cocreateFromPitch({ pitch, preset, title, storyDna }) {
  const [writing, world, characters, factions] = await Promise.all([
    generateModule({ module: 'writing', pitch, preset, title, storyDna, action: 'generate' }),
    generateModule({ module: 'world', pitch, preset, title, storyDna, action: 'generate' }),
    generateModule({ module: 'characters', pitch, preset, storyDna, action: 'generate' }),
    generateModule({ module: 'factions', pitch, preset, storyDna, action: 'generate' }),
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
    generateModule({ module: 'volume', pitch, preset, storyDna, action: 'generate', context: ctx }),
    generateModule({ module: 'chapter-task', pitch, preset, storyDna, action: 'generate', context: ctx }),
  ]);
  return {
    writing,
    world,
    characters,
    factions,
    volume,
    chapterTask,
    dimensions: presetToDimensions(preset),
  };
}
