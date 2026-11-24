# Q-UC-1 — Human Adjudication Packet

**Status**: `Q-UC-1 — HS-7 SEALED (A) · SI-1 SEALED (I-1A) · SI-4a SEALED (OPTION A) · HS-1~HS-6 / SI-2~SI-3 / SI-4b / SI-5~SI-8 / SI-10 AWAITING HUMAN REVIEW · SI-9 BOUNDARY CONFIRMATION`
**Date**: 2026-11-01（packet 创建+Seal+Rev1+Rev2+Rev2.1）· **Mode**: READ-ONLY → SEAL → DESIGN REVISION
**Authority**: V2.2 FINAL + ERRATA（`docs/design/phase-4/e2e-longform-01-unified-production-context-contract-design-v2.2.md`）
**Seal 来源**: Human Adjudication（2026-11-01）——**非 GLM 建议**
**文档链**: 本 Packet → Rev1（`q-uc-1-human-seal-and-residual-design.md`）→ Rev2（`q-uc-1-residual-design-gate-revision-2.md`）→ **Rev2.1（`q-uc-1-residual-design-gate-revision-2.1.md`·当前权威）**

---

## 1. V2.2 原始 Q-UC-1（逐字提取，不修订）

**问题**：世界事实进入 Beat 的语义保障——世界信息在 Beat 请求中的语义地位是什么？哪些属于每个 Beat 的必需背景，哪些属于可选召回？

**履约语义四格分离**（V2.2 §10 核心）：

| 维度 | Scene-level | Beat-level |
|---|---|---|
| Inclusion Compliance | Scene 首拍（或指定注入拍）的 Inclusion Status 判定 | 每拍独立判定 |
| Full Contract Compliance | Scene 范围内语义满足（须 L4 标准；当前=UNKNOWN） | 每拍/或拍间持续可用性（后者当前不可验证） |

## 2. 原始选项完整内容（V2.2 §10，R10-A 修订版）

| 方案 | 履约单位 | 初始注入验证 | 后续 Beat | Scene Full Compliance |
|---|---|---|---|---|
| **A** 每拍注入 | **每 Beat（=每次 LLM Request）** | 每拍 INCLUDED+指纹（L3）→INCLUSION_PASS | 无继承需求（每拍独立注入） | 由各拍聚合；每拍 Full=UNKNOWN（L4） |
| **B** Scene 首拍注入 | **Scene** | 首拍 INCLUDED+指纹→**Scene-level Initial Inclusion Compliance PASS** | 后续 Beat=NOT_OBSERVED（**不被解释为 INCLUDED**）；Scene 级合规来自履约单位定义 | **首拍 Initial PASS ≠ Scene Full PASS**——若作者要求「Scene 内持续可用」且继承证据不足→Full=**UNKNOWN** |
| **C** 混合 | 核心=Scene 级；召回=Beat 级 OPTIONAL | 核心按 B 验证 | 召回按七态 | 核心同 B 的限制+召回 COMPLIANT/UNKNOWN |

**统一规则**：①任何层级的 INCLUDED 都不自动证明该层级 Full Compliance；②NOT_OBSERVED 永不满足 Required 的 Beat 级契约；③Scene-level Initial Inclusion Compliance PASS 是 Scene-level Full Compliance 的必要非充分条件；④继承效果当前不可观测——方案 B/C 的 Full 判定依赖此不可观测性时保持 UNKNOWN。

**预算分配**：后续 EO（本轮不裁数值）。**附带裁决**：违规响应分级（BLOCK/DEGRADE/WARN 何源适用何级）。**V2.2 推荐**：C（PD 仅为建议，未由 Human 选定）。

## 3. 相关 Errata（V2.2 Final Errata + Evidence Wording）

| Errata | 影响 |
|---|---|
| Err-R1-B | L1 不从「可核验」推导「确来自声明载体」——须来源绑定证据充分方可确认 |
| Err-R1-B | L2 限定为「可检测范围内」——指纹不能证明所有遗漏不存在 |
| Err-R7-B | INCLUDED ≠ Full Compliance；L4 无标准→Full 一律 COMPLIANCE_UNKNOWN |
| Err-R10-A | 方案 B 的 Scene Initial PASS ≠ Scene Full PASS（必要非充分） |
| R5（V1→V2） | 移除 ≤40 字预设——预算数值属后续 EO |

## 4. 当前生产链证据

### A. World Bible 现状

