# 29. P3.4 Engine 双层字段审计 — 只读（2026-08-20）

> 审计令（用户拍板）：**只调查 → 出 ownership 地图 → 拍板 → 再改码**。不要直接动 29 个字段。
> 逐字段回答 7 问：① source of truth？② 顶层/scenePlan 两层消费者？③ 两层语义等价？④ 进 prompt？⑤ 进 persistence/API/Studio？⑥ 删一层能否迁移？⑦ 不能 → 两个不同 Render Slot，还是重复状态？
> **停止条件**：多个真实消费者 / 两层语义不同 / 触及 compiler/Studio/persistence 边界 → 只记录不改。不顺手 C4，不迁移 29 字段。
> 核心原则（P3.2/C2 实证）：**同值 ≠ 重复**。同一个值可因消费者处于不同架构边界而合法存在多个 Render Slot。

---

## 1. 字段盘点（权威清单，实证自 scene-execution.js:1039-1128）

### 1.1 结构前提：双层不是数据拷贝

`buildSceneExecutionPlan()` 的 return 对象（:1039-1128）把**同一批局部变量**同时暴露为：
- 顶层键（`ep.situation`、`ep.characterDesire` …）
- 嵌套 `ep.scenePlan` 同名字段（`ep.scenePlan.situation` …）

**两层是同一 JS 对象引用**（`scenePlan.situation === ep.situation`），构造一次、引用两处。所以不存在「双份状态存储」，双层是**访问路径（Render Slot）层的重复**。

### 1.2 28 个双层重叠字段（构造源实证）

| # | 字段 | 构造源 | 类型 |
|---|---|---|---|
| 1 | situation | engine:104 `plan.situation?.worldState \|\| buildSceneSituation` | 引擎输出 |
| 2 | questions | engine:128 `plan.questions \|\| buildSceneQuestionPlan` + lifecycle | 引擎输出 |
| 3 | questionRegistry | engine:140 `buildQuestionRegistry` | 引擎输出 |
| 4 | reward | engine:154 `plan.reward \|\| buildSceneReward` | 引擎输出 |
| 5 | characterDesire | engine:89 `buildCharacterDesireProfile` | 引擎输出 |
| 6 | characterPush | engine:97 `buildSceneCharacterPush`（读 desire + prev push） | 引擎输出 |
| 7 | emotionCurve | engine:168 `plan.emotionCurve?.emotionStart \|\| buildSceneEmotionCurve` | 引擎输出 |
| 8 | conflict | engine:185 `plan.conflict?.opponent ? plan.conflict : buildSceneConflict` | 引擎输出 |
| 9 | climaxRole | engine:179 `buildSceneClimaxRole` | 引擎输出 |
| 10 | readerEmotion | body:723 `buildReaderEmotionCurve` | 派生 |
| 11 | emotionWave | body:785 `resolveExecutionEmotionWave` | 派生 |
| 12 | informationGap | body:769 `buildExecutionInformationGap` | 派生 |
| 13 | promisePointer | body:758 `plan/scene/chapterDir/chapterNarrative/promisePlan/reward 链` | authored→章级回退 |
| 14 | promiseLifecycle | body:736 `buildScenePromiseLifecycle` | 派生 |
| 15 | narrativeBeatPlan | body:809 `buildNarrativeBeatPlan` | 派生 |
| 16 | cost | narrativeFields:827（planWithChapter.cost/consequence/conflict） | 派生 |
| 17 | escalation | narrativeFields:828 | 派生 |
| 18 | targetEmotion | narrativeFields:829 | 派生 |
| 19 | writerSceneArc | body:1013 `buildWriterSceneArc` | 派生 |
| 20 | writerRuntime | body:988 `buildSceneWriterRuntime`（含 beats=rotatedBeats） | 派生 |
| 21 | characterTransformation | body:838 `buildSceneCharacterTransformation` | 派生 |
| 22 | characterBehavior | body:846 `buildChoiceBehaviorLogic` | 派生 |
| 23 | sceneEntertainment | body:879 `buildSceneEntertainment` | 派生 |
| 24 | humanWritingPolicy | body:1007 `buildHumanWritingPolicy` | 派生 |
| 25 | readerSatisfaction | body:854 `buildReaderSatisfaction` | 派生 |
| 26 | sceneRhythm | body:863 `getSceneRhythmRole` | 派生 |
| 27 | sceneEnding | body:869 `selectSceneEnding` | 派生 |
| 28 | chapterAuthorGoal | body:631 `chapterDir?.chapterAuthorGoal \|\| intent…` | 章级（author intent） |

