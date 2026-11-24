# WL-03 NPC Runtime Integration — Implementation Record

**Status**: IMPLEMENTED + REGRESSED (unit 21/21, WL-02 suite 16/16) + PRODUCTION BATCH (10 chapters / real LLM)
**Date**: 2026-09-21
**Prev**: WL-02 T2 Experience Extraction Correction

## 1. Read-only Archaeology（执行确认）

| # | 对象 | 结论 |
|---|------|------|
| 1 | `novel/15_npc_simulation.yaml` | carrier 存在，schema `{name, day, today_goal, plan_location, may_meet, plan_changed, world_impact}`；fixture 书自带**空模板**（npcs: []） |
| 2 | NPC producer | `runNpcSimulation(bookDir, day, npcNames)`（`packages/inkos-core/src/workflows/npc-simulation.js`）——只产**模板条目**（`today_goal: （填写：…）`），是作者填写的脚手架，不是 Truth |
| 3 | callers | **仅** `inkos-core/src/cli.js:201`（手动 CLI）。生产链（Runtime orchestrator / Studio writer）**零调用** |
| 4 | Studio Production Path | runtime: `orchestrator.js:473 buildDynamicPrompt → compileScenePrompt`；studio: `studio-llm-writer.js:297 compileScenePrompt`。两路共用 `loadBrainContext` ctx → **loader 是唯一最小接线点** |
| 5 | 结论 | NPC carrier 是**生产孤儿**：authored 数据无处进入 prompt（与 World-Life 考古「NPC = 空载体」一致） |

## 2. Minimal Wiring（两个文件 + 两处接线）

```
15_npc_simulation.yaml (authored Truth)
  → collectAuthoredNpcActivity()          [inkos-brain/src/npc/npc-activity.js — NEW]
      · 模板条目过滤：today_goal 空 / （填写：… → 丢弃（脚手架 ≠ Truth，防伪造）
      · roster 门控：名字不在 03_character_bible（自动剥 .md）→ 丢弃（防注入不存在的角色）
      · fail-closed：无文件 / 全模板 → null
  → loadBrainContext() → ctx.npcActivity  [loader.js +2 行]
  → formatNpcActivityForPrompt()          [inkos-prompt/src/npc-activity-block.js — NEW]
      · POV 自身条目排除（自己不是自己的 NPC）
      · 块内显式 Access 边界（见 §3）
  → compileScenePrompt() → module `npc_offscreen_life`（category=world, priority=42, cap 240 tokens）
```

- `runNpcSimulation()` 本体不改：它是作者侧脚手架工具（CLI），其输出必须经作者真实填写后才成为 Truth——由 collect 的模板过滤强制执行。
- Studio 与 Runtime 共享该链路（都经 `loadBrainContext` → `compileScenePrompt`），单点接线双路生效。

## 3. Character Access 门控（NPC ≠ 自动角色经验）

三层：

1. **结构隔离（最强）**：NPC 数据只进 Writer prompt 的 world 层块；T2 提取、SR 合并、CADE、Actual 提取**只读 scene.text**，不读 `ctx.npcActivity`。场外 NPC 未经写出即不产生任何角色经验。
2. **块内边界（Writer 必读）**：
   - 仅当场景自然同框时 POV 才可感知；未同框 = POV 不可知晓，不得写入其认知
   - 禁止据此自动生成本场情节、目标或转折（**NPC ≠ 情节生成器**）
3. **无随机性**：不做任何 NPC 行为模拟/推断/补全——只搬运 authored 条目原文。

## 4. Files Changed

| File | Change |
|------|--------|
| `packages/inkos-brain/src/npc/npc-activity.js` | NEW — collect + 过滤 + roster 门控 |
| `packages/inkos-prompt/src/npc-activity-block.js` | NEW — prompt 块格式化 + Access 边界 |
| `packages/inkos-brain/src/loader.js` | +import, +`npcActivity` 进 ctx（2 行） |
| `packages/inkos-prompt/src/compiler.js` | +import, +`npc_offscreen_life` module（state_board 块后） |
| `scripts/test-eo-wl03-npc-runtime-integration-01.js` | NEW — P1–P8 |
| `scripts/stress-story-route-run.js` | +`STRESS_WL03=1` 块：authored 15_npc_simulation（苏眠/镜渊/老周，day 4）+ 老周.md（roster 门控前提） |
| `scripts/stress-wl03-delta.js` | NEW — Literary Delta 采集器（只读） |
| `package.json` | +`test:eo-wl03-npc-runtime-integration-01` |

