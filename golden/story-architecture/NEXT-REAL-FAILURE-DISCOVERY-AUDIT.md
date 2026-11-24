# NEXT-REAL-FAILURE-DISCOVERY-AUDIT

**Date**: 2026-09-08  
**Mode**: READ-ONLY · FAILURE DISCOVERY ONLY  
**Upstream freeze**: F-SERIES CLOSED · PASS WITH KNOWN LIMITATIONS  
**Forbidden this round**: CODE · PATCH · F8.4 · F9 · ENGINE · REPLAN · REGENERATE · Design Gate · Roadmap 自动立项  

**Question answered**:

> 真实小说现在到底还坏在哪里？

---

## I. Scope

| Book | Chapters | Scenes | Primary artifacts |
|------|----------|--------|-------------------|
| `凌晨四点世界刷新` | Ch1–Ch4 | 16 scenes (`ch_0001`…`ch_0004_scenes.json`) | `scenes[].text` / `scenes[].goal` / OC projection / Plan Validity vs prev |

**Observation dimensions used (not as pre-selected projects)**: Scene→Scene continuity · Choice→Consequence · Action→Situation · Beat→prose integrity · Progressive change · Plant/Payoff · empty/soft cuts · Plan Validity coverage edge.

**Not treated as automatic A**: Scene Causality / Progressive Complications / Plant-Payoff / Opposing Wants / Scene-Sequel / Value Shift names.

---

## II. Confirmed REAL FAILURES

### RF-01 — Beat / pipeline scaffolding leaked into reader prose

| Field | Content |
|-------|---------|
| **Failure ID** | `RF-01-BEAT-META-LEAK` |
| **Scene / Beat** | Ch3 · S3 (`ch3_s3`) · opening of final `scene.text` |
| **Actual text evidence** | 正文开篇字面出现：`# Beat 1/6：Goal（主角目标）`，随后才是「凌晨3:59。病房的灯管开始闪烁…」。同段还有 Markdown 血字行 `**"4:00。刷新…` |
| **Expected literary behavior** | 读者面对的是干净叙事正文；Beat 标签 / 结构脚手架不得进入成稿 |
| **Actual literary behavior** | 生产正文直接暴露六拍 Goal 标题与排版标记 |
| **Why this is a real failure** | 破坏阅读契约（第四面墙/系统痕迹）；不是风格偏好；可定位到具体 Scene 文本 |
| **Existing architecture path** | Beat 渲染 → Writer → `scene.text` 落盘；Review 为 analysisOnly，未见「禁 Beat 标题入正文」硬闸 |
| **Why existing path failed** | Prompt/指令泄漏进生成物后无结构化拒收；非 Plan/OC/Validity 职责 |
| **F1–F8.3 cover?** | **否**（F 系列未处理「脚手架污染成稿」） |
| **Reproducibility** | 磁盘 `ch_0003_scenes.json` S3.text 固定可复现；Ch1/Ch2/Ch4 S3 未见同款泄漏 → 非全章必现，但**无可靠防止机制** |

**Rank: P0**（严重破坏成品可读性 / 叙事媒介完整性）

---

### RF-02 — Open choice / imminent pressure evaporates while Plan Validity = VALID

| Field | Content |
|-------|---------|
| **Failure ID** | `RF-02-CHOICE-PRESSURE-EVAPORATE-VALID-PATH` |
| **Scene / Beat** | Ch2 · **S3 → S4** |
| **Actual text evidence** | **S3 尾**：走廊「不记得的」脚步逼近；苏晚：「跟我走，还是留在这等刷新？你选。三十秒内。」 · **S4 头**：苏晚独自盯手机 · 「效率助手」空白消息 · **无**选择结算、无追逐承接 |
| **Expected literary behavior** | 未结算双轨选择 / 逼近威胁应结算、显式偏离、或至少改变下一场开场条件 |
| **Actual literary behavior** | 压力与选择蒸发；切到另一钩子（系统消息）；因果链断裂 |
| **Why this is a real failure** | Choice 无后果；结束状态未改变下一场条件；读者被承诺的戏剧压力落空 |
| **Existing architecture path** | OC 可标 `open_choice_s3` / `tail_cliff_s3` → N+1 可见（软）· `evaluatePlanValidity(S3→S4)=VALID`（效率助手 Goal 不依赖「已在病床结算选择」）→ **无 demotion** |
| **Why existing path failed** | F8.3 只在 **premise 被否定** 时 demote；**VALID 路径**上没有「未结算选择必须被 N+1 消费」的硬机制；OC 服从仍为软 |
| **F1–F8.3 cover?** | **否作为已解决问题**。F8.1 明确把 S3→S4 判为 **NOT Plan-Override Failure**；F8.3 对本跃迁为 VALID。本失败是 **VALID 路径上的 choice/pressure 蒸发**，新类 |
| **Reproducibility** | 同书 Ch2 文本固定；模式与 S2→S3（INVALID 类）不同，证明「仅修 INVALID 开场」不够 |

**Rank: P1**（明显伤害因果/选择伦理，且在 VALID 路径可重复）

---

### RF-03 — Unresolved cliffhanger ignored while Plan remains VALID（F6.1 residual）