### 1.3 单层字段（不含在双层审计内，供对照）

- **顶层专属**：version, planDegeneration, sceneIndex, sceneId, sceneType, wordTarget, beats, beatStatePlans, libraryTypesUsed, libraryBeatCount, tensionArc, hookRotation, hookLadderEntry, hookOutput, chapterNarrativePlan, chapterRhythm, chapterClimax, tensionRewardThreat, sceneOutcome, rules
- **嵌套专属**：goal, obstacle, consequence, choice（P3.3 后仅嵌套）, priorityGoal（C2 单层 owner）, authorIntent, revealPolicy, newInformation, cliffhanger, narrativeRewardText, _choiceMissing, _consequenceMissing

### 1.4 rules 数组（ep.rules, :1129+）

读**局部变量**（narrativeFields.choice/cost/escalation/targetEmotion、emotionWave、informationGap、promisePointer、writerSceneArc、readerEmotion、promiseLifecycle、questions、humanWritingPolicy.flowMust）——不读 `ep.`/`scenePlan.` 路径，同一构造引用。rules 是**顶层专属**出口（进 prompt）。

---

## 2. 消费者追踪（3 边界并行扫描中 — compiler / writer-beat / studio-persistence）

> 待 3 个 Explore agent 返回后填表。


## 1.5 构造侧结论（消费者扫描前已确证）

1. **无数据重复，只有 Render Slot 重复**：28 字段全为单次构造对象，被 return 顶层 + 嵌套 scenePlan 两个路径引用同一实例。删除任何一层 ≠ 释放数据，只影响「谁能读到」。
2. **author 链（Story Truth）**：`scene.scenePlan`（Studio 章计划）→ `migrateScenePlan`（纯透传 :398-402）→ `plan`。plan.goal/obstacle/choice/consequence/cost/reward/escalation/newInformation/targetEmotion/informationGap/promisePointer/revealPolicy/authorIntent = **authored，无模板默认**（buildPlanFromScene :312-330 缺失即缺失，buildSceneBeatPlan 记 missing）。
3. **引擎链（Derived）**：`buildSceneEngineBundle`（:76-210）从 plan/storyDna/intent/prevScene 派生 9 字段（situation/questions/questionRegistry/reward/characterDesire/characterPush/emotionCurve/conflict/climaxRole）；body 再从这些派生其余（readerEmotion/emotionWave/informationGap/promiseLifecycle/characterTransformation/…）。
4. **rules 数组（ep.rules :1129+）读局部变量**，不经 ep./scenePlan. 路径——是顶层专属出口（进 prompt）。
5. **Studio 边界在 executionPlan 上游**：预览抽屉协议（docs/studio-preview-drawer-schema.md）读写 chapter_NNNN.yaml 级 goal/scenes/plant/cost/hook/foreshadow，**不直接消费 28 双层字段**。Group 3「Studio 只读字段」风险实际集中在 runtime 写盘（states/run.json）而非 Studio 代码。

## 2.1 Writer / Beat 渲染边界（Agent C 扫描，2026-08-20）

**结论性事实**：
- `beats` **只在顶层**（:1046）。全仓无 `scenePlan.beats`。renderer（buildBeatExecutionPromptBlock :1273、prompt-compiler、beat-execution:570、beat-slimmer:519）只读顶层。
- Writer 出口两条路径：**scene-director brief**（scene-director.js:233 → buildBeatExecutionPromptBlock，读顶层）+ **Studio beat-writer**（compile-writer-prompt.js:73 → resolveExecutionPlan → prompt-compiler.compile()，逐拍由 beat-execution/beat-slimmer 渲染，读顶层 beats；scenePlan 仅用于 goal/priorityGoal/authorIntent）。

**28 双层字段渲染侧消费**（顶层 vs 嵌套）：

