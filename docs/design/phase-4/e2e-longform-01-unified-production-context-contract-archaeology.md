# E2E-LONGFORM-01 — Unified Production Context Contract Archaeology

**Mode**: READ-ONLY · **Date**: 2026-10-26 · **Scope**: Authorial Intent → Beat LLM Request 的完整权威链
**分级**: PROVEN（代码+产物双证）/ OBSERVED（产物实证）/ QUALIFIED（代码推导）/ NOT PROVEN / UNKNOWN
**零改动确认**: 本轮仅 ps/ls/grep/sed/cat/node 只读解析；未触碰任何代码/YAML/JSON/MD/测试书数据。

---

## 1. Executive Summary

**核心发现**：Studio Living 生产链中，作者意图到 Beat 级 LLM 请求的传递存在**四层递进衰减**，且没有任何一层有「作者意图必须到达 Writer」的契约保障。四层：

1. **初始化层**（向导建书）：世界 bible 序列化损坏（8×`[object Object]`）；主角解析依赖「重要度」数字字段而向导写文字 → 全零分 → 数组首名（周砚）成为 primary POV；story_dna 全空。〔PROVEN〕
2. **规划层**（planChapter）：`volumeGoals` 携带卷纲全文但只是死数据（compiler ranking 源无 volume 通道）；`mainGoal` ch2+ 被 story-map 里程碑句替换；`present=[pov]` 使 scene.entities 只装 POV 一人。〔PROVEN〕
3. **编译层**（compileScenePrompt→basePrompt）：世界段进 basePrompt（362 字）但**携带的是损坏内容**。〔OBSERVED〕
4. **Beat 层**（slimLoreForBeat）：**结构性不可达**——lore 预算 220 字、keys=角色名/POV/beat 标签，世界段不含任何 keys → 永不命中 → **即使 bible 完好，世界信息也无法进入 Beat 请求**。整个 Beat prompt 预算 1400 字，其中受 PROTECT_RE 保护的段（Clock/IB/目标链/续写原文/Beat 计划等 ≥20 项）优先占用；无世界段保护标记。〔PROVEN〕

**POV 语义混用**（第五层）：Primary POV / Scene POV / Presence / Access / Participation 五概念在代码中仅由 `intent.pov`、`scene.entities`、`priorAnchor.pov` 三个字段承载，存在一字段多语义。〔PROVEN〕

**架构分叉**：Studio Living 链产生 attribution/character_sr/l1_evaluation 等 brain 侧车，但因 `character_world_seeds.yaml` 缺失 → CW sync 早退 → `world.json` 不存在 → **T2/CW/T3/投影全链在 Studio 生产中零产出**；同时 Studio 有自有的 `character_brains/*.yaml`（living-novel-engine 维护）作为替代角色认知载体。〔OBSERVED〕

## 2. Scope & Read-only Confirmation

考古对象=真实 Studio Living/Run 管线（routes→living-task→controlRun→getDaemon→StudioRuntimeOrchestrator→studioLlmWriter→Beat Execution）。CLI Runtime / legacy / PUT text 行为仅在 §9 作 Divergence 记录。**本轮零文件修改。**

## 3. Production Context Route Map（实际执行路径）

