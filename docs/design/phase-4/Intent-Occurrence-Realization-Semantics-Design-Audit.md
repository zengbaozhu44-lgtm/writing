# Intent–Occurrence Realization Semantics — Design Audit

```text
STATUS: READ-ONLY · NO CODE · NO SCHEMA · NO ONTOLOGY CHANGE
BASIS: A/B/B2 实验 30 样本（tmp-ab/）· 8 场真实生产 stress corpus（tmp-stress/）
       · 冻结设计门 3 份 · 全链代码考古
VERDICT: B — DESIGN GAP（见 §11）
```

---

## 1. Current correspondence 的真实语义（Q1）

`occurrenceCorrespondsToIntent`（character-action-truth.js:47-85）的实际判定：

```text
输入：intentTruth{characterId, actionContent}（Truth）+ occurrence{actors, action, evidence.excerpt}
判定：① characterId ∈ actors（Truth 级）
     ② 归一化全包含（action/excerpt ⊇ Y 或反之）（词法启发式）
     ③ 滑窗重叠：Y 的连续 ⌊|Y|/2⌋ 字片段出现在 action 或 excerpt（词法启发式）
隐含假设 H1：realization 落在单个 occurrence 内
隐含假设 H2：realization 与 Y 词法连续可追（同一 normalize 空间）
隐含假设 H3：occurrence.action（≤80字）与 excerpt（≤160字）足以承载动作证据
```

设计门原文的**意图语义**是「corresponding Action occurrence … X realizing Y」——即
**Occurrence realizes Intent**。实现语义是它的确定性代理：**词法可追的单 occurrence 匹配**。
两者在模板散文上重合，在真实文学散文上分离（实验证明，见 §3）。

## 2. Character Action Truth 的应然语义（Q1 续）

冻结链路的定义性目的：证明「**持有已决 Intent 的角色 X，其决意行动 Y 确实在世界中发生**」，
从而把 occurrence（ mere happening）升格为 character-attributable action，并为 WCT 提供
「同一 occurrence 链上的世界变化」锚点。因此应然语义是：

> **B：Occurrence realizes Intent**——而非 A（文本匹配）。文本匹配只是 B 的一个
> fail-closed 确定性判据，不是语义本身。

## 3. 失败分类（真实样本，R1–R9）

| 类别 | 定义 | 真实样本（出处） | 现谓词表现 |
|---|---|---|---|
| R1 lexical synonym | 同义措辞 | stress ch1_s2：Y=砸碎→正文「撞上…整块碎开」；map 系列：Y=地图→正文全篇「图/真图」 | fail |
| R2 insertion | 虚词/插入拆散锚词 | B2 archive/B21：正文「肘尖砸**向 K27 柜门的**玻璃」（砸/碎/玻璃全在场，连续 5 字窗口不成立） | fail |
| R3 decomposition | 多 occurrence 序列共同实现 | B2 map/B21：举起真图→摸出打火机→火焰舔上纸角（「烧掉地图」无单点承载）；B2 archive：砸(occ1)+取出(occ2) | fail（H1） |
| R4 preparation≠realization | 准备≠实现 | B2 archive/B24：撬锁念头+回形针（正文含碎/玻璃锚词，但方法层面只是尝试撬） | 误配风险：锚词齐现≠实现 |
| R5 failed attempt | 尝试失败 | 语料未见终局失败样本；正文常见「纹丝不动/卡死」局部失败（B2 archive/B22「锁孔…咬死」） | 同上 |
| R6 partial realization | 部分实现 | B2 map/B2x：火焰「舔上纸角…焦褐的边」（燃烧开始，烧毁终局未落笔） | 若放宽为链匹配会误判为完成 |
| R7 indirect realization | 经状态变化间接实现 | stress ch1_s3：「林逸松手。地图落进镜渊摊开的掌心」（交出=地图易主）；ch2_s3「扣住腕骨…纸角滑出」（搜出=物证转移） | fail |
| R8 unrelated co-occurrence | 共现≠实现 | B2 archive/B23：环境描写含「柜子/玻璃观察窗」锚词但未行动 | 任何放宽都必须过此关 |
| R9 contradiction/reversal | 反向实现 | 语料未出现；必须防（保护→撕毁） | 现谓词天然不误配 |

**结论**：真实失败以 R2+R3 复合为主（B2 8/10 锚词在场仍全败的直接原因），R1 贯穿一切，
R7 是文学最自然的实现形态，R4/R5/R6/R8 是任何放宽方案的误判来源。

