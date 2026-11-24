# 07. Prompt 系统 + LLM 调用链

> 《系统认知包》第 11、12 节。基于 agent-D（prompt/LLM）+ agent-E（writer prompt）+ agent-G（真实 prompt 落盘）证据。

---

## 11.1 两条 Prompt 编译器（重要：不是一套）

| 维度 | `inkos-prompt/src/compiler.js` | `inkos-runtime/src/compiler/prompt-compiler.js` |
|---|---|---|
| 入口函数 | `compileScenePrompt`（:143） | `compile()`（:531） |
| 角色 | **上下文种子层**：选实体→分层→预算→缓存→组装动态上下文 | **P0-P3 密封层**：把 director format*Block 渲染成分层 prompt |
| 谁用 | **两条路径都用**（brain dynamic-prompt → buildDynamicPrompt；Studio 也经它组装种子） | **仅 Studio 路径**（`compile-writer-prompt.js:155` 调用） |
| 预算 | `applyAdaptiveBudget`（:78-118/371）按 entity/token 分档 | `clipPriorityStack`（:398），`DEFAULT_TOKEN_BUDGET.total=7200` |
| 缓存 | `prompt-cache/ch_XXXX/{cache_validator, context_snapshot, prompts/*.txt, metrics, relevance_stats}` | 无独立缓存（依赖种子层缓存） |
| director 引用 | 无 | `:15-41` 从 `@inkos/director` import 20+ `format*Block` |

**关键事实**：CLI 路径只用种子层（compileScenePrompt）；Studio 路径种子层 → 密封层两层都走。所以"Runtime 有统一 Prompt Compiler"的文档声明不成立——它是 **Studio writer 专用**。

## 11.2 Studio 路径的完整 prompt 组装栈

```
buildDynamicPrompt(ctx, scene)                         ← 种子层 compileScenePrompt（实体选择/分层/缓存）
buildSceneWritePrompt(ctx, intent, scene, dynamic)     ← "# Scene Lore Seed"
sceneLifecycleHook('plan') → runDirectorPhase          ← director 软分析，promptAppend 追加
compileStudioWriterPrompt(basePrompt, scene, chapter, intent, ctx, storyMemoryBlock)   ← compile-writer-prompt.js:52
  ├─ compilePrompt(...)                                ← runtime prompt-compiler.compile（P0-P3）
  ├─ continuation-engine / scene-boundary / reveal-manager / hook-generator
  ├─ execution-plan（beat-execution.js:73）
  ├─ voice-dna / golden-sample / director-overrides / adaptive-planner
逐 beat：compileSlimBeatUserPrompt（beat-slimmer.js:154）   ← 最终 user message（7 元素块）
```

## 11.3 P0-P3 分层语义（密封层 `compile()`）

| 层 | 内容 | 来源 |
|---|---|---|
| **P0 护栏** | Golden Sample、格式约束、Anchor Voice DNA（resolveProtectedVoiceDna）、Craft 策略、Writer Runtime 策略、身体禁令（左臂焦毁等） | formatGuardrails |
| **P1 叙事任务** | Narrative Task + 对话风格 + 章作者目标 + 场景作者弧线 + Beat Plan + beat 状态 + 冲突 + 情境 + 角色欲望/转变/行为 + 高潮 + 情绪曲线 + 读者情绪 + 场景节奏 + Hook | formatNarrativeTask |
| **P2 世界观** | Story DNA 摘录 + World Bible + 过滤后 canon + 章标题 + 商业规则 | formatLore |
| **P3 自适应** | Story Memory 块 + 记忆层级 + Adaptive 提示/指令 + 前文摘录 + 续写块 + 边界块 + Reveal 块 + Hook 块 | formatAdaptive |

**压栈机制**：`clipPriorityStack`（:398）超预算时从低优先级 P 层裁剪，默认总预算 7200 token。

## 11.4 真实落盘的 prompt（ch_0005 书实证）

`brain/prompt-cache/ch_0005/prompts/*.txt` 首行注释：
```
<!-- prompt-compiler v2 | scene=ch5_s3 | tokens=1026 | profile=climax | cache=100% | compile=1ms -->
```
内含：Scene 目标/冲突、人物卡、续写指令、本章任务、时间线 TopK、世界规则、写作规则等区块。scene 对象里的 `prompt` 字段是 9419 字符完整 prompt（Scene Write Task + 执行单）。

