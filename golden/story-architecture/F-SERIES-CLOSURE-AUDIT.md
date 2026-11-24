# F-Series Closure Audit

**Date**: 2026-09-08  
**Mode**: **READ-ONLY / AUDIT ONLY** · **NO CODE · NO F8.4 · NO ENGINE · NO REPLAN · NO REGENERATE**  
**Scope**: Confirm F1–F8.3 form a real, closed, provable production defense line (Studio primary).  

**Evidence sources**: Studio/Runtime call chains · `plan-validity.js` · Ch2 production `ch_0002_scenes.json` · L4 demotion replay · FP boundary cases · F1–F8.3 reports/tests.

---

## A. F1–F8.3 完整状态表

| ID | Scope | Actual implementation | Guarantee level | Test evidence | Known limitation | Status |
|----|-------|----------------------|-----------------|---------------|------------------|--------|
| **F1** | Clock + Information Boundary survive L2→L3→L4 | `prompt-survival.js`；P1 protect；mustRecompile 全路径；beat PROTECT_RE | **HARD GUARANTEE**（保护栈存活） | `test:f1-survival` PASS | 不保证 Writer 服从 Clock | **CLOSED** |
| **F2** | Final Context Viewer（只读） | final-context 落盘 + Studio UI + integrity hash | **OBSERVATION / DIAGNOSTIC** | `test:f2-viewer` PASS | 不改正文语义 | **CLOSED** |
| **F3** | Context Provenance（块级血缘） | provenance trace：type/source/priority/kept/reason/layers | **OBSERVATION / DIAGNOSTIC** | `test:f3-provenance` PASS | 诊断≠Authority | **CLOSED** |
| **F4** | Entity/Knowledge 注入卫生 | filterKnowledge → whitelist 人物卡；禁未知事实主路径 | **HARD GUARANTEE**（过滤层） | `test:f4-entity-hygiene` PASS | 非 Location Engine；氛围仍可走 world bible | **CLOSED** |
| **F4.1** | 关闭 character raw 回退 | raw 非标 → minimal identity；fallback 可观测 | **HARD GUARANTEE** | `test:f4.1-raw-fallback` PASS | — | **CLOSED** |
| **F5** | 时间语义契约 | 解绑 `day\|\|chapter`；Historical ≠ Current Clock | **HARD GUARANTEE**（契约/写轨） | `test:f5-time-contract` PASS | 闪回双轴 **ABSENT**（有意） | **CLOSED**（线性书） |
| **F6** | Actual→N+1 连续性审计 | 只读：缺口确认 | **OBSERVATION** | F6 audit report | 本身不实现 | **AUDIT CLOSED** |
| **F6.1** | 生产失败验证 | Ch2 S1→S2 / S2→S3 REAL FAILURE | **OBSERVATION** | F6.1 report | 授权后续最小桥 | **CLOSED**（验证完成） |
| **F6.2** | Observed Continuity Bridge | `buildObservedContinuity` → N+1 L1/L4；`writesCanon/SR=false`；Plan 不得假结算 | **HARD**（投影注入）+ **SOFT**（Writer 服从） | `test:f6.2` PASS | **不改 Plan**；召回不全（地点等） | **CLOSED · PARTIAL vs F8.1 文学** |
| **F6.3** | OC 精度/召回 | Plan/Expected/Summary 隔离审计 | **OBSERVATION** + 规则硬化 | `test:f6.3` PASS | 高精度优先漏召回 | **CLOSED** |
| **F7** | Beat 集成审计 | Beat=CONSTRAINT+PLAN/EXPECTED，非 Reality | **OBSERVATION** | F7 audit | 指出 RESULT_IGNORED | **AUDIT CLOSED** |
| **F7.1** | Beat 语义硬化 | Decision 门控；Expected/Heuristic 措辞；Goal≠prior settlement | **SOFT→部分 HARD**（措辞/库拍门） | `test:f7.1` PASS | 不阻止 Goal 路径本身 | **CLOSED** |
| **F8** | Actual→Planning 缺口 | 结构 PLAN-BYPASS 确认 | **OBSERVATION** | F8 audit | 当时未授权实现 | **AUDIT CLOSED** |
| **F8.1** | 后果失败验证 | Ch2 S2→S3 Case 3 REAL FAILURE | **OBSERVATION** | F8.1 report | 授权 Design | **CLOSED**（验证完成） |
| **F8.2** | Plan Validity 设计 | Check 纯函数；Repair≠Regenerate；插入点 | **OBSERVATION / DESIGN** | F8.2 report | 不实现 | **DESIGN CLOSED** |
| **F8.3** | Validity + 执行资格 demotion | `evaluatePlanValidity`；Studio/Runtime 场间；L1/L3/L4 demote | **HARD**（资格闸门/标签）+ **SOFT**（模型服从） | `test:f8.3` PASS；FP A/B/C PASS | CLI L4 无 demotion；Scene 模式绕过 L4；未做 LLM 重生正文 | **CLOSED · KNOWN LIMITATIONS** |

