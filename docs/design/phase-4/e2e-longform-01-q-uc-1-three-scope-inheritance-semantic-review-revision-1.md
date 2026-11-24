# Q-UC-1 — Three-Scope Inheritance Semantic Review · Revision 1

**Status**: `THREE-SCOPE INHERITANCE SEMANTIC REVIEW REVISION 1 COMPLETE — AWAITING HUMAN REVIEW`
**Date**: 2026-11-01 · **Mode**: READ-ONLY SEMANTIC REVIEW REVISION（零代码/零 Schema/零实现/零 Seal）
**Authority**: V2.2 FINAL + ERRATA · Q-UC-1 Packet · Rev2.1 · HS-7=SEALED A · Character World 冻结架构
**前置**: 原 Rev0（`e2e-longform-01-q-uc-1-three-scope-inheritance-semantic-review.md`）保留为历史
**标注**: 〔V2.2〕冻结 · 〔SEALED〕Human 已裁 · 〔SEALED-P〕原则级已裁 · 〔CW-FC〕Character World 冻结契约 · 〔Rev2.1〕已定义 · 〔GLM〕本轮推理 · 〔PEND〕待 Human 裁决 · 〔ALREADY SEALED〕已有 Seal 覆盖（不重复裁）

## Rev0 → Rev1 修改对照表

| 项 | Rev0 问题 | Rev1 修正 |
|---|---|---|
| R1 | SI-1 未区分语义继承与运行时注入 | 拆为 Semantic Applicability / Production Context Inclusion / Beat-level Continued Availability 三层 |
| R2 | SI-4 将 SEALED-P b 扩大解释为作者永远不能改 Book Core | 区分 Planner 禁降 / Author Config Change / 系统默认修改 / Book Core 语义持续性四概念；ALREADY SEALED 标注 |
| R3 | SI-7 未拆条件类型 | 拆为计划性/实际发生/Character Knowledge 三类 |
| R4 | SI-8/9 用简单 AND/OR + CW 直通 Core | 遵守 CW 冻结链；区分 CW 原始内容 vs 合法 Projection 结果 |
| R5 | SI 顺序未审依赖 | 依赖图+修正顺序 |

---

## A. 已冻结原则（修正版——12 项）

| # | 原则 | 来源 | Rev0→Rev1 变化 |
|---|---|---|---|
| F-1 | Q-UC-1-a=SEALED C：核心=Scene Required；召回=Beat Optional | 〔SEALED〕 | 不变 |
| F-2 | Q-UC-1-b=SEALED-P：书级 authored 是 Required 源集权威来源；系统默认不覆盖作者指定；**Planner 仅 Control 判断不可降级/删除/改写 authored Required** | 〔SEALED-P〕 | 不变（但 R2 澄清适用范围） |
| F-3 | Q-UC-1-c=SEALED-P：违规响应按五维分级 | 〔SEALED-P〕 | 不变 |
| F-4 | Q-UC-1-d=SEALED-P：核心保持续约束不可降级；召回不可独担核心 | 〔SEALED-P〕 | 不变 |
| F-5 | HS-7=SEALED A：先裁继承语义原则→再定概念结构→最后 Schema | 〔SEALED〕 | 不变 |
| F-6 | Core Inclusion ≠ Actual / Core ≠ Canon / Plan ≠ Actual / Prose ≠ Reality | 〔Rev2.1 §2.3〕 | 不变 |
| F-7 | Character Knowledge State 受 Actual+Access 约束 | 〔Rev2.1 §2.3〕+〔CW-FC〕 | 不变 |
| F-8 | 三态区分：Context Control / Narrative Intent / Character Knowledge——不可互推 | 〔Rev2.1 §2.3〕 | 不变 |
| F-9 | V2.2 §4.2 意图层继承规则（书→卷→章→景默认继承/细化/冲突）——**意图层规则，非 Production Context Core 层**，可参考不可混用 | 〔V2.2 §4.2〕 | 不变（标注强化） |
| F-10 | 09 authored_preserved 防洗白先例 | 〔V2.2 FC S3.4〕 | 不变 |
| **F-11（新）** | **Character World 冻结链**：ACTUAL → Access/IB → T2 Experience → Character World → Projection → SR(t) → Writer——CW 是受 Actual+Access 约束的角色长期经验/主观形成载体，不是通用 Truth 数据库 | 〔CW-FC〕 | Rev1 新增（R4） |
| **F-12（新）** | **Scene Initial Inclusion PASS ≠ Scene Full Compliance PASS；NOT_OBSERVED ≠ INCLUDED** | 〔SEALED〕+〔V2.2〕 | Rev1 新增（R1 依赖） |

