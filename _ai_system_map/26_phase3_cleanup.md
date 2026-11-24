# 26. Phase 3 Core Reduction — 执行记录

> 来源：Phase 2 收口闸（25_phase2_negative_space.md）→ Phase 3 启动令。
> 本文档是 Phase 3 的唯一执行台账：每刀 = 一个 `✅ CLOSED / ⬜ NEXT` 条目 + 证据 + 遗留项。
> **Phase 3 KPI（拍板定稿）**：不是删多少文件/行/模块，而是「一个故事事实 → 几个 owner？→ 几个中间翻译？→ 几个地方重新解释它？」目标 = **One Story Truth → One Owner → 必要的 Projection → Writer**。

---

## P3.1 Core State Cleanup — ✅ CLOSED（2026-08-19）

### 这一刀证明了什么

> **P3.1 第一次证明 InkOS 可以在不改变故事生成语义的情况下，真正删除一整组持久化概念。**

删除目标全部从 `memoryMutation.added` 中准确消失 —— 这证明：**这些状态不是 Story Truth，也不是生成所必需的中间状态**。

### 删除清单（7 个持久化目标 = 概念级删除）

```
persistence 文件（7 书 + fixture）:
  novel/05_relationship_graph.yaml
  novel/06_knowledge_matrix.yaml
  novel/_system/state_machine.yaml
  novel/_system/brain/decision_history.yaml
  novel/_system/brain/scene_history.yaml
  novel/_system/brain/conflict_history.yaml
  novel/_system/brain/story_health.json   ← 选 B：退役持久化，保留 Author View 实时计算
```

44 个 live 数据文件 + 3 个 golden fixture 文件删除。

### 同时清理的写端/导出端（「从架构删除概念」而非「删三个文件」）

| 位置 | 动作 |
|---|---|
| `memory.js` | 删 `appendDecisionHistory / appendSceneHistory / appendConflictHistory` + historyPath |
| `yaml-store.js` | 删 `patchRelationship / patchKnowledge / appendStateMachine` |
| `post-chapter.js` | 删 3 处 delta 写块 + snapshot 列表 2 文件 + state_machine 拷贝块 + delta 模板 3 字段 |
| `before-write.js` | 删 context 2 条 `add(...)` |
| `chapter-pipeline.js` | 删 2 处 `appendSceneHistory` + `saveStoryHealth`（保留 `computeStoryHealth` → pipeline artifact 不变） |
| `orchestrator.js` | 删 `appendDecisionHistory / appendConflictHistory`（保留 saveChapterPlan） |
| `brain-runtime-legacy.js` | 删 3 个 append import |
| `story-health.js` | 删 `saveStoryHealth / loadStoryHealth`，新增 `computeCurrentHealth`（从 metrics_dashboard + critic_history 实时计算） |
| `git-memory.js` | TRACKED 减 4 字段（3×history + story_health）、NOVEL_TRACKED 减 2 字段（05/06）；**只动这 6 个字段，未碰整个 git-memory** |
| `cli.js / book-stats.js / runtime-reader.js / compatibility.js` | `loadStoryHealth` → `computeCurrentHealth` |
| `ai-serializers.js / serialize.ts / parsers.ts`（3 处） | 动态指针表删 06/05 两行（导出端死指针） |
| `test-decision-conflict-null.js` | 删 history-append 断言，保留 Decision 内容策略回归 |

### 负向删除证明（删前 ↔ 删后，fixture 同源）

| 产物 | 结果 |
|---|---|
| executionPlan | ✅ byte-identical |
| promptFingerprint | ✅ byte-identical |
| pipeline | ✅ byte-identical |
| gateOutputs consistency/critic/metrics/reader/validation | ✅ 5/6 byte-identical |
| memoryMutation.added | ✅ 精确移除 7 条目标，零额外新增 |
| memoryMutation.modified | ✅ 零差异 |

**最强证据**：`memoryMutation.added` 的集合差 = 恰好 7 条 P3.1 目标（3×history + story_health + 3×snapshot 副本）。文件不再被写入 = 概念删除在代码层成立。

### 审计语言升级：Content Contribution Test

> **没有读者 ≠ 没有写者。真正要问的是：它是否贡献故事语义？**

Phase 3 起弃用「零读者」表述，统一用 **Content Contribution Test**（该状态是否贡献故事语义 / 是否被写端持续产出）。
- 05/06 实为「零内容贡献」而非「零读者」：conflict/consistency/decision 等 8 个消费者仍读 `ctx.knowledge/relationships`，但拿到的是空数据（`readYaml(...) ?? {matrix:[]}`）。
- 删除判定不变，但审计语言必须准确。

