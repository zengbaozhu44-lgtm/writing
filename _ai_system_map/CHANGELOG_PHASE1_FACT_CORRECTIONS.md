# CHANGELOG — Phase 1.6 文档事实校正

> 日期：2026-08-19 ｜ 范围：`_ai_system_map/*.md`（只改文档，零代码改动）
> 目的：Phase 1（删死代码 / 清假能力）落盘后，本认知包对四处事实仍持有**过时断言**（"replan 假 / AB 假 / chapter-pipeline 伪 AB / narrative-runtime 全废"），会让接手 AI 把**真能力判死**。本次按「旧断言 → 新事实 → 证据」逐处校正。
> 原则：**文档跟随事实，不提前设计未来**。不做重画系统图、不改模块命名、不引入新命名（如 RecoveryIntent）、不移动 narrative-runtime。

---

## 证据基线（2026-08-19 代码快照）

| 事实 | 代码证据 |
|---|---|
| replanIntent 是真信号 | `packages/inkos-runtime/src/pipeline/orchestrator.js:336-348` `_resolveChapterResult`：`pass!==false || !replanIntent || force` 才不重入；`:342-348` `chapterReplanCount >= maxReplan` → `replanExhausted:true`；`:353-354` 用 replanIntent 为 presetIntent 重入 `_runChapter` 并标 `_replanSource`；`:39` `maxReplan` 默认 3；`:149-172` presetIntent 优先于 authored-plan |
| replan 真消费已被测试固化 | `tests/golden-baseline/replan-three-state.js`：态1 不重入 / 态2 有界重入 / 态3 预算耗尽无递归 / 态4 守卫失败拒绝重入 |
| 生产伪 AB 块已删 | `chapter-pipeline.js`（342 行）grep 无任何 AB/temperature 双路逻辑，仅 :115 `temperature: 0.3` 单生成参数 |
| AB 基础设施保留、生产零调用 | `ab-test.js` 导出 runTemperatureAbTest/buildAbComparisonReport/loadAbReport 等；生产调用方**仅** `index.js` 重导出（SDK 面）+ `cost-controls.js:45 shouldRunAbTest`（兼容导出）+ `diagnosis-service.js:142 loadAbReport`（Studio 诊断 UI）。pipeline/orchestrator/daemon 零调用 |
| narrative-runtime 半活 | 活：`EMOTION_WAVE`/`PEAK_EMOTIONS`/`FLAT_EMOTIONS`/`validateEmotionWave`/`suggestNextEmotion`（`reader-emotion-engine.js:14-18` 导入）、`assertInformationGapMeaningful`（`chapter-director.js:50`、`scene-execution.js:57`）。死：`createNarrativeState`/`applyNarrativeBeat`/`updateNarrativeStateAfterBeat`/`NarrativeRuntime` 类，生产 src 零消费，仅 `scripts/test-narrative-runtime.js` |
| Phase 1 已删 4 文件 | `director-bridge.js` / `plan.js` / `checkpoint.js` / `decision-check.js` 磁盘已不存在 |

---

## 校正 1 —— replanIntent：假字段 → orchestrator 消费的有界恢复控制信号

**旧断言**：`replanIntent（不真replan）`；「metrics/validation 返回 replanIntent 但 orchestrator 不消费」。

**新事实**：chapter 级 replanIntent 是**真**有界重入信号。metrics/validation 失败 → 携带 replanIntent → `_resolveChapterResult`（orchestrator.js:336）消费 → 以 presetIntent 重入 `_runChapter`，预算 `maxReplan=3`，打满置 `replanExhausted` 不再递归。

**真正的"降级为假"是 story-thread 层**：`shouldReplan/replanReason` → 仅作 adaptive hint（见 14 #6），本阶段仅如实区分，不做重新设计。

| 文件 | 位置 | 改动 |
|---|---|---|
| 02_runtime.md | §4.4 流程 `analyzeMetricsFeedback` 行 | `（不真replan）` → `（orchestrator.js:336 有界重入 _runChapter，≤maxReplan=3）` |
| 02_runtime.md | 结论第 3 条 | `Metrics/Validation replan 假` → `replanIntent 为 orchestrator 消费的有界恢复信号（story-thread shouldReplan 仍降级为 adaptive hint）` |
| 09_validation.md | §15.1 流程行 + §15.5 第 2 条 | 同 02；§15.5 改为「chapter 级为真、story-thread 降级」 |
| 07_prompt_llm.md | §12.5 第 3 条 | `不实际 replan` → `有界重入（≤maxReplan=3，打满 replanExhausted）；降级的是 story-thread shouldReplan` |
| 14_architecture_problems.md | 能力表 #9 + 问题 #7 | `replan 假` → `replanIntent 为有界真重入`；#7 改判「已收敛」 |
| 15_ai_handover.md | 五大坑 + 真/假表 | `metrics/validation 的 replan 是假的` → `replanIntent 为有界真重入（≤3）；story-thread shouldReplan 降级` |

---

## 校正 2 —— AB test：已废弃 → 生产 AB 入口删除，测试/诊断基础设施保留

**旧断言**：`Temperature AB (每5章) 两个温度返回同一份文本 —— 假 AB`。

**新事实**：生产**入口**已删（Phase 1）——`runTemperatureAbTest` 在真实生成链零调用。`ab-test.js` 作为**基础设施保留**：SDK 重导出（index.js:10-13/37）+ 诊断 UI `loadAbReport`（diagnosis-service.js:142）。不存在"两温度同一文本"的伪信号。

