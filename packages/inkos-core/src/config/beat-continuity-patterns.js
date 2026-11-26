/**
 * Beat Continuity Patterns — 跨 Beat 动作/界面/揭示指纹配置
 *
 * 迁移自 packages/inkos-studio-server/src/writer-optimization/beat-continuity.js
 *
 * 设计原则：
 * - patterns 带 gates（书语境门控）：只有 vocab 命中 gates 才启用该规则
 * - 通用动作（无 gates）对所有书适用
 * - 支持 book 级覆盖（未来从 book 配置读取附加 patterns）
 *
 * 目标：消除《二手书店》/《青穹》等单书指纹硬编码，实现换书通用性。
 */

/** 关键 reveal 关键词（同一章内只允许「首次发现」一次） */
export const DEFAULT_REVEAL_KEY_PATTERNS = [
  { id: 'gm_auth', re: /GM\s*权限|世界管理员|管理员\s*GM|【?\s*GM|管理员权限|权限令牌|权限层级|权限等级/iu, label: 'GM/管理员权限', gates: ['管理员', 'GM', '权限'] },
  { id: 'loop_n', re: /第\s*[三四五六七八九十\d]+\s*次\s*循环|第\s*\d+\s*次循环/u, label: '循环次数', gates: ['循环'] },
  { id: 'rebirth', re: /重生|回溯时间|倒回/u, label: '重生/回溯', gates: ['重生', '回溯'] },
  { id: 'corp', re: /青穹重工|财团叛/u, label: '青穹/财团', gates: ['青穹', '财团'] },
  { id: 'sys_ui', re: /系统面板|监控屏|权限校验|认证身份|测试员·|非法访问/u, label: '系统界面', gates: ['系统面板', '监控屏', '权限校验', '认证身份', '权限'] },
];

/**
 * 动作链指纹：已发生则禁止下一 Beat 用同型动作「重开一轨」
 * gates 缺省 = 通用动作（任何书都适用）；带 gates = 该动作只在本书语境提及设定时才启用
 */
export const DEFAULT_ACTION_MOTIF_PATTERNS = [
  { id: 'hand_touch', re: /掌心.{0,14}(碰到|触到|压进)|伸手去(推|够|摸|按)|指腹.{0,8}(压|触)/u, label: '伸手触碰' },
  { id: 'hand_withdraw', re: /(猛地)?抽回手|下意识抽回/u, label: '抽回手' },
  { id: 'conveyor_jam', re: /传送带.{0,10}卡/u, label: '传送带卡住', gates: ['传送带'] },
  { id: 'kneel_ash', re: /单膝跪|跪在灰烬|跪在.{0,8}(地|灰|铁)/u, label: '跪地撑住' },
  { id: 'data_orb', re: /掌心.{0,10}(数据流|那团光|光团)|那团(数据流|光).{0,8}(跳|缩|冲|悬)/u, label: '掌心光团', gates: ['数据流', '光团'] },
  { id: 'bandage_stump', re: /(撕下|咬住).{0,12}(布|袖|护甲).{0,16}(缠|包扎)|断腕缠/u, label: '包扎断腕', gates: ['护甲', '断腕'] },
  { id: 'furnace_env_open', re: /^(?:[^。]{0,6})?焚化(炉|区)的(热浪|火舌|顶灯|灯管|指示灯|警报|铁门|灰烬)/mu, label: '焚化区环境重开', gates: ['焚化'] },
  { id: 'auth_press', re: /按下|确认|锁定我|输入.{0,6}(代码|权限)|把光团.{0,6}摁/u, label: '对界面操作/确认', gates: ['界面', '权限', '代码', '系统', '监控屏', '确认键'] },
  // 《二手书店》场景3 动作链（T1/T3 进度标记）：橘子/纸片/等你 在本书 vocab 里必然出现，
  // 任一命中即启用整组——已剥橘子/已喂猫/枯叶已夹书后，后续拍 prompt 的「已发生动作」自动注入，
  // 从机制上杜绝「每拍重开剥橘子」（ch1 scene3 六拍全重写同一开场）。
  { id: 'peel_orange', re: /剥(?!好|完|下).{0,20}(橘子|果肉|白络)|橘子.{0,4}剥/u, label: '剥橘子', gates: ['橘子', '纸片', '等你'] },
  { id: 'feed_cat', re: /喂.{0,8}(猫|'目录'|目录)|递给.{0,8}(猫|目录)|猫.{0,8}(舔|叼|吃|蹭)/u, label: '喂猫', gates: ['橘子', '纸片', '等你'] },
  { id: 'leaf_into_book', re: /枯叶.{0,14}(夹进|放进|落在)|(夹进|放进).{0,6}(《[^》]*》|书里)/u, label: '枯叶夹书', gates: ['橘子', '纸片', '等你'] },
  { id: 'close_shop_door', re: /掩上门|拉上门|推上门|关上门|门.{0,6}(合拢|落锁)/u, label: '关门', gates: ['橘子', '纸片', '等你'] },
  { id: 'slip_note', re: /(纸片|纸条).{0,10}(塞(?:出|进|入|给|到)|递|推|滑进)|(塞(?:出|进|入|给|到)|递|推|滑进).{0,10}(纸片|纸条)|门缝.{0,8}(塞(?:出|进|入|给|到)|递|推)/u, label: '塞纸片', gates: ['橘子', '纸片', '等你'] },
];