| 项 | 事实 | 证据等级 |
|---|---|---|
| E2E 书 bible | **10 处 `[object Object]`**（旧数据未迁移——AN-2 修复了序列化函数，未修旧文件） | E2E（文件原文） |
| 有效内容 | 仅「现代都市」4 字（era 段） | E2E |
| Loader 读取 | `loader.js:258` readText → `ctx.worldBible` 508 字（R10 验证可完整读取） | RUNTIME（R10 PASS） |
| Compiler 消费 | `compiler.js:660-674` → basePrompt 世界规则块（世界 bible 全文注入 basePrompt） | RUNTIME（R10 PASS） |
| **Beat 层到达** | **结构性不可达**——`slimLoreForBeat`（beat-slimmer.js:361-399）keys=`beat.label/content/libraryBeat + intent.pov + beat.characters + intent.characters`，**世界段不含任何 keys**→永不命中→220 字 lore 窗内零出现 | CODE |
| PROTECT_RE | ≥20 段保护清单中**无世界段** | CODE |
| **结论** | 世界 bible→basePrompt 有通道；basePrompt→Beat LLM Request 无通道。即使 AN-2 修复后 bible 完好，世界信息仍到不了 Beat | CODE+DESIGN |

### B. Context Injection 层级现状

| 层级 | 来源 | 被消费？ | 证据 |
|---|---|---|---|
| Book | 01_world_bible → loader → compiler worldBible 块 | **到 basePrompt 是；到 Beat 否** | CODE/RUNTIME |
| Volume | volumeGoals→plan json 全程携带 | **否**（compiler ranking 源无 volume） | CODE |
| Chapter | intent.mainGoal / storyMap | **是**（ch2+ 唯一活指令=story-map 里程碑句） | E2E（plan json） |
| Scene | scene.goal / entities | **是**（beat keys 命中） | E2E |
| Beat | beat 七元素 / 续写原文 | **是** | CODE |
| Required/Optional | **不存在**——无源注册、无 Required 分类、无 omission reason | — | DESIGN GAP |
| 预算 | BEAT_PROMPT_CHAR_BUDGET=1400 / BEAT_LORE_MAX_CHARS=220 / PROTECT_RE ≥20 段——全硬编码 | — | CODE |
| Scene→Beat 继承 | accumulatedText 传递——效果**不可观测**（beat prompt 未持久化） | NOT OBSERVED | DESIGN GAP |

### C. AN-1 World Drift 证据（E2E 实测矩阵）

| 关键词 | ch1 | ch2 | ch3 | ch4 | ch5 | ch6 | ch7 | ch8 | ch9 | 证据等级 |
|---|---|---|---|---|---|---|---|---|---|---|
| **设定组**（雾桥/断桥/失踪/理赔） | 4 | 0 | 2 | 0 | 0 | 0 | 0 | 0 | 0 | E2E |
| **漂移组**（终端/闸门/芯片） | 7 | 11 | 5 | 13 | 18 | 7 | 4 | 8 | 5 | E2E |
| **三线索**（钢筋/卷宗/举报/笔迹/桥墩） | 0 | — | 0 | — | 0 | — | 0 | — | 2 | E2E |

**结论**：ch1 部分忠实（唯一一次 mainGoal 携带卷纲全文使 keys 含沈昭/顾满仓）；ch2+ 世界设定全面消失、三线索零落地（仅 ch9「笔迹」×2 为偶发）。漂移组贯穿全程。

## 5. 各选项影响矩阵

