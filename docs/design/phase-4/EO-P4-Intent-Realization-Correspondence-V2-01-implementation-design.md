# EO-P4-Intent-Realization-Correspondence-V2-01 — Implementation Design

```text
MODE: HUMAN NAMED EO · IMPLEMENTATION DESIGN（本轮不改代码/schema/测试/prompt）
INPUT: Intent-Occurrence-Realization-Semantics-Design-Audit.md（B — DESIGN GAP 已证明）
FINAL: A — READY FOR IMPLEMENTATION（见 §20；1 个 low-risk open question 待批注，不阻塞）
```

---

## 1. EO Scope

把审计 §8 的最小 redesign 收敛为可实现规格：

```text
Intent Truth(X, Y[, anchors])
    ↓
同场景 ordered occurrence chain（deterministic 重建）
    ↓
realization evaluation（锚分布 + 终局证据 + 否定防线）
    ↓
terminal occurrence
    ↓
Character Action Truth（record 最小内部扩展）
    ↓
WCT（零代码零 schema，经 terminalOccurrenceRef）
```

**In scope**：`occurrenceCorrespondsToIntent` 内部算法 v2；CADE/Intent Truth 的**可选** anchors 透传；Character Action Truth record 内部字段（`occurrenceRefs[]` + `terminalOccurrenceRef` + 兼容别名）。
**Out of scope**：Actual primitive、WCT、SR、Attribution、Choice/L1/L2/Goal/GGC、Phase 5/6/7、Action lifecycle。

## 2. Current Contract（基线）

- `occurrenceCorrespondsToIntent(intentTruth, occurrence)`：characterId ∈ actors + 归一化包含/滑窗（连续 ⌊|Y|/2⌋ 字）。
- `deriveCharacterActionTruth`：逐 occurrence 单点评价，首个匹配即 asserted（`occurrenceRef` 单 id）。
- `deriveWorldConsequenceTruth`：读 `actionTruth.occurrenceRef` 找**该** occurrence 取 W。
- **record 消费者考古（本轮验证）**：Truth 消费者唯一 = WCT；orchestrator 仅回填序列化；studio 仅置空默认。**SR / State Evolution / Attribution / prompt 均不消费 `characterActionTruth`** → 兼容别名即可零破坏。

## 3. Proven Semantic Gap（引用审计，不重开）

R2 insertion（砸**向K27柜门的**玻璃）、R3 decomposition（举起→打火机→火焰）、R7 indirect（松手→地图落进掌心）为真实主导失败；R4/R5/R6/R8 为放宽的误判源；30 样本 + 8 场 stress 为证据（tmp-ab / tmp-stress）。

## 4. Direct / Mediated / External Realization

| 形态 | 定义 | 判定（deterministic proxy） | Character Action |
|---|---|---|---|
| **Direct** | X 的行动直接造成终局 | 链内全部 occurrence actor=X，终局锚落任一链 occurrence 的 consequence/stateChanges | **asserted** |
| **Mediated** | X 行动、机制完成终局（按下按钮→门开启） | 终局 occurrence actor≠X **允许**，条件：(a) 链内存在 ≥1 个 X-actor occurrence；(b) 终局 occurrence 与该 X-occurrence 存在**共享锚 token**（≥2 字，出现在两者 action/excerpt 之一）——对象连续性约束 | **asserted**（X 持有，机制为工具） |
| **External** | 第三方 Y 独立完成（X 请求→Y 开门） | 终局 actor≠X 且**无**共享锚连接 X-链 | **absent**（`reason: external_unlinked_realization`，fail-closed） |

corpus 实证：ch1_s2「交出档案→光栅熄了警铃也停了」= mediated（共享锚 光栅/警铃）；external 在语料中 NOT OBSERVED（以 synthetic 测试覆盖）。**归属边界：绝无「Intent 存在 + 世界变了 → 归 X」路径**；X 的所有权只经共享锚的对象连续性成立。

## 5. Attempt / Partial / Realized / Failed —— 状态粒度裁决

**采用方案 1：保持 `asserted | absent`，仅完整实现判 asserted。** 依据：

- 下游唯一 Truth 消费者 WCT 只需要「已完成」（W 从终局取）；
- attempt/partial 目前**无任何生产消费者**（SR/State 不读此 record）；
- 审计已证 attempt/partial 证据存在，但「证据可存」≠「必须成为 Truth 状态」——本 EO 拒绝 lifecycle 蔓延。