**分类汇总（勿因「有模块」虚标 COMPLETE）**

| Class | Items |
|-------|--------|
| **A. HARD GUARANTEE** | F1 保护存活；F4/F4.1 过滤；F5 契约写轨；F6.2 OC 注入与 Plan 假结算阻断；F8.3 demotion **标签与资格字段**（Studio 主链） |
| **B. OBSERVATION / DIAGNOSTIC** | F2 Viewer；F3 Provenance；F6/F6.1/F6.3/F7/F8/F8.1/F8.2 审计层 |
| **C. SOFT JUDGMENT** | F7.1 措辞；F6.2/F8.3 **Writer 是否服从** demotion/OC；Decision/Conflict/Review 启发式 |
| **D. ABSENT** | Consequence Engine；Actual→Canon/State Transition；闪回双轴；Automatic Replan/Regenerate；CLI L4 demotion；结构化「拒稿因 Plan Validity」硬闸 |

---

## B. Closed-loop architecture

```text
Scene N Writer → scene.text
        ↓
ensureObservedContinuity  →  OC (Observation Projection)
        ↓
ensurePlanValidity(OC + text, N+1.goal)   ← Studio/Runtime 场间，Director 前
        ↓
   VALID ──────────────────────────────► N+1 Plan 保留直接执行资格
   INVALID
        ↓
   executionPrivilege = demoted
   Strategic / Narrative Goal **文本保留**
   Opening premise **失去直接执行资格**
        ↓
Director 仍可 enrich Plan（situation 仍可来自 prev Plan closing）
        ↓
L1 / L3 / L4：STRATEGIC + Plan Validity block
（禁止把已否定开场写成既成事实；须 bridge/settle Actual）
        ↓
Writer（Studio Beat 主路径）
```

**Actual 如何影响 N+1**  
1. **可见**：raw/summary/tail + **OC**（F6.2）进入 Writer 上下文。  
2. **资格**：高置信度 premise 冲突 → **Plan Validity INVALID** → demote（F8.3）。  
3. **不**：自动改写 Canon / SR / Reality；不自动 Regenerate 章计划。

**Plan 如何继续存在**  
章初 Planner goals 仍在；Strategic Goal 在 INVALID 时仍注入为「保留目标」，不是删除。

**Plan 何时失去 execution eligibility**  
仅当 `evaluatePlanValidity` 高精度命中（地点前提冲突 / 未结算选择被当成已抵达 / 物件态相反），且无 bridge 语言。  
**Unknown ≠ False**（信息不足 → VALID）。

---

## C. Remaining gaps（经调用链验证）

1. **CLI `llm-writer`**：无 `ensurePlanValidity` / 无 L4 demotion；依赖 orchestrator+L1；L2 仍可裸写 goal。（本轮不修 CLI）  
2. **Studio `writerMode=scene` / 非 Beat 例外路径**：可不经 `compileSlimBeatUserPrompt` demotion。  
3. **L2 `buildSceneWritePrompt`**：仍可含裸 `- 目标:`（L3/L4 主链已 demote，L2 为残余软泄漏）。  
4. **Director `situation.before`**：仍接 prev **Plan** `closingWorldState`，不是 Actual（Plan→Plan 桥仍在）。  
5. **Demotion = prompt 约束**：无「Plan Validity INVALID → 结构化拒稿」硬闸；模型可违抗文案。  
6. **Ch2 S3 磁盘正文**：仍是 **F8.3 之前** 生产稿（医院冷开）；本轮 **未** LLM 重生，故「新正文文学」未在磁盘上替换旧错。  
7. **预置错误 `planValidity=VALID`**：L4 `if (!scene.planValidity)` 会跳过重算（异常注入路径）。  

