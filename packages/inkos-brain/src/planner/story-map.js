/**
 * Story Map — 长篇架构层（Brain 可读）
 *
 * 章节生成时注入：卷相位 / 章功能 / POV 调度 / 情节线 / 里程碑距离
 * chapter-functions 由里程碑距离推导，不必手填每章。
 */
import path from 'node:path';
import { exists } from '../../../inkos-core/src/lib/paths.js';
import { readYaml } from '../../../inkos-core/src/lib/yaml-store.js';

export function storyMapDir(bookDir) {
  return path.join(bookDir, 'novel', '_system', 'story-map');
}

function file(bookDir, name) {
  return path.join(storyMapDir(bookDir), name);
}

export function hasStoryMap(bookDir) {
  if (!bookDir) return false;
  return exists(file(bookDir, 'main-arc.yaml')) || exists(file(bookDir, 'index.json'));
}

export function loadMainArc(bookDir) {
  return readYaml(file(bookDir, 'main-arc.yaml')) || null;
}

export function loadPovGrid(bookDir) {
  const data = readYaml(file(bookDir, 'pov-grid.yaml'));
  return data?.pov_grid || data?.entries || [];
}

export function loadPlotThreads(bookDir) {
  const data = readYaml(file(bookDir, 'plot-threads.yaml'));
  return data?.plot_threads || data?.threads || [];
}

export function loadMilestones(bookDir) {
  const data = readYaml(file(bookDir, 'milestones.yaml'));
  return data?.milestones || [];
}

export function loadStoryMap(bookDir) {
  if (!hasStoryMap(bookDir)) return null;
  return {
    version: 'story-map-1',
    mainArc: loadMainArc(bookDir),
    povGrid: loadPovGrid(bookDir),
    plotThreads: loadPlotThreads(bookDir),
    milestones: loadMilestones(bookDir),
  };
}

export function deriveChapterFunction(chapterIdx, ctx = {}) {
  const ch = Number(chapterIdx);
  const arc = ctx.story_arc || ctx.mainArc?.story_arc || ctx.mainArc;
  const volumes = arc?.volumes || [];
  const currentArc = volumes.find((v) => {
    const [a, b] = v.chapters || [];
    return ch >= Number(a) && ch <= Number(b);
  }) || null;

  const pov = (ctx.pov_grid || ctx.povGrid || []).find((p) => Number(p.chapter) === ch) || null;
  const milestones = ctx.milestones || [];
  const nextMilestone = milestones
    .filter((m) => Number(m.chapter) >= ch)
    .sort((a, b) => Number(a.chapter) - Number(b.chapter))[0] || null;
  const distance = nextMilestone ? Number(nextMilestone.chapter) - ch : 999;

  let chapterFunction = 'development';
  // 里程碑优先于间章：关键剧情节点不能被暗线标签淹没
  if (nextMilestone && Number(nextMilestone.chapter) === ch) chapterFunction = 'milestone';
  else if (pov?.pov_type === 'interlude') chapterFunction = 'hidden_reveal';
  else if (distance <= 2) chapterFunction = 'setup_for_milestone';
  else if (currentArc?.arc_phase === 'setup' && ch <= (currentArc.chapters?.[0] || 1) + 2) {
    chapterFunction = 'setup';
  } else if (currentArc?.arc_phase === 'resolution') {
    chapterFunction = 'resolution';
  }

  return {
    chapter: ch,
    chapterFunction,
    arcPhase: currentArc?.arc_phase || 'unknown',
    volumeName: currentArc?.name || '',
    emotionalCurve: currentArc?.emotional_curve || '',
    distanceToMilestone: distance,
    nextMilestone: nextMilestone?.event || null,
    nextMilestoneChapter: nextMilestone ? Number(nextMilestone.chapter) : null,
    pov: pov?.pov || null,
    povType: pov?.pov_type || 'primary',
    whyThisPov: pov?.why_this_pov || '',
  };
}

