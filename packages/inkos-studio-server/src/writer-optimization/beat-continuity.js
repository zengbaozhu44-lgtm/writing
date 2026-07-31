/**
 * Beat Continuity — 跨 Beat 物理 / 地点 / 已揭示信息 / 已发生动作
 * Slim Prompt 注入状态摘要 + V2 之后硬闸
 */

/** 关键 reveal 关键词（同一章内只允许「首次发现」一次） */
export const REVEAL_KEY_PATTERNS = [
  { id: 'gm_auth', re: /GM\s*权限|世界管理员|管理员\s*GM|【?\s*GM|管理员权限|权限令牌|权限层级|权限等级/iu, label: 'GM/管理员权限' },
  { id: 'loop_n', re: /第\s*[三四五六七八九十\d]+\s*次\s*循环|第\s*\d+\s*次循环/u, label: '循环次数' },
  { id: 'rebirth', re: /重生|回溯时间|倒回/u, label: '重生/回溯' },
  { id: 'corp', re: /青穹重工|财团叛/u, label: '青穹/财团' },
  { id: 'sys_ui', re: /系统面板|监控屏|权限校验|认证身份|测试员·|非法访问/u, label: '系统界面' },
];

/**
 * 动作链指纹：已发生则禁止下一 Beat 用同型动作「重开一轨」
 */
export const ACTION_MOTIF_PATTERNS = [
  { id: 'hand_touch', re: /掌心.{0,14}(碰到|触到|压进)|伸手去(推|够|摸|按)|指腹.{0,8}(压|触)/u, label: '伸手触碰' },
  { id: 'hand_withdraw', re: /(猛地)?抽回手|下意识抽回/u, label: '抽回手' },
  { id: 'conveyor_jam', re: /传送带.{0,10}卡/u, label: '传送带卡住' },
  { id: 'kneel_ash', re: /单膝跪|跪在灰烬|跪在.{0,8}(地|灰|铁)/u, label: '跪地撑住' },
  { id: 'data_orb', re: /掌心.{0,10}(数据流|那团光|光团)|那团(数据流|光).{0,8}(跳|缩|冲|悬)/u, label: '掌心光团' },
  { id: 'bandage_stump', re: /(撕下|咬住).{0,12}(布|袖|护甲).{0,16}(缠|包扎)|断腕缠/u, label: '包扎断腕' },
  { id: 'furnace_env_open', re: /^(?:[^。]{0,6})?焚化(炉|区)的(热浪|火舌|顶灯|灯管|指示灯|警报|铁门|灰烬)/mu, label: '焚化区环境重开' },
  { id: 'auth_press', re: /按下|确认|锁定我|输入.{0,6}(代码|权限)|把光团.{0,6}摁/u, label: '对界面操作/确认' },
];

/** 已出现的「可操作界面/物件」——后续拍必须操作/选择/承担后果，禁止再「发现一个新界面」 */
export const INTERFACE_PATTERNS = [
  { id: 'data_orb', re: /数据流|那团光|光团|活心脏/u, label: '掌心数据流' },
  { id: 'sys_panel', re: /系统面板|监控屏|屏幕|面板/u, label: '系统/监控屏' },
  { id: 'auth_ui', re: /权限(令牌|层级|等级|校验|码)|管理员权限|认证身份|测试员/u, label: '权限界面' },
  { id: 'admin_lock', re: /管理员.{0,6}锁|钥匙只剩|龙骨线|权限锁/u, label: '权限锁/密钥' },
];

/** 「再次首次发现」语气 */
export const REDISCOVERY_TONE = /第一次|首次|浮现|亮起|跳出一行|视野.{0,8}跳出|视网膜上|悬在.{0,8}上方|像一颗被剥|忽然出现|从未见过/u;

const FIRST_REVEAL_TONE = /第一次|首次|忽然出现|突然出现|从未见过|原来是|竟然是/u;
const ANTITHESIS_RE = /不是[^。！？\n]{0,24}[，,]?\s*是/gu;

const EVENT_PHASES = ['setup', 'discovered', 'operating', 'chose', 'costed', 'advanced'];

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
  };
}

/** 抽取本段命中的动作指纹 id 列表 */
export function extractActionMotifs(text = '') {
  const t = String(text || '');
  const found = [];
  for (const row of ACTION_MOTIF_PATTERNS) {
    if (row.re.test(t)) found.push(row.id);
  }
  return found;
}

