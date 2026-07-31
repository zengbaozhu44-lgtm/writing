/**
 * Cost Controls — V2 轻量校验模式 / Optimizer 条件触发 / AB 每 5 章
 */
import { loadInkOsConfig } from '../../../inkos-core/src/lib/config.js';

export const OPTIMIZER_HOOK_FLOOR = 7;
export const AB_TEST_INTERVAL = 5;

/** 轻量模型：用于 rewrite / 次要校验路径，默认 deepseek-chat 的轻量别名或配置覆盖 */
export function resolveLightModel(config = null) {
  const cfg = config || loadInkOsConfig();
  return process.env.INKOS_LLM_LIGHT_MODEL
    || cfg.llm?.lightModel
    || process.env.INKOS_LLM_VALIDATOR_MODEL
    || cfg.llm?.validatorModel
    || cfg.llm?.model
    || 'deepseek-chat';
}

/**
 * V2 校验模式：
 * - full：完整规则
 * - light：跳过昂贵子项（语言变化 / 段落目的），保留格式·重复·状态变化
 */
export function resolveV2ValidationMode({
  rewriteAttempt = 0,
  forceFull = false,
} = {}) {
  if (forceFull || process.env.INKOS_V2_FULL === '1') return 'full';
  // 首轮轻量；重写后升级 full
  if (rewriteAttempt > 0) return 'full';
  const cfg = loadInkOsConfig();
  return cfg.runtime?.v2ValidationMode || process.env.INKOS_V2_MODE || 'light';
}

/** Reader Sim hookScore < 7 才触发 Optimizer */
export function shouldTriggerOptimizer(readerSim = {}, { floor = OPTIMIZER_HOOK_FLOOR } = {}) {
  if (!readerSim || readerSim.error === 'empty-text') return true;
  const score = Number(readerSim.hookScore);
  if (!Number.isFinite(score)) return Boolean(readerSim.softFail);
  return score < floor || (Array.isArray(readerSim.dragSections) && readerSim.dragSections.length > 2);
}

/** 每 5 章跑一次 AB */
export function shouldRunAbTest(chapter, { interval = AB_TEST_INTERVAL, force = false } = {}) {
  if (force) return true;
  const ch = Number(chapter) || 0;
  if (ch <= 0) return false;
  return ch % interval === 0;
}

export default {
  OPTIMIZER_HOOK_FLOOR,
  AB_TEST_INTERVAL,
  resolveLightModel,
  resolveV2ValidationMode,
  shouldTriggerOptimizer,
  shouldRunAbTest,
};
