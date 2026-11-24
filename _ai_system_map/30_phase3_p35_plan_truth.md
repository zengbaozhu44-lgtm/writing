# P3.5 Plan Truth / Four-Copy Ownership Audit（只读）

> 2026-08-20 · 只调查，未改任何代码
> 前置：P3.4 已证明「executionPlan 28 双层字段不是核心膨胀点」→ P3.5 追「plan 本身四种形态」

---

## §1 四份 plan 形态的构造与身份地图

### 1.1 生产路径调用链

```
scene authored 标量（brain/planner/协议渲染器 产出 scene.goal/obstacle/choice/consequence/authorIntent）
  │  buildScenePlan(scene, intent, chapterDir)  —— 合并投影
  ▼
basePlan = {goal: scene.goal||authorIntent||intent.mainGoal, obstacle: scene.obstacle||scene.conflict||intent.obstacles[0],
            choice: scene.choice, consequence: scene.consequence||scene.cost, authorIntent, ...}
  │  attachSceneEngines(basePlan, scene, intent, chapterDir)
  ▼
④ scene.scenePlan（copy#4）= {...basePlan, ...engines1}      ← buildSceneEngineBundle 第 1 次（无 chapterClimax/chapterRhythm）
  │  buildSceneExecutionPlan({scene:{...scene, scenePlan: ④}})
  ▼
planLocal = migrateScenePlan(④) = {...④}                     ← 浅拷贝（②③与④的变异隔离边界）
  │  engines2 = buildSceneEngineBundle({plan: planLocal, chapterClimax, chapterRhythm})  ← 第 2 次（含章级参数）
  │  planLocal.obstacle = conflict.opposition                ← 引擎解析覆盖（§2.2）
  │  planLocal.choice = deriveSceneChoice(...)（模板时）      ← 派生覆盖（§2.3）
  │  planLocal.consequence = realCost                        ← 引擎解析覆盖（§2.4）
  ▼
planWithChapter = {...planLocal, goal: ...||chapterNarrative?.goal, obstacle: planLocal.obstacle, ...}
  │
  ├─► ② executionPlan.scenePlan = scenePlanView = {...planWithChapter}  （P3.4-1 剔除 revealPolicy/narrativeRewardText）
  ├─► ③ executionPlan.narrativeBeatPlan = buildNarrativeBeatPlan({plan: planWithChapter, ...})
  └─► ① executionPlan 顶层 = Execution View 投影（situation/characterDesire/conflict/narrativeBeatPlan/cost/…）
```

### 1.2 四形态定位

| 形态 | 变量 | 本质 | 与上游关系 |
|---|---|---|---|
| ④ scene.scenePlan | director 的 `plan` | 合并投影 + engines1（`{...basePlan, ...engines1}`） | 直连 authored，含 authored 值 |
| ① EP 顶层 | return 顶层 | Execution View（prompt 渲染槽 live） | 投影，无 goal/obstacle/choice/consequence |
| ② EP.scenePlan | `scenePlanView` | **已解析富化视图**（引擎覆盖 + 章 fallback） | 非 copy——可≠④的值（§2） |
| ③ EP.narrativeBeatPlan | buildNarrativeBeatPlan | beat 级派生视图（obstacle→conflict 键、consequence→cost 键） | 投影，读 planWithChapter |

### 1.3 对象同一性

- ②与③：同源（均从 planWithChapter），字符串字段同值、对象字段共享 planLocal 引用。
- ②与④：**非同一对象**。`migrateScenePlan = {...plan}` 浅拷贝 → planLocal 变异（:682/:699/:706）不触碰 ④；引擎输出被重新构造（engines2 ≠ engines1）。
- **引擎 bundle 双重计算**（engine 发现①）：`buildSceneEngineBundle` 在 attachSceneEngines（scene-director:96）与 buildSceneExecutionPlan（scene-exec:658）各跑一次。入参不同——attachSceneEngines **不传** chapterClimax/chapterRhythm（scene-director:96-105），scene-execution **传**（:668-669）。引擎体内 `buildSceneClimaxRole({climaxPlan: chapterClimax})`（:182）→ **chapterClimax 存在时 ④.climaxRole ≠ ②.climaxRole**。其余引擎字段同值不同身份。

### 1.4 运行时回写（orchestrator:448-460）