attempt/partial/failed 的诊断信息以 **`reason` 字符串**承载（非权威、可审计）：
`no_anchor_coverage` / `terminal_negated` / `terminal_evidence_missing`（=partial/attempt 常态）/ `external_unlinked_realization`。若未来 SR 要消费 attempt 级状态，另开 EO（记录于 §18）。

## 6. Candidate correspondence v2（核心算法规格）

```text
evaluateRealization(intentTruth, occurrences, sceneText):
  0. anchors 不存在 → 走 v1 单点词法路径（现行行为，back-compat）
  1. 链构造：同 scene 内 occurrences，按 excerpt 在 sceneText 中的字面位置排序
     （indexOf 确定性重建；LLM 事件无 offset 亦可；链长 ≤8，超出取含锚最近者）
  2. actor 过滤：X-occurrences = actors 含 X 者；空 → absent(no_x_occurrence)
  3. 锚分布（见 §7-§8）：
     object 锚：每个 ∈ ∪链内 occurrence(action ∪ excerpt)      ← 免疫 R2/R3
     action 锚：≥1 个 ∈ 某 X-occurrence(action ∪ excerpt)      ← R8 纪律
     terminal 锚：全部 ∈ 终局 occurrence 的 consequence ∪ stateChanges（grounded）
  4. 终局判定：满足 §4 形态表（Direct 任一链 occurrence / Mediated 带共享锚 / External fail）
  5. 否定防线：终局 span（consequence+excerpt）命中 §10 词表 → absent(terminal_negated)
  6. PASS → asserted { intentRef, occurrenceRefs[], terminalOccurrenceRef, occurrenceRef(别名=terminal) }
```

## 7. Authored Anchor Semantics（§九五问）

- **Q1 现有 actionContent 够吗**：不够。任意中文 Y 的确定性动词/宾语切分需要分词器/词表，词表法已被实验证伪（F5）；fail-closed 要求显式锚。
- **Q2 为何 Author 提供**：与 authored 决策同一权威通道（人写锚，确定性闸门查锚）；不引入 LLM/embedding。
- **Q3 固化作者措辞错误**：anchors 是**语义辅助约束，非 Reality Truth**（裁决原文）。错误锚的后果=该决策低命中（fail-closed absent），与错误的 actionContent 同类同责；不污染他人。
- **Q4 锚语义（分组覆盖）**：`anchors: { object:[必齐, 可分布], action:[至少其一, 限 X-occurrence], terminal:[必齐, 限终局 consequence/stateChanges] }`。三类各至少一锚，否则视为 anchors 不完整 → 回退 v1。
- **Q5 单锚「地图」防误判**：三重组制度使「拿起地图」只能满足 object 锚——action 锚（烧/点燃…）与 terminal 锚（烧毁/灰烬…）不满足 → absent(terminal_evidence_missing)。「只拿起」永不判 realized。

**必要性结论**：anchors 为 **opt-in**（缺失即 v1 回退），不强制作者负担，不回溯破坏存量 CADE。

## 8. Ordered Occurrence Chain

- 顺序 = excerpt 在 scene.text 中的字面位置（确定性，无新存储需求）；
- **同 scene 限定**（跨 scene 实现属未来 EO——语料中未出现需要跨场的已决行动实现，NOT OBSERVED）；
- 不建事件图、不加边对象、不持久化链（链为求值期派生结构，结果只落 record 三字段）。

## 9. Terminal Realization Evidence（§十合规声明）

终局证据**只读**三类既有 grounded 字段：occurrence.consequence / stateChanges / evidence.excerpt（validator 已强制字面）。**不做**：世界状态推演、因果链构造、未写后果推断、Writer intention、Plan expected consequence。它只回答「Y 是否已在文本中完成」，不回答「之后世界会怎样」——后者属 WCT，且 WCT 语义不变。

## 10. Negative / Failure Guards

corpus 否定标记审计（18 篇真实文本）：仅 `纹丝不动`(2)、`咬死`(3) 真实出现；`没能/未能/没有成功/失败了` 零出现但高精度。**最小词表（8 项，冻结）**：`纹丝不动 / 咬死 / 卡死 / 没能 / 未能 / 没有成功 / 失败了 / 没点着`。规则：词表命中**终局 span** → absent；命中非终局 occurrence 不阻断（局部失败后成功合法）。不做 NLP 否定域分析。

