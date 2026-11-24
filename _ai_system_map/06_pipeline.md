# 06. Pipeline：Scene / Beat / MicroScene + Cause/Effect

> 《系统认知包》第 9、10 节。基于 agent-E（writer/memory/因果）与 agent-F（studio）证据。

---

## 9.1 Scene（场景）—— 执行单元

**Scene 是 Runtime 的执行单元**。每章 3-6 个 scene（真实书 ch_0001~0005 每章 4 个）。

### Scene 对象完整字段（真实书 ch_0005_scenes.json 实证）
```json
{
  "index": 1, "id": "ch5_s1", "title": "进入局面",
  "goal": "...", "conflict": "...", "entities": ["林晓"], "beat": "situation",
  "wordTarget": 800, "status": "done", "reviewRequired": true,
  "prompt": "# Scene Write Task\n> 只写本 Scene...（9419字符完整prompt）",
  "dynamic": {"entities": [...], "factions": [...], "modules": [{key,label,tokens,category}]},
  "_hashDependency": {"valid": false, "mustRecompile": true, "changed": [], "hashes": {...}},
  "directorBrief": "<!-- inkos-scene-director -->...执行单（3705字符）",
  "executionPlan": {"version":"scene-execution-1", "beats":[{order,id,structuralBeat,...}]},
  "sceneOutcome": {"success":"...", "failure":"..."},
  "scenePlan": {"goal":"...", "obstacle":"..."},
  "_chapterDirector": {"role":"chapter-director", "brief":"<!-- inkos-chapter-director -->..."},
  "text": "正文（867字符）",
  "review": {"sceneId":"ch5_s1", "pass":true, "wordCount":857, "issues":[], "mode":"non-blocking"},
  "wordCount": 857
}
```

### Scene 生命周期（两种路径）
```
CLI/Daemon 路径                           Studio 路径
─────────────                           ──────────
buildDynamicPrompt(ctx, scene)           buildDynamicPrompt(ctx, scene)
buildSceneWritePrompt(...)               buildSceneWritePrompt(...)
                                         sceneLifecycleHook('plan')
                                           → hash/budget/context-ranking/director 软分析
                                         → promptAppend 追加进 scene.prompt
scene.text = brain writer(单次LLM)         scene.text = Studio writer(逐beat LLM×N)
runScenePipeline                         runNonBlockingScenePipeline
  (reviewScene/checkConsistency/           (有正文即 pass, analysisOnly:true)
   evaluateDecisions, 失败可重规划)              ← 永不拦截、永不重规划
失败→sceneRejected→replan(递归,无上限)      失败→SCENE_HARD_FAIL→replan(≤2)
sceneLifecycleHook('reviewed'/'memorized')
persistScenes → ch_XXXX_scenes.json
```

### beat 类型（真实书）
`situation` / `escalation` / `climax` / `resolution` 等（执行单 structuralBeat）。

## 9.2 Beat（节拍）—— Studio 路径的写作原子

**Beat 只在 Studio 路径存在**（CLI 路径 writer 一次写出整 scene）。由 director `buildSceneExecutionPlan` 生成，`beat-slimmer.js`/`beat-execution.js` 执行。

### Beat 写手的组装逻辑（`beat-slimmer.js buildSlimBeatSystem`）
"你是职业商业网文 Beat 写手…动作链连续、后果落地、信息克制" + BEAT_HARD_RULES。每 beat 的 user message = **7 元素强约束执行计划**：
1. **P0 护栏**：Golden Sample、格式约束、Anchor Voice DNA（resolveProtectedVoiceDna）、Craft 策略、Writer Runtime 策略、身体禁令
2. **P1 叙事任务**：Narrative Task + 对话风格 + 章作者目标 + 场景作者弧线 + Beat Plan + beat 状态 + 冲突 + 情境 + 角色欲望/转变/行为 + 高潮 + 情绪曲线 + 读者情绪 + 场景节奏 + Hook
3. **P2 世界观**：Story DNA 摘录 + World Bible + 过滤后 canon + 章标题 + 商业规则
4. **P3 自适应**：Story Memory 块 + 记忆层级 + Adaptive 提示/指令 + 前文摘录 + 续写块 + 边界块 + Reveal 块 + Hook 块
5. **每拍增量**：当前拍渲染文本 + 前/后状态 + 连续性摘要 + 事件相位指令 + 驱动块

