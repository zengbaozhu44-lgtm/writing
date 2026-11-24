# GATE 1 — ENTITY IDENTITY & SUBJECT BOUNDARY · Design Audit

**Mode**: READ-ONLY DESIGN GATE（禁止实现；本文所有「提案」均待 Human Seal 裁决）
**Date**: 2026-10-08 · **前置**: identity-family-archaeology-dependency-map.md / story-truth-root-cause-archaeology-01.md
**目标**: 正式定义 InkOS 中「谁/什么」可以作为 Story Truth 中持续存在、可被引用、可被归因、可被访问、可进入 Character World 的实体。**Identity ≠ Role。**

---

## 1. Entity Identity Definition（提案）

**什么具备 persistent identity**：只有被 **Identity Registry（权威实体注册表）** 收录的条目。
- **成立条件**：经 Admission Authority 写入 Registry（带 class、canonical name、别名表、provenance、createdAt）
- **Authority**：**authored channel 独占**——运行时任何组件不得自创/自灭 Entity（禁 identity-by-accumulation）
- **Provenance**：Registry 条目自身（作者 + 时间）；一切下游引用必须可回溯到 Registry 条目
- **生命周期**：authored 创建 / authored 退休（retired 后不删历史，只停新增引用）
- **跨 scene/chapter 连续性**：canonical name 键 + 别名映射；prose 表面串经 **Role Resolution** 归一到 Registry 条目
- **两类存在**：`Registered Entity`（有身份）vs `Ephemeral Mention`（prose 表面串，无身份、不可被下游引用、不持久化为主体）

**SEMANTIC FRONTIER Q1（Seal 必答）**：Registry 载体三选一——(a) 03_character_bible 升格为通用 Entity Registry（加 location/faction class 子目录或扩展）(b) 独立 `_system/entity_registry.yaml`（新 Truth Carrier，须按规矩特批）(c) 分载（03=character，04/04b=faction/location，各守其类，加统一 resolution API）。

## 2. Character Identity Definition（提案）

**Character = Registry 中 class=character 的 Registered Entity**。
- **Character Admission 位置**：唯一咽喉=「Actual→Experience / Attribution 消费之前」的 **Subject Resolution** 步骤（见 §4）；T2/Attribution/SR/CW 任何 carrier **不产生** Character，只消费已录取身份
- **Admission Authority**：authored（作者建角色档=录取）；可选扩展=authored seal 通道（作者以 seal 声明新角色，同 T3 通道 B 先例）——**Q2（Seal 必答）**：authored-only 还是 authored+seal？
- **明确禁止**（裁决确认）：actors[]/participant/witness/speaker/affected/prose 出名/Control roster → 一律**不产生** Character 身份

## 3. Role / Identity Boundary（提案）

Actor/Participant/Witness/Speaker/AffectedEntity/Subject = **event role**（事件域字符串，生命周期=单事件），**不是 persistent identity**。
**Role Resolution 语义**：`role string → Registry lookup（canonical+别名） → resolved(RefId) | unresolved(标记 unresolvable)`。unresolved 的 role：
- 不进 Attribution 主体、不进 T2 Subject、不建 CW block
- 事件本身仍合法（事件真实性不依赖主体身份）——只有**主体化消费**被拒
- **Q3（Seal 必答）**：unresolved 处置=静默降级（事件保留、主体消费拒绝+计数观测）还是 UNKNOWN-tag 显式落盘（可审计但增载体）？

## 4. Subject Admission Boundary（提案——四级各守其权）

```
Entity Admission      = Registry 录取（authored 独占）
Character Admission   = class=character（同上）
Access Admission      = 既有 Experience 级谓词（participant/present-witness，不动）
T2 Admission          = 既有六契约 + 新前置：subject 经 Resolution 为 admitted Character
```
**回答指令 §8 问题**：「event participant 是否自动获得 Character Identity？」——**裁决答案必须是 NO**：participant 是 role；只有该 role resolve 到已录取 Character 时才产生 T2 Subject。

## 5. Attribution Identity Boundary（提案）

Attribution 主体引用 **Registry 条目**，不引用 role 字符串。`candidatesFromScene` 的 actors 展开 + pov 兜底须改为：resolve(actors[i]) → resolved 才归因；全 unresolved → 该事件无归因（记录 unresolvable-count，**不**造伪主体）。recordId 锚定 resolved RefId。

## 6. Relationship Endpoint Identity（提案）

05 边的 from/to 必须引用 admitted Entity（class=character 或未来类）；加载时校验，unresolved 端点的边=invalid edge（authored 校验层拒绝，报作者）。endpoint 与 character 共用同一 Registry Authority（**同一套身份，不分家**）。

## 7. Relationship → SR epistemic boundary（提案）

**全局关系事实进入 SR affect_relationship 的条件**（对齐 knowledge/belief/stance 的 basis 纪律）：
- (a) authored per-character affect 块（既有 readAuthoredCharacterBlock 通道）——作者直授；或
- (b) **basis-gated**：该角色存在合法 T2/basis 建立其对这段关系的**知悉**（如亲历相关事件），投影时标注 basis
- 无 basis 的全局边 **不投** affect 槽（prompt TopK 展示不受限——展示≠SR 主体状态；prompt 文案不作为 Truth boundary，遵指令 §10）

**Q5（Seal 必答）**：basis 标准采用 T2 存在性即可，还是要求特定 access 级（participant）？

## 8. Location Identity（提案——最小）