### F-2 适用范围澄清（R2）

SEALED-P b 裁定的是：**Planner（Control 层运行时组件）不可降级/删除/改写 authored Required**。它**没有**裁定：
- 作者本人是否可以修改 Book Core（=Author Configuration Change，作者固有权利，不同于 Planner 降级）
- 系统默认项（非 authored）是否可被修改/覆盖
- Book Core 的语义持续性（是否一旦设定就全书不可变）

这四概念的关系：

| 概念 | 定义 | 权威 | 状态 |
|---|---|---|---|
| Planner 禁降 | 运行时 Control 组件不可修改 authored Required | **ALREADY SEALED**（SEALED-P b） | 已裁——不重复裁 |
| Author Configuration Change | 作者本人显式修改自己的配置 | 作者固有（Authorial Source） | 原则已有（Rev2.1 §2.5）——具体流程未定 |
| 系统默认项修改 | 非 authored 默认值的调整 | 系统维护者 / 后续 Named EO | 〔PEND〕 |
| Book Core 语义持续性 | Book Core 是否全书持续不可变 | — | 〔PEND〕（与 SI-1 相关） |

---

## B. 六类语义问题分析（修正版）

### B-1 继承（修正 per R1）

Rev0 未区分「语义继承」与「运行时注入」——Rev1 拆为三层：

| 层 | 定义 | 时机 | 证据可观测性 |
|---|---|---|---|
| **Semantic Applicability** | 上层约束**在语义上**是否适用于下层 | 设计/配置层 | 静态可判 |
| **Production Context Inclusion** | 适用约束**实际进入**某次 Scene/Beat 的 Production Context | Scene 首拍 / Beat 层 | Manifest 七态 |
| **Beat-level Continued Availability** | 首拍注入后**后续 Beat** 是否持续可用 | Beat 2+ | 当前 NOT_OBSERVED（V2.2 已声明） |

**关键不可推导线**：
- 不可从 Semantic Applicability 推导 Production Context Inclusion（语义适用≠每次实际注入）
- 不可从 Scene 首拍 Inclusion PASS 推导 Beat 持续可用（F-12 铁律）
- 不可从 Beat NOT_OBSERVED 推导语义不适用（NOT_OBSERVED≠证据缺失→≠INCLUDED≠不适用）

**修正后候选原则**：

| 原则 | 内容（修正后） | 层级 |
|---|---|---|
| **I-1a 语义默认适用** | Book Core 在**语义上**默认适用于全部下层 | Semantic Applicability |
| **I-1b 注入按 C 方案** | Scene 首拍注入核心集（Core=Scene Required） | Production Context Inclusion〔SEALED a〕 |
| **I-1c Beat 持续可用=不可证** | 首拍注入后 Beat 2+ 的持续可用当前不可观测 | Beat-level Continued Availability〔V2.2〕 |

**尚需裁决（修正后）**：I-1a 语义默认适用是否为原则（即：语义层是否需要显式声明继承，还是默认适用）。

---

### B-2 补充（不变，微调表述）

与 Rev0 相同：Volume/Scene 可补充上层未规定的局部约束（A-1 自由 / A-2 不越权）。补充不修改上层定义。新增与上层非矛盾→共存；矛盾→进入 B-3/B-4。

尚需裁决：补充是否允许与上层非矛盾性冲突（同 Rev0）。

---

### B-3 覆盖（修正 per R2）

Rev0 SI-4 将 SEALED-P b 扩大解释——Rev1 修正为四概念区分（见 A §F-2 澄清）。

**修正后候选原则**：

