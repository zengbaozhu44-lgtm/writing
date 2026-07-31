/**
 * 生成前同步 Brain 可读上下文（Studio 层，不修改 Brain/Runtime）
 * 修复 POV 误解析（如「通过一次紧急」）→ Scene Consistency 失败
 */
import path from 'node:path';
import { getBookPaths } from '../../inkos-core/src/lib/book.js';
import { exists, readJson, writeJson, writeText } from '../../inkos-core/src/lib/paths.js';
import { readYaml } from '../../inkos-core/src/lib/yaml-store.js';
import { readModule, writeModule } from './module-service.js';
import { parseCharacterCard } from './canon-analyzer.js';
import { readChapterPlan } from './system-store.js';

const POV_INVALID = /一次|紧急|通过|展现|维修|任务|信息|系统|日常|博弈|女儿|机器人|维修工|外卖员|展现维修|停止|生成|章节|场景/;

export function listCanonCharacterNames(bookDir) {
  const names = new Set();
  try {
    const mod = readModule(bookDir, 'characters');
    const files = mod.files?.length ? mod.files : (mod.content ? [{ name: '_single.md' }] : []);
    for (const f of files) {
      const file = readModule(bookDir, 'characters', f.name);
      const card = parseCharacterCard(file.content || '', f.name);
      if (card.name) names.add(card.name);
    }
  } catch { /* ignore */ }
  return [...names];
}

export function resolveProtagonistName(bookDir) {
  try {
    const mod = readModule(bookDir, 'characters');
    const files = mod.files?.length ? mod.files : (mod.content ? [{ name: '_single.md' }] : []);
    let best = null;
    let bestScore = -1;

    for (const f of files) {
      const file = readModule(bookDir, 'characters', f.name);
      const card = parseCharacterCard(file.content || '', f.name);
      const score = card.role === '主角' ? 1000 : Number(card.importance) || 0;
      if (score > bestScore && card.name) {
        bestScore = score;
        best = card.name;
      }
    }
    return best;
  } catch {
    return null;
  }
}

export function isPlausiblePovName(name, bookDir = null) {
  if (!name || typeof name !== 'string') return false;
  const n = name.trim();
  if (n.length < 2 || n.length > 4) return false;
  if (POV_INVALID.test(n)) return false;
  if (bookDir) {
    const canon = listCanonCharacterNames(bookDir);
    if (canon.includes(n)) return true;
  }
  return /^[\u4e00-\u9fa5]{2,3}$/.test(n);
}

/** 从章节目标中提取叙事 POV（维修工林晓 / 外卖员张北 / Canon 人名） */
export function extractNarrativePovFromGoal(goal, bookDir = null) {
  if (!goal || typeof goal !== 'string') return null;

  const roleMatch = goal.match(
    /(?:维修工|外卖员|快递员|司机|少女|青年|老人|厨师|护士|医生|管理员)([\u4e00-\u9fa5]{2,3})(?=在|于|从|的|，|被|与|必须|手|将|已|需)/,
  );
  if (roleMatch?.[1] && isPlausiblePovName(roleMatch[1], bookDir)) {
    return roleMatch[1];
  }

  if (bookDir) {
    for (const name of listCanonCharacterNames(bookDir)) {
      if (goal.includes(name) && isPlausiblePovName(name, bookDir)) return name;
    }
  }

  const beforeYear = goal.match(/([\u4e00-\u9fa5]{2,3})(?:在|于)\d{4}/);
  if (beforeYear?.[1] && isPlausiblePovName(beforeYear[1], bookDir)) {
    return beforeYear[1];
  }

  return null;
}