export function resolveChapterMapContext(bookDir, chapterIdx) {
  const map = loadStoryMap(bookDir);
  if (!map?.mainArc) return null;

  const arc = map.mainArc.story_arc || map.mainArc;
  const ch = Number(chapterIdx);
  const func = deriveChapterFunction(ch, {
    story_arc: arc,
    pov_grid: map.povGrid,
    milestones: map.milestones,
    plot_threads: map.plotThreads,
  });

  const activeThreads = (map.plotThreads || [])
    .map((t) => {
      const hit = (t.chapters || []).find((c) => Number(c.ch) === ch);
      if (!hit) return null;
      return {
        threadId: t.id,
        threadName: t.name,
        threadType: t.type,
        threadStatus: t.status,
        thisChapterEvent: hit.event,
        eventStatus: hit.status,
      };
    })
    .filter(Boolean);

  const upcomingHidden = (map.plotThreads || [])
    .filter((t) => t.type === 'hidden' || t.status === 'hidden')
    .flatMap((t) => (t.chapters || [])
      .filter((c) => Number(c.ch) > ch)
      .map((c) => ({ thread: t.name, ch: c.ch, event: c.event, status: c.status })))
    .slice(0, 5);

  const vol = (arc.volumes || []).find((v) => ch >= v.chapters?.[0] && ch <= v.chapters?.[1]);
  const mustEstablish = vol?.must_establish || [];
  const mustPayoff = vol?.must_payoff || [];

  const milestone = (map.milestones || []).find((m) => Number(m.chapter) === ch) || null;
  const nextMs = (map.milestones || [])
    .filter((m) => Number(m.chapter) > ch)
    .sort((a, b) => Number(a.chapter) - Number(b.chapter))[0] || null;
  const nearMs = milestone || (nextMs && Number(nextMs.chapter) - ch <= 2 ? nextMs : null);

  return {
    ...func,
    activeThreads,
    upcomingHiddenReveals: upcomingHidden,
    mustEstablish,
    mustPayoff,
    milestoneMustHave: nearMs?.must_have || [],
    milestone,
    nextMilestoneFull: nextMs,
    informationLevel: map.povGrid.find((p) => Number(p.chapter) === ch)?.information_level || 'limited',
    cliffhangerType: map.povGrid.find((p) => Number(p.chapter) === ch)?.cliffhanger_type || null,
  };
}

export function buildChapterGoalFromMap(ctx) {
  if (!ctx) return '';
  const threadHint = ctx.activeThreads?.[0]?.threadName
    ? `推进「${ctx.activeThreads[0].threadName}」：${ctx.activeThreads[0].thisChapterEvent || '发展'}`
    : '';
  const goals = {
    setup: `建立世界观/关系，为后续转折铺垫${threadHint ? `；${threadHint}` : ''}`,
    development: threadHint || '推进主线，增加阻碍或信息',
    setup_for_milestone: `紧急铺垫：距里程碑「${ctx.nextMilestone}」仅 ${ctx.distanceToMilestone} 章，须完成前置`,
    milestone: `本章必须发生：${ctx.milestone?.event || ctx.nextMilestone}；情感冲击落在「${String(ctx.emotionalCurve || '').split('→').pop() || '高点'}」`,
    hidden_reveal: `通过${ctx.pov || '间章视角'}向读者透露角色尚不知道的信息（短章、埋暗线）`,
    resolution: '收束代价与余韵，兑现伏笔，留白而非解释完',
  };
  return goals[ctx.chapterFunction] || threadHint || '推进剧情';
}

