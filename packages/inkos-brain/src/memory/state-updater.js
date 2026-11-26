/**
 * State Updater — 构建 StateDiff / 应用 Canon（仅 MemoryUnit.commit 可调用物理写）
 */
import path from 'node:path';
import { getBookPaths } from '../../../inkos-core/src/lib/book.js';
import { exists, readJson, readText, writeJson, writeText, chapterNextTaskPath } from '../../../inkos-core/src/lib/paths.js';
import { readYaml } from '../../../inkos-core/src/lib/yaml-store.js';
import { applyPostChapter } from '../../../inkos-core/src/workflows/post-chapter.js';
import {
  isTemplateFallback,
  parseChapterTaskProvenance,
  stampChapterTaskProvenance,
} from '../authored/authored-input-sanitize.js';
// re-export：memory-unit 等下游共用同一占位符判定（单一真源）
export { isTemplateFallback };
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

  // 保守兜底（Q-S1-c 正式实现前的过渡）：World Event Day 仍 unknown 时，
  // 若 11_timeline 已有已知 day 则按 prev+1 推进，避免 Day 永远冻在初值。
  // 来源仅限时间线自身，仍不触 F5 的 chapter N → day N 禁令；
  // 同章 rerun 复用本章已写入的 day（兜底须幂等，rerun 不推进 Day）。
  let finalDay = worldDay.day;
  if (finalDay == null) {
    try {
      const tl = readYaml(getBookPaths(bookDir).modules?.timeline);
      const days = Array.isArray(tl?.days) ? tl.days : [];
      const own = days.find((d) => d && d.chapter === chapter && typeof d.day === 'number');
      if (own != null) {
        finalDay = own.day;
      } else {
        let prevDay = null;
        for (const d of days) {
          if (d && d.chapter !== chapter && typeof d.day === 'number' && d.day > prevDay) prevDay = d.day;
        }
        if (prevDay == null) {
          const metaDay = tl?.meta?.current_day;
          if (typeof metaDay === 'number' && Number.isFinite(metaDay)) prevDay = metaDay;
        }
        if (prevDay != null) finalDay = prevDay + 1;
      }
    } catch { /* 兜底失败保持 unknown */ }
  }

  const delta = {
    timeline: {
      // F5: null = unknown World Event Day (chapter is only on appendTimeline via applyPostChapter)
      day: finalDay,
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
    // B 回声切断：下一章任务不得复印本章 intent（已支付代价/已完成的交割动作会被逐章重演）
    delta.next_chapter_task = deriveNextChapterIntent(
      nextChapterPlan.intent,
      null,
      { nextChapter: chapter + 1 },
    );
  }

  return delta;
}

/**
 * B 回声切断：从本章 intent 派生「下一章」任务意图。
 *
 * 原则：
 * 1) 完结章的 mustLose 按定义已支付（Validation 靠它通过 character_advanced），
 *    无条件不再作为下一章任务下发——携带即回声。
 * 2) 目标/阻碍/高潮/博弈中与已支付代价关联的内容字段一并剥离，
 *    目标改由 前瞻信号（ending / newForeshadow / anchor recent_actuals）派生。
 */