Location = Registry class=location（04b 升格或 Q1 裁决载体）。「去过某地」（T2 经历）与「地存在于世界」（Registry/World）保持两个 Truth——**维持现状分层，不建新架构**（当前消费面仅 clock 展示，生产未证明需要 membership/坐标）。string-equality 归一暂可接受，待生产证明不足再议。

## 9. Faction Identity（提案——不扩）

Faction = Registry class=faction（04 文件即条目）。**不建 Actual faction membership 系统**（现行契约可安全表达：定义=authored、提及=展示、认知=knowledge 文本、信念=belief 命题；无伪造面）。若 Seal 认为未来需要 membership，属新语义缺口另行开题。

## 10. Event Identity（规则提案，**本轮禁止实现**）

**什么条件下两个 Event 是同一个 Event**——提案：**identity = grounding evidence 锚**（sceneId + 逐字 excerpt + 段内位置），而非位置 id。
- 同证据（同 scene 同逐字摘录）→ 同一 Event（跨 producer/跨 rerun 稳定）
- producer 切换（llm/deterministic）不换身份（只要 evidence 相同）
- dedupe 键（kind|action|excerpt）与 actualRef 统一迁到 evidence 锚；**occurrenceRef 前缀 fallback 废除**（fail-closed：无法解析→UNKNOWN，不用内容前缀顶替）
- T2 幂等（actualRef）随之跨 rerun 稳定
**Q6（Seal 必答）**：evidence 锚 = excerpt 全文 hash？excerpt+offset？sceneId+excerpt 双键？（涉及同摘录两事件的可分性）

## 11. Cross-run Identity Continuity（提案）

Registry RefId 永稳；Event=证据锚（§10）；rerun 幂等由证据锚恢复；unresolved identity 的下游产物=**不产生**（而非错产生）。历史 run 的产物按 §12 处置。

## 12. Historical Data Treatment（提案）

存量四类（world.json 伪块 / 旧 actor 名 / 旧 T2 / 旧 actualRef+attribution）：
- **valid**：resolve 命中 Registry（林逸/苏眠/镜渊/老周）
- **invalid**（证据上不可能为实体）：`车门`、`又`、标点开头串等 → **quarantine**（标记 non-authoritative residue、从投影/消费排除），**不删除**（历史只读）
- **unknown**：`他` 等代词类、单 run 残留 → quarantine + 观测，待共指政策
- **Q7（Seal 必答）**：quarantine 标记落在 world.json 内（字段标记=动存量 schema）还是旁路清单（不动存量）？
- **Q4（Seal 必答）**：代词/共指（他→林逸）——本 Gate 范围内禁（默认 unresolved）还是留未来共指 Gate？

## 13. Authority Map（提案）

| 能力 | Authority |
|------|-----------|
| Entity 创建/退休/别名 | authored（Registry） |
| class 判定（character/location/faction） | authored（Registry 字段） |
| Role Resolution（运行时） | 确定性 lookup（无推断、无 LLM、无模糊） |
| Character Admission | =Entity Admission（authored） |
| Attribution 主体 | 仅 resolved Character |
| T2 Subject | 仅 resolved Character（Access 门前置之后再验六契约） |
| Event identity 铸造 | 证据锚（确定性派生，非 authority 而是规则） |
| 历史清洗 | Named EO 独占（Seal 后） |

## 14. Illegal Shortcut Map（Seal 后成为禁令清单）

prose 出名→Character · actors[]→Character · participant→Character · witness→Character · speaker→Character · affected→Character · Control roster→Truth identity · 累积→身份 · 未解析 role→Attribution 主体 · 位置 id→Event identity · 内容前缀→occurrence 引用 · 全局关系边→SR affect（无 basis） · prompt 文案→Truth boundary · Registry 之外的一切主体化消费。

## 15. Downstream Consumer Impact（若 Seal 通过）

T2 append（+subject resolution 前置）· attribution wiring（resolve 化）· CAT refOf（废 fallback）· CW store（不动 schema；subjects 经 quarantine 排除）· SR affect（basis 门）· prompt TopK（不动）· L1（不动——eligibility 是 Actual 在场判定非身份判定，但枚举名单改用 resolved 名单的**观测**待 Gate 2 复核）· Studio（Registry 展示，薄）。

## 16. Proposed Named EO(s)（Seal 后依次）

- **EO-G1-A Identity Registry & Subject Resolution**（载体按 Q1；T2/Attribution 双咽喉 resolve 化；quarantine 按 Q7；含 §3 role 语义与 §5 归因边界）
- **EO-G1-B SR affect basis 门**（§7，独立小 EO，可并行）
- **EO-G1-C Event Identity 证据锚**（§10，独立 EO，含 refOf 废除与幂等恢复）
- 历史迁移并入 EO-G1-A 的 quarantine 步骤（删除/回填一律禁止）

---

## Human Seal 问题集（最小八问）

Q1 Registry 载体（03 升格 / 独立 yaml=新 Carrier 须特批 / 分载+统一 API）
Q2 Character Admission（authored-only / authored+seal 通道）
Q3 unresolved role 处置（静默降级+观测 / UNKNOWN-tag 显式）
Q4 代词共指（本 Gate 禁 / 留未来 Gate）
Q5 affect basis 标准（T2 存在性 / participant 级）
Q6 Event 证据锚形态（hash / excerpt+offset / 双键）
Q7 quarantine 落点（存量内标记 / 旁路清单）
Q8 本轮是否同时录取 location/faction class（或 character-only 先行）

**STOP——本 Gate 只读设计完毕，零实现，等待 Human Seal。**