| 字段 | 顶层读（渲染侧） | 嵌套读（渲染侧） | 渲染语义 |
|---|---|---|---|
| situation | scene-exec:1244, scene-director:239, writer-first:89, prompt-compiler:199, prompt-priority:140, beat-slimmer:507 | writer-first:89 兜底 `plan.situation`；scene-exec:93 prevScene.scenePlan.situation | 三维状态 Before→After 强约束 |
| questions | scene-exec:1245, scene-director:240/242, writer-first:90, prompt-priority:147/153 | writer-first:90 兜底 `plan.questions` | 须回答/须提出 Reader Question ×2 |
| questionRegistry | scene-director:243, prompt-priority:148 | — | Question Lifecycle 块 |
| reward | scene-exec:1247, scene-director:227/238, writer-first:91, prompt-priority:158 | reward-engine:66 读上一 scene.scenePlan.reward.promise | Promise→Payoff 兑现行 |
| characterDesire | writer-first:129, prompt-compiler:200, prompt-priority:137, beat-slimmer:559 | — | 推动 POV：externalGoal 目标行 |
| characterPush | writer-first:130, prompt-compiler:200, prompt-priority:137 | scene-exec:91 prevScene.scenePlan.characterPush | scenePush 目标行 |
| emotionCurve | writer-first:176, prompt-compiler:204, prompt-priority:141, sample-driven-writer:158/193/197 | scene-exec:165 prevScene.scenePlan.emotionCurve | 情绪弧 start→middle→peak→end |
| readerEmotion | scene-director:246, writer-first:262, prompt-compiler:205, prompt-priority:142, narrative-runtime:175, compile-writer-prompt:136 | — | 读者情绪起→终 + 戏剧反讽 |
| emotionWave | scene-director:159/289, scene-exec:720 prevScene.executionPlan.emotionWave | — | Emotion Wave 序列行 |
| informationGap | scene-exec:1260-1261, scene-director:158/288, narrative-runtime:642 | — | readerKnows/heroKnows/enemyKnows 铁律 |
| narrativeBeatPlan | scene-director:157/173-184/287（六要素简报） | **无消费者** | Narrative Beat Plan 简报块 |
| cost | **无直接读者**（bake 进 rules:1136 + narrativeBeatPlan.cost + beat Cost:行 :1281） | scene-director:177 经 narrative.cost | rules/beat 渲染 |
| escalation | **无直接读者**（bake 进 rules:1137） | scene-director:179 经 narrative.escalation | rules/简报 |
| targetEmotion | **无直接读者**（bake 进 rules:1138） | — | rules 行；真正逐拍锚是 beat.targetEmotion |
| promisePointer | scene-director:181/290, narrative-runtime:186/312 | — | 优先兑现指针 |
| promiseLifecycle | scene-director:245, writer-first:298, prompt-priority:155, narrative-runtime:187-191 | — | Promise Payoff/New Promise 块 |
| writerSceneArc | scene-director:247, writer-first:272, prompt-compiler:195, prompt-priority:133 | —（构建期读 plan=scenePlan） | Scene Arc 六段 + bans |
| writerRuntime | writer-first:101, prompt-compiler:261, prompt-priority:117 | — | Writer Runtime 策略块 |
| characterTransformation | scene-director:248, writer-first:308, prompt-compiler:201, prompt-priority:134 | scene-exec:835 prevScene.scenePlan.characterTransformation | 人物转变块（writerMust 并入 choice 拍） |
| characterBehavior | writer-first:318, prompt-compiler:202, prompt-priority:135 | — | 真人行为块（并入 choice 拍 content） |
| sceneEntertainment | writer-first:328, prompt-priority:152 | — | 场景好看块（并入 goal/newInfo/hook 拍） |
| humanWritingPolicy | writer-first:338, prompt-priority:136, prompt-compiler:264 | — | 真人写法块 |
| readerSatisfaction | scene-director:249, writer-first:369, prompt-priority:156 | — | 读者满足块 |
| sceneRhythm | scene-director:250, writer-first:389, prompt-compiler:206, prompt-priority:160, compile-writer-prompt:134, beat-execution:284/402 | — | 节奏块 + craftMode 入参 |
| sceneEnding | scene-director:251, writer-first:379, prompt-priority:157 | — | 结尾模式块（writerMust 并入 hook 拍） |
| chapterAuthorGoal | writer-first:348, prompt-compiler:194, prompt-priority:132 | — | 章作者目标块 |
| conflict | writer-first:186, prompt-compiler:198, prompt-priority:47-48, beat-slimmer:560, writer-runtime:679 | prompt-priority:50/56 无 opponent 兜底 scenePlan.obstacle | 代价型冲突块 |
| climaxRole | scene-director:235, writer-first:204, prompt-compiler:203/259, prompt-priority:115/119/125, beat-execution:283/401, compile-writer-prompt:135 | — | 章高潮块 + craftMode |
| goal | — | prompt-compiler:189 `ep.scenePlan?.goal`, beat-slimmer:506/585, writer-scene-arc:47, prompt-priority:56, continuation-engine:87 | Narrative Task「Scene 目标」行；**只在嵌套** |
| obstacle | — | prompt-compiler:190, writer-scene-arc:48, prompt-priority:57 | 冲突行；**只在嵌套** |
| priorityGoal | —（已删） | beat-slimmer:588, continuation-engine:86/94 | 逐拍派生最高优先；**唯一 owner 嵌套** |
| authorIntent | — | beat-slimmer:609 | 首拍「作者意图」行；**只在嵌套** |
| consequence | —（顶层读者读 sceneOutcome.consequence） | writer-scene-arc:50, prompt-priority:58 | Scene Arc Consequence 行 |
| newInformation | — | writer-scene-arc:51, director.js:136 | Scene Arc Reward 行 |
| cliffhanger | — | writer-scene-arc:52, director.js:137-138 | Scene Arc New Threat 行 |
| revealPolicy | — | — | **无 prompt 消费者**（仅 plan 内部逻辑） |
| tensionRewardThreat | **无任何消费者**（:1088-1092 构建但 format 传 reward 非此字段） | — | **纯死投影** |
| sceneOutcome | scene-exec:1251, scene-director:222/291, prompt-priority:51, beat-execution:653, compile-writer-prompt:192 | — | Success/Failure/Consequence 块 |