### 明确保留（有意为之，不是漏删）

- **96 份 `_system/snapshots/ch_*/` 历史副本 + 209 份 `brain/git/snapshots/snap_*/` 备份不动**：属于「历史记录」，不是「未来生产状态」。**停止未来写入，不篡改历史。**
- **`book.js` 的 05/06 路径条目 + loader 防御读**：仍被 8 个消费者读取（World Truth / Conflict 引擎），删除会崩。已从「持久化内容」降为「兼容/防御接口」。空状态槽修剪 = P3.2。
- **`hash-dependency/labels.js` 的 05/06 标签**：休眠映射（collector 读到空槽），无害，随 P3.2 槽位修剪一并处理。
- **dist 编译产物含旧指针文本**：陈旧构建产物，下次 rebuild 更新。

### 回归确认

`test-decision-conflict-null` / `test-memory-unit` / `test-chapter-audit-flow` 全绿。

---

## FOLLOW-UP 登记

### FOLLOW-UP A — Golden Harness Determinism（不属于 P3.1，已从 P3.1 分离）

- **现象**：golden `verify` exit-1 的 5 处漂移 + 1 处 run.json hash + 1 处新增 reader_sim_baseline.json，全部溯源到 `readerSimulator`。
- **根因**：`reader-simulator.js:62` 无 key 才走 heuristic；`.env` 有 key → 发真实 LLM 调用（upstage/solar-pro4）→ 输出非确定。README 声称「无 key 走 degraded」，但本机 key 覆盖。**Golden 本身不是 golden。**
- **因果链**：`reader-simulator → 真实 LLM → reader 输出 → run.json hash`（非 P3.1 引入的行为变化）。
- **处置**：**现在不修**。修 = 扩大 P3.1 范围，收益递减。**要求：以后 baseline 必须强制 degraded / deterministic reader simulator**（无 key，或 `forceHeuristic` 开关）。
- **建议修法**（golden 范围内）：`runChapterReaderSimulator` 增加 `forceHeuristic` 参数，golden harness 构建路径置 true；或 golden 运行前临时清空 config.apiKey。

### FOLLOW-UP B — 05/06/loader 防御接口 + 剩余空状态槽（归属 P3.2）

- `book.js` 路径条目、`loader.js:210-211` 防御读、`hash-dependency/labels.js` 标签映射。
- P3.2 判断：这些空状态槽是否可从 loader 契约中进一步移除。

---

## P3.2 Redundant State Slots — ⬜ NEXT（用户拍板，2026-08-19）

> **P3.2 目标重新定义：不是「继续删字段」，而是「找出同一个 Story Truth 被存储两次、三次、五次的地方」。**
> P3.1 已证明「减法不会伤故事」。P3.2 要开始证明 **「一个故事事实不应该拥有五个名字」**。

### 审计范围（用户指定）

```
A. Character 层重复:
   characterDesire / priorityGoal / push / fear / choice

B. Chapter/Scene 层重复:
   chapterGoal / authorIntent / sceneGoal / priorityGoal

C. Plan 层重复:
   scenePlan / executionPlan

D. 派生链膨胀:
   derive
     ↓
   write back          ← 回写 = 状态污染（D22 铁律：source→derive()→executionPlan，禁回写）
     ↓
   another layer derives again
```

### 审计判据（沿用 Content Contribution Test）

- 每个字段问：**谁是 source of truth？谁只是 projection / render slot？**
- 同一事实多载体 = 重复（D18 判据）；没有独立语义的字段不得因「方便 prompt」而复制（D20 判据）。
- 找到 `source → derived → source mutation → next derivation` 链 = 直接违反 D22 单向数据流铁律，优先标记。
- **这一刀会直接减少 Prompt 重复**（State 减法 → Intent 收敛 → Prompt 自然变薄）。

### 输出

- 重复存储地图（字段 × 载体 × source-of-truth × 消费者 × 是否回写）。
- 每处重复给「唯一 owner + 消费者投影」修法。
- 拍板后再动代码（不预先删）。

---

## Phase 3 进度

```
Phase 3
├── P3.1 Core State Cleanup        ✅ CLOSED
├── P3.2 Redundant State Slots     ⬜ NEXT（一个事实五个名字审计）
├── P3.3 Story Truth Convergence   ⬜
├── P3.4 narrative-runtime surgery ⬜
└── P3.5 Prompt reduction          ⬜
```
