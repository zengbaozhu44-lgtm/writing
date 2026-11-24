# 20. Phase 2.5 — Beat Contract（✅ 已通过：Beat 已是故事发动机；任务 = 确认 + 防复肥）

> 日期：2026-08-19 ｜ 状态：**✅ 已通过（用户拍板）** ｜ 性质：契约文档（先文档后代码）
> 核心判断：**Beat 不是重在输出结构，而是重在输入语义没有明确分层。** 代码已证明 Beat 核心循环健康（Before→Action→After→State Delta = 故事发动机）。2.5 任务 = 确认 Beat 已经是什么 + 防止未来重新膨胀。

---

## 0. 一句话定位

> 之前看见 Beat 字段多，第一反应是「太重→删字段→简化」。调查证明：**Beat 不是重在输出结构，而是重在输入语义没有明确分层。** 核心循环（Before→Action→After→State Delta）就是故事发动机，已经健康。

---

## 1. 现状证据：Beat 已经是「状态变化单元」（保留）

### 1.1 结构权威（beat-state.js）

```js
// 头部铁律（beat-state.js:4）：每个 Beat 必须改变至少一个状态维度，否则无效
STATE_CHANGE_DIMENSIONS（六维，:11-18）：relationship/information/danger/resource/goalDirection/worldCognition
STATE_BEAT_SEQUENCE（六拍叙事位置，:22-27）：goal → obstacle → choice → consequence → newInformation → hook
BEAT_STATE_TEMPLATES（:31-73）：actionKey + choiceHint + consequenceHint + afterState + requiredDimension
```

`buildSceneBeatPlan` 产物（:171-230）：`structuralBeat / beforeState / action / choice / newInformation / consequence / afterState / stateChange / requiredDimension / missing[] / hasConcreteDelta`。

### 1.2 模型看到的 Beat（writer 层，change 已到 prompt）

- `renderBeatForWriter`（narrative-renderer.js:79-122）：`**必须落地**：{action}` + `Before` + `After（须不同）`。
- `beat-slimmer.js` 硬规则：「Before≠After：只推进『上一拍之后』的下一动作与后果」（BEAT_HARD_RULES）。
- `beat-execution.js`：跨拍 `session.beforeState → nextContinuity.lastAfterState` 串联（:279-281/:400/:483），逐拍 `beatStateDelta` 追踪（:595）。

---

## 2. 事实修正（16 §2.5 过时，同 2.4 模式）

| 16 §2.5 表述 | 代码事实 |
|---|---|
| 「hook/emotionScore/informationScore/tensionScore 降级为辅助字段」 | ❌ **已不存在**：`emotionScore` 仅 reader.js:70；`informationScore`/`tensionScore` 零命中；`hookScore` = 章级 readerSimulator Optimizer 触发（chapter-pipeline.js:124/152），非 beat 字段 |
| 「Beat = 太重」 | ⚠️ 已处理：`beat-slimmer` + 2026-08-18「Beat Plan 退化硬化」（META_PHRASES/missing[]/hasConcreteDelta） |
| 「降级是契约变化」 | ⚠️ 契约变化已在代码完成，文档滞后 |

---

## 3. Beat Contract 第一原则 + 最小契约（✅ 已拍板）

### 3.1 第一原则：change 是状态变化证明，不是文学字段

```
change = After − Before
```

不是"有没有事件"，而是**角色知道什么 / 关系如何 / 危险程度 / 目标方向 是否变化**。若这些都不变，Beat 实际不存在——哪怕它有 `action: 调查房间` + `consequence: 获得线索`。

> **「Before ≠ After」应成为硬原则。**

### 3.2 最终 Beat Contract（用户定稿）

```yaml
Beat:
  position:     goal|obstacle|choice|consequence|newInformation|hook
  beforeState:  snapshot
  action:       what happened
  afterState:   snapshot
  change:       required state delta
```

### 3.3 禁止字段（防复肥的闸）

```
禁止进入 Beat：
  emotionScore
  informationScore
  tensionScore
  hookScore
```

（这些要么已不存在，要么属 Soft Review / reader-sim 层，2.3 已定。）

---

## 4. 分层：Scene 提供动力，Beat 产生变化（D8 已拍板）

```
Scene 层：回答「为什么这个场景发生？」
  Character Intent ── 例如 scene.protagonist.desire / scene.opponent.resistance
  Conflict

Beat 层：回答「这一次行动改变了什么？」
  Action + Change
  例如 { action: 打开保险柜, change: { relationship: trust -1, information: truth +1 } }
```

- **actor / intention / resistance 不进入 Beat 字段**（D8 ✅）。
- 若加入，会演化成 `Beat { actor / desire / emotion / motivation / obstacle / tension / hook / state / metrics }` → 一年后 Beat 复肥。

---

## 5. 两 Hook 分离（D9 已拍板）

| | 归属 | 回答的问题 |
|---|---|---|
| **Hook(position)** | 叙事结构位置（六拍之一，structuralBeat） | 这一拍在叙事结构中的位置？ |
| **Hook(score)** | Soft Review（readerSimulator 章级） | 这一章是否足够吸引？ |

> **二者不同名**：`Hook(position) ≠ Hook(score)`。防止将来有人把 reader 指标塞回 Beat。

六拍结构（goal/obstacle/choice/consequence/newInformation/hook）保留为叙事位置。

---

## 6. 拍板记录（2026-08-19，三项全定）

| 决策 | 结果 |
|---|---|
| **D7** change 已内建 | ✅ 固化为 Beat 最小契约核心（§3.1/3.2） |
| **D8** actor/intention/resistance | ✅ 保留在 Scene/Character Intent 层，不进入 Beat（§4） |
| **D9** 六拍 / hook | ✅ 保留结构 Hook，与 Reader Hook Score 分离（§5） |

---

## 7. Phase 2 总原则（本次发现的元模式，指导 2.6/3）

Phase 2 连续出现同一个模式——**原问题不是没有模型，而是模型之间边界污染**：

| 步骤 | 不是缺 | 而是 |
|---|---|---|
| Chapter Intent | 不是缺 | authored plan → serializer → 语义丢失 |
| Recovery | 不是缺 | 已有 replan → 没契约化 |
| Beat | 不是缺 | 已有 state delta → 输入责任没分层 |

> **Phase 2 总原则：不新增故事抽象，先恢复已有抽象的职责边界。**

---

## 8. 变更记录

- 2026-08-19 起草 v1（现状证据：Beat 已是状态变化单元 + 四文学字段已不存在 + 缺口在输入侧 + D7/D8/D9 决策点）。
- 2026-08-19 v2 通过：change 固化第一原则（After−Before 状态变化证明）；最终 Beat Contract 定稿；禁止字段清单；Scene 动力/Beat 变化分层（D8）；Hook(position)≠Hook(score)（D9）；Phase 2 总原则（职责边界污染模式）。
