/**
 * Validation — 推进校验（7 项推进 + 对话成型）
 *
 * EO-P1 Dual BLOCK A: Validation ≠ obtains. Pass/fail = qualification only,
 * not Reality Authority / Author Act.
 *
 * @see golden/reality/d1-implementation-contract/INTERPRETATION-BLOCK.md
 */
import { extractDialogueBlocks } from '../metrics/metrics.js';
// 3b-5: 降级路径用共享口径做基本检查（不再裸奔回旧词面判定）
import { classifySentences, computeDragSpan } from '../metrics/sentence-utils.js';

export function validateChapter(chapterText, intent, metrics, readerResult, options = {}) {
  const text = chapterText || '';
  // 3a: 语义化校验——situation_changed / new_goal 优先消费 scenes[].causalGate
  // （Scene 级语义判定），无门控结果时（INKOS_CAUSAL_GATE=0 或门控失败）
  // 降级到 heuristic_degraded（共享口径基本检查，非旧词面裸奔）。
  const allScenes = (options.scenes || intent?.scenes || []);
  const gateScenes = allScenes.filter((s) => s?.causalGate && !s.causalGate.degraded);
  const hasGate = gateScenes.length > 0;

  const checks = {
    plot_advanced: checkPlot(intent, text),
    relationship_advanced: checkRelationship(intent, text),
    world_advanced: checkWorld(intent, text, metrics),
    character_advanced: checkCharacter(intent, text, metrics),
    situation_changed: hasGate ? checkSituationGate(gateScenes) : checkSituationDegraded(intent, text),
    new_goal: hasGate ? checkNewGoalGate(gateScenes) : checkNewGoal(intent, text),
    new_problem: checkNewProblem(intent, text),
    dialogue_balance: checkDialogueBalance(metrics, text),
  };

  const passed = Object.values(checks).filter(Boolean).length;
  const pass = passed === 8;

  // 3b-0: weak 场景在章级 pass，但打 situationWeak 标记写入 scene.validationFlags，
  // 供 3b feedback 消费；不得触发章级 replan（2b 分流已放行，章级不得再打死）。
  for (const s of gateScenes) {
    if (s.causalGate.changeStrength === 'weak' && s && typeof s === 'object') {
      s.validationFlags = { ...(s.validationFlags || {}), situationWeak: true };
    }
  }

  const result = {
    pass,
    passed,
    total: 8,
    checks,
    validationSource: {
      situation_changed: hasGate ? 'gate' : 'heuristic_degraded',
      new_goal: hasGate ? 'gate' : 'heuristic',
    },
    failures: Object.entries(checks).filter(([, v]) => !v).map(([k]) => k),
    message: pass ? '推进校验 + 对话成型全部成立' : `未通过（${8 - passed}/8 失败）— 需重新规划`,
  };
  if (!hasGate && !checks.situation_changed) {
    console.warn('[validation] 因果门控未运行（INKOS_CAUSAL_GATE=0 或门控失败），situation_changed 经降级启发式判定为 fail —— 降级判定不可靠，建议开启门控');
    result.degradedWarning = 'situation_changed: heuristic_degraded';
  }

  // 门禁分层（L2 默认 soft）：八项是质量信号，不是硬门。
  // 文学化承接正文常不踩字面词（发现/新/…），硬拦会造成整章空转重跑。
  // INKOS_VALIDATION_MODE=strict 恢复硬门。
  const mode = options.mode || process.env.INKOS_VALIDATION_MODE || 'soft';
  if (mode === 'soft') {
    return {
      ...result,
      pass: true,
      soft: true,
      gatePass: pass,
      message: pass ? result.message : `软门禁未全过（${result.failures.join(',')}）— 记录不阻断`,
    };
  }
  return result;
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

/**
 * 3a/3b-0: 语义化 situation 判定（gate 源）——局面是否真的变了。
 * 依据：任一 Scene 门控 strong（不可逆变化直接改变主角目标/知识/处境）。
 * weak 在章级 pass 但打 situationWeak 标记（与 2b 分流一致：weak 触发过
 * 一次 Scene 级重写，重写后仍 weak 放行——章级不得再打死，只供 feedback 消费）；
 * 不得触发章级 replan。只有 none 才 fail。
 */
function checkSituationGate(gateScenes) {
  return gateScenes.some((s) => s.causalGate.changeStrength === 'strong')
    || gateScenes.some((s) => s.causalGate.changeStrength === 'weak');
}

/**
 * 3a: 语义化 new_goal 判定（gate 源）——具体目标变化。
 * 依据：门控 endState 与 startState 有实质差异（非同文），且终态含变化信号
 * （主角的目标/知识/处境描述不同）。旧「章末 200 字含动作词即过」废弃为降级路径。
 */
function checkNewGoalGate(gateScenes) {
  return gateScenes.some((s) => {
    const g = s.causalGate;
    if (!g?.startState || !g?.endState) return false;
    const a = String(g.startState).replace(/\s/g, '');
    const b = String(g.endState).replace(/\s/g, '');
    if (a === b) return false;
    // endState 必须含具体变化语义（目标/知道/处境改变的词面），不接受同义复述
    return /(要|想|得知|发现|明白|知道|失去|获得|拿|逃|去|前往|追|查|谈|决定|不再|必须|换|留|离|处于|陷入)/.test(b);
  });
}

/**
 * 3b-5: 降级 situation 判定——门控关闭时不裸奔回旧词面（但是/却/然而即过）。
 * 用共享口径做基本检查。认知状态句（知道/觉得/想起）会被 EVENT_RE 命中，
 * 但「但是堆砌无变化」的特征是转折词密度高 + 无具体动作结果——
 * 所以额外查动作动词密度（但堆砌文的动作动词趋零）与转折词密度的比值。
 * 不要求门控精度，只拦明显静态。结果标 heuristic_degraded + 警告。
 */
function checkSituationDegraded(intent, text) {
  if (intent.ending || intent.turningPoint) return true;
  const calib = classifySentences(text);
  const drag = computeDragSpan(text);
  if (!calib.total) return false;

  // 转折堆砌检测：转折词多而动作动词少 = 转折不承载变化
  const chars = String(text).replace(/\s/g, '').length || 1;
  const butCount = (String(text).match(/但是|却|然而/g) || []).length;
  const actionVerbs = (String(text).match(/(跑|追|撞|躲|出手|打|拨|停|转|冲|拿|逃|抓|砸|踢|推|拔|扑|挡|塞|递|抢|撕|夺|按|敲|划|割|扔|抛|收|藏|挖|埋|烧|拉|拽|拖|提|背|扛|抱|扶|掐|捂|堵|封|拆|装|修|接|伸|缩|摇|画|圈|挑|选)/g) || []).length;
  const butPerKilo = butCount / chars * 1000;
  const actionPerKilo = actionVerbs / chars * 1000;
  const butPadding = butPerKilo > 10 && actionPerKilo < 5;

  return calib.eventSentenceRatio >= 0.3
    && drag.dragSpan <= 8
    && calib.singlePurposeDescriptionRatio <= 0.3
    && !butPadding;
}

function checkNewGoal(intent, text) {
  // 降级启发式（无门控结果时）。
  const ending = String(intent.ending || '');
  const TPL = /发现型钩子|关键抉择导致不可逆变化|待规划|no_causal_basis/;
  if (ending.length >= 10 && !TPL.test(ending)) return true;
  const tail = String(text).slice(-200) + ending;
  return /下一步|必须|需要|前往|冲|追|锁|握|奔|踏入|逼近|绑定|奔赴|拔|扑|跃|闪|响|炸|轰|警报|警笛|倒计时|还剩|过载|弹出|跳出|转向|亮起|冒出|攥|抵|砸|劈|刺|掀|撞|袭|杀|翻|滚|爬|跪|吼|嘶|爆|震|崩|[「“『]/.test(tail);
}

function checkNewProblem(intent, text) {
  return intent.newForeshadow || intent.obstacles.length > 0 || /威胁|危险|未知|监视/.test(text);
}
