# Phase 0 — Production Path Consolidation Audit

**Status:** COMPLETE  
**Date:** 2026-09-08  
**Scope:** `packages/` · `package.json` bin/scripts · `scripts/`（生成相关）  
**Note:** `apps/`、`bin/`、`cli/` 目录不存在。CLI 唯一入口：`packages/inkos-core/src/cli.js`（`bin.inkos`）。

---

## Verdict Map

```
Studio Living / Run (Beat)           PASS              ← canonical 生产路径
Studio Scene writer mode             NEED MIGRATION    （env=scene → DISABLE）
CLI runtime run / resume / daemon    NEED MIGRATION
CLI brain run (default)              NEED MIGRATION    （≡ Runtime CLI）
CLI brain run --legacy               DISABLE
createLlmWriter 作为生产 Writer       BLOCK
PUT chapters/:n/text                 BLOCK
chapter optimize / deep-rewrite      DISABLE | BLOCK
trial-opening                        DISABLE           （预览可用，禁止当生产）
Writer Optimizer / ReaderSim polish  NEED MIGRATION    （RF-01 后再改写）
Canon AI generate / cocreate         PASS              （非 scene.text）
Route generate                       OUT OF SCOPE      （非正文）
Golden / repro scripts               NON-PRODUCTION
```

---

## Gate Definitions

| Gate | Implementation | Production mount |
|------|----------------|------------------|
| **F8.3 Plan Validity** | `evaluatePlanValidity` / `ensurePlanValidity`（`packages/inkos-prompt/src/plan-validity.js`） | Orchestrator 场间；`compileScenePrompt`（L1）；Runtime `PromptCompiler.compile`（L3）；Studio `beat-slimmer`（L4） |
| **RF-01 Prose Boundary** | `applyProseBoundaryGate`（`packages/inkos-studio-server/src/writer-optimization/prose-boundary.js`） | **仅** `beat-execution.js` |
| **Validation** | `validateChapter`（`inkos-brain` validation） | `chapter-pipeline.js` 章通过后 |

---

## 1. Canonical Production Path

### Studio Living 生成 — PASS

| Field | Value |
|-------|-------|
| **入口名称** | UI `IdePage.generateChapter` / `BookHomePage.regenerateChapter`；API `POST /api/books/:id/runtime/run-living`（及 `run`+living、`runtime/next`） |
| **关键文件** | `packages/inkos-studio/src/pages/IdePage.tsx` · `client.ts` · `routes.js` · `living-task.js` · `runtime-control.js` · `studio-orchestrator.js` · `studio-llm-writer.js` · `beat-execution.js` |
| **调用链** | `acceptLivingChapterRun` → `controlRunLiving` → `daemon.runChapter` → **`StudioRuntimeOrchestrator`** → 每 Scene：`ensurePlanValidity` → Director（`scene-lifecycle-bridge`）→ `ensurePlanValidity` → **`createStudioLlmWriter`** → `compileStudioWriterPrompt`（L3+F8.3）→ **`executeBeatSequence`** → `applyProseBoundaryGate`（RF-01）→（条件）`runWriterOptimizer` → `scene.text` → `runScenePipeline` → `persistScenes` → **`runChapterPipeline` → `validateChapter`** |
| **是否生产** | **yes** — canonical |
| **F8.3** | yes（场间 + L1/L3/L4） |
| **RF-01** | yes（Beat 默认） |
| **Validation** | yes |
| **裁决** | **PASS** |

**Daemon 接线（关键分叉点）：**

```148:160:packages/inkos-studio-server/src/routes.js
function getDaemon(bookDir, bookId) {
  // ...
  const writer = isLlmConfigured() ? createStudioLlmWriter(bookDir, bookId, guard) : null;
  const daemon = new RuntimeDaemon(bookDir, { writer, ... });
  daemon.runtime = new StudioRuntimeOrchestrator(bookDir, { writer, ... });
}
```

Studio `getDaemon` **覆盖** orchestrator + writer。纯 CLI daemon **不会**做此覆盖。

---

### Studio Runtime Control 变体 — PASS

| 入口名称 | 调用链要点 | 生产 | F8.3 | RF-01 | Validation | 裁决 |
|----------|------------|------|------|-------|------------|------|
| `POST .../runtime/run` | `controlRun` → 同 daemon | yes | yes | yes* | yes | PASS |
| `POST .../runtime/resume\|retry\|replan\|next` | 同 Studio orchestrator | yes | yes | yes* | yes | PASS |
| `POST .../runtime/daemon/start\|stop` | 文件监听；Studio 下仍为 Studio writer | yes | yes | yes* | yes | PASS |

