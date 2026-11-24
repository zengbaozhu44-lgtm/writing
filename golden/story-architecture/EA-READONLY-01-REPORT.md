# EA-READONLY-01 — External Design Assimilation Audit

**Date**: 2026-09-07  
**Mode**: READ-ONLY · 无生产代码 / Canon / SR / Runtime / Prompt Contract 修改  
**Boundary**: D1 · Operator=Proxy · Minimal SR · L1≠L2 · Plan≠Reality · SR=Projection · 不新增第二套 Authority / 大型 Engine  

---

### EA-01

**设计原子：** World Time（事件真实发生时间）与 Narrative Order（读者/呈现顺序）分离；二者可变而不复制 Event。

**外部参考：** Timeline 双轴（发生 vs 叙事）；Plottr / Aeon 类时间线工具。

**InkOS 当前承载：**

| 概念 | 实际载体 | 是否一等 |
|------|----------|----------|
| Present World Clock（叙述当下） | `resolveStoryClock().canonical` ← `intent.time/currentDate` → 前序 `scene.text` → `08.时间`；跨章 `anchor.current_date` | 派生锁，非独立 World Time 权威 |
| Narrative Order | `chapter` + `scene.index`（+ beat `order`） | 是（章内/跨章序号） |
| Timeline 磁盘 | `novel/11_timeline.yaml` `days[].day/time/events/chapter` | 有结构；`events` 章提交恒 `[]`（EO-P2） |
| Occurrence ≠ Narrative | — | **不存在** |

**相关代码：**  
`packages/inkos-core/src/lib/story-clock.js` · `packages/inkos-prompt/src/scene-summary.js` · `packages/inkos-brain/src/memory/state-updater.js`（`day: extractDay(ctx.time) || chapter`）· `packages/inkos-runtime/src/memory/memory-unit.js`（`current_date`）· `packages/inkos-context-ranking/src/timeline-canon.js` · `golden/story-architecture/PHASE-1-R2-*`

**当前状态：** LIGHT GAP（线性连续叙事足够；非时序/闪回双轴 REAL GAP；与 D1 无关的消费修复已在 1.R2）

**实际价值：** 若产品仅线性连载，契约澄清即可。若要支持闪回/插叙，现有字段无法同时承载「讲述序」与「发生时刻」。

**发现的真实问题：**

1. `scene.index` = 叙事序；Clock =「今天」；摘要正文日期 = 无类型字符串 → 曾被混读为「今天」（R3-B1；R2 已标 Historical）。
2. `11.days[].day` 缺省回退 `chapter` → 世界日与章号可同值。
3. 无 `occurrence_at` / `narrated_at`；`golden/reality/temporal` 仍为 fixture / UNRESOLVED。

**与 D1 / SR / L1 / Plan≠Reality 的关系：** Story Clock 明确非 SR、非 Reality Authority。双轴若实现，不得让 Plan 日期自动写入 11 events。

**推荐最小改造：** （契约）钉死 `index`=narrative only、Clock=present only；解绑 `day || chapter`。非时序再谈字段。

**是否需要新增字段：** 仅当产品要「讲述序 ≠ 发生序」时需要；线性书可不加。

**是否需要新增模块：** 否。

**风险：** 过早加双轴 → 第二套时间权威 / 与 Clock 消费层冲突。

**测试方式：** 契约测试：`day` 不得静默等于 `chapter`；闪回 fixture 在未授权前保持 UNRESOLVED。

---

### EA-03

**设计原子：** Context Provenance — 每个 Writer 上下文块可回答来源 / 为何进入 / 优先级 / 类型（Canon·Projection·Plan·SR·Historical·Temporary）。

**外部参考：** 可审计上下文管道；块级血缘。

**InkOS 当前承载：** L1 modules 有 `key/label/category/priority`；Minimal SR 内部有 `provenance`（**不暴露给 Writer**）；timeline 有 A-class 资格过滤；09 有 HTML 注释 provenance。**无**统一 `contextType` / `whyEntered` 进落盘或 UI。

**相关代码：** `packages/inkos-prompt/src/compiler.js` · `packages/inkos-core/src/lib/minimal-sr.js` · `packages/inkos-context-ranking/src/timeline-canon.js` · Studio PromptDrawer / metrics

**当前状态：** REAL GAP（可观察契约层）· 局部 EXISTING（SR/timeline/09）

**实际价值：** 直接服务于「为什么 Clock 在却仍跟旧日期」类消费失败诊断；不扩 SR。

**发现的真实问题：** 同内容双通道（如 causal：L1 后挂 + sealed P1）无「同一事实两处投影」标记；metrics 无源追溯。