## 11. Character Action Truth Record Impact

```diff
  { status, characterId, actionContent, intentRef,
+   occurrenceRefs: [O1..On],        // 内部证据关系（审计 §10 授权范围）
+   terminalOccurrenceRef: On,
    occurrenceRef: On,               // 保留 = 终局别名（WCT 与序列化零改动）
    reason, provenance, isChoice:false }
```

七问：①向后兼容=**需要且已保**（别名）；②消费者=WCT/orchestrator 回填/studio 空默认（§2）；③WCT 只需 terminal ✓；④无单点依赖者（v1 匹配点即终局，语义等价）；⑤保留别名 ✓；⑥序列化=整对象 JSON，additive 无损；⑦Attribution 不读此 record（attribution-gate 输入为 prose evidence）；⑧WCT 见 §12；⑨SR 不读；⑩State Evolution 不读（只读 actualEvents/wct）。**禁字段表（choice/option/agency/goalId/lifecycle/evidenceGraph/authorityFramework）零触碰。**

## 12. WCT Impact

`deriveWorldConsequenceTruth` 读 `occurrenceRef`（=别名=终局）→ 从终局 consequence/stateChanges 取 W——**语义更准**（W=终局状态变化，即「光栅熄了警铃也停了」所在处）。设计门原文「W on/**through** that occurrence」本已容忍。**WCT 零代码、零 schema。** 无冲突。

## 13. Production Call-Chain Impact

| 边 | Authority | Evidence | Consumer |
|---|---|---|---|
| Authored 决策(+anchors) → CADE | **Human**（authored 通道） | chapter_plans YAML | mintCADEFromAuthoredDecisions（现有，透传 anchors 字段即可——CADE 校验白名单加 anchors，additive） |
| CADE → Intent Truth | Intent Authority（既有） | CADE record | deriveActionIntentTruth（透传 anchors，additive 字段） |
| prose → Actual occurrences | 确定性闸门（Phase 1.3，既有） | 字面 excerpt/actorEvidence | extractor（既有） |
| Intent+occurrences → **Character Action** | **本 EO 唯一 Truth 判定点**（correspondence v2，确定性） | 链+锚+终局 grounded | deriveCharacterActionTruth（内部算法替换） |
| Character Action → WCT | WCT Authority（既有，不变） | terminal occurrence | deriveWorldConsequenceTruth（零改动） |
| WCT → Actual/State | 既有消费（不变） | — | readback/evolve（零改动） |

orchestrator/`attachCharacterActionTruth` 签名与调用点**零改动**；仅 `character-action-truth.js` 内部实现替换 + cade.js 白名单增 `anchors`（optional）+ intent-truth 透传。

## 14. Test Matrix（真实 corpus 优先；synthetic 明确标注）

| # | 案例 | Intent | Occurrences（出处） | 语义解释 | 预期 | Reason |
|---|---|---|---|---|---|---|
| P1 | 原子单点 | 推开厚重的铁门 | 单 occurrence（单测 fixture） | direct 原子 | asserted | v1 路径/锚全齐 |
| P2 | R1 同义 | 砸碎档案柜玻璃取出档案 | 撞上…整块碎开…抽出来（stress ch1_s2 原文） | direct | asserted | 锚分布+终局=碎开/抽出 |
| P3 | R2 插入 | 同上 | 肘尖砸向K27柜门的玻璃（B2 archive/B21） | direct | asserted | 锚免连续性 |
| P4 | R3 分解 | 当着镜渊的面烧掉真地图 | 举起→打火机→火焰舔纸角（B2 map/B21，**终局补 grounded 烧毁句**为 synthetic 变体，标注） | direct 链 | asserted / 无终局变体=absent | terminal_evidence_missing 区分 |
| P5 | R7 indirect | 交出地图 | 松手→地图落进掌心（stress ch1_s3） | direct（易主即终局） | asserted | terminal=落进掌心 |
| P6 | mediated | 交出档案平息警报 | 递过去→光栅熄了警铃也停了（stress ch1_s2） | mediated 共享锚 | asserted | W=终局 |
| N1 | preparation | 砸碎玻璃取出档案 | 回形针撬锁念头（B2 archive/B24） | 未实现 | absent | terminal_evidence_missing |
| N2 | failed | 同上 | 拽两下…纹丝不动（B2/B 语料） | 失败尝试 | absent | terminal_negated |
| N3 | partial | 烧掉地图 | 火焰舔上纸角…焦褐的边（B2 map） | 开始未完成 | absent | terminal_evidence_missing |
| N4 | R8 共现 | 砸碎玻璃 | 环境描写含玻璃观察窗（B2 archive/B23 开头段，synthetic 成链） | 非行动 | absent | no_action_anchor_in_x_occ |
| N5 | R9 反向（synthetic） | 保护地图 | 撕毁地图 | 反向 | absent | terminal_negated/锚语义反向（词表+终局锚不匹配） |
| N6 | external（synthetic，NOT OBSERVED） | 让门打开 | X 请求；Y 开门（无共享锚） | 第三方 | absent | external_unlinked_realization |
| N7 | 第三方带对象连续（synthetic） | 让门打开 | X 按下按钮；门开启 | mediated | asserted | 共享锚=门 |

## 15. Regression Matrix

全绿基线：7 个 P4 EO 测试、phase13（23）、event-foundation、state-evolution、character-sr、story-route、prompt、prompt-metrics、reality-golden、golden（预存漂移除外）。新增：`test-eo-p4-correspondence-v2-01.js`（§14 全矩阵，deterministic 构造 occurrences，无 LLM）+ anchors 透传链路测试（authored→CADE→Intent）。**v1 回退路径**专项：无 anchors 的存量决策行为逐字节不变（P1 断言）。

## 16. FROZEN / UNTOUCHED

Reality（D1）/ Actual Authority / Information Boundary / Character SR（Phase 3.2）/ **CADE 语义**（仅 additive 可选 anchors）/ Action Intent Truth 语义（仅透传）/ Choice·L1·L2（`isChoice:false` 恒定，本 EO 不把 Intent 重定义为 Choice）/ Goal·GGC（H3.3 不重开）/ Attribution ontology / WCT ontology（零改动）/ State Evolution authority / H2 / HPA-01 / HPA-02 / Phase 6 Survival / Phase 7 Director。禁捷径（§五 6 项）全部规避：无 LLM judge、无 embedding、无 Plan、无 Writer 自证、无 Desire/Goal/GGC、无 Attribution-PASS 联动。

## 17. Risks

1. **锚设计错误→低命中**（作者责任，fail-closed 方向）；2. mediated 共享锚过宽（≥2 字 token 可能偶然共享）→ 以「共享锚须属 object/terminal 锚集」收紧；3. 同 scene 限定可能漏跨场实现（NOT OBSERVED，未来 EO）；4. 否定词表假阴性（未列出的失败措辞）→ 终局锚要求本身已是主防线，词表为二线；5. corpus 词表过拟合（8 项冻结，扩展需 EO）；6. recall 提升导致 WCT 供给增加 → WCT 既有 echo/grounding 闸门不变，天然过滤。

## 18. Open Questions（不阻塞实现）

- attempt/partial 是否升级为 Truth 状态（现裁决：否；SR 消费需求出现时另开 EO）；
- 跨 scene realization 链（NOT OBSERVED）；
- anchors 是否要求 Studio UI 辅助创作（工程便利，非语义）。

## 19. Minimal Implementation Sequence

① `cade.js` 白名单+anchors 校验（optional，三组结构）→ ② `action-intent-truth.js` 透传 → ③ `character-action-truth.js` 实现 evaluateRealization（v1 路径保留为无锚回退）+ record 三字段 → ④ 新测试（§14）→ ⑤ 全量回归（§15）→ ⑥ stress 复跑验证真实命中率与 WCT 供给 → ⑦ 报告。预估改动面：3 个文件核心 + 2 个测试脚本，WCT/orchestrator/SR/State 零改动。

## 20. Final Recommendation

### **A — READY FOR IMPLEMENTATION**

- 无未决 ontology 冲突（内部证据关系，primitive 零新增）；
- 无未决 authority 冲突（Truth 判定点唯一且确定性；anchors 权威=人类 authored 通道）；
- record 最小变化明确（+2 字段+1 别名，消费者全审计，WCT 零改动）；
- 测试/回归矩阵可全确定性定义（无 LLM 依赖）；
- §18 三个 open questions 均不阻塞。

**宁 fail-closed 原则落实**：任何锚不齐、终局无据、终局被否定、外部未连接 → 一律 absent 且 reason 可审计。

```text
DESIGN COMPLETE · AWAITING NAMED EO IMPLEMENTATION AUTHORIZATION
STOP: YES
```
