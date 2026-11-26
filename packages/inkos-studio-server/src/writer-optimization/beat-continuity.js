/**
 * Beat Continuity — 跨 Beat 物理 / 地点 / 已揭示信息 / 已发生动作
 * Slim Prompt 注入状态摘要 + V2 之后硬闸
 */

// similarityRatio 已迁入 inkos-core（反向依赖收口）。此处导入 + re-export 保持外部调用方兼容。
import { similarityRatio } from '../../../inkos-core/src/lib/text-similarity.js';
export { similarityRatio };

// 从共享配置层读取 patterns（消除单书指纹硬编码）
import {
  DEFAULT_REVEAL_KEY_PATTERNS as REVEAL_KEY_PATTERNS,
  DEFAULT_ACTION_MOTIF_PATTERNS as ACTION_MOTIF_PATTERNS,
  DEFAULT_INTERFACE_PATTERNS as INTERFACE_PATTERNS,
  DEFAULT_REDISCOVERY_TONE as REDISCOVERY_TONE,
  DEFAULT_FIRST_REVEAL_TONE as FIRST_REVEAL_TONE,
  DEFAULT_ANTITHESIS_RE as ANTITHESIS_RE,
  EVENT_PHASES,
} from '../../../inkos-core/src/config/beat-continuity-patterns.js';

export {
  REVEAL_KEY_PATTERNS,
  ACTION_MOTIF_PATTERNS,
  INTERFACE_PATTERNS,
  REDISCOVERY_TONE,
  FIRST_REVEAL_TONE,
  ANTITHESIS_RE,
  EVENT_PHASES,
};

/**
 * 书籍语境门控：这条「本书专属」规则是否属于当前这本书。
 * gates 是书里出现即视为该设定在场的锚点子串；vocab 缺省/null 时不门控（保持旧行为）。
 * 用途：beat-continuity 的 cyberpunk 意象规则（青穹/权限/浮空城/机械左臂…）只应在
 * 书籍自己的世界数据（world bible/facts/state board）确实提及这些设定时触发，
 * 避免把《二手书店老板的最后一周》的「铸铁煤炉」误判成「拘束操作台」。
 */
export function gatesMatch(vocab, gates) {
  if (!vocab) return true;
  if (!Array.isArray(gates) || !gates.length) return true;
  return gates.some((g) => String(vocab).includes(g));
}

/**
 * @typedef {{
 *   leftArm: string|null,
 *   rightArm: string|null,
 *   legs: string|null,
 *   other: string|null,
 *   location: string|null,
 *   threat: string|null,
 *   revealed: string[],
 *   doneActions: string[],
 *   activeInterfaces: { id: string, label: string }[],
 *   eventPhase: string,
 *   lastAfterState: string|null,
 *   usedPhrases: string[],        // 已使用的显著短语（跨 Beat 防复用）
 *   interactLoops: number,        // 「操作→痛苦→系统反馈」循环计数
 *   systemLineCount: number,      // 已出现的生硬系统提示【...】次数
 * }} ContinuityState
 */

export function createContinuityState(seed = null) {
  return {
    leftArm: seed?.leftArm || null,
    rightArm: seed?.rightArm || null,
    legs: seed?.legs || null,
    other: seed?.other || null,
    location: seed?.location || null,
    threat: seed?.threat || null,
    revealed: [...(seed?.revealed || [])],
    doneActions: [...(seed?.doneActions || [])],
    activeInterfaces: [...(seed?.activeInterfaces || [])],
    eventPhase: seed?.eventPhase || 'setup',
    lastAfterState: seed?.lastAfterState || null,
    usedPhrases: [...(seed?.usedPhrases || [])],
    interactLoops: seed?.interactLoops || 0,
    systemLineCount: seed?.systemLineCount || 0,
  };
}

/** 显著重复短语指纹（跨 Beat 只允许出现一次） */
const REPEAT_PHRASE_PATTERNS = [
  /声音.{0,6}(哑|沙哑|像砂纸刮过铁皮)/u,
  /砂纸刮过铁皮/u,
  /声音(哑|沙哑)/u,
  /铁锈味/u,
  /掌心光团/u,
  /那团光/u,
  /屏幕亮了一瞬/u,
  /涌上(一股)?铁锈味/u,
  /像砂纸/u,
  /咬住(袖口|舌尖|牙关|牙)/u,
  /闷哼一声/u,
  /冷汗/u,
  /倒计时/u,
  /低语在脑内/u,
  /低语在颅骨/u,
  /颅骨内侧/u,
  /指尖带血/u,
  /渗出来/u,
  /喉咙里(涌上|涌出|泛上)/u,
  /声音像砂纸/u,
];

/** 抽取正文中命中的显著短语指纹（贪心去重叠：同一处文本只记最长指纹） */
export function extractRepeatPhrases(text = '') {
  const t = String(text || '');
  const found = [];
  const occupied = []; // [start, end] 已覆盖区间
  const overlaps = (s, e) => occupied.some(([a, b]) => s < b && e > a);
  for (const re of REPEAT_PHRASE_PATTERNS) {
    // 确保全局匹配以便 matchAll 推进；无 g 时克隆加 g（flags 已含 u）
    const reG = re.global ? re : new RegExp(re.source, `${re.flags}g`);
    for (const m of t.matchAll(reG)) {
      const start = m.index;
      const end = m.index + m[0].length;
      if (!overlaps(start, end)) {
        found.push(m[0]);
        occupied.push([start, end]);
      }
    }
  }
  return [...new Set(found)].sort((a, b) => b.length - a.length);
}

/**
 * 取文本末 N 个字符（原样，不按句切）——「续写原文」窗口。
 * 七元素 prompt 的【续写原文】直接用末 100 字原文，让模型从「上一拍结尾」续写，
 * 而不是按句向前收窗（T3 takeContinuationTail 的句窗在 scene 内已不必要）。
 */
export function takeLastNChars(text = '', n = 100) {
  const raw = String(text || '');
  if (!raw) return '';
  return raw.slice(-n);
}

/** 判定文本片段开头是否与本章已有文本高度重复 */
export function isOpeningRepeat(segment = '', chapterTextSoFar = '', threshold = 0.6) {
  const head = String(segment || '').replace(/\s/g, '').slice(0, 20);
  const base = String(chapterTextSoFar || '');
  if (head.length < 6 || base.length < 20) return false;
  // 逐 20 字窗口滑过已有文本，任一窗口相似度超阈值即重复
  for (let i = 0; i <= base.length - head.length; i += 6) {
    const window = base.slice(i, i + 20);
    if (similarityRatio(head, window) >= threshold) return true;
  }
  return false;
}

/**
 * 全 Beat 滑窗防重复：不只查开头（isOpeningRepeat 漏 mid-beat 复读，如 ch16 的
 * 「悬在确认键上方」@0/@2520、低声笑 @470/@1580），对 beat 全文每个 20 字窗口
 * 滑过已有文本，任一窗口相似度 ≥ 阈值即判重复。基窗口 gram 集合一次构建复用。
 * 窗口法对「共享段只有 10 字、上下文不同」的复读会因对齐摇摆（Jaccard 0.53~0.61）
 * 漏判 → 追加最长公共子串检测：连续 ≥10 字逐字复读直接命中，对齐不敏感。
 */
