# E2E-LONGFORM-01 — Unified Production Context Contract · Design V2.2 (Final Targeted Revision)

**Status**: DESIGN V2.2 DRAFT — WAITING FOR HUMAN ADJUDICATION — NOT FROZEN
**Date**: 2026-10-26 · **Mode**: FINAL TARGETED REVISION（R7-A/R7-B/R8-A/R9-A/R10-A；零实施）
**版本引用**: V1=`e2e-longform-01-unified-production-context-contract-design.md` · V2=`…design-v2.md` · V2.1=`…design-v2.1.md`。凡标〔PRESERVED V2.1 §N〕=与 V2.1 第 N 节一致；〔REVISED〕=本版修改；〔NEW〕=本版新增。
**标签**: FC=冻结契约派生 · OI=实证 · PD=提案 · HA=需 Human 裁决 · UNK=UNKNOWN/DESIGN GAP · N/A=不适用

---

## 1. Executive Summary 〔PRESERVED V2.1 §1——附变更注〕

V2.2 为最后一次定点修订，不重审已接受方向。五项变更：R7-A（判定矩阵补全 OPTIONAL 七态+消除 N/A 歧义）、R7-B（四层证据边界——指纹不自动升级合规）、R8-A（Actual Presence 三义并列不冻结+DESIGN GAP 范围限定）、R9-A（CW「静默失败」降格为严格事实描述——条件性未激活+未观察到跳过记录）、R10-A（Scene Initial Inclusion≠Full Compliance 四格分离）。六层结构/四层区分/Plan↛Actual/volumeGoals/七态/六项 HA 全部继承。

## 2. Existing Frozen Contract Compatibility 〔PRESERVED V2.1 §2〕

## 3. Unified Authority Model 〔PRESERVED V2.1 §3——三层分离+权威表附能力/录取标注不变〕

## 4. Authorial Intent Contract 〔PRESERVED V2.1 §4〕

## 5. Production Context Contract 〔REVISED per R7-A/R7-B〕

### 5.1 四概念（不变）〔PRESERVED V2.1 §5.1〕

Requirement Classification / Inclusion Status / Inclusion Compliance / Full Contract Compliance。

### 5.2 判定矩阵（全覆盖版）〔REVISED per R7-A〕

| Requirement | Inclusion Status | Inclusion Compliance | Full Contract Compliance | 说明 |
|---|---|---|---|---|
| REQUIRED | INCLUDED | **PASS** | **COMPLIANCE_UNKNOWN**——须按 §5.3 四层证据独立验证 | INCLUSION_PASS 是必要非充分 |
| REQUIRED | OMITTED_BY_BUDGET | FAIL → REQUIRED_CONTRACT_VIOLATION | VIOLATION | |
| REQUIRED | OMITTED_BY_POLICY | FAIL → REQUIRED_CONTRACT_VIOLATION | VIOLATION | |
| REQUIRED | SOURCE_MISSING | FAIL → REQUIRED_CONTRACT_VIOLATION (upstream) | VIOLATION | 根因在上游载体/录取层 |
| REQUIRED | TRANSFORMATION_FAILED | FAIL → REQUIRED_CONTRACT_VIOLATION | VIOLATION | |
| REQUIRED | NOT_RELEVANT | **CLASSIFICATION_CONFLICT** | **CONFLICT** | Required 源不应被判 NOT_RELEVANT——二者定义矛盾，须纠分类 |
| REQUIRED | NOT_OBSERVED | **COMPLIANCE_UNKNOWN** | **COMPLIANCE_UNKNOWN** | ≠COMPLIANT；≠VIOLATION（事实未知） |
| OPTIONAL | INCLUDED | **PASS** | **COMPLIANCE_UNKNOWN** | 同 REQUIRED×INCLUDED 的 Full 层逻辑——INCLUDED 不证明语义满足 |
| OPTIONAL | OMITTED_BY_POLICY | **PASS**（omission tracked） | **COMPLIANT** | Optional 按策略省略=按设计行为，非违规 |
| OPTIONAL | OMITTED_BY_BUDGET | **PASS**（omission tracked） | **COMPLIANT** | 同上 |
| OPTIONAL | NOT_RELEVANT | **PASS** | **COMPLIANT** | Optional 召回池正常筛除 |
| OPTIONAL | SOURCE_MISSING | **PASS**（omission tracked） | **COMPLIANT_WITH_DATA_QUALITY_SIGNAL** | 非违规（Optional 无在场义务），但源缺失本身是**上游数据质量信号**——须单独上报（非合规维度），归入观测层的 DATA_QUALITY_SIGNAL |
| OPTIONAL | TRANSFORMATION_FAILED | **PASS**（omission tracked） | **COMPLIANT_WITH_DATA_QUALITY_SIGNAL** | 同上——转换失败不构成 Optional 违规，但为 DATA_QUALITY_SIGNAL |
| OPTIONAL | NOT_OBSERVED | **COMPLIANCE_UNKNOWN** | **COMPLIANCE_UNKNOWN** | 同 REQUIRED×NOT_OBSERVED |

