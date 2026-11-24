# E2E-LONGFORM-01 — Unified Production Context Contract · Design V2.1

**Status**: DESIGN V2.1 DRAFT — WAITING FOR HUMAN ADJUDICATION — NOT FROZEN
**Date**: 2026-10-26 · **Mode**: TARGETED REVISION（R6~R10；零实施）
**版本引用**: 本文件为独立可审文档——V1=`…contract-design.md`、V2=`…contract-design-v2.md`。凡标〔PRESERVED V2 §N〕=该节内容与 V2 第 N 节完全一致并在此重申或引用；凡标〔REVISED〕=本版已修改；〔NEW〕=本版新增。
**标签**: FC=冻结契约派生 · OI=实证 · PD=提案 · HA=需 Human 裁决 · UNK=UNKNOWN/DESIGN GAP

---

## 1. Executive Summary 〔REVISED〕

V2.1 对 V2 做五项定点修正：R6（语义分类≠载体能力≠已录取——三层分离）；R7（Inclusion Compliance≠Full Contract Compliance——INCLUDED 不证明语义满足）；R8（Actual Presence/Participation/Affected 证据不足=DESIGN GAP）；R9（CW 架构定义≠E2E 生产现实——world.json 在 E2E 书中不存在）；R10（Q-UC-1 方案重整——NOT_OBSERVED 永不满足 Required）。六层结构、四层区分（Intent/Carrier/Context/Request）、Plan↛Actual、volumeGoals 可证明消费、七态 Manifest、NOT_OBSERVED≠INCLUDED、六项 HA 框架全部继承不变。

## 2. Existing Frozen Contract Compatibility 〔PRESERVED V2 §2〕

八项冻结契约兼容性判定与 V2 §2 完全一致，此处不重复列举；核心不变量：本设计零触碰 Actual 准入门。

## 3. Unified Authority Model 〔REVISED per R6〕

### 3.1 三层分离（核心修订）

V2 将 Semantic Classification 直接映射到 Carrier——V2.1 插入两个独立层：

```
Semantic Classification（内容应属于什么权威语义——设计判断）
    ↓ 是否被当前载体可靠表达/解析/维护？
Carrier Capability（载体当前实际能力——实现事实）
    ↓ 是否经过对应冻结门录取？
Admission（内容是否已取得权威地位——流程事实）
```

**规则**：设计分类（如「世界事实节=Reality Canon 源」）**不自动等于**当前生产能力——三层各自独立验证。

### 3.2 权威分类表（三层标注版）〔REVISED〕

| Authorial Source | Semantic Classification | Carrier Capability（当前） | Admission（当前） | 判定 |
|---|---|---|---|---|
| World Bible §事实（历史/地理/事件） | Reality Canon 源 | **无节级结构**——全书一个 md 文件，节间无机器可区分标记（OI：E2E 书 8 节中 7 节为 [object Object]，仅 era 节有效）；compiler 整体注入 basePrompt | **无 Canon 录取门**——01 无 admission 流程（内容直接入 prompt） | **CAPABILITY GAP**：设计上「事实节应有 Canon 源地位」但当前载体无节级区分/无录取门——此地位为 PD 非 OI |
| World Bible §规则（力量体系/禁忌） | Control（呈现规则） | 同上（无节区分） | 无门（直接消费） | 同上 |
| Character Bible | Truth 层身份 Canon | **有**——G1-A resolver 读文件名+alias 标记行（OI） | **有**——G1-A Seal 为唯一录取权威（FC） | CONSISTENT |
| Volume Outline | Control 叙事约束 | **有**——loadVolumeGoal 解析（OI） | **无正式门**（文件存在即视为有效输入） | PD：应入注册但当前无 admission 违规检测 |
| Chapter Plan（authored yaml） | Control 章任务 | 有——loadAuthoredChapterPlan | 有——authored_preserved 防洗白（FC 先例） | CONSISTENT |
| CW Seeds | Truth 层角色主观 | 有——seed 验证+materialize | 有——G1-A S-A Reference-only（FC） | CONSISTENT |
| 05 关系图 | Truth 层关系事实 | 有——G1-A endpoint 过滤 | **部分**——G1-B affect basis 约束 SR 投影（FC），但关系事实本身无独立 admission 门 | PARTIAL |

