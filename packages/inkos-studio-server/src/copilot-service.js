/**
 * Novel Copilot 2.0 — 自然语言 + AI 生成
 */
import { writeModule } from './module-service.js';
import { getBookMeta } from './book-service.js';
import { generateModule } from './ai-service.js';

const RULES = [
  { pattern: /冲突.*弱|加强.*冲突|商业.*爽|节奏.*慢/, action: 'replan' },
  { pattern: /重新规划|重规划|replan/i, action: 'replan' },
  { pattern: /继续|resume|断点/i, action: 'resume' },
  { pattern: /下一章|生成下一章|开始创作/, action: 'next' },
  { pattern: /^开始|^运行/, action: 'run' },
  { pattern: /暂停|停止.*daemon/i, action: 'daemon_stop' },
  { pattern: /启动.*daemon|守护/i, action: 'daemon_start' },
  { pattern: /生成.*世界|世界设定/, action: 'ai_world' },
  { pattern: /生成.*人物|增加.*NPC|创建.*角色|三个.*调查员/, action: 'ai_characters' },
  { pattern: /生成.*势力|调查局.*设定|Faction/i, action: 'ai_factions' },
  { pattern: /章节目标|生成.*章/, action: 'ai_chapter' },
  { pattern: /人物.*平|资源冲突/, action: 'patch_chapter', fields: { 博弈: '增加资源冲突与人物博弈' } },
];

export function parseCopilotIntent(message, bookDir) {
  const text = String(message || '').trim();
  const meta = getBookMeta(bookDir);
  const chapter = (meta.currentChapter || 0) + 1;

  for (const rule of RULES) {
    if (rule.pattern.test(text)) {
      return { action: rule.action, chapter, message: text, fields: rule.fields || null };
    }
  }
  return { action: 'ai_chat', chapter, message: text };
}

export async function executeCopilotAction(bookDir, intent) {
  const { action, chapter, fields, message } = intent;
  const meta = getBookMeta(bookDir);

  if (action === 'ai_world') {
    const result = await generateModule({ module: 'world', action: 'generate', pitch: message, title: meta.title });
    writeModule(bookDir, 'world', { content: result.markdown });
    return { done: true, action, result: { module: 'world', source: result.source } };
  }

  if (action === 'ai_characters') {
    const result = await generateModule({ module: 'characters', action: 'generate', pitch: message });
    for (const c of result.characters || []) {
      const name = c.fields?.name || '新角色';
      writeModule(bookDir, 'characters', { content: c.markdown }, `${name}.md`);
    }
    return { done: true, action, created: (result.characters || []).length };
  }

  if (action === 'ai_factions') {
    const result = await generateModule({ module: 'factions', action: 'generate', pitch: message });
    for (const f of result.factions || []) {
      writeModule(bookDir, 'factions', { content: f.markdown }, `${f.name}.md`);
    }
    return { done: true, action, created: (result.factions || []).length };
  }

  if (action === 'ai_chapter') {
    const result = await generateModule({ module: 'chapter-task', action: 'generate', pitch: message });
    writeModule(bookDir, 'chapter-task', { content: result.markdown });
    return { done: true, action, result: { module: 'chapter-task' } };
  }

  if (action === 'ai_chat') {
    const result = await generateModule({ module: 'chapter-task', action: 'generate', pitch: message });
    return { done: true, action: 'ai_chat', reply: `已理解：${message}。建议执行「开始创作」或更具体的指令如「生成调查局势力」。`, hint: result };
  }

  if (action === 'patch_chapter' && fields) {
    const content = ['# 09 Current Chapter', '', '> Copilot', '',
      ...Object.entries(fields).map(([k, v]) => `- **${k}**：${v}`)].join('\n');
    writeModule(bookDir, 'chapter-task', { content });
    return { done: true, action, patched: fields };
  }

  if (action === 'replan') return { done: true, delegate: 'replan', chapter };
  if (action === 'resume') return { done: true, delegate: 'resume', chapter };
  if (action === 'next') return { done: true, delegate: 'next' };
  if (action === 'run') return { done: true, delegate: 'run', chapter };
  if (action === 'daemon_start') return { done: true, delegate: 'daemon_start' };
  if (action === 'daemon_stop') return { done: true, delegate: 'daemon_stop' };

  return { done: false, intent };
}