| 原则 | 内容 | 依据 | 状态 |
|---|---|---|---|
| **O-1 Planner 禁降 authored** | **ALREADY SEALED**（SEALED-P b）——不重复裁 | 〔SEALED-P〕 | **已裁** |
| **O-2 Volume/Scene 可覆盖非 authored 默认项** | 允许阶段变化（覆盖系统默认但不可覆盖 authored） | 〔GLM〕 | 〔PEND〕 |
| **O-3 作者可修改自己的 Book Core** | Author Configuration Change（显式、留记录、非运行时） | 〔Rev2.1 §2.5〕+〔GLM〕 | 原则级已有——流程〔PEND〕 |
| **O-4 Book Core 语义持续性** | Book Core 是否一旦设定就全书不可变（vs 作者可按需修改） | 〔GLM〕 | 〔PEND〕 |

---

### B-4 冲突（不变）

与 Rev0 相同：三类冲突（真矛盾/作用域不同/条件不同）+ 候选 C-1/C-2/C-3。尚需裁决冲突识别执行者+真矛盾响应级别。

---

### B-5 退出与失效（修正 per R3）

Rev0 未拆条件类型——Rev1 拆为三类：

| 条件类型 | 定义 | 触发源 | 效果 |
|---|---|---|---|
| **计划性条件** | Narrative Intent 层的阶段标记（如「ch7 揭示线索」） | Volume/章计划 | Core 中「线索约束存在」在阶段内持续；阶段到后约束不退出但揭示义务启动 |
| **实际发生条件** | Actual Events 层的事件（如「线索已被提取为 Actual」） | Actual 提取+validator | 可能影响计划性条件的推进判断 |
| **Character Knowledge 条件** | 角色是否合法获知（Actual+Access→T2→CW→SR） | CW 冻结链 | Character Knowledge 变化不影响 Core 约束——Core=Control 层 |

**关键不可推导线**：
- **Narrative Intent 不得证明 Actual 已发生**——计划标记「ch7 揭示」≠ch7 正文已揭示
- **Narrative Intent 不得授予 Character Knowledge**——计划「主角知道」≠角色已获知
- **Character Knowledge 继续受 Actual+Access 约束**〔CW-FC〕

**修正后候选原则**：

| 原则 | 内容 | 依据 |
|---|---|---|
| **E-1 范围自动退出** | Volume/Scene 约束在作用域结束时退出 Core | 〔Rev2.1〕（不变） |
| **E-2a 计划性条件驱动阶段** | 计划性条件由 Narrative Intent 阶段标记驱动——非由 Actual 或 Character Knowledge 驱动 | 〔GLM〕 |
| **E-2b Actual 条件经提取判定** | 实际发生条件须经 Actual 提取+validator——不由计划直接证明 | 〔V2.2 Plan≠Actual〕 |
| **E-2c Character Knowledge 不驱动 Core 失效** | 角色是否知道不影响 Core 约束的存在——Core=Control | 〔CW-FC〕+〔Rev2.1 §2.3〕 |
| **E-3 不影响 Book** | 局部退出不影响 Book 持续 | 〔GLM〕（不变） |

---

### B-6 多来源合并（修正 per R4）

Rev0 用简单 AND/OR + CW 直通 Core——Rev1 修正：

**Character World 边界（修正核心）**：

CW 冻结链〔CW-FC〕：ACTUAL → Access/IB → T2 Experience → Character World → Projection → SR(t) → Writer

**CW 不是通用 Core Truth 来源**。若 CW 内容进入 Production Context，须区分：
1. **CW 原始内容**（world.json 中的 T2/T3/knowledge/belief）——**不直接进 Core**（受 Actual+Access 约束的角色主观）
2. **合法 Projection 结果**（经 projectWorldToSRScene → SR 槽）——**SR 槽内容**可被 Compiler 消费进 basePrompt → 进入 Production Context——这是**既有通道**（非新 Core 直通）

**修正后候选原则**：

| 原则 | 内容 | 依据 |
|---|---|---|
| **M-1 来源分类权威** | Truth 不被 Control 覆盖；authored Control 不被 Planner Control 覆盖 | 〔V2.2〕+〔SEALED-P b〕（不变） |
| **M-2 同层冲突→B-4** | 同 Authority 层内冲突→按 B-4 三类识别 | 〔GLM〕（不变） |
| **M-3 默认叠加+非简单 AND/OR** | 合并默认叠加，但叠加须结合来源权威/作用域/条件/语义兼容性综合判断——**不是机械 AND 也不是优先级 OR** | 〔GLM〕修正 |
| **M-4a CW 原始内容不直通 Core** | CW 的 world.json 内容不直接作为 Core Truth 来源 | 〔CW-FC〕 |
| **M-4b CW 经 Projection 进 SR** | CW 内容经合法 Projection → SR 槽 → Compiler → basePrompt——这是既有通道（非新设计） | 〔CW-FC〕+〔CODE〕 |