**关键结构结论**：
1. 渲染侧消费以**顶层为主**（beats/situation/questions/reward/emotionCurve/readerEmotion/writerSceneArc/writerRuntime/characterTransformation/conflict/climaxRole/sceneOutcome 等全读顶层）。
2. **嵌套-only 消费** = plan 语义字段（goal/obstacle/priorityGoal/authorIntent/choice/consequence/newInformation/cliffhanger），由 prompt-compiler:189-190、beat-slimmer:585-609、writer-scene-arc:47-52、prompt-priority:52-58 从 `executionPlan.scenePlan` 读。
3. **顶层 28 双层字段中 cost/escalation/targetEmotion 无直接读者**（bake 进 rules/narrativeBeatPlan）；**tensionRewardThreat 全仓 0 消费者（纯死）**；revealPolicy 无 prompt 消费。
4. **嵌套 scenePlan.narrativeBeatPlan 无消费者**。
5. **交叉续写读嵌套**：prevScene.scenePlan.situation/characterPush/emotionCurve/characterTransformation + reward-engine 读 prevScene.scenePlan.reward —— 与顶层同值（同一对象引用），但**访问路径固定为嵌套**。
6. **名称陷阱**：director.js:131-138 的 `sceneDir.scenePlan?.goal/...` 是 runSceneDirector 返回的本地 `plan`（attachSceneEngines 产物），**不是** executionPlan.scenePlan——同源派生但非同一引用。审计中读 `scenePlan.X` 必须分辨是哪个 scenePlan。

## 2.2 Compiler / prompt 边界（Agent A 扫描，2026-08-20）

**关键事实**：
- 真正统一 prompt compiler = `packages/inkos-runtime/src/compiler/prompt-compiler.js`（compile()，P0–P3 分层）。`inkos-core/src/workflows/before-write.js`、`inkos-writer/src/optimizer.js`、`inkos-brain/src/writer/llm-writer.js` **不消费** executionPlan 双层字段（读 planner 的 scene/intent）。
- **P3.2 C2 混合读实证**：PC 里 `ep = executionPlan`，除 goal/obstacle 外**全读顶层**；唯独 `goal/obstacle` 读嵌套 `ep.scenePlan?.goal`（:189-190）。这两字段在顶层 return 根本不存在 → **两层不等价的精确落点**。
- **四份「plan」副本**（审计命名陷阱，读 `scenePlan.X` 必须分辨）：
  1. `executionPlan` 顶层字段（:1039-1128）
  2. `executionPlan.scenePlan`（嵌套，:1096-1128）
  3. `executionPlan.narrativeBeatPlan`（buildNarrativeBeatPlan 自己的 goal/conflict/choice/…）
  4. `scene-director.js` 内部本地 `plan`（buildScenePlan+attachSceneEngines；director.js:131-138 读的 `sceneDir.scenePlan?.goal` 是这第四份，**非** executionPlan.scenePlan）
