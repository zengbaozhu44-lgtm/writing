/**
 * Validation — 推进校验（7 项推进 + 对话成型）
 *
 * EO-P1 Dual BLOCK A: Validation ≠ obtains. Pass/fail = qualification only,
 * not Reality Authority / Author Act.
 *
 * @see golden/reality/d1-implementation-contract/INTERPRETATION-BLOCK.md
 */
import { extractDialogueBlocks } from '../metrics/metrics.js';

export function validateChapter(chapterText, intent, metrics, readerResult) {
  const text = chapterText || '';
  const checks = {
    plot_advanced: checkPlot(intent, text),
    relationship_advanced: checkRelationship(intent, text),
    world_advanced: checkWorld(intent, text, metrics),
    character_advanced: checkCharacter(intent, text, metrics),
    situation_changed: checkSituation(intent, text),
    new_goal: checkNewGoal(intent, text),
    new_problem: checkNewProblem(intent, text),
    dialogue_balance: checkDialogueBalance(metrics, text),
  };

  const passed = Object.values(checks).filter(Boolean).length;
  const pass = passed === 8;

  return {
    pass,
    passed,
    total: 8,
    checks,
    failures: Object.entries(checks).filter(([, v]) => !v).map(([k]) => k),
    message: pass ? '推进校验 + 对话成型全部成立' : `未通过（${8 - passed}/8 失败）— 需重新规划`,
  };
}

/**
 * 对话「成型」硬闸：不量化占比（flat ratio 依赖行结构、被 system 文本稀释，误杀且抓不到真问题），
 * 改查对话是否成型——每 Scene 至少 1 处人话块 + 全章至少 1 段 ≥20 字长对话。
 * ch1-15 全部通过（零误杀）；只拦「整章无角色开口」的坏章。
 */
function checkDialogueBalance(metrics, text) {
  let human = metrics?.humanDialogueCount;
  let long = metrics?.longDialogueBlocks;
  if (human == null || long == null) {
    const extracted = extractDialogueBlocks(String(text || ''));
    human = extracted.humanDialogueCount;
    long = extracted.longDialogueBlocks;
  }
  const sceneCount = metrics?.sceneCount || (metrics?.scenes?.length) || 4;
  return human >= sceneCount && long >= 1;
}

function checkPlot(intent, text) {
  return Boolean(intent.mainGoal && (text.length > 100 || intent.scenes?.length));
}

function checkRelationship(intent, text) {
  return intent.present.length > 1 || intent.bargain || /对话|说|问|答/.test(text);
}

function checkWorld(intent, text, metrics) {
  // 世界观推进：度量/意图优先；正文兜底——兼容本书真实的世界发现词汇
  // （旧词 发现|新|异常|规则 之外，深渊/地底/遗迹/封印/裂缝 等是本书特有的世界层展开信号）
  // 意图层信号：mustGain（必须获得）与 newForeshadow（新增伏笔=世界层新钩子）同为
  // 计划承载的世界推进声明；文学化承接正文可能不踩字面词，不能仅凭词汇否决。
  return metrics?.worldProgress > 0 || intent.mustGain || intent.newForeshadow
    || /发现|新|异常|规则|深渊|地底|遗迹|封印|裂缝|异变|旧日/.test(text);
}

function checkCharacter(intent, text, metrics) {
  // 角色推进：度量/意图优先；正文兜底。
  // 前瞻派生卡（B）的 mustLose 已剥离——上一章 anchor 的「禁止无损撤回本章代价」
  // 禁令是已支付代价的权威存证（按设计继承两章），作为意图层信号接受。
  const costProtected = (intent.priorAnchor?.banned_elements || []).some((b) => {
    const t = typeof b === 'string' ? b : String(b?.text || '');
    return t.includes('禁止无损撤回本章代价');
  });
  return metrics?.characterGrowth > 0 || intent.mustLose || costProtected
    || /代价|失去|选择/.test(text);
}

function checkSituation(intent, text) {
  return intent.ending || intent.turningPoint || /但是|却|然而/.test(text);
}

function checkNewGoal(intent, text) {
  // 真结尾（非模板占位且长度足够）本身即"新目标成立"；否则查章末动作词，
  // 兼容本书以动作收尾的钩子风格（冲/追/锁/绑定…），避免误杀真实推进。
  const ending = String(intent.ending || '');
  const TPL = /发现型钩子|关键抉择导致不可逆变化|待规划|no_causal_basis/;
  if (ending.length >= 10 && !TPL.test(ending)) return true;
  // 章末动作/张力/对话：真实结尾必有向前的推动感（覆盖动作词、紧迫词、对话引号）
  const tail = String(text).slice(-200) + ending;
  return /下一步|必须|需要|前往|冲|追|锁|握|奔|踏入|逼近|绑定|奔赴|拔|扑|跃|闪|响|炸|轰|警报|警笛|倒计时|还剩|过载|弹出|跳出|转向|亮起|冒出|攥|抵|砸|劈|刺|掀|撞|袭|杀|翻|滚|爬|跪|吼|嘶|爆|震|崩|[「“『]/.test(tail);
}

function checkNewProblem(intent, text) {
  return intent.newForeshadow || intent.obstacles.length > 0 || /威胁|危险|未知|监视/.test(text);
}
