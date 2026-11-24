# RF-01 — Beat Meta Leak Minimal Implementation

**Date**: 2026-09-08  
**Authorization**: `RF-01-BEAT-META-LEAK — MINIMAL IMPLEMENTATION`  
**Upstream**: `RF-01-DESIGN-GATE` → AUTHORIZED  
**Mode**: MINIMAL IMPLEMENTATION · Writer output prose boundary only  

**Final Verdict**: **PASS WITH KNOWN LIMITATIONS**

```text
RF-01 IMPLEMENTED
→ unit / regression PASS
→ F-Series regression PASS
→ LITERARY VALIDATION BLOCKED
→ STOP (no RF-02 / F8.4 / F9)
```

---

## I. Implementation Scope

**唯一目标**：Studio Beat Writer 生成物中的内部 Beat scaffolding 不得作为读者可见正文进入 `scene.text`。

**责任层**：draft qualification / normalization（Prose Boundary Gate）  
**插入点**：

```text
LLM beat text
  → Prose Boundary Gate          ← RF-01
  → existing hardFail / reopen / body / repetition
  → accumulatedText
  → scene.text
  → Review (analysisOnly, unchanged)
  → persist
```

**未做**：Prompt 祈祷强化、Review 升格权威、新 Engine、Canon/SR/Reality/Plan/OC 写入、全文 scrub、重写整章。

---

## II. Exact Changed Files

| File | Why |
|------|-----|
| `packages/inkos-studio-server/src/writer-optimization/prose-boundary.js` | **NEW** — 高置信度首部 scaffold 检测、Strip、残留 hardFail；`writesCanon/SR/Reality=false` |
| `packages/inkos-studio-server/src/writer-optimization/beat-execution.js` | 在 `writeBeatWithRuntimeV2` LLM 返回后与终局 hardFail 合并前接入 Gate；复用既有 rewrite / `SCENE_HARD_FAIL` 通道 |
| `packages/inkos-studio-server/src/writer-optimization/index.js` | 导出 `applyProseBoundaryGate` / `isInternalBeatScaffoldLine` / `PROSE_BOUNDARY_VERSION` |
| `scripts/test-rf01-prose-boundary.js` | **NEW** — Ch3 S3 回归、FP、prompt echo、residual hardFail、authority / 11·13 |
| `package.json` | 增加 `test:rf01-prose-boundary` |
| `golden/story-architecture/RF-01-IMPLEMENTATION-REPORT.md` | 本报告 |

**未修改（故意）**：`scene-execution` / Review / Plan Validity / Observed Continuity / Canon writers / Runtime Orchestrator / Prompt 核心语义 / `BEAT_HARD_RULES` 文案保留。

---

## III. Boundary Behavior

### Strip（高置信度 · 仅拍首）

最多检查开头约 `PROSE_BOUNDARY_MAX_HEAD_LINES`（5）行；仅当行匹配内部 Beat grammar 或与本拍 `userPrompt` 头行近形回声时 Strip：

* `# Beat N/M：…` / `## 当前 Beat N/M：…`
* `### Beat N · Goal|Obstacle|Choice|Consequence|New Information|Hook…`
* 对应已知 `STRUCTURAL_LABELS` 形态

### Reject

Strip 后若首部仍是内部 scaffold，或全文仅剩 scaffold → `hardFail`，进入既有 rewrite / hardFail 路径；**不**对未知结构做强行全文清洗。

### KEEP

不确定 → 原样保留（对话里的「目标」、效率助手文案、合法 Markdown / 章标题等）。

### Case A–E（授权样例）

| Case | Result |
|------|--------|
| A `# Beat 1/6：Goal…` + 正文 | Strip 首行，保留正文 |
| B 「你的目标是什么？」 | KEEP |
| C `# 第三章 四点整` | KEEP |
| D 效率助手系统句 | KEEP |
| E 残留内部 scaffold | hardFail |

---

## IV. False Positive Tests

`npm run test:rf01-prose-boundary` 覆盖并 **KEEP EXACTLY**：

* 「你的目标是什么？」她问。
* 效率助手：请于四点前登记。
* 合法 Markdown（`**刷新**`）
* `# 第三章 四点整`
* `## 急诊大厅`
* 正文中部出现 “Beat” 字样（不做全文 scrub）