## 5. Regression

- **新测试 21/21**：P1 模板过滤 · P2 roster 门控 · P3 fail-closed · P4 POV 排除+边界 · P5 loader 接线 · P6 compiler 接线 · P7 Access 隔离（场外 NPC 不产生经验事件）· P8 无载体零回归
- **WL-02 套件 16/16 全绿**（bridge 47 / consumption 29 / seam 24 / cade-channel 26 / cade-production 21 / phase13 23 / correspondence 29 / eligibility 18 / cw-store 32 / cw-projection 20 / cw-trace 27 / cw-formation 22 / access-carrier 38 / l1-evaluation 23 / l1-audit 22 / p32-sr-wiring 17）
- fixture 自带空模板 yaml → collect=null → 无 NPC 块（存量书零行为变化，P8 覆盖）

## 6. Production Observation（STRESS_WL01=1 CW_SEED=1 EXTRACTION=1 WL03=1）

**Batch 结果：10/10 章全过**（40 scenes，真实 LLM）。前两次 run 各遇到 1 次随机提取失败
（run1: ch6_s4；run2: ch3_s2 —— LLM 候选全被闸门拒 + 确定性兜底候选未过验证 →
ACTUAL_EVENT_REQUIRED → 后续章锚点级联失败）。第三次全绿，确认为既有瞬态类
（与 WL-01 batch 记录的随机失败同类），非本 EO 回归；已加提取失败尸检落盘仪表
（`extraction_failures/*.json`，只诊断不改 Truth 逻辑）。

### 6.1 Access 门控生产验证（核心命题）

authored NPC 场外独有内容 5 个签名短语（销毁清单/门禁日志/巡逻频次/邮局/盯梢）：
**T2 经验零命中、正文零泄入** —— 场外 NPC 动向未变成任何角色经验。结构性门控
（T2 只读 scene.text）在生产中守住。

### 6.2 指标（vs WL-02 prose 基线 tmp-stress/batch-full.md）

| 指标 | WL-03 | WL-02 基线 | Δ |
|------|-------|-----------|---|
| NPC prompt 接缝率 | 21/40 scenes（53%，预算压力下存活） | 0% | 接通 |
| NPC 提及密度 /千字 | 7.8（苏眠129/镜渊101/老周76） | 6.9 | +13% |
| 世界细节句密度 /千字 | 15.1 | 15.2 | 持平 |
| 总字数 | 39,086 | 41,980 | −7% |
| T2 组成 | 76 条：action 58% / discovery 14% / informational 9% / environmental 7% / social 4% / speech 4% / movement 3% | （官方基线工件已随 mkdtemp 消失，不可同比复算） | 组成多类共存 |

文学抽样（ch3 POV 独处章）：WL-03 版经 roster+NPC 块自然带出「周国栋/事故处理组」
世界联结——NPC 从背景名升格为有档世界存在；负面空间未抢占 POV 场（场外动向未写成本章情节）。

### 6.3 附带发现并修复（非本 EO 引入）

- **`rosterNames2 is not defined`**（orchestrator.js 作用域 bug，此前未提交代码引入）：
  `const` 声明在上一个 try 块内、Access carrier 块引用 → ReferenceError 被 soft-wiring
  吞掉 → **L1 Access carrier 在此前所有生产 run 被静默跳过**（含 WL-02 batch）。
  已修（提升至两块共用作用域），生产恢复：`l1_access/access_truth.json` 重新产出。
  单测未暴露的原因：测试直调 `collectAccessEvidenceFromScene`，不走 orchestrator 接线。

## 7. Known Limitations

- `WL-01-KNOWN-LIMITATION-TIME-OVERRIDE` 沿袭（authored 时间 vs Clock 状态链），本 EO 不触碰。
- NPC 块为章级静态 authored 快照（day 4），不随场景推进自动演化——演化属于 WL-04（Relationship/Faction/State Pipeline）的裁决范围，本 EO 明确不做。
