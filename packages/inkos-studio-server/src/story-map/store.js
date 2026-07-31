/**
 * Story Map — Studio Server 脚手架 / 持久化
 * 读取与章上下文推导复用 Brain（避免依赖倒置）
 */
import fs from 'node:fs';
import path from 'node:path';
import { writeJson } from '../../../inkos-core/src/lib/paths.js';
import { writeYaml } from '../../../inkos-core/src/lib/yaml-store.js';
import {
  storyMapDir,
  hasStoryMap,
  loadStoryMap,
  loadMainArc,
  loadPovGrid,
  loadPlotThreads,
  loadMilestones,
  deriveChapterFunction,
  resolveChapterMapContext,
  buildChapterGoalFromMap,
  validatePovGrid,
  formatStoryMapAuthorNotes,
  planChapterWithMap,
  applyStoryMapToIntent,
} from '../../../inkos-brain/src/planner/story-map.js';

export {
  storyMapDir,
  hasStoryMap,
  loadStoryMap,
  loadMainArc,
  loadPovGrid,
  loadPlotThreads,
  loadMilestones,
  deriveChapterFunction,
  resolveChapterMapContext,
  buildChapterGoalFromMap,
  validatePovGrid,
  formatStoryMapAuthorNotes,
  planChapterWithMap,
  applyStoryMapToIntent,
};

function file(bookDir, name) {
  return path.join(storyMapDir(bookDir), name);
}

/**
 * 脚手架：从书名/主角/卷章数生成可用骨架（用户可再改）
 * 优化点：不全量手填 50 章；POV 只填前 12；章功能运行时推导
 */
export function scaffoldStoryMap({
  title = '未命名',
  totalChapters = 30,
  primaryPov = '主角',
  secondaryPov = '',
  openingHook = '',
  coreMystery = '',
  chapterTones = [],
  volumes = null,
} = {}) {
  const total = Math.max(10, Math.min(200, Number(totalChapters) || 30));
  const volPlan = volumes?.length ? volumes : defaultVolumes(total);

  const story_arc = {
    title,
    total_chapters: total,
    volumes: volPlan,
  };

  const pov_grid = [];
  for (let ch = 1; ch <= Math.min(12, total); ch += 1) {
    const tone = chapterTones.find((t) => Number(t.chapterIndex) === ch);
    let pov = primaryPov;
    let pov_type = 'primary';
    let why = '推进主线';
    if (ch === 2 && secondaryPov) {
      pov = secondaryPov;
      why = '引入第二视角，与主线形成信息差';
    }
    if (ch === 4 && secondaryPov) {
      pov = secondaryPov;
      pov_type = 'secondary';
      why = '支线揭秘：展示主角看不到的一面';
    }
    if (tone?.coreEvent) why = `基调事件：${String(tone.coreEvent).slice(0, 40)}`;
    pov_grid.push({
      chapter: ch,
      pov,
      pov_type,
      why_this_pov: why,
      information_level: 'limited',
      cliffhanger_type: ch === 1 ? 'discovery' : 'question',
    });
  }

  const plot_threads = [
    {
      id: 'main_core',
      name: coreMystery || openingHook || '核心悬念',
      type: 'main',
      status: 'active',
      chapters: [
        { ch: 1, event: openingHook || '异常出现', status: 'setup' },
        { ch: Math.min(3, total), event: '规则第一次冲击', status: 'inciting' },
        { ch: Math.min(Math.round(total * 0.3), total), event: '主动介入代价', status: 'midpoint' },
        { ch: Math.min(Math.round(total * 0.7), total), event: '完整形态/真相逼近', status: 'climax' },
        { ch: Math.max(total - 3, 1), event: '核心真相揭露', status: 'reveal' },
      ],
    },
  ];
  if (secondaryPov) {
    plot_threads.push({
      id: 'sub_bond',
      name: `${primaryPov}与${secondaryPov}`,
      type: 'main_emotional',
      status: 'active',
      chapters: [
        { ch: 2, event: `${secondaryPov}视角建立情感锚`, status: 'setup' },
        { ch: Math.min(Math.round(total * 0.25), total), event: '汇合但互相隐瞒', status: 'complication' },
      ],
    });
  }

  const milestones = [
    {
      id: 'm1',
      chapter: Math.min(5, total),
      event: '第一次不可逆代价（死亡/暴露/失去）',
      setup_chapters: [1, 2, 3, 4].filter((c) => c < Math.min(5, total)),
      must_have: [
        '主角确认异常可改写现实或等价规则',
        '外部压力开始追捕/封锁',
      ],
      emotional_requirement: '读者感到「爽但不安」',
      failure_if_missing: ['若该章仍未付出代价，主线动力不足'],
    },
    {
      id: 'm2',
      chapter: Math.min(Math.round(total * 0.3), total),
      event: '第一次主动使用核心能力并付出明确代价',
      setup_chapters: [],
      must_have: ['能力边界清晰', '代价可见'],
      emotional_requirement: '爽点落地同时埋下更大恐惧',
    },
  ];

  return { story_arc, pov_grid, plot_threads, milestones };
}