- **cost/escalation/targetEmotion 三层投影**同一 `narrativeFields` 引用（顶层:1068-1070、嵌套:1111-1113、rules:1135-1138 本地），无任何代码直写 `executionPlan.cost`——经本地 narrativeFields/narrativeBeatPlan 消费。

**compiler 侧消费模式**（PC=prompt-compiler，PP=prompt-priority legacy，SD=scene-director brief，SE=rules 本地）：
- **PC 顶层读**：situation(:199)、characterDesire(:200)、characterPush(:200)、emotionCurve(:204)、readerEmotion(:205)、writerSceneArc(:195)、writerRuntime(:261)、characterTransformation(:201)、characterBehavior(:202)、sceneRhythm(:206,228,555)、chapterAuthorGoal(:194)、conflict(:198)、climaxRole(:203,227,259,554)、beats(:135,229,556)、humanWritingPolicy(:264 仅 legacy)
- **PC 不消费**（经 SD brief / SE rules / PP legacy / beat 预渲染）：questions、questionRegistry、reward、emotionWave、informationGap、promisePointer、promiseLifecycle、narrativeBeatPlan、sceneEntertainment、readerSatisfaction、sceneEnding、cost、escalation、targetEmotion、priorityGoal、authorIntent、consequence、revealPolicy
- **PC 嵌套读（混合读）**：goal(:189)、obstacle(:190)——**唯二**。
- **嵌套-only（仅 writer-optimization 消费，不进统一 PC）**：priorityGoal（CE:86,94 / BS:588）、authorIntent（BS:609）、consequence（PP:58 回退，PC 不读）、newInformation（SB:25 → CWP P3 边界块）、cliffhanger（SB:26 → CWP P3 边界块）
- **revealPolicy：compiler 侧无消费**（仅 SE 内部 beatContent:406 控制 newInformation 渲染）

## 2.3 Studio / API / persistence 边界（Agent B 扫描，2026-08-20）

**边界事实**：
- **持久化唯一入口**：`brain/memory/memory.js:79 saveSceneArtifacts` → `novel/_system/brain/ch_XXXX_scenes.json`，写整个 `scenes` 数组（含 `scene.scenePlan` + `scene.executionPlan` **整对象**）。run.json/states/anchor 不字段化持久化 EP/scenePlan。
- **Studio API**：routes.js:812 normalizeScenes → compatibility.js:32-38 **整对象透传** scenes；前端 `inkos-studio` 无 executionPlan/scenePlan 字符串命中；仅 DiagnosticsDrawer 经 `diagnosis.beats`（diagnosis-service:153 读 `scenes[0].executionPlan.beats`）间接消费 beats 摘要。PlanPreviewDrawer 只消费 chapter-plan（goal/scenes/plant），与 EP 双层无关。chapter-audit 零 EP 消费。
- **磁盘读回 EP 字段仅两处**：diagnosis-service:153（beats）、doctor.js:91（beats）、memory-hierarchy:150（hookOutput）——全读**顶层**。
- Studio/runtime 边界读：situation(beat-slimmer:507 top)、characterDesire(beat-continuity:967/beat-slimmer:559 top)、emotionCurve(sample-driven-writer top)、readerEmotion(sample-driven-writer top)、sceneRhythm(compile-writer-prompt:134 top)、chapterAuthorGoal(sample-driven-writer:156 top)、conflict(beat-continuity:971 top)、climaxRole(compile-writer-prompt:135 top)、beats(全链路 top) —— 全**顶层**。
- **legacy 嵌套读是陷阱**：commercial-writer-rules.js:223 `plan = scene.scenePlan || buildScenePlan(scene, intent)` 读的是**场景挂载 plan**（copy #4），非 executionPlan.scenePlan。goal/obstacle/choice/consequence/newInformation/cliffhanger 在此经 scene-attached plan 读，同源不同对象。

## 2.4 关键确证：嵌套 EP 引擎镜像零消费者（实证，2026-08-20）

