# 24. Phase 2.9 — 横向单向 Ownership 审计（✅ 已通过：方向单向成立，ownership 链有两条断边；断边处是作者散文层）

> 日期：2026-08-19 ｜ 状态：**✅ 已通过（用户拍板）** ｜ 性质：契约文档（先文档后代码）
> **审计问题（用户定）**：`Canon → Character → Chapter → Scene → Beat → State` 是否**真的形成单向 ownership**，而不是再新增一个抽象层。
> **拍板定论（最有价值的纠正）**：**「架构上应该有一条边」≠「代码里应该补一条边」。这次不补，反而是减法。**
> **Phase 2 红线（拍板新增，减法纪律）**：**不要再把「缺失的边」自动视为架构缺陷。**

---

## 0. 一句话定位

> 2.7 收敛方向是 `Canon → Character Intent → Chapter Intent → Scene Intent → Beat Execution → Writer → Truth Gate`；2.8 确认 State = 未来故事分叉的最小事实集合。2.9 问：这条链在代码里真的单向吗？每一层真的拥有自己的语义吗？
> **审计判据（单向 ownership 三问）**：① 数据流方向是否恒定（上层只向下喂，下层只消费）？② 下层是否重定义上层拥有的语义？③ 断开这条边，是否还有别的通道把同一语义送到下层？

---

## 1. 六条边的证据表（生产主路径 = authored plan，全部 file:line）

| 边 | 数据流证据 | 单向？ | Ownership 语义 |
|---|---|---|---|
| **Canon → Character Intent** | `story_dna.yaml` → `intent._storyDna`（scene-director.js:150）→ `buildCharacterDesireProfile({storyDna, intent, chapter})`（character-desire-engine.js:49 → scene-execution.js:89）→ `characterDesire` | ✅ **单向** | **REAL**：角色欲望从 canon 派生，且只在 scene-execution 时刻现推 |
| **Character Intent → Chapter Intent** | `planner.js` **全文件零** `storyDna\|characterDesire\|desire\|intent.character` 引用（grep 无命中）；`serializeAuthoredPlanToIntent`（planner.js:288-393）无任何 character 字段 | ❌ **边不存在** | **平行作者输入**：作者写 storyDna（角色欲望）+ chapter_plans（章目标），代码从不交叉验证「章目标 vs 角色欲望」一致性 |
| **Chapter Intent → Scene Intent** | `serializeAuthoredPlanToIntent`（planner.js:297-298）：`goal = "承接上章推进：{场景散文}"`、`conflict = "推进冲突：{plan.conflict}"`——**同一个 conflict 文本灌进每个场景**；缺场景从 climax/cost/ending 补齐（:312-353） | ⚠️ **单向（有数据流）但语义=字符串盖章** | **不是结构化派生**：Scene Intent 的 goal 来自作者场景散文前缀，conflict 来自章级盖章 |
| **Scene Intent → Beat Execution** | `buildSceneExecutionPlan`（scene-execution.js:620）→ `beats`（2.5 已确认：Before→Action→After→Change） | ✅ **单向** | **REAL** |
| **Beat Execution → Writer** | `renderBeatForWriter` / `beat-slimmer`（2.7 已确认：P0-P3 栈 + 逐拍 slim） | ✅ **单向** | **REAL** |
| **Writer → State → 下一章** | accept → `states/ch_*_anchor.yaml` → 下一章 plan（2.6 已确认：`Story Event → Anchor → Continuity`） | ✅ **合法反馈环** | **状态层循环，不在 intent 层**——唯一合法的「向上」通道，2.6 保护清单 |

---

## 2. 三个发现

### 发现 1：方向单向成立（无上游回写）

整个 intent 链从作者输入 → intent → scenes → beats → writer → gates，**没有任何层把值写回上游**。2.8 发现的 `plan.priorityGoal/fear/choice` 回写（scene-execution.js:695-696/705）是**同一 scene 执行对象内**的循环，不跨层、不落回作者文件。D22 单向数据流铁律在方向层面已经成立。

### 发现 2：`Character → Chapter` 边不存在（最大的契约与现实差）

- `planner.js`（含两条路径）**零角色意图引用**；角色欲望只在 **scene-execution 时刻**从 storyDna 现推（scene-execution.js:89），从不下传影响章规划。
- 作者写 `story_dna.yaml` 和 `chapter_plans/*.yaml` 是两个**平行作者输入**，runtime 从不验证一致性。「章目标违背角色欲望」**零检查**。

### 发现 3：`Chapter → Scene` 是字符串盖章，不是结构化派生

`serializeAuthoredPlanToIntent`（planner.js:297-298）把作者场景散文加前缀当 goal、把章级 conflict 盖章当每个场景的 conflict，缺场景从 climax/cost/ending 补齐（:312-353，含防复读守卫）。**Scene Intent 的真实 owner = 作者场景散文 + 章级盖章 + 引擎 enrich。**

---

## 3. 拍板记录（2026-08-19，三项全定 + 红线）

