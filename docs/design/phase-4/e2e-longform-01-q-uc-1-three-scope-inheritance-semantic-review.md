# Q-UC-1 — Three-Scope Inheritance Semantic Principles Review

**Status**: `THREE-SCOPE INHERITANCE SEMANTIC REVIEW COMPLETE — AWAITING HUMAN ADJUDICATION`
**Date**: 2026-11-01 · **Mode**: READ-ONLY SEMANTIC DESIGN REVIEW（零代码/零 Schema/零实现）
**Authority**: V2.2 FINAL + ERRATA · Q-UC-1 Packet · Rev2.1 · HS-7=SEALED A
**标注**: 〔V2.2〕冻结 · 〔SEALED〕Human 已裁 · 〔SEALED-P〕原则级已裁 · 〔Rev2.1〕已定义 · 〔GLM〕本轮推理 · 〔PEND〕待 Human 裁决

---

## A. 已冻结原则（仅列有权威依据的内容）

| # | 原则 | 来源 |
|---|---|---|
| F-1 | Q-UC-1-a=SEALED C：核心=Scene Required；召回=Beat Optional | 〔SEALED〕 |
| F-2 | Q-UC-1-b=SEALED-P：书级 authored 是 Required 源集权威来源；系统默认不覆盖作者指定；Planner 仅 Control 判断 | 〔SEALED-P〕 |
| F-3 | Q-UC-1-c=SEALED-P：违规响应按五维分级；BLOCK/DEGRADE/WARN 不统一应用 | 〔SEALED-P〕 |
| F-4 | Q-UC-1-d=SEALED-P：核心集保作者持续约束不可降级；召回不可独担核心 | 〔SEALED-P〕 |
| F-5 | HS-7=SEALED A：先裁继承语义原则→再定概念结构→最后 Schema | 〔SEALED〕 |
| F-6 | Core Inclusion ≠ Actual / Core ≠ Canon / Plan ≠ Actual / Prose ≠ Reality | 〔Rev2.1 §2.3〕 |
| F-7 | Character Knowledge State 受 Actual+Access 约束——Context Injection 或 Prose 不得直接授予 | 〔Rev2.1 §2.3〕 |
| F-8 | 三态区分：Context Control State / Narrative Intent State / Character Knowledge State——不可互相推导 | 〔Rev2.1 §2.3〕 |
| F-9 | V2.2 §4.2 层级继承规则（Book→Volume→Chapter→Scene 继承/细化/冲突/沉默降级）——**这是 Authorial Intent Contract 层的规则，非 Production Context Core 层**——但可参考 | 〔V2.2 §4.2〕 |
| F-10 | 09 authored_preserved 防洗白先例：authored 不被 generated 覆盖 | 〔FC S3.4〕 |

**注意**：V2.2 §4.2 已有继承/细化/冲突规则——但那是**Authorial Intent Contract 的意图层**规则（§4），而本轮讨论的是**Production Context Contract 的 Core 集继承**（§5 层）。两者不同层，不可混用，但语义原则可参考。

---

## B. 六类语义问题分析

### B-1 继承（Inheritance）

**当前已知事实**：
- V2.2 §4.2（意图层）：书级→卷级→章级→场景级默认继承，下级未声明时用上级〔V2.2〕
- Rev2.1 §2.1（Core 层）：Book Core 每章 Scene 首拍注入；Volume Core 当前卷内注入〔Rev2.1〕
- Q-UC-1-b：书级 authored 是 Required 权威来源〔SEALED-P〕

**候选原则**：

| 原则 | 内容 | 依据 |
|---|---|---|
| **I-1 默认继承** | Book Core 自动适用于全部 Volume/Scene，无需下层显式声明 | 〔GLM〕——与 V2.2 §4.2 意图层一致 |
| **I-2 显式继承** | Book Core 须由 Volume/Scene 显式声明继承才适用 | 〔GLM〕——更保守但增加配置负担 |
| **I-3 分层默认** | Book→Volume 默认继承；Volume→Scene 须 Scene 计划声明 | 〔GLM〕——折中 |

