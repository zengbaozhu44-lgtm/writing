# R2-EO — Experience Consequence Semantic Split — Implementation Record

**Status**: IMPLEMENTED + REGRESSED + PRODUCTION（DeepSeek clean batch）
**Date**: 2026-10-08
**Seal**: R2 Human Seal 2026-10-08（Q1=NO · R2-ii · Risk 7 立法 · 禁 kind 机械表）

## 1. 语义缺口报告（EO §5.1 要求）

判别**已存在于数据语义中，无需新增 ontology/schema/carrier**：

- **Experience** = StoryEvent 本体（excerpt 逐字 + action grounding + actorEvidence + source 禁令门下的事实条目）；Seal 裁定 consequence = OPTIONAL
- **World Consequence Assertion** = **非空 consequence 即断言标记**（WL-02 契约原文：consequence 须为「正文明确呈现的世界变化原文短语，逐字摘自正文」）；其「REQUIRED + 独立 grounding」已由**两层既有机制**执行：
  - gateCandidate（producer 层）：非空 consequence 必须 non-echo + aftermath 接地，否则 `consequence_echo_or_ungrounded` 拒绝
  - WCT `occurrenceYieldsGroundedWorldChange`（Truth 层）：空/未接地/回声 → W 恒 absent

唯一缺口 = validator 的无条件 `missing_consequence` 与 Seal 冲突。

## 2. Minimal Implementation

| 文件 | 改动 |
|------|------|
| `event-validator.js` | 移除 `missing_consequence` 无条件必填；头注释重写为 Seal 语义（Experience optional / 非空=断言标记 / 独立 grounding 在 gate+WCT / Risk 7 立法）。**零 grounding 门触碰** |
| `story-event.schema.js` | 仅 jsdoc：consequence 标注 OPTIONAL + 断言标记语义（无 schema 变更） |
| `scripts/test-eo-r2-consequence-split-01.js` | NEW — Seal 回归 23 断言 |
| `scripts/test-phase13-extraction.js` | 测试接线修复（见 §4） |

无 kind 表、无新 ontology、无公式填充、R1/R3/WCT/L1/L2/T2/CW 零改动。

## 3. Seal 回归（新测试 23/23）

- **正 1–9**：informational/social/environmental/daily/speech/action/discovery/movement/presence + 空 consequence → 全 PASS（无 kind 机械表——因为根本没有表，空即合法）
- **负 10–14**：未发生 action / 相似未现 action / 坏 excerpt / 坏 actorEvidence（gate 层）/ source 禁令 → 全 FAIL（防线零降级）
- **负 15–16**：WC 断言+空 consequence → W 不成立（WCT）；WC 断言+未接地 → gate 拒 + W 不成立（双层）
- **边 17–21**：不入 State Evolution（timeline 恒空）/ 单次经历不成 Belief（T3 双通道）但入 T2（记录≠成型）/ SR 无 Goal/Desire/Choice 槽 / **公式化 consequence 亦无法通过 WCT 复验**（Risk 7 行为级验证）

## 4. 全量回归（21 套）+ 一处测试接线修复（如实报告）

20/21 全绿；**phase13 出现 1 fail——定性为非 Truth 边界回归**：用例「source 越权（plan）→ 拒绝」的构造是把 `source:'plan'` 注入 LLM 候选，但 LLM 路径**自铸 source='annotated'**（防伪造设计，候选自报 source 到不了 validator）——R2 前该用例靠 `missing_consequence` **误通过**（锚定错误机制）；R2 后空 consequence 合法，误通过消失暴露了接线错误。`forbidden_source` 门本身完好（R2 测试 14 直测）。修复：该用例改走 validator 直测（测其声明的意图），非 Truth 修补。修复后 phase13 **23/23**。

全量：phase13 23 / bridge 47 / consumption 29 / seam 24 / cade 26+21 / correspondence 29 / eligibility 18 / access 38 / l1-eval 23 / l1-audit 22 / cw 32+20+27+22 / p32 17 / wl03 21 / wl04 18 / extract-harden 12 / r2-split 23 / reality-golden OK / story-route ALL PASS。

## 5. Production Validation（DeepSeek clean batch）

DeepSeek 已恢复（200）。batch 结果见完成报告（章完成率 / 提取失败 / T2 组成 /
presence 率——预期内心高潮场 experiential 条目保留、presence 率下降）。

## 6. Rescan 与后续

见 R2-EO 完成报告（TOTAL STORY ROUTE RESCAN + WL-05 判定）。本 EO 后 STOP，不自动开 WL-05。
