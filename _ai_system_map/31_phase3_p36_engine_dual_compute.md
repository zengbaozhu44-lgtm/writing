# P3.6 Engine 双计算只读审计（Engine Bundle 到底算了几次、该不该同语义）

> 2026-08-20 · **只读，未改任何代码**（拍板：先钉死「双计算是 duplication 还是 semantic divergence」，不直接动那 1 行）
> 前置：P3.5 记录「引擎 bundle 双重计算（④.climaxRole ≠ ②.climaxRole 可能）」→ P3.6 专门审计
> 冻结：choice 时序前移、scenePlan 输出形状白名单（单开 P3.6）

---

## §1 两个调用点

```js
// 调用点 1（→ ④ scene.scenePlan）——scene-director.js:96，attachSceneEngines
const engines = buildSceneEngineBundle({ scene, intent, plan, chapter, sceneIndex, sceneCount,
                                         storyDna, hookLadder, prevScene });
//                                  ↑ 不传 chapterClimax / chapterRhythm

// 调用点 2（→ ②/① executionPlan）——scene-execution.js:658，buildSceneExecutionPlan
const engines = buildSceneEngineBundle({ scene, intent, plan, chapter, sceneIndex, sceneCount,
                                         storyDna, hookLadder, prevScene,
                                         chapterClimax, chapterRhythm });
//                                  ↑ 传 chapterClimax / chapterRhythm
```

`buildSceneEngineBundle`（scene-execution.js:76）返回 10 字段：`situation / questions / questionRegistry / reward / characterDesire / characterPush / emotionCurve / conflict / climaxRole`。

调用点 2 的 `plan` = `migrateScenePlan(④)`（浅拷贝，P3.2/P3.5 变异隔离边界）→ **调用点 2 的 plan 已含调用点 1 的全部引擎输出**。

---

## §2 输入 diff（审计①）

| 参数 | 调用点 1（④） | 调用点 2（②/①） | 差异 |
|---|---|---|---|
| `chapterClimax` | ✗ 不传 → `null` | ✓ 传（`chapterDir?.chapterClimax \|\| intent._chapterDirector?.chapterClimax`） | **唯一有效差异** |
| `chapterRhythm` | ✗ 不传 → `null` | ✓ 传 | **死入参**（bundle 体内仅签名 :87 出现，从未被消费）→ 不可能造成差异 |
| `plan` | `basePlan`（合并投影，无引擎字段） | `planLocal = migrateScenePlan(④)`（**已含调用点 1 全部输出**） | 结构性差异（见 §3 复用） |
| `scene` / `intent` / `chapter` / `sceneIndex` / `sceneCount` / `storyDna` / `hookLadder` / `prevScene` | 同 | 同（prevScene 同源 `intent.scenes`；chapter 回退序略异但同值） | 无实质差异 |

---

## §3 bundle 字段 diff（审计②）

| 字段 | 调用点 1（④） | 调用点 2（②/①） | 结果 |
|---|---|---|---|
| `characterDesire` | `buildCharacterDesireProfile({storyDna,intent,chapter})` | 同输入重算 | **相同** |
| `questionRegistry` | `buildQuestionRegistry({intent,chapter,sceneIndex,storyMemory})` | 同输入重算 | **相同** |
| `situation` | `buildSceneSituation`（basePlan 无 situation） | **复用**（`plan.situation?.worldState` 守卫）| 同一对象 |
| `questions` | build | **复用** | 同一对象 |
| `reward` | build | **复用** | 同一对象 |
| `emotionCurve` | build（不依赖 chapterClimax） | **复用** | 同一对象 |
| `conflict` | `buildSceneConflict`（**chapterClimax=null**） | **复用**（`plan.conflict?.opponent` 守卫）→ **② 内的 chapterClimax 分支是死代码** | 同一对象（**都 positional**）|
| `characterPush` | build（二次，末次带 situation） | 重算（同 desire / plan 标量 / situation 对象 / prevPush）| **相同** |
| **`climaxRole`** | `buildSceneClimaxRole({climaxPlan:null})` → **positional**（`sceneIndex>=sceneCount ? 'climax' : 'escalation'`，无 isPreClimax/climaxPlan/writerMust）| `buildSceneClimaxRole({climaxPlan:chapterClimax})` → **chapter-aware**（sceneRoles/climaxSceneIndex/isPreClimax/writerMust）| **唯一真正不同** |

### §3.1 关键机制：reuse 守卫

```js
// scene-execution.js:185-189（bundle 内部）
const conflict = plan.conflict?.opponent ? plan.conflict : buildSceneConflict({... chapterClimax, climaxRole ...});
```

