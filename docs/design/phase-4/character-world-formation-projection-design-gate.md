# Character World Formation & Projection Design Gate — G0–G7

```text
MODE: READ-ONLY ARCHAEOLOGY → DESIGN GATE · NO CODE · NO SCHEMA · NO RUNTIME OBJECT
不触 L1/L2/Choice/Consequence/Survival/Director · 不重开 H4.1/#25b · 不实现自动内化
日期: 2026-09-18 · 考古基线: vertical-slice-outline-world-projection-archaeology.md
```

## 1. Executive Verdict

**B — DESIGN GATE REQUIRED**（语义可完整设计，需 Human Seal + Named EO；无不可判定分叉，
无冻结契约违反——本 Gate 的全部设计均**实施** Character World Frozen Contract 的既有条文，
不修改它）。TRAP-A / TRAP-B 均已封死（§4/§6）。

---

## 2. G0 — Ontology

**G0.1 最小定义**：候选定义与 Frozen Contract **逐字一致**（「具有来源、受认知边界限制、
能够跨章持续演化的私人世界」）——**无需新语义，验证通过**。其物质内容三类（契约前向环）：
Experience（经历了什么）/ Interpretation（如何解释）/ Internalization（什么沉淀为持久）。

**G0.2 对象区分表**：

| 对象 | Truth ownership | 时间范围 | 生命周期 | 合法消费者 |
|---|---|---|---|---|
| Character World | 角色私人主观 Truth（**非** Reality Authority） | t0→now（全书） | 仅经 formation 演化 | 仅 Projection→SR |
| Character SR(t) | 角色当前主观现实 | 当前章/场 | 每章由 World 投影+本章链重建 | Writer(p88)、诊断 |
| Writer Context | 无 Truth | 装配期 | 单次编译 | Writer LLM |
| Character State（operational） | 无（运营字段） | 当前 | 随 intent | Planner/prompt |
| Short-term memory | = SR 当前项 + observedContinuity | 当前章/场 | 章末不迁移 | 同 SR |
| Long-term formation trace | World 的 append-only 认知历史 | 全书 | 只增（带 provenance） | Projection |

**G0.3**：不新增任何 Engine。Memory→由 durability boundary（G1）在 World 语义内表达；
Personality→durable disposition 槽（本轮**延期**，见 G2）；Thought/Goal/Choice→禁。

## 3. G1 — Persistent Carrier（TRAP-A 防线在此）

**Model A（book-level World store）胜出——ontology 判定，非工程便利**：
- G1.1：契约明文 `World ≠ current SR(t)`；**Model B（SR 链式传递）使 World≡累积 SR**，
  恰好把契约区分的两对象合并，且结构性 baked-in TRAP-A（每项默认永存）。
- G1.2：`World(t)→experience→World(t+1)` 在 A 下自然表达（formation 追加+provenance）；
  B 只能靠 SR diff（有损且混淆）。
- G1.3：防全量永存见下述边界。

**Durability / Formation Boundary（四层）**——严格实施契约原文
「most events update current state/short memory; only repeated/high-cost/high-emotion/
identity-defining events may alter durable disposition」，**不将其扩展为自动评分**：

| 层 | 内容 | 进入条件 | 语义地位 |
|---|---|---|---|
| T1 当前 SR | 一切单次普通事件的 awareness/即时解读 | 默认 | 章内有效，章末不迁移 |
| T2 episodic trace | 「发生过什么于我」的经过记录（含 provenance，**无解释性**） | 角色实际 access 过的事件，确定性判定 | World 认知历史（契约明文允许），非 belief |
| T3 durable formation | 持久 interpretation/belief/stance | **两条合法通道**：①重复性候选——同一解读带 provenance 跨 ≥2 章重现（可数、确定性）；②authored seal（人类确认） | 私人世界持久层 |
| T4 derived disposition | 习惯/倾向 | **本轮延期**（需独立 formation 语义，防 Personality Engine 化） | 未来 Gate |

**禁止**：`emotion>X / repeat>Y / cost>Z → memory` 数值评分（除非另开 Gate）。
fail-closed 默认：不确定能否持久 → 留在 T2/T1。

## 4. TRAP-A 结论