| 分析维度 | **A** 每拍注入 | **B** Scene 首拍注入 | **C** 混合 |
|---|---|---|---|
| **作者意图保护** | 最强——每拍世界信息必在场 | 较弱——首拍后依赖继承（不可观测） | 中等——核心集首拍+召回可及 |
| **上下文范围** | Beat 层（每 LLM Request） | Scene 层 | Scene 核心层+Beat 召回层 |
| **Required 语义** | 每拍独立 REQUIRED——缺失即 VIOLATION | Scene 级 REQUIRED——首拍缺失即 VIOLATION | 核心=Scene REQUIRED；召回=Beat OPTIONAL |
| **Optional 语义** | 无 OPTIONAL 层（全部 REQUIRED） | 全部归入首拍 REQUIRED | 有明确 OPTIONAL 层（按需召回+七态判定） |
| **Inclusion 证明** | 每拍 INCLUDED+指纹→INCLUSION_PASS | 首拍 INCLUSION_PASS；后续 NOT_OBSERVED | 核心=B；召回=七态+Inclusion Compliance |
| **Compliance 判定** | Full=UNKNOWN（L4 无标准） | Full=UNKNOWN（继承不可观测） | Full=UNKNOWN（同左） |
| **Budget 影响** | **最大**——每拍注入世界→全部 1400 字预算受压 | **最小**——仅首拍占用 | **中等**——核心首拍+召回按需 |
| **AN-1 解决** | **完全解决**（世界永远在场→Writer 不可遗忘） | **部分解决**（首拍可见→但后续拍可能遗忘） | **大部分解决**（核心保障+召回补充） |
| **风险** | ①每拍重复世界段→token 成本↑↑；②可能压缩 Beat 七元素/续写原文预算；③世界段过长可能反而被 PROTECT_RE 挤出 | ①首拍后世界遗忘风险=AN-1 可能持续；②继承效果不可观测→Full 永远 UNKNOWN | ①需定义「核心集」vs「召回集」的边界（谁定义）；②仍是两层而非一层→实现复杂度↑ |
| **证据缺口** | ①真实 LLM 端验证（世界段在场是否改变 Writer 行为）| ①Scene→Beat 继承效果不可观测；②L4 语义满足无标准 | ①核心/召回边界定义待裁；②同 A+B 的缺口 |

## 6. 冻结契约兼容性审查（十项）

| # | 边界 | A | B | C |
|---|---|---|---|---|
| 1 | Authorial Intent=来源概念非第四种 Authority | ✓ | ✓ | ✓ |
| 2 | Truth/Control/Realization 三层不变 | ✓ | ✓ | ✓ |
| 3 | World Bible 不因进 Prompt 自动成 Actual | ✓ | ✓ | ✓ |
| 4 | Outline/Plan/Required Event 不自动成 Actual | ✓ | ✓ | ✓ |
| 5 | Planned Presence 不制造 Actual Presence | ✓ | ✓ | ✓ |
| 6 | CW 仍受 Actual+Access 约束 | ✓ | ✓ | ✓ |
| 7 | Writer 不制造 Reality/Actual/Choice/Causal | ✓ | ✓ | ✓ |
| 8 | Context Injection 不获 Truth Authority | ✓ | ✓ | ✓ |
| 9 | Prose 仍是 Evidence Source | ✓ | ✓ | ✓ |
| 10 | 不改 Studio 唯一生产路径 | ✓ | ✓ | ✓ |

**结论：三方案全部兼容，无冻结契约冲突。**

## 7. 尚待 Human 决定的具体问题

### 核心裁决

> **Q-UC-1-a**：世界信息进入 Beat 请求的 Required 履约单位+消费范围采 A/B/C 何者？

### 附带裁决（选任一方案后仍需决定）

> **Q-UC-1-b**：Required 源集由谁定义？——(i) 系统默认模板（全部书统一核心集）/(ii) 书级 authored 配置（作者指定核心集）/(iii) 逐章由 Planner 判定

> **Q-UC-1-c**：REQUIRED_CONTRACT_VIOLATION 的响应分级——BLOCK（阻止请求）/ DEGRADE（降级+告警）/ WARN（记录+继续）——何源适用何级？

### 若选 C 的额外裁决

> **Q-UC-1-d**：「核心集」与「召回集」的语义边界——核心集包含哪些要素（书名/核心地点/时代/关键规则/势力格局）？召回集的 keys 是否扩展（如加入地点名/势力名）？

## 8. GLM 技术建议（独立于原始选项，不冒充裁决）

GLM 建议选 **C**，理由：
- A 的每拍注入在 1400 字预算下可能压缩保护段（Clock/IB/续写原文），引入新失败模式
- B 的 Scene→Beat 继承不可观测，Full Compliance 永远 UNKNOWN——无法验证作者意图是否持续保障
- C 以最小预算恢复世界可达性（核心集=Scene 级保障）+ 保留按需召回的灵活性
- 实现侵入最小：核心集可复用现有 basePrompt 世界段（Scene 首拍 PROTECT_RE 扩展+选项 keys 扩展）

**此建议仅为技术参考，不构成裁决。**

## 9. 证据来源索引

