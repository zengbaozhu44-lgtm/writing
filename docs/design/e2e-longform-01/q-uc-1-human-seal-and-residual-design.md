# Q-UC-1 — Human Seal & Residual Design Gate

**Status**: `Q-UC-1 — PARTIALLY SEALED / RESIDUAL DESIGN GATE COMPLETE — AWAITING HUMAN REVIEW`
**Date**: 2026-11-01 · **Mode**: DESIGN RECORD UPDATE → CONSISTENCY AUDIT → RESIDUAL DESIGN
**Implementation**: NOT AUTHORIZED · **Named EO**: NOT AUTHORIZED
**标注**: 〔SEALED〕=Human 已裁决 · 〔SEALED-P〕=原则级已裁 · 〔V2.2〕=已冻结定义 · 〔CODE〕=代码现状 · 〔E2E〕=实证 · 〔PD〕=GLM 新提候选规则（非契约）

---

## 1. 已 Seal 的决定（摘要，全文见 Packet）

| 子问 | 状态 | 要点 |
|---|---|---|
| a 履约方案 | **SEALED** | C — Hybrid（核心=Scene Required；召回=Beat Optional） |
| b Required 源权威 | **SEALED-P** | 书级 authored > 系统默认 > Planner 仅 Control 判断 |
| c 违规响应 | **SEALED-P** | 按五维分级；具体矩阵待裁 |
| d 核心/召回边界 | **SEALED-P** | 核心保作者持续约束不可降级；召回不可独担核心 |

## 2. 仍未 Seal 的决定

| 待裁项 | 说明 |
|---|---|
| Q-UC-1-c 映射矩阵 | BLOCK/DEGRADE/WARN 与来源×Requirement×Omission 的精确对应 |
| Q-UC-1-d 分类规则 | 核心集包含哪些具体要素 |
| Q-UC-1-b 配置 Schema | 书级 authored Required 配置的具体载体/字段 |
| 预算数值 | 属后续 Named EO |

## 3. Q-UC-1-c 残余 Design Gate：候选映射矩阵

### 已有定义回顾〔V2.2 §5.2-5.4〕

V2.2 冻结了 14 格判定矩阵（Inclusion Compliance + Full Contract Compliance）和三级响应框架（BLOCK/DEGRADE/WARN 语义），但未冻结来源→响应的具体映射。

### 候选矩阵〔PD——非契约〕

| # | 来源类型 | Requirement | Inclusion Status | Omission 类型 | 建议响应 | 违反的契约 | 生产影响 | 证据依据 |
|---|---|---|---|---|---|---|---|---|
| 1 | Truth 源（CW seeds / characterSR） | REQUIRED | SOURCE_MISSING | 上游缺失 | **BLOCK** | 关键 Truth 源缺席→后续 Actual/T2 链无法合法运作 | 生成暂停；需修复数据后继续 | V2.2 §5.3「关键 Truth 源缺失首次即 BLOCK」〔V2.2〕 |
| 2 | Truth 源 | REQUIRED | TRANSFORMATION_FAILED | 转换异常 | **BLOCK** | 同上 | 同上 | 〔V2.2〕 |
| 3 | 核心世界约束（Q-UC-1-d 核心集） | REQUIRED | OMITTED_BY_BUDGET | 预算挤出 | **DEGRADE** + 告警 + 审计标记 | Scene Required 未满足→VIOLATION | 降级继续；累积≥N 次升 BLOCK | 〔SEALED-P c〕+〔V2.2 §5.4〕 |
| 4 | 核心世界约束 | REQUIRED | OMITTED_BY_POLICY | 策略排除 | **DEGRADE** | 同上 | 同上 | 〔V2.2〕 |
| 5 | 核心世界约束 | REQUIRED | SOURCE_MISSING | bible 缺失/损坏 | **DEGRADE** + DATA_QUALITY_SIGNAL | 上游数据质量→非生成端可修 | 降级继续+信号上报修复 | 〔E2E〕AN-2 实证损坏→降级合理 |
| 6 | 召回世界信息（Q-UC-1-d 召回集） | OPTIONAL | any OMITTED_* | 按需裁剪 | **PASS**（不触发响应） | 无违规（Optional 按设计省略） | 零影响 | 〔V2.2 §5.2〕 |
| 7 | 召回世界信息 | OPTIONAL | SOURCE_MISSING / TRANSFORMATION_FAILED | 数据质量 | **WARN**（DATA_QUALITY_SIGNAL） | 非合规违规但为上游质量信号 | 记录+汇总报告 | 〔V2.2 §5.2 COMPLIANT_WITH_DATA_QUALITY_SIGNAL〕 |
| 8 | Clock / IB | REQUIRED | any | 保护段缺席 | **BLOCK** | 语义保护上下文缺席→Writer 可能虚构时间/知识 | 阻止请求 | 〔V2.2 §9〕PROTECT_RE + prompt-survival.js:74 |
| 9 | Beat 续写原文 / 目标链 | REQUIRED | any | 保护段缺席 | **BLOCK** | Writer 无续写基准→复读风险 | 阻止请求 | 〔V2.2 §9〕 |
| 10 | OPTIONAL 反复 OMITTED_BY_POLICY | OPTIONAL | — | 策略持续排除 | **WARN** | 分类可能错位（Optional 被当作不可达） | 统计+汇总 | 〔V2.2 §5.4〕 |