**方案差异**：I-1 最简（零配置负担）；I-2 最严（但实际书中几乎总是希望 Book 约束持续）；I-3 区分 Book 普适 vs Volume 阶段性。

**架构风险**：I-1 可能将 Book 约束注入已不适用的后期阶段（如「现代都市」进入穿越后古代章节）；I-2/I-3 需要额外的声明/判断机制。

**尚需裁决**：①默认继承是否为原则；②是否区分持续有效 vs 条件适用。

---

### B-2 补充（Addition）

**当前已知事实**：
- Rev2.1 §2.1：Volume-level Scoped Constraints 可包含阶段性势力变化/地点约束〔Rev2.1〕
- Scene-level Local Constraints 可包含局部背景/细节〔Rev2.1〕
- Q-UC-1-b：Planner 不可降级 authored Required〔SEALED-P〕

**候选原则**：

| 原则 | 内容 | 依据 |
|---|---|---|
| **A-1 自由补充** | Volume/Scene 可自由增加上层没有的局部约束 | 〔GLM〕——叙事上必要（不同阶段有不同约束） |
| **A-2 不越权补充** | Volume/Scene 可补充但不能与上层矛盾 | 〔GLM〕——与 V2.2 §4.2「细化不可否定上级」对齐 |
| **A-3 补充须声明** | 补充须显式声明（Schema 层问题——本轮不定 Schema） | 〔GLM〕 |

**关键问题**：新增局部约束是否意味着修改上层定义？
- **候选答案：否**——补充=在该作用域内增加约束，不修改 Book Core 的定义或持续适用性。Book 约束继续存在，Volume/Scene 约束叠加。〔GLM〕
- 但若补充与上层**矛盾**→进入 B-3 覆盖/B-4 冲突。

**尚需裁决**：补充是否允许与上层非矛盾性冲突。

---

### B-3 覆盖（Override）

**当前已知事实**：
- Q-UC-1-b SEALED-P：Planner 不可降级/删除/改写 authored Required〔SEALED-P〕
- V2.2 §4.2（意图层）：同层级 authored 覆盖派生〔V2.2〕
- Rev2.1 §2.5：作者修改自己的配置=Author Configuration Change（非 Planner 运行时调整）〔Rev2.1〕

**候选原则**：

| 原则 | 内容 | 依据 |
|---|---|---|
| **O-1 作者专属覆盖权** | 仅作者可通过 Author Configuration Change 覆盖 Book Core；Volume/Scene 计划不可覆盖 | 〔GLM〕——直接推自 SEALED-P b |
| **O-2 分层覆盖** | Volume 可覆盖 Book；Scene 可覆盖 Volume——但仅限非 authored Required | 〔GLM〕——允许阶段变化 |
| **O-3 绝对禁止** | Book Core 绝对不可覆盖（任何层） | 〔GLM〕——最保守 |

**关键判定**：SEALED-P b 已裁「Planner 不可降级 authored Required」——**这已隐含 O-1 的核心**（作者专属覆盖权）。但**Volume/Scene 对非 authored 系统默认项是否有覆盖权**尚未裁。

**尚需裁决**：①非 authored 系统默认项可否被 Volume/Scene 覆盖；②覆盖是「替代」还是「在本作用域暂停上级+用局部替代」。

---

### B-4 冲突（Conflict）

**当前已知事实**：
- V2.2 §4.2（意图层）：书级 Canon 不可被下级细化否定；跨层冲突=细化可改「如何」不可改「是什么」〔V2.2〕
- Q-UC-1-b SEALED-P：Planner 不可修改 authored Required〔SEALED-P〕

**冲突识别的类型**：

| 类型 | 定义 | 举例 |
|---|---|---|
| **真矛盾** | 两层对同一事实/规则给出不兼容声明 | Book：「无超自然」vs Volume：「主角觉醒魔法」 |
| **作用域不同** | 约束内容不同但各自作用域不同——非矛盾 | Book：「现代都市」+ Scene：「本场景在废弃仓库」 |
| **条件不同** | 约束在各自条件下成立——非必然矛盾 | Volume ch1-5：「主角不知道阴谋」vs ch6+：「主角已知阴谋」 |

**候选原则**：