**关键结论**：世界 bible 事实节的「Reality Canon 源」地位是**设计意图**（PD），当前载体既无节级结构支撑也无 admission 门——若 Human 采纳此分类，须先补节级结构能力+录取流程（属后续 EO，非本设计自决）。

## 4. Authorial Intent Contract 〔PRESERVED V2 §4——附 R6 标注更新〕

V2 §4.1 表在 V2.1 中每行须附 3.2 的三层标注。层级继承规则与红线不变。

## 5. Production Context Contract 〔REVISED per R7〕

### 5.1 三概念→四概念（V2.1 再拆）

| 概念 | 定义 | 层 |
|---|---|---|
| Requirement Classification | 该源的合同属性（REQUIRED/OPTIONAL） | 编译前 |
| Inclusion Status | 该源在某次请求中的事实包含状态（七态） | 运行时 |
| **Inclusion Compliance** | Inclusion Status 是否满足 Requirement 的**包含面** | 事后审计（窄） |
| **Full Contract Compliance** | 包含面+**内容完整性+转换正确性+语义要求满足** | 事后审计（全） |

**核心修正**：`INCLUDED` 只证明来源被纳入请求——**不自动证明**：内容完整（截断后语义残留）、转换正确（序列化无损）、语义要求满足（Writer 实际接收到可消费的形式）。Inclusion Compliance 是 Full 的必要非充分条件。

### 5.2 判定矩阵（Required/Optional × 七态全覆盖）〔REVISED〕

| Requirement | Inclusion Status | Inclusion Compliance | Full Contract Compliance |
|---|---|---|---|
| REQUIRED | INCLUDED | PASS | **COMPLIANCE_UNKNOWN**——须另行验证内容完整性+转换正确性（如哈希/长度断言） |
| REQUIRED | OMITTED_BY_BUDGET | FAIL→**REQUIRED_CONTRACT_VIOLATION** | VIOLATION |
| REQUIRED | OMITTED_BY_POLICY | FAIL→REQUIRED_CONTRACT_VIOLATION | VIOLATION |
| REQUIRED | SOURCE_MISSING | FAIL→REQUIRED_CONTRACT_VIOLATION（upstream） | VIOLATION |
| REQUIRED | TRANSFORMATION_FAILED | FAIL→REQUIRED_CONTRACT_VIOLATION | VIOLATION |
| REQUIRED | NOT_RELEVANT | **CLASSIFICATION_CONFLICT** | CONFLICT（Required 不应 NOT_RELEVANT） |
| REQUIRED | NOT_OBSERVED | **COMPLIANCE_UNKNOWN** | COMPLIANCE_UNKNOWN（≠COMPLIANT） |
| OPTIONAL | INCLUDED | PASS（n/a） | COMPLIANCE_UNKNOWN |
| OPTIONAL | any OMITTED_* | PASS（omission tracked） | COMPLIANT |
| OPTIONAL | NOT_RELEVANT | PASS | COMPLIANT |
| OPTIONAL | NOT_OBSERVED | COMPLIANCE_UNKNOWN | COMPLIANCE_UNKNOWN |

### 5.3 违规响应分级〔REVISED——消除首次/持续歧义〕