### 设计逻辑说明

- BLOCK 仅限**结构完整性破坏**场景（Truth 源缺席/转换失败/Clock-IB/续写基准缺席）——这些缺失使后续生成语义不可靠
- DEGRADE 适用于**内容级 Required 缺失**（世界约束被挤出/缺失）——可继续但留痕
- WARN 适用于**Optional 层的数据质量信号**与**策略排除模式异常**
- 响应级别由「缺失后果的不可逆性」驱动：结构缺失不可逆→BLOCK；内容缺失可补救→DEGRADE；质量信号→WARN

## 4. Q-UC-1-d 残余 Design Gate：候选核心/召回分类表

### 候选分类〔PD——非契约〕

| 要素 | 默认分类建议 | 作者可覆盖？ | Planner 可降级？ | 不在核心时召回方式 | 召回失败=Required 违规？ | 理由 |
|---|---|---|---|---|---|---|
| **时代**（如「现代都市」） | **核心** | ✓ 可升级/降级 | ✗ 不可 | Beat keys 扩展（时代词命中） | ✓ 若作者指定核心 | 持续性约束——影响所有时代相关描写〔SEALED-P d〕 |
| **核心地点**（如「雾桥镇」） | **核心** | ✓ | ✗ | Beat keys 扩展（地名命中） | ✓ | 同上——地名是场景锚定的基础 |
| **持续性世界规则**（如「无超自然力量」） | **核心** | ✓ | ✗ | Beat keys 扩展（规则关键词） | ✓ | 违反此规则=世界崩坏 |
| **势力格局**（主要势力+敌对关系） | **核心**（仅主要势力名+一句话定位） | ✓ | ✗ | 召回池（势力名 keys 命中） | ✓ | 影响持续阵营行为逻辑 |
| **关键人物与组织关系** | **召回**（按 scene.entities 命中） | ✓ 可指定某关系为核心 | ✓ 可按章调整 | Beat keys（intent.characters 已含） | ✗（Optional 层） | 逐章差异大；全量进核心集会挤占预算 |
| **当前章节局部背景** | **召回** | ✓ | ✓ | slimLoreForBeat 现有机制 | ✗ | 高度动态；按需 |
| **Volume clues**（卷纲线索如钢筋检测报告） | **核心**（当前阶段线索） | ✓ | ✗ 不可降级已有线索 | Beat keys 扩展（线索关键词） | ✓ | 作者指定的延迟揭示线索=持续性叙事约束〔E2E 实证三线索零落地〕 |
| **单次场景细节** | **召回** | ✓ | ✓ | 现有 220 字 slimLore | ✗ | 场景级一次性内容 |
| **作者明确指定的特殊约束** | **核心**（作者指定即核心） | ✓ | ✗ 绝对不可 | 不适用（核心集直入） | ✓ | 〔SEALED-P b〕authored > 系统默认 |

### 核心集预算影响估算〔PD〕

