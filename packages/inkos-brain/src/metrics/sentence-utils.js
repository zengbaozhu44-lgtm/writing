/**
 * Sentence Utils — 句子切分与描写/功能判定的唯一共享口径
 *
 * 3a 口径对齐：causal-gate（生成侧）与 eval-narrative（验收侧）必须 import
 * 本模块的同一套函数，禁止各写一套。目标是同一段文本两边报的
 * singlePurpose 比例差值 ≤ 0.02。
 *
 * 消费者：
 * - eval-narrative.js（验收侧指标计算）
 * - causal-gate.js（门控口径对齐输出 singlePurposeSentenceCount 等）
 * - metrics.js（生成侧 dragSpan / singlePurposeDescriptionRatio，3a）
 */
export const EVENT_RE = /(获知|发现|追|撞|躲|停|转|拿|拨|说|问|答|杀|晕|逃|出手|知道|明白|意识到|决意|放弃|答应|拒绝|涌起|闪过|深吸|抬|走|来|去|给|开|关|锁|翻|倒|掉|响|亮|灭|断|碎|合|伤|死|扑|抓|砸|踢|推|拔|冲|喊|叫|挡|塞|递|抢|撕|夺|签|按|敲|划|割|填|写|扔|抛|收|藏|付|买|卖|换|丢|捡|挖|埋|烧|浇|撞|碰|擦|洗|刮|削|拉|拽|拖|提|背|扛|抱|搂|扶|掐|捂|堵|封|拆|装|修|接|递|伸|缩|摇|点|数|画|圈|挑|选|认|记|忘|猜|疑|信|断定|证实|识破|揭穿|暴露|坦白|承认|否认|抵赖|撒谎|隐瞒|泄露|告诉|通知|提醒|警告|威胁|许诺|发誓|决定|计划|准备|开始|结束|完成|失败|成功|赢|输|胜|败)/;
export const DESC_RE = /(像|如|仿佛|似乎|般|色泽|气味|味道|轮廓|纹理|安静|沉默|缓缓|慢慢|静静|微微|轻轻|潮|霉|锈|灰|暗|闷|模糊|寂静|弥漫|笼罩|折射|透出|泛出|映出|斑驳|粗粝|细腻|光滑|粗糙|冰凉|温热|刺骨|灼热|喧嚣|嘈杂|空旷|狭小|逼仄|开阔|低矮|高耸|破旧|崭新|整洁|凌乱)/;
export const ACTION_VERB_RE = /(跑|追|撞|躲|出手|打|拨|停|转|冲|拿|逃|抓|砸|踢|推|拔|扑|挡|喊|叫|塞|递|抢|撕|夺|按|敲|划|割|扔|抛|收|藏|挖|埋|烧|浇|擦|洗|拉|拽|拖|提|背|扛|抱|扶|掐|捂|堵|封|拆|装|修|接|伸|缩|摇|点|画|圈|挑|选)/;

/** 叙事功能信号——句子承担这些之一则描写「承担叙事功能」 */
export const FUNCTIONAL_RE = /(获知|发现|知道|明白|意识到|认出|识破|证实|线索|障碍|威胁|危险|选择|决定|拒绝|答应|躲开|避开|挡住|拦|阻止|变化|改变|断了|消失|出现|留下|带走|拿了|丢了|死了|伤了|走了|来了|变了|之前|之后|已经|这次|那|这是|意味着|说明|证明|原来|才发现|才|又|再|却|但|而)/;

/**
 * 句子切分——与 eval-narrative 完全一致（句末标点后切、滤 <4 字符）。
 */
export function splitSentences(text) {
  return String(text || '')
    .split(/(?<=[。！？”])/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 4);
}

/**
 * 句子分类（event / desc / mixed / neither / singlePurposeDesc / functionalDesc）。
 * 与 eval-narrative.js evalFile 的逐句循环完全同口径。
 */
export function classifySentences(text) {
  const ss = splitSentences(text);
  let event = 0, desc = 0, mixed = 0, neither = 0;
  let singlePurposeDesc = 0, functionalDesc = 0;
  for (const s of ss) {
    const e = EVENT_RE.test(s);
    const d = DESC_RE.test(s);
    if (e && d) mixed += 1;
    else if (e) event += 1;
    else if (d) desc += 1;
    else neither += 1;
    if (d) {
      if (FUNCTIONAL_RE.test(s) || e) functionalDesc += 1;
      else singlePurposeDesc += 1;
    }
  }
  const total = ss.length;
  return {
    sentences: ss,
    total,
    event,
    desc,
    mixed,
    neither,
    singlePurposeDesc,
    functionalDesc,
    eventSentenceRatio: total ? round2(event / total) : 0,
    descSentenceRatio: total ? round2(desc / total) : 0,
    neitherSentenceRatio: total ? round2(neither / total) : 0,
    singlePurposeDescriptionRatio: total ? round2(singlePurposeDesc / total) : 0,
    functionalDescriptionRatio: total ? round2(functionalDesc / total) : 0,
  };
}

/**
 * dragSpan——连续无新信息句子的最大段落长度（句数）。
 * 注意：EVENT_RE 词汇级（走/掉/露出/来/去）会把「挂钟走得很慢」这类环境动态
 * 句误判为事件——拖拽检测不能靠它重置计数。此处用更严格的「新信息」信号：
 * - 认知/决策/获知（主动心智行为，区别于悬浮回忆）；
 * - 人物主语 + 动作动词（排除「挂钟走」「漆磨掉」这类物品主语环境句）；
 * - 对白（引号块）；
 * - 功能信号（FUNCTIONAL_RE：转折/因果/信息指代）。
 * 消费者：metrics.dragSpan → 3b feedback（拖拽 hint）。
 */
export function computeDragSpan(text) {
  const ss = splitSentences(text);
  const COGNITIVE_RE = /(发现|知道了|得知|明白|意识到|决定|选择|认出|识破|断定|证实|答应|拒绝|放弃|杀|死|伤|晕|倒下|断|碎)/;
  const ACTOR_RE = /(他|她|我|你)[^。！？]{0,10}(说|问|答|冲|抓|推|拉|拿|放|扔|接|递|拔|按|敲|砸|踢|拨|转身|抬头|低头|站起来|坐下|蹲|掏|塞|签|挂|写|翻|查|追|逃|挡|拦|掀|撕|合上|关上|打开|离开|走进|走到|拿起|放下|停|跑|走)/;
  const DIALOGUE_RE = /[「“][^」”]{4,}[」”]/;

  let max = 0, cur = 0, start = -1;
  let worstStart = -1;
  ss.forEach((s, i) => {
    const hasInfo = COGNITIVE_RE.test(s)
      || ACTOR_RE.test(s)
      || DIALOGUE_RE.test(s)
      || FUNCTIONAL_RE.test(s);
    if (hasInfo) {
      cur = 0;
      start = -1;
    } else {
      if (cur === 0) start = i;
      cur += 1;
      if (cur > max) { max = cur; worstStart = start; }
    }
  });
  return { dragSpan: max, dragStartIndex: worstStart };
}

function round2(n) {
  return Math.round(n * 100) / 100;
}