单次普通事件→T1（不迁移）；重复事件→T2 记录+T3 **候选**（重复性通道）；
高成本/高情绪/身份定义事件→**不自动判定**（非确定性可认），仅经 authored seal 入 T3，
否则留在 T2；已被证错的解释→**不回写删除**（见 G4.3 共存）；暂时 belief→T1；
长期 disposition→T4 延期；current relevance→SR 专属。

## 5. G2 — Initial Authored Seed

考古确认：book-level seed **不存在**；chapter-level `characterSR` **≠** World（章域、
非累积、非该对象）——**不得升级复用**。

**G2.1 最小合法 seed 范围**：

| 项 | 允许？ | provenance | 边界 | Goal/Choice 污染 |
|---|---|---|---|---|
| knowledge | ✅ | `source=authored_seed, basis=…`（强制） | 须过 G3 epistemic basis | 无该字段 |
| interpretation {of,as} | ✅ | 同上 | 主观性恒定（永不写 Canon） | 无 |
| belief | ✅ | 同上 | 同上；可为错（Case 4） | 无 |
| stance | ✅ | 同上 | 枚举集沿用 | 无 |
| relationship understanding | ✅（以 interpretation{of,as} 表达） | 同上 | 不新增字段 | 无 |
| durable disposition / habit | **延期**（T4） | — | — | — |

禁字段表全数继承（choice/options/agency/goalId/…）；非法形状 fail-closed 拒绝。

## 6. G3 — Character Epistemic Boundary（TRAP-B 防线）

**机制：Authoritative provenance + 强制 epistemic basis，双层**：

```text
AUTHOR TRUTH（世界事实层——永不入 World）
      ↓ 仅当作者为「该角色」显式 seed 且声明合法认知基础
Character-permitted seed（source=authored_seed + basis∈
  {past_experience | witnessed | told_by | inferred_from_known} + 缺失即拒绝）
      ↓
Character World（主观层；永不写 Canon/Actual）
```

**Case 1–7 裁决**：①作者知+角色知→seed+basis ✅；②作者知+角色不知→**不为该角色 seed**
（世界事实留作者层）+可选负知识标记；③作者声明角色不知→unknown 标记，awareness 保持
omit；④author 声明角色 believes X→belief seed ✅，**永不升级为客观事实**（World 无 Canon
写路径，结构性保证）；⑤interpretation seed ✅，同上；⑥**人格描述不自动转换**——仅当作者
逐条显式写成 seed 槽项才入（且 disposition 延期）；bible→seed 自动推导**禁止**；
⑦未来事件→不得作为当前 knowledge seed（无合法 pre-story basis）——角色合法获知属
Actual 链事件，非 seed。

**结构性防 Author→Character 全知**：seed 只存在于 World（主观层、per-character、
带 basis）；World 无 Canon/Actual 写路径；投影带 provenance；Writer 只见 SR 投影。

## 7. G4 — World ↔ SR Projection / Activation

- **G4.1 World 提供**：durable formations（T3）、与当前上下文相关的 trace 命中（T2）、
  seeded knowledge/interpretation/belief/stance。
- **G4.2 当前 Actual 链提供**（Phase 3.2 封存链**原样保留，不得绕行替代**）：新 awareness、
  本章 authored 解读、current relevance。
- **G4.3 冲突语义**：**当前感知不自动修改 World**。SR 同时携带两者并各带 provenance
  （例：awareness「管理员正在进入地下室」⊕ World belief「管理员不会主动进入地下室」）——
  矛盾显性共存（文学层张力保留）；World 更新只能经 T3 formation 通道（重复/authored）。
  **无 retroactive rewrite**。

## 8. G5 — Cross-Chapter Continuity

- **G5.1**：合法继承的 = **World 对象本身**（Model A）。`SR(N+1)` 初始 = World 投影
  （seed+T3+相关 T2）⊕ 本章链输出——**不是** `SR(N)` 拷贝。
- **G5.2**：`World continuity ≠ SR snapshot copying`——构造性成立（SR(N) 中未成为
  World 的项在 N+1 自然不存在）。
- **G5.3 五测**：A）Ch1 重要认识→**仅当经 T3 formation** 才在 Ch2 存在（单章认识无
  formation 语义时不持久——诚实；formation 经重复通道或 authored seal）；B）普通单次
  事件→Ch2 不自动成为 World Truth ✅（止于 T1）；C）A 知 X / B 不知→各自 World 独立、
  IB 分离，Ch2 后仍异 ✅；D）作者知 X、A/B 均不知→从未 seed，持存机制无从泄漏 ✅；
  E）错误解释+新证据→**共存不回写**（G4.3），旧解读带 provenance 保留 ✅。