若核心集含时代+核心地点+世界规则+主要势力+当前线索，Scene 级注入预估 ~80-150 字（结构化短句形式）——在 1400 字 Beat 预算内可承受。具体数值属后续 EO。

## 5. Q-UC-1-a/b 一致性检查

| 检查项 | 结论 | 说明 |
|---|---|---|
| Scene 核心集如何继承书级配置 | **语义缺口** | 书级 authored Required → Scene 核心集的继承机制未定义。候选：每 Scene 启动时从书级配置注入核心集（V2.2 §5.1 Source Enrollment 可承载）。**但具体继承路径（直接读取/经 planChapter 传递/经 09 任务卡）未 Seal** |
| Planner 逐章相关性判断如何与书级 Required 共存 | **一致** | 〔SEALED-P b〕已明确：Planner 仅 Control 层判断，不可降级/删除/改写 authored Required。可选实现=Planner 在召回池中排序/筛选，核心集独立于 Planner 判断 |
| Optional Recall 如何避免覆盖 Required | **一致** | 核心集与召回集是**分离的两层**（C 方案定义）；召回池不承载核心集内容（Q-UC-1-d 原则：召回不得独担核心保障）→ Optional 召回命中/不命中不影响核心集的 Required 判定 |
| Scene 首拍注入如何记录 Inclusion | **V2.2 已有定义** | Context Manifest 七态（§9）+ Scene-level Initial Inclusion Compliance（§10 Q-UC-1 四格）——机制已定义，实现属后续 EO |
| 后续 Beat 的 NOT_OBSERVED 如何保持 UNKNOWN | **V2.2 已有定义** | 统一规则②：NOT_OBSERVED 永不被解释为 INCLUDED；Full Compliance 保持 UNKNOWN（§5.2 矩阵 REQUIRED×NOT_OBSERVED=COMPLIANCE_UNKNOWN） |
| **发现的语义缺口** | ①书级配置→Scene 核心集的**继承路径**未定义（直接读/经 planner/经 09——三种路径语义不同）；②核心集的**格式**未定义（结构化短句/自由 markdown/键值对——影响 PROTECT_RE 匹配）；③Scene 级注入后若 Scene 被重规划（SCENE_HARD_FAIL），核心集是否自动重新注入未定义 | **报告——不补造规则** |

## 6. 尚存语义缺口总表

| # | 缺口 | 影响 | 归属 |
|---|---|---|---|
| G-1 | 书级 Required 配置的载体/Schema（文件名/格式/字段） | 实现必需 | Q-UC-1-b 后续 |
| G-2 | 书级→Scene 核心集继承路径 | 实现必需 | Q-UC-1-a/b 交叉 |
| G-3 | 核心集注入格式（影响 PROTECT_RE 匹配与预算） | 实现必需 | Q-UC-1-d 后续 |
| G-4 | Scene 重规划后核心集是否重新注入 | 边界情况 | Q-UC-1-a 后续 |
| G-5 | 召回池 keys 扩展规则（加入地名/势力名/线索关键词） | 实现必需 | Q-UC-1-d 后续 |
| G-6 | DATA_QUALITY_SIGNAL 的具体载体与上报通道 | 观测层 | Q-UC-1-c 后续 |

## 7. 是否具备下一轮 Human Adjudication 条件

**是**。理由：
- Q-UC-1-c 候选矩阵已给出完整映射（10 行覆盖全部主要场景）——每行含来源/Requirement/Status/Omission/响应/契约/影响/证据
- Q-UC-1-d 候选分类表已给出 9 项要素的完整维度分析——每项含默认分类/作者覆盖权/Planner 降级权/召回路径/召回失败后果
- 一致性检查完成，6 个语义缺口明确标注且未补造
- 冻结契约零冲突

**下一轮裁决项**：Q-UC-1-c 最终矩阵 + Q-UC-1-d 最终分类 + G-1~G-6 缺口裁决（其中 G-1/G-3/G-5 可合并为 Named EO 设计阶段处理）。

---

> **Q-UC-1 — PARTIALLY SEALED / RESIDUAL DESIGN GATE COMPLETE — AWAITING HUMAN REVIEW**