- 调用点 1 的 `basePlan.conflict` = 空 → 调用点 1 **build** conflict（chapterClimax=null，positional）。
- 调用点 2 的 `planLocal.conflict` = 调用点 1 的输出（有 `.opponent`）→ **复用**，`buildSceneConflict({chapterClimax})` 分支**永不执行**。
- **后果**：`chapterClimax.maxCost / maxConflict` 注入（conflict-engine:110-113）在生产主路径被**静默绕过**。章级最大代价/最大冲突永远进不了场景 conflict。

---

## §4 两结果消费者（审计③）

### ④ scene.scenePlan（调用点 1 输出）
| 字段 | 消费者 |
|---|---|
| situation/questions/reward/conflict/characterDesire/characterPush/emotionCurve | SD brief（scene-director:169 `formatConflictBrief(plan.conflict)` 等）、persistence（scenes.json 整对象写）、Studio 预览（透传）|
| **climaxRole** | **全仓 0 消费者**（攻击式 grep：`scenePlan.*climaxRole` 任意链/括号/解构全空）|

### ② executionPlan.scenePlan
- 引擎字段与 ① 顶层同一对象（engines2 解构值，28 双层=P3.4 单构造两引用）。
- **climaxRole 无独立消费者**（同 ① 引用）。

### ① executionPlan 顶层（全部 live）
| 字段 | 消费者 |
|---|---|
| **climaxRole**（chapter-aware）| compiler:203/227/259、writer-runtime:661/671、writer-first:204、prompt-priority:115、beat-execution:283/401、sample-driven:388/428、compile-writer-prompt:135、writer-runtime-v2:458/594/630、scene-director:235 |
| **conflict**（= ④ positional，reuse）| compiler:198 `ep.conflict?.opponent`、writer-runtime:662/679、writer-first:186、prompt-priority:47-48、beat-continuity:971、beat-slimmer:560 |

**小结**：`climaxRole` 的真实语义由 ① 决定 = **chapter-aware**。④ 的 positional climaxRole = **死值**。而 `conflict` 全链（④/②/①）都是 **positional**（调用点 1 无章参数的 build）。

---

## §5 统一输入的后果（审计④：若 attachSceneEngines 传 chapterClimax）

可行性与安全性（无阻碍）：
- **ordering 无问题**：director.js:76 `runChapterDirector`（产出 chapterClimax）→ :101 `runSceneDirector`（调 buildScenePlan/attachSceneEngines）。**调用点 1 时刻 chapterClimax 已可得**。
- **影响面单一**：`buildScenePlan` 全仓唯一调用者 = buildSceneDirectorBrief（scene-director:138）。deprecated 包装（runDirectorPlan/buildDirectorPlanBrief）与部分测试不传 chapterDir → 得 null → 保持现状（positional），零回归。
- **golden 无关**：golden 不跑 director（无 sceneLifecycleHook）→ 无 ④/②/① → 本审计与 golden 零交集（验证 baseline scenes 无 executionPlan 键）。

统一后变化：
| 位置 | 现在 | 统一后 |
|---|---|---|
| ④.climaxRole | positional（**死值**）| chapter-aware（仍死值，但一致）|
| ④.conflict | positional build | chapter-aware build → **SD brief formatConflictBrief 内容变化** + persistence 变化 |
| ②/①.conflict | positional（reuse ④）| chapter-aware（reuse 传播）→ **prompt conflict 变化**（compiler:198 / writer-runtime 等）|
| authored scene.conflict | normalizeConflict（scene 优先）| **不变**（buildSceneConflict:100 早返回仍优先 authored）|

→ **统一 = 行为变更（SD brief + prompt 的 conflict 文本），不是纯 DRY 无操作**。但它是 conflict-engine:110-113 **已写明的设计意图**（climax 场景注入 maxCost/maxConflict）的兑现。

---

## §6 测试覆盖缺口（关键证据）

`scripts/test-commercial-drivers.js`：
```js
const executionPlan = buildSceneExecutionPlan({ scene: { ...scene, scenePlan: scene }, ... chapterDir });
// fixture scenePlan = 原始 scene（无 conflict）→ plan.conflict?.opponent 守卫 falsy
// → 走 engines2 的 chapterClimax 分支 → conflict cost = chapterClimax.maxCost 注入
if (!executionPlan.conflict?.valid) FAIL;
if (!/妹妹|代价|关系|信用|生命/u.test(conflict.cost)) FAIL;   // 断言「本章最高代价」注入
if (!executionPlan.climaxRole?.isClimax) FAIL;
```
- **该测试断言的 chapter-aware conflict（maxCost 注入）在生产不兑现**：生产 ④ 带 engines1 的 positional conflict → 守卫复用 → 注入被绕过。
- 测试 fixture 的 scenePlan 无 conflict → 恰好走死路径 → **测试绿 = 生产语义的反证**。
- 需要一个「④ 带 conflict + chapterClimax 存在 + climax 场景非末位」的 fixture 才能把生产语义钉死。

