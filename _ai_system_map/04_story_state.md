# 04. StoryState / WorldState（故事状态与世界状态）

> 《系统认知包》第 6 节。基于真实书（2055日常切片）磁盘证据 + 源码写读映射（agent-G/F 交叉验证）。

---

## 6.1 核心判定：InkOS 没有"单一 StoryState 对象"

状态是**分散在文件系统里的多个文件**，分四层。没有内存中的全局状态对象；每章从头由 `loadBrainContext` 重建上下文，写回时经 `MemoryUnit.commit` 分批落盘。

## 6.2 四层状态

### 层 1：章级事实状态（novel/NN_*.md|yaml，canon 库）
| 文件 | 内容 | 写方 | 读方 |
|---|---|---|---|
| `08_current_state.md` | **当前状态表**：当前章节/POV/任务/地点/时间/本章字数/最后更新（**每章覆盖**） | post-chapter `writeText` / Studio `brain-context-sync.js` 直改 | `loader.js` → 上下文 tier1 → **writer prompt** |
| `07_state_board.md` | **世界态势板**：势力/局势/缺口板（**每章覆盖**）——模型感知认知缺口的活通道 | post-chapter `writeText` | `loader.js` → 上下文 tier5 → **writer prompt** |
| `13_facts_db.yaml` | 不可逆事实库（`F001: 第1章完成…（4924字）`，追加） | post-chapter `appendFacts` | `loader.js` → 上下文 |
| `11_timeline.yaml` | 时间线（`days[]: day/time/events/characters_present/chapter`，追加） | post-chapter `appendTimeline` | `loader.js` → 上下文 |
| `12_foreshadow_db.yaml` | 伏笔库（H00X: title/first_seen/status/done） | post-chapter `patchHooks` / 协议渲染器 | `loader.js` + 协议渲染器前缀 |
| `14_resource_db.yaml` | 资源库（by_character.cash 等） | post-chapter `patchResources` | `loader.js` |
| `09_current_chapter.md` | **章任务卡**（POV/目标/阻碍/博弈/高潮/代价/伏笔/结尾，上限300字，**每章覆盖**） | `MemoryUnit.writeNextChapterTask` / Studio `writeModule` | `planner.planChapter`（权威输入） |

### 层 2：章级运行状态（novel/_system/brain/ + states/）
| 文件 | 内容 | 写方 | 读方 |
|---|---|---|---|
| `ch_NNNN_plan.json` | 章 intent（pov/present/chapterIntent/mainGoal/obstacles/turningPoint/ending/bargain/mustGain/mustLose/newForeshadow/location/time/adaptiveWeights/scenes[]）+ decisionResult/conflictResult/replanCount | `saveChapterPlan` | 下一章 anchor 输入、UI |
| `states/ch_NNNN_anchor.yaml` | **跨章锚**（pov/location/current_date/relationship_state/banned_elements/voiceDna/narrative_momentum{closing_emotion/forbidden_openings/tailExcerpt 120字}） | `MemoryUnit.buildChapterAnchor`(:284) | **`loadPriorChapterAnchor` → `applyAnchorConstraints` → 下一章 intent/Scene1 goal** |
| `states/ch_NNNN.json` | 聚合状态 blob（含 nextChapter 回填） | `MemoryUnit` | 仅 living-novel-engine 读取，**不进 prompt** |
| `ch_NNNN_scenes.json` | 场景数组（含每 scene.text 正文中间态） | `persistScenes` | 正文来源、UI |
| `adaptive_state.json` | **自适应权重** `{weights: {actionSceneWeight, conflictPriority, dialogueTarget, hookEmphasis, styleStrictness, sceneCountBias}, history[14条]}` | `adaptive.js saveAdaptiveState` | **`planner loadAdaptiveState` → 下一章 intent 权重** |