export function deriveNextChapterIntent(finishedIntent = {}, priorAnchor = null, options = {}) {
  const intent = { ...(finishedIntent || {}) };
  const chapter = Number(options.nextChapter || (Number(intent.chapter) || 0) + 1);

  const mustLose = String(intent.mustLose || intent['代价'] || '').trim();
  const mainGoal = String(intent.mainGoal || intent['目标'] || '').trim();
  const ending = String(intent.ending || '').trim();
  const foreshadow = String(intent.newForeshadow || '').trim();

  const costKeywords = extractCostKeywords(mustLose, intent.pov);
  const echoesCost = (text) => costKeywords.some((k) => String(text || '').includes(k));
  const goalCorpus = [mainGoal, intent.turningPoint, intent.bargain, ...(intent.obstacles || [])];
  const goalLooksLikeCompletedCost = Boolean(mustLose && goalCorpus.some(echoesCost));

  let nextGoal = mainGoal;
  // 裸跑（无 authored plan / task card）时 mainGoal/ending/foreshadow 可能是
  // no_causal_basis 等模板占位符——原样下发会把占位符传播进
  // states/ch_N.json、nextChapterPlan 与章节文件名（0002_no_causa.md）。
  // 占位符不构成因果目标，一律回退到通用前瞻句（宁缺勿滥，与 C3 口径一致）。
  if (isTemplateFallback(mainGoal)) {
    nextGoal = pickForwardGoal(ending, foreshadow, priorAnchor)
      || '承接上一章结果，推进未解决线索';
  } else if (goalLooksLikeCompletedCost || isMoodOnly(mainGoal, priorAnchor)) {
    // 前者：目标关联已支付代价；后者：目标是纯氛围句（无追查对象，会原地踏步）
    nextGoal = pickForwardGoal(ending, foreshadow, priorAnchor)
      || '承接上一章结果，推进未解决线索';
  }

  const obstacles = (intent.obstacles || [])
    .map((o) => String(o || '').trim())
    .filter(Boolean)
    .filter((o) => !echoesCost(o))
    // 占位符阻碍（no_causal_basis 等）不下发
    .filter((o) => !isTemplateFallback(o));

  // 旧 scenes 是本章已执行完的骨架（goal/conflict 可能嵌占位符，anchorBanNote 带本章禁令），
  // 原样下发会让下一章从本章场景骨架续写。这里整组丢弃：下一章 scenes 由其自身
  // planNextChapter → deriveScenes 重建（planNextChapter 兜底路径会重派生）。
  const { scenes: _staleScenes, anchorBanNote: _staleBan, ...intentRest } = intent;

  return {
    ...intentRest,
    chapter,
    mainGoal: nextGoal,
    chapterIntent: `第${chapter}章：${nextGoal}`,
    // 占位符结尾/结尾方向不下发（下一章由自身规划/前瞻供料重建）
    ending: isTemplateFallback(intent.ending) ? '' : String(intent.ending || '').trim(),
    endingDirection: isTemplateFallback(intent.endingDirection) ? '' : intent.endingDirection,
    // 已支付代价一律不下发（下一章的代价由其自身规划/作者设立）
    mustLose: '',
    // 占位符转折同样不下发
    turningPoint: isTemplateFallback(intent.turningPoint) ? '' : (echoesCost(intent.turningPoint) ? '' : intent.turningPoint),
    bargain: echoesCost(intent.bargain) ? '' : intent.bargain,
    obstacles: obstacles.length ? obstacles : ['阻力来自上一章后果的延续'],
    _derivedFrom: 'deriveNextChapterIntent',
    _completedCostStripped: goalLooksLikeCompletedCost,
  };
}

const COST_STOPWORDS = new Set(['失去', '独自', '掌控', '安全', '获得', '感受', '感觉', '代价', '必须', '已经', '无法']);

/**
 * 从已支付代价中提取内容关键词（2 字滑窗，滤通用词与 POV 名）。
 * 例：「苏晚失去独自掌控配电间钥匙的安全感」→ [配电, 电间, 间钥, 钥匙, …]
 */
function extractCostKeywords(mustLose, pov = '') {
  const t = String(mustLose || '').replace(/\s/g, '');
  if (!t) return [];
  const keys = new Set();
  for (let i = 0; i + 2 <= t.length; i += 1) {
    const w = t.slice(i, i + 2);
    if (COST_STOPWORDS.has(w)) continue;
    if (pov && pov.includes(w)) continue;
    keys.add(w);
  }
  return [...keys];
}