---

## C. 三层作用域关系矩阵（修正版）

### Book → Volume

| 维度 | 关系 | 层级 | 依据 | 状态 |
|---|---|---|---|---|
| 语义适用 | Book Core 语义默认适用于全部 Volume | Semantic Applicability | 〔GLM I-1a〕 | 〔PEND〕 |
| 上下文注入 | Book Core 注入当前卷 Scene 首拍 | Production Context Inclusion | 〔SEALED a〕C 方案 | 已裁 |
| Beat 可用 | 首拍后 Beat 2+ 持续可用=不可证 | Beat-level | 〔V2.2〕 | 已声明 |
| 覆盖 | Planner 禁降 authored=ALREADY SEALED；Volume 可覆盖非 authored 默认=〔PEND〕 | 覆盖 | 混合 | 混合 |
| 冲突 | 真矛盾上呈 | 冲突 | 〔GLM〕 | 〔PEND〕 |
| 退出 | Book Core 无退出 | 退出 | 〔Rev2.1〕 | 已定义 |

### Volume → Scene / Book → Scene（跳层）

与 Rev0 结构相同——但每个维度均按 R1 三层拆分标注。跳层继承：Book Core 经 Volume 间接+直接到达 Scene——是否需要显式跳层规则仍〔PEND〕。

---

## D. 边界与反例（修正版）

### D-1~D-3, D-5, D-6（与 Rev0 相同——修正表述对齐 R1/R2/R3 但结论不变）

### D-4 条件性线索未到揭示阶段（修正 per R3）

**场景**：Volume 含线索「钢筋检测报告」；计划标记=ch7 揭示；当前 ch3。
**修正分析**（三态+三类条件）：
- **计划性条件**：阶段标记「ch7 揭示」→ch3 的 Core 含「线索存在」约束但不含「线索内容/揭示义务」
- **实际发生条件**：ch3 正文尚未提取线索相关 Actual → 无实际揭示
- **Character Knowledge 条件**：角色无合法 Access → 不知道线索内容
- 三类条件独立——计划不证明 Actual 已发生（E-2b）；Character Knowledge 不影响 Core（E-2c）
**处理**：ch3 Core 集含线索存在约束；Writer 不可提前揭示。边界全部保持。

---

## E. 修正后 SI 问题清单

| # | 独立语义问题 | 选项 | Rev0→Rev1 变化 | 依据 |
|---|---|---|---|---|
| **SI-1** | Book Core **语义上**是否默认适用于全部下层？ | I-1a 默认适用 / I-2 显式声明 / I-3 分层默认 | 修正：限定为 Semantic Applicability 层——不含注入与持续可用（后者已被 SEALED a+V2.2 铁律覆盖） | 〔GLM〕+〔PEND〕 |
| SI-2 | Volume/Scene 可否补充上层未规定的约束？ | A-1 自由 / A-2 不越权 | 不变 | 〔GLM〕+〔PEND〕 |
| SI-3 | 非 authored 系统默认项可否被 Volume/Scene 覆盖？ | O-2 可 / O-3 不可 | 不变（依赖来源分类=依赖 SI-1+SI-4） | 〔GLM〕+〔PEND〕 |
| **SI-4** | ~~authored Book Required 可否被覆盖~~ | — | **修正：Planner 禁降部分=ALREADY SEALED 不重复裁**；剩余=O-3 作者改配置流程+O-4 Book Core 语义持续性 | 〔SEALED-P b〕+〔PEND O-3/O-4〕 |
| SI-5 | 冲突识别的执行者是谁？ | 系统检测+作者裁决 / 全手动 / 全自动 | 不变 | 〔GLM〕+〔PEND〕 |
| SI-6 | 真矛盾时是否阻止生成？ | BLOCK / DEGRADE+上呈 / WARN | 不变 | 〔GLM〕+〔PEND〕 |
| **SI-7** | 条件失效的触发源？ | ~~Narrative Intent vs Actual+Access~~ | **修正：拆为三类**——E-2a 计划性（Narrative Intent 阶段标记）/ E-2b 实际发生（Actual 提取）/ E-2c 认知（CW 链）——各自独立裁决 | 〔GLM〕+〔CW-FC〕+〔PEND〕 |
| **SI-8** | 多来源合并的默认策略？ | ~~M-3 叠加 / 优先级覆盖~~ | **修正：非简单 AND/OR**——叠加须结合权威/作用域/条件/语义兼容性综合判断 | 〔GLM〕+〔PEND〕 |
| **SI-9** | CW 在 Core 中的地位？ | ~~不进 Core / 进 Core 不可被覆盖~~ | **修正：CW 原始内容不直通 Core（M-4a）；CW 经 Projection→SR→Compiler 是既有通道（M-4b）** | 〔CW-FC〕+〔PEND〕 |
| SI-10 | Book→Scene 跳层继承是否需显式规则？ | 自然传递 / 须显式 | 不变（依赖 SI-1+SI-3） | 〔GLM〕+〔PEND〕 |