**无 N/A 格**——十四格全部有明确判定与理由；不存在「不可能组合」（Inclusion Status 是运行时观测，任何源理论上可出现任一态；CLASSIFICATION_CONFLICT 是 REQUIRED×NOT_RELEVANT 的合法判定而非 N/A）。

**关键规则重申**：①OPTIONAL omission **不是** Required violation（矩阵中无此混淆）；②OPTIONAL×SOURCE_MISSING/TRANSFORMATION_FAILED **不归入** `any OMITTED_*`——各自有独立判定（PASS+`COMPLIANT_WITH_DATA_QUALITY_SIGNAL`）与独立上报通道（DATA_QUALITY_SIGNAL——仅为数据质量观测信号，非合规维度，不改变 OPTIONAL omission 的非违规性质）；③REQUIRED 侧语义不变——omission=VIOLATION、INCLUDED≠Full Pass。`COMPLIANT_WITH_DATA_QUALITY_SIGNAL` 是 Full Contract Compliance 的合规结果描述，不是新的 Inclusion Status。

### 5.3 四层证据边界〔REVISED/NEW per R7-B〕

Full Contract Compliance 的验证须依次经过四层证据，每层证明范围严格限定：

| 层 | 证明什么 | 证据形式 | **不证明什么** |
|---|---|---|---|
| **L1 Source Identity** | 注册身份、版本与权威声明**可被核验** | 源注册 ID+载体版本标记 | **不直接推导**「内容确来自声明载体/版本」——须来源绑定证据充分方可确认；不证明内容正确/完整/最新语义；**不证明来源权威性本身已成立**（Source ID 存在≠权威已证） |
| **L2 Transformation Integrity** | **可检测范围内的**截断、序列化损坏（[object Object] 类）与内容遗漏**可被检出**；转换前后**差异可观察** | 转换前后内容指纹对比+转换器版本 | **不证明所有遗漏均不存在**——指纹/长度/哈希仅覆盖可机械检测的范围；**不证明语义正确**——不能独立判定内容变化属合法转换还是语义漂移；语义是否漂移归 L4 或后续明确标准 |
| **L3 Request Inclusion Evidence** | 最终 LLM Request 确实包含了该内容 | Manifest INCLUDED+请求内字符范围/内容指纹 | 不证明包含的内容是完整的（截断后残留仍算 INCLUDED）；不证明语义满足 |
| **L4 Semantic Requirement Satisfaction** | 内容满足对应 Required 的**语义要求**（含语义无漂移、作者意图未被曲解） | **当前无可验证标准**——**不具备**语义验证能力 | — |

**规则**：
1. **指纹/长度/哈希只能证明其实际覆盖范围内的内容身份或一致性**（L1/L2/L3 层内）。**不能独立证明**：源内容完整（L2 上游）、转换语义正确或无语义漂移（归 L4）、或作者要求满足（L4）。
2. `INCLUSION_PASS`（=L3 通过）是 Full Compliance 的**必要非充分**条件——不得直接升级为 FULL_COMPLIANT。
3. **若 L4 尚无明确可验证标准（当前状态），Full Contract Compliance 一律保持 COMPLIANCE_UNKNOWN**——无论 L1~L3 全过。**当前系统不具备 L4 语义验证能力。**
4. 本节仅划定证据能力，不设计实现算法、不建 Truth Carrier、不建语义引擎、不建自动裁决机制。〔PD〕

### 5.4 违规响应分级 〔PRESERVED V2.1 §5.3〕

