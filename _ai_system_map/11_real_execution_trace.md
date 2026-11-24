# 11. 真实执行 Trace + 小说生成完整生命周期 + 实际数据流

> 《系统认知包》第 4（真实版）、20、21 节。基于真实书 `2055日常切片`（5 章完成）的磁盘证据（agent-G）+ 源码调用图（agent-A/F）。
>
> ⚠️ P3.1 退役持久化对账（2026-08-20，B1-F）：§20.1/20.2 为 P3.1 退役**前**的真实执行 trace（历史事实保留，行内标「P3.1 前行为」）；§20.3 数据流图与 §20.4 已同步当前架构（05/06 写端、3×_history、story_health 均已退役）。

---

## 20.1 一个真实章节的完整生成链路（ch_0005，Studio 生产路径）

```
① 计划：chapter_plans/chapter_0005.yaml（导演/人工 YAML，goal/conflict/climax/cost/hook/scenes/emotional_beat/obstacle1/ending/pov/updatedAt）
  → orchestrator.js:140 优先采用 authored plan
  → serializeAuthoredPlanToIntent → 转成 brain/ch_0005_plan.json
      （intent: pov/present/chapterIntent/mainGoal/obstacles/turningPoint/ending/bargain/mustGain/mustLose/newForeshadow/location/time/adaptiveWeights/scenes[]）
      （decisionResult.pass=true + conflictResult + replanCount=0 —— authored plan 免检）
② 场景编排：buildScenePlan + [Studio] buildSceneExecutionPlan
  → brain/ch_0005_scenes.json 4 个 scene（ch5_s1~s4，status=done）
      每个 scene 内嵌：prompt(9419字符) / directorBrief(3705字符执行单) / executionPlan(5 beat) /
                      _chapterDirector / _hashDependency(mustRecompile=true) / text(867字符) / review(non-blocking)
③ Prompt 编译缓存（compiler.js compileScenePrompt 每次调用）：
  validateCache → cache_validator.json（world/writing/facts/relationship/resource/knowledge/character 林晓/3×faction 的 hash）
  loadContextSnapshot→saveContextSnapshot→saveContextDiff → context_snapshot.json + 只写不读的 context_diff.json
  getCachedModule → cache/{world,writing}.{content,hash}
  saveCompiledPromptCache → prompt-cache/ch_0005/prompts/{5个hash}.txt（4 scene + 1 重编译变体）
  recordPromptMetrics → prompt_metrics.json（每 scene tokens/budget/cache_hit/ranking）
  recordContextUsage → relevance_stats.json（facts 计数 + modules 使用计数）
④ 正文：studio-orchestrator.js:56 saveChapterFile 用 resolveChapterSuspenseTitle 解析悬念标题
  → chapters/0005_当人工智能接管了大部分工作与决策….md
      （注意 ch_0001~0003 文件名是 mainGoal.slice(0,8) 风格 → 旧 orchestrator.js:589 写的；
       说明这本书跨过两代 writer 世代）
⑤ 评审与状态：chapter-pipeline.js
  computeMetrics → metrics_dashboard.json 追加
  reader/critic → critic_history.json 追加（critic overall=79 "可上架连载"）
  applyAdaptiveFeedback → adaptive_state.json（weights+history 14条）
  computeStoryHealth+saveStoryHealth → story_health.json（history 累积 5 条）——P3.1 前行为：saveStoryHealth 写端已退役，现 health 实时计算不落盘
  appendSceneHistory → scene_history.yaml——P3.1 前行为：已退役
  saveBrainRun → ch_0005_run.json
⑥ 记忆落地：
  novel/08_current_state.md 更新「第5章后」
  novel/13_facts_db.yaml 追加 F006（第5章完成，4112字）
  novel/11_timeline.yaml 追加 Day3/Day4
  manifest.json.lastAppliedChapter=5
  novel/_system/snapshots/ch_0005/* 与 brain/git/snapshots/snap_1783931132090_b6afec/* 快照
⑦ 运行时状态：
  runtime/runtime_state.json → {chapter:5, phase:"completed", taskId:"task_...", status:"done", scene:1}
  4 个 scene 锁留在 runtime/locks/
```

## 20.2 磁盘时间线（mtime 证据）

- `novel/08_current_state.md`、`11_timeline.yaml`、`12_foreshadow_db.yaml`、`13_facts_db.yaml`、`09_current_chapter.md` 均在 7/13 更新（说明是最近一次运行更新）
- prompt-cache 只保留 ch_0005（旧章用旧编译器，无缓存）
- `ch_0006_plan.json` 存在但 `intent.scenes=[]`、无 scenes/run/md —— 符合"计划下一章但未写作"

## 20.3 真实数据流图（写入→读取 映射）