/** 抽取本段出现的可操作界面 */
export function extractInterfaces(text = '') {
  const t = String(text || '');
  const found = [];
  for (const row of INTERFACE_PATTERNS) {
    if (row.re.test(t)) found.push({ id: row.id, label: row.label });
  }
  return found;
}

/** 从正文推断事件相位推进（相对上一相位只升不降） */
export function inferEventPhase(text = '', prevPhase = 'setup') {
  const t = String(text || '');
  let next = prevPhase || 'setup';
  const rank = (p) => Math.max(0, EVENT_PHASES.indexOf(p));

  if (extractInterfaces(t).length && rank(next) < rank('discovered')) next = 'discovered';
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
export function formatEventPhaseDirective(state = null, beat = null) {
  const ifaces = state?.activeInterfaces || [];
  const phase = state?.eventPhase || 'setup';
  const structural = beat?.structuralBeat || beat?.id || '';
  const order = Number(beat?.order) || 1;

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
export function extractBodyStateFromText(text = '') {
  const t = String(text || '');
  const body = { leftArm: null, rightArm: null, legs: null, other: null };

  if (/左手\s*(没了|缺失|断|炸)|左臂.{0,16}(断|碎|没了|缺失)|机械左臂.{0,12}(断|碎|卡死)|左肘.{0,8}(下|以)?下?.{0,10}(没|断|焦)/u.test(t)) {
    body.leftArm = /没了|缺失|肘.{0,8}下|以下/u.test(t) ? 'severed' : 'disabled';
  } else if (/左臂|左手|机械左臂/u.test(t) && /液压|漏|火花|抽搐|卡/u.test(t)) {
    body.leftArm = 'damaged';
  }

  if (/右手\s*(没了|缺失|断)|右臂.{0,16}(断|碎|没了|缺失|废了)|右肘.{0,8}(下|以)?下?.{0,10}(没|断|焦)|右臂.{0,12}(剐掉|焦黑)/u.test(t)) {
    body.rightArm = /没了|缺失|肘.{0,8}下|废了|剐掉|以下/u.test(t) ? 'severed' : 'disabled';
  } else if (/右臂|右手/u.test(t) && /火花|痉挛|接口|焦/u.test(t)) {
    body.rightArm = 'damaged';
  }

  if (/膝盖以下没了|双腿.{0,6}(断|没)|右腿.{0,8}(卡死|断|缺失)|左腿.{0,8}(断|缺失)/u.test(t)) {
    body.legs = 'severed';
  } else if (/腿|膝|液压杆/u.test(t) && /卡死|废|断/u.test(t)) {
    body.legs = 'damaged';
  }

  if (/半截脊椎|脊椎.{0,6}断|左肺.{0,6}撕/u.test(t)) {
    body.other = 'critical';
  }

  return body;
}

export function extractLocationFromText(text = '') {
  const t = String(text || '');
  const hits = [
    [/焚化(炉|区)/u, '焚化区'],
    [/观测塔/u, '观测塔'],
    [/主控台|城主府/u, '主控台'],
    [/承重柱|龙骨|浮空城/u, '浮空城坠落区'],
    [/天台|垛口|城墙/u, '城墙/天台'],
    [/甲板|运兵舰|舰队/u, '舰队/甲板'],
    [/操作台|铸铁/u, '拘束操作台'],
  ];
  for (const [re, label] of hits) {
    if (re.test(t)) return label;
  }
  return null;
}

export function extractThreatFromText(text = '') {
  const t = String(text || '');
  if (/青穹|运兵舰|舰队|镭射炮/u.test(t)) return '青穹重工军事压力';
  if (/邪神|低语/u.test(t)) return '邪神低语侵蚀';
  if (/坠落|崩塌|龙骨断裂/u.test(t)) return '浮空城坠落';
  if (/倒计时|清除|锁定/u.test(t)) return '系统清除威胁';
  return null;
}

export function extractRevealedKeysFromText(text = '') {
  const t = String(text || '');
  const found = [];
  for (const row of REVEAL_KEY_PATTERNS) {
    if (row.re.test(t)) found.push(row.id);
  }
  return found;
}

const SEVERITY = { null: 0, damaged: 1, disabled: 2, severed: 3, critical: 3 };

/** 损伤只升不降；地点/威胁取最新非空；reveal / 动作 / 界面 / 事件相位累加 */
export function mergeContinuityState(prev, text = '', afterState = '') {
  const next = createContinuityState(prev);
  const body = extractBodyStateFromText(text);
  for (const key of ['leftArm', 'rightArm', 'legs', 'other']) {
    const incoming = body[key];
    if (!incoming) continue;
    if ((SEVERITY[incoming] || 0) >= (SEVERITY[next[key]] || 0)) {
      next[key] = incoming;
    }
  }
  const loc = extractLocationFromText(text);
  if (loc) next.location = loc;
  const threat = extractThreatFromText(text);
  if (threat) next.threat = threat;
  for (const id of extractRevealedKeysFromText(text)) {
    if (!next.revealed.includes(id)) next.revealed.push(id);
  }
  for (const id of extractActionMotifs(text)) {
    if (!next.doneActions.includes(id)) next.doneActions.push(id);
  }
  for (const iface of extractInterfaces(text)) {
    if (!next.activeInterfaces.some((x) => x.id === iface.id)) {
      next.activeInterfaces.push(iface);
    }
  }
  next.eventPhase = inferEventPhase(text, next.eventPhase);
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
 */
export function formatBeatContinuitySummary(state = null, beatMemory = null) {
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

  const lines = [
    '### 已完成状态摘要（必须继承，禁止重复开场/矛盾描写）',
    `- 身体：${bodyParts.length ? bodyParts.join('；') : '尚未确立损伤（勿无故重置重伤开场）'}`,
    `- 位置：${state?.location || '承接上文现场，禁止无过渡换场'}`,
    `- 已揭示：${revealedLabels.length ? `${revealedLabels.join('、')}（禁止再写「第一次发现」）` : '尚无关键 reveal'}`,
    `- 威胁：${state?.threat || clip(beatMemory?.lastAfterState, 40) || '承接上文压力'}`,
    ifaceLabels.length
      ? `- 活跃界面：${ifaceLabels.join('、')}（相位=${state?.eventPhase || 'discovered'}；禁止再「发现新界面」，须选择/操作/承担后果）`
      : '- 活跃界面：尚无；首次写出后锁定，后续拍禁止换皮重开发现',
    doneLabels.length
      ? `- 已发生动作（禁止重演/换皮重写）：${doneLabels.join('、')}`
      : '- 已发生动作：尚无；本段写出后不得在后续 Beat 再开同一动作',
  ];

  if (beatMemory?.lastAfterState) {
    lines.push(`- 上段 After：${clip(beatMemory.lastAfterState, 48)}`);
  }

  return lines.join('\n');
}

/**
 * 跨 Beat 一致性：身体矛盾 / 无过渡换场 / 重复首次 reveal / 动作链重演 / 修辞滥调
 * @returns {{ pass: boolean, issues: string[], rewriteHint: string }}
 */
export function validateCrossBeatConsistency(text = '', prevState = null, { sceneIndex = 1, beatOrder = 1 } = {}) {
  const issues = [];
  const t = String(text || '');
  const prev = prevState || createContinuityState();
  const order = Number(beatOrder) || 1;

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
    const hits = extractActionMotifs(t).filter((id) => prev.doneActions.includes(id));
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
    const again = extractInterfaces(t).filter((x) => prevIds.has(x.id));
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
    const uiHeavy = ((t.match(/系统|权限|面板|数据流|倒计时|提示音|校验/g) || []).length >= 2);
    const bloodHeavy = ((t.match(/血|断|焦|渗/g) || []).length >= 3);
    if (uiHeavy || bloodHeavy) {
      issues.push(
        'NPC_HEAT: 伤痛/系统描写过多但无可共情热度；补一处疼/脏话/紧张对白（「不想死但不得不」），禁止只写机械动作+提示音',
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
      '请重写：基于已发现界面 → 选择 → 代价 → 下一步，且动作必须服务「最高优先」目标。',
      '人味：补疼/脏话/紧张对白；禁止 NPC 式纯机械动作+系统提示音。少用「不是A是B」。',
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
  // 只取第一分句
  const cut = s.split(/[，。；;\n]/u)[0] || s;
  return clip(cut, max);
}

/**
 * 从章/Scene/欲望中抽出「此刻唯一最高优先」——解决目标链散焦
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
  const conflictObj = conflict
    || executionPlan?.conflict
    || plan.conflict
    || null;

  const candidates = [
    scene?.priorityGoal,
    plan.priorityGoal,
    executionPlan?.priorityGoal,
    scene?.immediateGoal,
    plan.choice,
    scene?.choice,
    plan.goal,
    scene?.goal,
    desireObj?.externalGoal,
    intent?.mainGoal,
    intent?.chapterIntent,
  ].map((x) => String(x || '').trim()).filter(Boolean);

  // 从文本里识别互斥目标，取第一个为优先，其余延后
  const ranked = [];
  const pushUnique = (label, score) => {
    if (!label || ranked.some((r) => r.label === label)) return;
    ranked.push({ label, score });
  };

  for (const c of candidates) {
    const t = c;
    if (/逃|撤|冲出|离开|活下去|不想死|撑到/u.test(t)) pushUnique(slimSceneGoalLine(t, 36) || '活着逃出当前死局', 100);
    if (/清除|删除|冗余|倒计时|阻止系统/u.test(t)) pushUnique(slimSceneGoalLine(t, 36) || '打断/逃过系统清除', 90);
    if (/权限|管理员|GM|觉醒|绑定/u.test(t)) pushUnique(slimSceneGoalLine(t, 36) || '拿稳权限并完成绑定', 80);
    if (/引爆|殉爆|炸|引擎核心/u.test(t)) pushUnique(slimSceneGoalLine(t, 36) || '引爆/殉爆换生路', 70);
    if (/低语|神魂|吞噬/u.test(t)) pushUnique(slimSceneGoalLine(t, 36) || '守住神魂不被低语吞掉', 85);
  }

  ranked.sort((a, b) => b.score - a.score);
  let priority = ranked[0]?.label || '';
  if (!priority && candidates[0]) priority = slimSceneGoalLine(candidates[0], 36);
  if (!priority) priority = '活着撑过这一拍的死局';

  const deferred = ranked.slice(1, 4).map((r) => r.label);

  const fear = slimSceneGoalLine(
    desireObj?.fear
    || conflictObj?.risk
    || conflictObj?.cost
    || scene?.fear
    || plan.fear
    || '死在这里、什么都改不了',
    32,
  );

  const stakes = slimSceneGoalLine(
    conflictObj?.cost
    || plan.consequence
    || scene?.consequence
    || desireObj?.wound
    || '付出血肉/权限/神魂代价',
    32,
  );

  return { priority, fear, stakes, deferred };
}

/**
 * 每拍注入：最高优先 + 恐惧 + 本拍如何服务该优先（人味驱动力）
 */
export function formatPriorityDriveBlock(drive = null, beat = null, continuityState = null) {
  if (!drive?.priority) return '';
  const structural = beat?.structuralBeat || beat?.id || '';
  const iface = continuityState?.activeInterfaces?.[0]?.label;
  const serve = {
    goal: `锁定「${drive.priority}」，用一个可见动作起跑`,
    obstacle: `「${drive.priority}」被卡住——写阻力如何逼出恐惧「${drive.fear}」`,
    choice: `为「${drive.priority}」做出带脏口/私人理由的选择（怕「${drive.fear}」仍要做）`,
    consequence: `选择的代价落地；疼要写进身体与脏话，服务「${drive.priority}」`,
    newInformation: `信息只服务「${drive.priority}」${iface ? `（经由「${iface}」反馈）` : ''}，勿平行新开另一条任务`,
    hook: `悬念钉在「${drive.priority}」未完成上`,
  }[structural] || `本拍每一个动作必须服务「${drive.priority}」，禁止平行开新任务`;

  const deferred = (drive.deferred || []).length
    ? `- 延后（本拍勿抢写）：${drive.deferred.join('、')}`
    : '';

  return [
    '### 目标链（唯一最高优先 — 禁止散焦）',
    `- 最高优先：${drive.priority}`,
    `- 此刻最怕：${drive.fear}`,
    `- 付得起的代价：${drive.stakes}`,
    deferred,
    `- 本拍：${serve}`,
    '- 人味：至少一处可读的痛感/紧张脏话/颤抖对白（非系统提示音）',
  ].filter(Boolean).join('\n');
}

/**
 * 启发式：正文是否有「人味热度」（痛感/脏话/紧张对白）
 */
export function hasHumanHeat(text = '') {
  const t = String(text || '');
  const pain = /疼|痛|麻|恶心|喘|咬牙|手抖|冷汗|眼前发黑|耳鸣|指甲抠/u.test(t);
  const swear = /操|妈的|他妈|滚|该死|要命|老子|靠|艹/u.test(t);
  const tensionTalk = /[「」『』].{0,24}(别|不能|撑|死|来不及|滚|妈的|操)/u.test(t)
    || /不想死|不能死|还不能|撑住|来不及了/u.test(t);
  return pain || swear || tensionTalk;
}