| 原则 | 内容 | 依据 |
|---|---|---|
| **C-1 真矛盾上呈** | 真矛盾须上呈 Human/配置层裁决——不可 Planner 自行消解 | 〔GLM〕——与 SEALED-P b 一致 |
| **C-2 作用域不同=共存** | 识别为作用域不同→约束各自在各自范围内适用 | 〔GLM〕 |
| **C-3 条件不同=各时成立** | 识别为条件性→各条件分支下各自成立 | 〔GLM〕 |

**关键问题**：冲突识别本身（是哪类）由谁判定？
- 候选：系统提供冲突检测提示，但最终判定=作者（配置层）。Planner 不可裁决真矛盾。〔GLM〕

**尚需裁决**：①冲突识别的执行者；②真矛盾时是否阻止生成（BLOCK）或降级（DEGRADE）。

---

### B-5 退出与失效（Exit / Expiration）

**当前已知事实**：
- Rev2.1 §2.1：Volume Scoped=「范围外自动退出核心集」〔Rev2.1〕
- Scene Local=「仅在该 Scene 有效」〔Rev2.1〕
- Volume clues=「当前阶段的活跃线索」〔Rev2.1 §2.2〕

**候选原则**：

| 原则 | 内容 | 依据 |
|---|---|---|
| **E-1 范围自动退出** | Volume/Scene 约束在其作用域结束时自动退出 Core | 〔Rev2.1〕已定义 |
| **E-2 条件失效** | 条件性约束（如「线索未揭示」）在条件满足后失效 | 〔GLM〕——Rev2.1 §2.3 三态区分的自然推论 |
| **E-3 不影响 Book** | 局部约束退出不影响 Book 层持续约束 | 〔GLM〕——三层独立 |

**关键问题**：条件失效的判定（「线索已揭示」由谁判定？——Character Knowledge State 的 Actual+Access 结果？还是 Volume 计划的阶段标记？）
- 这与 B-2/B-4 的线索三态（约束在场/应否揭示/角色已获知）交叉。
- 候选：条件失效由 Narrative Intent State（Volume 计划的阶段标记）驱动，不由 Character Knowledge 驱动——因为 Core 层是 Control 不依赖 Character Knowledge。〔GLM〕

**尚需裁决**：条件失效的触发源（Narrative Intent 标记 vs Actual+Access 判定）。

---

### B-6 多来源合并（Multi-source Composition）

**当前已知事实**：
- 来源可来自：Authorial Intent（书级 authored）、系统默认、Planner Control（相关性判断）、既有 Truth（如 Character World）〔Rev2.1 §3.2〕
- V2.2 §5.2：冲突时权威层级决定（authored>derived>inferred）〔V2.2〕

**候选原则**：

| 原则 | 内容 | 依据 |
|---|---|---|
| **M-1 来源分类优先** | 不同 Authority 类别的来源冲突时——Truth 不被 Control 覆盖；authored Control 不被 Planner Control 覆盖 | 〔V2.2〕+〔SEALED-P b〕 |
| **M-2 同层不简单覆盖** | 同 Authority 层内的多来源冲突→须区分真矛盾 vs 作用域不同（回到 B-4） | 〔GLM〕 |
| **M-3 合并非替换** | 默认为叠加（AND）而非替换（OR）——除非明确声明替换关系 | 〔GLM〕 |

**关键区分**：Character World（Truth 来源）进入 Core 集时的地位——
- CW 内容是 Character Subjective（受 Actual+Access 约束）——它不应被 Book/Volume Control 约束覆盖
- 但 CW 的哪些内容适合进入 Core 集（而非仅作为 SR 投影）——**未定义**〔PEND〕

**尚需裁决**：①多来源合并的默认策略（叠加 vs 优先级）；②Truth 来源在 Core 中的地位。

---

## C. 三层作用域关系矩阵

### Book → Volume

