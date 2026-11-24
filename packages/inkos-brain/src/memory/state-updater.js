/**
 * State Updater — 构建 StateDiff / 应用 Canon（仅 MemoryUnit.commit 可调用物理写）
 */
import { getBookPaths } from '../../../inkos-core/src/lib/book.js';
import { exists, readJson, readText, writeJson, writeText } from '../../../inkos-core/src/lib/paths.js';
import { applyPostChapter } from '../../../inkos-core/src/workflows/post-chapter.js';
import {
  isTemplateFallback,
  parseChapterTaskProvenance,
  stampChapterTaskProvenance,
} from '../authored/authored-input-sanitize.js';
import {
  resolveWorldEventDay,
  resolveStateTimeLabel,
} from '../../../inkos-core/src/lib/time-semantics.js';

/**
 * S6.1：Planner / Scene 骨架短语 —— 不得升级为 Canon timeline.events。
 * 「克服阻碍：…」「转折…」「章末钩子…」等是规划建议，不是已发生事实。
 */
const PLANNER_SKELETON_EVENT_RE =
  /^(克服阻碍|转折（本 Scene|章末钩子（|进入现场并确立危机|承接上章|推进阻碍|推进当前现实目标|必须失去|建立\s*POV)/u;

/**
 * 候选文本是否有资格成为 timeline 事件（已发生事实/后果）。
 * 宁缺勿滥：模板、no_causal_basis、Planner skeleton → false。
 */
export function isActualTimelineEvent(text = '') {
  const t = String(text || '').trim();
  if (!t) return false;
  if (isTemplateFallback(t)) return false;
  if (PLANNER_SKELETON_EVENT_RE.test(t)) return false;
  // 「克服阻碍：no_causal_basis」等：前缀已拦；再拒整句等于 B 类精确串的变体
  const afterColon = t.includes('：') || t.includes(':')
    ? t.replace(/^[^：:]+[：:]/, '').trim()
    : '';
  if (afterColon && isTemplateFallback(afterColon) && /^(克服|转折|章末|进入现场|承接|推进)/u.test(t)) {
    return false;
  }
  return true;
}

/**
 * S6.1 + EO-P2（D1 Dual BLOCK B）：
 * timeline.events 不得从 plan / modelled causalChain / scene plan fields 写入。
 *
 * EO-P2 切断（Audit W-01/W-02/W-03）：
 * - causalChain.consequence（planned/modelled）↛ 11
 * - scenes[].consequence / outcome / cost（plan/inference）↛ 11
 * - scene.goal / mainGoal 仍禁止（S6.1）
 *
 * 无 Authority Act 证明的「已发生后果」前：events=[]（空优于假历史）。
 * Persistence of empty day metadata ≠ Reality Status.
 *
 * @param {{ intent?: object, scenes?: object[], causalChain?: object|null }} opts
 * @returns {string[]}
 */
export function resolveTimelineEvents({ intent = {}, scenes = [], causalChain = null } = {}) {
  void intent;
  void scenes;
  void causalChain;
  // EO-P2: no plan/modelled/scene-plan path may register timeline events as occurred.
  return [];
}