export function validatePovGrid(povGrid = [], { totalChapters = 30 } = {}) {
  const warnings = [];
  const errors = [];
  const entries = [...povGrid].sort((a, b) => Number(a.chapter) - Number(b.chapter));
  if (!entries.length) {
    warnings.push('POV grid 为空：将回退到默认主角视角');
    return { ok: true, warnings, errors };
  }

  for (let i = 2; i < entries.length; i += 1) {
    const a = entries[i - 2];
    const b = entries[i - 1];
    const c = entries[i];
    if (a.pov && a.pov === b.pov && b.pov === c.pov
      && Number(b.chapter) === Number(a.chapter) + 1
      && Number(c.chapter) === Number(b.chapter) + 1) {
      warnings.push(`第${a.chapter}-${c.chapter}章连续 POV「${a.pov}」：视角疲劳，建议切换`);
    }
  }

  for (let i = 1; i < entries.length; i += 1) {
    if (entries[i].pov_type === 'interlude' && entries[i - 1].pov_type === 'interlude'
      && Number(entries[i].chapter) === Number(entries[i - 1].chapter) + 1) {
      errors.push(`第${entries[i - 1].chapter}-${entries[i].chapter}章连续 Interlude：暗线暴露过度`);
    }
  }

  const byPov = new Map();
  for (const e of entries) {
    if (!e.pov) continue;
    const list = byPov.get(e.pov) || [];
    list.push(Number(e.chapter));
    byPov.set(e.pov, list);
  }
  for (const [pov, chs] of byPov) {
    const sorted = [...chs].sort((a, b) => a - b);
    for (let i = 1; i < sorted.length; i += 1) {
      if (sorted[i] - sorted[i - 1] > 5) {
        warnings.push(`「${pov}」在第${sorted[i - 1]}章后隔了 ${sorted[i] - sorted[i - 1]} 章才再出场：可能被遗忘`);
      }
    }
    const last = sorted[sorted.length - 1];
    if (totalChapters - last > 8 && sorted.length === 1) {
      warnings.push(`「${pov}」仅在第${last}章出现过一次，长线存在感不足`);
    }
  }

  return { ok: errors.length === 0, warnings, errors };
}

/** Writer / intent 导航用：≤10 行；完整 must_have 由 Planner 消化进 Beat，不灌 Writer */
export function formatStoryMapAuthorNotes(ctx) {
  if (!ctx) return '';
  const lines = ['## 作者笔记（导航）'];
  if (ctx.volumeName || ctx.arcPhase) {
    lines.push(`- 卷：${ctx.volumeName || '—'}（${ctx.arcPhase || '—'}）`);
  }
  if (ctx.chapterFunction) {
    const delta = ctx.distanceToMilestone < 999
      ? ` · 距里程碑「${ctx.nextMilestone || '?'}」${ctx.distanceToMilestone}章`
      : '';
    lines.push(`- 章功能：${ctx.chapterFunction}${delta}`);
  }
  if (ctx.pov || ctx.whyThisPov) {
    lines.push(`- POV：${ctx.pov || '—'}${ctx.whyThisPov ? `（${String(ctx.whyThisPov).slice(0, 28)}）` : ''}`);
  }
  const thread = ctx.activeThreads?.[0];
  if (thread) {
    lines.push(`- 情节线：${thread.threadName} → ${thread.thisChapterEvent || '推进'}`);
  }
  if (ctx.milestoneMustHave?.[0]) {
    lines.push(`- 临近须完成：${String(ctx.milestoneMustHave[0]).slice(0, 36)}`);
  }
  if (ctx.upcomingHiddenReveals?.[0]) {
    const u = ctx.upcomingHiddenReveals[0];
    lines.push(`- 禁提前揭露：${String(u.event).slice(0, 28)}（第${u.ch}章）`);
  }
  if (ctx.emotionalCurve) {
    lines.push(`- 情绪参照：${String(ctx.emotionalCurve).slice(0, 40)}`);
  }
  return lines.slice(0, 11).join('\n');
}

/**
 * 将 Story Map 压入 intent（与 chapterTone 同级，不替代 Director Beat）
 */
