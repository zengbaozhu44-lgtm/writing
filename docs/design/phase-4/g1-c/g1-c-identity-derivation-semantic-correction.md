# G1-C — Identity Derivation Pre-Execution Semantic Correction

**Mode**: READ-ONLY / NO CODE / NO MIGRATION · **Date**: 2026-10-08 · Gate 1 SEALED（不重开）· EO-G1-C-01 暂缓

---

## 1. Current Sealed Semantics（Q6 原文基准）

> Event Identity = **stable scene context + stable evidence anchor**；
> Evidence anchor 使用 **sceneId + stable in-scene span/offset + excerpt/hash auxiliary**；
> 同一 scene 内相同 excerpt 出现多次：**必须通过 span/offset 消歧**；
> 禁止：positional / producer ID / action prefix / refOf fallback 为 Truth Identity。

## 2. Q-C1 — Offset/Span 的语义地位：**SUPPORTED**

Seal 原文把 span/offset 写进 anchor 定义**并**明文指定其为重复摘录的消歧手段——offset/span 不是纯 locator 的工程选项，而是**被 Seal 授权的 derivation 组件与消歧组件**。实现佐证：schema 既有 `evidence.offset` 字段（确定性路径已在填），非新增语义。

## 3. Q-C2 — Ordinal 的语义授权：**NOT SUPPORTED**

Seal 指定消歧**必须通过 span/offset**；`text-occurrence ordinal` 在任何冻结文本中不存在。它比 candidate-index 更稳定是**工程性质**，不构成 Truth authority。**我此前 EO 编译以 ordinal 替代 Seal 指定的 offset——属编译错误，按令删除，不自行替代。**

## 4. Q-C3 — Offset vs Ordinal（语义审计，不选型）

| 场景 | A：sceneId+excerpt+offset | B：…+ordinal | 变化归属 |
|---|---|---|---|
| 1 提取排序变 | 不变 | 不变 | Identity 问题（两案均稳；但 A 的每个组件均有 Seal 授权） |
| 2 producer 换 | 同摘录+同位置→同 id；异摘录→异 id | 同左 | **Evidence 问题**（见 Q-C4） |
| 3 rerun 同文本 | 不变 | 不变 | Identity 问题（S1） |
| 4 同摘录双现 | 两个 offset→两 identity（**Seal 明文此径**） | 两个 ordinal→两 identity（行为同、授权无） | Identity 消歧 |
| 5 前插同摘录 | 后续 occurrence 的 offset 移 → 其 anchor 变 → identity 随 anchor | ordinal 同样移位 | **Anchor 变化→identity 跟随**（§5-S4） |
| 6 前删同摘录 | 同 5 | 同 5 | 同上 |
| 7 异摘录同底层事件 | 异 anchor→**两个事件被记录** | 同左 | Evidence 等价性未定义（Q-C4） |

结论：两案行为高度同构；**差别不在稳定性而在 authority**——A 全组件获 Seal 授权，B 含一个未授权组件。

## 5. Q-C5 — "Stable" 到底稳定什么（五维拆解）

- **S1 rerun 同文本**：Identity 稳定性问题——anchor 不变 ⇒ identity 不变 ✓（Q6 授权内）
- **S2 提取排序变**：Identity 问题——锚定派生天然序数无关 ✓（正是 Seal 禁 positional 之意）
- **S3 deterministic→LLM**：**Evidence 稳定性问题，非 identity authority 问题**——identity 稳定**当且仅当**两 producer 摘录逐字相同；「异摘录须合并」无契约支持
- **S4 场景文本变化**：**Anchor 变化**——identity 随派生输入变；「同事件跨文本变体保持同 identity」**未被任何契约定义**（属新 Truth 语义，本轮不引入）
- **S5 同摘录多位**：Identity 消歧问题——Seal 已指定 offset 消歧 ✓

## 6. Q-C4 — Cross-Producer 等价：**NOT DEFINED**

现有冻结契约无 canonical evidence representation、无 X≡Y 判定。Seal 的 identity 是锚定派生：异摘录=异 anchor=两个事件。**Cross-producer semantic equivalence = NOT DEFINED**。按令不引入 similarity/LLM matching/normalized action/hash 等价/paraphrase/actor+action 匹配/fuzzy——亦即**两 producer 各自合法记录同一底层动作时，系统如实记两事件**；此为 Seal 语义的诚实推论而非缺陷。

## 7. Q-C6 — Identity vs Actual Admission

Identity derivation 在 **candidate 构造时即完成**（excerpt+offset+sceneId 随证据存在而存在，纯函数、无铸造权威）；**validator PASS = Actual admission**，是门不是身份来源。二者严格分离；「有 Event Identity ≠ 已是 Actual」维持。

## 8. Q-C7 — T2 幂等契约的最低要求

T2 六契约之「幂等」在实现上以 `actualRef` 相等为键——契约要求的是**引用一致**（同一 actual 重放不双记）。它**没有自行定义** cross-rerun/producer 的 Event Identity stability；该稳定性要求来自 **Gate 1 Q6 Seal**（禁 positional/producer ID 为 Truth identity ⇒ 引用必须锚定派生 ⇒ S1/S2 稳定随之成立）。T2 契约是消费者，Q6 是 authority——不扩大 T2 解释。

## 9. Root-Cause Revalidation

```
四套旧 ID（先于 Seal 存在，是促成 Seal 的考古发现）
↓ Seal 后定性：Implementation Gap（语义已形式化，实现未遵守）
+ 本轮新认定：EO-G1-C-01 的 ordinal = 编译错误（未授权组件冒充语义）
↓ ROOT：实现层持续把工程便利（序号/序数）默认为身份——
  Seal 已闭合语义，编译与实现必须逐组件对齐授权
```
即：**「Event Identity 未形式化」已不成立（Q6 Seal 在先）；根因是形式化后实现/编译未逐字遵守。**

## 10. Semantic Gap Determination

无新 Semantic Gap。Derivation 的全部组件（sceneId / 逐字 excerpt / span-offset 消歧 / hash 仅辅助表示）**均由 Q6 Seal 唯一授权**；跨 producer 等价明确 NOT DEFINED（记录，不开采）。

## 11. EO Compilation Correction（可推出，予以修正）

EO-G1-C-01 修正三点（仍零实现）：
1. **删除 ordinal**；消歧 = **raw `scene.text` 内的 excerpt offset**（Seal 指定；**不引入任何 normalization**——按 §12 禁令，原文偏移原样使用；rerun 同文本下天然稳定）
2. **跨 producer 主张更正**：「同锚→同 id；**异摘录=两事件（等价性 NOT DEFINED）**」——删除原「跨 producer 同 id」的过强声明；回归矩阵对应项改为「同摘录跨 producer 同 id / 异摘录两 id（如实双记）」
3. 其余 scope 不变（统一 mint 于 candidate 构造、补 LLM offset、废两处前缀 fallback、废 schema hash-fallback、dedupe 对齐锚定、消费面零改、历史 preserve 并存）

## 12. Minimal Human Adjudication

**无需**——所有组件授权唯一可推（§10）；唯一边界事项（cross-producer 等价 NOT DEFINED）为记录性结论，非待裁问题。

## 13. Final Verdict

> **G1-C EO RE-COMPILED — EXECUTION READY**
> （derivation = sceneId + 逐字 excerpt + span/offset 消歧，全组件 Seal 授权；ordinal 已删除；cross-producer 等价 NOT DEFINED 如实记录）

**STOP——零代码零迁移；等待 EO-G1-C-01（修正版）执行令。**