\* 默认 Beat 模式；Scene 模式见下节。

---

## 2. Studio Writer Internal Forks

### Beat 执行（默认）— PASS

- `studio-llm-writer.js` → `executeBeatSequence` → `beat-execution.js`
- F8.3 L4：`beat-slimmer.js` demotion
- RF-01：每 Beat + final pass

### Scene 级一次写 — NEED MIGRATION

| Field | Value |
|-------|-------|
| **入口名称** | `resolveWriterModeForScene` → `mode:'scene'` |
| **触发** | `INKOS_WRITER_MODE=scene`；`forceSceneWrite`；短 emotional/dialogue 例外 |
| **文件** | `beat-slimmer.js` · `sample-driven-writer.js` `executeSceneWrite` |
| **调用链** | 仍经 Studio orchestrator + F8.3 场间/L1/L3，但 **跳过 L4 Beat demotion 与 RF-01** |
| **是否生产** | maybe（短情绪例外）/ no（env 强制 = debug） |
| **F8.3** | 部分（无 L4） |
| **RF-01** | **否** |
| **Validation** | yes（章级） |
| **裁决** | **NEED MIGRATION**；`env=scene` → **DISABLE** |

### Writer Optimizer / ReaderSim polish — NEED MIGRATION

| 入口 | 问题 | 裁决 |
|------|------|------|
| `runWriterOptimizer`（`studio-llm-writer.js`） | RF-01 **之后**改写，不再过 Prose Boundary | NEED MIGRATION |
| `polishChapterAfterReaderSim`（`chapter-pipeline.js`） | 可 LLM 改正文，无 RF-01 | NEED MIGRATION |

---

## 3. Runtime CLI / Brain — NEED MIGRATION / DISABLE

### `inkos runtime run` / `resume` — NEED MIGRATION

| Field | Value |
|-------|-------|
| **入口名称** | CLI `runtime run\|resume` |
| **文件** | `packages/inkos-core/src/cli.js` → `createRuntime` / `RuntimeOrchestrator` → 默认 `createLlmWriter` |
| **调用链** | `runChapter` → `ensurePlanValidity` → `compileScenePrompt`（F8.3 L1）→ **`createLlmWriter`**（整 Scene 一次 `chatCompletion`）→ `runScenePipeline` → `validateChapter` |
| **是否生产** | maybe（运维/脚本）— **不是** Studio 主生产 Writer |
| **F8.3** | 部分（场间+L1；**无 L4**） |
| **RF-01** | **否** |
| **Validation** | yes |
| **裁决** | **NEED MIGRATION** |

### `inkos runtime daemon` — NEED MIGRATION

| Field | Value |
|-------|-------|
| **调用链** | `startDaemon` → `RuntimeDaemon` + **`RuntimeOrchestrator` + `createLlmWriter`**（不换 Studio） |
| **裁决** | **NEED MIGRATION** |

### `inkos brain run`（默认）— NEED MIGRATION

| Field | Value |
|-------|-------|
| **文件** | `brain-runtime.js` `runBrainPipeline` → `createRuntime` → **同 Runtime CLI** |
| **裁决** | **NEED MIGRATION** |

### `inkos brain run --legacy` — DISABLE

| Field | Value |
|-------|-------|
| **文件** | `brain-runtime-legacy.js` `runBrainPipelineLegacy` |
| **调用链** | Planner→Decision→Conflict→`buildScenePlan`→prompt 文件；**无自动 LLM Writer**；依赖 `--scenes`/`--text` |
| **F8.3** | 否 |
| **RF-01** | 否 |
| **Validation** | yes（有正文时） |
| **裁决** | **DISABLE** |

### 其它 CLI / 库

| 入口名称 | 行为 | F8.3 | RF-01 | Validation | 裁决 |
|----------|------|------|-------|------------|------|
| `inkos brain scene` | 只出 prompt，不写正文 | — | — | — | OUT OF SCOPE |
| `inkos brain plan` | 规划；若 autoWrite 则同 Runtime | 部分 | 否 | 视情况 | NEED MIGRATION（若写正文） |
| `inkos context` | 上下文 Markdown，不调用 Writer | — | — | — | OUT OF SCOPE |
| `runBrainChapter` | 库包装，CLI 未注册子命令 | 同 Runtime | 否 | yes | NEED MIGRATION / 死代码风险 |
| `runFullPipeline`（daemon=null 回退） | 裸 Runtime + llm-writer | 部分 | 否 | yes | **BLOCK**（禁止作生产回退） |