export function findRepeatedSegment(text = '', chapterTextSoFar = '', threshold = 0.6, minLcs = 10) {
  const t = String(text || '').replace(/\s/g, '');
  const b = String(chapterTextSoFar || '').replace(/\s/g, '');
  const W = 20;
  if (t.length < W || b.length < W) return null;

  const grams = (s) => {
    const out = new Set();
    for (let i = 0; i <= s.length - 3; i++) out.add(s.slice(i, i + 3));
    return out;
  };

  const baseWindows = [];
  for (let j = 0; j + W <= b.length; j += 6) {
    baseWindows.push({ at: j, slice: b.slice(j, j + W), grams: grams(b.slice(j, j + W)) });
  }
  if (!baseWindows.length) return null;

  for (let i = 0; i + W <= t.length; i += 6) {
    const seg = t.slice(i, i + W);
    const gs = grams(seg);
    if (!gs.size) continue;
    for (const bw of baseWindows) {
      let inter = 0;
      for (const g of gs) if (bw.grams.has(g)) inter++;
      if (inter / gs.size >= threshold) {
        return { at: i, segment: seg, baseAt: bw.at, similarity: Math.round((inter / gs.size) * 100) };
      }
    }
  }

  // 最长公共子串：连续 ≥minLcs 字逐字复读（对齐不敏感，抓「他听见自己喉咙里挤出…」这类短段复读）
  const lcs = longestCommonSubstring(t, b);
  if (lcs && lcs.length >= minLcs) {
    return {
      at: t.indexOf(lcs),
      segment: lcs,
      baseAt: b.indexOf(lcs),
      similarity: Math.round((lcs.length / W) * 100),
      lcs: true,
      note: `连续 ${lcs.length} 字复读「${lcs}」`,
    };
  }
  return null;
}

/** 最长公共子串（DP，仅长度回溯取一段）；输入为去空白后的紧凑文本 */
export function longestCommonSubstring(a = '', b = '') {
  const n = a.length, m = b.length;
  if (!n || !m) return '';
  // 空间优化：只留上一行 + 当前行，回溯最长值
  let prev = new Array(m + 1).fill(0);
  let bestLen = 0, bestEnd = 0;
  for (let i = 1; i <= n; i++) {
    const cur = new Array(m + 1).fill(0);
    for (let j = 1; j <= m; j++) {
      if (a[i - 1] === b[j - 1]) {
        cur[j] = prev[j - 1] + 1;
        if (cur[j] > bestLen) { bestLen = cur[j]; bestEnd = i; }
      }
    }
    prev = cur;
  }
  return bestLen ? a.slice(bestEnd - bestLen, bestEnd) : '';
}