**与 D1 / SR / L1 / Plan≠Reality 的关系：** Provenance 是观察/纪律层，不得变成获得 Reality 的路径。

**推荐最小改造：** 编译返回 / 落盘增加 per-module `{key, type, priority, kept|trimmed, reason}`；`prevScenesSource: intent|disk`。

**是否需要新增字段：** 否（元数据，非 Canon/SR 字段）。

**是否需要新增模块：** 否（挂现有 metrics / Studio drawer）。

**风险：** 过度建模成第二套「语义数据库」。

**测试方式：** 固定 Scene 编译快照：每块有 type；Clock 块 type=Plan/State；prev_summary type=Historical。

---

### EA-04

**设计原子：** Context Viewer — 完整查看 Writer **实际**收到的最终 Context。

**外部参考：** IDE/调试器式 prompt 检视。

**InkOS 当前承载：**

| 层 | 可见性 |
|----|--------|
| L0 理论（ranking/budget pie/hash） | Studio 有 |
| L1 `compileScenePrompt` | prompt-cache；非 UI 主路径 |
| L2 `buildSceneWritePrompt`（含 Clock） | 落盘 `prompts/ch_*_*.md` |
| L3 Sealed `PromptCompiler.compile` | meta 有；**全文 Viewer 缺** |
| L4 Beat `userPrompt`（真发模型） | **默认不可见** |

**相关代码：** `packages/inkos-studio/` PromptDrawer · `packages/inkos-studio-server/src/writer-optimization/compile-writer-prompt.js` · `beat-slimmer.js` · `packages/inkos-runtime/src/compiler/prompt-compiler.js`

**当前状态：** LIGHT GAP → 半实现（有指标无 L3/L4 全文）

**实际价值：** 高 — 没有 Viewer，消费失败只能猜。

**发现的真实问题：** PromptPage 链路多为示意图；`mustRecompile` 路径用裸 `compileScenePrompt` 覆盖 `basePrompt`，可丢掉 L2 Clock 头（`studio-llm-writer.js` ~254）。

**与 D1 / SR / L1 / Plan≠Reality 的关系：** 只读观察；不改 Authority。

**推荐最小改造：** Writer 调用落盘 sealedHash + beatUserPromptHash +「Clock 是否仍在 L3/L4」布尔；Studio 只读抽屉展示 L3/L4。

**是否需要新增字段：** 否。

**是否需要新增模块：** 否（Studio 观察面）。

**风险：** 把理论 pie 当成实际消费（双预算已不一致）。

**测试方式：** 同 Scene 对比 L2 vs L3 vs L4 是否含 Canonical；断言 mustRecompile 后 Clock 仍在。

---

### EA-05

**设计原子：** Context Budget / Priority — 正确块战胜错误块。

**外部参考：** 优先级栈 + token 预算 + 裁剪策略。

**InkOS 当前承载：** Lore 预算（~2500）+ sealed 预算（7200）；`applyAdaptiveBudget`；context-ranking TopK；P0/P1 不可裁、P2/P3 可裁；Beat slim ≤300 字。

**相关代码：** `packages/inkos-prompt/src/adaptive-budget.js` · `packages/inkos-dynamic-budget/` · `packages/inkos-context-ranking/` · `prompt-compiler.js` `filterLoreForScene` · `beat-slimmer.js`

**当前状态：** EXISTING（机制）+ LIGHT GAP（日历权威未进保护栈）

**实际价值：** 预算系统本身够用；缺口是 **权威块保护**，不是再建 Budget Engine。

**发现的真实问题（有生产证据的竞争链）：**

```text
R3 已证（已修 lore 层）：
  disk legacy 六月 → unlabeled Previous → Writer 选旧日期
  ≫ Story Clock Canonical（在 Prompt 但未赢）

R2 后 residual（仍在 sealed/Beat）：
  Clock 在 L2/P2 lore（可裁）
  → filterLoreForScene alwaysKeep 不含「Story Clock」「信息边界」
  → P3 priorExcerpt = 原始末 800 字（无 Historical 标签）
  → Beat slim / clip 先砍 lore、保护续写原文
  → mustRecompile 时 basePrompt = 裸 L1（可丢 Clock 头）
```

**与 D1 / SR / L1 / Plan≠Reality 的关系：** 保护的是 Plan/State 时钟投影，不是新 Reality。

**推荐最小改造：** alwaysKeep 纳入 Story Clock / Information Boundary；mustRecompile 重跑 `buildSceneWritePrompt`；P3 raw excerpt 继承 Historical 标签或降权于 Clock。