| 级别 | 触发条件 | 行为 | 首次 vs 持续 |
|---|---|---|---|
| **BLOCK** | REQUIRED_CONTRACT_VIOLATION(SOURCE_MISSING) 且源属关键 Truth 源 | 阻止请求 | 首次即 BLOCK（关键源缺失不可降级） |
| **DEGRADE** | REQUIRED_CONTRACT_VIOLATION(OMITTED_BY_BUDGET/POLICY/TRANSFORMATION_FAILED) | 降级继续+告警+审计标记 | 首次=DEGRADE；**同源连续 ≥N 次 DEGRADE=升级为 BLOCK**（N 属实现参数） |
| **WARN** | OPTIONAL 源的反复 OMITTED_BY_POLICY（可能暗示分类错位） | 记录+汇总报告 | 仅统计 |

**DEGRADE≠合规恢复**——DEGRADE 只是允许继续运行的运维决策；Full Contract Compliance 在审计层仍为 VIOLATION 直至根因消除。

### 5.4 传递保证与冲突处理 〔PRESERVED V2 §5.4——术语对齐四概念〕

## 6. Planning Transformation Contract 〔PRESERVED V2 §6〕

T-1~T-5 不变。

## 7. POV / Presence / Access / Participation Contract 〔REVISED per R8〕

### 7.1 概念定义（六概念——V2.1 再拆 Actual 侧）

| 概念 | 定义 | 数据来源 | V2.1 判定 |
|---|---|---|---|
| Primary POV | 书级默认主视角 | authored 标记 | 〔PRESERVED V2 §7〕 |
| Scene POV | 单场景视角 | 章计划 | 〔PRESERVED V2 §7〕 |
| Planned Presence | 规划层预期在场集（Control 工具） | authored cast/涉事者推导 | 〔PRESERVED V2 §7〕 |
| **Actual Presence** | 角色在某事件发生的叙事时空中**物理在场** | ? | **见 7.2** |
| **Actual Participation** | 角色**主动执行**该事件动作 | ? | **见 7.2** |
| **Actual Affected** | 角色/物**被事件影响**（结果承受者） | ? | **见 7.2** |
| Access | 角色可获得的信息 | 既有 Access 链（FC） | 〔PRESERVED〕 |

### 7.2 Actual 侧三概念的证据不足判定〔NEW——DESIGN GAP〕

**现有 Actual Events 的 actors[]/affectedEntities[] 能否区分 Presence/Participation/Affected？**

证据审查（OI——E2E ch_0002 实测）：
- `presence` 类事件的 actors=[周砚]、affected=[周砚]——同一名字出现在两个数组中，无法区分「在场」与「被影响」。
- `action` 类事件 actors=[周砚]——语义上接近 Participation，但 schema 未声明这是「主动执行」还是「语法主语」。
- 无任何字段编码「同场但未参与」（witness/observer）——G1 系列的 T2 `access: present_witness` 在 Access 层有此概念，但**事件 schema 本身不区分**。

**结论**：现有 Actual Events **不具备**区分 Actual Presence / Participation / Affected 的证据结构——三概念在事件 schema 中合流于 actors+affected 两个数组。此为 **DESIGN GAP（UNK）**，不是实现缺陷。

**V2.1 处置**：
1. 不在本设计中补造字段或实现（设计原则）。
2. 将「事件 schema 是否需要/如何区分三概念」列为 **HA 候选项**（附于 Q-UC-4）。
3. 在此 GAP 关闭前，V2 §7.2 中「Actual Presence 唯一来源=Actual Events」的表述降格为：**Actual 侧三概念当前由 actors/affected 合并承载，精确区分 UNKNOWN**。

### 7.3 POV∈Presence 条件化 〔PRESERVED V2 §7.3〕

Planned Presence ⊇ {Scene POV} 恒真；Actual 侧 POV∈Presence 不恒真但因 7.2 GAP，其验证能力当前 UNKNOWN。

### 7.4 POV 三机制修订 〔PRESERVED V2 §7.4〕

## 8. Runtime Architecture Boundary 〔REVISED per R9〕

### 8.1 三重区分（核心修订）

