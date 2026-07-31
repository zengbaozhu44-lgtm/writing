/**
 * State Updater — 构建 StateDiff / 应用 Canon（仅 MemoryUnit.commit 可调用物理写）
 */
import { getBookPaths } from '../../../inkos-core/src/lib/book.js';
import { readJson, writeJson, writeText } from '../../../inkos-core/src/lib/paths.js';
import { applyPostChapter } from '../../../inkos-core/src/workflows/post-chapter.js';

export function buildStateDelta(bookDir, chapter, { intent, chapterText, metrics, scenes, nextChapterPlan } = {}) {
  const ctx = intent || {};
  const wordCount = chapterText?.replace(/\s/g, '').length || metrics?.wordCount || 0;

  const delta = {
    timeline: {
      day: extractDay(ctx.time) || chapter,
      time: extractTime(ctx.time) || '00:00',
      events: scenes?.map((s) => s.goal).filter(Boolean) || [ctx.mainGoal],
      characters_present: [ctx.pov, ...(ctx.present || [])].filter(Boolean),
    },
    facts: [
      {
        fact: `第${chapter}章完成：${ctx.mainGoal || '推进主线'}（${wordCount}字）`,
        immutable: true,
      },
    ],
    current_state: buildCurrentStateTable(chapter, ctx, wordCount),
    reset_current_chapter: true,
  };

  if (ctx.newForeshadow) {
    delta.foreshadow = {
      add: [{
        title: String(ctx.newForeshadow).slice(0, 80),
        first_seen: `ch_${String(chapter).padStart(4, '0')}`,
        status: 'open',
      }],
    };
  }

  if (nextChapterPlan?.intent) {
    delta.next_chapter_task = nextChapterPlan.intent;
  }

  return delta;
}

/**
 * 仅由 MemoryUnit.commit 调用 —— 将 canonDelta 写入 novel 模块
 */
export function applyStateDiffToCanon(bookDir, chapter, canonDelta = {}) {
  const { next_chapter_task, ...postDelta } = canonDelta || {};
  const result = applyPostChapter(bookDir, chapter, postDelta);

  if (next_chapter_task) {
    writeNextChapterTask(bookDir, chapter + 1, next_chapter_task);
  }

  return { ...result, nextChapter: chapter + 1 };
}

export function writeNextChapterTask(bookDir, chapter, intent) {
  const bp = getBookPaths(bookDir);
  const lines = [
    '# 09 Current Chapter',
    '',
    '> 自动生成 — 下一章任务卡',
    '',
    `- **POV**：${intent.pov || ''}`,
    `- **目标**：${intent.mainGoal || ''}`,
    `- **第一阻碍**：${intent.obstacles?.[0] || ''}`,
    `- **第二阻碍**：${intent.obstacles?.[1] || ''}`,
    `- **博弈**：${intent.bargain || ''}`,
    `- **高潮**：${intent.turningPoint || ''}`,
    `- **代价**：${intent.mustLose || ''}`,
    `- **新增伏笔**：${intent.newForeshadow || ''}`,
    `- **结尾**：${intent.ending || ''}`,
    '',
  ];
  writeText(bp.modules.current_chapter, lines.join('\n'));
}

export function updateManifestChapter(bookDir, chapter) {
  const bp = getBookPaths(bookDir);
  const manifest = readJson(bp.manifest);
  manifest.lastAppliedChapter = chapter;
  manifest.updatedAt = new Date().toISOString();
  writeJson(bp.manifest, manifest);
}

/**
 * @deprecated 请使用 MemoryUnit.commit —— 保留兼容包装
 */
export function applyRuntimeStateUpdate(bookDir, chapter, payload) {
  console.warn('[state-updater] applyRuntimeStateUpdate 已弃用，请走 MemoryUnit.commit');
  const delta = buildStateDelta(bookDir, chapter, payload);
  return applyStateDiffToCanon(bookDir, chapter, delta);
}

function buildCurrentStateTable(chapter, intent, wordCount) {
  const rows = [
    ['字段', '值'],
    ['---', '---'],
    ['当前章节', String(chapter)],
    ['POV', intent.pov || '—'],
    ['任务', intent.ending?.includes('下一步') ? intent.ending : `待规划第${chapter + 1}章`],
    ['地点', intent.location || '—'],
    ['时间', intent.time || `Day ${chapter}`],
    ['本章字数', String(wordCount)],
    ['最后更新', new Date().toISOString()],
  ];
  return `# 08 Current State · 第 ${chapter} 章后\n\n${rows.map((r) => `| ${r[0]} | ${r[1]} |`).join('\n')}\n`;
}

function extractDay(timeStr) {
  if (!timeStr) return null;
  const m = String(timeStr).match(/Day\s*(\d+)/i);
  return m ? Number(m[1]) : null;
}

function extractTime(timeStr) {
  if (!timeStr) return null;
  const m = String(timeStr).match(/(\d{1,2}:\d{2})/);
  return m ? m[1] : null;
}