```
[向导建书 POST /api/books]
  initBookV4 → 空模板 novel/01~16
  generateWizardContent(LLL)
    ├ world JSON{era,history,rules,...} ← LLM 返回数组/对象
    │   └ serializeWorldMd(ai-serializers:3-18) ${f.history} 直接插值 ★INIT-1
    ├ characters → 03_bible/*.md（重要度=文字「主角」）
    └ scaffoldStoryMap(book-wizard:109-125)
        ├ primaryPov = names[0] = LLM 生成顺序第一名 ★INIT-2
        └ → pov-grid.yaml + milestones.yaml（含异能量纲）

[每章 run-living]
  planChapter (planner.js)
    ├ volumeGoals = loadVolumeGoal 首段（雾桥三线索全文）★PLAN-1 死数据
    ├ mainGoal: ch1=卷纲段 / ch2+=buildChapterGoalFromMap(里程碑) ★PLAN-2
    ├ pov = priorAnchor?.pov || ctx.pov (planner:137) ★PLAN-3 锚无限优先
    ├ present = [pov] (planner:360) ★PLAN-4 阵容塌缩
    └ applyStoryMapToIntent: POV/goal 只填空不覆盖 (story-map:270-282)

  prepareChapterRun → normalizeBrainContextForRun (brain-context-sync:260)
    └ resolveEffectiveChapterPov: plan.goal 提名→plan.pov→09 POV→protagonist
        protagonist = resolveProtagonistName: 「重要度」数字≥90→主角, 全 0 分→首名 ★INIT-2 传播
    └ syncPlanPovForRun(:222): 解析结果回写 plan.intent.pov ★PLAN-3 自锁

  studioLlmWriter (studio-llm-writer:182)
    ├ compileScenePrompt(ctx,scene) → basePrompt
    │   ├ worldBible 362字=损坏 (loader.js:223 readText→compiler:660-674) ★INIT-1 传播
    │   ├ 关系 TopK(经 G1-A 过滤), NPC块, SR(affect经G1-B), Clock, Actual回读
    │   └ × volumeGoals × milestones.yaml × character_brains × world_state ★PLAN-1
    ├ compileStudioWriterPrompt(compile-writer-prompt:53)
    │   └ executionPlan/beats/boundaries/continuation/reveal… （不含世界）
    └ executeBeatSequence → compileSingleBeatPrompt
        └ compileSlimBeatUserPrompt(beat-slimmer:635)
            ├ renderBeatForWriter(beat 七元素) ← loadSceneContext
            ├ slimLoreForBeat(basePrompt, beat, intent) ★BEAT-1: ≤220字 keys 命中
            │   keys = beat.label/content/libraryBeat + intent.pov + beat.characters + intent.characters
            │   世界段=[object Object]/不含角色名 → 永不命中
            │   兜底 = 「地点|时间|POV|当前|时空|状态|角色」行≤60字 前4行
            ├ buildProtectedSemanticContext(prompt-survival:74)
            │   └ 仅 Clock + IB（世界/角色/卷纲不在保护清单）
            ├ observedContinuity + actualEvents (beat1 时注入) ← 真实 Actual 回读 ✓
            └ clipBeatPromptToBudget(beat-slimmer:461)
                └ BEAT_PROMPT_CHAR_BUDGET=1400, PROTECT_RE ≥20 段白名单（无世界段）
```

## 4. Authority & Carrier Inventory