### Beat 执行循环（`beat-execution.js` / `studio-llm-writer.js:386-459`）
```
executeBeatSequence(scene):
  对每个 beat:
    compileSingleBeatPrompt(beat)      → 每拍单独编译
      → compileSlimBeatUserPrompt      → 最终 user message
      → llmFn → chatCompletion → fetch → beat 正文
    applyBeatToRuntimeSession          → lastEvent 写入 session（因果链）
    validateWriterRuntimeV2(beats)     → softFail（不阻塞）
    persistBeatExecutionLog            → scene_NN_beats.json（纯展示）
```

### 每场景新建 runtimeSession（`beat-execution.js:567`）→ **lastEvent 不跨场景**

## 9.3 MicroScene（微场景）

**不存在独立的 MicroScene 类型**。章节粒度 = Scene（最小持久化单元）；比 scene 更细的粒度是 **Beat**（仅内存态 + `scene_NN_beats.json` 日志落盘，随 plan 重建、不持久为独立对象）。"MicroScene"如果指 beat 内部的状态迁移（narrative-renderer 渲染的前/后状态），那是 runtime session 的内存对象（`applyBeatToRuntimeSession`）。

## 9.4 Cause / Effect（因果）—— 真实程度判定

### 判定：**拍内真实（启发式）、跨场景/跨章装饰、Brain 路径完全缺席**

**拍内真实链（Studio 路径）**：
1. `writer-runtime-v2.js:160 evaluateCauseEffect` —— **启发式正则**（hasAction/hasEffect/chainedFromLast），非语义模型。产出 `{cause, event, effect, nextEvent}`
2. 触发：`validateWriterRuntimeV2`(:439, 完整模式 :468) —— **只 softFail**（:497-500），pass 只取决于 formatPass && noRepeat && stateChange
3. 注入链：`applyBeatToRuntimeSession`(:622) `next.lastEvent = validation.causeEffect.nextEvent` → 下一拍 prompt `formatWriterRuntimeV2PromptBlock`(:574 "上一事件 Effect（须承接）") → `compileSingleBeatPrompt` 带入 user message
4. 重写提示：`buildRewriteHint`(:539 "承接上一 Effect…")

**跨场景/跨章断裂证据**：
- 每场景新建 runtimeSession → lastEvent 不跨场景
- `saveChapterContinuity`（studio-llm-writer.js:461-464）只存 physical/body state + usedImages，**不存 lastEvent**
- `persistBeatExecutionLog`（compile-writer-prompt.js:250）把 lastEvent 写进 `scene_NN_beats.json` —— **全仓 grep 无读取方**，纯 IDE 展示
- **Brain/CLI 路径没有任何 causeEffect 代码**

**定性**：causeEffect 是"拍内强化的启发式校验"，保证一拍接一拍有因果链；跨场景/章只以"身体状态 + 禁止元素 + tailExcerpt"形式间接延续，**因果记录本身零持久化**。

## 9.5 防复读 / 防复燃机制（pipeline 内的守卫）

- **Scene 硬失败闸（SCENE_HARD_FAIL）**：防复读 ≥7 字 + 身体禁令（如左臂焦毁——用力动作用右臂/肩），触发即 sceneRejected → 有界 replan（Studio MAX=2）
- **章内防复读滑窗**：`chapter-pipeline.js:423` 用 Studio `beat-continuity.js similarityRatio` 比对（**runtime 反向依赖 studio 的证据**）
- **opening 防复读**：`applyAnchorConstraints` forbidden_openings + 章末 `banned_elements`
- **钩子轮转**：`doctor.js validateHookRotation` 检查 hook 类型不重复