function pickForwardGoal(ending, foreshadow, priorAnchor) {
  // 0) 占位符输入不构成前瞻信号（no_causal_basis 等模板串曾从 ending 漏进 nextGoal）
  const endingText = isTemplateFallback(String(ending || '')) ? '' : String(ending || '').trim();
  const fsText = isTemplateFallback(String(foreshadow || '')) ? '' : String(foreshadow || '').trim();

  // 1) 台账未关闭承诺（键化硬事实）优先——不用词表猜测
  const open = (priorAnchor?.state_ledger?.open_promises || [])
    .filter((p) => p?.status === 'open');
  if (open.length) return `追查：${String(open[0].claim).slice(0, 36)}`;

  // 2) 新增伏笔
  if (fsText && fsText.length >= 4) return `追查：${fsText.slice(0, 30)}`;

  // 3) ending（非纯氛围句）
  if (endingText && endingText.length >= 8 && !isMoodOnly(endingText, priorAnchor)) {
    return endingText.slice(0, 40);
  }

  // 4) 兜底
  if (endingText) return `承接：${endingText.slice(0, 30)}`;
  return '';
}

/**
 * 纯氛围句判定（通用，无词表）：感官标记 + 无未闭合信息信号
 * （台账物名 / 冒号 / 问号）。氛围句没有可执行对象，不当目标。
 */
function isMoodOnly(s = '', priorAnchor = null) {
  const t = String(s || '');
  const sensory = /(独自|站在|听到|滴了一声|灯|潮|冷|沉默|望着|听着)/.test(t);
  if (!sensory) return false;
  const ledgerNames = (priorAnchor?.state_ledger?.items || [])
    .map((i) => String(i?.name || ''))
    .filter(Boolean);
  if (ledgerNames.some((n) => t.includes(n))) return false;
  if (/[：？?]/.test(t)) return false;
  return true;
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
    // B 回声切断：写卡前强制派生（完结章 anchor 已于 ②b 落盘，可为前瞻目标供料）
    let finishedAnchor = null;
    try {
      finishedAnchor = readYaml(
        path.join(bookDir, 'states', `ch_${String(chapter).padStart(4, '0')}_anchor.yaml`),
      );
    } catch { /* anchor 缺失则无前瞻供料，不阻断 */ }
    writeNextChapterTask(bookDir, chapter + 1, deriveNextChapterIntent(
      next_chapter_task,
      finishedAnchor,
      { nextChapter: chapter + 1 },
    ));
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
  // B 按章任务卡：states/ch_XXXX_next_task.md 为权威；09_current_chapter.md 仅前沿镜像
  const target = chapterNextTaskPath(bookDir, chapter);
  const mirror = bp.modules.current_chapter;

  // 指针只前进：卡目标章落后于当前进度时，禁止用旧章 rerun 的产物覆盖既有按章卡
  let lastApplied = 0;
  try {
    lastApplied = Number(readJson(bp.manifest)?.lastAppliedChapter || 0);
    if (Number(chapter) <= lastApplied) {
      return { written: false, skipped: true, path: target, reason: 'behind_progress_frontier' };
    }
  } catch { /* manifest 读失败不阻断 */ }

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
    `# Next Chapter Task · 第 ${chapter} 章`,
    '',
    '> 自动生成 — 下一章任务卡',
    '',
    `- **章节**：${chapter}`,
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

  // 前沿镜像：仅 chapter === lastApplied+1 时同步 09（authored 09 不覆盖）
  let mirrored = false;
  if (Number(chapter) === lastApplied + 1) {
    let mirrorAuthored = false;
    try {
      if (exists(mirror)) {
        mirrorAuthored = parseChapterTaskProvenance(readText(mirror) || '')?.kind === 'authored';
      }
    } catch { /* 读失败视为可镜像 */ }
    if (!mirrorAuthored) {
      writeText(mirror, stamped);
      mirrored = true;
    }
  }

  return {
    written: true,
    path: target,
    mirrored,
    mirrorPath: mirrored ? mirror : null,
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
  // 指针只前进：旧章 rerun 不回卷 lastAppliedChapter（与 applyPostChapter 同规）
  if (Number(chapter) < Number(manifest?.lastAppliedChapter || 0)) {
    return { skipped: true, reason: 'old_chapter_rerun' };
  }
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