### SI 依赖图（R5）

```
SI-1（语义适用原则）────────────────┐
  │                                │
  ├→ SI-3（非 authored 覆盖）──→ SI-10（跳层规则）──→ [概念结构/Schema 层]
  │         ↑                      │
  │         │                      │
SI-4（ALREADY SEALED 部分 + O-3/O-4 剩余）          │
  │                                                │
  ├→ SI-2（补充规则）─→ SI-5（冲突识别）─→ SI-6（真矛盾响应）─→ [交互规则层]
  │
  └→ SI-7（三类条件失效）─→ SI-8（多来源合并）─→ SI-9（CW 边界）─→ [边界处理层]
```

**关键依赖**：
- SI-3 依赖 SI-1（须先定语义适用原则才能定覆盖范围）
- SI-10 依赖 SI-1+SI-3（跳层规则须先有基本继承+覆盖）
- SI-7 依赖 SI-2（条件性补充是补充的子类）
- SI-8 与 SI-9 **应分开裁**（SI-8=合并策略通用原则 / SI-9=CW 特定边界——性质不同）

### 三项额外纳入检查

| 问题 | 是否需新增 SI | 建议 |
|---|---|---|
| Semantic Applicability vs Production Context Inclusion 区别 | **否**——已纳入 SI-1 修正（三层拆分） | 不新增 |
| Author Configuration Change 权限边界 | **否**——已纳入 SI-4 修正（O-3/O-4） | 不新增 |
| CW Projection 与 Core 边界 | **否**——已纳入 SI-9 修正（M-4a/M-4b） | 不新增 |

---

## F. 修正后 Human Review 建议顺序

```
第一批（基础继承）: SI-1 → SI-4 剩余（O-3/O-4） → SI-3
第二批（交互规则）: SI-2 → SI-5 → SI-6
第三批（边界处理）: SI-7（三类分开裁）→ SI-8 → SI-9 → SI-10
```

修正说明：SI-4 从第一批头部移到第一批第二位（因 ALREADY SEALED 部分不须裁——仅剩 O-3/O-4）；SI-7 三类分开裁减负担；SI-10 明确依赖 SI-1+SI-3。

---

## G. 状态检查

| 检查 | 结果 |
|---|---|
| 未替 Human 选择候选原则 | ✓ |
| 未新增 Human Seal | ✓ |
| 未修改 Packet/Rev2.1/V2.2 | ✓ |
| 未创建 Schema/字段/接口 | ✓ |
| 未提出 Named EO | ✓ |
| 未写代码 | ✓ |
| 未启动 AN-1 或 Q-UC-2 | ✓ |
| PD 未写成冻结契约 | ✓ |
| ALREADY SEALED 部分不重复裁 | ✓（SI-4 Planner 禁降标注） |
| CW 冻结链完整遵守 | ✓（B-6/D-4 修正） |
| Semantic Applicability vs Inclusion vs Beat Availability 三层区分 | ✓（B-1 修正） |

---

> **THREE-SCOPE INHERITANCE SEMANTIC REVIEW REVISION 1 COMPLETE — AWAITING HUMAN REVIEW**