**是否需要新增字段：** 否。

**是否需要新增模块：** 否。

**风险：** 把 Budget 调成「永远塞满」掩盖优先级错误。

**测试方式：** 保留 `test:phase1-r2`；新增 sealed/Beat 层「Canonical 仍在 userPrompt」断言。

---

### EA-06

**设计原子：** Knowledge / State Flags（轻量结构化知悉，非 NL 堆）。

**外部参考：** Ink 变量 / flag；认知矩阵。

**InkOS 当前承载：** `06_knowledge_matrix.yaml`（know|partial|unknown）→ `projectAwareness` → Minimal SR Awareness（结构化 + provenance，Writer 见 `[know|partial]`）；unknown 不进 awareness。State-updater **不写** 06。

**相关代码：** `minimal-sr.js` · `loader.js` · `state-updater.js` · `consistency.js`

**当前状态：** EXISTING · KEEP AS DESIGN（纯 Projection）

**实际价值：** 已覆盖「轻量 flag」需求的主路径；缺口不在缺字段，在矩阵常空时边界不可测。

**发现的真实问题：** 大量 knowledge 仍以 bible NL / ranked TopK 行进入 Prompt；与 Awareness 同源不同形态。08 表易被误认为角色状态权威。

**与 D1 / SR / L1 / Plan≠Reality 的关系：** **禁止**因外部变量思想给 SR 加大量字段 / Persistence。

**推荐最小改造：** 无（保持）；可选：Studio 标明 06=作者 Canon、SR=Projection。

**是否需要新增字段：** **否**。

**是否需要新增模块：** 否。

**风险：** 「结构化 flag → SR writeback」直接撞冻结边界 → REJECT。

**测试方式：** 现有 `test:phase1-sr`。

---

### EA-07

**设计原子：** Scene → active entities → relevant facts/relationships → Writer Context。

**外部参考：** 实体感知检索；避免全量圣经。

**InkOS 当前承载：** `entity-selector`（POV/present/scene.entities）→ importance trim → context-ranking TopK → 人物 `c.raw` 截断注入 + SR。另有 runtime `entity-selector.js`（命名重叠）。

**相关代码：** `packages/inkos-prompt/src/entity-selector.js` · `packages/inkos-runtime/src/memory/entity-selector.js` · `compiler.js` · `inkos-context-ranking/`

**当前状态：** LIGHT GAP

**实际价值：** 管道已在；修重复与过滤即可。

**发现的真实问题：**

1. 双选择器。
2. `filterKnowledge` 已定义但 compiler **未接入** → 知识矩阵全表+TopK。
3. 入选角色卡近全量 `c.raw`（非无限 dump，仍过宽；含全知秘密污染风险，Phase 1 验证已记）。
4. 无独立 Location 实体选择。

**与 D1 / SR / L1 / Plan≠Reality 的关系：** 收紧注入 ≠ 新建 Character State Engine。

**推荐最小改造：** compiler 接 `filterKnowledge`；合并或标明双选择器职责；POV 卡字段白名单（禁 raw 全知秘密进 Writer）。

**是否需要新增字段：** 否。

**是否需要新增模块：** 否。

**风险：** 「Entity Engine」大重构。

**测试方式：** 固定 present；断言非 present 角色卡不进；unknown 矩阵项不进 Awareness。

---

### EA-08

**设计原子：** 同 Scene 多视图引用、不复制事实源（Plottr / Scrivener / Aeon）。

**外部参考：** 单数据多视图。

**InkOS 当前承载：** Scene 正文 SSOT ≈ `novel/_system/brain/ch_*_scenes.json`；Studio Scene / Runtime 读同文件；Story Thread / Story Memory = sidecar Derived View（按 scene.id/index 引用）；`11_timeline` = 章级模块，≠ Scene 时间轴 UI。

**相关代码：** `persistScenes` / `saveSceneArtifacts` · Studio book-service · story-thread · MemoryModulesPage

**当前状态：** EXISTING（正文同源）· LIGHT GAP（Timeline UI ≠ Scene 对象；双 prompt 栈可能漂移）

**实际价值：** 多视图思想已基本落地；不需要再造「Scene DB」。

**发现的真实问题：** Director 富化回填内存 scene；与落盘字段边界需纪律。Timeline「模块页」与「叙事时间线」易混名。

**与 D1 / SR / L1 / Plan≠Reality 的关系：** 视图不得变成第二套 Canon。

**推荐最小改造：** UI 文案区分「Scene Artifact」vs「11 Timeline Canon」；Thread 只读引用。

**是否需要新增字段：** 否。

**是否需要新增模块：** 否。