BLOCK（关键 Truth 源缺失首次即触发）/ DEGRADE（首次降级+告警+审计标记；同源连续≥N 次升级 BLOCK）/ WARN（OPTIONAL 反复 OMITTED_BY_POLICY 统计）。**DEGRADE≠合规恢复**。DATA_QUALITY_SIGNAL（5.2 新增）走 WARN 级观测通道。

### 5.5 传递保证与冲突处理 〔PRESERVED V2.1 §5.4〕

## 6. Planning Transformation Contract 〔PRESERVED V2.1 §6〕

## 7. POV / Presence / Access / Participation Contract 〔REVISED per R8-A〕

### 7.1 Planned 侧概念 〔PRESERVED V2.1 §7.1（Primary POV/Scene POV/Planned Presence/Access）〕

### 7.2 Actual Presence 三义并列（不冻结）〔REVISED per R8-A〕

V2.1 将 Actual Presence 定义为「物理在场」——V2.2 撤回该冻结式定义，改为**三义并列**，最终语义待 Human 裁决：

| 候选含义 | 定义 | 典型情形 | 当前证据可判定？ |
|---|---|---|---|
| **Physical Presence** | 角色在事件发生**地点**的物理在场 | 同室、同街 | **否**——事件 schema 无位置-角色关联 |
| **Scene/Event Presence** | 角色处于该**叙事场景/事件范围**内 | 同场景章节内但不同房间 | **否**——无场景边界编码 |
| **Information/Perceptual Access** | 角色能**感知或获知**事件信息 | 远程通讯、监控、隔墙听闻 | **部分**——Access 链（T2 present_witness）有此概念，但事件层无编码 |

**不变式（无论最终采何义）**：
- Presence ≠ Participation
- Presence ≠ Affected
- Participation ≠ Affected
- **Access 不自动证明 Physical Presence**（知道≠身在）
- 远程通讯/监控/隔墙听闻**不能仅凭现有概念自动判定为 Physical Presence**——需显式语义裁决

### 7.3 Actual 三概念证据不足（范围限定版）〔REVISED per R8-A〕

**V2.1 结论限定**：「当前 Actual Events schema 不足以区分三概念」——此结论范围**仅限事件 schema 本身**。

**不等于**「整个系统其他层完全不存在相关证据」——其他层的证据充分性（如 T2 access 级别、SR awareness、prompt 层 IB 文案）需独立审查，不在本轮解决。〔UNK〕

DESIGN GAP 维持：不新增字段、不修改 Truth Schema、不提实现方案。「事件 schema 是否需区分三概念」保留为 Q-UC-4 附带裁决。

### 7.4 POV∈Presence 条件化 〔PRESERVED V2.1 §7.3——术语更新〕

Planned 侧恒真；Actual 侧因 7.2/7.3 UNK，验证能力 **UNKNOWN**。

### 7.5 POV 三机制修订 〔PRESERVED V2.1 §7.4〕

## 8. Runtime Architecture Boundary 〔REVISED per R9-A〕

### 8.1 Character World 状态（严格事实描述版）〔REVISED〕

V2.1 表述「零产出且静默失败」——V2.2 降格为：

> **CW 条件性未激活，且当前未观察到明确的跳过/失败记录。**

**证据等级前置声明**：以下区分**代码设计证据**（系统具备该设计行为）与 **E2E 运行证据**（该行为在本测试中实际发生）——二者不可互替。

| 情形 | 定义 | 代码设计证据 | E2E 运行证据 | 判定 |
|---|---|---|---|---|
| A. Seed 缺失时按设计条件跳过 | syncCharacterWorldFromSeeds 无 seed 文件→return {synced:false, reason:'no_seed_file'} | **有**——代码路径存在（OI：源码实证） | **UNKNOWN / NOT OBSERVED**——seed 文件确实不存在（OI），但**无调用轨迹/返回值/日志行证明 E2E 实际调用了该函数并命中 `no_seed_file` 分支** | 设计行为有代码支持；**E2E 实际命中=UNKNOWN** |
| B. Seed 缺失本身违反书籍初始化契约 | 书籍应有 seed 但没有 | 无——是否存在「每书必有 seed」契约 UNKNOWN（无文档/无校验） | 同左 | **UNK——Q-UC-5 裁决**；不得推断 seed 缺失=违约 |
| C. Seed 存在但 CW 链未激活 | 有 seed 但 sync 未产出 | 代码路径理论上存在 | E2E 书 seed 不存在→此情形不适用 | NOT OBSERVED（本书） |
| D. CW 链执行失败但未产生可观察记录 | sync 抛异常被 orchestrator try/catch 吞掉 | **有**——try/catch warn 路径存在（OI） | **UNKNOWN**——无 `[runtime] Character World sync skipped` 日志行=无 D 触发证据；但无成功行≠未发生 | **不能排除**；也不推断一定失败 |

