# F5 — Time Semantics Contract Report

**Date**: 2026-09-07  
**Verdict**: **F5 = PASS**  
**Mode**: TARGETED HARDENING + CONTRACT TEST + REGRESSION + REAL PRODUCTION VALIDATION  

---

## 1. InkOS 当前时间来源（审计实查）

| Source | Where | Semantic |
|--------|--------|----------|
| `chapter` | Runtime / Memory / 11 entry.chapter | **Narrative Order** |
| `scene.index` / `beat.order` | Scene / Beat pipeline | **Narrative Order** |
| `intent.time` / `intent.currentDate` | Planner / plan.json / Writer | **Current Story Clock** (primary) |
| `scene.time` / `scene.storyDate` | Scene fields | Story Clock candidate |
| `resolveStoryClock()` | inkos-core | Current Story Clock resolver |
| `08_current_state`「时间」 | Canon state | Story Clock fallback source |
| prior scene text / summaries / prior excerpt | Prompt L2–L4 | **Historical Reference** (when labeled) |
| `anchor.current_date` | Memory hierarchy / planner | Story Clock seed |
| `11_timeline.yaml` `days[].day` | Canon timeline | **World Event Day** (when known) |
| `11_timeline.yaml` `days[].chapter` | Canon timeline | Narrative chapter tag（≠ day） |
| `days[].time` / `events` | Canon timeline | Clock-of-day / event list |
| ~~`day \|\| chapter`~~ | **REMOVED** from state-updater | was silent World Day pollution |
| ~~`Day ${chapter}`~~ | **REMOVED** from 08 builder / brain-context-sync invent | was chapter→Day |

---

## 2. 四种正式语义

1. **Narrative Order** — `chapter` / `scene.index` / `beat.order`（顺序，不是日期）  
2. **Current Story Clock** — `resolveStoryClock().canonical`（现在；优先于 historical）  
3. **Historical Reference** — 旧摘要 / prior /「六月十七日那天…」（≠ current）  
4. **World Event Day** — `11.days[].day` 仅在可证明时；否则 `null` / unknown  

---

## Implementation

| File | Change |
|------|--------|
| `packages/inkos-core/src/lib/time-semantics.js` | **NEW** contract helpers |
| `packages/inkos-brain/src/memory/state-updater.js` | 阻断 `day\|\|chapter`；08 时间 → unknown |
| `packages/inkos-studio-server/src/brain-context-sync.js` | 不再 `Day ${chapter}` 发明 |
| `packages/inkos-studio-server/src/living-novel-engine.js` | 去掉 chapter→Day fallback |
| `packages/inkos-core/src/lib/story-clock.js` | 注释：chapter ≠ clock |
| `scripts/test-f5-time-contract.js` | Test A–G |
| `package.json` | `test:f5-time-contract` |
| `golden/story-architecture/run-validation-f5.js` | 真跑 |

---

## Completion answers

| # | Answer |
|---|--------|
| 1 | 见上表 |
| 2 | 见四种语义 |
| 3 | **是** — `classifySceneIndex` + 无代码把 index 当 world day |
| 4 | **是** — state-updater / brain-context-sync / living-novel 已阻断 |
| 5 | **是** — Clock=10月27日；June 仅 historical；F3 types 不混 |
| 6 | **是** — EO-P2 events/facts 仍空；plan 日期不写 11/13 |
| 7 | **否** — 未新增 occurrence_at / narrated_at；`day: null` 表示 unknown |

---

## Regression

**PASS** — f5 / f4.1 / f4 / f3 / f2 / f1 / phase1-r2 / phase1-sr / eo-d1-final

## Real Production

`凌晨四点世界刷新` Ch2 S1–S3：Canonical **10月27日**；June ≠ current；chapter≠date；正文可用。

产物：`golden/story-architecture/validation-f5/`

## Remaining Gaps

- 历史 11 yaml 中 day≈chapter 的**旧数据**未 scrub（仅阻断新 silent fallback）  
- Studio 若依赖「自动 Day N」对齐，现须提供真实 `intent.time`  
- 双轴 Engine / Flashback：**未做**（按冻结）

```text
F5 = PASS
```