| 载体 | 设计权威 | 实现权威 | E2E 生效权威 | 判定 |
|---|---|---|---|---|
| 01_world_bible | Story Control（世界信息） | loader 读→compiler worldBible 块 | 损坏内容进 basePrompt 但不进 beat | **AUTHORITY CONFLICT**（载体→basePrompt 有通道→Beat 无通道） |
| 10_volume_outline | 作者意图（章级约束） | loadVolumeGoal→volumeGoals→plan json | plan json 全程携带但零消费者 | **AUTHORITY DEFINED ≠ IMPLEMENTED** |
| chapter_plan（authored yaml） | 作者意图（章级） | loadAuthoredChapterPlan→serializeAuthoredPlanToIntent | 本书无 authored plan（chapter_plans/ 空）→ 全派生 | NOT OBSERVED（本书无） |
| story-map（pov-grid/milestones） | Story Control（导航） | buildChapterGoalFromMap→mainGoal | **ch2+ 唯一活的章级指令源** | **AUTHORITY CONFLICT**（Control 意外成为最高权威） |
| 03_character_bible | 角色 Canon | loader→entities TopK→basePrompt | beat keys 命中但 entities=[pov] | PARTIAL（POV 角色可达其余不可达） |
| 09_current_chapter | Control 任务卡 | resolveEffectiveChapterPov 的源之一+planner ctx | povSync 回写后=锚的回声 | IMPLEMENTED（但语义退化） |
| character_brains/*.yaml | Studio 层角色认知 | living-novel-engine 维护→storyContext | 未追踪到 beat 消费 | **AUTHORITY UNKNOWN** |
| character_world/world.json | Truth（T2/CW） | orchestrator:424 sync 早退（无 seed） | **不存在** | NOT OBSERVED（条件性失败） |
| states/ch_N_anchor.yaml | Control 快照 | writeChapterAnchorFile→priorAnchor | pov/location 继承×9 章 | IMPLEMENTED+OVERREACHING |
| actualEvents（scene 实际） | Truth | beat 首拍 observedContinuity/actualEvents | ch1 场2+ 确有回读 | IMPLEMENTED ✓ |

## 5. Planning Transformation Audit

| 检查项 | 结论 |
|---|---|
| volumeGoals→Chapter Plan | `loadVolumeGoal` 首段→intent.volumeGoals（PROVEN：ch1/2/3 plan json 均含雾桥全文）→**无编译消费者**（collect.js 源清单=`facts/timeline/knowledge/relationships/resources/foreshadow/worldBible/writingBible/stateBoard`，无 volume）；唯一漏出=ch1 mainGoal 取材（planner 从 volume goal 首段构造） |
| mainGoal 语义 | 设计=「本章叙事目标」（Control）；实现=planChapter 派生**或** story-map 里程碑距离句（buildChapterGoalFromMap）；E2E=ch2+ 全为里程碑句 |
| required_event | S3.3：仅 authored yaml 显式槽（authored-input-sanitize:79-80）；本书无 authored plan→不存在 |
| milestones 语义 | story-map YAML：章号+event+must_have+setup_chapters——**Control 层导航**，经 mainGoal 意外获得事实级权重 |
| scene.entities/present | planner:360 `present=[pov]`→scene.entities=[pov]（scenes json 实测=[周砚]）；beats characters 继承 |
| 隐式 fallback | ①planner:137 `priorAnchor?.pov || pov || '主角'` ②resolveProtagonistName 全零分→数组首名 ③resolveEffectiveChapterPov 四级链 ④syncPlanPovForRun 回写 |
| 意图压缩 | ch2+ mainGoal=一句里程碑句（无角色名）→ keys 无角色名 → 220 字 lore 空/兜底 → Writer 仅见 POV 名+beat 指令 |

## 6. Beat Context Compilation Audit

| 维度 | 事实 | 证据 |
|---|---|---|
| keys 来源 | beat.label/content/libraryBeat + intent.pov + intent.storyMap.pov + beat.characters + intent.characters（≥2 字串） | beat-slimmer:364-371 |
| lore 预算 | **220 字**（BEAT_LORE_MAX_CHARS） | :51 |
| 段选择 | basePrompt 按 `#` 分段→跳过 Clock/IB→**keys.some(sec.includes)** 命中才留→每段取前 4 行/160 字 | :373-393 |
| 兜底 | 无 keys 命中时取「地点\|时间\|POV\|当前\|时空\|状态\|角色」行≤60 字前 4 行 | :395-399 |
| 全 prompt 预算 | **1400 字**（BEAT_PROMPT_CHAR_BUDGET），PROTECT_RE 白名单 ≥20 段（Clock/IB/目标链/续写原文/Beat 计划/续写/情绪/人称/SR 衔接…） | :49, :487 |
| 必需上下文 | Clock、IB、目标链、Beat 七元素、续写原文、上一场景尾、Actual 回读（beat1） | PROTECT_RE |
| 按需召回 | lore（keys 命中）、storyMap 作者笔记（≤8 行） | slimLoreForBeat/formatStoryMapWriterBrief |
| 优先/预算决定者 | 全部硬编码于 beat-slimmer.js（无配置无书级覆盖） | :49-52 |
| omission reason | **无**——被裁信息无日志/无 trace/无计数 | 代码审：无 |
| Beat→Writer 二次筛选 | **是**——basePrompt（完整）→slim（裁剪）= 两个不同数据集 | 结构事实 |
| 可观察性 | **beat 级 prompt 未持久化**（find 无 *.prompt；beat-execution 无 writeFileSync）；scene 级 prompt 落盘于 brain/prompts/ 但 beat 内部不可见 → **无法证明某作者意图是否进入了真实 LLM 请求** | find+grep |

## 7. POV / Presence / Access / Participation Audit

| 概念 | 代码字段 | 实际消费者 | 语义冲突 |
|---|---|---|---|
| Primary POV | `resolveProtagonistName()`（canon-analyzer:33-53） | resolveEffectiveChapterPov 兜底、wizard scaffoldStoryMap | **「重要度」数字≥90=主角 vs 向导写文字**→全零→数组首名 |
| Scene POV | `intent.pov`（planner:137）、`scene.pov` | planner scenes、writer povName、renderBeatForWriter | **被锚锁死**：priorAnchor?.pov 无限优先+grid 只填空+sync 回写三重自锁 |
| Presence | `intent.present`（planner:360=[pov]）、`scene.entities` | beat keys、IB 判定 | **POV≠Presence 被实现为 POV=Presence**（present 数组只有 POV 一人） |
| Access | `characterCanAccessActualEvent`（character-sr-updater:51）、IB prompt 文案 | T2 准入、Writer IB 指令 | Studio 链 CW 缺失→Access 链仅 IB 文案层 |
| Participation | `affectedEntities`/`actors`（Actual 事件） | T2/attribution | 与 Presence 无耦合（正确） |

**POV warning 数据源不一致（RC-4）**：warning 读 pov-grid（story-map.js 的连续 POV 检测扫 grid.pov）而实际 POV 来自锚 → 「第5-7章连续 POV『沈昭』」警告与实际周砚 POV 矛盾。〔PROVEN〕

## 8. Intent Propagation Matrix

| 作者意图 | 原始来源 | 中间载体 | 最终消费者 | E2E 结果 | 丢失/变形节点 |
|---|---|---|---|---|---|
| 雾桥镇世界设定 | vol_01 goal+（bible 已损坏） | plan.volumeGoals | **零** | 正文 0 次「雾桥」 | INIT-1（bible 损坏）+ PLAN-1（volumeGoals 死数据）+ BEAT-1（220 字 keys 裁剪） |
| 断桥旧案/连环失踪 | vol_01 goal | plan.volumeGoals | 零 | 正文 0 次 | 同上 |
| 钢筋检测报告（三章延迟揭示） | vol_01 goal | plan.volumeGoals | 零 | 正文 0 次 | 同上 |
| 抽走的卷宗页 | vol_01 goal | plan.volumeGoals | 零 | 正文 0 次 | 同上 |
| 举报信笔迹 | vol_01 goal | plan.volumeGoals | 零 | 正文 0 次 | 同上 |
| 沈昭/顾满仓/陈茂/陈小帆 | 03_bible 5 档 | entities TopK→basePrompt | beat keys | ch1 在场→ch2+ 0 次 | PLAN-4（present=[pov]）+ BEAT-1 |
| POV 轮换意图（沈昭主/顾满仓副） | writing bible+pov-grid | pov-grid.yaml（**内容正确**） | applyStoryMapToIntent（只填空） | 十章全周砚 | INIT-2+PLAN-3 |
| 周砚线索（桥墩残骸） | vol_01 goal 内 | ch1 mainGoal（唯一一次） | beat keys | ch1 部分体现 | PLAN-2（ch2+ 里程碑替换） |
| 角色关系/位置 | 05/07 载体 | loader→compiler | basePrompt | **不可证**（beat prompt 未落盘） | BEAT-1 推定排除（keys 不含） |
| Character 内心 | character_brains/*.yaml | living-engine | 未追踪到 beat | UNKNOWN | 消费链未证 |

## 9. Studio vs Other Runtime Architecture Divergence

| 维度 | Studio Living 链 | Runtime 链（stress/G1 系列） | 分叉性质 |
|---|---|---|---|
| Writer | createStudioLlmWriter→Beat（slim 1400 字） | createLlmWriter→scene.prompt 整段 | **两套 Writer 上下文模型** |
| 角色 | character_brains/*.yaml（living-engine 维护） | character_world/world.json（seed→T2→T3→投影） | **同名「角色认知」双实现** |
| CW 链 | orchestrator:424 调 sync（无 seed→早退→world.json 不存在→T2/CW/T3/l1_access/quarantine 零产出） | seed 驱动全链产出 | 共享代码但**条件性失败** |
| G1-A | loader 05 过滤**共享**（relationship edge rejected 日志=Studio 亦过 G1-A）✓ | ✓ | 共享点 |
| G1-B | minimal-sr 共享 ✓ | ✓ | 共享点 |
| G1-C | 实际提取走确定性提取器（studio-orchestrator 无 extraction 配置）→ 锚定 ID 生效于确定性路径；LLM 提取未接入 | extraction=llm-assisted 全链 | **提取器分叉** |
| attribution/l1_evaluation/character_sr | **产出**（brain/ 下有 ch_N 文件） | 同样产出 | 共享点 |
| Beat prompt 可观察性 | 无落盘 | scene prompt 落盘 brain/prompts/ | 分叉 |
| 设计授权 | 无文档授权双链并存 | — | **AUTHORIZATION UNKNOWN** |

## 10. Open Design Questions / Human Adjudication

### Q-UC-1 世界事实进入 Beat 的权威与预算
- **已知**：世界段在 basePrompt 有通道（compiler:660）但 Beat 层 keys 裁剪使其结构性不可达；220 字/1400 字/PROTECT_RE 全硬编码；无 omission 迹。
- **冲突**：「上下文包含」≠「到达 Writer」——两层编译间无契约。
- **为什么不能由实现者定**：将世界段加入 PROTECT_RE 或扩预算=**Token 工程决策影响全部作品**；「世界应以什么粒度/权威/预算进入每个 Beat」是语义契约问题。
- 可选：a) 世界段入 PROTECT_RE（固定注入）b) 书级导航段（每 Beat ≤N 字简版世界锚）c) 仅 scene 级注入（beat 间继承）d) 维持现状+作者侧修 bible——影响：a 全局成本↑、b 需新「世界锚」概念、c Beat 自主性↓、d 依赖作者。

### Q-UC-2 volumeGoals 的契约地位
- **已知**：卷纲全文在 plan json 三章全程携带但 compiler 源清单无 volume；唯一漏出=ch1 mainGoal 偶然。
- **冲突**：AUTHORITY DEFINED（作者意图载体）≠ IMPLEMENTED（零消费者）——卷纲当前是死数据。
- **不能自决**：卷纲约束应以何种形式（章级 goal 权重/叙事锚/must_have）进入执行=Story Control 层语义设计。

### Q-UC-3 POV/Priority 三机制（锚无限优先+grid 填空+sync 回写）的优先序
- **已知**：三机制叠加=自锁（POVEN）；「grid 只填空不覆盖」注释明示是「尊重作者计划」的有意设计——但 authored plan 不存在时锚便独裁。
- **不能自决**：锚（继承）与 grid（计划）与 09（任务）的优先序是 Control 层权威契约，涉及「无 authored plan 时谁导航」。

### Q-UC-4 present=[pov] 的语义
- **已知**：planner:360 将 Presence 实现为 [POV]——五概念中 POV/Presence 被合并。
- **不能自决**：拆开（present=场景 cast 推导）需定义「在场判定权威」（与 G1-A 身份链交叉）。

### Q-UC-5 Studio/Runtime 双链
- **已知**：两套 Writer 模型+两套角色认知载体+提取器分叉；CW 在 Studio 条件性失败；**无架构文档授权双链**。
- **不能自决**：合并/分工/桥接=全局架构裁决（牵动 G1-A/B/C 在 Studio 的语义等价性）。

### Q-UC-6 Beat prompt 可观察性
- **已知**：无法证明某作者意图是否进入了真实 LLM 请求（beat 级未落盘）——合同审计不可能。
- **不能自决**：beat prompt 落盘=新可观察性载体（观测≠Truth 但需授权边界）。

## 11. Evidence Index

| 证据 | 位置 |
|---|---|
| 8×[object Object] bible | books/…/E2E-LONGFORM-01A/novel/01_world_bible.md |
| 序列化无守卫 | packages/inkos-studio-server/src/ai-serializers.js:3-18；ai-service.js:208 |
| primaryPov=names[0] | book-wizard.js:119；scaffoldStoryMap store.js:51 |
| 重要度数字解析 | canon-analyzer.js:53,62 |
| 锚优先 | planner.js:137 |
| grid 只填空 | story-map.js:270-282 |
| sync 回写 | brain-context-sync.js:222,260 |
| present=[pov] | planner.js:360 |
| volumeGoals 死数据 | plan json ×3 章；collect.js 源清单 |
| ch2+ mainGoal=里程碑 | plan json ch2/3/9 mainGoal 实测 |
| slimLore 220 字 keys | beat-slimmer.js:49-52,361-399 |
| PROTECT_RE ≥20 段 | beat-slimmer.js:487 |
| 保护段仅 Clock+IB | prompt-survival.js:74-105 |
| POV warning 矛盾 | story-map warning 行（server 日志） |
| CW 零产出（无 seed） | brain/ 无 character_world；seed 不存在 |
| character_brains 存在 | _system/character_brains/*.yaml ×5 |
| beat prompt 未落盘 | find 零结果；beat-execution 无写盘调用 |
| attribution/l1/character_sr 产出 | brain/attribution/ch_N.json 等 |

## 12. STOP

> **READ-ONLY ARCHAEOLOGY COMPLETE — STOP**

未创建 Design Gate 结论；未生成 EO；未修改任何代码或数据；全部 Open Questions 留待 Human / Design Gate 裁决。等待用户审查。