| 维度 | 关系 | 依据 | 状态 |
|---|---|---|---|
| 继承 | Book Core 默认适用于全部 Volume | 〔GLM 候选 I-1〕 | 〔PEND〕 |
| 补充 | Volume 可增加阶段约束 | 〔Rev2.1 §2.1 已定义〕 | 设计已有 |
| 覆盖 | Volume 不可覆盖 authored Book Required；可覆盖非 authored 默认 | 〔SEALED-P b+GLM〕 | 部分已裁+部分〔PEND〕 |
| 冲突 | 真矛盾上呈；非矛盾各作用域成立 | 〔GLM〕 | 〔PEND〕 |
| 退出 | Book Core 无退出（全书持续） | 〔Rev2.1 §2.1〕 | 已定义 |

### Volume → Scene

| 维度 | 关系 | 依据 | 状态 |
|---|---|---|---|
| 继承 | Volume Core 默认适用于卷内全部 Scene | 〔Rev2.1 §2.1〕 | 已定义 |
| 补充 | Scene 可增加局部约束 | 〔Rev2.1 §2.1〕 | 已定义 |
| 覆盖 | Scene 不可覆盖 Volume Core；可覆盖非 Volume-Core 的可选项 | 〔GLM〕 | 〔PEND〕 |
| 冲突 | 同 Book→Volume | 〔GLM〕 | 〔PEND〕 |
| 退出 | Volume Core 在卷结束后退出 | 〔Rev2.1 §2.1〕 | 已定义 |

### Book → Scene（跳层）

| 维度 | 关系 | 依据 | 状态 |
|---|---|---|---|
| 继承 | Book Core 直接适用于每个 Scene（经 Volume 继承间接+直接） | 〔GLM〕——跳层继承是否需要显式规则 | 〔PEND〕 |
| 补充 | Scene 可直接增加局部约束 | 已定义 | 已定义 |
| 覆盖 | Scene 不可覆盖 Book authored Required | 〔SEALED-P b〕 | 已裁 |
| 冲突 | Book 与 Scene 直接冲突（Volume 未声明）→识别为真矛盾或作用域不同 | 〔GLM〕 | 〔PEND〕 |
| 退出 | Book Core 持续 | 已定义 | 已定义 |

---

## D. 边界与反例

### D-1 Book Core 与 Volume 局部要求冲突

**场景**：Book Core：「无超自然力量，纯悬疑」；Volume 3 计划引入微量异能元素。
**分析**：这是真矛盾（Book 对世界规则的持续声明 vs Volume 的局部声明）。
**候选处理**：识别为真矛盾→上呈→不允许 Planner 消解。作者须选择：(a) 修改 Book Core（Author Configuration Change）；(b) 修改 Volume 计划。
**边界检查**：Core Inclusion ≠ Actual ✓（约束在场不决定事件发生）；Planner 不可裁决 ✓。

### D-2 Volume 要求与 Scene 局部要求冲突

**场景**：Volume：「本章主角不知阴谋」；Scene 计划：「主角在本场发现线索」。
**分析**：可能是条件不同（Volume 条件=线索揭示前的阶段；Scene=揭示时刻到来）。也可能是真矛盾（Scene 超前揭示）。
**候选处理**：须先判定是哪类——这本身需要检查线索揭示的阶段标记（Narrative Intent State）。若为真矛盾→上呈。
**边界检查**：Plan ≠ Actual ✓；Character Knowledge 须 Actual+Access ✓（Volume 的「主角不知」是 Control 约束，非 Character Knowledge Truth——**但该约束的失效须与 Character Knowledge State 同步协调**——这是 B-5 的核心缺口）。

### D-3 Planner 认为某项不相关但 Author 标为 Required

**场景**：Author 将「雾河镇」标为 Book Core Required；Planner 判断某 Scene 与地点无关。
**分析**：SEALED-P b 已裁——**Planner 不可降级 authored Required**。
**处理**：Planner 可在召回池中排序（Control 权），但 Book Core Required 必须注入 Scene 首拍。
**边界检查**：Planner=Control ✓。

### D-4 条件性线索未到揭示阶段

**场景**：Volume 包含线索「钢筋检测报告」，阶段标记=ch7 才揭示；当前 ch3。
**分析**：Rev2.1 §2.2 已定义：线索约束=Core（保障存在）；揭示时机=Scene 级判定。三态区分适用：约束在场（Core）≠ 当前 Scene 应揭示（Narrative Intent）≠ 角色已获知（Character Knowledge）。
**处理**：ch3 的 Core 集包含「线索存在」的约束；不包含「线索内容/揭示」；Writer 不可提前写出揭示。
**边界检查**：三态不可互推 ✓。

