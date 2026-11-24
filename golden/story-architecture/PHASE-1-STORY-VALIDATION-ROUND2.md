# Phase 1 Story Validation — Round 2 Report

**Date**: 2026-09-04  
**Mode**: Observation only · **NO production code changes** · **NO SR field expansion**  
**Artifacts**: `golden/story-architecture/validation-round2/`  
**Runner**: `run-validation-round2.js` (observation harness only; not a Validator product)

---

## Setup

```text
Book:     凌晨四点世界刷新
Chapter:  2
Scenes:   1–3 (continuous generation)
Path:     loadBrainContext
          → buildDynamicPrompt (= compileScenePrompt)
          → buildSceneWritePrompt
          → createLlmWriter
```

Confirmed on all 3 scenes:

```text
sr_in_compileScenePrompt = true
sr_in_writer_prompt      = true
```

### Minimal SR at load (no injected test data)

```text
苏晚:
  Awareness = omit
  Stance    = omit
  Motive    = omit
  Affect    = omit
  Validity  = current
  seeds     = 2 (bible long-term only; not Motive)
```

06 knowledge / 05 relationships remain empty in book — mirror correctly empty. **Did not pad SR for the test.**

---

## Axis verdicts

### A Information Boundary = REAL FAILURE

**Case RF-R2-A1** — Scene 1

```text
Observed:
- 苏晚未进洗手间，却叙述镜中血字内容（「她没有去洗手间。她知道里面有什么。」随后直接描写血字）。
- 结尾断言：「她是唯一看见的另一个人」「她第一次看到了世界刷新的痕迹」「她再也无法相信昨天是普通的一天」。

Expected (given current SR):
- Awareness/Stance = omit → 不应从空投影长出「已确认世界刷新 / 自己是第二清醒者」的确信。
- 限知：未进入的空间不应全知描写。

Current SR:
- 全 omit

Writer Input:
- Character Subjective State 块在 prompt 中（omit）
- Scene goal/conflict 大量描述「林夜确认刷新 / 唯一清醒者」

Why Writer Wrote Wrong:
Writer 未把 SR omit 当作认知刹车，反而从 Scene Goal 把「世界刷新」叙事权限灌进苏晚主观，并出现未在场全知。

Classification:
Writer / Prompt Consumption Failure
（SR 在场但 omit 未被当作约束；Goal 冒充人物知悉）

SR Gap Candidate: NO
（证据库本就空；加字段不能代替「omit 须限制越界确信」的消费纪律）
```

**Case RF-R2-A2** — Scene 2 opening

```text
Observed:
「她知道六月十六日发生过什么。她亲眼看见林夜摔倒…」

Current SR: Awareness = omit

Why:
Goal/conflict 关于林夜记忆与伤疤消失 → Writer 直接赋给苏晚完整目击确知。

Classification:
Writer / Prompt Consumption Failure

SR Gap Candidate: NO
```

Note: Bible omniscient secret（观察节点）本轮正文仍未写成「她知道自己是节点」→ 该项仍非 REAL FAILURE（与 Round 1 一致，仅风险）。

---

### B Character Continuity = REAL FAILURE

**Case RF-R2-B1** — date / world continuity across Scene 1→2

```text
Observed:
Scene 1: 「2045年10月14日」
Scene 2: 「六月十七日」

Expected:
连续三场应共享同一故事历法，除非有重置事件被写出。

Why:
计划壳目标在章间复用冲突模板，Writer 未延续上一场已落地的日期。

Classification:
Plan / Entity / Runtime-State Failure（历法不一致）
≠ SR Gap

SR Gap Candidate: NO
```

Emotional thread (她介入异常、不敢完全否认林夜) 有弱连续，但被历法断裂压过 → 轴级仍记 REAL FAILURE。

---

### C Contradiction Preservation = PASS

```text
Scene 1: 继续像机器一样录入 vs 心跳失控 — 未强行收成单一「她其实已完全信了/完全不信」。
Scene 2: 不说他疯、也不说世界错 — 停在无法归类的异常。
Scene 3: 苏晚对「录像」不知情 + 怀疑他是否疯 — 与「她已是第二清醒者」的 Scene1 结尾有张力，但未在本场把矛盾消解成一个标准答案。

无「感觉应该更复杂」类主观批评；按纪律记 PASS。
```

---

### D Action Plausibility = PASS

```text
在 Goal 驱动下，询问日期、查终端、被拖去洗手间等行动可从「卷入异常的同事」叙事推出。
未使用「心理学上她应该…」作为失败依据。
Scene1 洗手间进出叙述混乱记入 A 轴，不在此重复升格。

D = PASS
```

---

## SR Consumption

```text
SR Consumption = present_in_prompt; omit_constraint_not_observed
```

含义（非评分）：

| Check | Result |
|-------|--------|
| Character Subjective State 是否进入 Writer prompt | **Yes**（3/3） |
| Writer 是否明显受 **omit** 约束（少发明确知） | **No** — 仍从 Goal 灌入确知 |
| 分类（若论失败） | **Writer / Prompt Consumption Failure** |
| 是否因此扩 SR | **No** |

空镜子被「看见」了，但没有被当成刹车。这不是「再加一个 SR 字段」能修的；也尚未授权 Prompt 大改（本阶段禁止）。

---

## REAL FAILURE summary

1. **RF-R2-A1** — Scene1 未在场全知 + 自称第二清醒者 — Writer/Prompt Consumption  
2. **RF-R2-A2** — Scene2 空 SR 下目击确知 — Writer/Prompt Consumption  
3. **RF-R2-B1** — 日期 10/14 vs 6/17 — Plan/State continuity  

```text
SR GAP CANDIDATE:
none
```

---

# Final block

```text
A Information Boundary = REAL FAILURE
B Character Continuity = REAL FAILURE
C Contradiction Preservation = PASS
D Action Plausibility = PASS

SR Consumption = present_in_prompt; omit_constraint_not_observed

REAL FAILURE:
- RF-R2-A1 Scene1 epistemic overclaim / offstage omniscience (Writer/Prompt Consumption)
- RF-R2-A2 Scene2 invented eyewitness certainty under Awareness=omit (Writer/Prompt Consumption)
- RF-R2-B1 Scene1→2 calendar break Oct vs June (Plan/State Failure)

SR GAP CANDIDATE:
none

Phase 1 = ACCEPTED / FROZEN
Phase 2 = NOT AUTHORIZED
```

---

## What Round 2 actually proved

```text
✓ 真实生产路径已把 Minimal SR 送进 Writer prompt
✓ 本轮第一次在「SR 接通后」生成连续正文
✗ 尚不能证明「SR 让人物写得更好」
    —— 证据库空 → SR 全 omit → Writer 主要仍吃 Goal/Bible
✗ REAL FAILURE 指向消费/计划，不是 SR 缺字段
→ 不改 SR · 不 Persistence · 不 Phase 2
```

**Human accept (2026-09-04)**: Round 2 closed. SR remains FROZEN. Consumption failure recorded, **not authorized to fix**. Phase 2 **NOT AUTHORIZED**. **STOP.**
