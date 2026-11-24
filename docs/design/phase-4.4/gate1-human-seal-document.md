# GATE 1 — ENTITY IDENTITY & SUBJECT BOUNDARY — HUMAN SEAL DOCUMENT

**Date**: 2026-10-08 · **Status**: SEAL PREPARATION COMPLETE · **Human Decision**: 全部 PENDING
**原则检验（§14 最小语义原则）**：本 Gate 定义 Identity 而不定义 Entity Intelligence——Character Identity ✓ / Character Psychology ✗ / Entity Identity ✓ / Universal Entity Engine ✗ / Event Role ✓ / Role→Identity 自动晋升 ✗

---

## A. Final Design Audit（收敛版）

**统一原则**：`Entity Identity ≠ Actor string ≠ Mention ≠ Event Role`。Identity 只能由 **Identity Authority（authored 录取）** 产生；运行时只能**解析（resolve）**不能**创造**。一切主体化消费（Attribution 主体 / T2 Subject / CW block / Relationship endpoint / SR affect 投影）以 **RESOLVED Entity Ref** 为前提。

## B. Q1–Q8 Human Seal Table

| Q | Recommended Semantic | Current Evidence | Conflict | Human Decision |
|---|---------------------|------------------|----------|----------------|
| **Q1 Identity Authority / Carrier** | **统一逻辑 Authority，物理载体可分离**。Entity Identity 只经 authored 录取产生；runtime 禁创建/禁删除；extraction「看到名字」永不创造 Entity；Character = Registry 中 class=character 的一种（上位 Entity 概念正式化）。物理载体三选：**(a) 03_character_bible 升格**（加 class/别名元数据；注意：升格赋予其 Truth 权威，现仅为 lore/Control 用途——不与 CW 反洗白冲突，该契约禁的是 bible 作**心理内容**源，非作**身份**源）/ **(b) 独立 `_system/entity_registry.yaml`**（=新 Truth Carrier，须特批）/ **(c) 分载（03/04/04b 各守其类）+ 统一 resolution API**（须定 canonical 解析序与别名归属） | loader 各自读 03/04/04b；无任何统一 resolution；WL-03 npc collect 曾临时借 03 作 roster（实现推断非契约） | 无冻结契约冲突（附 Q1-a 升格兼容性注记） | **PENDING** |
| **Q2 Character Admission** | **Authored Identity Admission only**：作者建角色档（或未来 authored-seal 通道，本轮不授权）= 唯一录取。其余一切——actor / mention / T2 subject / relationship endpoint / scene.characters / POV / roster / extractor 输出 / authored formation——**只能是 Evidence / Role / Reference，永不自动创造 Character Identity**。未来新 admission 通道须独立语义 Gate | 生产实证：actors 字符串直接成 T2 Subject（伪实体 10 个）；Frozen #10 已裁定枚举≠证据（同向） | 无冲突；与 #10 同向加强 | **PENDING** |
| **Q3 Unresolved Role** | `role → resolve → RESOLVED Ref | UNRESOLVED`。UNRESOLVED 时：Event 保留、Evidence 保留、**主体化消费全拒**（不建 Character/不进 CW/不作 T2 Subject/不作 Attribution 合法主体）。**UNRESOLVED 是 resolution status，不是 Entity** | 现 deterministic 正则产伪主体直入 T2/attribution（待 G1-A 修正的行为） | 无契约冲突（T2 六契约不涉 subject 来源；修正是加前置非改契约） | **PENDING** |
| **Q4 Pronoun / Coreference** | **NO——本 Gate 不解决**。代词/描述语（他/那个老人/门外的人）一律 UNRESOLVED 处理；`Identity Registry ≠ Coreference Resolution`；**COREFERENCE NOT DEFINED / FUTURE GATE**。本 Gate 唯一保证：不确定时系统不能靠猜测制造 Entity Truth | 无任何共指机制存在（他 曾成伪实体=反例实证） | 无冲突 | **PENDING** |
| **Q5 Relationship Affect Basis** | 全局关系事实进入 SR affect 须同时满足：①relationship identity valid（endpoint 双 RESOLVED）②relationship-relevant evidence 存在 ③**Character epistemic basis valid**（该角色对这段关系有合法知悉，标准待您定：T2 存在性 / participant 级）④provenance 可追溯。**T2 存在本身不自动等于 affect basis**。三层严格分离：Global Relationship Truth ≠ Character's Knowledge ≠ Character's Interpretation | 现 `projectAffectRelationship` 无 basis 门直投（代码行为=待修，非受保护契约；knowledge/belief/stance 已有 basis 纪律=同向先例） | 无冻结契约冲突（行为变更经 G1-B EO 授权） | **PENDING** |
| **Q6 Event Identity** | **Event Identity = stable scene context + stable in-scene evidence anchor**；Evidence Anchor（sceneId + 逐字 excerpt[+offset 辅助]）是**构成要件而非全部**。位置 id / producer id / action 前缀**不得**为 identity；refOf 前缀 fallback 废除（fail-closed）。同 scene 同逐字证据（跨 producer/rerun）= 同一 Event → T2 幂等跨 run 恢复。**⚠️ 唯一未定点（HUMAN ADJUDICATION REQUIRED）：span 语义**——同 scene 内同一摘录出现两次（两件相同动作）时：**合并为同一 Event**（接受碰撞）还是 **以 offset 消歧**（同一性=excerpt+offset 双键）？ | 位置 id 生产实证跨路径漂移；重跑双记风险在案 | 无冲突；span 二选一待裁 | **PENDING** |
| **Q7 Historical Quarantine** | **Preserve → Classify → Quarantine → Future Migration**（禁直接删除）。分类：**invalid**（证据上不可能为实体：`车门`/`又`/标点开头串）vs **unknown**（`他` 等代词类、单 run 残留）。**Quarantine 落点推荐 Sidecar Quarantine Manifest**（旁路清单，不动 world.json 存量 schema）；原始数据全保留；migration 须独立 EO 且保留 provenance | world.json 伪块在案；冻结令已禁清理 | 无冲突 | **PENDING** |
| **Q8 Location / Faction** | Character Identity + 上位 Entity Identity **本 Gate 正式 Seal**；Location/Faction **只封边界**：属未来 identity class 形状、**禁字符串自由创建 Truth**；**不实现 Location Registry / Faction Registry / faction membership**——防 Gate 1 扩张成 Universal Entity System | 04b 孤儿/04 文件名身份在案（消费面浅） | 无冲突 | **PENDING** |

