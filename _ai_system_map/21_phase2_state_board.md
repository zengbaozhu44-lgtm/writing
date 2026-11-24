# 21. Phase 2.6 — State Board 分层契约（Story Truth vs Scene Memory）

> 日期：2026-08-19 ｜ 状态：**✅ 已通过（用户拍板）** ｜ 性质：契约文档（先文档后代码）
> **⚠️ 用户警告（本步风险最高）**：**删除状态字段 ≠ 减少复杂度。** 真正目标 = 区分「影响未来故事的事实」（Story Truth，长期）与「只是当前镜头需要的信息」（Scene Memory，临时）。否则会把 **Runtime 已经建立好的连续性能力**一起削掉。

---

## 0. 一句话定位

> 2.6 不做删除。2.6 做**分层 + 收敛所有权**：给每一个状态字段贴上它真正的生命周期标签，把「谁写 / 谁读 / 谁持久化」收口，并显式保护 Runtime 已建立的连续性主干。
> **总原则（用户拍板新增）**：**状态不是系统拥有的信息总量，而是未来故事分叉所依赖的最小事实集合。**

---

## 1. 分界线判据（本契约的核心问题）

一个状态字段，问三个问题：

```
1. 它影响未来故事吗？      → Story Truth（长期持久化）
2. 它只在当前镜头/场景有意义吗？ → Scene Memory（场景内会话，跨章即失效）
3. 它不回答「发生了什么」，而是回答「怎么继续写」？
                            → Writing Identity / 连续性保护（各自正交，非故事状态）
```

| 判据 | 归类 | 生命周期 |
|---|---|---|
| 影响未来故事的事实（关系/秘密/重大事件/阵营/资源/世界指标） | **Story Truth** | 跨章持久化 |
| 当前镜头需要的信息（手里的刀/房间位置/刚说的话/当前情绪/当前 POV 任务） | **Scene Memory** | 场景生命周期内有效 |
| 「禁止做什么 / 上一章动量」约束 | **连续性保护** | 跨章（有 expiresAtChapter 可过期） |
| POV / 写作风格（怎么写） | **Writing Identity** | 与「发生了什么」正交 |
| 写作权重 / 运行审计 | **正交层** | 与故事状态无关 |

> **不能犯的错**：把「连续性保护」当 Scene Memory 删掉——banned_elements / narrative_momentum / 跨章时间地点正是 Runtime 已建立的连续性能力。

---

## 2. 状态分层模型（用户拍板的最小状态模型）

> **不要把所有状态都叫「Story State」**——那是把职责不同的东西压扁成一个词。正确拆分：

```
Story Truth
├── Continuity Anchors          ← 影响未来故事的事实
│    ├── relationship            （anchor.relationship_state）
│    ├── facts                   （13_facts_db F013 型）
│    └── irreversible events     （11_timeline / 12_foreshadow）
│
├── Writing Identity             ← 怎么写，不是发生了什么
│    ├── POV
│    └── voiceDna                ⚠️ 不进 Runtime 状态
│
└── Scene Memory                 ← 只在当前镜头有意义
     ├── temporary objects
     ├── local emotions
     └── current positioning

                     ┌──────────────────────────┐
                     │        Story Truth        │
                     └────────────┬─────────────┘
                                  │
                     ┌────────────┴─────────────┐
                     │                          │
              Continuity                   Situation
                     │                          │
           Anchors / Facts             Scene Runtime
                     │                          │
                     └────────────┬─────────────┘
                                  │
                          Scene Memory
                                  │
                          Writer Context
```

**关键结论（用户拍板）**：
- **voiceDna 不进入 Runtime 状态**——它影响「怎么写」，不是「发生了什么」。属 Writing Identity，只做写作约束，不做故事推理输入。
- **真实生产链路已经成立**：`Story Event → Anchor → Continuity`，不要再造第二关系系统。

---

## 3. 现状全景（调查结果：六个状态源 → 五个正交层）

调查对象：`books/我的小说/books/赛博修仙我靠玩家暴打克苏鲁旧日神/`（生产书，16 章）。

### 层 A：连续性主干（Story Truth 载体 —— 绝不能动）