---

## §7 停止条件判定

用户停止条件：`④ ≠ ② 是有意语义分层则停，不为 DRY 强行统一`。

**判定：不是有意分层。** 证据：
1. ④.climaxRole（positional）**全仓 0 消费者** = 死值，不是被设计为"plan 边界的 positional 角色"。
2. ②/① 当前是**不一致混合态**：climaxRole chapter-aware + conflict positional——一个对象里两套语义，这是结构事故，不是干净分层。
3. conflict-engine:110-113 的 chapterClimax 注入是**已写明的设计意图**，被 reuse 守卫**无意绕过**（守卫本意="authored conflict 优先"，效果=「把调用点 1 的推理结果当最终值」——守卫无法区分 authored 与 engines1 推理）。
4. 因此差异不是「两个边界各自的意义」，而是**一个边界里冲突引擎的章级能力没接上**。

→ 不因"DRY 强求统一"停（这不是 DRY），但也**不到"纯重复可安全统一"**（统一会改行为）。

---

## §8 结论（审计⑤）

### 三选一判定

- **A 纯重复计算可安全统一**：✗ **不是**。两次输入不同（chapterClimax）、climaxRole 输出不同、conflict 的生产路径根本没重算（reuse）。不是"同一 Engine + 同一输入 + 同一语义 + 不同时间重复"。
- **B 输入语义不同应保留双计算**：✗ **不是**。差异不是设计出的语义分层（§7：positional 侧死值 + 混合态 + 未兑现的注入意图）。
- **C 现在无法证明需补测试/fixture**：**✓ 核心结论**。代码意图（conflict 章级注入）与生产行为（positional）**互相矛盾**，而现有唯一断言该语义的测试（test-commercial-drivers）恰好走死路径、不能代表生产。需要 fixture 钉死「④ 带 conflict + chapterClimax」场景下 conflict 到底该不该 chapter-aware。

### 但审计能给出比 C 更强的结构结论

**双计算的本质**：
```
调用点 1（④）＝ plan 边界：scenePlan 的引擎字段（positional，无章参数）→ SD brief + persistence
调用点 2（②/①）＝ execution 边界：reuse ④ 大部分引擎字段 + 唯一重算 climaxRole（chapter-aware）
```
不是"算两次"，是**一次计算（大部分字段）+ 一次增量重算（climaxRole）**。真正的缺陷是**复用守卫把章级能力从 conflict 上剥掉了**。

### 拍板建议（两项候选，均需 fixture 先行，P3.6-1 时二选一）

1. **统一输入（attachSceneEngines 传 chapterClimax，1 行）**：④ 直接产出 chapter-aware conflict/climaxRole → reuse 传播 → SD brief + prompt conflict 变 chapter-aware → **兑现 conflict-engine 设计意图**。行为变更面=SD brief + prompt + persistence，需 fixture 验证语义增益。
2. **移除 conflict 的 reuse 守卫**（让 engines2 用 chapterClimax 重算）：④ 保持 positional（plan 边界）、②/① chapter-aware（execution 边界）→ 形成**有意分层**（此时 ④≠② 才是设计而非事故）。但 SD brief 仍读 positional ④.conflict → plan 边界与 execution 边界语义分叉，需确认 SD brief 是否该读 positional。

倾向：**候选 1**（单一真相，不引入 ④/② 新分叉；authored scene.conflict 在两个候选下都保持优先，符合 P3.3 authored-truth 原则）。

---

## §9 边界事实汇总

- golden 零交集（无 director → 无 EP）。
- persistence：④ 整对象写 scenes.json；统一后新写数据 conflict 变 chapter-aware，旧数据不回溯、无 reader 依赖旧值（scenePlan.conflict 代码消费仅 SD brief，运行时重读）。
- Studio：sample-driven/execution-intelligence/commercial-writer-rules **零 `plan.conflict` 读**；④ 的 Studio 消费集中在 plan 标量 + situation/questions；climaxRole 全走 ①。
- 死代码清单（审计副产品）：② 内 `buildSceneConflict({chapterClimax})` 分支（生产不可达）、④.climaxRole（0 消费者）、bundle 的 `chapterRhythm` 入参（0 消费）。

---