export function buildStateDelta(bookDir, chapter, {
  intent,
  chapterText,
  metrics,
  scenes,
  nextChapterPlan,
  causalChain = null,
} = {}) {
  const ctx = intent || {};
  const wordCount = chapterText?.replace(/\s/g, '').length || metrics?.wordCount || 0;

  // F5: World Event Day — never `day || chapter`
  const worldDay = resolveWorldEventDay({
    time: ctx.time,
    currentDate: ctx.currentDate,
    chapter,
  });

  const delta = {
    timeline: {
      // F5: null = unknown World Event Day (chapter is only on appendTimeline via applyPostChapter)
      day: worldDay.day,
      time: extractTime(ctx.time) || extractTime(ctx.currentDate) || '00:00',
      // EO-P2 / S6.1：禁止 plan / modelled causal / scene.goal → Canon timeline
      events: resolveTimelineEvents({ intent: ctx, scenes, causalChain }),
      characters_present: [ctx.pov, ...(ctx.present || [])].filter(Boolean),
    },
    // EO-P2 (Audit W-01): stop L02 mainGoal → 13_facts Reality-like write
    facts: [],
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
  // EO-F-06：delta.timeline 通道与 engine 路径同规（S6.1 / EO-P2 契约执行）——
  // 仅具备 Actual 资格的事件可入 11_timeline；Plan/骨架/模板串一律滤除（宁缺勿滥）。
  // 本守卫是 runtime 生产咽喉（MemoryUnit ②c「Canon 仅由此口写入」）；
  // cli/brain-chapter 手动 legacy 通道为残留面，归 Time/State Authority Gate 管辖。
  if (postDelta.timeline && Array.isArray(postDelta.timeline.events)) {
    const before = postDelta.timeline.events.length;
    const kept = postDelta.timeline.events.filter((e) => isActualTimelineEvent(String(e ?? '')));
    if (kept.length !== before) {
      console.warn(`[canon] F-06 timeline guard: rejected ${before - kept.length} non-Actual delta.timeline event(s)`);
    }
    postDelta.timeline = { ...postDelta.timeline, events: kept };
  }
  const result = applyPostChapter(bookDir, chapter, postDelta);

  if (next_chapter_task) {
    writeNextChapterTask(bookDir, chapter + 1, next_chapter_task);
  }

  return { ...result, nextChapter: chapter + 1 };
}

/**
 * S3.4：系统写入下一章 09 任务卡，并打 generated provenance。
 * - 默认：若现有 09 已标记 authored，不覆盖（防把 authored 洗成 generated）
 * - options.force === true：强制覆盖
 * @returns {{ written: boolean, skipped?: boolean, path: string, provenance: object }}
 */
export function writeNextChapterTask(bookDir, chapter, intent, options = {}) {
  const bp = getBookPaths(bookDir);
  const target = bp.modules.current_chapter;

  if (exists(target) && options.force !== true) {
    try {
      const existing = readText(target) || '';
      const prev = parseChapterTaskProvenance(existing);
      if (prev.kind === 'authored') {
        return {
          written: false,
          skipped: true,
          path: target,
          provenance: prev,
          reason: 'authored_preserved',
        };
      }
    } catch { /* 读失败则继续写入 */ }
  }

  const raw = [
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
  ].join('\n');

  const stamped = stampChapterTaskProvenance(raw, {
    kind: 'generated',
    source: 'writeNextChapterTask',
  });
  writeText(target, stamped);
  return {
    written: true,
    path: target,
    provenance: { kind: 'generated', source: 'writeNextChapterTask' },
  };
}

/**
 * S3.4：authored 写入路径 — 保存 09 内容并标记 kind=authored。
 * 不经 writeNextChapterTask，避免被打成 generated。
 */
export function writeAuthoredChapterTask(bookDir, markdown, options = {}) {
  const bp = getBookPaths(bookDir);
  const target = bp.modules.current_chapter;
  const source = options.source || 'authored';
  const stamped = stampChapterTaskProvenance(String(markdown || ''), {
    kind: 'authored',
    source,
  });
  writeText(target, stamped);
  return {
    written: true,
    path: target,
    provenance: { kind: 'authored', source },
  };
}

/**
 * 生成前对齐 08_current_state.md 的「时间」字段（手术式单字段修补，保留其余行）。
 *
 * AUTHORIZED — 这是 current_state 的 Brain 侧写入入口：Studio 的 brain-context-sync
 * 不得再直接 writeText 该文件，必须经本函数（反向依赖收口：Runtime/Brain 不依赖 Studio）。
 * 与 buildCurrentStateTable 的职责划分：buildCurrentStateTable 走 MemoryUnit.commit 全量重建；
 * 本函数是仅动时间行的轻量预同步修补，避免用残缺输入（无 intent/wordCount）重建全表。
 */
export function patchCurrentStateTime(bookDir, dayStr, chapter = null) {
  const bp = getBookPaths(bookDir);
  const statePath = bp.modules?.current_state;
  if (!statePath) return { patched: false };

  let content = '';
  try {
    content = readText(statePath) || '';
  } catch { /* empty */ }

  if (!content.trim()) {
    content = [
      `# 08 Current State · 第 ${chapter ?? '—'} 章后`,
      '',
      '| 字段 | 值 |',
      '| --- | --- |',
      `| 时间 | ${dayStr} |`,
      '',
    ].join('\n');
  } else if (/\| 时间 \|/.test(content)) {
    const current = content.match(/\| 时间 \| ([^|]+) \|/)?.[1]?.trim();
    if (current === dayStr) return { patched: false, dayStr };
    content = content.replace(/\| 时间 \| [^|]+ \|/, `| 时间 | ${dayStr} |`);
  } else {
    content = `${content.trim()}\n| 时间 | ${dayStr} |\n`;
  }

  writeText(statePath, content);
  return { patched: true, dayStr };
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
    ['任务', intent.ending?.includes('下一步') ? intent.ending : '—'],
    ['地点', intent.location || '—'],
    // F5: never invent `Day ${chapter}` as Story Clock / World Day
    ['时间', resolveStateTimeLabel({ time: intent.time, currentDate: intent.currentDate, chapter })],
    ['本章字数', String(wordCount)],
    ['最后更新', new Date().toISOString()],
  ];
  return `# 08 Current State · 第 ${chapter} 章后\n\n${rows.map((r) => `| ${r[0]} | ${r[1]} |`).join('\n')}\n`;
}

function extractTime(timeStr) {
  if (!timeStr) return null;
  const m = String(timeStr).match(/(\d{1,2}:\d{2})/);
  return m ? m[1] : null;
}