## 9. G6 — Task / Writer Consumption

**维持 SR-centric，World 零直接消费者**。Writer 经既有 p88 SR 投影消费（其中可含
World 投影项，provenance 可见）；不新增 World prompt 通道；不重新全量角色卡注入
（bible 卡维持实体层现状）；不可访问信息不泄漏（SR 投影本就 per-character + IB 分离）；
Author Truth 不达 Writer（结构上 World 只含 seed+formation，均为角色合法主观内容）；
Task 不从 World 推导 Goal/Choice（无通道）。**若 SR 未来不足，另开 Gate。**

## 10. G7 — Literary Validation（最小纵向测试设计）

场景：管理员午夜换地下室门锁。**A**（在场目击、与管理员有冲突史）：access✅→
awareness=换锁发生；World trace=经历记录+冲突史 seed/formation 染色 stance；
**interpretation=不知原因**。**B**（未目击、与管理员关系正常）：无该事件 access→
无换锁 awareness；仅经后续 Actual（门无法打开）形成不同 awareness。
**验收**：两角色 sidecar/prompt SR 块/正文感知**恰好按 access 差异分化**；
**负向断言**：双方 prose 均不得出现动机知识（motive=作者层，未 seed）；无 Goal/Choice
铸造（结构断言+反洗白测试）；A 的戒备来自其 World，B 的平静来自其 World——
「这是我的世界」分化成立。

## 11. Anti-Laundering Matrix（逐项）

| 路径 | 裁决 |
|---|---|
| Outline→Canon | 仅既有 authored authority（维持） |
| Outline→Belief | ❌ |
| Bible→Character Knowledge | ❌ 自动推导（仅逐条显式 seed） |
| Author Truth→Character World | ❌ 无 epistemic basis（basis 强制+fail-closed） |
| Authored Seed→World | ✅ 需合法 character boundary（G3 双层） |
| Actual→Character World | ❌ 直接禁止（唯经 T2 trace 确定性 access 判定+T3 formation） |
| Actual→IB→Perception→Interpretation→SR | ✅（封存链原样） |
| SR→Goal | 本 Gate 不允许 |
| World→Goal / Choice / Action | ❌ |
| Writer→World | ❌ |
| World→Writer | 仅经合法投影/SR（p88） |
| SR→Writer | ✅ |
| SR→Character World | 仅未来 formation 语义（本 Gate 已给 T3 通道形状，实现另经 EO） |

## 12. New Risks

① seed 过度预置（作者塞满世界→人物未经历先有观点）：缓解=seed 规模指引+provenance
全程可见；② T2 trace 无限增长：**遗忘语义未定义**——本轮不设计裁剪/摘要（摘要=推理），
仅记录为 open risk（未来 Gate）；③ 实现期 World/SR 混同漂移（靠 G0.2 表+测试锁）；
④ 矛盾共存可能困扰 Writer（以 provenance 标签呈现，文学上为特性）；⑤ 重复性通道被
逐章 re-author 刷持久（本就 authored 权威，无新增风险，记录即可）。

## 13. Required Human Seals

**S1** 载体=Model A（book-level World store；否决 SR 链式）；
**S2** durability 四层边界（T1/T2/T3 双通道/T4 延期；禁自动评分）；
**S3** book-level seed 范围（四槽+强制 basis；disposition 延期）；
**S4** epistemic 双层机制（author 层/character 层分离；缺 basis 即拒）；
**S5** 冲突共存语义（不自动改 World、不回写）；
**S6** 消费维持 SR-only（World 零直接消费者）。

## 14. Proposed Named EOs（按依赖序，均窄域）

1. **EO-CW-Store-Seed-01**：book-level World store（空载启动）+ authored seed 文件+
   basis 校验（fail-closed）+ provenance。
2. **EO-CW-Projection-01**：SR(N+1) 初始化=World 投影 ⊕ 本章链（Phase 3.2 链不动，
   authored 源先例扩展至 book 级）；冲突共存呈现。