export function applyStoryMapToIntent(intent = {}, bookDir, chapterIdx) {
  const ch = Number(chapterIdx || intent.chapter);
  if (!bookDir || !ch) return intent;

  const ctx = resolveChapterMapContext(bookDir, ch);
  if (!ctx) return intent;

  const mapGoal = buildChapterGoalFromMap(ctx);
  const next = { ...intent };

  // POV：地图优先于「主角」占位，但不覆盖已有明确 POV（除非地图指定）。
  // 注意：不要用 else 无条件覆盖 —— 已确认的具体章节计划（chapter_NNNN.yaml）里
  // 人工写明的 pov 是权威，地图只能填空，不能替作者改视角。
  if (ctx.pov && (!next.pov || next.pov === '主角')) {
    next.pov = ctx.pov;
  }

  // 章目标：仅当无具体目标（空 / 占位）时用地图目标；已确认的具体计划/章任务目标优先。
  // 里程碑/铺垫章的地图约束（milestoneMustHave / distanceToMilestone 等）仍写入 storyMap 供 Writer 读取。
  const hasSpecificGoal = Boolean(next.mainGoal)
    && next.mainGoal !== '推进当前现实目标'
    && next.mainGoal !== 'no_causal_basis'
    && !/待规划|规划中|^—$|placeholder/i.test(String(next.mainGoal));
  if (!hasSpecificGoal) {
    next.mainGoal = mapGoal;
    next.chapterIntent = `第${ch}章：${mapGoal}`;
  }

  if (ctx.emotionalCurve && !next.endingDirection) {
    const endFeel = String(ctx.emotionalCurve).split('→').pop();
    if (endFeel) next.ending = next.ending || `${endFeel}钩子`;
  }

  if (ctx.povType === 'interlude') {
    next.wordTarget = next.wordTarget || 2000;
  }

  next.storyMap = {
    chapterFunction: ctx.chapterFunction,
    arcPhase: ctx.arcPhase,
    volumeName: ctx.volumeName,
    emotionalCurve: ctx.emotionalCurve,
    distanceToMilestone: ctx.distanceToMilestone,
    nextMilestone: ctx.nextMilestone,
    povType: ctx.povType,
    whyThisPov: ctx.whyThisPov,
    informationLevel: ctx.informationLevel,
    activeThreads: ctx.activeThreads,
    mustEstablish: ctx.mustEstablish,
    milestoneMustHave: ctx.milestoneMustHave,
    upcomingHiddenReveals: ctx.upcomingHiddenReveals,
    authorNotes: formatStoryMapAuthorNotes(ctx),
  };

  const povCheck = validatePovGrid(loadPovGrid(bookDir), {
    totalChapters: loadMainArc(bookDir)?.story_arc?.total_chapters,
  });
  next.storyMap.povWarnings = povCheck.warnings.slice(0, 4);
  next.storyMap.povErrors = povCheck.errors;

  if (povCheck.warnings.length) {
    console.warn('[story-map] POV warnings:', povCheck.warnings.slice(0, 2).join(' | '));
  }
  if (povCheck.errors.length) {
    console.warn('[story-map] POV errors:', povCheck.errors.join(' | '));
  }
  console.log(
    `[story-map] ch${ch} · ${ctx.volumeName}/${ctx.arcPhase} · fn=${ctx.chapterFunction} · pov=${next.pov} · Δms=${ctx.distanceToMilestone}`,
  );

  return next;
}

/**
 * planChapterWithMap — 地图导航入口（供 Runtime / Studio 调用）
 */
export function planChapterWithMap(bookDir, chapterIdx, baseIntent = {}) {
  const ctx = resolveChapterMapContext(bookDir, chapterIdx);
  if (!ctx) {
    return {
      ready: false,
      reason: 'no_story_map',
      intent: baseIntent,
    };
  }
  const intent = applyStoryMapToIntent({ ...baseIntent, chapter: Number(chapterIdx) }, bookDir, chapterIdx);
  return {
    ready: true,
    chapter: Number(chapterIdx),
    mapContext: ctx,
    intent,
    authorNotes: intent.storyMap?.authorNotes || '',
  };
}