### D-5 Scene 局部要求结束

**场景**：Scene 12 有局部约束「本场景断电，仅应急灯照明」；Scene 13 开始。
**分析**：Scene Local Constraint 在 Scene 12 结束后自动退出（E-1 已定义）。
**处理**：Scene 13 的 Core 集不含此约束——Writer 不可在 Scene 13 继续写「断电」除非新约束声明。
**边界检查**：退出不影响 Book ✓。

### D-6 Character 知道某事实但未获得对应 Actual + Access

**场景**：Writer 在 prose 中写了「林逸知道了真相」（prose 内事实）；但 Actual Events 中无提取事件+Character 无合法 Access。
**分析**：Character Knowledge State 须由 Actual+Access 约束——Writer prose 不授予 Knowledge。Prose ≠ Reality Authority。
**处理**：该「知道」不进入 Character Knowledge State。Core 层不受影响——这是 Truth 层的问题（提取+Access 判定），与 Core 继承无关。
**边界检查**：Prose ≠ Reality ✓；Character Knowledge 受 Actual+Access ✓。

---

## E. 待裁决清单

| # | 独立语义问题 | 选项 | 建议 |
|---|---|---|---|
| SI-1 | Book Core 是否默认继承到全部下层？ | I-1 默认 / I-2 显式 / I-3 分层默认 | I-1（最简且与意图层一致） |
| SI-2 | Volume/Scene 可否补充上层未规定的约束？ | A-1 自由 / A-2 不越权 | A-2 |
| SI-3 | 非 authored 系统默认项可否被 Volume/Scene 覆盖？ | O-2 可 / O-3 不可 | O-2（允许阶段变化但非 authored） |
| SI-4 | authored Book Required 可否被覆盖？ | 绝对不可 / 仅作者改配置 | 绝对不可（已隐含于 SEALED-P b） |
| SI-5 | 冲突识别的执行者是谁？ | 系统检测+作者最终 / 全手动 / 全自动 | 系统检测+提示→作者/配置层裁决 |
| SI-6 | 真矛盾时是否阻止生成？ | BLOCK / DEGRADE+上呈 / 仅 WARN | DEGRADE+上呈（生成可继续但留痕） |
| SI-7 | 条件失效的触发源是什么？ | Narrative Intent 阶段标记 / Actual+Access 判定 | Narrative Intent 标记（Core=Control 层） |
| SI-8 | 多来源合并的默认策略？ | M-3 叠加 / 优先级覆盖 | M-3 叠加 |
| SI-9 | Truth 来源在 Core 中的地位？ | 不进 Core / 进 Core 但不可被 Control 覆盖 | 进 Core 但不可被 Control 覆盖 |
| SI-10 | Book→Scene 跳层继承是否需要显式规则？ | 自然传递 / 须显式 | 自然传递 |

## F. Human Review 建议顺序

建议分三批裁决（避免一次性负担过大）：

**第一批（继承与覆盖——最基础）**：SI-1、SI-3、SI-4 → 确立基本继承框架
**第二批（冲突与补充——交互规则）**：SI-2、SI-5、SI-6 → 确立层间交互
**第三批（失效与多来源——边界情况）**：SI-7、SI-8、SI-9、SI-10 → 确立边界处理

---

## G. 状态检查

| 检查 | 结果 |
|---|---|
| 本轮未选择任何候选原则作为正式裁决 | ✓ |
| 未代替 Human Seal | ✓ |
| 未修改 Packet/Rev2.1/V2.2 | ✓ |
| 未设计 Schema/字段/接口 | ✓ |
| 未提出 Named EO | ✓ |
| 未实现任何继承逻辑 | ✓ |
| 未启动 AN-1 或 Q-UC-2 | ✓ |
| 所有架构边界保持（Core≠Actual 等） | ✓ |

---

> **THREE-SCOPE INHERITANCE SEMANTIC REVIEW COMPLETE — AWAITING HUMAN ADJUDICATION**