**不是 gap（有意不做）**：Consequence Engine · Full-chapter Regenerate · Automatic Replan · 第二 State Authority · 闪回双轴。

---

## D. Literary validation（Ch2 S2→S3）

### 旧行为（磁盘生产稿 = PRE-F8.3）

```text
S2 Actual: 公司 · 「跟我走/留下」· 三十秒未结算
S3 Plan:   医院病床 4:00 醒来
S3 text:   「凌晨3:59…病床护栏…」直接医院开场  ← Plan 覆盖 Actual（F8.1 REAL FAILURE）
```

### F8.3 后（本轮可证明层）

| Check | Result |
|-------|--------|
| `planValidity.status` | **INVALID** · `premiseDenied` · `demoted` |
| L4 仍仅 `CURRENT INTENT` 直灌 | **否** |
| L4 Plan Validity + 禁止开场既成 | **是** |
| Strategic Goal（医院叙事）保留 | **是** |
| FP：Unknown≠False / unresolved alone | **VALID**（见下） |

**结论（诚实分层）**：

- **Prompt / execution-eligibility 层**：**已阻断**「把被 Actual 否定的医院开场当作直接执行命令」——这是 F8.3 授权的成功标准。  
- **磁盘已写文学正文层**：**尚未被新生成替换**；旧 S3 仍是失败样本。  
- **下一次 Studio Beat 主路径重写 S3 时**：闸门已在；**服从仍属 SOFT**（无 Validity 拒稿硬闸）。

因此文学验证标记为：

> **BLOCKED AT PROMPT GATE · PROSE REGEN NOT RE-RUN**

---

## E. False Positive Boundary（F8.3）

| Case | Expect | Got | Pass |
|------|--------|-----|------|
| A Strategic Goal + premise 未被否定（S1→S2） | VALID | VALID | ✅ |
| B Actual 明确否定 premise（S2→S3 医院） | INVALID | INVALID | ✅ |
| C 信息不足（无地点证据 + 医院 Goal） | VALID | VALID | ✅ |
| C2 unresolved alone | VALID | VALID | ✅ |
| C3 模糊走廊 ≠ 公司冲突 | VALID | VALID | ✅ |

**Unknown ≠ False：成立。**

---

## F. Studio 主链节点摘要（1–10）

| Node | Authority | Plan/Expected | Actual/Obs | Hard | Soft | No defense / pollution |
|------|-----------|---------------|------------|------|------|------------------------|
| Input | Author/disk | 任务/设定 | — | 模块存在 | 措辞 | 不防日后 Plan 压 Actual |
| Planner | Planner | **goals 定死** | — | authored 可短路 | 切分 | **Plan 强制源** |
| Decision | Decision（闸） | goal 作拟行动 | — | pass/fail | 六维 | 不 vs Actual |
| Conflict | Conflict（闸） | 冲突 Expected | — | pass/fail | 类型 | 不 vs Actual |
| Scene Plan | Director | situation/beats EXPECTED | **不读** prev.text 作 before | 回填 plan | 引擎启发式 | **Plan→Plan before** |
| Prompt Compiler | Assembler | Goal/Beat | OC + Validity | F1 protect；F8.3 demote L1/L3 | clip | L2 裸 goal 残余 |
| Writer (Studio Beat) | 填 text | CURRENT INTENT / EXPECTED | OC/tail | 复读硬失败等 | 服从 demotion | Scene 模式 / 模型违抗 |
| Writer (CLI) | 填 text | 裸/L1 | 弱 | — | — | **无 L4 F8.3**（已知） |
| Review | analysisOnly | 期望 | text | Studio 不因 review replan | issues | 不跑 Validity |
| Actual/OC | Projection | — | confirmed/unresolved | writesCanon/SR=false | 正则召回 | Studio 写回可不 attach OC（N+1 再抽） |
| Plan Validity | Diagnostic | 被测 goal | prev text/OC | demote 字段/标签 | 规则覆盖面 | 非 Replanner |
| Next Scene | 循环 | 保留 strategic goal | 上轮 Actual | Validity 再跑 | — | 若绕过 demotion → 复现 F8.1 |