### 层 3：Studio 专用状态（novel/_system/）
| 文件 | 内容 | 写方 | 读方 |
|---|---|---|---|
| `world_state.yaml` | **WorldState（Studio 版）**：世界状态快照 | Studio `saveWorldState`/`syncWorldStateFromSimulation` | Studio 提案/UI、story-context-provider |
| `world_simulation.yaml` | 世界模拟结果 | Studio `simulateWorld` | Studio 提案/UI |
| `story_dna.yaml` | Story DNA（title/genre/reader/core_hook/main_question/main_conflict/power_fantasy/ending_direction/commercial_direction/estimated_length/selling_point/theme/audience） | `analyzeStoryDirector` | Studio writer、scene-lifecycle、Wizard |
| `style_dna.yaml` | 文风 DNA | `extractStyleDna` | Studio writer（voice-dna 块） |
| `chapter_plans/chapter_NNNN.yaml` | **authoritative authored plan**（goal/conflict/climax/cost/hook/scenes/emotional_beat/obstacle1/ending/pov/wordTarget/foreshadow/_plan_note） | 协议渲染器 / `persistChapterPlan` | **`loadAuthoredChapterPlan` 优先消费**（>09 任务卡） |
| `character_brains/*.yaml` | 角色脑（goals{surface,hidden}/fears/bottom_line/current_state{trust,fear,betrayal_probability,suspicion,loyalty}/growth_arc/triggers/evolutionLog） | `analyzeCharacterBrain`/living-novel-engine | Studio、story-context-provider |
| `editor_feedback/*.yaml` | AI 编辑反馈（commercial/literary/serial 分数 + problems/suggestions/review_summary） | `runPostChapterEvolution` | UI、story-context-provider |
| `conflict-calibration.yaml` | 冲突校准 | Studio | volume-plan |

### 层 4：运行时执行态（novel/_system/runtime/）
| 文件 | 内容 | 写方 | 读方 |
|---|---|---|---|
| `runtime_state.json` | `{chapter, currentScene, phase, taskId, status, scene, error}` | `daemon._saveState`/`execution-guard` | UI status、resume |
| `locks/ch_NNNN_scene_NN.lock` | ExecutionGuard 场景锁 | execution-guard `lockPath` | 并发防护 |
| `runtime-debug/events.log` | guard 事件日志（709KB） | execution-guard `appendFileSync` | 调试 |

---

## 6.3 StoryState 的读/写不对称（关键事实）

**真实案例（ch_0005，2055 书）**：
- 计划态：`chapter_plans/chapter_0005.yaml`（导演/人工）→ `orchestrator.js:140` 优先采用 → `saveChapterPlan` 转成 `ch_0005_plan.json`（decisionResult.pass=true + conflictResult + replanCount=0）
- 场景态：`ch_0005_scenes.json` 4 个 scene（ch5_s1~s4，status=done，每 scene 内嵌 prompt/directorBrief/executionPlan/text/review）
- 记忆态：`08_current_state.md` 更新「第5章后」、`13_facts_db.yaml` 追加 F006、`11_timeline.yaml` 追加 Day3/Day4、`manifest.json.lastAppliedChapter=5`、snapshots 快照

**写但从不读（从状态角度）**：
1. `context_diff.json` —— 只写不读（`loadContextDiff` 全仓无调用者），磁盘恒为空值 `{isFull:false,...}`
2. `states/ch_NNNN.json` 聚合 blob —— 不被注入下一章 prompt
3. `chapters/index.json` —— 空壳 `[]`，列表由扫描 `chapters/*.md` 推断
4. `_runtime-test/story/state/*` —— 旧版孤儿产物，全仓无引用

## 6.4 WorldState 判断

- **WorldState 的"正式"载体**是 `07_state_board.md`（runtime 维护，进 writer prompt）+ `08_current_state.md`（进 prompt）+ canon 模块（01/04/11/14，进 prompt）。
- **Studio 的 `world_state.yaml`/`world_simulation.yaml`** 是 Studio 轨自己的提案/模拟产物，**不进 Runtime writer prompt 主链**（只在 Studio 自己的 writer/scene-lifecycle/Wizard 中消费）。
- 结论：**世界状态是"双轨并行"**——runtime 轨道管 `07/08/canon`（进 LLM），Studio 轨道管 `world_state.yaml`（提案用），两轨互不同步（除非 story-map 协议层桥接）。

## 6.5 状态一致性机制

- **无事务**：MemoryUnit.commit 顺序写 8 类产物（正文→聚合状态→anchor→memory_hierarchy→canon→09 任务卡→git snapshot/tag），中途失败靠 git 快照回滚（`git-memory.rollback` / `memory-unit.recoverFailedChapter`）。
- **hash 依赖**：Studio 路径有 `_hashDependency`（canon 变了 → mustRecompile 重编译 basePrompt），ch_0005 显示 mustRecompile=true。
- **POV 漂移案例**：`chapter_plans/chapter_0001.yaml` 的 `pov: 吴明远` 与 `ch_0001_plan.json` 的 `intent.pov: 张北` 不一致（正文实际张北视角）—— YAML 权威源与执行 intent 发生漂移，loader 已按角色档过滤 null（对应记忆 `inkos-bad-pov-null-characters`）。