3. **EO-CW-Trace-01**：章末 T2 episodic trace 确定性追加（access 判定复用 IB）。
4. **EO-CW-Formation-01**：T3 双通道（重复性候选+authored seal）——最大，最后。

每个 EO 的 Forbidden 自动继承本矩阵 + H4.1 全部禁线。

## 14-A. EO-CW-Store-Seed-01 Implementation Record（2026-09-20 · EXECUTED under Human GO）

- `packages/inkos-brain/src/character/character-world.js`：book-level World store
  （`brain/character_world/world.json`）+ authored seed（`novel/_system/character_world_seeds.yaml`）
  + fail-closed 逐项验证（basis∈四枚举强制；basisRef 双路解析——in-file authored
  experience（同角色校验）或 Actual occurrence + `characterCanAccessActualEvent` IB 验证；
  declared-unknown 拒同内容；FORBIDDEN_SEED_FIELDS 含 personality/disposition/各评分；
  stance 枚举沿用）+ provenance（source=authored_seed, basisKind, basisRef）。
- orchestrator 最小挂载（章运行首 sync：seed→validate→save；无 seed 不落盘）；零消费者。
- 测试 32/32（`test:eo-cw-store-seed-01`：store/provenance/basis 双路/隔离/Case A–G/
  跨章持久·SR 不自动生成/anti-laundering（Plan·goal·mainGoal·causal_chain·options·
  characterDecisions·09·lore 全无效）/empty-world/not-canon 四文件未写）。
- 回归 9/9 PASS（character-sr 一次为并发误报，串行复测绿）。
- 生产验证（正式 orchestrator 链）：无 seed → world.json 不存在；带 seed → materialize
  落盘（林逸 k/b/s 各 1、rejected 0、苏眠空槽隔离）且 **seed 内容零泄漏进任何 scene
  prompt**（World→Writer 直连禁令实测）。
- 完成判据 15/15 满足；无 Projection/T2/T3/Goal/Choice/Action。
- 已知限制：basis 的语义恰当性（如 witnessed 是否真为亲历）属作者责任——系统验证
  结构可追溯性，不验证叙述真实性（fail-closed 于结构层）。
- **未自动实现 EO-CW-Projection-01**（按授权边界停止）。

## 14-B. EO-CW-Projection-01 Implementation Record（2026-09-20 · EXECUTED under Human GO）

- `character-world.js` 增 `projectWorldToSRScene`：world 四槽 → SR 槽形条目
  （knowledge→awareness）；**确定性相关性激活**（条目文本与场景正文+Actual 的 ≥3 字
  连续重叠 → context_active / background——select/activate/project，零推理）；
  provenance 链保留（seed 原链 + projectedBy/projectedChapter/projectedSceneId）；
  不改 World。
- `character-sr-updater.js`：`worldProjection` 保留式合并（authored 块后；不删不盖
  Actual/authored 项；pushUnique 去重；冲突 COEXIST+PROVENANCE）；默认无参数时
  行为零变化（P13）。
- orchestrator：章首 load World（一次）→ 逐场景 project→applyCharacterSRAfterActual；
  SR 名单扩为 knownNames ∪ Actual actors（Truth 级在场者入 roster）。
- 测试 20/20（P1–P13 + Writer-only-via-SR：World belief 经 p88 SR 块进 Writer 语境，
  provenance 内部标记不进正文）。回归 10/10 PASS（character-sr 一次循环误报，单发 PASS）。
- **双角色生产运行（swap-lock 场景）**：林逸 SR belief 双源共存（[A]authored +
  [W]World 投影，provenance 各异）；[W]belief 经 SR 块进入 s2–s4 prompt（s1 首场无
  先验 SR——正确时序）；**零 World→Writer 直连**（苏眠 World 内容未出现在林逸 prompt/
  prose——隔离实证）；文学层：林逸 prose 呈现 World 染色的感知（对管理员/档案区的
  警觉性注意），无 Goal/Choice 产生。
- 已知限制：①苏眠本场未被提取器赋予 actor 事件 → 未入 SR roster（提取器措辞方差，
  非 Projection 语义缺口——她在场时有事件即入）；②s1 首场 prompt 无先验 SR（World
  投影自 s2 起到达——章内首场 SR 冷启动，符合既有 SR 时序语义）。
- 完成判据 20/20 满足；未实现 T2/T3/自动内化/Goal/Choice/Action；
  **未自动执行下一 EO**。