```js
// runDirectorPhase('plan') 返回 scene:{...scene, scenePlan: ④, executionPlan: ①②③, goal/obstacle/choice/...}
for (key of ['goal','obstacle','choice','consequence','escalation','newInformation','cliffhanger','hook',
             'scenePlan','situation','questions','readerWhy','sceneOutcome'])
  scene[key] = dirScene[key];
if (dirScene.executionPlan?.beats?.length) scene.executionPlan = dirScene.executionPlan;
```

→ **同一 scene 对象同时挂 ④ + ①②③ 四形态**（writer/Studio/persistence 全可见）。这是「四份 plan 并存」的物证，但**不是**多 owner——它是导演产物沿流水线的传播，不变异既有真相。

### 1.5 golden 覆盖边界

`_invokeSceneLifecycleHook` 无 `sceneLifecycleHook` 即 return null（orchestrator:44）→ golden RuntimeOrchestrator 未注入钩子 → **golden 路径 director 从不运行 → EP ①②③ 不被 golden 覆盖**（与 baseline scenes 无 executionPlan 键互相印证，P3.4-1 构造证明成立）。P3.5 字段链结论来自源码追踪 + module-4 测试，非 golden。

---

## §2 逐字段链（优先级 6 + 次级 4）

约定：SO = Story Truth owner；标注每形态消费点（file:line）。

### 2.1 goal —— SO = scene.goal（authored 标量）

```
scene.goal ──buildScenePlan──► ④.goal = scene.goal||authorIntent||intent.mainGoal
                              planLocal.goal||chapterNarrative?.goal ──► ②.goal
                              planWithChapter.goal ──► ③.goal
```
- ① 顶层：**无 goal**（0 消费者）。
- ② 消费者：prompt-compiler:189（`scene.goal || ep.scenePlan?.goal`——**混读**）、beat-slimmer:506/585。
- ④/④基座 消费者：SD brief（scene-director:170 `narrative.goal||plan.goal`）、director:131、场景各引擎/readerWhy、story-thread/context-ranking/scene-review/prompt/compiler 等（读 scene.goal）。
- ③ 消费者：SD brief narrative 段（scene-director:170）。
- **语义**：②在 planLocal.goal 空时落章级 goal（**不同语义 fallback**）；③=②的投影。

### 2.2 obstacle —— SO = scene.obstacle / scene.conflict（authored），②被引擎解析覆盖

```
scene.obstacle||scene.conflict ──► ④.obstacle = scene.obstacle||scene.conflict||intent.obstacles[0]
                                planLocal.obstacle = conflict.opposition（:682 覆盖）──► ②.obstacle
                                planWithChapter.obstacle ──► ③.conflict（obstacle 并入 conflict 键）
```
- ① 顶层：无 obstacle。
- ② 消费者：prompt-compiler:190（`scene.conflict || ep.scenePlan?.obstacle`——混读）、beat-slimmer。
- ③ 消费者：SD brief（narrative.conflict || plan.obstacle）。
- **关键**：②.obstacle = 引擎解析 opposition（**可能 ≠ ④.authored**）→ 不是复制，是「不同值 + 不同语义（解析 vs authored）」的投影。

### 2.3 choice —— SO = scene.choice（authored，P3.3 定案），②模板时派生覆盖

```
scene.choice ──► ④.choice = scene.choice（engines1 读此值）
planLocal.choice（:699 模板时 = deriveSceneChoice）──► ②.choice（narrativeFields 经 :826 ③ → :1110）
planWithChapter.choice ──► ③.choice ──► SD brief / narrativeFields / :930 beat.choice（structural='choice' 时）
```
- ① 顶层：**P3.3 已删**（0 消费者）。
- ② 消费者：director:133 实为 **copy#4**（sceneDir.scenePlan，命名陷阱）；②嵌套 EP.scenePlan.choice 直接消费者 = 0（引擎读 ④基座、brief 读 ③）。
- 引擎（character-behavior/scene-entertainment/conflict-engine/character-transformation/writer-runtime）读 **plan.choice = ④基座**（engines 在 :699 变异**之前**计算）。
- **时序发现（engine 发现②）**：choice 派生覆盖（:699）发生在引擎计算（:658）**之后** → 引擎基于**变异前** choice 计算，而 ③/SD brief/beat 渲染基于**变异后** choice。模板/缺失时才触发（P3.3「Beat Plan 退化硬化」已知行为），通常空值。
- 多 owner？**无**——deriveSceneChoice 是 fallback 守卫不合成真相（P3.3 定案）。

### 2.4 consequence —— SO = scene.consequence / scene.cost（authored），②被 realCost 覆盖