**跨场景续写读归属核验**（scene-execution.js）：
- :90-91 `prevScene?.executionPlan?.characterPush || prevScene?.scenePlan?.characterPush` —— **顶层优先**，场景挂载 plan 兜底
- :93-94 `prevScene?.scenePlan?.situation… || prevScene?.executionPlan?.situation…` —— 场景挂载 plan / 顶层互相兜底
- :164-165 `prevScene?.executionPlan?.emotionCurve… || prevScene?.scenePlan?.emotionCurve…` —— 顶层优先
- :834-835 `prevScene?.executionPlan?.characterTransformation || prevScene?.scenePlan?.characterTransformation` —— 顶层优先

→ 全部读 `prevScene.executionPlan.X`（**顶层**）或 `prevScene.scenePlan.X`（**场景挂载 plan**，copy #4），**均非** `executionPlan.scenePlan.X`（嵌套 EP）。

**嵌套 EP 真实消费者全集**（grep 实证）：
- writer-first.js:88、writer-scene-arc.js:42、prompt-priority.js:50、writer-runtime.js:653、sample-driven-writer.js:157/232、beat-continuity.js:975-984、continuation-engine.js:85-94、beat-slimmer.js:506/585/588/609、prompt-compiler.js:189-190

**它们读的字段**：goal / obstacle / choice / consequence / priorityGoal / authorIntent —— **全是 plan 级字段**。没有任何一处读 `executionPlan.scenePlan.<引擎字段>`。

**死兜底实证**：writer-first:88-91 `executionPlan.situation || plan.situation`（plan=ep.scenePlan）——同引用，`executionPlan.situation` 恒真 → `plan.situation` 分支永不执行。beat-continuity:972 `plan.conflict` 同理。

---

## 3. Ownership 地图（P3.4 主交付物，只读结论）

### 3.1 七问逐字段判读

对 28 双层字段 + 嵌套 plan 字段，实证结果统一收敛为**三类**：

#### 类别 A：顶层 = Execution View（prompt Render Slot），嵌套镜像 = 0 消费者
适用：全部 28 个引擎字段的**嵌套镜像**（situation/questions/questionRegistry/reward/characterDesire/characterPush/emotionCurve/conflict/climaxRole/readerEmotion/emotionWave/informationGap/narrativeBeatPlan/promisePointer/promiseLifecycle/writerSceneArc/writerRuntime/characterTransformation/characterBehavior/sceneEntertainment/humanWritingPolicy/readerSatisfaction/sceneRhythm/sceneEnding/chapterAuthorGoal + cost/escalation/targetEmotion 顶层）

| 七问 | 答案 |
|---|---|
| ① source of truth | 单一构造点（engine/body/narrativeFields），不是副本 |
| ② 顶层消费者 | **大量真实**：prompt-compiler（situation/characterDesire/characterPush/emotionCurve/readerEmotion/writerSceneArc/writerRuntime/characterTransformation/characterBehavior/sceneRhythm/chapterAuthorGoal/conflict/climaxRole/beats）、scene-director brief（narrativeBeatPlan/questions/questionRegistry/emotionWave/informationGap/promisePointer/promiseLifecycle/readerSatisfaction/sceneEnding/sceneRhythm/climaxRole）、writer-first、Studio writer-optimization（beat-slimmer/sample-driven-writer/beat-execution） |
| ② 嵌套消费者 | **零**。实证：所有 `scenePlan.X` 读实为场景挂载 plan（copy #4）或同引用死兜底 |
| ③ 两层语义等价？ | 同值；嵌套层无消费者，无所谓语义差 |
| ④ 进 prompt？ | 顶层进；嵌套镜像不进（唯一例外 goal/obstacle 见类别 B） |
| ⑤ 进 persistence/API/Studio？ | 整对象写 scenes.json + Studio 整对象透传（字段级无读） |
| ⑥ 删一层能否迁移？ | **删嵌套镜像**：零消费者，迁移成本≈0；**删顶层**：不可（prompt 主消费层） |
| ⑦ Render Slot 还是重复状态？ | **同一值的两个访问路径**；嵌套镜像在当前消费者集下是**死 Render Slot**，但属于 scenePlan 整对象持久化/API 形状（边界敏感） |

#### 类别 B：嵌套 = Plan View（plan Render Slot），顶层无此字段
适用：goal / obstacle / choice（P3.3 后）/ consequence / priorityGoal（C2 单层）/ authorIntent / newInformation / cliffhanger

