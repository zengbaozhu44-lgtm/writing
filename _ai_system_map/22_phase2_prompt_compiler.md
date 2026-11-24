# 22. Phase 2.7 — Prompt Compiler 减法审计（不要大砍，做语义所有权收敛）

> 日期：2026-08-19 ｜ 状态：**✅ 已通过（用户拍板）** ｜ 性质：契约文档（先文档后代码）
> **用户方向**：前面所有语义（Chapter Intent / Recovery / Beat / State）最终都会在 **Prompt Compiler** 汇合。剩余复杂度最可能不在 State，而在**「为了让模型理解故事而堆进去的 Prompt 层」**。
> **总体判断（用户拍板）**：**不要做 Prompt 大砍。做语义所有权收敛。** 真正的问题不是 token，而是**谁拥有这个语义的解释权**。

---

## 0. 一句话定位

> 2.7 的发现：prompt 层没有死代码，但**同一个故事语义被多个 director 块重复表述**——这是 2.4/2.5/2.6 看到的「边界污染」在 prompt 层的又一次出现。**一个语义，多个载体。**
> **总原则（用户拍板新增）**：**Prompt 层减法不是删除信息，而是删除语义重复。每个信息必须有唯一 owner，多个模块只能消费，不能重新定义。**

---

## 1. 三层 Prompt 架构（Studio 生产路径全景）

```
种子层  compileScenePrompt（inkos-prompt/compiler.js）─── 旧式 lore dump
   │         Scene 目标 / 人物卡 / 势力卡 / 世界规则 / 写作规则
   │         事实TopK / 时间线TopK / 09任务卡 / 08当前状态 / Adaptive
   │         （真实样例 ch13_s1 = 1930 tokens）
   ▼
密封层  prompt-compiler.compile()（inkos-runtime/compiler/prompt-compiler.js）
   │         P0 Format & Guardrails（5 政策 + inline）
   │         P1 Narrative Task（16 个 director 块）
   │         P2 Global Lore（种子层 dump 并入 loreText + worldBible + storyDna）
   │         P3 Adaptive Context（storyMemory + adaptive + prior + continuation/boundary/reveal/revisit/hook）
   │         编译后密封，禁止拼接
   ▼
逐拍层  compileSlimBeatUserPrompt（beat-slimmer.js ~400 行，~20 条件块）
            system = buildSlimBeatSystem（写作身份 + golden sample + BEAT_HARD_RULES）
            user   = 七元素叙事块 + 目标行 + 连续性块 + 拍指令 + P0-P3 栈按键切片（slimLoreForBeat）
```

**关键机制（决定成本在哪）**：
- `studio-llm-writer.js:254`：种子层 dump 作为 `basePrompt` → `compile-writer-prompt.js:148` 并入 P2 `loreText`。
- `compile-writer-prompt.js:155`：`compilePrompt` 产出 P0-P3 密封栈 → `optimizedPrompt`。
- `beat-execution.js:249-250`：**每拍 system = `buildBeatSystem(goldenSample)`（精简身份），不是 P0-P3 栈**。
- `beat-slimmer.js:337 slimLoreForBeat`：P0-P3 栈按键切片进 user prompt lore 区；`clipBeatPromptToBudget` 保拍指令。

> **结论**：逐拍 token 成本被 budget 钳制。真实成本在**编译期工程维护面**——24 字段 executionPlan + 16 个 P1 块 + 5 个写作政策 + ~400 行逐拍组装器。**但更深的真相：Prompt 层重复很可能只是 State 层膨胀的结果（→ 2.8）。**

---

## 2. 语义重叠地图（一语义 → 多载体）

### 2.1 写作五政策（P0，常开 3 + 门控 2）→ **WritingCraft（D14 ✅）**

| 块 | 文件 | 核心表述 | 状态 |
|---|---|---|---|
| Format inline | prompt-compiler.js:248-270 | 只输出正文 / 动作对白画面 / 情绪写进身体停顿 | 常开 |
| Writer First | writer-first.js | 禁止 AI 逻辑 / 事件→反应→留白 / 每 Beat≥2 维变化 | 常开 |
| Writer Craft Runtime | writer-craft-runtime.js | Show Don't Tell / 禁止心理标签 / 句节奏 / 禁止反复「突然」 | 常开 |
| Writer Runtime Policy | writer-runtime.js | 每段 Before≠After / 禁止调查→继续调查 / Author Mode | 常开 |
| Human Writing Policy | human-writing-policy.js | 禁止情绪总结/解释人物/贴标签/性格形容词 | `INKOS_PROMPT_RULES=legacy` 门控（默认关） |