**风险：** 为「多视图」复制 Scene JSON。

**测试方式：** Thread/Memory 变更不改变 `ch_*_scenes.json` text hash。

---

### EA-09

**设计原子：** Author Intent → Chapter → Scene → Beat → Writer；Plan/Expected 永不等于 Reality。

**外部参考：** 层级大纲工具。

**InkOS 当前承载：** Authored Plan → Planner/serialize → `buildScenePlan` → Scene/Chapter Director → Beat Plan → Writer 只填 `scene.text`。causalChain/Director = Expected 进 Prompt。

**相关代码：** `orchestrator.js` · `scene.js` · `inkos-director` · `state-updater.js` · `causal-reasoner.js`

**当前状态：** LIGHT GAP

**实际价值：** 层级已形成；隔离大体到位。

**发现的真实问题：**

| 路径 | 状态 |
|------|------|
| plan → 11 events / 13 facts | **切断**（恒空） |
| plan → Writer | **允许**（Expected） |
| plan → 08 current_state | **仍渗**（地点/时间/POV 从 intent 重建） |
| plan → 09 next chapter task | **仍写** |

**与 D1 / SR / L1 / Plan≠Reality 的关系：** 核心纪律已部分编码；08/09 是残余 Plan 渗漏面。

**推荐最小改造：** 标注/收紧 08 重建源（区分「运营表」vs「已证实状态」）；禁止把 08 当 Actual Character State。

**是否需要新增字段：** 否（先纪律，后字段）。

**是否需要新增模块：** 否。

**风险：** 「修 Plan→Reality」若做成自动从正文写 Canon → 撞 D1（需 Authority Act）。

**测试方式：** EO-P2 / D1 final；断言 causalChain 不进 11 events。

---

### EA-10

**设计原子：** Actual State Transition — Scene 前状态 → 实际结果 → 真正发生的状态变化 → 下一 Scene。

**外部参考：** 因果状态机；commit 后世界更新。

**InkOS 当前承载：**

| 问题 | 答案 |
|------|------|
| Scene 前状态 | `loadBrainContext` + priorAnchor + 前序 `scene.text` |
| 实际结果 | `scene.text` → `ch_*_scenes.json`；章 `chapters/*.md` |
| Actual Change 如何产生 | **无 Reality 裁决**；`MemoryUnit.commit` 显式 Persistence ≠ Reality Status |
| 谁决定「发生了」 | 无人（Author/Act 未接线）；beat delta = demoted heuristic |
| Expected→Canon | 11/13 空；08 仍从 intent |
| 下一 Scene 得到什么 | 同章内存正文 + 章初 ctx；**06 不因本场自动改** |

**相关代码：** `memory-unit.js` · `state-updater.js` · `beat-memory.js` · orchestrator scene loop

**当前状态：** REAL GAP（Actual 闭环）· 刻意空 events = KEEP AS DESIGN（优于假历史）

**实际价值：** 真要「状态转移」必须走 D1 Authority Act 路线，**不是**本 EA 可偷偷补的 Engine。

**发现的真实问题：** 空 Canon 优于假历史是诚实设计；因此「Character Actual State 跨 Scene 闭合」不存在。任何 PLAN→REALITY 自动修复 = **REJECT**（本审计边界第 8、10、11 条）。

**与 D1 / SR / L1 / Plan≠Reality 的关系：** **直接冲突区**。未授权 Act 前，REAL GAP 必须保持为缺口报告，不得实现。

**推荐最小改造：** **本阶段不实现**。仅文档化「下一 Scene 输入清单」观察面。

**是否需要新增字段：** 现阶段否。

**是否需要新增模块：** **REJECT**（State Transition Engine / Persistence of Actual）。

**风险：** 用摘要/LLM 判断「发生了什么」写入 08/06 → 假 Reality。

**测试方式：** 断言 commit 后 11.events 仍不因 plan 变长；06 文件 hash 不因 Writer 自动变。

---

## Cross-cutting — Single Source of Truth

| 概念 | 权威源 | 分类 | 危险副本 |
|------|--------|------|----------|
| Story Clock | `resolveStoryClock`（intent 锁优先） | Projection / Plan lock | 摘要日期、priorExcerpt 原文、08「时间」、旧 disk scene |
| Character current state | **无统一权威** | 分散 | 08 / 03 / SR / Director situation / character_brains |
| Character awareness | 06 → SR.awareness | Canon(作者)→Projection | ranked knowledge NL |
| Scene state | `ch_*_scenes.json` | Artifact(text)+Plan(goal) | 内存富化 scene |
| Timeline | 11（名义）；events 常空 | Canon 槽位空置 | ranking TopK、Studio 时间线页 |
| Canon event | 理论 11；实践空 | 空置优于假 | causalChain.consequence |
| Scene result | `scene.text` | Artifact | story-thread / memory reports |
| Story thread | studio sidecar | Derived View | 不得当正文权威 |

