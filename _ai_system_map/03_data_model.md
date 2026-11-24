# 03. Story / Novel 数据模型

> 《系统认知包》第 5 节。基于 v4 书模板（`.inkos/templates/book-v4/`）与真实生成书（`books/我的小说/books/2055日常切片/`）的磁盘实证。
> 存储形态 = **文件系统**（markdown + yaml + json），无数据库。所有路径相对书目录 `<book-dir>/`。

---

## 3.1 书级骨架

| 文件 | 说明 | 谁创建 | 谁读 | 谁写 |
|---|---|---|---|---|
| `book.json` | id/title/genre(`tomato`)/platform/language/status/`schemaVersion:4`/`brainEnabled`/`targetChapters`/`chapterWordCount`/createdAt/updatedAt | `initBookV4`（`inkos-core/src/workflows/init.js`）/ Studio BookWizard | loader、Studio | Studio（改 status） |
| `chapters/index.json` | 章节索引 | runtime `saveChapterFile` | Studio 列表 | runtime |
| `chapters/NNNN_章名.md` | 章节正文（Markdown） | runtime `saveChapterFile` / Studio `chapter-service.js` 直写 | 读者/Studio/下一章？ | 两者 |
| `novel/_system/manifest.json` | `lastAppliedChapter`/`currentDay`/`currentVolume`/`brain.enabled`/`updatedAt` | post-chapter / MemoryUnit.commit | loader、Studio | runtime |
| `novel/_system/refs.json` | 模块路径映射（01→novel/01_world_bible.md…） | init | loader `getBookPaths` | 只读 |

## 3.2 canon 模块（novel/NN_*.md|yaml）—— 作者/世界设定库

| 编号 | 文件 | 内容 | 谁写 | 谁读 | 生命周期 |
|---|---|---|---|---|---|
| 01 | `01_world_bible.md` | 世界设定（时代/历史/规则/力量体系…） | Studio `writeModule` | loader → 上下文（tier4） | 持久，长期 |
| 02 | `02_writing_bible.md` | 写作圣经（叙事/文风/pov/taboo…） | Studio `writeModule` | loader → 上下文（tier3） | 持久，长期 |
| 03 | `03_character_bible/*.md` | 每角色一档（含顶部"当前状态快照"块、`entrance_chapter`） | Studio `writeModule`/`creator-loop` | loader → 上下文（tier2，按 POV/出场筛选） | 持久，随章更新 |
| 04 | `04_faction_bible/*.md` | 势力档 | Studio | loader → 上下文（tier4） | 持久 |
| 07 | `07_state_board.md` | 世界状态板（势力/局势/缺口板）——**缺口感知的活通道** | post-chapter `writeText` | loader → 上下文（tier5） | 每章覆盖 |
| 08 | `08_current_state.md` | 当前状态（时间/地点/角色/局势表） | post-chapter / brain-context-sync | loader → 上下文（tier1） | 每章覆盖 |
| 09 | `09_current_chapter.md` | **章任务卡**（POV/目标/阻碍/博弈/高潮/代价/伏笔/结尾，上限300字） | MemoryUnit `writeNextChapterTask` / Studio `writeModule` | planner `planChapter`（权威输入之一） | 每章覆盖 |
| 10 | `10_volume_outline/vol_01.md` | 卷纲（章事件种子；多卷 → vol_NN.md + `volume_tones.yaml`） | Studio `volume-plan.js` | 协议渲染器/planner | 持久，卷级 |
| 11 | `11_timeline.yaml` | 时间线（day/time/events/characters_present） | post-chapter `appendTimeline` | loader → 上下文（tier5） | 持久，追加 |
| 12 | `12_foreshadow_db.yaml` | 伏笔库（H00X：title/first_seen/status/done） | post-chapter `patchHooks` / 协议渲染器追加 | loader（史称"只写不读"，协议层开始读） | 持久 |
| 13 | `13_facts_db.yaml` | 不可逆事实库 | post-chapter `appendFacts` | loader → 上下文（tier1） | 持久，追加 |
| 14 | `14_resource_db.yaml` | 资源库（by_character.cash 等） | post-chapter `patchResources` | loader | 持久 |
| 15 | `15_npc_simulation.yaml` | NPC 模拟计划 | `inkos npc` / post-chapter | 手动 | 持久 |
| 16 | `16_chapter_review/*.yaml` | 章评审（9 维分数） | core `runChapterReview` | UI | 持久 |

## 3.3 运行时产物（novel/_system/brain/）—— 每章生成的核心数据