**结论**：
- 代码设计行为（A 的跳过路径/D 的吞异常路径存在）：**有证据支持**。
- E2E 实际命中 `no_seed_file` 分支：**UNKNOWN / NOT OBSERVED**（仅凭代码路径+seed 缺失不能证明实际命中）。
- Seed 是否每书必需：**UNKNOWN，归 Q-UC-5**。
- 不推断 seed 缺失=违约、不推断 CW 一定失败、不推断 CW 已正确履约。
- **当前 E2E 日志未观察到明确的 CW 跳过或成功记录**；不能断言本次运行实际发生了跳过或失败。代码存在 try/catch 路径≠实际发生异常。跳过/失败路径**若被触发**则无审计痕迹可查——此为代码设计层的可观察性缺口（非 E2E 运行事实）；观测改进归后续 EO/Q-UC-5。

### 8.2 Q-UC-5 前置依赖 〔PRESERVED V2.1 §8.2〕

考古范围维持三项（character_brains 读写链 / CW 条件性激活与可观察性 / seed 供给义务归属），R9-A 不扩展不缩小。

### 8.3 共享/分叉清单 〔REVISED〕

「CW/T2/T3/投影：共享代码、条件性激活」——尾注为「E2E 书 seed 缺失（代码条件跳过路径存在；E2E 实际命中分支 UNKNOWN/NOT OBSERVED；E2E 日志未观察到跳过或成功记录，不能断言实际发生跳过/失败）；跳过/失败路径**若触发**则无审计痕迹（代码设计层可观察性缺口，后续 EO）」。

## 9. Production Observability Contract 〔REVISED per R7-B/R7-A〕

七态+双合规层维持。V2.2 更新：
- **四层证据链**（L1~L4，§5.3）作为 Full Compliance 的判定框架——L4 无标准时一律 COMPLIANCE_UNKNOWN。
- **DATA_QUALITY_SIGNAL** 观测通道（OPTIONAL×SOURCE_MISSING/TRANSFORMATION_FAILED 的上报——非合规维度，不改变 OPTIONAL omission 非违规性质；对应 Full 合规结果 `COMPLIANT_WITH_DATA_QUALITY_SIGNAL`）。
- 铁律维持四层：**NOT_OBSERVED ≠ INCLUDED ≠ INCLUSION_PASS ≠ FULL_COMPLIANT**。

## 10. Q-UC-1 ~ Q-UC-6 Human Adjudication Package 〔REVISED per R10-A〕

### Q-UC-1 世界事实进入 Beat 的语义保障 〔REVISED per R10-A〕

**履约语义四格分离（核心修订）**：

| 维度 | Scene-level | Beat-level |
|---|---|---|
| **Inclusion Compliance** | Scene 首拍（或指定注入拍）的 Inclusion Status 判定 | 每拍独立判定 |
| **Full Contract Compliance** | Scene 范围内语义满足（须 L4 标准；当前=UNKNOWN） | 每拍/或拍间持续可用性（后者当前不可验证） |

**方案重整（区分 Initial Inclusion 与 Full Compliance）**：

| 方案 | 履约单位 | 初始注入验证 | 后续 Beat | Scene Full Compliance |
|---|---|---|---|---|
| **A** 每拍注入 | **每 Beat（=每次 LLM Request）** | 每拍 INCLUDED+指纹（L3）→INCLUSION_PASS | 无继承需求（每拍独立注入） | 由各拍聚合；每拍 Full=UNKNOWN（L4） |
| **B** Scene 首拍注入 | **Scene** | 首拍 INCLUDED+指纹→**Scene-level Initial Inclusion Compliance PASS** | 后续 Beat=NOT_OBSERVED（**不被解释为 INCLUDED**）；Scene 级合规来自履约单位定义 | **首拍 Initial PASS ≠ Scene Full PASS**——若作者要求「Scene 内持续可用」且继承证据不足→Full=**UNKNOWN** |
| **C** 混合 | 核心=Scene 级；召回=Beat 级 OPTIONAL | 核心按 B 验证 | 召回按七态 | 核心同 B 的限制+召回 COMPLIANT/UNKNOWN |