---

## V. HardFail Tests

* scaffold-only 草稿 → `hardFail`（不得脏写入 `scene.text`）
* 多层已知 header → Strip 至正文（不 hardFail）
* Gate hardFail → beat-execution 设置 rewrite hint，并 OR 进既有 `hardFail` / `hardFailReason`

---

## VI. F-Series Regression

全部重新跑通（Node 20）：

| Suite | Result |
|-------|--------|
| `test:f1-survival` | PASS |
| `test:f4-entity-hygiene` | PASS |
| `test:f4.1-raw-fallback` | PASS |
| `test:f5-time-contract` | PASS |
| `test:f6.2-observed-continuity` | PASS |
| `test:f7.1-beat-hardening` | PASS |
| `test:f8.3-plan-validity` | PASS |
| `test:phase1-r2` | PASS |
| `test:phase1-sr` | PASS |
| `test:eo-d1-final` | PASS |
| `test:rf01-prose-boundary` | PASS |

未破坏 F-Series 冻结契约。

---

## VII. Authority Regression

Gate 返回恒为：

* `writesCanon = false`
* `writesSR = false`
* `writesReality = false`
* `role = prose_boundary_gate`

对生产书目录执行 Gate 前后比对：

* `11_timeline.yaml` 未变
* `13_facts_db.yaml` 未变

未触碰 Choice / Plan / Actual / OC / Character SR 写入路径。

---

## VIII. Real Literary Validation

### Status: **LITERARY VALIDATION BLOCKED**

原因（诚实标记，不伪造 PASS）：

1. 本环境 **无可用 LLM API Key**（`DEEPSEEK_API_KEY` / `OPENAI_API_KEY` 等为空），无法安全重跑真实 Studio Beat Writer 路径。
2. 重跑 Ch3 S3 会改写生产 `ch_0003_scenes.json` 与下游状态；授权未要求强制污染生产盘。
3. 盘上 Ch3 S3 **仍保留**历史污染头 `# Beat 1/6：Goal（主角目标）`——Gate 只作用于**新一次** Writer 输出边界，不回写历史脏稿。

### Offline evidence（不等同 Literary PASS）

对生产 Ch3 S3 原文过 Gate：

* 首行 scaffold 被 Strip
* 正文首句 `凌晨3:59。病房的灯管开始闪烁。` 保留
* 无 Canon/SR/Reality 写入

待有 API 的人工/脚本重跑 Studio Beat 后，可将本节升级为 `LITERARY VALIDATION PASS`。

---

## IX. Known Limitations

1. **历史脏稿未自动净化** — 已落盘的 Ch3 S3 仍含 scaffold，直到该 Scene/Beat 被重新写入。
2. **仅识别已知内部 grammar** — 模型若发明全新 metadata 形态且不匹配 detector，可能 KEEP（设计：不确定 → KEEP）或需后续 Discovery。
3. **Strip 窗口有限** — 仅拍首约 5 行；刻意不做全文扫描。
4. **Literary path 未实跑** — 见 §VIII。
5. **软规则仍在** — `BEAT_HARD_RULES` 保留；本 Gate 是硬边界，不替代 Prompt。

**NOT AUTHORIZED / NOT DONE**：RF-02、RF-03、F8.3 repair、F6 repair、F8.4、F9、Narrative Design、新 Engine。

---

## X. Final Verdict

**PASS WITH KNOWN LIMITATIONS**

| Gate | Status |
|------|--------|
| Design Gate 授权范围 | 遵守 |
| Minimal prose boundary | 已实现 |
| Unit / FP / HardFail | PASS |
| Authority | PASS |
| F-Series regression | PASS |
| Real Literary Validation | **BLOCKED** |

### STOP

> RF-01 IMPLEMENTED → REGRESSION PASS → LITERARY VALIDATION BLOCKED → **STOP**

**不要**继续 RF-02。  
**不要**进入 F8.4 / F9。  
**不要**自行寻找下一个 Failure。

下一阶段必须重新经过：

`REAL FAILURE DISCOVERY → HUMAN DESIGN GATE`
