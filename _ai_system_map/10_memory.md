# 10. Memory 系统

> 《系统认知包》第 19 节。基于 agent-E（memory 审计）+ agent-G（磁盘实证）证据。

---

## 19.1 单一原子写入口：`MemoryUnit.commit`（memory-unit.js:585）

一次 commit 顺序写入 8 类产物：
| # | 产物 | 位置 | 说明 |
|---|---|---|---|
| 1 | 正文 `chapters/*.md` | memory-unit.js:607 | 空稿守卫 `assertCommitableArtifact:96` |
| 2 | 聚合状态 `states/ch_XXXX.json` | :610 | blob 见 :254 |
| 3 | **跨章锚 `states/ch_XXXX_anchor.yaml`** | :613 | `buildChapterAnchor:284` |
| 4 | 记忆层级 `memory_hierarchy.json` | :618 | `updateMemoryHierarchy` |
| 5 | canon 库（facts/timeline/knowledge/relationship/resource/foreshadow） | :632 | `applyStateDiffToCanon`（state-updater.js:49） |
| 6 | 下一章任务卡 `09_current_chapter.md` | :640 | `writeNextChapterTask`（state-updater.js:60） |
| 7 | git snapshot/tag | :646 | git-memory createSnapshot |

**触发路径**：
- 正常：chapter-pipeline.js:302 `MemoryUnit.commit`（CLI/Daemon 全量）
- Studio living：deferCommit 分支 → 写 `pending_commit/ch_N.json` + `writeChapterOnly`（只写正文）→ 作者 `POST /chapters/:n/accept` → `chapter-audit.js:187 acceptChapter` → MemoryUnit.commit + planNextChapter + 解锁下一章

## 19.2 跨章锚（Anchor）结构 —— 跨章记忆的核心

`buildChapterAnchor:284` + `buildNarrativeMomentum:315`：
```
pov / location / current_date
relationship_state            # 关系状态
banned_elements               # 禁元素（如左臂焦毁知觉丧失）
voiceDna                      # 文风 DNA
narrative_momentum:
  closing_emotion             # 结尾情绪（:335）
  forbidden_openings          # 禁开头（:466）
  tailExcerpt                 # 上一章尾 120 字（:331）
```

**读回链**（两条路径都读）：
`orchestrator.js:135-136 loadPriorChapterAnchor` → `planner.js:47` → `planner.js:540-598 applyAnchorConstraints`（closing_emotion/banned/voiceDna/tailExcerpt 打进 intent + Scene1 goal:575-595）。Studio 路径还经 `chapter-director.js:189-191/344-355` 注入章导演块。

## 19.3 记忆层级（memory_hierarchy.json）

- **写入**：`MemoryUnit.commit` `updateMemoryHierarchy`
- **读回**：`formatHierarchyContext`（memory-hierarchy.js:245）**只在 Studio 路径**（compile-writer-prompt.js:150-153，并入 P3）
- **Brain/CLI 路径**：写入但**从不读回**——僵尸产物

## 19.4 Story Memory（story-memory 包）

- `runStoryMemory`（studio-llm-writer.js:274）**仅 Studio** → P3 StoryMemory 块
- 产物：`_system/studio/story-memory/ch_NNNN/scene_*/story_memory.json + rollup.json + dashboard.json`
- Brain/CLI 路径：不接线

## 19.5 Adaptive Learning（自适应学习）

- `index.js:24 runAdaptiveLearning`：收集近 10 章评分 → 趋势 → `budgetWeights + promptLines`（adjustments.js BOOST_RULES: hook/conflict/dialogue/pacing/emotion/style，buildAdaptivePromptBlock:109）
- 接线（仅 Studio）：scene-lifecycle-bridge.js:390（reviewed 后落盘）+ :157-160 applyAdjustmentsToBudget（改 token 预算）+ compile-writer-prompt.js:89/95 读回 → P3 adaptiveBlock
- Brain 路径：不接线，写入状态文件无人消费
- 另有 **adaptive_state.json**（planner 权重）：`adaptive.js saveAdaptiveState`（chapter-pipeline.js:227 经 applyAdaptiveFeedback）→ **`planner loadAdaptiveState` 读取** → 影响下一章 intent（这个两路径都活）

## 19.6 Git Memory / 快照

- `git-memory.js:64/133 createSnapshot`：每章把 adaptive_state/story_health/ch_*_plan/scenes/run + 各 novel 模块拷贝进 `brain/git/snapshots/snap_*/` + refs.json（branches/tags）+ 真实 git commit/tag `inkos-ch-N`
- **读**：`listSnapshots/diffSnapshots/rollback`（← runtime-reader、`memory-unit.recoverFailedChapter` 崩溃恢复）
- 另有 `novel/_system/snapshots/ch_NNNN/*`：post-chapter 快照副本（核心/workflows/post-chapter.js:109-110）

## 19.7 写入但从不读回（Memory 黑名单，agent-E 决定性清单）

1. **`memory_hierarchy.json`（Brain/CLI 路径）** — 两路径都写，只有 Studio 读
2. **`@inkos/story-memory`、`@inkos/story-thread`、`@inkos/adaptive-learning`（Brain 路径）** — 只经 Studio sceneLifecycleHook 接线；非 Studio 运行则状态文件无人读
3. **`decision_history.yaml` / `scene_history.yaml` / `conflict_history.yaml`** — 只追加（memory.js:93/110/129），全仓除 git-memory 快照外零读取方，纯日志
4. **`causeEffect.lastEvent` 跨场景/跨章持久化** — 只写 `scene_NN_beats.json`（compile-writer-prompt.js:250），无读取方
5. **`states/ch_NNNN.json` 聚合 blob** — 只被 living-novel-engine 读取，不进下一章 prompt
6. **`critic_history.json` / `metrics_dashboard.json`** — 只被 computeStoryHealth 消费，不直接进 LLM prompt
7. **`brain/ch_NNNN_run.json`、每场景 beats 日志** — IDE 展示用
8. **`context_diff.json`（prompt-cache 下）** — 只写不读，磁盘恒为空值

## 19.8 上一章 → 下一章的精确记忆追踪

| 源 | 谁读 | 注入哪里 |
|---|---|---|
| `states/ch_N_anchor.yaml` | orchestrator:135 → planner:47/540-598 | intent.priorAnchor → P0 voiceDna + P1 Scene1 goal + openingConstraint + banned |
| canon 五库 + state_board + bible | loader.js:190-268 | ctx → compileScenePrompt → P2 Lore（两路径都有） |
| 本章前文（同章场景 1..k） | compileScenePrompt（prev summaries）/ collectPriorScenesText | 续写/防复读 |
| `memory_hierarchy.json` | compile-writer-prompt.js:150-153（**仅 Studio**） | P3 hierarchy 块 |
| `story_memory` | runStoryMemory（studio-llm-writer.js:274，**仅 Studio**） | P3 StoryMemory 块 |
| adaptive hints/overrides | compile-writer-prompt.js:88-89（**仅 Studio**） | P3 adaptiveBlock |
| `states/ch_N.json` 聚合 blob | 仅 living-novel-engine（living-novel-engine.js:82） | 不做 prompt 注入 |

## 19.9 一句话

**Studio 主路径把记忆全链路激活（anchor + canon + hierarchy + story-memory + adaptive + causeEffect）**；CLI/Brain 路径只剩 anchor + canon + 场景内续写三样在工作，其余记忆产物写而不读。