| 文件 | 位置 | 改动 |
|---|---|---|
| 02_runtime.md | §4.4 `Temperature AB` 行 + §4.5 时序链 | 伪 AB → `生产伪 AB 调用块已删（Phase 1）；ab-test.js 保留给测试/诊断`；时序链移除 `AB→` |
| 02_runtime.md | 结论第 3 条 | `AB test 假` → `生产伪 AB 调用块已删（Phase 1）` |
| 07_prompt_llm.md | §12.5 第 1 条 | 整条改写：入口已删、基础设施保留、`diagnosis-service.js:142 loadAbReport` |
| 08_writer.md | §14.3 | `Temperature AB 假` → `生产入口已删（Phase 1），不再存在伪信号` |
| 09_validation.md | §15.1 行 + §15.5 第 1 条 | 同 02 / 07 |
| 14_architecture_problems.md | 能力表 #9 + 问题 #7 | 移除 `AB 假`；#7 改判「已收敛」 |
| 15_ai_handover.md | 五大坑 + 真/假表 | `伪特性（AB、replan…）` → `生产伪 AB 已删…`；表行 `AB test ❌ 两温度同一文本` → `生产入口已删；ab-test.js 基础设施保留（report/load，诊断 UI 用）` |
| 12_dependency_graph.md | 章管线图 | 从 `reader-simulator(2×LLM)/optimizer/AB/adaptive/storyHealth` 移除 `AB/` |

---

## 校正 3 —— chapter-pipeline：存在 AB 逻辑 → 已删除生产伪 AB 调用块

**旧断言**：`chapter-pipeline.js:198-207` 的 `generateFn` 对两个 temperature 返回同一 `workingText`。

**新事实**：该伪 AB 调用块 **Phase 1 已删**；`chapter-pipeline.js` 现 342 行，grep 无 AB 逻辑，仅 :115 `temperature: 0.3` 单生成参数。文档中所有 `chapter-pipeline.js:198-207` 引用改为**历史引用**（"原 …已删"）。

| 文件 | 位置 | 改动 |
|---|---|---|
| 07_prompt_llm.md / 08_writer.md / 09_validation.md / 14_architecture_problems.md | 各处 198-207 引用 | 统一改为「原 198-207 伪 AB 块已删」 |

---

## 校正 4 —— narrative-runtime：全废 → 状态机废弃、情绪能力仍被生产消费

**旧断言**：`narrative-runtime.js` 列于"死重引擎 / 全废"。

**新事实**：**半活**。状态机四件套（`createNarrativeState`/`applyNarrativeBeat`/`updateNarrativeStateAfterBeat`/`NarrativeRuntime`）生产零消费、仅测试脚本引用（死）；情绪能力（`EMOTION_WAVE`/`PEAK_EMOTIONS`/`FLAT_EMOTIONS`/`validateEmotionWave`/`suggestNextEmotion`/`assertInformationGapMeaningful`）被 `reader-emotion-engine.js`/`chapter-director.js`/`scene-execution.js` 生产消费（活）。外科拆分为 Phase 2 动作，本阶段**只改文档表述、不动代码**。

| 文件 | 位置 | 改动 |
|---|---|---|
| 01_architecture.md | 包职责表 director 行 | `死重引擎：narrative-runtime.js/…` → `Studio 重引擎（多数可达，见 13 B4）…；narrative-runtime.js 半活（状态机废弃，情绪能力仍被消费）`；`writer-runtime-v2.js` 移出死名单（活，beat-execution 经 @inkos/director 消费） |
| 13_dead_code_and_fake_features.md | B1 | 整节改写为活/死两清单 + 生产消费方 `file:line` 证据 |
| 05_directors.md | §7.1 真死代码段 | narrative-runtime 描述保持（原已准确），删除的 trio 标注 Phase 1 |

---

## 顺带修正 —— Phase 1 已删文件的文档残留

Phase 1 删除了 `director-bridge.js` / `plan.js` / `checkpoint.js` / `decision-check.js`，但 13 与 05 仍按"存在但死"描述。本阶段按事实改为"已删"（不改动 B 节结构）。

| 文件 | 位置 | 改动 |
|---|---|---|
| 13_dead_code_and_fake_features.md | B2 / B2b / B3 / 修正旧判定 / D 表 / 文末注 | 四处"孤儿"改为 **Phase 1 已删**；现存真死代码仅 narrative-runtime 状态机 |
| 05_directors.md | §7.1 真死代码段 + §8.1 注意 + 死代码表 | director-bridge/plan/checkpoint 标注已删；`decision-check.js 死代码` → `已删（Phase 1）` |
| 02_runtime.md | §3.x 定义/包装清单 | `director 的 plan.js（deprecated 别名）` 标注 Phase 1 已删 |

---

## 未做（按指令明确保留）

- 未重画系统图、未改模块命名、未移动 narrative-runtime（拆分是 Phase 2）。
- **未引入 RecoveryIntent 等新命名** —— 文档只描述现状，不提前设计未来。
- story-thread `shouldReplan/replanReason` 降级为 adaptive hint 是**实现事实**，本阶段仅如实记录（14 #6、07 §12.5、09 §15.5），其重新设计留待 Phase 2。

## 验证

- `grep -rnE "假 AB|AB test 假|不真replan|replan 假|两温度返回同一|不消费它去做 replan|198-207（未加'原'）|narrative-runtime.*全废" _ai_system_map/` → 无陈旧断言残留（198-207 仅以"原…已删"历史引用形式存在）。
- 代码零改动：`git status` 仅 `_ai_system_map/` 内文件变更。