**统一规则**：①任何层级的 INCLUDED 都不自动证明该层级 Full Compliance；②NOT_OBSERVED 永不满足 Required 的 Beat 级契约；③Scene-level Initial Inclusion Compliance PASS 是 Scene-level Full Compliance 的必要非充分条件；④继承效果当前不可观测——方案 B/C 的 Full 判定依赖此不可观测性时保持 UNKNOWN。

**预算分配**：后续 EO。**附带裁决**：违规响应分级。**推荐**：C（PD 仅为建议，未由 Human 选定）。

### Q-UC-2 volumeGoals 〔PRESERVED V2.1 §10〕
### Q-UC-3 POV 三机制 〔PRESERVED V2.1 §10〕

### Q-UC-4 Presence 〔REVISED per R8-A〕

V2 方案 A/B/混合（Planned 侧）不变。附带裁决项更新为两项：
①事件 schema 是否需区分 Actual Presence/Participation/Affected（DESIGN GAP 维持）；
②**若区分，Actual Presence 采 Physical/Scene-Event/Information-Access 何义或组合**——三义并列未冻结（§7.2 新增）。

### Q-UC-5 双链 〔REVISED per R9-A〕

考古范围维持三项不变。表述更新：CW 状态=「条件性未激活；E2E 日志未观察到跳过或成功记录（不能断言实际发生跳过/失败）；代码跳过路径存在（设计证据）但 E2E 实际命中 UNKNOWN/NOT OBSERVED」（8.1 五列证据表）——**不预判 seed 供给义务**（情形 B=UNK 归此裁决）。

### Q-UC-6 Beat prompt 可观察性 〔PRESERVED V2.1 §10——附 R7-B 对齐〕

方案 A（全量 Manifest+四层证据链）/ B（抽样+哈希）。推荐 A。

## 11. Design Risks and Unresolved Dependencies 〔REVISED〕

| 风险/未决 | 分类 |
|---|---|
| World Bible 节级结构 CAPABILITY GAP | PD（V2.1 §3 维持） |
| Actual 三概念区分 | UNK/DESIGN GAP（Q-UC-4 附带①②） |
| Actual Presence 最终语义 | **HA（Q-UC-4 附带②新增——三义并列待裁）** |
| L4 语义满足无可验证标准 | PD——Full Compliance 全域当前=UNKNOWN（设计如此而非缺陷；L4 标准定义属后续 Gate） |
| character_brains 消费链 | UNK（Q-UC-5 硬前置） |
| Seed 供给义务 | **UNK（Q-UC-5——R9-A 情形 B）** |
| CW E2E 实际命中跳过分支 | **UNKNOWN / NOT OBSERVED（代码路径存在≠实际命中——8.1）** |
| CW 跳过/失败路径可观察性（代码设计层缺口——若触发无审计痕迹；E2E 是否实际触发 UNKNOWN） | PD（后续 EO） |
| DATA_QUALITY_SIGNAL 通道实现 | PD（后续 EO） |
| 修复顺序 | 维持 V2.1 §11 |

## 12. Proposed Validation Criteria 〔REVISED per R7-A/R7-B/R10-A〕

| 契约 | V2.2 验证标准 |
|---|---|
| §3 三层 | 每声明附 Capability+Admission 标注（V2.1 维持） |
| §4 意图 | 追踪至 Inclusion Status+Inclusion Compliance+Full Compliance（Full 无 L4 标准→UNKNOWN） |
| §5 传递 | 14 格矩阵全覆盖可复算；DATA_QUALITY_SIGNAL 独立上报 |
| §6 转换 | 同 V2.1 |
| §7 POV | Planned≠Actual 分离；Actual 三义并列且未冻结；DESIGN GAP 范围限定声明在场 |
| §9 观测 | 四层证据链可区分；四层铁律可区分 |
| §10 Q-UC-1 | Scene Initial Inclusion Compliance ≠ Scene Full Compliance 可区分验证 |
| 端到端 | 同 V2.1（雾桥地名+非 POV 角色——验证性指标） |

## 13. STOP

> **V2.2 FINAL ERRATA COMPLETE — READY FOR HUMAN ADJUDICATION — STOP**

## Final Errata（V2.2 文档内勘误，2026-10-26）