| 文件 | 内容 | 写 | 读 |
|---|---|---|---|
| `ch_XXXX_plan.json` | 章节 intent（mainGoal/chapterIntent/pov/scenes[]/ending…）+ authored 覆盖 | orchestrator `saveChapterPlan` | 下一章 anchor、UI plan 视图 |
| `ch_XXXX_run.json` | 本章运行记录（pipeline 结果/pass/awaiting） | `saveBrainRun` | UI run 视图、resume 断点 |
| `ch_XXXX_scenes.json` | 场景数组（每 scene：index/title/goal/conflict/beat/status/**text**） | orchestrator/studio-orchestrator `persistScenes` | 正文来源之一、UI scenes 视图 |
| `adaptive_state.json` | 自适应权重（planner 权重） | `adaptive.js`/`adaptive-planner.js` | **planner `loadAdaptiveState` 读取** → 影响下一章 intent |
| `critic_history.json` / `metrics_dashboard.json` | 商业评分/指标 | chapter-pipeline | 仅 UI |
| `prompt-cache/ch_XXXX/` | 每次场景 prompt 缓存（`prompts/*.txt`、`cache_validator.json`、`context_diff.json`、`prompt_metrics.json`、`relevance_stats.json`、`scene_summary.json`） | prompt 层 | 读回（compiler 缓存命中）；`context_diff.json` **只写不读**；真实书只保留最后一章 |
| `git/`（snapshots/snap_* + refs.json） | 章级 git 快照 | `git-memory.createSnapshot` | `rollback`/`diff`/`list` |
| `states/ch_XXXX.json` | 章级状态（若存在） | MemoryUnit | 回滚用 |
| `locks/ch_XXXX_scene_NN.lock`（在 `_system/runtime/locks/`） | ExecutionGuard 场景锁 | execution-guard | 并发防护 |

## 3.4 其它 _system/ 产物

| 路径 | 内容 | 写 | 读 |
|---|---|---|---|
| `chapter_plans/chapter_NNNN.yaml` | **authoritative authored plan**（goal/conflict/climax/cost/hook/ending/scenes/pov/wordTarget/foreshadow/_plan_note） | 协议渲染器（`_tools/generate-chapter-plan.mjs`）/ Studio `persistChapterPlan` | **planner `loadAuthoredChapterPlan` 优先消费** |
| `story_dna.yaml` | 故事 DNA（作者意图压缩） | Studio `creator-intelligence.analyzeStoryDirector` | Studio writer / scene-lifecycle / planner |
| `style_dna.yaml` | 文风 DNA（可注入 writer） | Studio `extractStyleDna` | Studio writer |
| `world_state.yaml` / `world_simulation.yaml` | 世界状态/模拟 | Studio `simulateWorld` | Studio 提案/UI |
| `conflict-calibration.yaml` | 冲突校准 | Studio | volume-plan |
| `editor_feedback/*.yaml` | AI 编辑反馈（评分+建议） | Studio `runPostChapterEvolution` | UI |
| `character_brains/*.yaml` | 角色脑状态 | Studio `analyzeCharacterBrain` | Studio / UI |
| `studio/`（writer-optimization/ch_XXXX/、prompt-metrics/、director/、story-memory/、hash-dependency/） | Studio 专属产物 | Studio writer | 仅 Studio 相关功能 |
| `runtime/`（runtime_state.json、runtime-debug/events.log、locks/） | daemon/guard 运行态 | runtime | UI status/debug |
| `snapshots/`（novel/_system/snapshots/ch_XXXX/） | 章后快照副本（post-chapter snapshot） | `applyPostChapter` | 存档 |

## 3.5 核心领域对象映射

| 概念 | 落盘形态 | 谁创建 | 谁消费（影响生成） |
|---|---|---|---|
| **World** | `01_world_bible.md` + `07_state_board.md` | Studio / post-chapter | loader → 上下文 |
| **Character** | `03_character_bible/*.md`（含顶部状态快照块） | Studio / creator-loop | loader（按 POV 筛选） |
| **Faction** | `04_faction_bible/*.md` | Studio | loader |
| **Timeline** | `11_timeline.yaml` | post-chapter | loader |
| **Facts** | `13_facts_db.yaml` | post-chapter | loader |
| **Foreshadowing** | `12_foreshadow_db.yaml` | post-chapter / 协议渲染器 | loader + 协议渲染器 |
| **ChapterTask** | `09_current_chapter.md` | MemoryUnit | planner（**权威输入**） |
| **ChapterIntent** | `ch_XXXX_plan.json` / `chapter_plans/chapter_NNNN.yaml` | planner / 渲染器 | buildScenePlan / 下一章 anchor |
| **Scene** | `ch_XXXX_scenes.json`（+ `_system/brain` scenes） | buildScenePlan | writer |
| **Beat** | Studio 路径：ExecutionPlan.beats（内存态，随 plan 重建）；`novel/_system/studio/writer-optimization/ch_XXXX/scene_XX_beats.json` | `buildSceneExecutionPlan` | Studio writer 逐 beat 执行 |
| **StoryState/WorldState** | `08_current_state.md` + `07_state_board.md` + `adaptive_state.json` | MemoryUnit/post-chapter | planner + 上下文 |
| **Gap（认知缺口）** | `story-map/cognitive-gaps.yaml`（open/touched/resolved/cut） | Studio story-map store | 协议渲染器 → 前缀进 writer prompt |
| **StoryMap** | `story-map/main-arc.yaml`/`pov-grid.yaml`/`milestones.yaml`/`plot-threads.yaml`/`chapter-functions.yaml` | Studio | `applyStoryMapToIntent` → intent |
| **Reader 体验** | `critic_history.json` / `metrics_dashboard.json` / 实时 health（`computeStoryHealth` 现算，不落盘） | chapter-pipeline | 仅 UI（不回读生成） |

## 3.6 数据流关键事实

1. **plan 是"章级权威输入"**：`chapter_plans/chapter_NNNN.yaml`（authored）> `09_current_chapter.md`（任务卡）> planner 派生。记忆笔记确认：**权威源是 chapter_plans 不是任务卡 md**。
2. **08/07/09 是"每章覆盖"型文件**，其余是"追加"型（facts/timeline/relationships/knowledge/hooks）。
3. **写入路径分三拨**：runtime（plan/run/scenes/canon 章后更新/快照）、Studio（chapter_plans/story_dna/world_state/editor_feedback/character_brains/chapters.md/09 任务卡）、协议渲染器（chapter_plans/_plan_note）。三者都能写 `chapter_plans/` —— 存在写冲突风险（见 `14_architecture_problems.md`）。
4. **正文有两个权威落盘点**：`chapters/NNNN_*.md`（最终章节）+ `ch_XXXX_scenes.json`（场景对象含 text，中间态）。

---
> ✅ agent-G 已返回真实书磁盘证据；「实际生产文件清单」见 `11_real_execution_trace.md`，「写但未读字段」见 `10_memory.md` §19.7。