## C. Contract Conflict Report

交叉检查 #10 / #32 / #34(HA-2) / #35 / #42 / #43(H2) / #44 / #45(H3) / CW Store·Seed·Projection·Formation / T2 六契约 / T3 双通道 / Attribution / Access / SR / WCT / F-06：

> **NO CONTRACT CONFLICT FOUND**

两条注记（非冲突）：①Q1-a 若选 bible 升格——CW 反洗白契约禁的是「bible 作心理内容源」，不禁「bible 作身份源」，兼容；但 bible 现被 loader 当 lore/Control 消费，升格后**身份字段与 lore 内容的边界**须在 G1-A EO 内明确（身份只认录取元数据，不认正文叙述）。②Q6 span 二选一为本 Seal 内嵌的 HUMAN ADJUDICATION 子点。

## D. Gate 1 Non-Goals（NOT DEFINED IN GATE 1）

Pronoun/Coreference · Goal · Value · Emotion · Thought · Motivation · Agency · L1 Option Formation · L2 Dominance · Choice · Time Authority · State Authority · Location Runtime · Faction Membership Runtime。
**Character Identity ≠ Character Psychology。**

## E. Post-Seal Authorization Boundary

Seal 通过 ≠ 实现授权。最多开放三个 Named EO（各须单独授权）：
- **G1-A Identity Authority & Resolution**（Q1/Q2/Q3/Q7 落地：registry/resolution 前置于 T2+Attribution 双咽喉/quarantine manifest）→ regression → production → literary → root-cause + authority-gap rescan
- **G1-B Relationship Affect Basis**（Q5：basis 门）→ 同上验证链
- **G1-C Event Identity**（Q6：证据锚 + refOf fallback 废除 + 幂等恢复）→ 同上验证链
三者相对独立：A 与 B 可并行；C 依赖 Q6 span 裁决。

## F. Exact Human Adjudication Questions（最小问集）

1. **Q1**：Identity Authority 采统一逻辑+物理分离——载体选 (a) bible 升格 / (b) 独立 registry（新 Carrier 特批）/ (c) 分载+统一 API？
2. **Q2**：Character Admission = authored-only？（未来 seal 通道另开 Gate）
3. **Q3**：UNRESOLVED 处置=静默降级+观测计数，还是 UNKNOWN-tag 显式落盘？
4. **Q4**：Coreference 本 Gate 禁（确认 NOT DEFINED / FUTURE GATE）？
5. **Q5**：affect basis 标准=T2 存在性，还是 participant 级？
6. **Q6**：Event 同一性=sceneId+逐字证据；同摘录双现=合并（excerpt 单键）还是消歧（excerpt+offset 双键）？
7. **Q7**：Quarantine=Sidecar Manifest（不动存量）？
8. **Q8**：Location/Faction 只封边界不建系统（确认）？

---

**STOP——Seal 文档就绪，未写任何代码，未创建 EO，未开 Gate 2，未清理任何历史数据。等待 Human Seal。**
