# 08. Writer（正文生成器）+ 写作风格

> 《系统认知包》第 13、14 节。基于 agent-D/E/F（writer 层）+ agent-G（真实正文落盘）证据。

---

## 13.1 两条完全并行的"写手"路径（最重要的事实）

| 维度 | A. Studio 路径（IDE 默认 / 主交互） | B. Runtime/Brain 路径（Daemon 默认 / CLI） |
|---|---|---|
| 写手入口 | `createStudioLlmWriter`（`inkos-studio-server/src/studio-llm-writer.js:156`） | `createLlmWriter`（`inkos-brain/src/writer/llm-writer.js:48`） |
| 接线点 | `routes.js:151` `getDaemon` → 注入 `StudioRuntimeOrchestrator`（:154） | `daemon.js:31` / `orchestrator.js:40` |
| 执行方式 | **逐 Beat 执行**（`executeBeatSequence`）+ 连续性状态机 + Optimizer | **单次整 Scene 写出**（无逐 Beat 门控） |
| Prompt 编译器 | 统一 P0-P3 密封编译器 `compile()` + Studio 专有块 | v2 场景编译器 `compileScenePrompt` |
| 因果（causeEffect） | 拍内真实校验+注入（writer-runtime-v2） | **完全不存在** |
| 记忆读回（memory_hierarchy/story-memory/adaptive） | 全部注入 | **全部不注入**（写入但从不读回） |
| 汇合点 | 两者最终都进同一 `chatCompletion`（llm-writer.js:117）→ `fetch`（:143） | |

**接线证据**：
- Studio：`routes.js:151-159` daemon 的 `writer = createStudioLlmWriter` + `daemon.runtime = new StudioRuntimeOrchestrator({writer, sceneLifecycleHook})`。Studio 流程**永不走**默认 writer（runtime-control.js:186 的 runFullPipeline 只是无 daemon 兜底，路由里 daemon 恒在）。
- CLI：`orchestrator.js:354-364` 用 brain `createLlmWriter`。

## 13.2 Brain Writer（B 路径）调用链

```
daemon.js:31 / orchestrator.js:40  createLlmWriter
orchestrator.js:298-299  scene.prompt = buildSceneWritePrompt(ctx, intent, scene, buildDynamicPrompt(ctx, scene))
orchestrator.js:354-364  activeWriter({bookDir, chapter, scene, prompt, ctx, intent}) → llm-writer.js:51
  → :64  buildRuntimeContinuationBlock（复用 extractPrevSceneTail, llm-writer.js:14-28）
  → :69  optimizeWriterPrompt（@inkos/writer 优化器）
  → :72  chatCompletion → fetch（DeepSeek）
```
最终 user message = **Scene Lore Seed**（scene.js:13：场景目标/冲突/beat/字数/主线动作/mustLose + compileScenePrompt 动态上下文）+ 上一场景结尾续写块 + writer-optimizer 块。**单次整场景写出**。

## 13.3 Studio Writer（A 路径）调用链

```
routes.js:151  getDaemon → createStudioLlmWriter(bookDir, bookId, guard)
studio-orchestrator.js:189-198  activeWriter({bookDir, chapter, scene, prompt, ctx, intent})
  → studio-llm-writer.js:162  studioLlmWriter
  → :284  compileStudioWriterPrompt({basePrompt, scene, chapter, intent, ctx, storyMemoryBlock})
  → :386-459  executeBeatSequence / executeSceneWrite
      → beat-execution.js:220  compileSingleBeatPrompt（每拍单独编译）
        → beat-slimmer.js:154  compileSlimBeatUserPrompt（最终 user message）
      → :356  llmFn → chatCompletion  ← 真正调 LLM
  → 连续性状态机（beat-continuity.js 滑窗防复读）
  → Optimizer 条件触发（shouldTriggerOptimizer:596 → runWriterOptimizer:653）
```

### Beat 写手的 7 元素 user message（beat-slimmer.js）
见 `06_pipeline.md` §9.2。总结：P0 护栏 + P1 叙事任务 + P2 世界观 + P3 自适应 + 每拍增量（narrative-renderer 渲染前/后状态 + 连续性摘要 + 事件相位指令）。

### 例外模式（sample-driven-writer.js）
`executeSceneWrite`（:521）支持"场景例外模式"：用风格样本（golden-sample）驱动，处理非 beat 流水场景。

## 13.4 Optimizer（打磨器）—— 生成后条件性打磨，不是首稿写手