## 4. 重点考古结果

### A. Actual / StoryEvent（Q7 前半）

已具备：`actors`（LLM 路径 100% 有效+actorEvidence 逐字）、`action`/`consequence`（逐字
grounded）、`stateChanges`（B2/stress 已产出「抽屉被撬开三公分/柜体变形/观察窗破裂/火焰舔上纸角」
级标签）、`evidence.excerpt`（字面）、scene 归属（sceneId）。**多事件共成一事**在数据层
已经成立（B2 map/B21 四事件链完整在场）——缺的不是数据，是**读取它们的 realization 关系语义**。
注意：LLM 路径 `evidence.offset` 未填充——但 excerpt 字面定位可在判定时用 `text.indexOf`
确定性重建顺序，无需 schema 变更。

### B. State Evolution（Q7 后半）

「Intent 被实现」能否由 Actual-grounded state transition 表达？**部分能**：`stateChanges`
+ `consequence` 已能承载「地图存在→火焰接触→纸角焦褐」的文本级状态证据；但**没有类型化
状态机**（「烧毁」的终局判定仍是字面锚词而非状态代数）——足以做 evidence，不足以做
automated state algebra。够用性判定：**作为 realization 的终局证据（evidence-only）足够**。

### C. Character Action Truth 现结构

当前 record `{status, characterId, actionContent, intentRef, occurrenceRef(单), reason,
provenance, isChoice:false}`——代码确实把语义**实现层面**钉死在「一次 occurrence 对应一次
Intent」（H1）。Truth 输入只有 characterId；其余全是词法启发式。`status: asserted|absent`
二元——见 §6。

### D. WCT 依赖（Q7）

`deriveWorldConsequenceTruth` 经 `occurrenceRef`（单 id）找 occurrence，从**该 occurrence**
的 consequence/stateChanges 取 W。即 WCT 结构上要求 Character Action 已被**单一 occurrence**
确认——但设计门原文是「world-change evidence W **on/through** that occurrence」——"through"
在冻结文本上已容忍链式。若 Character Action 的 occurrenceRef 指向**终局 occurrence**，
WCT 的全部现有语义原样成立（W=终局状态变化）。**WCT 无需重设计。**

## 5. 模型比较（§五）

| | Model A 单 occurrence | Model B occurrence chain | Model C state transition | Model D 混合（chain+terminal state） |
|---|---|---|---|---|
| 覆盖 R1 | ✗ | ✗ | 部分 | 部分（靠锚词+终局） |
| 覆盖 R2 | ✗ | ✓（锚分布） | ✓ | ✓ |
| 覆盖 R3 | ✗ | ✓ | ✓ | ✓ |
| 覆盖 R7 | ✗ | ✗ | ✓ | ✓（终局=易主/毁坏状态） |
| 防 R4/R5/R6 | 天然防 | **不防**（链齐≠完成） | ✓（无终局态即不判完成） | ✓（终局 evidence 必须 grounded） |
| 防 R8 | 视判据 | 需锚词纪律 | 需对象绑定 | actor 一致 + 终局态 + 锚词分布三重约束 |
| Truth 安全 | 最高 | 中 | 中高 | 高（全确定性可审计） |
| 需要 ontology 变更 | 无 | record 内加 occurrenceRefs[]（内部证据关系） | 同 B + 终局态判据 | 同 B |

**判定：Model D 是语义正确形状**；Model A 只对原子动词足够（推开/坐下），对复合意图
（烧掉/取出/交出）在真实文学上结构性失明。但 D 的每一项判据都必须确定性且防 R4-R9——
这正是 §8 最小设计的主题。

## 6. 「实现」vs「发生」：状态粒度（Q5）

真实语料至少出现四档：attempted（回形针撬锁念头）、partial（火焰舔上纸角，烧毁未落笔）、
realized（地图落进掌心）、contradicted（未观测到但必须防）。当前 `asserted|absent` 把前
两档与「未实现」混为 absent——**粒度不足已暴露**（下游无法区分「失败的动作」与「没写」，
SR/续写本可消费 attempt/partial 信息）。本轮不改 schema；如实报告：若 Model D 落地，
status 至少需要 `asserted | attempted-or-partial(记录) | absent` 的讨论——属 Design Gate 议题。

## 7. Actual-grounded semantics 能否独证 realization（Q7 核心）