```
scene.consequence||scene.cost ──► ④.consequence = scene.consequence||scene.cost
planLocal.consequence = realCost（:706 覆盖）──► ②.consequence
planWithChapter.consequence ──► ③（并入 cost 键：plan.cost||plan.consequence||conflict?.cost）
```
- ① 顶层：无 consequence。
- ④基座 消费者：situation-engine:105/123/144、character-behavior:33、promise-lifecycle:377/566、character-transformation:23（全读 plan.consequence = ④ 或 planLocal 基座）。
- **关键**：②.consequence = realCost（引擎解析）≠ ④.authored → 不同值不同语义。

### 2.5 priorityGoal —— owner = ②嵌套（纯派生，P3.2 C2 收敛）

```
derivePriorityGoal({plan, scene, intent, desire}) ──► ②.priorityGoal（:688→:1101）
```
- 消费者（3，全读嵌套）：beat-continuity:977（`plan.priorityGoal`，plan=EP.scenePlan）、continuation-engine:86/94（`*.scenePlan?.priorityGoal`）、beat-slimmer:588（`EP.scenePlan?.priorityGoal || scene?.priorityGoal`）。
- **禁回写（D22）✅**：全仓无 priorityGoal 写点。不存于 ①/③/④。
- 语义：派生值不是故事状态；②嵌套是其唯一 Render Slot。

### 2.6 authorIntent —— SO = scene.authorIntent（authored，planner:744 源）

```
scene.authorIntent ──► ④.authorIntent = scene.authorIntent || intent.sceneSeeds[...].seed（scene-director:58/83）
planWithChapter spread ──► ②.authorIntent
```
- 消费者：beat-slimmer:606-609（`scene?.authorIntent || EP.scenePlan?.authorIntent`——**双载体回退**：④与②同值同语义，可替换）。
- ①/③：无。唯一作者意图载体（P3.2 C3 三别名合一）。

### 2.7 conflict —— 引擎输出，①顶层 live，②镜像 0 消费者

- SO = buildSceneConflict（conflict-engine）引擎输出。
- ① 顶层：**live**（writer-first:186、prompt-priority:47-48、writer-runtime:662/679、beat-continuity:971、beat-slimmer:560、compiler:198 `ep.conflict?.opponent`）。
- ② 嵌套：0 消费者（P3.4-1 后镜像）。
- ④：engines1.conflict（attachSceneEngines 合并）——SD brief formatConflictBrief(plan.conflict) 读 ④。
- ③：plan.obstacle || conflict?.opposition。

### 2.8 characterDesire / characterPush —— 引擎输出，①顶层 live，②镜像 0 消费者，④=engines1

- SO = buildCharacterDesireProfile / buildSceneCharacterPush。
- ① 顶层：**live**（writer-first:129-130、prompt-priority:137、compiler:200）。
- ② 嵌套：0 消费者。
- ④：engines1（attachSceneEngines）——SD brief formatCharacterDesireBrief(plan.characterDesire, plan.characterPush) 读 ④。
- **双重计算**：engines1（④）vs engines2（②）独立对象同值（见 §1.3）。

### 2.9 fear —— 无存储槽（P3.2 定案）

- character-behavior inferFear(desire, consequence, choice)（:113）用时派生。不存于任何形态。

---

## §3 P3.5 三问回答

### Q1 谁是真正 Story Truth owner？

**没有任何 plan 形态本身是 Story Truth。** 六个优先级字段的真相全在 **scene 对象 authored 标量**（brain/planner/协议渲染器产出），由 buildScenePlan 合并进 ④：

| 字段 | SO | 说明 |
|---|---|---|
| goal | scene.goal | ④合并+章fallback；②章fallback |
| obstacle | scene.obstacle/scene.conflict | ②被引擎 opposition 覆盖 |
| choice | scene.choice | ②模板时 derive 覆盖（fallback 守卫） |
| consequence | scene.consequence/scene.cost | ②被 realCost 覆盖 |
| authorIntent | scene.authorIntent | ④/②同值双载体 |
| priorityGoal | （无 authored）②嵌套 | 纯派生值，owner=② |

结论：**四份 plan 全是「投影/富化」层，上游真相是 authored scene 数据。** 这正是「One Story Truth」的当前形态——真相在 scene 对象，plan 形态是它的渲染槽。

### Q2 四份是「复制」还是「不同语义投影」？

**不是复制。** 对 goal/obstacle/choice/consequence 四字段，②与④**可能不同值**：