| 事实 | 来源 | 等级 |
|---|---|---|
| V2.2 Q-UC-1 原文 | `docs/design/phase-4/…v2.2.md:148-169` | DESIGN |
| Beat 层不可达 | `beat-slimmer.js:361-399`（keys+220 字）+ `beat-slimmer.js:487`（PROTECT_RE） | CODE |
| PROTECT_RE 无世界段 | 同上 grep 零命中 | CODE |
| 世界 bible→basePrompt 有通道 | `compiler.js:660-674` + R10 验证 | RUNTIME |
| E2E 漂移矩阵 | `tmp-e2e/ch{1-9}-text.md` grep | E2E |
| 三线索零落地 | 同上 | E2E |
| 旧书 bible 10 处损坏 | `books/…/E2E-LONGFORM-01A/novel/01_world_bible.md` | E2E |
| AN-2 修复能力 | EO-FIX-SERIALIZE-01 实现+R10 PASS | RUNTIME |
| Beat prompt 未持久化 | find 零结果 | CODE |

---

## Human Seal Record（2026-11-01）

### Q-UC-1-a — 履约方案

> **SEALED: OPTION C — HYBRID**
>
> - 核心世界信息：Scene-level Required。
> - 相关召回信息：Beat-level Optional。
> - 核心信息按 Scene 首拍履约规则处理。
> - 召回信息按 Beat 级七态及 Inclusion Compliance 处理。
> - Scene Initial Inclusion PASS ≠ Scene Full Contract Compliance PASS。
> - Beat-level NOT_OBSERVED 不得被解释为 INCLUDED。
>
> 不得擅自改变 C 的原始定义。

### Q-UC-1-b — Required Source Authority

> **SEALED AT PRINCIPLE LEVEL**
>
> - 书级 Authored 配置是该书 Required 源集的权威来源。
> - 系统模板提供默认配置。
> - 系统默认值不得覆盖作者明确指定的书级要求。
> - Planner 可以进行逐章相关性判断，但不得自行降低、删除或改写作者指定的 Required。
> - Planner 的相关性判断属于 Control，不具有修改 Authorial Intent 的 Authority。
>
> 本轮不确定具体配置 Schema，不授权新增字段。

### Q-UC-1-c — Violation Response

> **SEALED AT PRINCIPLE LEVEL**
>
> 违规响应必须根据：来源权威 / Requirement Classification / Inclusion Status / Omission 类型 / 对当前生产请求的影响，进行分级。不得把 BLOCK/DEGRADE/WARN 统一应用于所有来源。
>
> 具体映射矩阵尚未 Seal。→ 残余 Design Gate 见 Rev2.1 `q-uc-1-residual-design-gate-revision-2.1.md` §1。

### Q-UC-1-d — Core / Retrieval Boundary

> **SEALED AT PRINCIPLE LEVEL**
>
> 核心集：保障作者指定的持续性世界约束；不得仅因 Planner 当前判断不相关而降级；不得把唯一的关键事实保障放在不确定的 Optional Recall 中。
> 召回集：承担按需相关的世界背景；使用 Beat 级 Optional 召回；不得承担核心 Required 的唯一保障职责。
>
> 核心集和召回集的具体分类规则尚未 Seal。→ 残余 Design Gate 见 Rev2.1 §2。

### 决定状态总表

| 子问 | 状态 |
|---|---|
| Q-UC-1-a | **SEALED**（C — Hybrid） |
| Q-UC-1-b | **SEALED AT PRINCIPLE LEVEL**（Schema 未定） |
| Q-UC-1-c | **SEALED AT PRINCIPLE LEVEL**（矩阵未定→残余 Gate） |
| Q-UC-1-d | **SEALED AT PRINCIPLE LEVEL**（分类规则未定→残余 Gate） |
| 实现授权 | **NOT AUTHORIZED** |
| 配置 Schema | **PENDING** |
| BLOCK/DEGRADE/WARN 最终矩阵 | **PENDING** |
| 核心集最终字段清单 | **PENDING** |

### Human Review 状态索引（Rev2.1 同步）