| Field | Content |
|-------|---------|
| **Failure ID** | `RF-03-UNRESOLVED-CLIFF-VALID-PATH` |
| **Scene / Beat** | Ch2 · **S1 → S2** |
| **Actual text evidence** | **S1 尾**：门缝手 +「快跑」+ 指甲油悖论 · **S2 头**：公司监控录像开场 · 天台威胁蒸发 |
| **Expected literary behavior** | 未解悬崖应被结算、逃离、或显式时间跳跃说明 |
| **Actual literary behavior** | 悬念丢弃；地点瞬切 |
| **Why this is a real failure** | 连续性/因果断裂（F6.1 已证） |
| **Existing architecture path** | F6.2 OC 注入 `door_warning` 等（软）· Plan Validity **VALID**（「证明矛盾」前提仍成立）→ F8.3 **不 demote** |
| **Why existing path failed** | 与 RF-02 同源机制空白：**Plan 仍成立时，未结算 Actual 钩子无硬消费义务** |
| **F1–F8.3 cover?** | **部分**：F6.1 已命名；F6.2 只解决「可见」；**未硬阻断**。Closure 将 OC 服从标为 SOFT |
| **Reproducibility** | 生产正文固定；架构上 VALID+unresolved 仍无硬闸 |

**Rank: P1**（连续性强；但是 **F6 残差**，不宜伪装成全新叙事引擎立项借口）

---

## III. Structural Gaps Without Proven Failure（B）

| Gap | Evidence of gap | Why not A yet |
|-----|-----------------|---------------|
| F8.3 高精度漏检（如 Ch4 S2 档案馆/制服对峙 → S3 医院冷开，Validity=VALID） | 调用链 + Ch4 文本 | 属 F8.3 **已知高精度限制**；Closure 已 **NOT AUTHORIZED FOR REPAIR**；不得借此开 F8.4 |
| Director `situation.before` ← Plan closing 非 Actual | Closure §C | 结构缺口；未单独立项为新文学失败（与已知限制重叠） |
| CLI / Scene 模式绕过 L4 demotion | Closure | 路径缺口；非新正文样本 |
| OC 召回不全（地点等） | F6.3 | 精度/召回权衡；无新独立文学判例超过 F6.1 |
| 跨章 S3/S4 Goal 模板高度复用 | Ch1–4 S3 均「病床」、S4 均「效率助手」 | 可能造成重复感，但各章正文细节不同；**易滑向品味/路线图** → 暂不升 A |

---

## IV. Design Possibilities（C）

仅理论增强，**无本轮 A 证据授权**：

- Scene Causality / Progressive Complications / Plant–Payoff  
- Opposing Wants / Scene–Sequel Rhythm / Character Value Shift  
- 「产品级」Beat Integration（超出 F7.1 措辞硬化）  
- 统一 Character Current State 权威（撞冻结）

→ 保持 **UNFINISHED / FUTURE CANDIDATES**。

---

## V. Failure Ranking

| Priority | ID | Why |
|----------|-----|-----|
| **P0** | RF-01 Beat meta leak | 成品正文不可读契约被破坏 |
| **P1** | RF-02 Choice/pressure evaporate on VALID path | 选择无后果；F8.3 故意不管的路径 |
| **P1** | RF-03 Cliff ignore on VALID path | 连续性强；但是 F6 残差 |

排序按 **叙事破坏严重度与重复风险**，不按实现难易。

---

## VI. Candidate Next Line

**有资格进入下一 Design Gate 的仅限 A：**

1. **首选候选**：`RF-01-BEAT-META-LEAK`（P0）  
2. **次选候选**：`RF-02-CHOICE-PRESSURE-EVAPORATE-VALID-PATH`（P1，且明确 **不是** F8.4）  
3. **残差候选**：`RF-03`（须在 Design Gate 证明不是「重开已关闭的 F6 soft 路径」）

```text
QUALIFIED NEXT DEVELOPMENT LINE (pending human Design Gate):
  primary → RF-01-BEAT-META-LEAK
  secondary → RF-02-CHOICE-PRESSURE-EVAPORATE-VALID-PATH
```

**不是**：Narrative Roadmap 任选项目 · F8.4 · Consequence Engine · Automatic Replan。

---

## VII. STOP DECISION

```text
REAL FAILURE FOUND → STOP FOR NEXT DESIGN GATE
```

本轮发现 **≥1 个** 满足条件的 REAL FAILURE（RF-01 明确；RF-02 明确；RF-03 为已记录残差）。

```text
NO CODE
NO DESIGN IMPLEMENTATION
NO F8.4
NO F9
WAIT FOR HUMAN DESIGN GATE ON A SELECTED FAILURE ID
```

---

## Appendix — Quick contrasts

| Transition | PlanValidity | Literary issue | Class |
|------------|--------------|----------------|-------|
| Ch2 S2→S3 医院 | INVALID | Plan 覆盖 Actual 开场 | **已由 F8.1/F8.3 处理（资格层）**；磁盘旧稿仍在 |
| Ch2 S3→S4 选择蒸发 | VALID | Choice/pressure 无后果 | **RF-02 (A)** |
| Ch2 S1→S2 快跑蒸发 | VALID | 悬念丢弃 | **RF-03 (A residual)** |
| Ch3 S3 Beat 标题入正文 | n/a | 脚手架泄漏 | **RF-01 (A)** |
| Ch4 S2→S3 档案馆→医院 | VALID（漏检） | 类似冷切 | **B / F8.3 known limit** |