| 源 | 内容 | 消费者 | 证据 |
|---|---|---|---|
| `states/ch_*_anchor.yaml` | 跨章记忆锚点 | memory-hierarchy L1（.js:62-74）、continuation-engine、compile-writer-prompt | L1: anchors/voiceDna/bans/entities |
| `13_facts_db.yaml` | 世界事实 | `deriveBodyStateFromFacts`（beat-continuity.js:524-680）→ F013 身体连续性硬执行 | :680 左臂禁令进 writer |
| `11_timeline.yaml` | 时间线 | 记忆/审计 | day1-12 事件 |
| `12_foreshadow_db.yaml` | 伏笔 hooks | （memory：只写不读，活通道=局势块） | first_seen/status |
| `_system/world_state.yaml` | 世界指标 | living-novel-engine / system-store / memory-unit | ai_control 等 |

**memory-hierarchy L1-L4（Runtime 已建立的连续性能力）**：L1=anchor+voiceDna+bans（coreFacts）、L2=近5章摘要、L3=关键 scenes、L4=实体日志、每5章压缩。**全部由 anchors + 章文本派生。**

### 层 B：场景状态（Scene Memory）

| 源 | 内容 | 现状 | 证据 |
|---|---|---|---|
| `_system/state_machine.yaml` | situation→goal→conflict→decision→action→consequence→new_situation 循环 | **空**（无人写） | 设计上就是场景循环 |
| `novel/08_current_state.md` | 章/POV/任务/地点/时间/字数 | 薄表 | state-updater.patchCurrentStateTime 手术式更新 |
| **situation-engine `ep.situation`** | Studio 真正的「局势」块（三维 before→after） | 每 scene 生成 | prompt-compiler.js:199 `formatSituationBlock(ep.situation)`；buildSceneSituation 从 scene plan 推断 |

### 层 C：写作调参 / Writing Identity（与故事状态正交）

| 源 | 内容 | 消费者 | 证据 |
|---|---|---|---|
| `_system/brain/adaptive_state.json` | 权重（actionSceneWeight/conflictPriority/…）+ 无界 history | adaptive.js `applyWeightsToIntent`、reader.js | :19-31 loadAdaptiveAdjustments |
| anchor 内 `voiceDna` | 写作风格 DNA（**不进 Runtime 状态**） | memory-hierarchy L1 | :121-139 resolveVoiceDna |

### 层 D：运行/审计记录（与故事状态正交）

| 源 | 内容 |
|---|---|
| `brain/ch_*_run.json` / `ch_*_plan.json` / `ch_*_scenes.json` | pass/metrics/reader/critic/validation |
| `_system/runtime_state.json` | guard 状态 |
| `_system/state_machine.yaml` history | （空） |

### 层 E：CLI legacy / 空转 / 文档失真

| 源 | 现状 | 证据 |
|---|---|---|
| `07_state_board.md` | **Studio 零写零读**（写端全在 inkos-core CLI：post-chapter.js:46/before-write/npc-simulation/chapter-review）；cognitive-gaps 文档声称「prompt-compiler 注入局势」只对 CLI 编译器成立（inkos-prompt/compiler.js:355），**Studio 密封层局势来自 situation-engine，不是 07** | 生产书 07 是空模板；Studio prompt-compiler.js 无 state_board |
| `05_relationship_graph.yaml` | **空**（`edges: []`），但 anchor 有活关系数据 | anchor ch_0005 relationship_state.edges 丰富 |
| `06_knowledge_matrix.yaml` | **空**（`matrix: []`），但 cognitive-gaps source 引用 `km_00X`（行不存在） | 二手书店 cognitive-gaps source: km_001 |
| `_system/story-map/cognitive-gaps.yaml` | 仅《二手书店》存在；作者侧缺口账本 | 维持未知感 |

---

## 4. 连续性能力保护清单（2.6 绝不动）

以下三条是 Studio 生产路径真正依赖的连续性通道，**2.6 只保护、不触碰**：

1. **memory-hierarchy L1-L4**（anchors + 章文本派生）——跨章记忆主干。
2. **`deriveBodyStateFromFacts`**（beat-continuity.js）——facts_db → 身体状态硬执行（F013 左臂禁令是真实故事约束）。
3. **situation-engine 三维局势**（world/character/relationship 的 before→after，每 Scene 至少改两维）——Studio 的「局势」= 状态变化陈述，与 2.5 Beat Contract 的 change 第一原则同构。

> 这三条的共同点：**它们都是「状态变化」而不是「状态快照」**——这正是 Runtime 已建立的连续性能力，也正是 2.6 要防被削的对象。

---

## 5. 所有权收敛表（2.6 真正的「减肥」：收口，不是删除）