| 字段 | ④（authored/合并） | ②（解析富化） | 差异语义 |
|---|---|---|---|
| goal | scene.goal||… | +章级 fallback | 场景空时落章级 |
| obstacle | scene.obstacle||… | **conflict.opposition**（引擎覆盖） | authored vs 解析 |
| choice | scene.choice | 模板时 deriveSceneChoice | fallback 守卫 |
| consequence | scene.consequence||cost | **realCost**（引擎覆盖） | authored vs 解析 |
| conflict/characterDesire/… | engines1（无章参数） | engines2（含章参数） | 同值不同身份；climaxRole 可不同值 |

→ 「同值+同语义+可替换」只成立在：**authorIntent（④↔②，真复制）**、characterDesire 等引擎字段（同值不同身份，值可替换、对象不可）。
「同值+不同边界+不可替换」= **全部四形态之间的边界差异**（④Studio/持久化、①prompt、②③brief）。

### Q3 存在真正的 One Truth → Multi Owner 吗？

**未发现「同一事实多处被当修改/派生 source」的架构级问题。** 证据：
- 全仓无对 ②/③/④ 的**写/改**点（`executionPlan.scenePlan.X=`、`scene.scenePlan.X=` 均无）——除了 orchestrator:448-460 的回写，那是**导演产物沿流水线的传播**（把 ④/EP 挂到 scene 对象供 writer/Studio 读），不是变异既有真相。
- `migrateScenePlan={...plan}` 浅拷贝是**变异隔离边界**——buildSceneExecutionPlan 内部对 planLocal 的所有变异（obstacle/choice/consequence）不触碰 ④，更不触碰 authored scene。

**但记录三处边界现象（全部按停止条件只记录）：**

1. **引擎 bundle 双重计算**（engine 发现①）：engines1（④，无 chapterClimax）vs engines2（②，含 chapterClimax）独立构造；climaxRole 可能不同值。→ 同一事实两处计算，值域边界在「章级参数是否传入」。
2. **scene 对象四形态同挂**：orchestrator 回写后，writer/Studio/persistence 在同一 scene 对象上可读 ④ + ①②③。消费端混读成为惯例（§3.4 混读表）。
3. **两级混读**：
   - prompt-compiler:189/:190 —— `scene.goal || ep.scenePlan?.goal`、`scene.conflict || ep.scenePlan?.obstacle`（scene authored → ② fallback）
   - SD brief :170-178 —— `narrative.X || plan.X`（③ → ④ fallback）+ `executionPlan.reward?.payoff`（① fallback）
   - beat-slimmer:606 —— `scene?.authorIntent || EP.scenePlan?.authorIntent`（④ → ②）
   - → 混读本身是「不同语义 fallback」，非 owner 冲突；但这些点正是「改哪份 plan 会影响哪份输出」的敏感面。

---

## §4 停止条件确认（全部触发 → 只记录，未改码）

| 停止条件 | 触发证据 | 处置 |
|---|---|---|
| scene-mounted plan 有独立消费者 | ④：commercial-writer-rules:223、sample-driven-writer:157、execution-intelligence:68、beat-slimmer:275、SD brief | 记录 |
| Studio/API 依赖特定 plan 形态 | Studio 优化器读 ④（writer-rules:252-255 plan.goal/obstacle/choice/consequence）；Studio API 透传 EP 整对象 | 记录 |
| persistence 结构与 runtime 结构耦合 | saveSceneArtifacts 整 scene 对象写（含 ④+EP）；scenes.json 磁盘/内存双份 | 记录 |
| compiler 混读 | prompt-compiler:189/:190、SD brief :170-178、beat-slimmer:606 | 记录 |
| 不同语义 fallback | goal/choice/consequence 章级 fallback；obstacle/consequence 引擎覆盖；authorIntent 双载体（唯一可替换） | 记录 |

**不顺手做**：不把四份 plan 合成一份；不动 28 镜像；不动 cost/escalation/targetEmotion（Tier 2 冻结）；不进入 C4。

---

## §5 观察项与下一拍板选项