---

## 4. Direct Writer / Bypass — BLOCK / DISABLE

| 入口名称 | 文件 | 写何物 | F8.3 | RF-01 | Validation | 裁决 |
|----------|------|--------|------|-------|------------|------|
| `createLlmWriter` / `chatCompletion` | `inkos-brain/.../llm-writer.js` | scene.text（调用方驱动） | 调用方 | **否** | 调用方 | **BLOCK** 作生产 Writer；保留 transport |
| `PUT .../chapters/:n/text` · `saveChapterText` | `chapter-service.js` · `routes.js` · IdePage 手存 | chapters/*.md | 否 | 否 | 否 | **BLOCK** |
| `POST .../chapters/:n/optimize` | `chapter-audit.js` | 启发式/deep-rewrite 改正文 | 否 | 否 | 否 | **DISABLE \| BLOCK** |
| `POST /api/ai/wizard/trial-opening` | `ai-service.js` | ~300 字预览，不入库 | 否 | 否 | 否 | **DISABLE**（预览 OK） |

网关已 **FORBIDDEN**：`PUT .../chapters/:n/scenes`（禁止 Studio 直写 scene）。

---

## 5. Non-Prose AI（Canon / Route）— 非正文生产

| 入口名称 | 写何物 | 裁决 |
|----------|--------|------|
| `POST /api/ai/generate*` / book `ai/generate` | Canon MD | PASS（非 scene.text） |
| `POST /api/ai/cocreate` / incremental / creator | Canon | PASS（非 scene.text） |
| Copilot | Canon | PASS（非 scene.text） |
| Living `evolveWorldState` | JSON 世界状态提案 | 非散文生产 |
| `inkos route generate` | Possibility sidecar | OUT OF SCOPE |
| Director-only scripts | 规划，不写 prose | OUT OF SCOPE |

---

## 6. Scripts / Golden / Repro — NON-PRODUCTION

| 类型 | 示例 | 裁决 |
|------|------|------|
| Studio 路径镜像 repro | `scripts/repro-*-daemon*.js` | 测试，勿当第二生产 |
| `createLlmWriter` 观测 | `sv-round2-observe-writer.js`、golden validation | **BLOCK** 作生产 |
| Beat / RF-01 / F8.3 单测 | `test-beat-execution.js`、`test-rf01-*.js`、`test-f8.3-*.js` | 回归 |
| 书级实验 | `books/.../pilot-protocol-ab.mjs` | 实验 |

---

## 7. Gate Coverage Matrix

| 路径 | F8.3 场间 | F8.3 L1 | F8.3 L3 | F8.3 L4 | RF-01 | Chap Validation |
|------|-----------|---------|---------|---------|-------|-----------------|
| Studio Beat（canonical） | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Studio Scene 模式 | ✓ | ✓ | ✓ | ✗ | ✗ | ✓ |
| CLI Runtime / brain run | ✓ | ✓ | △¹ | ✗ | ✗ | ✓ |
| brain --legacy | ✗ | ✗ | ✗ | ✗ | ✗ | ✓（有 text） |
| createLlmWriter 直调 | 调用方 | 调用方 | ✗ | ✗ | ✗ | 调用方 |
| trial / PUT text / optimizeChapter | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| Optimizer / ReaderSim polish | n/a | n/a | n/a | n/a | ✗（后置） | 已过或旁路 |

¹ CLI 主要吃 L1（`compileScenePrompt`）；L3 在 Studio sealed compile 路径上。

---

## 8. Architecture Split Diagram

```
                    ┌─ Studio getDaemon ─────────────────────────────┐
UI/API ────────────►│ StudioRuntimeOrchestrator                      │
                    │ + createStudioLlmWriter                         │
                    │ → Beat(+RF-01)+L4+L3 → validateChapter         │
                    │                    PASS                        │
                    └────────────────────────────────────────────────┘

CLI runtime/brain ─► RuntimeDaemon / createRuntime
                    │ RuntimeOrchestrator
                    │ + createLlmWriter  ← NO RF-01, NO L4
                    │ → validateChapter
                    │              NEED MIGRATION
                    └────────────────────────────────────────────────┘

CLI --legacy ──────► runBrainPipelineLegacy (no auto writer)
                                 DISABLE

PUT text / optimize ► 直接改正文，跳过 Gate Stack
                                 BLOCK
```

---

## 9. Key File Index

| 角色 | 文件 · 符号 |
|------|-------------|
| CLI | `packages/inkos-core/src/cli.js` |
| Studio orchestrator | `studio-orchestrator.js` · `StudioRuntimeOrchestrator` |
| Runtime orchestrator | `inkos-runtime/.../orchestrator.js` · `RuntimeOrchestrator` · `createRuntime` · `runFullPipeline` |
| Studio writer | `studio-llm-writer.js` · `createStudioLlmWriter` |
| Legacy writer | `llm-writer.js` · `createLlmWriter` · `chatCompletion` |
| Beat + RF-01 | `beat-execution.js` · `applyProseBoundaryGate` |
| F8.3 | `inkos-prompt/src/plan-validity.js` |
| Validation | `inkos-brain/.../validation.js` · `validateChapter` · `chapter-pipeline.js` |
| Control | `runtime-control.js` · `controlRun*` · `runViaDaemon` |
| Daemon | `inkos-runtime/src/daemon.js` · `RuntimeDaemon` |

---

## 10. Phase 0 Success Criteria Check

| 要求 | 结果 |
|------|------|
| 完整入口地图 | **YES** — 见 Verdict Map + 各节 |
| 识别唯一生产路径 | **YES** — Studio Beat via `run-living` |
| Studio / Runtime / Legacy / CLI Writer 分类 | **YES** — PASS / NEED MIGRATION / DISABLE / BLOCK |
| 门禁覆盖可核对 | **YES** — Gate Coverage Matrix |

---

## 11. Freeze Decision（Phase 0）

**Can enter next phase?** 对 **Phase 1（Actual Event Foundation）** 调查与设计：**YES**。

但 Phase 0 本身仍有未闭合迁移项（不阻塞 Phase 1 审计，但阻塞“One Production Path”最终达成）：

| 项 | 优先级 | 建议 |
|----|--------|------|
| CLI Runtime/brain 接 Studio Beat Writer 或共享 Gate Stack | P0 迁移债 | Phase 1 实现时不得扩大 CLI 旁路 |
| `INKOS_WRITER_MODE=scene` 生产禁用 | P0 | 文档冻结：仅调试 |
| Optimizer / ReaderSim 后置 RF-01 | P1 residual | 已知限制 |
| `PUT text` / `optimizeChapter` 旁路 | P0 | 禁止作为生产正文来源 |
| `--legacy` | P0 | DISABLE：不得用于生产生成 |

**冻结声明：**

> 唯一认可的正文生产路径是 Studio Living/Run → StudioRuntimeOrchestrator → createStudioLlmWriter → Beat Execution（含 F8.3 + RF-01）→ Validation。  
> 其它路径一律按上表分类处理，不得新增旁路。

---

## PHASE 0 COMPLETION REPORT

### 1. Changed Files

- `_AI_AUDIT_PRODUCTION_PATH.md`（本文件，新增）

### 2. Architecture Change

- 无代码变更。完成入口地图与门禁覆盖审计，冻结 canonical 生产路径定义。

### 3. Tests Added

- 无（审计阶段）

### 4. Test Result

- N/A — 以静态调用链 + 源码核对为准

### 5. Failure Replay

本阶段不复现文学失败；识别的**路径失败模式**：

| 模式 | 对应入口 | 风险 |
|------|----------|------|
| Plan override / 弱 F8.3 | CLI `createLlmWriter`（无 L4） | Plan 特权未降级 |
| Gate stack bypass | `PUT text`、`optimizeChapter`、Optimizer 后置改写 | 正文可跳过 RF-01 |
| Legacy divergence | `brain --legacy` | 无 F8.3 / RF-01 |

### 6. Remaining Risks

1. Studio 与 CLI 双 Writer 分叉仍在，One Production Path 未实现。  
2. Scene 模式与 polish 后置改写是 RF-01 残差。  
3. 手存章节文本仍可绕过全部 Gate。

### 7. Can Enter Next Phase?

**YES** — 进入 Phase 1 Step 1.1：Actual Flow Audit（`_AI_ACTUAL_FLOW_AUDIT.md`）。