export function resolveEffectiveChapterPov(bookDir, chapter = null) {
  const protagonist = resolveProtagonistName(bookDir);
  let goal = '';
  let taskPov = '';

  try {
    const mod = readModule(bookDir, 'chapter-task');
    const content = mod.content || '';
    goal = content.match(/\*\*目标\*\*[：:]\s*(.+)/)?.[1]?.trim() || '';
    taskPov = content.match(/\*\*POV\*\*[：:]\s*(.+)/)?.[1]?.trim() || '';
  } catch { /* ignore */ }

  if (chapter) {
    const plan = readChapterPlan(bookDir, chapter);
    if (plan?.goal && !goal) goal = plan.goal;
    const fromPlanGoal = extractNarrativePovFromGoal(plan?.goal || goal, bookDir);
    if (fromPlanGoal) {
      return { pov: fromPlanGoal, source: 'chapter-plan-goal', protagonist };
    }
    if (plan?.pov && isPlausiblePovName(plan.pov, bookDir)) {
      return { pov: plan.pov, source: 'chapter-plan', protagonist };
    }
  }

  const fromGoal = extractNarrativePovFromGoal(goal, bookDir);
  if (fromGoal) return { pov: fromGoal, source: 'narrative-goal', protagonist };

  if (isPlausiblePovName(taskPov, bookDir)) {
    return { pov: taskPov, source: 'chapter-task', protagonist };
  }

  return { pov: protagonist, source: 'protagonist', protagonist };
}

/** 读取 timeline 最后一日（用于一致性校验） */
export function getTimelineLastDay(bookDir) {
  try {
    const bp = getBookPaths(bookDir);
    const tlPath = bp.modules?.timeline;
    if (!tlPath || !exists(tlPath)) return 0;
    const tl = readYaml(tlPath);
    const days = Array.isArray(tl?.days) ? tl.days : [];
    if (!days.length) return Number(tl?.meta?.current_day) || 0;
    const last = days[days.length - 1];
    return Number(last?.day) || 0;
  } catch {
    return 0;
  }
}

/** 章节生成前应对齐的故事日（满足 last.day <= stateDay + 1） */
export function resolveStoryDayForChapterRun(chapter, lastTimelineDay = 0) {
  const fromChapter = Math.max(0, (Number(chapter) || 1) - 1);
  const minForTimeline = Math.max(0, lastTimelineDay - 1);
  return `Day ${Math.max(fromChapter, minForTimeline)}`;
}

/** 章节完成后故事日 */
export function resolveStoryDayAfterChapter(chapter) {
  return `Day ${Math.max(1, Number(chapter) || 1)}`;
}

function parseStateDay(dayStr) {
  const m = String(dayStr || '').match(/Day\s*(\d+)/i);
  return m ? Number(m[1]) : null;
}