**Plan→Reality / Expected→Actual / Inference→Fact 再污染？**  
- Canon 11/13：**EO-P2 切断** Plan→events/facts（保持）。  
- Prompt 面：Expected/Goal 仍注入；**F8.3 切断的是「被否定开场的直接执行资格」**，不是消灭 Plan 文本。  
- OC/Validity：**不写** Canon/SR/Reality。

**绕过 F8.3？**  
- Studio **默认 Beat**：**主路径难绕过**（orchestrator + L3 + L4）。  
- **已知旁路**：CLI llm-writer；Scene writer 模式；错误预置 VALID；模型无视文案。

---

## G. OC vs Plan Validity 责任边界（冻结确认）

| | OC (F6.2) | Plan Validity (F8.3) |
|--|-----------|----------------------|
| 是什么 | Actual observation / continuity **projection** | Plan **execution eligibility** diagnostic |
| 不是 | Consequence Engine / Canon | Replanner / Reality judge |
| 写 Canon/SR/Reality | **否** | **否** |
| 改章计划 | **否** | **否**（只 demote privilege） |

冻结边界本轮 **未改**（Plan≠Reality · Expected≠Actual · SR read-only · 无第二 Authority · 无 Engine/Replan/Regenerate）。

---

## H. Final Gate

```text
PASS WITH KNOWN LIMITATIONS → F-Series CLOSED
```

**理由**：  
F1–F8.3 在 **Studio 主生产链**上已形成可证明闭环：可观测（F2/F3）→ 注入卫生与时间契约（F4/F5）→ Actual 可见（F6.2）→ Beat 语义硬化（F7.1）→ 被否定开场失去执行资格（F8.3）。  
已知限制（CLI/Scene 旁路、L2 裸 goal、Director Plan-before、无 LLM 重生旧稿、demotion 软服从）已记录，**不授权本轮修代码**。

```text
NO CODE · NO F8.4 · NO ENGINE · NO REPLAN · NO REGENERATE
F-SERIES STOP — await next decision
```

---

## I. Official Acceptance / Freeze（2026-09-08）

**Human verdict accepted.**

```text
F-SERIES CLOSED
PASS WITH KNOWN LIMITATIONS
NO F8.4
NO F9 YET
WAIT FOR NEXT DECISION
```

### Known Limitations — NOT AUTHORIZED FOR REPAIR

1. CLI `llm-writer` 无 F8.3 L4 demotion  
2. Studio `writerMode=scene` 可绕 L4  
3. L2 `buildSceneWritePrompt` 裸 Goal 残余  
4. Director `situation.before` ← previous Plan `closingWorldState`  
5. F8.3 demotion = prompt / execution-eligibility（≠ 结构化拒稿硬闸）  
6. Ch2 S3 磁盘正文仍为 PRE-F8.3 旧稿  
7. 异常预置 `planValidity=VALID` 可跳过重算  

**禁止自动升级为下一阶段任务**：CLI 修复 · Scene mode 统一 · L2 Goal 清理 · Director Actual-before · hard rejection · Consequence Engine · Automatic Replan · Regenerate · Full-chapter regeneration。

### Narrative Design candidates — UNFINISHED / FUTURE ONLY

Scene Causality · Progressive Complications · Plant/Payoff · Beat Integration（产品级）· Opposing Wants · Scene-Sequel Rhythm · Character Value Shift  

→ **不标记 DONE** · **不自动开 F9** · 须由新的 REAL FAILURE 授权。

### Next-phase rule

```text
REAL FAILURE → READ-ONLY ARCHAEOLOGY → DESIGN GATE
→ MINIMAL IMPLEMENTATION → REGRESSION → REAL LITERARY VALIDATION → STOP
```

无新 REAL FAILURE → **不开发**。

InkOS 不再按旧 roadmap 自动推进。