**拍板（D14）**：五块本质都是 **Writing Craft Constraint**，属同一层。未来契约：

```yaml
WritingCraft:
  expression:      show_dont_tell
  investigation:   continue_discovery
  scene:           dramatize_not_explain
```

**但 Phase 2.7 不合并代码**——尚不知道哪些块被不同 pipeline 独立读取、哪些有 legacy 兼容需求。Phase 3 再定：`5 blocks → 1 contract → multiple renderers`。

### 2.2 角色三引擎（P1，全开）→ **Character Intent 单源契约（D15 ✅）**

| 块 | 表述 | 证据 |
|---|---|---|
| Character Goal | 外部目标 / 内在需求 / 恐惧 / 角色变化 | character-desire-engine.js:125 |
| Character Transformation | Before Belief → Choice → After Belief / 成长弧 | character-transformation.js |
| Human Behavior | desire / fear / hiddenNeed / irrationalAction / pastTrigger | character-behavior.js |

**污染**：三个地方都在回答「这个人为什么行动？」，但三个答案来源不同。真实 executionPlan 三个字段全 FILLED（ch13_s1 实测）。

**拍板（D15）**：唯一语义源：

```yaml
CharacterIntent:
  desire:
  fear:
  hiddenNeed:
  transformation:
```

不同消费者各取所需：
- **Writer**：角色当前想要什么
- **Scene**：角色为什么做这个选择
- **Reader**：角色如何变化

**不删除 transformation**——它和 desire/fear 不是重复，是链条关系：`现在驱动力 → 选择 → 变化方向`。Character Intent 是**源**，不是三个引擎互相同步。

### 2.3 目标五重奏（Beat1 全灌）→ **Chapter Intent 唯一主干（D16 ✅）**

`chapterGoal`（章目标）＋ `authorIntent`（作者意图）＋ `sceneGoal`（场景目标）＋ `drive.priority`（优先驱动）＋ `priorityGoal`（派生优先）——5 个目标来源在首拍叠加。

**拍板（D16，更严格）**：五个名字都像「目标」，必须定唯一权威：

```yaml
ChapterIntent:        # 唯一主干
  goal:
  conflict:
  turningPoint:
  irreversibleChange:
```

其它全部降级为 `derived hints`：

```yaml
SceneGoal:
  derived_from: chapterIntent.goal   # 不是第二个目标
```

> **⚠️ `priorityGoal` 标记危险**——它最容易变成「为了让 AI 更明确，再加一个目标」，是过去复杂度增长的典型来源。

### 2.4 情绪双引擎（P1）

| 块 | 表述 | 关系 |
|---|---|---|
| Emotion Curve | Scene 情绪弧 start→middle→peak→end（角色） | 合法分离（2.5 D9） |
| Reader Emotion | 读者情绪 start→middle→peak→end + information gap / 反讽 | 与角色分离，但同样发「→」弧 |

### 2.5 状态双陈述（P1，与 2.5/2.6 同构）

`situation-engine`（world/character/relationship 三维 before→after）与 `beatStatePlans`（structuralBeat/beforeState/afterState）——同一「状态变化」语义的两个渲染面，合法同构（2.5 change 原则）。

### 2.6 种子层重复（真实 prompt 证据，ch13_s1）→ **Canon Extractor 化（D17 ✅）**

- `Scene 冲突`：**冲突 == 阻碍（完全相同文本）**——典型**不同层级内容混入**。
- `09 任务卡`（本章任务）≈ `Scene 目标`——同一意图两处。
- `人物:林砚` 卡 + `势力:青穹重工` + `世界规则` + `写作规则` = 大段 canon 原样灌入（截断处理）。
- `相关事实 TopK`：前三全是章完成日志（F012/11/10，rel=55），仅 F014 是真实身体约束——facts_db 噪声直灌 prompt。

**拍板（D17，2.7 最大收益点之一）**：Seed Layer 不应该是「所有已知故事信息 dump」，而应该是 **Canon Extractor**：

```
负责：
  World Canon     世界规则 / 历史事实 / 关键限制
  Character Canon 稳定人物事实
  Faction Canon   阵营事实

不负责：
  当前章节目标 / 场景冲突 / 推进状态 / 完成日志
```