| 字段 | 谁写（现状） | 谁读（现状） | 谁持久化 | 收敛动作（已拍板） |
|---|---|---|---|---|
| anchors | brain/memory（accept 时） | memory-hierarchy / continuation-engine | ✅ 跨章 | **维持**（D10） |
| facts_db F013 型 | brain（定稿确立） | beat-continuity | ✅ | **维持**（D10） |
| situation 局势 | situation-engine（scene 级派生） | prompt-compiler:199 | 场景内 | **维持**；不落盘到 07（D11） |
| 08_current_state 时间/地点 | state-updater.patchCurrentStateTime | loader.js:199 | ✅ 跨章 | **维持**（D10） |
| voiceDna | 作者/系统 | memory-hierarchy L1（写作约束） | anchor 内 | **不进 Runtime 状态**（D10） |
| adaptive history | adaptive.js 每次追加 | 无（仅调试） | 无界 | **窗口化**，定位运行指标（D12） |
| 07_state_board | inkos-core（CLI only） | inkos-prompt/compiler.js:355（CLI only） | ❌ Studio 死文件 | **CLI legacy contract**，不恢复写端（D11） |
| 05 relationship_graph | **无人写** | 无人读 | ❌ 空转 | **Reserved Schema**，Authority=Anchor（D13） |
| 06 knowledge_matrix | **无人写** | 无人读（cognitive-gaps 引用） | ❌ 空转 | **Reserved Schema**，Authority=Anchor/Facts（D13） |
| state_machine | **无人写** | 无人读 | ❌ 空转 | 标注预留，不补写（D13） |

---

## 6. 拍板记录（2026-08-19，四项全定）

| 决策 | 问题 | 结果 |
|---|---|---|
| **D10** anchors 分层 | relationship_state/pov/时间=Story Truth，banned_elements/narrative_momentum=连续性保护，voiceDna=Writing Identity | ✅ **确认，维持现状，不扩张**；voiceDna 不进 Runtime 状态 |
| **D11** 07_state_board 命运 | Studio 局势=situation-engine，07 是否恢复写端？ | ✅ **降级 CLI-only 文档契约，不改代码**；不恢复 Studio 写端、不建 situation→state_board 同步层（避免第二事实源） |
| **D12** adaptive history | 无界增长如何收口？ | ✅ **窗口化**（keepLast: N / rolling window），定位 **Runtime adaptive telemetry**（系统调参历史），非 Story Memory；禁止 history→story reasoning |
| **D13** canon 空转 | 05/06/state_machine 空，恢复所有权？ | ✅ **承认 anchor 是当前事实源，不恢复伪写端**；05/06 标记 **Reserved Schema**（Current Authority: Anchor/Facts DB），不是「未来自动维护」 |

### 关键原则（用户拍板，约束后续）

1. **不要为了让架构图漂亮，制造第二个事实源。** Studio 已有事实源（situation-engine + continuity pipeline），保持单一。
2. **不要恢复 relationship_graph / knowledge_matrix 写端**——否则等于增加第二关系系统（`chapter output → relationship_graph`）。真实链路 `Story Event → Anchor → Continuity` 已经工作。
3. **状态 = 未来故事分叉所依赖的最小事实集合**——不是系统拥有的信息总量。

---

## 7. 明确不做（2.6 边界）

- **不删除任何状态字段**（用户警告：删除≠减复杂度）。
- **不改 anchors 结构**（relationship_state/banned_elements/narrative_momentum/voiceDna 全保留）。
- **不动 memory-hierarchy L1-L4 / deriveBodyStateFromFacts / situation-engine**（连续性保护清单 §4）。
- **不恢复 07_state_board 写端、不建 situation→07 同步层、不补 relationship_graph/knowledge_matrix 写端**。
- **不新增状态抽象**（Phase 2 总原则：先恢复职责边界）。

---

## 8. Phase 2.7 预告（用户建议：Prompt Compiler 减法审计）

> 前面所有语义（Chapter Intent / Recovery / Beat / State）最终都会在 **Prompt Compiler** 汇合。剩余复杂度最可能不在 State，而在「为了让模型理解故事而堆进去的 Prompt 层」。下一步建议不拆代码，先做 Prompt Compiler 减法审计。

---

## 9. 变更记录

- 2026-08-19 起草 v1：现状调查（六个状态源 → 五个正交层）+ 分界线判据 + 连续性保护清单 + 打标签 + 所有权收敛表 + D10-D13 决策点。
- 2026-08-19 v2 通过：D10-D13 全定；新增状态分层模型（Story Truth → Continuity Anchors / Writing Identity / Scene Memory）；总原则（状态=未来故事分叉的最小事实集合）；07=CLI legacy contract、05/06=Reserved Schema；adaptive=Runtime telemetry；2.7 预告（Prompt Compiler 减法审计）。