| 七问 | 答案 |
|---|---|
| ① source of truth | authored scene.scenePlan / scene 字段（buildPlanFromScene，无模板默认）→ plan；priorityGoal 为派生 |
| ② 顶层消费者 | 无（顶层根本不返回这些键） |
| ② 嵌套消费者 | **大量真实**：prompt-compiler:189-190（C2 混合读）、beat-slimmer:506/585/588/609、continuation-engine:86/94、beat-continuity:975-984、sample-driven-writer:160、prompt-priority:52-58、writer-scene-arc:47-52 |
| ③ 两层语义等价？ | 只有嵌套层存在，无等价问题 |
| ④ 进 prompt？ | 是（compiler 读嵌套 + beat 预渲染进 beats[].content） |
| ⑤ 进 persistence/API/Studio？ | 整对象（scenePlan 内） |
| ⑥ 删一层？ | **不可删**——这是嵌套层的核心职责 |
| ⑦ 结论 | **嵌套 scenePlan 的合法计划内容 = 这些 plan 字段**。P3.2 C2 的「goal/obstacle 只在嵌套」即此类 |

#### 类别 C：纯死字段（无任何消费者，含嵌套镜像）
| 字段 | 位置 | 证据 | 七问⑦ |
|---|---|---|---|
| tensionRewardThreat | 顶层 | :1088-1092 构建，formatTensionRewardThreatBlock 传 reward 非此字段，全仓 0 读 | **纯死投影** |
| revealPolicy | 嵌套 | 构建期内部逻辑（:639-644），输出无消费者 | **纯死投影** |
| narrativeRewardText | 嵌套 | producer 内部 buildNarrativeBeatPlan/planWithChapter 用，边界无消费者 | **纯死投影** |
| narrativeBeatPlan 嵌套镜像 | 嵌套 | 嵌套 scenePlan.narrativeBeatPlan 0 消费者（顶层 SD brief 读的是顶层） | **死镜像** |
| cost/escalation/targetEmotion 顶层 | 顶层 | 0 直接读者（bake 进 rules/narrativeBeatPlan/beat）；P3.3 拍板保留（渐进） | **已知死投影（已延迟）** |

### 3.2 Story Truth → Derived → Render Slot → Consumer 链

```
authored scene.scenePlan ──(migrateScenePlan 透传)──► plan（Story Truth）
                                                       │
        ┌──────────────────────────────────────────────┤
        │ plan 级字段 (goal/obstacle/choice/consequence/│ 引擎字段（situation/characterDesire/…）
        │ priorityGoal/authorIntent/revealPolicy/…)    │ = Derived（单一构造点）
        │                                              │
        ▼                                              ▼
  嵌套 scenePlan (Plan View) ──► compiler:189-190 / beat-slimmer /      顶层 executionPlan (Execution View)
  （live：plan 字段）           continuation-engine / beat-continuity    ──► prompt-compiler / scene-director brief /
  （死：28 引擎镜像 +          （全读 plan 级字段）                     writer-first / Studio writer-opt
   narrativeBeatPlan 镜像）                                             ──► prompt（beats/situation/…）
                                                                        ──► persistence（scenes.json 整对象）
                                                                        ──► Studio API（整对象透传）
```

### 3.3 收敛候选（只记录，不改码；排序按风险）

**Tier 1 — 纯死、零边界风险（同 P3.3 narrativeReward 模式，可独立拍板）**
1. **顶层 tensionRewardThreat**（全仓 0 消费者，纯死投影）——golden 影响预测≈零（不在 golden 捕获面）
2. **嵌套 revealPolicy**（输出 0 消费者；构建期逻辑用局部 plan 不依赖输出）
3. **嵌套 narrativeRewardText**（producer 内部，输出 0 消费者）
4. **嵌套 narrativeBeatPlan 镜像**（0 消费者；顶层 narrativeBeatPlan 是 SD brief 唯一读点）

**Tier 2 — 已知死投影、已延迟**
5. **顶层 cost/escalation/targetEmotion**（P3.3 拍板保留「0 消费者但渐进」；P3.4 确认**两层均无边界消费者**，值经 narrativeBeatPlan/rules/beat 进 prompt 不受影响）——若拍板，可做 P3.3 同款「删顶层投影、值保留」