| 项目 | 当前状态 |
|---|---|
| HS-1（Q-UC-1-c 最终映射矩阵） | **PENDING** |
| HS-2（Q-UC-1-d 三层分类矩阵确认） | **PENDING** |
| HS-3（连续遗漏升级规则） | **PENDING** |
| HS-4（T-1 契约证明标准） | **PENDING** |
| HS-5（G-1 Schema 设计方向） | **PENDING** |
| HS-6（G-2 继承路径选择） | **PENDING** |
| HS-7（G-1/G-2 循环解决顺序） | **SEALED — OPTION A (SEMANTIC-FIRST)** |
| SI-1（Book Core 语义默认适用） | **SEALED — I-1A — SEMANTIC DEFAULT APPLICABILITY** |
| SI-2（下层补充规则） | **PENDING** |
| SI-3（非 authored 系统默认项覆盖） | **PENDING** |
| SI-4a（Author Configuration Change 修改权） | **SEALED — OPTION A (AUTHOR-EXCLUSIVE CONFIGURATION CHANGE)** |
| SI-4b（Book Core 语义持续性） | **PENDING** |
| SI-4-AS（Planner 禁降 authored Required） | **ALREADY SEALED**（Q-UC-1-b 原则，不重复裁） |
| SI-5（冲突识别执行者） | **PENDING** |
| SI-6（真矛盾响应级别） | **PENDING** |
| SI-7（条件失效触发源——三类） | **PENDING** |
| SI-8（多来源合并默认策略） | **PENDING** |
| SI-9（CW 冻结边界确认） | **边界确认（非开放选择）**；CW 生产激活状态 UNKNOWN |
| SI-10（Book→Scene 跳层继承规则） | **PENDING** |
| 配置 Schema | **PENDING** |
| 最终 BLOCK/DEGRADE/WARN 矩阵 | **PENDING** |
| Core 最终分类清单 | **PENDING** |
| G-2 具体继承路径 | **PENDING** |
| 最小概念结构 | **PENDING** |
| Named EO | **NOT AUTHORIZED** |
| 生产实现 | **NOT AUTHORIZED** |

### HS-7 Seal 说明

> Human 已选择 **Option A（Semantic-first）**。
>
> 后续设计审查采用顺序：① Book / Volume / Scene inheritance semantic principles → ② Minimum conceptual structure → ③ Schema design。
>
> - 该 Seal **只冻结审查顺序**。
> - 不代表 G-2 三个子缺口（继承路径 / Volume 范围 / 三层合并）已裁决。
> - 不代表任何具体继承机制或 Schema 已确定。
> - 不授权 Named EO 或生产实现。

### SI-1 Seal 说明（Three-Scope Inheritance · 2026-11-07）

> Human 已正式裁决 **I-1a — Semantic Default Applicability**：Book Core 在语义上默认适用于全部下层 Volume / Scene，无需下层显式声明继承。
>
> - 这是 **Human 对 SI-1 的正式裁决——非 GLM 推理结论**。
> - 六条解释边界逐字保留于 Rev1.2 §J（`docs/design/phase-4/e2e-longform-01-q-uc-1-three-scope-inheritance-semantic-review-revision-1.2.md`）。
> - 核心边界：只确定 Semantic Applicability——不等于 Production Context Inclusion，不等于 Beat-level Continued Availability；不改变 Q-UC-1-a 冻结的注入规则。
> - 不授权 Scope 字段、条件机制、继承 Schema、自动判定机制、Named EO 或生产实现。
> - SI-3、SI-10 在本裁决确定的语义原则下继续审查；SI-4a、SI-4b 保持独立，不因 SI-1 获得预设答案。

### SI-4a Seal 说明（Three-Scope Inheritance · 2026-11-07）

> Human 已正式裁决 **Option A — Author-Exclusive Configuration Change**：作者有权通过显式 Author Configuration Change 修改自己此前设定的 Book Core，包括 Required 与 Optional 项。
>
> - 这是 **Human 对 SI-4a 的正式裁决——非 GLM 推理结论**。
> - 七条解释边界+非扩张条款逐字保留于 Rev1.2 §K（`docs/design/phase-4/e2e-longform-01-q-uc-1-three-scope-inheritance-semantic-review-revision-1.2.md`）。
> - 核心边界：修改权属作者不属 Planner（不改变 SI-4-AS Planner 禁降）；修改须显式 ACC 且留记录，不得伪装成 Planner 运行时调整；ACC 不自动追溯改写已生成章节/已建立 Actual/因果历史；具体载体、审计机制、Schema、操作流程不在裁决范围。
> - 不预设 SI-4b 答案；不授权 Named EO、Schema 设计或生产实现。

---

> **Q-UC-1 — HS-7 SEALED (A) · SI-1 SEALED (I-1A) · SI-4a SEALED (OPTION A) — STATUS SYNCHRONIZED**
>
> 当前权威残余设计文档：`q-uc-1-residual-design-gate-revision-2.1.md`（HS-1~HS-6 待 Seal）。
> Rev1/Rev2 保留为历史记录。