`prompt_metrics.json` 每 scene：
```json
{ "sceneId":"ch5_s1", "input_tokens":1507, "output_tokens":null, "cache_hit":true,
  "cache_hit_rate":100, "context_size":87, "ranking_drop":6,
  "budget_usage":{"usage":{goal,conflict,character,world,facts,history,relationship,knowledge},"pct":{...}},
  "budget_profile":"opening", "prompt_hash":"e6ecd017...", "token_source":"estimated",
  "importance":{"林晓":100}, "ranking":{...} }
```

## 11.5 上下文来源（种子层读什么）

- **实体选择**：`entity-selector.js`（compiler.js:25 selectEntities/filterCharacters/filterFactions）按场景相关性裁剪人物/势力/世界观
- **canon 注入**：`loader.js:190-268 loadBrainContext` 读 facts/timeline/knowledge/relationship/resource/foreshadow/state_board/writing_bible/world_bible/character_bible → P2 Lore
- **分层预算**：`tiers`（0-5 tier 分配 token）
- **缓存**：`cache-validator.js`（world/writing/facts/relationship/resource/knowledge/character/faction hash）、`context_snapshot`、`prompt-cache/ch_*/prompts/*.txt`（真实书只保留最后一章 ch_0005——旧章用旧编译器生成，无缓存）

---

## 12.1 LLM 调用链 —— 唯一 HTTP 点

```
所有 LLM 调用 ──→ chatCompletion（inkos-brain/src/writer/llm-writer.js:117）──→ fetch（:143）
                  OpenAI 兼容 HTTP（deepseek-chat / GLM 可配，:121-127）
```

**配置（.env）**：`LLM_PROVIDER=openai_compatible`，`LLM_MODEL=deepseek-chat`，`LLM_TEMPERATURE=0.55`，`LLM_MAX_TOKENS=4096`，`api.deepseek.com/v1`。

**无 SDK**：自研封装，单一 fetch 点（这是"所有 LLM 调用的唯一真源"）。

## 12.2 各路径的调用参数

| 调用方 | temperature | max_tokens | 用途 |
|---|---|---|---|
| brain writer（CLI） | 0.55（继承 .env） | 4096 | 每 scene 一次正文 |
| Studio writer `llmFn` | ≈0.85（beat 写作） | 4096 | 每 beat 一次正文 |
| Reader Simulator primary/secondary | 0.3 / 0.7 | 500 | hookScore 诊断 |
| Optimizer polish | ≤0.85 | 900 | 局部润色 |
| Studio 旁路（Wizard/canon/character-brain/editor-feedback） | 各自默认 | — | 设定生成 |

## 12.3 每章 LLM 调用次数估算

- Studio 路径：约 4 scene × 4 beat ≈ 16 次正文调用 + 2 次 reader-sim + 0~N 次 optimizer/polish
- CLI 路径：4 次正文 + 2 次 reader-sim + 0~N 次 polish

## 12.4 防缓存 / 重试 / 失败处理

- **ExecutionGuard**：`applyDaemonExecutionGuard`（execution-guard.js:574-593）**禁用 daemon 自动重试**——失败即停，等人工/手动 resume
- **chapterFinished 早发**：orchestrator 在校验前 emit（重入隐患）
- **SCENE_HARD_FAIL**：Studio 路径 scene 级失败 → 有界 replan（≤2）

## 12.5 假功能（LLM 相关）

1. **Temperature AB 生产入口已删（Phase 1）**：原 chapter-pipeline.js:198-207 的伪 AB 块（两温度返回同一 `workingText`）已删除；`ab-test.js` 基础设施（runTemperatureAbTest/buildAbComparisonReport/loadAbReport）保留，仅供测试与诊断 UI（diagnosis-service.js:142 `loadAbReport`）。
2. **PromptCompiler 非统一入口**：runtime 的 compile 仅 Studio writer 用；CLI 走种子层。
3. **replan 分级（真/降级）**：chapter 级 replanIntent 为**真**——orchestrator.js:336 `_resolveChapterResult` 有界重入 `_runChapter`（≤maxReplan=3，预算打满置 replanExhausted）；真正"降级为假"的是 story-thread `shouldReplan/replanReason` → 仅作 adaptive hint（见 14 #6）。