**核心问题：** 「看起来都像权威」的副本最多的是 **日期** 与 **角色状态**；Phase 1.R2 修了日期消费的一截，**未**统一状态权威（也不应在未授权下统一成 Persistence）。

---

# 最终综合

## A. 已经存在、不需要做的能力

1. Minimal SR Awareness 轻量结构化 Projection（EA-06）
2. Scene 正文多视图同源 `ch_*_scenes.json`（EA-08）
3. Author→Chapter→Scene→Beat→Writer 层级（EA-09 主体）
4. Plan → 11/13 Canon 切断（EO-P2）
5. Lore/Sealed 双层 Budget + Ranking TopK 机制（EA-05 机制面）
6. Story Clock + Historical Continuity 标签（Phase 1.R / R2 lore 层）

## B. 已有基础、可以小改的能力

1. **EA-05 residual**：Clock 进保护栈；mustRecompile 保留 L2 头；P3 excerpt 降权/标注
2. **EA-04**：L3/L4 Context Viewer（只读）
3. **EA-03**：块级 provenance 元数据进 metrics
4. **EA-07**：接 `filterKnowledge`；收紧 bible raw；消歧双选择器
5. **EA-01 契约**：钉死 narrative index vs present clock；解绑 `day||chapter`（不做双轴）
6. **EA-09**：08/09 Plan 渗漏标注与纪律

## C. 真正缺失、值得进入下一阶段的能力

1. **EA-04/05 联合**：最终 Writer prompt 可观察 + 日历权威在 sealed/Beat 仍存活（消费闭环）
2. **EA-03**：块级 provenance 作为诊断契约（非新 Canon）
3. （条件）**EA-01 双轴**：仅当产品明确要闪回/非时序 —— 否则不进本阶段

## D. 好思想，但暂时不要实现的能力

1. World Time / Narrative Order 完整双轴数据结构（无闪回产品需求时）
2. Actual State Transition 闭环（缺 D1 Act 授权）
3. Knowledge 全面 flag 化 / Ink 变量系统
4. 统一 Character Current State 权威库
5. Plotline 多线引擎 / 大型 Context Engine

## E. 明确不应该吸收的设计

| 设计 | 原因 |
|------|------|
| SR 大量新字段 / Persistence | 撞 Minimal SR 冻结 |
| PLAN → REALITY 自动修复 / Expected→Canon | 撞 D1 · Plan≠Reality |
| 第二套 Canon / Memory / State Authority | 边界第 10 条 |
| 新建 Continuity / State / Character Engine | 边界第 11 条 |
| 外部设计自动升为 Writer 必填 | 边界第 12 条 |
| Operator 成为 Reality Subject | 撞 D1 |
| LLM 裁决「哪个日期/状态更真」写回 Canon | 假 Authority |

## F. 推荐实施顺序（≤5）

| # | 项目 | 对应 EA | 性质 |
|---|------|---------|------|
| 1 | **Final Prompt Survival**：Clock / IB 进 sealed alwaysKeep；mustRecompile 重包 L2；Beat 层 Canonical 断言 | EA-05（+R2 residual） | 小改生产消费路径 |
| 2 | **Context Viewer L3/L4**：只读展示 sealed + beat userPrompt + Clock 存活 | EA-04 | Studio 观察 |
| 3 | **Block Provenance 元数据**：type/priority/kept/reason + prevScenesSource | EA-03 | 诊断契约 |
| 4 | **Entity inject 收紧**：filterKnowledge + POV 卡白名单（禁全知 raw） | EA-07 | Prompt 输入卫生 |
| 5 | **Time 契约澄清**（文档+断言）：index≠occurrence；禁止 `day\|\|chapter` 静默；**不**加双轴字段 | EA-01 | 契约 / 防回归 |

**明确不进入本阶段清单：** EA-10 实现 · SR 扩字段 · Timeline 双轴 Engine · Plan→08「变成 Actual」。

---

## 状态冻结（本审计后）

```text
EA-READONLY-01     = COMPLETE (report only)
Minimal SR         = ACCEPTED / FROZEN
D1                 = unchanged
Phase 2            = NOT AUTHORIZED by this audit
Production code    = UNTOUCHED
```

**STOP.** 是否启动 F 表任一项目，由项目负责人授权。