**Tier 3 — 边界敏感（Studio/persistence 整对象形状），只记录不建议机械删**
6. **28 引擎字段的嵌套镜像**（当前消费者集=0，但属于 scenePlan 整对象：scenes.json 持久化 + Studio API 透传 + 「计划完整性」惯例）。删 = 改 scenePlan 形状 → 触碰 persistence/Studio 边界 → **stop condition 触发，只记录**。若未来要收敛，须先定义「scenePlan 输出形状 = plan 字段白名单」并同步 normalizeScenes/兼容层。

### 3.4 明确不收敛（合法双 Render Slot，删=错）

- **28 引擎字段的顶层**（Execution View）：prompt 主消费层，删即断链。它们与「Plan View 字段（goal/obstacle/…）」在**不同架构边界**被消费 → 用户原则「同值≠重复」的正面案例。
- **plan 级字段**（goal/obstacle/choice/consequence/priorityGoal/authorIntent）：嵌套唯一 owner + compiler 混合读依赖 → 绝不可删。
- **beats**：只在顶层，全链路最热字段（compiler/Studio/诊断/persistence 读回）。

### 3.5 观察项（本审计范围外，记录）

- **copy #4（场景挂载 plan）**：`scene.scenePlan` 被 commercial-writer-rules/director.js:131-138/beat-continuity 读，与 executionPlan.scenePlan **同源不同对象** → plan 级字段（goal/obstacle/choice/…）存在第 4 份副本。这是 **One Story Truth 多 owner** 的下一个审计候选（P3.5 或独立立项），本轮不碰。
- scenePlan 整对象写 scenes.json：内存/磁盘双份（非本轮范围）。

### 3.6 停止条件确认（全部触发点 → 记录未改）

✅ 无任何字段被本审计改动；✅ 不顺手 C4；✅ 未迁移任何字段；✅ 28 字段整表仅作判定，未删除/移动。
**下一拍板选项**：Tier 1（4 项纯死，可逐项拍板）/ Tier 2（cost/escalation/targetEmotion 顶层，P3.3 同款）/ Tier 3（记录，待「scenePlan 形状」立项）。

---

## §4 执行记录 — P3.4-1 Tier 1 删除（2026-08-20 ✅ 全绿）

**拍板 scope**（用户）：「Tier 1 开删；Tier 2 暂不动」——删除 4 项纯死输出槽，28 引擎字段冻结。

**执行**（scene-execution.js，4 处编辑）：
1. 顶层 `tensionRewardThreat`（:1088-1092 原）→ 删。reward 真实读点 = narrativeBeatPlan.reward。
2. 嵌套 `scenePlan.revealPolicy` → 从出口剔除（`scenePlanView = {...planWithChapter}; delete revealPolicy`）。**局部计算保留**：:639-644 构建期设置、:406 beatContent 读 `plan.revealPolicy?.advanceOnly`、planner 源照旧。
3. 嵌套 `scenePlan.narrativeRewardText` → 同上剔除。**局部计算保留**：:583/:585-586/:804/:821（buildNarrativeBeatPlan 读 planWithChapter.narrativeRewardText）。
4. 嵌套 `scenePlan.narrativeBeatPlan` 镜像 → 删。顶层 :1064 保留（SD brief 唯一读点）。

**回归门（全绿）**：
- 最终消费者 grep（JS + 非 JS）：4 字段零输出槽消费者；非 JS 命中仅 `books/*/studio/writer-optimization/*.json` 历史运行时快照（与 P3.3 同处置，不回溯改写）。
- golden build：**before/after 重建 diff = 唯一差异 meta.builtAt**（promptFingerprint byte-identical + gateOutputs/memoryMutation/pipeline 全等）。构造证明：normalizeScenePlan 白名单剥离 3 嵌套键；fixture scenes 无 executionPlan 键 → pin 从不触发 → tensionRewardThreat 不可能进 baseline；0 消费者字段不进 fingerprinted prompt。
- golden verify 3× exit=0（确定性；日志差异仅 WORKDIR 随机临时路径，即 canonicalize 剥离的 volatile 键）。
- module-4 exit=0；3 回归全绿（decision-conflict-null / memory-unit / chapter-audit-flow 13 checks）。

**结论**：Tier 1 4 项纯死输出槽清除，计算逻辑全保留。P3.4 收口。
**下一项**：P3.5 Plan Truth / Four-Copy Ownership Audit（EP 顶层 / EP.scenePlan 嵌套 / narrativeBeatPlan / scene.scenePlan copy#4）。
