/**
 * Brain Memory — Decision / Scene / Conflict 历史
 */
import fs from 'node:fs';
import path from 'node:path';
import { writeJson, exists, readJson } from '../../../inkos-core/src/lib/paths.js';
import { brainSystemDir } from '../loader.js';

export function ensureBrainDir(bookDir) {
  const dir = brainSystemDir(bookDir);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

const PLAN_TEMPLATE_MARKERS = [
  '资源不足或时间压力',
  '信息不完整',
  '关键抉择导致不可逆变化',
  '发现型钩子',
  '时间或身体代价',
  '推进当前现实目标',
  // D2：缺因果依据标记（Plan 层的 no_causal_basis 兜底）同样视为模板/失忆态产物
  'no_causal_basis',
];

/**
 * 判定 intent 是否为 Planner 模板兜底（空 chapterTask 时的派生物）
 * 若为真，说明该 plan 是「失忆态」产物，可被新派生 plan 覆盖；
 * 若为假，说明是 Studio 人工/导演确认的具体计划，禁止被派生 plan 覆盖。
 *
 * 判别核心：模板计划的关键字段（turningPoint/ending/mustLose）全是模板词，
 * 且场景 goal 全是骨架短语；具体计划则至少有一个关键字段是实质内容。
 */
export function isTemplateFallbackIntent(intent = null) {
  if (!intent || typeof intent !== 'object') return true;

  const isTemplateWord = (s) => PLAN_TEMPLATE_MARKERS.includes(String(s || '').trim());
  const turnTemplate = isTemplateWord(intent.turningPoint);
  const endingTemplate = isTemplateWord(intent.ending);
  const mustLoseTemplate = isTemplateWord(intent.mustLose);
  const obstacleTemplate = (intent.obstacles || []).length > 0
    && (intent.obstacles || []).every((o) => isTemplateWord(o));

  // 场景 goal 全是骨架短语（无实质事件）
  const sceneGoalsTemplate = (intent.scenes || []).length > 0
    && (intent.scenes || []).every((s) => /进入现场并确立危机|克服阻碍：|转折（本 Scene|章末钩子（|承接.*进入局面|推进阻碍：/.test(String(s?.goal || '')));

  // 模板计划：turn/ending/mustLose 全部模板 且（阻碍模板 或 场景骨架）
  return Boolean(
    turnTemplate
    && endingTemplate
    && mustLoseTemplate
    && (obstacleTemplate || sceneGoalsTemplate),
  );
}

/** 派生计划不覆盖已存在的具体计划（chapter_XXXX_plan.json 由人工/导演确认） */
export function saveChapterPlan(bookDir, chapter, payload) {
  const dir = ensureBrainDir(bookDir);
  const file = path.join(dir, `ch_${String(chapter).padStart(4, '0')}_plan.json`);

  // 已存在具体计划 + 新计划是模板兜底 → 保留旧的具体计划
  if (exists(file)) {
    try {
      const existing = readJson(file);
      const existingSpecific = existing?.intent && !isTemplateFallbackIntent(existing.intent);
      const incomingTemplate = isTemplateFallbackIntent(payload?.intent);
      if (existingSpecific && incomingTemplate) {
        console.warn(
          `[memory.saveChapterPlan] ch${chapter} 已有具体计划，跳过模板兜底覆盖（保留导演/人工计划）`,
        );
        return file;
      }
    } catch { /* 读坏则照写 */ }
  }

  writeJson(file, payload);
  return file;
}

export function saveSceneArtifacts(bookDir, chapter, scenes) {
  const dir = ensureBrainDir(bookDir);
  const file = path.join(dir, `ch_${String(chapter).padStart(4, '0')}_scenes.json`);
  writeJson(file, { chapter, scenes, updatedAt: new Date().toISOString() });
  return file;
}

export function saveBrainRun(bookDir, chapter, run) {
  const dir = ensureBrainDir(bookDir);
  const file = path.join(dir, `ch_${String(chapter).padStart(4, '0')}_run.json`);
  writeJson(file, run);
  return file;
}
