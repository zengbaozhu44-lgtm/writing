# POST-R2 TOTAL STORY ROUTE RESCAN — Read-only Report

**Date**: 2026-10-08 · **Mode**: READ-ONLY（零代码/零设计）· **Evidence**: R2-EO DeepSeek clean batch 工件（10/10 章、40 场景、0 提取失败）+ 源码只读核验

---

## 0. 正式状态收敛（采纳女王状态表）

| 项目 | 状态 |
|------|------|
| EXTRACT-HARDEN R1 / R3 | IMPLEMENTED / VALIDATED |
| R2 Experience Consequence Split + Human Seal | IMPLEMENTED / VALIDATED / **CLOSED** |
| Extraction regression / DeepSeek production | PASS / PASS（10/10，0 failure） |
| Truth leakage / New Truth Carrier | NONE OBSERVED / NO |
| R2 semantic frontier | CLOSED |
| FIRST REAL BLOCKER | **NONE**（见 §4 严格判定） |
| WL-05 | NOT STARTED |

**两处修正正式采纳**：①State 表述修正——不是「Runtime 无 State Evolution」，而是 **07_state_board 无 runtime mutation；state-evolution-engine 真实存在且经 chapter-pipeline 执行 Actual→11_timeline/08**（本轮回查 engine 源码 `formatTimelineCandidate` 确认 Actual→timeline 流动，我此前「timeline 恒空」的说法有误，仅 `resolveTimelineEvents` 这一条 meta 通道为空）；②phase13 修复定性为**测试质量修正**（测试必须证明目标语义，不得借道另一个恰好失败的门伪装 PASS）——已立为标准。

## 1. 主干逐站扫描（Actual → … → State → SR）

| 站点 | 生产证据（R2-EO batch） | 状态 |
|------|------------------------|------|
| **Actual** | 95 事件 / 0 提取失败 / R1+R3+R2 三 Seal 齐备；41 例空 consequence 合法 | 🟢 |
| **Information Boundary / Perception / Interpretation → SR** | character_sr 10/10 章；SR omit 语义与 prompt 边界块在产；CW 投影（knowledge/belief/stance）活 | 🟢 |
| **Access / Agency → L1** | access_truth 持续产出；l1_eligibility 10/10；l1_evaluation sidecar 在产 | 🟢 |
| **L2** | 已封闭（L2-A 语义 / L2-B 负边界）——按设计冻结 | ⚪ 冻结 |
| **Choice** | NOT PROVEN——按裁决冻结，无消费者 | ⚪ 冻结 |
| **Action → Consequence（上层真相链）** | **DORMANT**：Intent asserted 1/40（仅 ch1，因 CH1 计划含 authored decision）；CharacterAction 0/40；WCT 0/40。级联原因 `no_cade → intent_not_asserted → character_action_not_asserted` | 🟡 内容缺口（见 §3-C） |
| **State** | 08 逐章写入（"第 10 章后"）；11_timeline Actual 流动真实存在（ch2+ 全为 `角色：动作` Actual 行）| 🟢（两处瑕疵见 §3-B） |
| **SR 存续 → Next Scene → Writer** | 章锚链 10/10；接缝块（Actual 回读/observed continuity/clock）在产 | 🟢 |

## 2. Character World 支线扫描

流动全通：T2 95 条（体验类 64%）、林逸 83 条 T2 + 1 条 T3 成型（authored seal）、苏眠 0 条（POV 隔离正确——她多数场外；见下述误归属）。

**生产实测缺陷（本轮新发现）：伪角色污染 world.json**——`他`、`他没来得及`、`苏眠已经`、`车门`、`”她忽然`、`”苏眠`、`才把攥紧的手`、`老周忽然把门`、`又` 等 **10 个非角色实体**作为 "characters" 入库并携带 T2（各 1–4 条）。根因链：确定性提取器的 speech/action 正则捕获伪主体（validator 只查 actors 非空，**不查名单**——actor 白名单只在 LLM 路径 gateCandidate）→ 事件 actors 并入 `rosterNames2` → `appendT2Experiences` 未过滤 → world.characters 污染。**实际伤害**：①苏眠的体验被误归到「苏眠已经/”苏眠」等伪名下（她本人 T2=0）——归属噪声破坏 character-isolation 的实效；②伪实体有 T2 累积，理论上可触发 T3 通道 A。**不阻塞**任何路线（SR 投影只按 pov/present 请求名单，伪名不会被投影）。

## 3. 四分类

**A. REAL BLOCKER：无**（严格定义：无任何生产/路由阻断——章完成 10/10，两条路线全通）。

**B. QUALITY LIMITATION**：
1. **CW 伪角色污染/体验误归属**（§2，生产实测，每 run 持续腐蚀存储——最重的质量缺陷）
2. 11_timeline 两瑕疵：ch1 day-1 混入**计划骨架模板条目**（legacy 通道，reality-golden bench 已作 witness 记录的污染类）；`day: null` 解析缺口（WL-01 时间限制家族）
3. 07_state_board / 15_npc_simulation book 级静态快照（stale 风险，记录在案）
4. 文学指标单 run 噪声——长弧文学验证属 WL-06 批量范畴（PENDING）

**C. SEMANTIC FRONTIER：无开放项**（R2 关门；L2/Choice 按设计冻结）。上层真相链 dormant 属**authored 内容缺口**而非语义前沿：CADE 通道是 authored-decision 门控（by design），ch2–10 计划未提供 authored decisions → Intent/CharacterAction/WCT 停摆；专用测试（eo-p4 套件 6 套全绿）证明 authored 输入在场时链路完整。

**D. FUTURE / PLANNED**：WL-05 CW Grounding；WL-06 批量文学验证；上层链的 authored decisions 内容供给（作者通道，非代码）。

## 4. 结论

- **FIRST REAL BLOCKER：NONE**
- **Truth Route 状态**：主干与 CW 支线全通；上层真相链（Action→Consequence）因 authored 输入缺位而 dormant（内容层，非阻塞）；State 演化真实在产。
- **下一安全执行点**：无 blocker 强制。但本轮 rescan 实测发现 **CW 伪角色污染**——它是 WL-05 将要构建的地基上的实时腐蚀。两个选项：
  - **(a)（建议）先开一个小型 Named EO**：actor 归属卫生（确定性路径 actor 白名单 + appendT2 roster 门控）——生产实证缺陷、修复面小、直接保护 CW 存储；
  - (b) 直接 WL-05，污染记录在案（不建议：grounding 会建在被污染的存储上）。
- **是否有必要进入 WL-05**：**非阻塞驱动**。按冻结纪律，WL-05 必须从真实生产文学问题出发；当前它仍是质量投资候选，且建议排在卫生 EO 之后。

**STOP——rescan 完毕，未设计 WL-05，未提议任何「为完整而做」的功能，等待裁决。**