三层阻力分层（修 `冲突==阻碍` 的判据）：

```
Seed:   世界里有什么阻力
Intent: 本章谁遇到了什么阻力
Beat:   这一拍具体怎么碰撞
```

---

## 3. 真相（本次审计的三个确定结论）

1. **prompt 层没有死代码**：executionPlan 24 字段全 FILLED（ch13_s1 实测），P1 16 块全渲染。
2. **逐拍 token 成本被 budget 钳制**：system 是精简身份，P0-P3 栈按键切片。**堆 prompt 的真实成本在编译期工程维护面**，不在每次 LLM 调用。
3. **同一个故事事实被多个 director 块再表述**：目标 5 处、角色 3 处、写作政策 5 处——「边界污染」在 prompt 层的投影：每个 authoring 模块都写了自己的措辞。

---

## 4. 拍板记录（2026-08-19，五项全定）

| 决策 | 问题 | 结果 |
|---|---|---|
| **D14** 写作五政策 | 收敛为单一 WritingCraft？ | ✅ **文档认领**（`expression/investigation/scene` 三约束），**不合并代码**；Phase 3 再定 5 blocks→1 contract→multiple renderers |
| **D15** 角色三引擎 | 归位同一 Character Intent？ | ✅ **Character Intent 单源契约**（desire/fear/hiddenNeed/transformation）；三引擎=消费者投影；**不删除 transformation**（驱动力→选择→变化方向） |
| **D16** 目标五重奏 | 统一指向 Chapter Intent？ | ✅ **Chapter Intent 四问 = 唯一主干**；其余降级 derived hints；**`priorityGoal` 标记危险** |
| **D17** Seed dump | 降为 canon 摘录器？ | ✅ **Canon Extractor 化**（World/Character/Faction Canon），禁止章节状态混入；`冲突==阻碍` 按三层阻力分层修复 |
| **D18** Beat Slimmer | 400 行需要减法吗？ | ✅ **保留，归类 Execution Guard，不减**——每块对应真实崩溃模式（缺口点名/防重开/状态锚定/上下文收束） |

### 关键区分（D18 拍板的判据）

```
坏：角色害怕什么 → Prompt A 说一次 → Prompt B 说一次 → Prompt C 再解释一次   （语义重复）
好：上一拍留下未解决问题 → 提醒模型处理                                     （执行保护）

Beat Slimmer = Execution Guard Layer（执行保护），不是 Narrative Layer（语义创造）。
判断标准：凡是「同一故事事实被多个载体解释」= 语义重复；凡是「针对上一拍/上一步的运行时提醒」= 执行保护。
```

---

## 5. 收敛方向（用户拍板，2.8/3 的总方向）

```
真实目标（InkOS 收敛方向）：
  Canon → Character Intent → Chapter Intent → Scene Intent
        → Beat Execution → Writer → Truth Gate

而不是：
  20 个模块 → 20 份解释 → Prompt 拼装
```

---

## 6. 明确不做（2.7 边界）

- **不删除任何 director 块**（D14/D15/D16/D17 都是文档认领 + 契约定义，代码不动）。
- **不改逐拍组装器**（D18 保持现状——Execution Guard 是正面资产）。
- **不改 P0-P3 裁剪逻辑**（token budget 机制健康）。
- **不新增 prompt 抽象**（Phase 2 总原则）。
- 唯一代码级待修点 = 种子层 `冲突==阻碍` 重复（低优先，标记，属 D17 后续）。

---

## 7. Phase 2.8 预告（用户建议：State Board 驱动 vs 装饰审计）

> 不要继续扫 Prompt。进入更底层的问题：**哪些状态是真正驱动故事，哪些只是为了让系统「感觉记得很多」**。因为 **Prompt 层重复，很可能只是 State 层膨胀的结果**。

---

## 8. 变更记录

- 2026-08-19 起草 v1：三层 prompt 架构全景 + 语义重叠地图 + 三个真相 + D14-D18 决策点。
- 2026-08-19 v2 通过：D14-D18 全定；WritingCraft / CharacterIntent / ChapterIntent 契约形态；Canon Extractor 化 + 三层阻力分层；Execution Guard 与语义重复的判据；总原则（唯一 owner，多模块只能消费不能重新定义）；收敛方向 pipeline；2.8 预告。