| 层 | Character World（冻结架构定义） | E2E 测试书（生产现实） | character_brains |
|---|---|---|---|
| **定义** | 受 Actual+Access 约束的角色长期经验和主观形成载体——CW/T2/T3/投影链的存储〔FC〕 | — | — |
| **E2E 实际文件** | **不存在**——`character_world/world.json` 在 E2E 书中未产生（OI：find 零结果） | `character_brains/*.yaml` ×5 存在（OI） | 同左 |
| **原因** | — | 本书无 `character_world_seeds.yaml` → orchestrator:424 sync 早退 → T2/CW/T3/l1_access/quarantine **全链零产出**（OI） | 由 living-novel-engine 初始化（OI），消费链 UNK |
| **架构地位** | 冻结 Truth 层载体〔FC〕 | **非当前存在**——不得在无生产证据时描述为「已存在/已被消费」 | UNK——定位待前置考古（R4 维持） |

**V2.1 修正**：V2 §8 将 character_world 列为共享组件——该表述仅在「seed 存在且 CW 链激活」的书中成立。E2E 生产现实中 CW 链**静默不产出**（无告警、无审计痕迹）——此本身是一个 Architecture Observability 缺陷（CW 静默跳过未留痕）。

### 8.2 Q-UC-5 前置依赖 〔PRESERVED V2 §8.2——硬前置维持〕

character_brains 只读考古（初始化者/消费者/与 CW 数据流向/同名概念语义差异）必须先完成。

### 8.3 其余共享/分叉清单 〔REVISED〕

V2 §8.3 清单中「CW/T2/T3/投影：共享代码、条件性激活」修订为：「共享代码、**条件性激活且当前静默失败**（E2E 书零产出）——须增加显式告警（后续 EO）」。

## 9. Production Observability Contract 〔REVISED per R7〕

七态 Manifest 保持。V2.1 新增：
- 合规判定由 V2 单层改为 **Inclusion Compliance + Full Contract Compliance** 双层（§5.2 矩阵）。
- INCLUDED 状态须附**内容指纹**（长度/哈希）以支撑 Full 层验证——此为实现层设计，本版仅定义要求。
- 铁律扩展：**NOT_OBSERVED ≠ INCLUDED ≠ INCLUSION_PASS ≠ FULL_COMPLIANT**。

## 10. Q-UC-1 ~ Q-UC-6 Human Adjudication Package 〔REVISED per R10/R8〕

### Q-UC-1 世界事实进入 Beat 的语义保障 〔REVISED per R10〕

**已证**：不变。
**履约单位澄清（核心修订）**：Required 的履约单位（performance unit）必须明确——是 Scene（场景级一次满足即可）、Beat（每拍独立满足）、还是**具体 LLM Request**（每次调用独立满足）。不同层级的继承不可假设：Scene 级注入后，Beat 2+ 是否仍包含该信息取决于 accumulatedText 传递——**此传递效果当前不可观测**。

**方案重整（各自明确消费范围+验证要求）**：

| 方案 | 履约单位 | 注入位置 | 验证要求 | 继承处理 |
|---|---|---|---|---|
| **A** 固定核心集 REQUIRED | **每 Beat**（每 LLM Request） | Beat prompt 内固定段（入 PROTECT_RE） | 每拍 Manifest 含 INCLUDED+内容指纹 | 无需继承（每拍独立注入） |
| **B** Scene 级 REQUIRED | **Scene**（场景首拍满足即合规） | Scene 首拍注入 | 首拍 INCLUDED+指纹；**后续拍=NOT_OBSERVED 但 Scene 级合规=PASS**（显式设计决策） | Beat 2+ 的继承效果 **NOT_OBSERVED——按 B 方案定义为可接受**，但须在契约中声明「Scene 级合规≠Beat 级包含证明」 |
| **C** 分层混合 | 核心集=**Scene 级 REQUIRED**；其余=**Beat 级 OPTIONAL** | 核心=首拍；召回=每拍 | 核心按 B 验证；召回按七态+OPTIONAL 判定 | 同 B+OPTIONAL 不依赖继承 |