- **Studio 路径**：`studio-llm-writer.js:653 runWriterOptimizer`，由 `shouldTriggerOptimizer`（:596，hook 分低于下限才触发）门控
- **Runtime 路径**：`chapter-pipeline.js:155 polishChapterAfterReaderSim` → `reader-simulator.js:13 runWriterOptimizer`
- **产物**：`novel/_system/studio/writer-optimizer/ch_N/scene_N/{draft.md, polished_draft.md, optimizer_report.json}`（真实书实证）
- **独立入口**：writer-optimizer-reader（手动打磨）

## 13.5 Writer 相关包（@inkos/writer）—— 活但只在 Brain 路径

- `optimizer.js` 被 `llm-writer.js:7` import（`optimizeWriterPrompt`）→ **活的**
- `optimizer.js:4-9` 导入 style-adapter/rhythm/info-release/conflict/hook/emotion-sample → 经 optimizer 间接进 prompt
- `optimizeWriterPrompt`（:14）：emotionBlock（must-keep）+ rhythm/style/infoRelease/conflict/hook 块，token 预算 180/420，追加 `<!-- writer-optimizer v1 -->`
- **Studio 路径完全不用 `@inkos/writer`**（改用 director 的 writer-runtime / beat-slimmer / sample-driven-writer / `@inkos/writer-optimizer`）。所以 `distillStyle`/`detectRhythmPhase`/`scoreHook`/`analyzeConflict` 在 Studio（主路径）不被消费

## 13.6 Writer 读哪些状态（真实落盘证据）

- **读**：`loadBrainContext`（facts/timeline/knowledge/relationship/foreshadow/state_board/current_state/09/character_bible/volume 同一批书状态文件）+ `readStoryDna`（studio-llm-writer.js:200）+ `readSystemFile('style_dna')`（:201）+ `loadChapterContinuity`（:59 读 `_system/studio/writer-optimization/ch_XXXX/continuity.json`）
- **写**：`scene.text` 经 runtime `persistScenes` 落 `ch_XXXX_scenes.json`（Studio 未直接写 scenes——遵守 FORBIDDEN）+ 直写 `continuity.json`/`writer-optimization meta`/`beat_execution_log`/`execution_intelligence`/`prompt_metrics`

---

## 14.1 写作风格控制 —— 三层来源

| 层 | 载体 | 注入点 | 是否进 prompt |
|---|---|---|---|
| **写作圣经** | `novel/02_writing_bible.md`（可编辑 canon） | loader → 上下文 tier3 | ✅ 两路径 |
| **Style DNA** | `novel/_system/style_dna.yaml`（Studio `extractStyleDna` 产出） | Studio writer 读入（:201）→ voice-dna 块 | ✅ 仅 Studio |
| **Golden Sample** | 风格样本（作者提供/提取） | P0 Golden Sample 块 | ✅ 仅 Studio |
| **Voice DNA** | `states/ch_N_anchor.yaml` 的 voiceDna（跨章） | `applyAnchorConstraints` → P0 resolveProtectedVoiceDna | ✅ 两路径 |
| **Craft 策略** | P0 Craft 策略块 | prompt-compiler | ✅ 仅 Studio |
| **human-writing-policy** | director prompt 块 | prompt-compiler format*Block | ✅ 仅 Studio |

**Writer-optimizer v1 块**（Brain 路径）：emotionBlock（must-keep）强制保留情绪描写 + rhythm/style/infoRelease/conflict/hook 优化提示。

## 14.2 实际文风控制效果评估（证据性）

- **Studio 路径约束最强**：逐 beat 校验 + Golden Sample + Voice DNA + 身体禁令（如左臂焦毁 → 用力动作用右臂/肩，`banned_elements`）。
- **CLI 路径约束最弱**：单次整场景写出，只靠写作圣经 + optimizer 块 + anchor voiceDna。
- **真实书 ch_0001~0003 与 ch_0004~0005 存在代差**：前 3 章文件名为 `mainGoal.slice(0,8)` 风格（旧 orchestrator.js:589 写的），第 4 章起为悬念标题（studio-orchestrator.js:56 resolveChapterSuspenseTitle）——两代代码都落过盘，说明书的生成跨过两次 writer 世代。

## 14.3 "同一份文本"风险点

- **Temperature AB 生产入口已删（Phase 1）**：原 chapter-pipeline.js:198-207 伪 AB 块已删除；`ab-test.js` 基础设施保留给测试/诊断（diagnosis-service `loadAbReport`）。不再存在"两温度同一文本"的伪信号。
- **复读防线**：SCENE_HARD_FAIL（≥7 字复读）+ beat-continuity similarityRatio 滑窗（章内）+ forbidden_openings（章首）。