/** 已出现的「可操作界面/物件」——后续拍必须操作/选择/承担后果，禁止再「发现一个新界面」 */
export const DEFAULT_INTERFACE_PATTERNS = [
  { id: 'data_orb', re: /数据流|那团光|光团|活心脏/u, label: '掌心数据流', gates: ['数据流', '光团'] },
  { id: 'sys_panel', re: /系统面板|监控屏|屏幕|面板/u, label: '系统/监控屏', gates: ['系统面板', '监控屏', '权限'] },
  { id: 'auth_ui', re: /权限(令牌|层级|等级|校验|码)|管理员权限|认证身份|测试员/u, label: '权限界面', gates: ['权限', '管理员', '测试员'] },
  { id: 'admin_lock', re: /管理员.{0,6}锁|钥匙只剩|龙骨线|权限锁/u, label: '权限锁/密钥', gates: ['权限锁', '龙骨线', '钥匙只剩'] },
];

/** 「再次首次发现」语气 */
export const DEFAULT_REDISCOVERY_TONE = /第一次|首次|浮现|亮起|跳出一行|视野.{0,8}跳出|视网膜上|悬在.{0,8}上方|像一颗被剥|忽然出现|从未见过/u;

export const DEFAULT_FIRST_REVEAL_TONE = /第一次|首次|忽然出现|突然出现|从未见过|原来是|竟然是/u;
export const DEFAULT_ANTITHESIS_RE = /不是[^。！？\n]{0,24}[，,]?\s*是/gu;

export const EVENT_PHASES = ['setup', 'discovered', 'operating', 'chose', 'costed', 'advanced'];

/**
 * 获取 Beat Continuity Patterns（当前返回默认值，未来支持 book 覆盖）
 * @param {string} [bookDir]
 * @returns {object}
 */
export function getBeatContinuityPatterns(bookDir = null) {
  void bookDir;
  return {
    revealKeyPatterns: DEFAULT_REVEAL_KEY_PATTERNS,
    actionMotifPatterns: DEFAULT_ACTION_MOTIF_PATTERNS,
    interfacePatterns: DEFAULT_INTERFACE_PATTERNS,
    rediscoveryTone: DEFAULT_REDISCOVERY_TONE,
    firstRevealTone: DEFAULT_FIRST_REVEAL_TONE,
    antithesisRe: DEFAULT_ANTITHESIS_RE,
    eventPhases: EVENT_PHASES,
  };
}