- **engine 发现①（双重计算）**：attachSceneEngines 与 buildSceneExecutionPlan 各跑一次 buildSceneEngineBundle。若拍板收敛：给 attachSceneEngines 传 chapterClimax/chapterRhythm（1 行），使 ④ 与 ② 引擎输出严格同值——但那会让 ④ 首次带上章级参数，触碰 SD brief 输入。低风险、需 golden 语义确认（golden 不覆盖 EP，改后需 module-4 + 全仓回归）。
- **engine 发现②（choice 时序）**：deriveSceneChoice 在引擎后执行，引擎基于变异前 choice。若拍板：把 choice 派生前移到引擎前（需确认不破坏「Beat Plan 退化硬化」的 missing 暴露语义）。
- **authorIntent 双载体**：唯一「同值同语义可替换」真复制（④↔②）。若未来收敛，首选删一载体（beat-slimmer 单读）。
- **四形态并存的消费端惯例**：compiler/SD brief 的三级混读已稳定——任何「删形态」都会改混读语义，须先定义「scenePlan 输出形状白名单」。

**P3.5 结论**：四份 plan 不是历史复制——是 **authored 真相（scene 标量）→ 合并投影（④）→ 解析富化（②）→ beat 级派生（③）→ Execution View（①）** 的**不同边界语义投影链**。唯一「真复制」是 authorIntent（④↔②）。真正的架构风险不在「多份 plan」，而在 **orchestrator 回写后四形态同挂 scene 对象、消费端混读成惯例**——这是「边界清晰化」的下一刀候选，但任何改动都必须先过「混读语义」这一关。

---

## §6 P3.5-1 authorIntent 双载体收敛（执行完成 2026-08-20 ✅）

> 拍板：「只改消费路径，不删除 source；先不要直接删 scene.scenePlan.authorIntent（④）；确认只删一个载体」。

### 6.1 复证结果（先查后删）

| 载体 | 生产者 | 消费者 |
|---|---|---|
| source `scene.authorIntent` | planner:744（seed 派生，authored） | beat-slimmer（首读）|
| ④ `scene.scenePlan.authorIntent` | scene-director:58/83（source \|\| sceneSeeds 兜底） | beat-slimmer（P3.5-1 后次读）|
| ② `executionPlan.scenePlan.authorIntent` | scene-exec scenePlanView spread（=④ 值） | **删前仅 beat-slimmer:609** |

- 全仓唯一消费者 = beat-slimmer:606-609（`scene?.authorIntent || executionPlan.scenePlan?.authorIntent`）。攻击式 grep（解构/括号/任意链）+ 前端/TS 全扫零间接读。
- **② ≡ ④ 语义证明**：Case A 导演跑过（生产）→ ④=②=`source || sceneSeeds 兜底`，scene 同挂 ④+②；Case B 无导演 → buildPlanFromScene:302 不设 authorIntent，② 与 ④ 皆 undefined（兜底本无值）；authored-plan scenePlan 无 authorIntent 键 → 两者缺省。sceneSeeds 兜底唯一「≠source」情形由 ④ 原样承载。
- **persistence/Studio/API/fixtures**：零代码消费者；持久化 scenes.json/review_report/writer-optimization meta 的 authorIntent 键全为 null 数据（非读者）；无 fixture 含 authorIntent。
- **结论**：纯冗余传播 → 删 ② 载体，消费端改读 ④ 单链，语义等价零漂移。

### 6.2 改动（2 处）

1. `packages/inkos-director/src/scene-execution.js`：`scenePlanView` 块追加 `delete scenePlanView.authorIntent;`（与 P3.4-1 的 revealPolicy/narrativeRewardText 同款出口剔除）。
2. `packages/inkos-studio-server/src/writer-optimization/beat-slimmer.js`：消费端 `executionPlan.scenePlan?.authorIntent` → `scene?.scenePlan?.authorIntent`（④ 单链回退，sceneSeeds 语义保留）。

### 6.3 回归门全绿

- golden baseline verify 3× exit=0（golden 不跑 director → 无 executionPlan → scenePlanView 编辑不可达；beat-slimmer 不在 golden 路径）。
- module-4 `scene-execution-10` ✅（0 消费者槽剔除与 P3.4-1 同类，版本不 bump）。
- decision-conflict-null ✅ / memory-unit ✅（exit=0）/ chapter-audit-flow 13 checks ✅。
- test-beat-slimmer / test-beat-continuity 为**前置失败**（stash 验证改前即 exit=1，`紧接续写`/continuation tail 断言与 authorIntent 无关，不在拍板 gate 列表）。
- 残留扫描：② 载体全仓零引用（仅注释+④ 读取）。

### 6.4 收敛后形态

`scene.authorIntent`（source）→ ④ `scene.scenePlan.authorIntent`（唯一载体，sceneSeeds 兜底）→ beat-slimmer 单链读取。② `executionPlan.scenePlan.authorIntent` 载体永久移除。