```
写盘方                             文件                            读方（影响生成）
────────                         ────                            ──────────
planner/渲染器  → chapter_plans/chapter_NNNN.yaml  → orchestrator.js:140（优先）
MemoryUnit       → 09_current_chapter.md           → planner.planChapter（权威输入）
post-chapter     → 08_current_state.md              → loader → compileScenePrompt → writer
post-chapter     → 07_state_board.md                → loader → compileScenePrompt → writer
post-chapter     → 13_facts_db.yaml                 → loader → compileScenePrompt
post-chapter     → 11_timeline.yaml                 → loader → compileScenePrompt
post-chapter     → 12/14 库（05/06 写端 P3.1 退役）       → loader / compiler
MemoryUnit       → states/ch_N_anchor.yaml          → loadPriorChapterAnchor → applyAnchorConstraints → intent
adaptive.js      → adaptive_state.json              → planner.loadAdaptiveState（权重）
compiler         → prompt-cache/ch_*/prompts/*.txt  → compiler 缓存命中（同场景）
Studio writer    → _system/studio/continuity.json   → studio-llm-writer loadChapterContinuity
scene-lifecycle  → _system/studio/story-memory/     → studio-llm-writer P3 块
scene-lifecycle  → _system/studio/adaptive-learning/→ compile-writer-prompt P3 adaptiveBlock
────────────────────────────────────────────────────────────────────────────
只写不读（审计/UI，当前）：context_diff / critic_history / metrics_dashboard / run.json / beats 日志 / index.json
只写不读（P3.1 已退役）：decision_history / scene_history / conflict_history / story_health
```

## 20.4 关键不对称（数据流角度）

1. **正文双落点**：`chapters/*.md`（最终）+ `ch_XXXX_scenes.json` 的 scene.text（中间态）。Studio 的 `persistScenes` 写后者，`saveChapterFile` 写前者。
2. **canon 库追加型 vs 覆盖型**：facts/timeline/hooks 追加；relationships/knowledge 追加（写端 P3.1 退役）；08/07/09 每章覆盖。
3. **chapter_plans 三方可写**（协议渲染器 / Studio persistChapterPlan / 人工）→ 写冲突风险。
4. **prompt-cache 只留最新章** → 旧章回补缺缓存。

---

## 21.1 小说生成完整生命周期（从建书到第 N 章）

```
阶段 0 建书      Studio BookWizard → book.json（schemaVersion:4）+ novel/ 模板树 + refs.json + manifest.json
阶段 1 设定      世界生成/人物/势力/卷纲（Studio ai-service generateModule 直调 LLM 写 canon；volume-plan 指纹）
阶段 2 故事DNA   analyzeStoryDirector → story_dna.yaml；extractStyleDna → style_dna.yaml；presets fallback
阶段 3 故事地图  story-map/store.js → main-arc/pov-grid/milestones/plot-threads/cognitive-gaps.yaml
阶段 4 章计划    协议渲染器/_tools/generate-chapter-plan.mjs 或 Studio designChapterDirector
                → chapter_plans/chapter_NNNN.yaml（白名单字段，前缀编码 IRP）
阶段 5 执行      作者点生成 → runtime-control → daemon.runChapter → StudioRuntimeOrchestrator._runChapter
                （authored plan 短路 → 逐 scene 写作 → non-blocking scene pipeline → persistScenes → assembleChapter）
阶段 6 章后      runChapterPipeline（deferCommit=true）→ consistency/metrics/reader/critic/dedup/validation/
                reader-simulator/optimizer/adaptive/storyHealth → pending_commit + writeChapterOnly
阶段 7 审计      作者 IDE 查看预览 → POST /chapters/:n/accept → MemoryUnit.commit（anchor/state/git/canon/09）
                + planNextChapter + 解锁下一章 → 循环回阶段 4
```

## 21.2 CLI 路径生命周期（无 Studio）

```
inkos runtime run <book> --chapter N
  → RuntimeOrchestrator._runChapter（无 sceneLifecycleHook）
  → planChapter/evaluateDecisions/evaluateConflict（无 authored plan 时）
  → 逐 scene：brain createLlmWriter（单次 LLM）→ runScenePipeline（软分析，可 replan）
  → runChapterPipeline（正常分支）→ MemoryUnit.commit（全量）+ planNextChapter + autoNext
```

## 21.3 Daemon 路径

`inkos runtime daemon <book>` → 独立进程 → `daemon.js:71-73 watchScenePrompts/watchSceneArtifacts` 文件监听 → prompt 落盘自动 resume + `config.runtime.autoNextChapter` 自动续写。**execution-guard `applyDaemonExecutionGuard` 禁用自动重试**（失败即停）。

## 21.4 生命周期中的"作者介入点"

| 介入点 | 机制 | 影响 |
|---|---|---|
| 章计划确认 | chapter_plans/chapter_NNNN.yaml 编辑 / 预览抽屉 commit | 最高（authored plan 免检） |
| 生成后 accept | POST /chapters/:n/accept | 触发 MemoryUnit.commit + 解锁下一章 |
| 正文直改 | PUT /chapters/:n/text（chapter-service.js:119 直写） | 绕过审计 |
| 单章优化 | POST /chapters/:n/optimize（chapter-audit.js:333 直写） | 绕过审计 |
| 章节重跑 | DELETE /chapters/:n/draft（purgeChapterDrafts + guard.resetChapterForRerun） | 清理重来 |