function defaultVolumes(total) {
  const q = Math.max(1, Math.floor(total / 4));
  return [
    {
      name: '觉醒',
      chapters: [1, q],
      arc_phase: 'setup',
      emotional_curve: '压抑→疑惑→恐惧',
      must_establish: ['世界异常规则', '主角身份与日常压力', '核心悬念第一次露面'],
    },
    {
      name: '裂隙',
      chapters: [q + 1, q * 2],
      arc_phase: 'confrontation',
      emotional_curve: '试探→信任→背叛→绝望',
      must_payoff: ['同盟或信息差建立', '第一次反击或失败'],
    },
    {
      name: '重构',
      chapters: [q * 2 + 1, q * 3],
      arc_phase: 'climax_build',
      emotional_curve: '愤怒→决绝→牺牲',
      must_establish: ['多方势力决战准备'],
    },
    {
      name: '归零',
      chapters: [q * 3 + 1, total],
      arc_phase: 'resolution',
      emotional_curve: '毁灭→新生→留白',
      must_payoff: ['最终真相', '世界代价与余韵'],
    },
  ];
}

export function saveStoryMap(bookDir, map = {}) {
  const dir = storyMapDir(bookDir);
  fs.mkdirSync(dir, { recursive: true });

  const story_arc = map.story_arc || map.mainArc || map.main_arc;
  const pov_grid = map.pov_grid || map.povGrid || [];
  const plot_threads = map.plot_threads || map.plotThreads || [];
  const milestones = map.milestones || [];

  if (story_arc) writeYaml(file(bookDir, 'main-arc.yaml'), { story_arc });
  writeYaml(file(bookDir, 'pov-grid.yaml'), { pov_grid });
  writeYaml(file(bookDir, 'plot-threads.yaml'), { plot_threads });
  writeYaml(file(bookDir, 'milestones.yaml'), { milestones });

  const chapter_functions = {};
  const total = Number(story_arc?.total_chapters) || 30;
  for (let ch = 1; ch <= total; ch += 1) {
    chapter_functions[ch] = deriveChapterFunction(ch, {
      story_arc,
      pov_grid,
      milestones,
      plot_threads,
    });
  }
  writeYaml(file(bookDir, 'chapter-functions.yaml'), { chapter_functions });

  writeJson(file(bookDir, 'index.json'), {
    version: 'story-map-1',
    savedAt: new Date().toISOString(),
    totalChapters: total,
    volumes: story_arc?.volumes?.length || 0,
    povEntries: pov_grid.length,
    threads: plot_threads.length,
    milestones: milestones.length,
  });

  return loadStoryMap(bookDir);
}

export function diagnoseStoryMapChapter(bookDir, chapterIdx, { actualPov = '', chapterText = '' } = {}) {
  const ctx = resolveChapterMapContext(bookDir, chapterIdx);
  if (!ctx) {
    return { enabled: false, reasons: ['本书未配置 Story Map'] };
  }
  const warnings = [];
  const hits = [];
  if (ctx.pov && actualPov && ctx.pov !== actualPov && actualPov !== '主角') {
    warnings.push(`POV 偏离地图：期望「${ctx.pov}」，实际「${actualPov}」`);
  } else if (ctx.pov) {
    hits.push(`POV 对齐：${ctx.pov}`);
  }
  if (ctx.chapterFunction === 'milestone' && chapterText) {
    const eventKey = String(ctx.milestone?.event || ctx.nextMilestone || '').slice(0, 4);
    if (eventKey && !chapterText.includes(eventKey)) {
      warnings.push(`里程碑章可能未兑现事件关键词（参考：${ctx.milestone?.event || ctx.nextMilestone}）`);
    } else if (eventKey) {
      hits.push('里程碑事件痕迹可见');
    }
  }
  for (const t of ctx.activeThreads || []) {
    hits.push(`情节线：${t.threadName}`);
  }
  const gridCheck = validatePovGrid(loadPovGrid(bookDir), {
    totalChapters: loadMainArc(bookDir)?.story_arc?.total_chapters,
  });
  return {
    enabled: true,
    chapterFunction: ctx.chapterFunction,
    arcPhase: ctx.arcPhase,
    distanceToMilestone: ctx.distanceToMilestone,
    hits,
    warnings: [...warnings, ...gridCheck.warnings.slice(0, 3)],
    errors: gridCheck.errors,
    context: ctx,
  };
}
