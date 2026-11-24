# 09. Reader / Metrics / Validation / Critic（质量链路）

> 《系统认知包》第 15、16 节。基于 agent-A（pipeline 顺序）+ agent-E（writer 侧）+ agent-G（真实 run.json）证据。

---

## 15.1 章级校验链（chapter-pipeline.js:36-386，真实执行顺序）

```
bus.emit('chapterFinished')            ← 注意：在校验前发出（重入隐患）
checkConsistency                       ← 硬拦（!force）
computeMetrics → metrics_dashboard.json
analyzeMetricsFeedback                 low+needsReplan → 返回失败+replanIntent（orchestrator.js:336 有界重入 _runChapter，≤maxReplan=3）
simulateReaders                        启发式，无 LLM
runCritic → critic_history.json        ← 硬拦（!force）
runDedupReview                         软信号
validateChapter (八项)                  ← 硬拦（!force）
Reader Simulator (2×LLM)               → softFail 触发 Optimizer (polish LLM)
Temperature AB (每5章)                 生产伪 AB 调用块已删（Phase 1）；ab-test.js 基础设施保留给测试/诊断
applyAdaptiveFeedback → adaptive_state.json
computeStoryHealth（实时计算，不落盘）
buildStateDiff
[deferCommit] → pending_commit + writeChapterOnly → pass:true, pendingAudit:true
[正常] → MemoryUnit.commit + planNextChapter + writeNextChapterTask
saveBrainRun → ch_XXXX_run.json → emit pipelineCompleted
```

## 15.2 真实 run.json 证据（ch_0001，2055 书）

```json
{
  "version":"runtime-2.0", "chapter":1, "pass":true,
  "metrics":{ "chapter":1, "sceneCount":4, "climaxCount":2, "conflictDensity":3,
    "conflictTypes":[...], "dialogueRatio":0.05, "actionRatio":0.24, "mindRatio":0.05,
    "wordCount":4924, "worldProgress":0, "characterGrowth":1, "foreshadowRate":1,
    "rhythmPeaks":[{"index":...,"intensity":...,"chars":...}], "infoDensity":12.31 },
  "reader":{ "personas":[{"id","name","readingDrive","scores":{"hook","pace","payoff","emotion"},"comment"}],
    "highlights":{"best","boring","draggy","anticipated"}, "readingDrive":78, "pass":true },
  "critic":{ "pass":true, "overall":79, "scores":{"commercialRhythm","sellingPoint","payoff","patternRepeat","chapterValue","retention"},
    "issues":[], "plannerHints":[], "comment":"可上架连载" },
  "validation":{ "pass":false, "passed":6 }
}
```

## 15.3 各校验模块细节

### Consistency（brain `consistency/`）
- 章级：`checkConsistency`（硬拦）——检测设定/人物一致性漂移
- Scene 级（CLI 路径）：`scene-pipeline` 内软分析；Studio 路径被替换

### Metrics（brain `metrics/`）
- `computeMetrics`：dialogueRatio/actionRatio/mindRatio/conflictDensity/climaxCount/rhythmPeaks/infoDensity/worldProgress/characterGrowth/foreshadowRate
- 写 `metrics_dashboard.json`（追加）；被 adaptive/health 消费，**不进 LLM prompt**

### Reader（brain `reader/`）
- `simulateReaders`：启发式多 persona 阅读（无 LLM）
- **Reader Simulator（2×LLM）**：primary temp 0.3 + secondary temp 0.7，max_tokens 500，产出 hookScore/personas/highlights（best/boring/draggy/anticipated）→ softFail 触发 Optimizer polish
- 读 `reader_sim_baseline` 对比

### Critic（brain `critic/`）
- `runCritic`：商业性评分（overall + commercialRhythm/sellingPoint/payoff/patternRepeat/chapterValue/retention），**硬拦（!force）**
- 写 `critic_history.json`（chapter-pipeline.js:389 append，:396 load 用于 story health）
- `plannerHints` 回灌 adaptive

### Validation（brain `validation/`）
- `validateChapter` **八项验收**（硬拦）：anchor/lore/prompt/repetition/tension/cost 等（真实书 ch_0001: passed=6，pass=false 但最终书通过——force 或非阻塞）
- Scene 级：CLI 路径 `reviewScene`（只查字数/违禁词，scene.js:35）；Studio 路径 `runNonBlockingScenePipeline`（有正文即 pass，analysisOnly:true）

### Dedup
- `runDedupReview`：防复读信号（软）

### 防复读硬失败闸
- **SCENE_HARD_FAIL**（Scene 级）：防复读 ≥7 字 + 身体禁令 → sceneRejected → 有界 replan（Studio MAX=2）
- **章内滑窗**：`chapter-pipeline.js:423` 用 Studio `beat-continuity.js similarityRatio`
- **章首防复读**：`forbidden_openings`（anchor）

## 15.4 双轨校验强度对照（关键）

| 校验 | CLI/Daemon 路径 | Studio 路径 |
|---|---|---|
| Scene 级 review/consistency/decision | ✅ 软分析（失败可 replan） | ❌ 替换为 non-blocking（永不拦截） |
| 章级 checkConsistency/critic/validation | ✅ 硬拦（!force） | ✅ 同（!force 可绕过） |
| Reader Simulator + Optimizer | ✅ | ✅ |
| MemoryUnit.commit | ✅ 自动 | deferCommit（作者 accept 才 commit） |
| sceneRejected replan | 递归无上限 | MAX=2 |

## 15.5 假功能 / 已收敛（质量链路内）

1. **AB test**：生产伪 AB 调用块（原 chapter-pipeline.js:198-207）**Phase 1 已删**；`ab-test.js` 基础设施（runTemperatureAbTest/loadAbReport）保留，仅供测试/诊断（diagnosis-service.js:142）。不再有"两温度同一文本"的伪信号。
2. **replan 分级**：chapter 级 replanIntent 为**真**——orchestrator.js:336 `_resolveChapterResult` 有界重入 `_runChapter`（≤maxReplan=3）；**降级为"假"的是 story-thread** `shouldReplan/replanReason` → 仅作 adaptive hint（见 14 #6）。
3. **Decision/Conflict 校验**：只在"无 authored plan"分支执行；有 authored plan 时（生产主路径）**跳过**——即作者确认的 plan 免检

## 15.6 Story Health（全书健康度）

`story-health.js`：`computeStoryHealth`（characterConsistency/foreshadowRecoveryRate/climaxIntervalAvg/conflictDensityAvg/worldProgressTotal/relationshipChanges/rhythmWaveform/infoDensityAvg/criticScoreAvg/dialogueRatioAvg/overallScore）**实时计算，不落盘**（P3.1 退役写端已删；UI 展示由 runtime-reader/compatibility 现算）。**只供 UI，不回读生成**。