| 决策 | 问题 | 拍板 |
|---|---|---|
| **D24** `Character → Chapter` | 边不存在，补不补？ | ✅ **不补边**。补「人物目标一致性验证」会立刻产生新仲裁者（Character Validator / Intent Conflict Resolver / Override priority / Replan）——**开始长出我们正在删除的东西**。**作者本身就是两个信息源的交叉点**；系统负责**执行和保持结果一致**，不替作者判断「你这个剧情不符合你自己的人物设定」。除非未来真实出现大量质量问题，用真实数据证明需要这条边 |
| **D25** `Chapter → Scene` | 盖章要不要改成真派生？ | ✅ **不改现状，但要准确命名**。`serializeAuthoredPlanToIntent()` 更像 **Author Plan Normalizer / Serializer**，不是 Story Planner。不假装存在「Chapter Intent → Scene Intent 的结构化派生器」——否则以后有人看到 Scene Intent 就会加 `deriveSceneIntent()`，重新发明一个 Planner |
| **D26** 分层表述 | pipeline ASCII 是契约幻想 | ✅ **必须改**。真实系统画成三层：**作者输入层 → 渲染执行层 → 故事状态环**（ASCII 见 §4） |

### Phase 2 红线（拍板新增，最重要的减法纪律之一）

> **不要再把「缺失的边」自动视为架构缺陷。**

以后看到「A 没有 → B」，必须先问：

```
1. A 和 B 是否真的应该存在因果关系？
2. 这条边是否解决真实生成质量问题？
3. 如果加边，谁拥有冲突仲裁权？
4. 是否会制造新的状态 / Validator / Resolver？
5. 是否可以让作者承担这个决策，而系统只负责执行？
```

> 如果答案是「只是为了让架构图看起来完整」——**不加。**

---

## 4. 真实系统三层图（拍板定稿）

```
┌──────────────────────────────────────────────┐
│                作者输入层                     │
│                                              │
│  story_dna.yaml        chapter_plans/*.yaml  │
│       │                       │              │
│       └──────── 作者 ─────────┘              │
│                                              │
│  作者拥有：人物意图 / 章目标 / 场景描述       │
└──────────────────────┬───────────────────────┘
                       │
                 normalize / serialize
                       │
                       ▼
┌──────────────────────────────────────────────┐
│                 渲染执行层                    │
│                                              │
│ Canon                                         │
│   ↓                                           │
│ Character Desire（按场景现推）                │
│   ↓                                           │
│ Scene Execution                               │
│   ↓                                           │
│ Beat                                          │
│   ↓                                           │
│ Writer                                        │
│   ↓                                           │
│ Truth / Progress Gates                        │
└──────────────────────┬───────────────────────┘
                       │
                 状态产生 / 固化
                       │
                       ▼
┌──────────────────────────────────────────────┐
│                  故事状态环                    │
│                                              │
│ Writer → anchors / state → 下一章            │
└──────────────────────────────────────────────┘
```

> **最值得保留的一句话（拍板定稿）**：
> **「作者层可以是多源的；执行层必须是单向的；状态环只能向未来传播，不能反向改写作者意图。」**

---

## 5. 与 Phase 2 主线的关系

- **D15（Character Intent 单源）成立，位置修正**：Character Intent 是渲染栈内从 canon 现推的语义（characterDesire → push/priorityGoal/fear/choice 喂 Scene/Beat 层），**不是「Character → Chapter」链的一环**。
- **D16（Chapter Intent 唯一主干）成立，Scene owner 修正**：Scene Goal 真实来源 = 作者场景散文 + 章级盖章，不是 chapterIntent.goal 的结构化派生。
- **2.8 Story State 定义不动摇**：状态环正是「会改变未来故事选择空间的状态」，与作者散文层/渲染栈正交。
- **红线继承**：三条断边（Character→Chapter / Chapter→Scene / 未来任何缺失边）都先过 §3 五问再决定加不加。

---

## 6. 明确不做（2.9 边界）

- **不新增任何抽象层**（审计目的是确认单向性，不是修出更漂亮的链）。
- **不补 Character→Chapter 验证**（D24：作者是唯一交叉点）。
- **不改 serializer / 不加 deriveSceneIntent**（D25：Author Plan Normalizer 维持现状，2.4 D5 已定）。
- **不动渲染栈 / 状态环**（2.6 保护清单 + 2.8 驱动链）。
- **不画第二张架构图**（避免制造第二事实源，2.6 铁律）。

---

## 7. Phase 2.10 预告（用户定：架构冻结前验证）

> Phase 2 已从「架构优化」进入「架构冻结前验证」。下一步不是 2.10 再发现一个模块，而是验证一个更根本的问题：
> **这套减法之后，InkOS 是否真的已经只剩下「故事不可缺少的状态与约束」？**
>
> 对 `Canon / Character / Chapter / Scene / Beat / State / Gate` 做最后一次 **negative-space audit**：
> 不是问「还缺什么」，而是问——**每一个剩下的东西，删掉以后，哪个真实故事能力会立刻消失？**
> 如果答不出来，就应该进入待删名单。

---

## 8. 变更记录

- 2026-08-19 起草 v1：六条边证据表 + 三发现 + 修正数据流图 + D24-D26 决策点。
- 2026-08-19 v2 通过：D24（不补边，作者=交叉点）、D25（serializeAuthoredPlanToIntent = Author Plan Normalizer，非 Story Planner）、D26（三层图：作者输入层/渲染执行层/故事状态环，定稿 ASCII）；Phase 2 红线（缺失的边不是缺陷，先过五问）；最值得保留的一句话（作者层多源/执行层单向/状态环只向未来）；2.10 预告（negative-space audit）。