| 项 | 修改 | 位置 |
|---|---|---|
| **Err-R1**（L2 证据收紧） | L1 增加「Source ID 存在≠权威已证」；L2 证明范围限定为结构完整性/可检测损坏/差异可观察；明确指纹不能独立证明语义无漂移（归 L4）；L4 明示「不具备语义验证能力」；规则 1/3 同步收紧 | §5.3 |
| **Err-R2**（CW 证据等级） | §8.1 重构为五列表（代码设计证据/E2E 运行证据分列）：A 代码有+E2E 命中 UNKNOWN；B UNK；C NOT OBS；D 代码有+E2E UNKNOWN；结论含「不推断违约/失败/已履约」；§8.3/§10 Q-UC-5/§11 同步 | §8.1/8.3/§10/§11 |
| **Err-R3**（状态命名统一） | `COMPLIANT_SEE_NOTE`/`COMPLIANCE_SEE_NOTE`/`SEEE_NOTE` 统一为 `COMPLIANT_WITH_DATA_QUALITY_SIGNAL`（Full 合规结果描述，非新 Inclusion Status）；DATA_QUALITY_SIGNAL 维持独立观测信号非合规维度；REQUIRED 侧 VIOLATION 不变；变更清单拼写修复 | §5.2（含规则重申行）/§5.4/§9/变更清单 |
| **Err-R1-B**（L1/L2 最终收紧） | L1：「可被核验」不再推导「确来自声明载体/版本」——须来源绑定证据充分方可确认；L2：「无内容遗漏」→「**可检测范围内**的截断/序列化损坏/内容遗漏**可被检出**」+「不证明所有遗漏均不存在」 | §5.3 |
| **Err-R2-B**（CW 可观察性结论收紧） | 「可观察性不足为事实」→ 严格分三义：E2E 日志未观察到跳过/成功记录（观测事实）；不能断言实际发生跳过/失败（≠已证实发生但无日志）；try/catch 代码存在≠实际异常发生；可观察性缺口限定为代码设计层（若触发则无痕迹）；§8.3/§10 Q-UC-5/§11 同步 | §8.1/8.3/§10/§11 |

## V2.1 → V2.2 变更清单

| 项 | V2.1 | V2.2 | 类型 |
|---|---|---|---|
| §5.2 矩阵 | OPTIONAL 三态含混（`any OMITTED_*`）；REQUIRED×NOT_OBSERVED=UNKNOWN 但 OPTIONAL×NOT_OBSERVED 未列 | **14 格全覆盖**：OPTIONAL×SOURCE_MISSING/TRANSFORMATION_FAILED=PASS+`COMPLIANT_WITH_DATA_QUALITY_SIGNAL`+独立 DATA_QUALITY_SIGNAL 通道；无 N/A 无空格 | REVISED R7-A |
| §5.3 | 指纹建议隐含在 INCLUDED 附注 | **四层证据边界**（L1~L4）：L2 限定为结构完整性/可检测损坏/差异可观察；指纹不证明语义；L4 无标准→Full=UNKNOWN 一律 | REVISED R7-B |
| §7.2 | Actual Presence 定义为「物理在场」 | **三义并列不冻结**（Physical/Scene-Event/Information-Access）；五条不变式 | REVISED R8-A |
| §7.3 | 「整个系统…」未限定 | 结论范围**仅限事件 schema**；其他层证据待独立审查 | REVISED R8-A |
| §8.1 | 「零产出且静默失败」 | **代码设计证据 vs E2E 运行证据分离**：五列表（A 代码有/E2E 命中 UNKNOWN；B UNK；C NOT OBS；D 代码有/E2E UNKNOWN） | REVISED R9-A |
| §10 Q-UC-1 | 方案 B 表述「后续拍 NOT_OBSERVED 可接受」隐含混淆 | **四格分离**（Scene/Beat × Inclusion/Full）；Initial PASS≠Full PASS；继承不足→Full=UNKNOWN | REVISED R10-A |
| §10 Q-UC-4 | 附带①schema 区分 | 附带①维持+**②Actual Presence 三义选择** | REVISED R8-A |
| §10 Q-UC-5 | 考古范围三项+CW「静默失败」 | 三项不变；CW 表述对齐 8.1；seed 义务=UNK 归此裁 | REVISED R9-A |
| §9 | 七态+双合规 | +四层证据链+DATA_QUALITY_SIGNAL 通道 | REVISED R7-A/B |