## 14-C. EO-CW-Trace-01 Implementation Record（2026-09-20 · EXECUTED under Human GO）

- `appendT2Experiences(bookDir,{scene,chapter,candidateNames})`：候选角色 × Actual
  occurrence，经 `characterCanAccessActualEvent` 硬门槛 → 引用式 experience
  （experienceId/actualRef/chapterRef/sceneRef/access/kind/summary≤80=Actual action
  原文/provenance{source=t2_actual_trace, accessKind, chapter}）。**access 二分**
  `participant`（actors/affected）/`present_witness`（在场+kind 白名单——弱于
  witnessed，§9 合法）；幂等（characterId+actualRef 去重）；append-only。
- `materializeWorldFromSeeds` 增 priorWorld 保留：seed 重跑不清 T2；未 seed 仅有 T2
  块的角色整块保留。
- 投影扩展（§12）：T2 经历仅 **context_active** 时入 SR awareness（fromT2 标记 +
  T2 provenance + projectedBy）；background 留 World。orchestrator 场景级挂载（SR 后）。
- 测试 **27/27**（T2-01…20 + 投影背景/激活 + seed 重跑共存；两处测试断言路径笔误
  修正——`e.chapterRef` 非模块 bug）。回归 **11/11** PASS。
- 生产验证（双章+seed）：林逸 T2×18（participant）跨章存续；**ch2 SR sidecar 含 8 条
  fromT2（带 projectedBy）——T2→World→Projection→SR 全链生产贯通**；苏眠 0（本 run
  提取方差——未获 actor 事件，非 Access 语义缺口）；隔离/Reality 防火墙实测。
- 已知限制：T2 项进入 Writer prompt 受既有 p88 预算压缩（awareness 组 ~60 字/组截断，
  与 Projection EO 记录同源——presentation 层，非语义）；World experiences 无限增长
  = 记录为 future scalability issue（不建 memory management）。
- 重复 T2 不形成 belief/stance/disposition（防火墙测试锁定）——T3 归
  EO-CW-Formation-01（未实现）。

## 14-D. EO-CW-Formation-01 Implementation Record（2026-09-20 · EXECUTED under Human GO）

- `World.characters[].formations[]`：`{formationId, characterId, kind∈{interpretation,
  belief, stance}, content, of/as/about?, source, basisRefs, formedAt, provenance}`。
- **Channel A（repeated-actual）**：`materializeT3Formation(bookDir, candidate)`——只验证
  **已具明确 content 的 Formation Candidate**（硬条件：kind 枚举 / basisRefs≥2 /
  每 ref 命中同角色合法 T2（actualRef + accessKind）/ actualRef 互异 / 禁字段全拒 /
  幂等 by formationId / formedAt=materialize 时间位）。**不自动推导 content——无 LLM/
  similarity/heuristic/scoring；当前生产无 Candidate Producer ⇒ Channel A =
  DEFINED BUT NOT MATERIALIZABLE（合法状态）**。
- **Channel B（authored seal）**：seed `formations_seal[]` → T3（source=
  authored_formation，basisRefs=[]——与 t3_repeated_actual 严格分源，同内容共存不混）。
- 投影：formations → SR 三槽（fromT3 标记 + T3 provenance + projectedBy）；无
  Goal/Choice/Action 通道。materialize 重跑保留既有 formations。
- 测试 **22/22**（T3-01…25）；回归 **12/12** PASS。
- 生产验证（双章+seed+seal）：authored seal T3（belief「档案区藏着不该被人看见的东西」）
  → **ch2 SR 含 fromT3 条目——T3→Projection→SR 生产贯通**；T2×23 在场而 formations
  仅 seal（Channel A 诚实不可物化——无 producer，未擅自发明）。
- 冲突共存（旧 T3 + 新 T2 并存，无 revision/decay/forgetting）；隔离（B 零 formation）；
  Reality 防火墙三文件未写；T4/disposition 未实现。

## FINAL STATUS

```text
VERDICT: B — DESIGN GATE REQUIRED（设计已完成于本档，待 Human Seal S1–S6）
停止条件核查: 零触发（未改任何冻结契约；本设计=实施 Character World Contract 既有条文）
NO CODE · NO SCHEMA · NO RUNTIME OBJECT · NO IMPLEMENTATION · STOP
```
