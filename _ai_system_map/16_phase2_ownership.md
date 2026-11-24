# 16. Phase 2 — Ownership Consolidation（责任收敛）

> 日期：2026-08-19 ｜ 状态：**v1（三项拍板已定）** ｜ 性质：设计方向文档（非事实记录）
> 一句话：InkOS 的问题已从「有什么垃圾」变成「同一个文学问题谁负责」。Phase 2 不做大规模删除，做**一个问题 → 一个负责人 → 一个决策出口**。
> 核心原则（拍板补充）：「Chapter Director 其实只是 prompt 块工厂」这一发现说明方向**不是给现有模块升职/调权，而是重新定义契约，让模块承担它真正应承担的责任**——比简单调权更接近架构收敛。

---

## 1. 现状 Ownership Map（证据：今天谁真的影响什么）

> 判定口径：谁**写进 intent / 拦截 / 重入**，谁就是负责人。建议者不算。

| 文学问题 | 现状负责人（file:line） | 现状判断 |
|---|---|---|
| **为什么这一章存在** | 作者 authored plan（chapter_plans/*.yaml → planner.js:288 `serializeAuthoredPlanToIntent`，Studio 主路径）**或** planner.js:86-133 `planChapter` / :362 `planNextChapter` + story-map.js:257 `applyStoryMapToIntent` | ⚠️ 双主（作者 vs planner） |
| **章节目标（本章要发生什么）** | 同上；chapterTone/volumeSeed 也能改写 mainGoal（planner.js:102/118） | ⚠️ 三处可写 |
| **人物为什么行动** | 无 Character Intent 模块。Studio：character-behavior / character-transformation / writer-first / writer-scene-arc / scene-director / scene-execution 8+ prompt 块（经 buildSceneEngineBundle）；CLI：planner intent + writer | ❌ 无单一所有者 |
| **冲突如何升级** | planner 层 decision.js `evaluateDecisions` + conflict.js `evaluateConflict`（**仅无 authored plan 时**运行）+ conflict-engine prompt 块 | ⚠️ 有检查、无运行时出口 |
| **场景如何执行** | CLI/Runtime：scene.js `buildScenePlan`；Studio：scene-execution.js `buildSceneExecutionPlan` + beat-execution.js | ❌ 双轨双主 |
| **是否违反事实** | consistency `checkConsistency`（章级硬闸）+ validation.js `validateChapter` 八项 + facts_db/timeline 追加 | ⚠️ 三处各自判"违反" |
| **是否需要恢复** | orchestrator.js:336 `_resolveChapterResult`（replanIntent 有界重入；source=validation_replan\|metrics_replan，:351；maxReplan=3，:39）| ✅ **唯一已单一化** |

**结论**：六问里只有「是否需要恢复」收敛了（且是 Phase 0/1 顺带收敛的）。其余五问全部多主——你的判断正确。

---

## 2. 目标 Authority 表（提案 → 落点）

| 问题 | 唯一负责人 | 落点 / 现状到目标的差距 |
|---|---|---|
| 为什么这一章存在 | **Chapter Director** —— Chapter Intent Authoring Layer（**Studio only，不进 Runtime authority**） | 现状 chapter-director.js 只是 prompt 块工厂（format*Block），不是 authority。收敛 = 重新定义契约为「章意图填充者」：把 authored plan / planner 的意图规范为 ChapterIntent 四问并装饰 prompt。见 2.4 |
| 人物为什么行动 | **Character Intent** | 现状无此模块。收敛 = 定义「角色意图」为 beat 的输入契约（见 2.5 Beat 减负）。新概念，不建新引擎 |
| 冲突如何升级 | **Conflict** | 现状只在"免检 / 检查"间摇摆。收敛 = conflict 唯一出口（仍仅无 authored plan 分支） |
| 场景如何执行 | **Scene Director**（Studio） | 现状双轨。收敛 = 文档已定 Studio 为真相（14/15）；Runtime `buildScenePlan` 降为 CLI 兜底 |
| 是否违反事实 | **Consistency（硬约束，规则）** | 现状与 validation 重叠。收敛 = validation 并入"世界契约"检查。见 2.3 |
| 是否需要恢复 | **Runtime Recovery**（orchestrator replanIntent） | 已收敛。2.2 概念化为 RecoveryIntent，**零代码** |

---

## 2.5 Ownership ASCII 责任图

```
                    问题 → 唯一负责人（决策出口）
   ════════════════════════════════════════════════
   为什么这一章存在   → Chapter Director  （Chapter Intent
                        Authoring Layer · Studio only）
   人物为什么行动     → Character Intent （beat 输入契约）
   冲突如何升级       → Conflict         （仅无 authored plan 分支）
   场景如何执行       → Scene Director   （Studio）
   是否违反事实       → Consistency      （硬约束·规则·世界契约）
   是否需要恢复       → Runtime Recovery （replanIntent 有界重入）

   ┌──────────── 建议层（只建议 · 不决策） ────────────┐
   │ Planner（未来可能）· story-map 章功能 · adaptive  │
   │ director prompt 块 · 07_state_board · 软评       │
   │ （critic / reader-simulator）                    │
   └────────────────────────────────────────────────┘
                          │ 只填充 / 装饰，不推翻
        ┌─────────────────▼──────────────────────────┐
        │  Studio 生产路径（真相）                     │
        │  ① authored plan（最高权威 · 作者）           │
        │  ② ChapterIntent 四问（章契约）              │
        │  ③ Beat（actor/intention/action/…）         │
        │  ④ Writer（逐 beat LLM 正文）                │
        │  ⑤ Consistency 硬闸 → 软评 → 恢复（有界）     │
        └────────────────────────────────────────────┘
        CLI / 兜底：planner → buildScenePlan（非规范）
        （记忆 / 自适应 / 因果链不全）
```

## 3. 收敛差距 → 执行顺序（2.x，全部先文档后代码）

### 2.2 RecoveryIntent 概念收敛（热身，零代码）
把现有字段概念化为一张表，杜绝"任何失败 = replan"：

| 现有字段 | RecoveryIntent 概念 |
|---|---|
| `replanIntent`（partial intent） | `payload`（恢复用的新意图） |
| `_replanSource`（orchestrator.js:354） | `source` |
| `validation_replan \| metrics_replan`（orchestrator.js:351） | `reason`（枚举） |
| chapter（固定） | `scope`（chapter \| scene） |
| `maxReplan`（:39，默认 3） | `maxRetry` |
| `chapterReplanCount`（:119） | `currentRetry` |
| `replanExhausted`（:348） | `nextAction: stop_with_error` |

```yaml
RecoveryIntent:
  reason: validation_failed | metrics_failed | continuity_break | scene_hard_fail
  source: validation_replan | metrics_replan | scene_hard_fail | preset_intent
  scope: chapter | scene
  maxRetry: 3
  nextAction: replan_chapter | regenerate_scene | regenerate_beat | stop_with_error
```

> 命名说明：RecoveryIntent 在 1.6 被列为"不提前引入"；用户已在 Phase 2 方向中**正式启用**，2.2 起文档使用。
> 拍板（✅）：RecoveryIntent **概念正式化，代码暂留 replanIntent**（零代码，仅文档定义契约）。
> **完整契约见 `17_phase2_recoveryintent_contract.md`**（五问 + 枚举白名单 + 字段映射 + 禁止行为 + ≠Replan）。

### 2.3 World Truth & Quality Gate Contract（✅ 已通过 = 权力地图）
- **核心问题（用户重定义）："谁有资格阻止故事继续生成？"**——不是"怎么合并 Validator"。第一性原则：**判据强度 ≠ 阻断权限**（今天倒挂）。
- 完整契约见 `18_phase2_world_truth_quality_gate.md`（Phase 2 最重要的一张权力地图）：否决权全景 + 判据分界 + **三轨权力模型** + 最终权限表。
- **三轨模型（已拍板）**：World Truth Gate（consistency，Hard，失败分级 recoverable/terminal）→ Story Progress Gate（validation，Hard-ish，有界阻断）→ Soft Review（metrics/critic，不阻断 suggestions[]）。Recovery Bridge 只挂在两个 Hard 闸后，Soft Review 不触发恢复。
- **关键发现**：软闸有硬权（critic 终端停无恢复）、硬闸无恢复（consistency 终端停不走恢复桥，恢复桥今天挂在软闸上）。
- **对 2.4 的边界**：Chapter Director 负责「这一章应该发生什么变化」，**无资格**裁判「这一章是否符合世界规则」——后者属 Gate。

### 2.4 Chapter Intent Contract（✅ 已通过 = 恢复语义，完整契约见 19）
- **方向修正（用户拍板）**：旧理解「Director 从 prompt 块工厂升级为 Authoring Layer」是错的。正确事实：**Chapter Intent 本来已经存在，问题不是缺 Authoring Layer，而是 serializer 压扁导致作者意图损失**。方向 = **恢复语义，而不是新增结构**。
- **Chapter Intent Minimum Contract（四问固定）**：`goal`（谁想得到什么）/ `conflict`（谁阻止谁）/ `turningPoint`（什么事件改变方向）/ `irreversibleChange`（什么东西无法恢复）。其余（hook/pov/rhythm/climax/cost detail）为增强信息。
- **D4**：`mustLose` → `irreversibleChange`，提升一等公民（进 Narrative Task 显式行，防止模型写「问题解决→恢复平静」而缺「选择→代价→新世界状态」）。
- **D5**：保持「压扁即渲染」，**不新增中间 Intent 层**；修 serializer 让作者输入被**保护**而非重新解释。
- **D6 定位修正**：**Chapter Intent Contract = 全系统概念**（未来 CLI 也指向它，来源不同：Studio=作者→plan→director enrich；CLI=planner→intent）；**Chapter Director = Studio 侧 Authoring Helper**，不是 Runtime authority。
- **新原则**：**Phase 2 不是创建新的故事抽象，而是恢复已经存在但被系统压扁的故事语义。**（直接指导 2.5/2.6/3 的减法。）

### 2.5 Beat Contract（✅ 已通过 = Beat 已是故事发动机；任务 = 确认 + 防复肥，完整契约见 20）
- **方向修正（用户拍板）**：Beat 不是「太重→删字段」——核心循环健康（Before→Action→After→State Delta）。2.5 任务 = **确认 Beat 已经是什么 + 防止未来复肥**。
- **最终 Beat Contract（用户定稿）**：`position (goal|obstacle|choice|consequence|newInformation|hook) / beforeState (snapshot) / action (what happened) / afterState (snapshot) / change (required state delta)`。
- **第一原则（D7）**：`change = After − Before` = **状态变化证明，不是文学字段**；「Before ≠ After」为硬原则。
- **D8**：actor/intention/resistance **不进入 Beat 字段**（保留在 Scene/Character Intent 层）——否则一年后复肥为 `actor/desire/emotion/motivation/obstacle/tension/hook/state/metrics`。
- **D9**：六拍保留；**Hook(position) ≠ Hook(score)**——结构位置（叙事六拍）vs Soft Review（readerSimulator 章级），防止 reader 指标塞回 Beat。
- **禁止进入 Beat**：`emotionScore / informationScore / tensionScore / hookScore`（要么已不存在，要么属 Soft Review）。
- **Phase 2 总原则（本次元发现，指导 2.6/3）**：连续三步同一模式——**原问题不是没有模型，而是模型之间边界污染**（Chapter Intent=serializer 语义丢失 / Recovery=已有 replan 没契约化 / Beat=已有 state delta 输入责任没分层）→ **不新增故事抽象，先恢复已有抽象的职责边界**。

### 2.6 State Board 分层契约（✅ 已通过 = 状态最小模型，完整契约见 21）
- **用户警告（风险最高的步骤）**：删除状态字段 ≠ 减少复杂度；真正目标 = 区分「影响未来故事的事实」（Story Truth）vs「只当前镜头需要的信息」（Scene Memory）。
- **总原则（拍板新增）**：**状态不是系统拥有的信息总量，而是未来故事分叉所依赖的最小事实集合。**
- **状态分层模型（不要全叫 Story State）**：Story Truth → `Continuity Anchors`（relationship/facts/irreversible events）/ `Writing Identity`（POV/voiceDna —— **voiceDna 不进 Runtime 状态**，影响「怎么写」非「发生了什么」）/ `Scene Memory`（temporary objects/local emotions/current positioning）。
- **D10** ✅ anchors 分层确认不扩张。**D11** ✅ 07_state_board 降级 CLI-only 文档契约，不改代码，不恢复 Studio 写端、不建 situation→07 同步层（避免第二事实源）。**D12** ✅ adaptive history 窗口化，定位 **Runtime adaptive telemetry**（非 Story Memory，禁止 history→story reasoning）。**D13** ✅ canon 空转承认事实：05/06 标记 **Reserved Schema**（Current Authority: Anchor/Facts DB），不恢复伪写端（真实链路 `Story Event→Anchor→Continuity` 已工作）。
- **连续性保护清单（绝不动）**：memory-hierarchy L1-L4、deriveBodyStateFromFacts（F013 硬执行）、situation-engine 三维局势。三者共同点 = **状态变化不是状态快照**。
- **7 大发现**：Studio 局势来自 situation-engine（prompt-compiler:199）非 07；05/06 空但 anchor 有活数据；cognitive-gaps 引用不存在 km 行；adaptive history 无界。
### 2.7 Prompt Compiler 减法审计（✅ 已通过 = 语义所有权收敛，完整契约见 22）
- **用户判断**：不要做 Prompt 大砍，做语义所有权收敛。真正的问题不是 token，而是**谁拥有语义的解释权**。
- **总原则**：Prompt 层减法不是删除信息，而是删除语义重复；**每个信息必须有唯一 owner，多个模块只能消费，不能重新定义**。
- **三层架构**：种子层 compileScenePrompt（旧式 dump）→ 密封层 prompt-compiler P0-P3（16 P1 块）→ 逐拍层 beat-slimmer（~400行，system=精简身份，栈按键切片）。
- **真相**：executionPlan 24 字段全 FILLED（无死代码）；逐拍 token 被 budget 钳制；**真实成本=编译期工程维护面**；Prompt 层重复很可能只是 **State 层膨胀的结果（→2.8）**。
- **D14** ✅ 写作五政策=WritingCraft（expression/investigation/scene）文档认领，不合并（Phase 3 再定 5→1→多 renderer）。**D15** ✅ 角色三引擎=**Character Intent 单源契约**（desire/fear/hiddenNeed/transformation）；不删除 transformation（驱动力→选择→变化方向）；三引擎=消费者投影。**D16** ✅ **Chapter Intent 四问=唯一主干**，SceneGoal=derived_from，**priorityGoal 标记危险**（"加一个目标"是复杂度增长典型源）。**D17** ✅ Seed Layer→**Canon Extractor**（World/Character/Faction Canon），禁止章节状态混入；`冲突==阻碍`=不同层级混入，按三层阻力分层修（Seed=世界阻力/Intent=本章阻力/Beat=拍内碰撞）。**D18** ✅ Beat Slimmer 保留=**Execution Guard Layer**（执行保护非语义创造；判据：同一事实多载体=重复，上拍遗留的运行时提醒=保护）。
- **收敛方向（用户定）**：`Canon → Character Intent → Chapter Intent → Scene Intent → Beat Execution → Writer → Truth Gate`，不是 20 模块→20 解释→拼装。
- **2.8 预告**：**State Board 驱动 vs 装饰审计**——哪些状态真驱动故事，哪些只是让系统「感觉记得很多」。

### 2.8 State Board 驱动 vs 装饰审计（✅ 已通过 = 单向数据流铁律，完整契约见 23）
- **用户假设验证**：Prompt 层重复 = State 层膨胀的结果 ✅。膨胀三机制：**一值多槽（副本）**、**派生链膨胀（解释权分散）**、**纯装饰（写了没人读）**。
- **拍板总纲**：不要因为发现死状态就立刻大扫除。**先把 State 所有权契约钉死，再做代码收敛。**
- **核心结论（Story State 定义压缩成一句）**：**「只有会改变未来故事选择空间的状态，才属于 Story State。」**（张北知道某秘密/关系破裂/失去资源/受伤/事件已发生 = 属于；字数/critic 分/耗时/历史记录/prompt hash = Telemetry。）
- **三个真相**：① 三个 history yaml 全仓零读者（scene_history 连 Studio 都写，读一个没有）→ **Telemetry/Audit History**；② 审计层 story_health/reader_sim_baseline 写了不喂回（只 UI/Soft Review）；③ 真驱动链全部是「状态变化」非「状态快照」（呼应 2.6 §4）。
- **D19** ✅ 历史文件降级 **Telemetry/Audit History**（非 Story Memory），不进入 Prompt/Story Context/Planner 输入/Runtime 决策；**暂不删写端**（保留诊断/UI 用途，Phase 3 统一清理；decision/conflict 还有 CLI 兜底写，别混「没人读」和「未来诊断价值」）。
- **D20** ✅ executionPlan 双层嵌套 = 副本，**顶层字段必须有顶层语义；没有独立语义的字段不得因「方便 prompt」而复制**；目标 `ExecutionPlan { chapter-level facts, scenes[] scene-local facts }`；Phase 3 按真实消费者逐字段删。
- **D21** ✅ Character Intent 为源，派生值只向下流；修正——push/priorityGoal/fear/choice 不能全叫「渲染槽位」，其中有些是**派生事实**；**尤其 choice 是故事行为，不只是 prompt 字段**。
- **D22** ✅ **终止 derive 回写，改单向派生**（D19-D23 最该进 Phase 3 的代码改动）。铁律：`source → derive() → executionPlan`；禁止 `source → derived → source mutation → next derivation`（状态污染）。**单向数据流 = 本轮减法真正留下的一条架构铁律**。
- **D23** ✅ adaptive **不升格** = Planner 的生成调节机制 + telemetry；不是 Story Truth/Character Intent/Chapter Intent/Runtime authority；不要为「统一架构」拉回主路径。
- **Phase 2 主线（拍板定论）**：`Canon → Character Intent → Chapter Intent → Scene Intent → Beat Execution → Writer` → `World Truth Gate / Story Progress Gate` → `Recovery`；旁挂 `Soft Review / Telemetry`，**不能反过来定义故事本身**。**InkOS = 维护故事因果、人物选择和状态变化，同时把语言生成权交给模型的故事驱动引擎。**
- **2.9 预告**：2.8 收口，不再挖 Prompt/State 字段。下一步**横向审计**：`Canon → Character → Chapter → Scene → Beat → State` 是否**真的形成单向 ownership**（不新增抽象层）。

### 2.9 横向单向 Ownership 审计（✅ 已通过 = 作者散文层 + 渲染栈 + 状态环，完整契约见 24）
- **审计问题**：pipeline 是否真的单向 ownership？结论：**方向单向成立（无上游回写），但 ownership 链有两条断边。**
- **三发现**：① 方向单向成立（intent 链无层写回上游，2.8 plan 回写是同一 scene 对象内循环）；② **`Character→Chapter` 边不存在**（planner.js 全文件零角色意图引用；角色欲望只在 scene-execution 时刻从 story_dna 现推，从不影响章规划；作者写 storyDna + chapter_plans 是平行输入，一致性零检查）；③ **`Chapter→Scene` 是字符串盖章**（serializeAuthoredPlanToIntent:297-298 同一 conflict 文本灌进每个场景，缺场景从 climax/cost/ending 补齐）。
- **拍板定论（最有价值）**：**「架构上应该有一条边」≠「代码里应该补一条边」。这次不补，反而是减法。**
- **D24** ✅ 不补 Character→Chapter 边——补「一致性验证」=新增仲裁者（Character Validator/Intent Conflict Resolver/Override/Replan）开始长出正在删的东西；**作者=两个信息源交叉点**，系统只执行保持一致，不替作者判断；除非真实质量问题出现。
- **D25** ✅ 不改 Chapter→Scene 盖章，**准确命名**：`serializeAuthoredPlanToIntent()` = **Author Plan Normalizer / Serializer**，不是 Story Planner；不假装存在结构化派生器（否则有人加 deriveSceneIntent 重新发明 Planner）。
- **D26** ✅ 三层图定稿：**作者输入层（story_dna ∥ chapter_plans，作者拥有意图/章目标/场景描述）→ normalize/serialize → 渲染执行层（Canon→Character Desire 现推→Scene Execution→Beat→Writer→Truth/Progress Gates）→ 状态产生/固化 → 故事状态环（Writer→anchors→下一章）**。**最值得保留**：「作者层可以是多源的；执行层必须是单向的；状态环只能向未来传播，不能反向改写作者意图。」
- **Phase 2 红线（最重要的减法纪律之一）**：**不要再把「缺失的边」自动视为架构缺陷**——看到 A 没有→B，先问五问（因果关系？解决真实生成质量问题？谁有仲裁权？制造新状态/Validator/Resolver？作者可否承担决策？），答案是「只是让架构图完整」就不加。
- **2.10 预告**：Phase 2 进入「架构冻结前验证」。**negative-space audit**：对 Canon/Character/Chapter/Scene/Beat/State/Gate 问「删掉以后哪个真实故事能力会立刻消失」，答不出来进待删名单。

### 2.10 Negative-Space Audit（✅ 已通过 = Phase 2 收口闸 + 最小故事内核 + Architecture Freeze，完整契约见 25）
- **审计结论**：七概念（Canon/Character/Chapter/Scene/Beat/State/Gate）全部答得出「删除后消失的真实故事能力」→ **InkOS 最小故事内核成立**：Canon=世界允许什么 / Character=谁为什么行动 / Chapter=本章不可逆变化 / Scene=变化在哪发生 / Beat=变化如何一步步发生 / State=变化留下什么 / Gate=什么不能被违反 =「人物有目的→做选择→遇阻碍→产生结果→状态改变→故事继续」。
- **D27** ✅ 最小故事内核保留清单成立（负空间证明，非「看起来重要」）。
- **D28** ✅ 候删清单成立但**只是删除候选不是删除命令**：先证明「删除后无故事能力损失」再删；**Author View（09/08）与 Story State 分离，不把 Author View 当死代码删**。
- **D29** ✅ **Architecture Freeze 铁律**：任何新增抽象/字段/状态/Validator/Director/Prompt Layer 必须属于七概念之一 + 过 Negative-Space Test，否则不得进入生产架构；**「帮助模型更聪明」不是新增架构层的充分理由**。
- **关键变化（拍板定稿）**：**Prompt / Planner / Metrics / Director 不在核心架构里**——Brain/Runtime/Prompt Compiler/Planner/Director/Metrics/Memory 都是实现手段，不是故事本体。
- **Phase 3 Core Reduction 启动**（用户：不建议 2.11/2.12，Phase 2 收口）：**P3.1** 删零读者状态（history/story_health/空文件/state_machine）→ **P3.2** 清冗余状态槽（executionPlan/scenePlan/priorityGoal/desire/push/fear/choice：source of truth vs projection/render slot，直接减 Prompt 重复）→ **P3.3** 修正 Story Truth（每核心事实唯一 owner）→ **P3.4** narrative-runtime 只迁移活能力（EMOTION_WAVE/validateEmotionWave/suggestNextEmotion/assertInformationGapMeaningful，不死删整包）→ **P3.5** 最后才动 Prompt（State 减法→Intent 收敛→Prompt 自然变薄）。
- **P3.1 正式关闭（2026-08-19 用户拍板）**：✅ CLOSED，不再回头细抠已验证部分。删除 7 个持久化目标（05/06/state_machine/3×history/story_health）+ 全写端/导出端清理；负向删除证明全绿（executionPlan/promptFingerprint/pipeline/5 闸门 byte-identical，memoryMutation.added 精确移除 7 目标）。**第一次证明 InkOS 可不动生成语义地删除一整组持久化概念**；被删状态不是 Story Truth 也不是必需中间状态。readerSimulator 漂移 = 既有 golden determinism 缺陷，单独记为 FOLLOW-UP A（不现在修）；05/06/loader 防御接口 = FOLLOW-UP B 归 P3.2。完整记录见 `26_phase3_cleanup.md`。
- **P3.2 目标重新定义（用户拍板）**：⬜ NEXT。**不是「继续删字段」，而是「找出同一个 Story Truth 被存储两次、三次、五次的地方」**——审计 `characterDesire/priorityGoal/push/fear/choice`、`chapterGoal/authorIntent/sceneGoal/priorityGoal`、`scenePlan/executionPlan` 的重复存储，及 `derive → 回写 → 再派生` 链（违反 D22 单向数据流）。**P3.1 证明「减法不会伤故事」；P3.2 证明「一个故事事实不应该拥有五个名字」**。审计范围见 `26_phase3_cleanup.md`。
- **Phase 3 KPI（拍板定稿）**：不是删多少文件/行/模块，而是「**一个故事事实 → 几个 owner？→ 几个中间翻译？→ 几个地方重新解释它？**」目标 = **One Story Truth → One Owner → 必要的 Projection → Writer**。InkOS 不是缺故事智能，是**同一事实被不同名字/结构/Prompt 块重复解释太多次**。

---

## 6. Phase 2 收口声明（2026-08-19）

Phase 2（责任收敛 2.1-2.10）**已全部拍板完成**：
- 权力地图（2.3）→ Chapter Intent（2.4）→ Beat（2.5）→ State（2.6）→ Prompt（2.7）→ State 驱动 vs 装饰（2.8）→ 横向单向 ownership（2.9）→ Negative-Space 收口（2.10）。
- **沉淀为一条主线**：`Canon → Character → Chapter → Scene → Beat → Writer → Gates → State → 下一章`，旁挂 Soft Review/Telemetry（不能反过来定义故事）。
- **三条铁律**：① Architecture Freeze（七概念 + Negative-Space Test）；② 单向数据流（source → derive → executionPlan，永不回写）；③ 红线（缺失的边不是缺陷，先过五问）。
- **进入 Phase 3（Core Reduction）**，执行顺序 P3.1 → P3.5，KPI = One Story Truth → One Owner → Projection → Writer。

---

## 4. 明确不做（Phase 2 边界）

- 不做大规模删除（Beat 只降级不删；validator 只收敛出口不删实现）。
- **不引入新运行时模块**——Story Authority 是责任规则不是模块；Character Intent 是契约不是引擎。
- narrative-runtime 外科拆分仍属 **Phase 3**（Phase 2 只文档化其状态）。
- 一切先文档、后代码；每步交付可审。

## 5. 拍板记录（2026-08-19，三项全定）

1. **Chapter Director：Studio only** ✅ —— 作为 **Chapter Intent Authoring Layer**，不进入 Runtime authority；CLI/兜底保持 planner + Runtime buildScenePlan。
2. **RecoveryIntent：概念正式化** ✅ —— 文档定义契约，**代码暂留 replanIntent**（零代码改动）。
3. **Ownership ASCII 责任图：补** ✅ —— 见 §2.5。

**配套共识**：Phase 2 方向是**重新定义契约**（让模块承担它真正应承担的责任），**不是给现有模块升职/调权**。