/** 修补 08_current_state.md 的时间字段（Runtime 模块，Studio 预同步用） */
export function patchCurrentStateTime(bookDir, dayStr, chapter = null) {
  const bp = getBookPaths(bookDir);
  const statePath = bp.modules?.current_state;
  if (!statePath) return { patched: false };

  let content = '';
  try {
    content = readModule(bookDir, 'state').content || '';
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

/** 同步 Brain plan.json 中的 intent.time，避免 Planner 缓存 Day 0 */
export function syncPlanTimeForRun(bookDir, chapter, dayStr) {
  if (!dayStr || !chapter) return { patched: false };
  const planPath = path.join(bookDir, 'novel', '_system', 'brain', `ch_${String(chapter).padStart(4, '0')}_plan.json`);
  if (!exists(planPath)) return { patched: false };
  try {
    const plan = readJson(planPath);
    if (!plan?.intent) return { patched: false };
    const prev = plan.intent.time;
    const prevDay = parseStateDay(prev);
    const targetDay = parseStateDay(dayStr);
    const needsPatch = prev !== dayStr
      || (prevDay != null && targetDay != null && prevDay < targetDay);

    if (!needsPatch) return { patched: false, time: dayStr };

    plan.intent.time = dayStr;
    writeJson(planPath, plan);
    return { patched: true, time: dayStr, previousTime: prev };
  } catch {
    return { patched: false };
  }
}

/** 生成前同步故事日与 timeline / current_state 对齐 */
export function syncStoryDayForRun(bookDir, chapter) {
  const lastDay = getTimelineLastDay(bookDir);
  const dayStr = resolveStoryDayForChapterRun(chapter, lastDay);
  const statePatch = patchCurrentStateTime(bookDir, dayStr, chapter);
  const planSync = syncPlanTimeForRun(bookDir, chapter, dayStr);
  return {
    dayStr,
    lastTimelineDay: lastDay,
    patched: statePatch.patched || planSync.patched,
    statePatch,
    planSync,
  };
}

/** 章节完成后将 current_state 推进到本章故事日 */
export function syncStoryDayAfterChapter(bookDir, chapter) {
  const dayStr = resolveStoryDayAfterChapter(chapter);
  return patchCurrentStateTime(bookDir, dayStr, chapter);
}

/** 同步 Brain plan.json 中的 intent.pov，避免 Planner 缓存错误 POV */
export function syncPlanPovForRun(bookDir, chapter, pov) {
  if (!pov || !chapter || !isPlausiblePovName(pov, bookDir)) return { patched: false };
  const planPath = path.join(bookDir, 'novel', '_system', 'brain', `ch_${String(chapter).padStart(4, '0')}_plan.json`);
  if (!exists(planPath)) return { patched: false };
  try {
    const plan = readJson(planPath);
    if (!plan?.intent) return { patched: false };
    const prev = plan.intent.pov;
    const needsPatch = prev !== pov
      || !isPlausiblePovName(prev, bookDir)
      || plan.intent.scenes?.some((s) => s.entities?.some((e) => !isPlausiblePovName(e, bookDir)));

    if (!needsPatch) return { patched: false, pov };

    plan.intent.pov = pov;
    if (Array.isArray(plan.intent.scenes)) {
      for (const scene of plan.intent.scenes) {
        if (scene.goal) {
          scene.goal = scene.goal.replace(/建立 POV（[^）]+）/, `建立 POV（${pov}）`);
        }
        scene.entities = [pov, ...(scene.entities || []).filter((e) => e && e !== prev && e !== pov && isPlausiblePovName(e, bookDir))];
        if (!scene.entities.includes(pov)) scene.entities = [pov];
      }
    }
    if (Array.isArray(plan.decisionResult?.decisions)) {
      for (const d of plan.decisionResult.decisions) {
        if (d.actor && !isPlausiblePovName(d.actor, bookDir)) d.actor = pov;
      }
    }
    writeJson(planPath, plan);
    return { patched: true, pov, previousPov: prev };
  } catch {
    return { patched: false };
  }
}

/** 将 chapter-task / plan 的 POV 对齐本章有效叙事视角 */
export function normalizeBrainContextForRun(bookDir, chapter = null) {
  const { pov, source, protagonist } = resolveEffectiveChapterPov(bookDir, chapter);
  if (!pov || !isPlausiblePovName(pov, bookDir)) {
    return { protagonist, patched: false, error: '无法解析有效 POV' };
  }

  let chapterTaskPatched = false;
  let previousPov = null;
  try {
    const mod = readModule(bookDir, 'chapter-task');
    let content = mod.content || '';
    const povRe = /\*\*POV\*\*[：:]\s*(.+)/;
    const currentPov = content.match(povRe)?.[1]?.trim();
    if (currentPov !== pov || !isPlausiblePovName(currentPov, bookDir)) {
      previousPov = currentPov;
      if (povRe.test(content)) {
        content = content.replace(povRe, `**POV**：${pov}`);
      } else {
        const insertAt = content.indexOf('- **目标**');
        const line = `- **POV**：${pov}\n`;
        content = insertAt >= 0
          ? `${content.slice(0, insertAt)}${line}${content.slice(insertAt)}`
          : `${content.trim()}\n${line}`;
      }
      writeModule(bookDir, 'chapter-task', { content });
      chapterTaskPatched = true;
    }
  } catch { /* ignore */ }

  const planSync = chapter ? syncPlanPovForRun(bookDir, chapter, pov) : { patched: false };
  const daySync = chapter ? syncStoryDayForRun(bookDir, chapter) : { patched: false };
  return {
    protagonist,
    pov,
    source,
    patched: chapterTaskPatched || planSync.patched || daySync.patched,
    previousPov,
    planSync,
    daySync,
  };
}