/** 判断正文是否有生硬系统提示原文（【...】 贴出而非主观化） */
export function hasRawSystemLine(text = '') {
  const t = String(text || '');
  // 生硬标记：整行/整块【数据原文】，含编号、百分比、协议术语，未转化为感知
  const raw = t.match(/【[^】]{3,80}】/gu) || [];
  return raw.filter((s) => {
    const inner = s.slice(1, -1);
    // 数据化原文：含编号/百分比/协议缩写 → 生硬；纯短语（如【警告】）不算
    return /[#:\d.%]|测试员|绑定中|警告|完整性|损坏率|锚点偏移|协议|指令码|已降|已注销|清除程序|重启倒计时/u.test(inner);
  });
}

/** 判断是否「操作→痛苦→反馈」交互循环（中段踏步信号） */
export function isInteractLoop(text = '') {
  const t = String(text || '');
  const operates = /按下|确认|输入|敲|抵上|推入|压住|操作|确认键|回车|代码|权限码/u.test(t);
  const pain = /疼|痛|灼|烧|焦|渗|闷哼|痉挛|抽搐|血/u.test(t);
  const feedback = /屏幕|系统|面板|监控|数据流|提示|权限|倒计时|验证码/u.test(t);
  return operates && pain && feedback;
}

/**
 * 已知角色名白名单（来自 03_character_bible + 章节大纲确认）
 * 生成正文若出现未登记人名 → 视为幻觉/名字混乱，强制重写
 */
export const KNOWN_CHARACTERS = ['林砚', '林薇', '沈寒舟', '渊尊', '苏清鸢', '一刀岁暮', '齐玥'];

/** 已知「被污染/幻觉」人名（曾在大纲草稿中出现、已被设定收敛或废弃） */
export const FORBIDDEN_NAMES = ['林晚', '姚雨', '苏晚'];

/**
 * 检测正文中的「未登记人名」：符合中文姓氏+名、不在白名单、出现在叙述（非对白引用）
 * @param {string[]} [knownNames] 本书角色名单（来自 03_character_bible + POV/出场）；缺省用内置白名单
 * @returns {string[]} 疑似未登记人名
 */
export function detectUnknownCharacterNames(text = '', knownNames = KNOWN_CHARACTERS) {
  const t = String(text || '');
  const known = new Set(knownNames);
  const suspects = new Set();

  // 剥掉对白，只看叙述
  const narr = t.replace(/[「『"“][^」』"”]*[」』"”]/gu, '');

  // ① 黑名单幻觉名（精确匹配，绝不误伤）
  for (const bad of FORBIDDEN_NAMES) {
    if (narr.includes(bad)) suspects.add(bad);
  }

  // ② 白名单角色的近形误写：只检测「白名单姓 + 与白名单角色名一字之差」的高置信变体
  //    例如 林薇→林婉、齐玥→齐月、苏清鸢→苏清茵。避免「一帧/一下/锁孔」等普通词误报。
  const closeVariants = knownNames
    .filter((n) => n !== '一刀岁暮') // 玩家ID 跳过
    .flatMap((n) => {
      const surname = n[0];
      const given = n.slice(1);
      const re = new RegExp(`(${surname}[一-龥]{1,${given.length}})`, 'gu');
      const found = [];
      for (const m of narr.matchAll(re)) {
        const cand = m[1];
        if (known.has(cand)) continue;
        // 与白名单角色「一字之差」才报（H 距离=1）
        if (editDistance1(cand, n)) found.push(cand);
      }
      return found;
    });
  for (const v of closeVariants) suspects.add(v);

  return [...suspects];
}

/** 判断两名字是否恰好一字之差（等长且不同字数=1，或 2字vs3字 前缀含2/3相同） */
function editDistance1(a, b) {
  if (a === b) return false;
  if (a.length === b.length) {
    let diff = 0;
    for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) diff++;
    return diff === 1;
  }
  return false;
}

/** 判断正文是否出现名字混乱（叙事事故） */
export function hasUnknownCharacterName(text = '') {
  return detectUnknownCharacterNames(text).length > 0;
}

/** 抽取旁白第一人称片段（排除对白内「我」）— 视角事故检测 */
export function extractNarratorFirstPerson(text = '') {
  const t = String(text || '');
  // 剥掉对白引号段（含「『"“）
  const narr = t.replace(/[「『“][^」』”]*[」』”]/gu, ''); // 剥掉对白
  const hits = [];
  // 旁白「我/我的」后接动词/助词 → 叙述主语（如 我听见/我选了/我的胃/我对着）
  const re = /(我)(?=[^，。！？\n]{0,12}(听见|看见|选了|想到|感觉|觉得|的|把|对着|对|骂|喊|说|想|要|就|是|在|朝|向|冲|回|转身|低头|抬头|攥|握|踩|推开|拽))/gu;
  for (const m of narr.matchAll(re)) hits.push(m[0]);
  return hits;
}

/** 判断正文是否出现旁白第一人称（叙述人称事故） */
export function hasNarratorFirstPerson(text = '') {
  return extractNarratorFirstPerson(text).length > 0;
}

/** 抽取本段命中的动作指纹 id 列表（vocab 提供时按书籍语境门控） */
export function extractActionMotifs(text = '', vocab = null) {
  const t = String(text || '');
  const found = [];
  for (const row of ACTION_MOTIF_PATTERNS) {
    if (row.re.test(t) && gatesMatch(vocab, row.gates)) found.push(row.id);
  }
  return found;
}

/** 抽取本段出现的可操作界面（vocab 提供时按书籍语境门控） */
export function extractInterfaces(text = '', vocab = null) {
  const t = String(text || '');
  const found = [];
  for (const row of INTERFACE_PATTERNS) {
    if (row.re.test(t) && gatesMatch(vocab, row.gates)) found.push({ id: row.id, label: row.label });
  }
  return found;
}

/** 从正文推断事件相位推进（相对上一相位只升不降） */
export function inferEventPhase(text = '', prevPhase = 'setup', vocab = null) {
  const t = String(text || '');
  let next = prevPhase || 'setup';
  const rank = (p) => Math.max(0, EVENT_PHASES.indexOf(p));

  if (extractInterfaces(t, vocab).length && rank(next) < rank('discovered')) next = 'discovered';
  if (/读出|对上|校验|扫过|沿着光纹|看向(屏幕|面板|光团)/u.test(t) && rank(next) < rank('operating')) {
    next = 'operating';
  }
  if (/按下|确认|锁定|拒绝|赌|只能选|输入|摁进/u.test(t) && rank(next) < rank('chose')) {
    next = 'chose';
  }
  if (/代价|烧|降级|注销|浸透|喷出|失败|代价落地|不可逆/u.test(t) && rank(next) < rank('costed')) {
    next = 'costed';
  }
  if (/下一|未完成|倒计时|还剩|新约束|坐标是活的|必须翻页/u.test(t) && rank(next) >= rank('chose')) {
    next = 'advanced';
  }
  return next;
}

/** 「不是 A，是 B」修辞计数 */
export function countAntithesis(text = '') {
  const m = String(text || '').match(ANTITHESIS_RE);
  return m ? m.length : 0;
}

/**
 * 事件相位写作指令：已有界面时，禁止「再发现一个新界面」
 */
export function formatEventPhaseDirective(state = null, beat = null, profile = null) {
  const ifaces = state?.activeInterfaces || [];
  const phase = state?.eventPhase || 'setup';
  const structural = beat?.structuralBeat || beat?.id || '';
  const order = Number(beat?.order) || 1;
  // 无界面/交互系统设定的书（如现实向书店故事）：事件相位与界面控制不适用，整块省略，
  // 避免「可首次建立关键物件/界面」这类语言诱导作者发明系统界面。
  if (!gatesMatch(profile?.vocab, ['界面', '权限', '系统', '面板', '监控屏'])) return '';

  if (!ifaces.length) {
    if (order <= 1) {
      return '事件相位：本段可首次建立关键物件/界面；一经写出，后续拍禁止再「发现」它，只能选择/操作/承担后果。';
    }
    return '事件相位：勿另起「新界面首次出现」；在已有线索上推进选择与代价。';
  }

  const label = ifaces.map((x) => x.label).slice(0, 2).join('、');
  const byStructural = {
    goal: `已持有「${label}」——用它确立目标动作，禁止再描写它的「第一次出现」。`,
    obstacle: `使用「${label}」受阻——写阻碍与风险，禁止新开另一个界面。`,
    choice: `基于「${label}」做出不可逆选择（确认/拒绝/赌），写选择本身与私人理由。`,
    consequence: `「${label}」上的选择产生可见代价；写后果落地，不要重新发现界面。`,
    newInformation: `「${label}」吐出一条新约束/后果（同一界面的反馈），禁止「又发现一个新面板」。`,
    hook: `用「${label}」未完成的后果收悬念，勿另起发现戏。`,
  };

  const phaseLine = {
    setup: '相位 setup',
    discovered: '相位=已发现 → 下一拍必须操作或选择，禁止再发现',
    operating: '相位=操作中 → 推进到选择或代价',
    chose: '相位=已选择 → 写代价落地',
    costed: '相位=代价已落 → 写推进/新约束，勿回炉重开界面',
    advanced: '相位=已推进 → 只收束或开下一危机，禁止回溯「首次发现」',
  }[phase] || `相位=${phase}`;

  return [
    `### 事件相位（禁止「再发现一个新界面」）`,
    `- 活跃界面：${label}`,
    `- ${phaseLine}`,
    `- 本拍任务：${byStructural[structural] || `在「${label}」上推进选择/代价/下一步，禁止换皮重开发现。`}`,
  ].join('\n');
}

/**
 * Discovery 等 Library 指令：已有界面时改写为「操作已知」
 */
export function remapLibraryInstruction(libraryBeat, libraryInstruction = '', state = null) {
  const type = String(libraryBeat || '');
  const hasUi = (state?.activeInterfaces || []).length > 0;
  if (!hasUi) return libraryInstruction || '';

  if (type === 'Discovery') {
    return 'Discovery：在已发现的界面/线索上读出新约束或选项；禁止重新发现同一界面；写出操作与选择。';
  }
  if (type === 'Reward') {
    return 'Reward：兑现已操作界面的局部结果并带新代价；禁止「又解锁一个新面板」。';
  }
  if (type === 'Decision') {
    return 'Decision：对已有界面做出有代价的选择（确认/拒绝/赌），不要先再发现一遍。';
  }
  return libraryInstruction || '';
}

function clip(s, n = 36) {
  const t = String(s || '').trim();
  if (!t) return '';
  return t.length <= n ? t : `${t.slice(0, n - 1)}…`;
}

/** 从正文抽取身体部位损伤（启发式，宁严勿松） */
export function extractBodyStateFromText(text = '', vocab = null) {
  const t = String(text || '');
  const body = { leftArm: null, rightArm: null, legs: null, other: null };
  // 义体/机械部件类设定才启用「部件受损」判定；普通书里「左手卡了一下」不是损伤。
  // 纯断肢判定（断/没了/缺失）保持通用——任何书都可能有。
  const mech = gatesMatch(vocab, ['机械', '液压', '义体', '义肢', '义臂']);

  if (/左手\s*(没了|缺失|断|炸)|左臂.{0,16}(断|碎|没了|缺失)|机械左臂.{0,12}(断|碎|卡死)|左肘.{0,8}(下|以)?下?.{0,10}(没|断|焦)/u.test(t)) {
    body.leftArm = /没了|缺失|肘.{0,8}下|以下/u.test(t) ? 'severed' : 'disabled';
  } else if (mech && /左臂|左手|机械左臂/u.test(t) && /液压|漏|火花|抽搐|卡/u.test(t)) {
    body.leftArm = 'damaged';
  }

  if (/右手\s*(没了|缺失|断)|右臂.{0,16}(断|碎|没了|缺失|废了)|右肘.{0,8}(下|以)?下?.{0,10}(没|断|焦)|右臂.{0,12}(剐掉|焦黑)/u.test(t)) {
    body.rightArm = /没了|缺失|肘.{0,8}下|废了|剐掉|以下/u.test(t) ? 'severed' : 'disabled';
  } else if (mech && /右臂|右手/u.test(t) && /火花|痉挛|接口|焦/u.test(t)) {
    body.rightArm = 'damaged';
  }

  if (/膝盖以下没了|双腿.{0,6}(断|没)|右腿.{0,8}(卡死|断|缺失)|左腿.{0,8}(断|缺失)/u.test(t)) {
    body.legs = 'severed';
  } else if (mech && /腿|膝|液压杆/u.test(t) && /卡死|废|断/u.test(t)) {
    body.legs = 'damaged';
  }

  if (/半截脊椎|脊椎.{0,6}断|左肺.{0,6}撕/u.test(t)) {
    body.other = 'critical';
  }

  return body;
}

/**
 * 从事实库派生身体状态（F013：林砚左臂第3章起焦毁且知觉丧失）。
 * facts: 13_facts_db.yaml 的 facts 数组 → [{ id, fact, chapter, immutable }]
 * 只做「设立损伤」：事实库确立的焦毁/断肢 → leftArm:'disabled' / 'severed'。
 * 供 beat 路径播种到 continuity（loadChapterContinuity），让 validateCrossBeatConsistency
 * 从 Scene1 首拍起就拦截左臂主动作，而不是等正文写出来才后置修正。
 */
export function deriveBodyStateFromFacts(facts = []) {
  const body = {};
  const all = (Array.isArray(facts) ? facts : [])
    .map((f) => String(f?.fact || f?.text || ''))
    .filter(Boolean)
    .join('\n');
  if (!all) return body;
  // 左臂：焦毁/知觉丧失/残肢 → disabled；截断/缺失 → severed
  if (/左臂.{0,30}(焦毁|烧毁|碳化|知觉丧失|没了知觉|废了|瘫痪|残肢)/u.test(all)
    || /焦毁.{0,16}左臂/u.test(all)) {
    body.leftArm = 'disabled';
  }
  if (/左臂.{0,20}(截断|炸断|断裂|截肢|缺失)|左手.{0,16}(炸飞|没了|缺失)/u.test(all)) {
    body.leftArm = 'severed';
  }
  // 右臂同类规则（当前无右臂损伤，保留扩展位）
  if (/右臂.{0,30}(焦毁|烧毁|碳化|知觉丧失|废了|瘫痪|残肢)/u.test(all)) {
    body.rightArm = 'disabled';
  }
  if (/右臂.{0,20}(截断|炸断|断裂|截肢|缺失)|右手.{0,16}(炸飞|没了|缺失)/u.test(all)) {
    body.rightArm = 'severed';
  }
  return body;
}

/**
 * 地点提取——按书籍语境门控：本书世界数据没提及的地点概念不提取。
 * 关键：`拘束操作台` 只认「操作台」作锚点（`铸铁` 是普通金属词，书店的铸铁煤炉不得误判）。
 */
export function extractLocationFromText(text = '', vocab = null) {
  const t = String(text || '');
  const hits = [
    [/焚化(炉|区)/u, '焚化区', ['焚化']],
    [/观测塔/u, '观测塔', ['观测塔']],
    [/主控台|城主府/u, '主控台', ['主控台', '城主府']],
    [/承重柱|龙骨|浮空城/u, '浮空城坠落区', ['承重柱', '龙骨', '浮空城']],
    [/天台|垛口|城墙/u, '城墙/天台', ['天台', '垛口', '城墙']],
    [/甲板|运兵舰|舰队/u, '舰队/甲板', ['甲板', '运兵舰', '舰队']],
    [/操作台|铸铁/u, '拘束操作台', ['操作台']],
  ];
  for (const [re, label, gates] of hits) {
    if (re.test(t) && gatesMatch(vocab, gates)) return label;
  }
  return null;
}

export function extractThreatFromText(text = '', vocab = null) {
  const t = String(text || '');
  if (gatesMatch(vocab, ['青穹', '舰队', '运兵舰']) && /青穹|运兵舰|舰队|镭射炮/u.test(t)) return '青穹重工军事压力';
  if (gatesMatch(vocab, ['邪神']) && /邪神|低语/u.test(t)) return '邪神低语侵蚀';
  if (gatesMatch(vocab, ['浮空城', '龙骨', '承重柱']) && /坠落|崩塌|龙骨断裂/u.test(t)) return '浮空城坠落';
  if (gatesMatch(vocab, ['清除', '倒计时', '权限', '系统']) && /倒计时|清除|锁定/u.test(t)) return '系统清除威胁';
  return null;
}

export function extractRevealedKeysFromText(text = '', vocab = null) {
  const t = String(text || '');
  const found = [];
  for (const row of REVEAL_KEY_PATTERNS) {
    if (row.re.test(t) && gatesMatch(vocab, row.gates)) found.push(row.id);
  }
  return found;
}

const SEVERITY = { null: 0, damaged: 1, disabled: 2, severed: 3, critical: 3 };

/**
 * 损伤只升不降；地点/威胁取最新非空；reveal / 动作 / 界面 / 事件相位累加
 * @param {string} [vocab] 本书语境语料（world bible + facts + state board…）；提供时按书籍门控 cyberpunk 意象规则
 */
export function mergeContinuityState(prev, text = '', afterState = '', vocab = null) {
  const next = createContinuityState(prev);
  const body = extractBodyStateFromText(text, vocab);
  for (const key of ['leftArm', 'rightArm', 'legs', 'other']) {
    const incoming = body[key];
    if (!incoming) continue;
    if ((SEVERITY[incoming] || 0) >= (SEVERITY[next[key]] || 0)) {
      next[key] = incoming;
    }
  }
  const loc = extractLocationFromText(text, vocab);
  if (loc) next.location = loc;
  const threat = extractThreatFromText(text, vocab);
  if (threat) next.threat = threat;
  for (const id of extractRevealedKeysFromText(text, vocab)) {
    if (!next.revealed.includes(id)) next.revealed.push(id);
  }
  for (const id of extractActionMotifs(text, vocab)) {
    if (!next.doneActions.includes(id)) next.doneActions.push(id);
  }
  for (const iface of extractInterfaces(text, vocab)) {
    if (!next.activeInterfaces.some((x) => x.id === iface.id)) {
      next.activeInterfaces.push(iface);
    }
  }
  next.eventPhase = inferEventPhase(text, next.eventPhase, vocab);
  // ── 新增：显著短语 / 交互循环 / 生硬系统行 累积 ──
  for (const p of extractRepeatPhrases(text)) {
    if (!next.usedPhrases.includes(p)) next.usedPhrases.push(p);
  }
  if (isInteractLoop(text)) next.interactLoops += 1;
  next.systemLineCount += hasRawSystemLine(text).length;
  // 规划套话勿写入 after（会诱导下一拍「再确认/再发现」）
  const cleanAfter = String(afterState || '')
    .replace(/确认\/意识到：/g, '已掌握：')
    .replace(/本 Scene 须释放至少一条新信息[^；]*/g, '信息后果已落地');
  if (cleanAfter && !/须释放|确认\/意识到/.test(cleanAfter)) {
    next.lastAfterState = cleanAfter.slice(0, 80);
  } else if (cleanAfter) {
    next.lastAfterState = cleanAfter.slice(0, 80);
  }
  return next;
}

function bodyLabel(part, state) {
  if (!state) return null;
  const name = { leftArm: '左臂/左手', rightArm: '右臂/右手', legs: '腿', other: '躯干' }[part] || part;
  const how = {
    damaged: '受损（功能受限）',
    disabled: '瘫痪/焦毁',
    severed: '已断裂/缺失（禁止再写完整肢体动作）',
    critical: '重创',
  }[state] || state;
  return `${name}：${how}`;
}

/**
 * Slim Prompt 用 4 行状态摘要（禁止复读 / 禁止矛盾）
 * @param {{vocab?:string, characters?:string[], pov?:string|null}} [profile] 书籍档案（角色名/POV，用于去 林砚 式硬编码）
 */
export function formatBeatContinuitySummary(state = null, beatMemory = null, profile = null) {
  if (!state && !beatMemory?.lastAfterState) return '';

  const bodyParts = [
    bodyLabel('leftArm', state?.leftArm),
    bodyLabel('rightArm', state?.rightArm),
    bodyLabel('legs', state?.legs),
    bodyLabel('other', state?.other),
  ].filter(Boolean);

  const revealedLabels = (state?.revealed || [])
    .map((id) => REVEAL_KEY_PATTERNS.find((r) => r.id === id)?.label || id)
    .slice(0, 4);

  const doneLabels = (state?.doneActions || [])
    .map((id) => ACTION_MOTIF_PATTERNS.find((r) => r.id === id)?.label || id)
    .slice(0, 6);

  const ifaceLabels = (state?.activeInterfaces || []).map((x) => x.label).slice(0, 3);
  // 无界面设定的书不渲染「活跃界面」行，避免诱导现实向书发明系统界面
  const hasIface = gatesMatch(profile?.vocab, ['界面', '权限', '系统', '面板', '监控屏']);

  const lines = [
    '### 已完成状态摘要（必须继承，禁止重复开场/矛盾描写）',
    `- 身体：${bodyParts.length ? bodyParts.join('；') : '尚未确立损伤（勿无故重置重伤开场）'}`,
    (state?.leftArm === 'disabled' || state?.leftArm === 'severed')
      ? '- 左臂禁令（F013）：左臂是焦毁无知觉残肢，禁止「发力/撑地/按紧/用上力/握/抓/按/推/拉」；所有用力动作一律用右臂/肩膀/躯体完成。左臂可写「发麻/空荡荡/不属于自己/像烧断的木头」，撞到硬物不觉得疼。'
      : '',
    `- 位置：${state?.location || '承接上文现场，禁止无过渡换场'}`,
    `- 已揭示：${revealedLabels.length ? `${revealedLabels.join('、')}（禁止再写「第一次发现」）` : '尚无关键 reveal'}`,
    `- 威胁：${state?.threat || clip(beatMemory?.lastAfterState, 40) || '承接上文压力'}`,
    hasIface
      ? (ifaceLabels.length
        ? `- 活跃界面：${ifaceLabels.join('、')}（相位=${state?.eventPhase || 'discovered'}；禁止再「发现新界面」，须选择/操作/承担后果）`
        : '- 活跃界面：尚无；首次写出后锁定，后续拍禁止换皮重开发现')
      : '',
    doneLabels.length
      ? `- 已发生动作（禁止重演/换皮重写）：${doneLabels.join('、')}`
      : '- 已发生动作：尚无；本段写出后不得在后续 Beat 再开同一动作',
  ];

  // ── 新增：已用短语 → 禁止复用（去重）──
  const used = (state?.usedPhrases || []).filter(Boolean).slice(0, 5);
  if (used.length) {
    lines.push(`- 已用措辞（禁止复用）：${used.join('、')}`);
  }

  // ── 新增：交互循环计数 → 中段踏步合并 ──
  const loops = Number(state?.interactLoops) || 0;
  if (loops >= 2) {
    lines.push(`- 已循环 ${loops} 次「操作→痛苦→反馈」；本拍禁止再开同类交互，须把代价写成一个不可逆的转折或后果（合并且终结循环）`);
  }

  // ── 新增：生硬系统提示计数 → 主观化 ──
  const sysCount = Number(state?.systemLineCount) || 0;
  if (sysCount >= 1) {
    lines.push(`- 已出现 ${sysCount} 条系统原文；后续系统信息必须翻译成${profile?.pov || '角色'}的感知/情绪/身体反应，禁止再贴【...】原文`);
  }

  if (beatMemory?.lastAfterState) {
    lines.push(`- 上段 After：${clip(beatMemory.lastAfterState, 48)}`);
  }

  return lines.join('\n');
}

/**
 * 跨 Beat 一致性：身体矛盾 / 无过渡换场 / 重复首次 reveal / 动作链重演 / 修辞滥调
 * @returns {{ pass: boolean, issues: string[], rewriteHint: string }}
 */
export function validateCrossBeatConsistency(text = '', prevState = null, { sceneIndex = 1, beatOrder = 1, profile = null } = {}) {
  const issues = [];
  const t = String(text || '');
  const prev = prevState || createContinuityState();
  const order = Number(beatOrder) || 1;
  // 本书角色名单：来自书籍档案（03_character_bible + POV/出场）；缺省回退内置白名单
  const knownChars = profile?.characters?.length ? profile.characters : KNOWN_CHARACTERS;
  const povName = profile?.pov || '角色';

  // 1) 身体：已断肢却做完整主动作
  if (prev.leftArm === 'severed' || prev.leftArm === 'disabled') {
    if (/左臂.{0,6}(挥|抓|按|推|拉|握住)|左手.{0,6}(挥|抓|按|推|拉|握住|扣)/u.test(t)
      && !/残肢|断口|空空|残臂|义体 stump|残端/u.test(t)) {
      issues.push('CONSISTENCY: 左臂已损毁，禁止再写完整左手/左臂主动作（可用残端/另一侧）');
    }
    if (/机械左臂卡在承重柱|左手卡(在)?主控台/u.test(t) && prev.location && prev.location !== '浮空城坠落区' && prev.location !== '主控台') {
      issues.push('CONSISTENCY: 禁止重新写「左臂卡承重柱/主控台」式开场，应承接当前损伤状态');
    }
  }
  if (prev.rightArm === 'severed' || prev.rightArm === 'disabled') {
    if (/右臂.{0,6}(挥|抓|按|推|拉)|右手.{0,6}(挥|抓|按|推|拉|握住)/u.test(t)
      && !/残肢|断口|残端|空空/u.test(t)) {
      issues.push('CONSISTENCY: 右臂已损毁，禁止再写完整右手主动作');
    }
  }

  // 损伤回退：上一拍已 severed，本拍却写完好肢体
  if (prev.leftArm === 'severed' && /完好的左臂|健全的左手/u.test(t)) {
    issues.push('CONSISTENCY: 左臂损伤不可回退');
  }
  if (prev.rightArm === 'severed' && /完好的右臂|健全的右手/u.test(t)) {
    issues.push('CONSISTENCY: 右臂损伤不可回退');
  }

  // 2) 场景跳跃：已有位置，又突然「另一开场地点」且无过渡词
  const currLoc = extractLocationFromText(t);
  if (prev.location && currLoc && prev.location !== currLoc) {
    const hasBridge = /顺着|退到|爬向|拖到|转过|穿过|坠向|来到|回到|挪到|滚进|被甩/u.test(t)
      || /接着|随即|同时|就在这时/u.test(t);
    if (!hasBridge) {
      issues.push(`CONSISTENCY: 场景跳跃 ${prev.location} → ${currLoc} 无过渡，禁止重启开场`);
    }
  }

  // Scene>1 首拍禁止「整章濒死开场」复读（启发式）
  if (Number(sceneIndex) > 1 && /浮空城.{0,8}(坠落|崩塌|断裂).{0,20}(卡在|半截脊椎)/u.test(t)) {
    issues.push('CONSISTENCY: 非首 Scene 禁止重写「浮空城坠落卡柱」章开场');
  }

  // 3) 重复首次 reveal
  for (const row of REVEAL_KEY_PATTERNS) {
    if (!prev.revealed.includes(row.id)) continue;
    if (!row.re.test(t)) continue;
    if (FIRST_REVEAL_TONE.test(t) || /浮现|出现在视野|眼前出现|激活/u.test(t)) {
      issues.push(`REPEAT_REVEAL:「${row.label}」已揭示，禁止再写首次发现/突然激活语气；只写后果或推进`);
    }
  }

  // 4) 动作链重演：已发生动作又用同型开场/重写（多轨硬拼主因）
  if (order > 1 && prev.doneActions?.length) {
    const hits = extractActionMotifs(t, profile?.vocab).filter((id) => prev.doneActions.includes(id));
    const reopenEnv = hits.includes('furnace_env_open')
      || (prev.location === '焚化区' && /^(?:[^。\n]{0,4})?焚化(炉|区)的/u.test(t.trim()));
    const actionHits = hits.filter((id) => id !== 'furnace_env_open'
      && id !== 'data_orb'
      && id !== 'auth_press');
    // data_orb / auth_press 由 EVENT_LOOP 管：允许「继续操作」，禁止「再发现」
    if (actionHits.length) {
      const labels = actionHits
        .map((id) => ACTION_MOTIF_PATTERNS.find((r) => r.id === id)?.label || id);
      issues.push(`ACTION_REPLAY: 禁止重演已发生动作「${labels.join('、')}」；从上一句后果接着写下一动作`);
    } else if (reopenEnv && !/接着|随即|就在这时|同时|下一秒/u.test(t.slice(0, 40))) {
      issues.push('ACTION_REPLAY: 禁止用「焚化区的…」重新开场；直接承接上段动作后果');
    }
  }

  // 4b) 事件循环：已有活跃界面，又用「发现语气」重开同一界面
  if (order > 1 && prev.activeInterfaces?.length) {
    const prevIds = new Set(prev.activeInterfaces.map((x) => x.id));
    const again = extractInterfaces(t, profile?.vocab).filter((x) => prevIds.has(x.id));
    const rediscovery = REDISCOVERY_TONE.test(t)
      || /掌心向上——那团|悬在.{0,10}上方三寸|像一颗被剥|视野边缘跳出|权限令牌的虚影浮现/u.test(t);
    const advancedChoice = /按下|确认|锁定|拒绝|代价|烧|降级|输入|摁进|承受/u.test(t);
    if (again.length && rediscovery && !advancedChoice) {
      const labels = again.map((x) => x.label).join('、');
      issues.push(
        `EVENT_LOOP:「${labels}」已发现（相位=${prev.eventPhase || 'discovered'}）；禁止再发现/重描首次出现；须基于它做出选择、承担后果、推进下一步`,
      );
    }
    // 相位已 chose/costed 仍只盯着光团「看/悬着」而无操作
    if (
      (prev.eventPhase === 'chose' || prev.eventPhase === 'costed' || prev.eventPhase === 'advanced')
      && /盯着|悬在|像一颗|光纹在/u.test(t)
      && !/按下|确认|代价|倒计时|下一|推进|输入|烧/u.test(t)
    ) {
      issues.push('EVENT_LOOP: 选择/代价已发生，禁止回炉凝视界面；写后果推进或新危机');
    }
  }

  // 5) 「不是…是…」滥调（样本教坏 + 系统句式印记）
  const antiCount = countAntithesis(t);
  if (antiCount >= 2) {
    issues.push('STYLE: 本段「不是…是…」≥2 次；改成直接描写（一处对比即可，或不用）');
  } else if (antiCount >= 1 && order > 1) {
    issues.push('STYLE: 禁止连续 Beat 使用「不是…是…」；改成直述感官或动作');
  }

  // 6) 人味不足：只有机械动作/系统音，无可共情热度（Beat2+ 更严）
  if (order > 1 && !hasHumanHeat(t)) {
    // 机械动作+系统音比例高（UI 词≥2），且无情绪信号 → NPC 式流水账
    const uiHeavy = ((t.match(/系统|权限|面板|数据流|倒计时|提示音|校验|提示|界面|指令|激活|覆盖|绑定|锁定/g) || []).length >= 2);
    // 有伤势动作但纯粹「断→焦→渗」循环，无情绪 → 冷冰冰的伤口清单
    const mechanicalBlood = ((t.match(/断|焦|碳化|渗|烧|裂/g) || []).length >= 3)
      && !/恐惧|绝望|不甘|恨|拼了|赌|撑住|发抖|颤抖|咬牙/u.test(t);
    if (uiHeavy || mechanicalBlood) {
      issues.push(
        'NPC_HEAT: 机械动作/系统提示/伤势清单过多但无可共情热度；本拍必须补一处「活着的人的反应」：疼（写进身体）、脏话、或「不想死但不得不」的紧张对白，禁止只写机械动作+提示音。',
      );
    }
  }

  // 7) 重复短语去重：已用短语再次出现 → 强制换措辞
  if (order > 1 && (prev.usedPhrases || []).length) {
    const reused = extractRepeatPhrases(t).filter((p) => (prev.usedPhrases || []).includes(p));
    if (reused.length) {
      issues.push(`PHRASE_REUSE: 复用已用措辞「${reused.join('、')}」；换一种身体/感官/对白的写法，禁止原样复用`);
    }
  }

  // 8) 生硬系统提示原文：新增【...】数据行且未主观化 → 翻译成感知
  const rawSys = hasRawSystemLine(t);
  if (rawSys.length) {
    const alreadyPast = Number(prev.systemLineCount) >= 1;
    issues.push(
      `RAW_SYSTEM: ${alreadyPast ? '再次' : ''}贴出生硬系统原文「${rawSys[0].slice(0, 40)}」；改为${povName}的感知/情绪/身体反应（如：屏幕上那行字像烧红的烙铁烫进眼底），禁止直接引用系统格式`,
    );
  }

  // 9) 中段循环合并：交互循环已≥3 次仍继续「操作→痛苦→反馈」→ 强制合并终结
  const loops = Number(prev.interactLoops) || 0;
  if (loops >= 3 && isInteractLoop(t)) {
    issues.push(
      `LOOP_STALL: 「操作→痛苦→反馈」已循环 ${loops + 1} 次，中段原地踏步；本拍禁止再开同类交互，必须把代价写成一个不可逆的转折（截断/反噬/失败），或直接跳进下一危机`,
    );
  }

  // 10) 视角一致性：非首拍旁白出现第一人称「我」（叙述主语）→ 叙事事故
  if (order > 1 && hasNarratorFirstPerson(t)) {
    const firstPersonFrags = extractNarratorFirstPerson(t).slice(0, 3);
    issues.push(
      `POV_BREAK: 旁白出现第一人称（${firstPersonFrags.join('、')}）；全章固定第三人称叙述（用角色姓名/他），仅角色对白内可用「我」。把旁白「我」改写为第三人称。`,
    );
  }

  // 11) 角色名一致性：出现未登记人名 → 名字幻觉/矛盾（本书角色由书籍档案提供）
  const unknownNames = detectUnknownCharacterNames(t, knownChars);
  if (unknownNames.length) {
    issues.push(
      `NAME_DRIFT: 出现未登记角色名「${unknownNames.slice(0, 3).join('、')}」；本书角色只有 ${knownChars.join('、')}。若指已有角色必须用其登记名；若指他人改用已知角色或泛指（那个人/那道身影），禁止发明新名字。`,
    );
  }

  // 12) POV 信息旁白 dump：耳机/频道广播直接贴引语、未经 POV 感官呈现 → 改写
  // 保守判定：仅当「传来」后紧跟引号且无感知词（带着颤抖/声音/咬了牙…）才算裸播，避免误伤合法「频道里传来，带着牙关打颤」
  const DUMP_OPEN = /(耳机|通讯频道|频道|通讯器|耳麦)(里)?(传来|传出|传出声)/;
  const PERCEIVED_AFTER = /(听见|听到|声音|带着|颤抖|打颤|不稳|迟疑|哑|压低|急促|发颤|断了|破碎|闷|低沉|哭腔|咬牙|顿了顿|一丝|半截|尾音|发紧)/;
  const dumpMatch = DUMP_OPEN.exec(t);
  if (dumpMatch) {
    const after = t.slice(dumpMatch.index + dumpMatch[0].length, dumpMatch.index + dumpMatch[0].length + 18);
    if (!PERCEIVED_AFTER.test(after) && /[“"]/.test(after)) {
      issues.push(
        `POV_DUMP: 广播旁白直接贴信息（耳机/频道传来+引语）而未经${povName}感官呈现；改写为他听见对方声音里的颤抖/迟疑、或他看到的画面细节，禁止旁白广播 dump 与非 POV 视角直述`,
      );
    }
  }

  const pass = issues.length === 0;
  const rewriteHint = pass
    ? ''
    : [
      '【一致性错误】须与上文动作链/事件相位连续：',
      ...issues.slice(0, 5).map((x) => `- ${x}`),
      prev.location ? `- 当前位置应承接：${prev.location}` : '',
      prev.activeInterfaces?.length
        ? `- 活跃界面须操作勿重发现：${prev.activeInterfaces.map((x) => x.label).join('、')}（相位=${prev.eventPhase}）`
        : '',
      prev.doneActions?.length
        ? `- 已发生勿重演：${prev.doneActions.map((id) => ACTION_MOTIF_PATTERNS.find((r) => r.id === id)?.label || id).join('、')}`
        : '',
      prev.revealed?.length
        ? `- 已揭示勿复读：${prev.revealed.map((id) => REVEAL_KEY_PATTERNS.find((r) => r.id === id)?.label || id).join('、')}`
        : '',
      (prev.usedPhrases || []).length
        ? `- 已用措辞勿复用：${prev.usedPhrases.slice(0, 4).join('、')}`
        : '',
      Number(prev.systemLineCount) >= 1
        ? '- 系统信息须主观化：禁止【...】原文，翻译成感知/情绪/身体。'
        : '',
      '人称：全章第三人称叙述（角色姓名/他），旁白禁止「我/我的」，仅对白内可用「我」。',
      `角色名：只能使用设定角色（${knownChars.join('、')}）；禁止发明新名字。`,
      // 界面/交互循环语言只对「本书语境提及界面设定」的书出现，避免误导现实向书发明系统界面
      ...(gatesMatch(profile?.vocab, ['界面', '权限', '系统', '面板', '监控屏'])
        ? ['请重写：基于已发现界面 → 选择 → 代价 → 下一步；可对齐 Scene explicit goal（非 Character Dominance）。']
        : ['请重写：承接上一步动作与后果，推进选择/代价/下一步；可对齐 Scene explicit goal（非 Character Dominance）。']),
      '人味：补疼/脏话/紧张对白；禁止纯机械动作流水账。少用「不是A是B」。',
      ...(gatesMatch(profile?.vocab, ['界面', '权限', '系统', '面板', '监控屏'])
        ? ['精简：若上一拍已循环多次交互，本拍必须终结循环（不可逆转折或直接推进），禁止再来一轮「操作→痛苦→反馈」。']
        : []),
    ].filter(Boolean).join('\n');

  return { pass, issues, rewriteHint };
}

/**
 * 章目标 / Scene goal 瘦身：禁止把整段 pitch 塞进每个 Scene
 */
export function slimSceneGoalLine(raw = '', max = 42) {
  let s = String(raw || '').trim();
  if (!s) return '';
  // 去掉「建立 POV…当下目标：」外壳
  s = s.replace(/^承接上章情绪「[^」]*」/u, '')
    .replace(/^建立\s*POV[（(][^）)]+[）)]\s*当下目标[：:]/u, '')
    .replace(/^当下目标[：:]/u, '')
    .replace(/^进入现场并确立危机[：:]?/u, '')
    .replace(/^克服阻碍[：:]?/u, '')
    .trim();
  // 保留完整场景目标（具体计划内容），不再只取第一分句，避免丢失「尸潮战术/病毒植入」细节
  return clip(s, max);
}

/**
 * Scene-level goal 透传（非 Character Dominance）
 * S8.2-R4-C：仅显式 plan.priorityGoal / plan.goal / scene.goal；禁止 desire 竞争与假兜底。
 * @returns {{ priority: string, fear: string, stakes: string, deferred: string[] }}
 */
export function resolvePriorityDrive({
  scene = null,
  intent = null,
  executionPlan = null,
  desire = null,
  conflict = null,
} = {}) {
  const plan = executionPlan?.scenePlan || scene?.scenePlan || {};
  const desireObj = desire
    || executionPlan?.characterDesire
    || intent?.characterDesire
    || null;
  void conflict; // S8.2：conflict.cost 不得参与 drive 裁决
  void desireObj?.externalGoal; // R4-C：desire 不得压缩为 Scene goal
  void desireObj?.internalDesire;

  // S8.2：不做多方向评分压缩；显式 goal 透传；禁止 desire 竞争与假兜底目标
  const derivedPriority = String(plan.priorityGoal || '').trim();
  const explicitGoal = String(plan.goal || scene?.goal || '').trim();
  const explicitChoice = String(plan.choice || scene?.choice || '').trim();

  let priority = derivedPriority || explicitGoal || '';
  priority = priority.replace(/^(在|身处)[^，。]{2,18}[，。]/u, '').trim() || priority;

  const deferred = [];
  if (explicitChoice && explicitChoice !== priority) {
    deferred.push(slimSceneGoalLine(explicitChoice, 36) || explicitChoice);
  }

  // fear/stakes：仅显式字段；缺失保持空（禁止默认「死在这里」冒充人物事实）
  const fear = slimSceneGoalLine(
    String(plan.fear || scene?.fear || desireObj?.fear || '').trim(),
    32,
  ) || '';

  const stakes = slimSceneGoalLine(
    String(plan.consequence || scene?.consequence || '').trim(),
    32,
  ) || '';

  return { priority, fear, stakes, deferred };
}

/**
 * 每拍注入：Scene explicit goal（非 Character Dominance）
 * 无 priority → 整块省略（缺失 > 假完整）
 */
export function formatPriorityDriveBlock(drive = null, beat = null, continuityState = null) {
  if (!drive?.priority) return '';
  const structural = beat?.structuralBeat || beat?.id || '';
  const iface = continuityState?.activeInterfaces?.[0]?.label;
  const goal = drive.priority;
  const fearBit = drive.fear ? `（显式恐惧字段：${drive.fear}）` : '';
  const serve = {
    goal: `围绕 Scene goal「${goal}」写一个可见动作起跑${fearBit}`,
    obstacle: `Scene goal「${goal}」受阻——写阻力如何压迫现场${fearBit}`,
    choice: `若有显式 choice，文学化表达；Scene goal「${goal}」是场景约束，不是人物 Dominance 裁决${fearBit}`,
    consequence: `若有 authored consequence 则落地；Scene goal「${goal}」≠ 自动 Choice consequence`,
    newInformation: `新信息可关联 Scene goal「${goal}」${iface ? `（经由「${iface}」）` : ''}；勿平行另开无关任务线`,
    hook: `悬念可钉在 Scene goal「${goal}」尚未收束处`,
  }[structural] || `本拍推进可对齐 Scene goal「${goal}」（场景层约束，非人物 Dominance）`;

  const deferred = (() => {
    const uniq = [...new Set(
      (drive.deferred || []).map((s) => String(s).trim()).filter(Boolean),
    )].slice(0, 2);
    return uniq.length
      ? `- 其它显式输入（非被裁决掉的欲望）：${uniq.join('、')}`
      : '';
  })();

  return [
    '### Scene explicit goal（场景层；非 Character Dominance）',
    `- Scene explicit goal: ${goal}`,
    '- Scene-level goal; not a character-dominance judgment.',
    drive.fear ? `- Explicit fear field: ${drive.fear}` : '',
    drive.stakes ? `- Explicit stakes/consequence field: ${drive.stakes}` : '',
    deferred,
    `- 本拍：${serve}`,
    '- 人味：至少一处可读的痛感/紧张脏话/颤抖对白（非系统提示音）',
  ].filter(Boolean).join('\n');
}

/**
 * 启发式：正文是否有「人味热度」（痛感/脏话/紧张对白）
 * 门槛升级：仅「一个疼字」不算共情；必须同时具备
 *   ① 身体/痛感信号 ② 情绪信号（紧张对白 / 脏话 / 求生心理）至少其一
 * 否则视为 NPC 式纯机械动作+系统音。
 */
export function hasHumanHeat(text = '') {
  const t = String(text || '');
  // ① 身体/痛感信号（原始感官，含灼烧神经痛）
  const pain = /疼|痛|麻|恶心|喘|手抖|冷汗|眼前发黑|耳鸣|指甲抠|血|咬|闷哼|抽搐|冷汗|烧断|灼|焦痛/u.test(t);
  // ② 脏话（强烈情绪出口）
  const swear = /操|妈的|他妈|滚|该死|要命|老子|靠|艹|见鬼|王八|混账/u.test(t);
  // ③ 紧张/求生对白或心理（含祈使对白，如「锁定我」——人物主动发声即人味）
  const tensionTalk = /[「」『』].{0,24}(别|不能|撑|死|来不及|滚|妈的|操|停下|不行|我)/u.test(t)
    || /不想死|不能死|还不能|撑住|来不及了|必须撑住|还差一点|再快一点/u.test(t);
  // ④ 非系统音的情绪化内心（恐惧/愤怒/绝望/承担的直接信号）
  const emotionSignal = /恐惧|绝望|愤怒|恨|不甘|颤抖着|咬着牙|死死|拼了|赌一把|豁出去|承受|忍痛|硬撑/u.test(t);

  // 新门槛：必须有身体信号，且（脏话或紧张对白或情绪信号）至少一个
  return pain && (swear || tensionTalk || emotionSignal);
}

/**
 * 开场句整句复刻检测：对 beat 首句，迭代剔除最长公共子串，累计「复刻占比」。
 * 抓 7~10 字短意象短语跨场景复读（ch16「悬在确认键上方」×4：minLcs=10 的 LCS 与
 * 20 字窗口 trigram Jaccard 都够不着它——前者阈值过高，后者上下文不同被 Jaccard 稀释）。
 * 单一最长 LCS 对「一句话里叠两处复读」的 beat 会漏报（ch16 S4b3 首句由
 * 「盯着屏幕上那个倒计时」+「手指悬在确认键上方。」两段复刻拼成，占 87%），
 * 迭代剔除累计占比解决该问题。已用真实 ch16 24 beat 验证：命中 3 处复读、0 误报。
 */
export function findOpeningPhraseRecycle(text = '', baseText = '', minRun = 6, minCover = 0.5, hardRun = 7) {
  const c = String(text || '').replace(/\s/g, '');
  const opener = c.match(/^[^。！？!?]+[。！？!?]/u)?.[0] || c.slice(0, 24);
  const b = String(baseText || '').replace(/\s/g, '');
  if (!opener || opener.length < minRun || b.length < minRun) return null;
  let working = opener;
  const runs = [];
  let recycled = 0;
  for (let iter = 0; iter < 3 && working.length >= minRun; iter++) {
    const l = longestCommonSubstring(working, b);
    if (!l || l.length < minRun) break;
    runs.push(l);
    recycled += l.length;
    working = working.replace(l, '');
  }
  const ratio = recycled / opener.length;
  const maxRun = runs.length ? Math.max(...runs.map((r) => r.length)) : 0;
  // hardRun：开场句里单段 ≥ hardRun 字的原样复读（7 字 ≈ 「悬在确认键上方」级长意象）。
  // 场景动作类复读常被更长开场稀释，cover 法（recycled/opener）会漏——如
  // S3b1「林砚的拇指悬在确认键上方，屏幕上…」复刻 7 字但 cover 仅 ~12%。故加硬闸。
  if (hardRun && maxRun >= hardRun) {
    return { segment: runs[0], runs, cover: Math.round(ratio * 100), hardRun: true, maxRun };
  }
  if (ratio < minCover || !runs.length) return null;
  return { segment: runs[0], runs, cover: Math.round(ratio * 100) };
}