**NOT_OBSERVED 永不满足 Required 的 Beat 级契约**——方案 B 的合规性来自「履约单位=Scene」的定义而非 NOT_OBSERVED 被视为 INCLUDED。

**预算分配**：属后续实现 EO。**附带裁决**：违规响应分级（§5.3）。
**建议 Decision Question**：「Required 履约单位+消费范围采 A/B/C？」（推荐 C）

### Q-UC-2 volumeGoals 〔PRESERVED V2 §10〕

### Q-UC-3 POV 三机制 〔PRESERVED V2 §10〕

### Q-UC-4 Presence 〔REVISED per R8〕

在 V2 方案 A/B/混合之上新增**附带裁决项**：
「Actual Events schema 是否需要区分 Actual Presence / Participation / Affected？——若需要，属新 Truth schema 设计，须独立 Design Gate；若不需要（合并承载可接受），在 POV 契约中显式声明合并语义。」
当前证据不足以替 Human 判断（7.2 DESIGN GAP）。

### Q-UC-5 双链 〔REVISED per R9〕

表述更新：character_world 在 E2E 生产中**零产出且静默**（8.1）——Q-UC-5 的考古范围扩展为：①character_brains 读写链（维持）；②CW 条件性激活的静默失败是否为缺陷（新增）；③seed 供给义务归属（新增）。
方案 C（Architecture Divergence 文档化）可先裁；A/B 待考古。

### Q-UC-6 Beat prompt 可观察性 〔REVISED〕

方案 A 升级为「全量 Manifest+内容指纹」（支撑 Full Compliance）；B 维持抽样+哈希。推荐 A。

## 11. Design Risks and Unresolved Dependencies 〔REVISED〕

| 风险 | V2.1 补充 |
|---|---|
| World Bible 节级结构缺失 | R6 定为 CAPABILITY GAP——若 Human 采纳 Canon 源分类须先补结构（独立 EO） |
| Actual 三概念 DESIGN GAP | Q-UC-4 附带裁决——关闭前 POV 契约 Actual 侧验证能力受限 |
| CW 静默失败 | 8.1 新列——须显式告警（后续 EO） |
| character_brains 考探 | Q-UC-5 硬前置维持 |
| REQUIRED 违规响应 | Q-UC-1 附带（维持） |
| 修复顺序 | 初始化缺陷→POV 契约→世界/卷纲契约→架构/观测（维持）+「节级结构」+「CW 告警」插入 |

## 12. Proposed Validation Criteria 〔REVISED per R7〕

| 契约 | V2.1 验证标准 |
|---|---|
| §3 三层 | 每个权威分类声明附 Carrier Capability+Admission 事实标注 |
| §4 意图 | 追踪至 Inclusion Status+Inclusion Compliance+Full Compliance 三层 |
| §5 传递 | Manifest 全覆盖+违规分级触发正确 |
| §6 转换 | 同 V2 |
| §7 POV | Planned≠Actual 分离可验证；Actual 三概念区分能力与 DESIGN GAP 声明一致 |
| §9 观测 | 四层合规（NOT_OBSERVED≠INCLUDED≠INCLUSION_PASS≠FULL_COMPLIANT）可区分 |
| 端到端 | 同 V2（雾桥地名+非 POV 角色——验证性指标） |

## 13. STOP

> **DESIGN V2.1 DRAFT COMPLETE — WAITING FOR HUMAN ADJUDICATION — STOP**

V2→V2.1 变更：R6（三层分离+权威表附能力/录取标注）·R7（四概念+判定矩阵全覆盖+DEGRADE≠合规+违规分级消除歧义）·R8（Actual 三概念=DESIGN GAP）·R9（CW 架构≠E2E 现实——零产出+静默失败）·R10（履约单位+NOT_OBSERVED 永不满足 Required+方案重整）。保留：六层结构/四层区分/Plan↛Actual/volumeGoals/Manifest/六项 HA。