对「Intent: 烧掉地图 / Actual: 地图被点燃+烧毁」：若 actor=X、链内 occurrence 全部
actor=X、终局状态证据 grounded——**文本上足以支撑「X 实现了 Y」**；但「足以支撑」≠
「可确定性判定」：把「Y 的终局状态」从 Y 文本中确定性析出（地图+毁）仍需锚 token。
**结论：correspondence 的核心可以从文本相似度迁移到「Intent ↔ Actual-grounded realization
的语义关系」，其确定性判据 = 锚词分布 + 终局状态证据，两者都需要 authored anchors
（人类写锚）保持权威安全。**

## 8. 最小 correspondence redesign（若裁决接受 Model D；不实现）

```text
Intent(X,Y) asserted
+ 同场景内 occurrence 链 [O1..On]（顺序 = excerpt 在 scene.text 中的位置，确定性重建）
+ ∀Oi：actors 含 X（Truth 输入）
+ 锚集覆盖：Y 的 authored anchors 每个 ∈ ∪Oi(action ∪ excerpt)   ← 免疫 R2/R3
+ 终局证据：On 的 consequence/stateChanges 含 Y 的终局锚（对象+结果），字面 grounded ← 防 R4/R5/R6
+ 终局跨度无失败标记（高精度否定词表：没能/没有成功/纹丝不动…）                ← 防 R5
+ anchors 只在动作句计入（携带于 occurrence 的 action/excerpt，而非环境描写）  ← 防 R8
→ Character Action asserted { intentRef, occurrenceRefs[], terminalOccurrenceRef }
WCT：从 terminalOccurrenceRef 铸造（现有 gate 语义不变）
```

依赖：authored CADE 决策附带 `anchors:[...]`（人类权威，同 authored 决策本体）；
无 LLM、无 embedding、无 Plan fallback、无 Writer 自证、无 Desire/Goal/GGC——§8 禁捷径全数规避。

## 9. 禁捷径核查

LLM Truth Judge ✗ 未用；embedding 判定 ✗ 未用（仅人类阅读审计）；Plan/goal fallback ✗；
Writer confirmation ✗；Desire/Goal/GGC ✗ 未重开 H3.3。

## 10. 十问十答

- **Q1** 意图语义=B（realizes），实现语义=B 的词法单点代理。见 §1-2。
- **Q2** **是**——代码把实现关系压缩为文本相似（fail-closed 代理）；设计门语义本身没这么窄。
- **Q3** 单 occurrence 只对原子动词必要；对复合意图是结构性误设（R3 实证）。
- **Q4** **可以**——真实语料中复合意图天然以 ordered occurrences 实现（B2 map 四事件链）。
- **Q5** **必须区分**（attempted/partial/realized/failed 已在语料中出现）；现二元 status 粒度不足，如实报告，不改。
- **Q6** **能**（作为 evidence-only 终局证据）；不能作为类型化状态代数（也无需）。
- **Q7** Actual/State 数据**已足够**表达 realization（链、锚、终局态全在场）；WCT 经
  terminalOccurrenceRef 原样成立；缺的只是读取语义。
- **Q8** **不需要新宏观 ontology primitive**——multi-occurrence realization 是 Character
  Action Truth 的**内部证据关系**（record 增加 occurrenceRefs[]/terminalOccurrenceRef，
  不触碰禁字段表，不新增权威对象）。
- **Q9**（若不动 ontology）最小合法修复 = §8 的 correspondence v2：authored anchors +
  链式锚覆盖 + 终局状态证据 + 否定词防线。全部确定性、可审计、fail-closed。
- **Q10** （若需 ontology 变更——本审计判定不需要）真正阻塞主路的缺口不是 primitive 缺失，
  而是「Character Action ↔ WCT 之间共享的 occurrenceRef 从单点升为终局锚点」这一**记录形状**
  变更，属冻结 record 的 Design Gate 授权范围。

## 11. 最终裁决

## **B — DESIGN GAP**

当前 correspondence 的语义过窄（单 occurrence + 连续词法窗口），已被 30 样本真实文学实验
证明无法表达实际发生的 Intent realization（R2/R3/R7 为主因），且 Phase 1.3 与锚定 steering
已把上下游能力备齐——瓶颈唯一残留在 correspondence 算法内部。**可在现有 ontology 内解决**：
§8 最小 redesign（authored anchors + ordered chain + 终局 Actual 证据），Character Action
Truth record 仅扩展内部证据字段，WCT 零变更。**不实现，待 Human Named EO 授权。**

---

```text
READ-ONLY · NO CODE · NO SCHEMA · NO ONTOLOGY CHANGE
STOP: YES（design gate 材料，交女王裁决）
```
