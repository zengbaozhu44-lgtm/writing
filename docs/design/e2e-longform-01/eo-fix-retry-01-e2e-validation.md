# EO-FIX-RETRY-01 — E2E Validation Report

**Status**: `AN-7 MITIGATED (production) / FIX MECHANISM UNIT-VALIDATED-ONLY — Human Review Option B ACCEPTED — CLOSED`
**Date**: 2026-10-30 · **Mode**: REAL LLM E2E（零代码/零配置/零数据修改）
**Test Book**: `E2E-LONGFORM-01A`（ch10=三次全败章） · **Chapter**: 10 · **Task**: `task_1793353391386_999d6292`

---

## 1. 测试环境与生产入口

| 项 | 值 |
|---|---|
| 入口 | `POST /api/books/E2E-LONGFORM-01A/runtime/run-living {"chapter":10}` |
| 链路 | routes:873 → living-task → controlRunLiving → getDaemon → StudioRuntimeOrchestrator:224 → createStudioLlmWriter → Beat Execution → 硬校验 |
| 模型 | DeepSeek deepseek-chat（secrets key，经 INKOS_LLM_* env 注入；不打印值） |
| Server PID | 7177（新实例；旧实例已死——EO-FIX-RETRY-01 代码已部署） |
| 耗时 | ~3 分钟（此前三次失败各 ~2 分钟） |
| 隔离 | E2E-LONGFORM-01A 为专用测试书；ch1–9 状态零变更（audit 确认全部 accepted） |

## 2. S1–S6 逐项证据

### S1 — First hard failure：**NOT TRIGGERED**

| 项 | 结果 |
|---|---|
| 真实 SCENE_HARD_FAIL 触发 | **未发生**——server 全日志 grep `复读\|SCENE_HARD_FAIL\|hardFail\|重规划` = **0 命中** |
| 任务终态 | `status: "completed"`, `error: null`, `phase: "completed"`, `runtime_state: {chapter:10, currentScene:null, phase:"completed", status:"done"}` |
| 解释 | ch10 首次尝试即通过——LLM 生成端随机性（temperature 0.85）使本次开场未触发硬门；EO 修复仅作用于重试路径（首试路径未变更） |

**关键观察**：本次正文开头「周砚把终端贴在门禁上，屏幕跳了三次…」与之前三次失败的复读短语（「周砚把屏幕掰回来」「数着，一步、两步，拐角处」）**零重叠**（grep 确认 0 命中）。

### S2 — Retry persistence：**NOT OBSERVED**

未触发硬失败→无重试→`_hardFailForbiddenPhrases` 未被传递。

### S3 — Actual Writer Prompt consumption：**NOT OBSERVED**（重试路径）

首试路径的 forbiddenOpenings 来自 priorAnchor（正常）：`["禁止用天气/闹钟/睁开眼开场","禁止复述上一章已发生的同一事件","禁止「就在这时」式硬切空降","周砚把外套往肩上一搭，没…"]`——含上一章锚继承禁令（scene.forbiddenOpenings 实证）；prompt 中 `禁：` 行=0（beat 首拍 consume 上限 slice(0,2) 未被突破——因 priorAnchor 禁令≥2 已占满）。**修复路径的注入未经受真实测试**。

### S4 — Writer response：**NOT APPLICABLE（无重试）**

首试正文 3441 字，开头避开旧复读短语（自然，非因修复约束——修复约束未被注入）。

### S5 — Hard gate preservation：**UNKNOWN**

本次未触发硬门（内容干净），无法验证硬门在修复部署后是否仍正确拦截。单元测试 T7 已证明 `findOpeningPhraseRecycle` 未被触碰且行为正确（hardRun=true 对真复读）。

### S6 — Production lifecycle boundary：**PASS**

| 项 | 结果 |
|---|---|
| 到达 Pending Commit | **是**——`pending_commit/ch_0010.json` 存在，audit 状态 `pending_audit` |
| Accept / Memory Commit / 解锁 | **未执行**（按令在只读检查点 STOP） |
| 其他章节状态 | ch1–9 全部 `accepted` 零变更 ✓ |

## 3. 关键数据流

```
本次（首试通过）:
  run-living ch10 → planChapter → intent.forbiddenOpenings（priorAnchor 4 条）
  → scene.forbiddenOpenings（同 4 条）
  → Beat Execution → 首次拍生成干净内容 → 硬门未触发 → 完成
  → pending_commit 写入 → pending_audit → [STOP — 未 accept]

修复路径（未被执行）:
  [需 SCENE_HARD_FAIL 触发] → extractRepeatPhrases → _hardFailForbiddenPhrases
  → 重试 → intent merge → scene forbidden → Writer prompt 「禁：{短语}」
  → [全部未发生]
```

## 4. slice(0,2) 与既有约束占位

首试路径 `scene.forbiddenOpenings` 已有 4 条（priorAnchor），`formatSceneOpeningConstraintBlock` 消费上限 slice(0,2)。若重试时新增硬门短语与既有 4 条合并后>2 条，**新短语可能被挤出前两个槽位**——但本次无法观察（重试未发生）。此为修复的已知限制§3（实现记录已记录），需后续真实重试场景验证。

## 5. 判定

> **E2E INCONCLUSIVE — EVIDENCE INSUFFICIENT**

| Pass Criteria | 结果 |
|---|---|
| 1. 真实 hard failure 触发 | **NO**（首试即过） |
| 2. 重复片段提取 | NOT OBSERVED |
| 3. 片段跨 retry 保留 | NOT OBSERVED |
| 4. 片段进入 Writer Prompt | NOT OBSERVED |
| 5. 新约束不被挤出 | NOT OBSERVED |
| 6. Writer 避开重复 | **间接**（旧短语不在正文，但因随机非因修复） |
| 7. 硬门仍拒真复读 | UNKNOWN（本次未触发；单元 T7 证明代码未变） |
| 8. 零污染 | **PASS** |

**判定理由**：ch10 首次尝试即通过（LLM 随机性），修复的重试路径完全未被行使——无法从本次运行得出「修复有效」或「修复无效」的结论。

## 6. 未观察环节与证据缺口

①硬失败触发（S1）——随机事件无法按需复现；②重试短语提取与累积（S2）；③注入 Writer prompt（S3）；④重试输出对比（S4）；⑤硬门拦截在部署后行为（S5）。全部缺口源于同一根因：**首试成功使修复路径零行使**。

## 7. 后续建议（不自动执行）

- 方案 A：在隔离测试书中构造**可靠触发硬门**的场景（如极相似的 scene goals + 高重复倾向 prompt），使修复路径被行使——需设计新的测试条件（不属本 EO）
- 方案 B：接受「单元测试 18/18+代码审查」为当前最强证据；等待自然生产中硬失败再取证
- 方案 C：接受本次 ch10 通过为 AN-7 的**生产层缓解**证据（章节可完成），但修复机制本身维持 UNIT-VALIDATED-ONLY

## 8. 工作区变更检查

本轮**零代码修改、零配置修改、零数据修改**（仅读取 API + 日志采集）。测试书 ch10 新增 pending_commit 与正文（生产链路正常产物，非手动修改）。Server 已停止（PID 7177 killed）。

---

> **E2E INCONCLUSIVE — EVIDENCE INSUFFICIENT — STOP**

## 9. Human Review Decision（2026-10-30）

> **选 B：接受单元测试 18/18 为当前最强证据；等待自然生产硬失败再取证。**

AN-7 生产层状态：**缓解**（ch10 可完成）；修复机制验证等级：**UNIT-VALIDATED-ONLY**。