## §6.1 P3.6-1 Fixture Semantic Guard 执行记录（2026-08-20，先测不改码 ✅）

`scripts/test-p36-engine-semantic-guard.js`。chapterClimax 手动构造 `climaxSceneIndex=3 / sceneCount=5`（buildChapterClimaxPlan 恒放末拍 climax-engine.js:23，末拍无法区分 positional/chapter-aware）。

**Case A（scene3 无 authored conflict）8/8 语义断言红 = 静默绕过钉死**：
- ① ④.climaxRole positional（isClimax=false、无 climaxPlan）；scene2 无 isPreClimax。
- ② ④.conflict 未注入：cost/opposition ≠ maxCost/maxConflict。
- ③ ④/① climaxRole 分裂现场：`①.isClimax=true（chapter-aware）vs ④.isClimax=false（positional）`；①.conflict 同样未注入（reuse 传播 positional）。
- ④ SD brief **Conflict 段**（formatConflictBrief，非 Climax 段）代价行=推断值，非 maxCost。

**不变量 + Case B 全绿（exit=0）**：
- `executionPlan.conflict === ④.conflict`（同一对象）、`EP.scenePlan.climaxRole === EP.climaxRole`（同一对象）→ **②/① 是 ④ 的一致投影，唯一修复点 = ④**。
- Case B authored scene.conflict 保留（opponent/cost 不被 maxCost 覆盖）→ P3.3 Story Truth 未破坏。
- SD brief Conflict 段结构存在（消费通路健康）。

**结论**：fixture 证明**候选①成立** —— ④ 是根；reuse 使 ②/①/prompt（compiler:198/writer-runtime:662 等）全随 ④ 变 chapter-aware；authored 优先在两 layer 都成立（buildSceneConflict:100 早返回 + reuse 守卫）。等待用户拍板后做 1 行（`attachSceneEngines` 传 chapterClimax），再做回归门。

**副产品（前置脆弱性，未改，另记）**：buildScenePlan 的 obstacle 回退会把 authored conflict 整对象塞进 `plan.obstacle`（scene 无 obstacle 时）；`formatWriterSceneArcBlock` `(s.content||'—').slice` 遇非字符串 content 崩溃 → sparse scene + authored conflict 会使 SD brief 构建崩溃（writer-scene-arc.js:91）。

### §6.2 P3.6-1 执行记录（2026-08-20，候选①落地 1 行 ✅ 全绿）

**改动（仅 scene-director.js attachSceneEngines）**：`const chapterClimax = chapterDir?.chapterClimax || intent._chapterDirector?.chapterClimax || null;` + bundle 调用传 `chapterClimax`。不动 conflict-engine / reuse 守卫 / buildSceneConflict / choice 时序 / chapterRhythm / writer-scene-arc。

**回归门全绿**：
- 第一层 fixture：Case A **8/8 语义断言转绿**（④.climaxRole chapter-aware、④.conflict 注入、④/① 同语义、brief Conflict 段消费 maxCost）；Case B + 不变量保持绿。
- 第二层：module-4 exit=0、decision-conflict-null exit=0、memory-unit exit=0、chapter-audit-flow exit=0、test-beat-execution exit=0；test-beat-slimmer/continuity 仍 exit=1（前置 stale，`紧接续写`/continuation tail，只报告不修）。
- 第三层 golden 3× exit=0 byte-identical（**非覆盖项**：golden 无 sceneLifecycleHook → director 不运行 → 无 ④/②/①/EP，本次改动与其零交集；P3.6 语义由 fixture+回归门证明，非 golden）。

**before/after 定向 diff（钉死「diff 只在预期链上」）**：dump ④/②/①+SD brief Conflict 段，临时移除 chapterClimax 取 BEFORE 再恢复（恢复后输出逐字节一致）。唯一差异=④/②/① conflict 的 opposition/cost（positional 推断→maxConflict/maxCost 注入）、④.climaxRole（positional→chapter-aware，②/① 本就 chapter-aware 不变）、SD brief Conflict 段代价行。`opponent` 不变（注入只覆盖 opposition/cost）；epSameConflict/epSameClimaxRole 不变量前后均 true。**无无关字段漂移**。

**收口**：P3.6 双计算收敛完成——④ 现与 ②/① 同语义（chapter-aware），conflict-engine:110-113 设计意图在生产兑现；④.climaxRole 仍是 0 消费者死值（但已与 ① 一致，不再分叉）。**FOLLOW-UP 记入**：① sparse scene+authored conflict SD brief 崩溃（writer-scene-arc.js:91，用户拍板不立 P3.7）② chapterRhythm bundle 死入参。
