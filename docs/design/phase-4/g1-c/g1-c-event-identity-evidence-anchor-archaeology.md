# G1-C — Event Identity & Evidence Anchor — Archaeology / Named EO Compilation

**Mode**: READ-ONLY / NO CODE · **Date**: 2026-10-08 · **前置**: Gate 1 SEALED（Q6 已 Seal）· G1-A CLOSED
**G1-B / Gate 2**: 未进入

---

## 1. Executive Verdict

**InkOS 当前并存四套 Event Identity 方案，无一是被冻结的 Truth 语义**：①位置 id（producer 决定，三维不稳定）②内容 dedupe 键（仅单次提取内的启发式）③schema 的 action-hash fallback id（第四套，本轮新发现）④消费侧 action 前缀 fallback（已 Seal 禁止）。**语义层由 Gate 1 Q6 已经 Seal**（identity = stable scene context + evidence anchor；位置/producer/前缀禁为身份；同摘录双现以 span/offset 消歧）——因此本 EO 属**情况 A+C**：语义可由 Seal 唯一推出，剩余为实现缺口编译。**G1-C NAMED EO READY**，无新 Human Adjudication 点（一项实现级二选一带推荐）。

## 2. Current Event Identity Map（四套并存）

| # | 方案 | 产生处 | 性质 | 稳定性 |
|---|------|--------|------|--------|
| ① | `evt_${sceneId}_${kind}_${i}`（确定性）/ `evt_${sceneId}_llm_${i}`（LLM） | 提取器（producer） | 位置 id | ❌ 排序变/插入/换 producer/rerun 全漂移 |
| ② | `kind\|action\|excerpt` | dedupeEvents（仅内存、单次提取） | dedupe 启发式（kind 参与 ⇒ 同证据不同 kind=两事件——作 identity 即违反 Seal） | — |
| ③ | `evt_${sceneId}_${hashShort(action)}` | createStoryEvent（caller 未给 id 时）**本轮新发现** | 内容 hash fallback | 部分（action 变则变；从未被任何契约定义） |
| ④ | `occurrence:${action.slice(0,40)}` | CAT refOf 与 l1-eligibility refOf | 消费侧前缀 fallback | ❌ 同名动作跨场碰撞；**已 Seal 禁为身份** |

## 3. Event Lifecycle Map（14 问逐节点）

```
Prose/Scene → Extraction Candidate（无 id；LLM 证据无 offset——evidence 仅 {excerpt}）
→ Validator（内容门，不涉 id；PASS=Actual admission）
→ Actual Admission（事件挂 scene.actualEvents；id=①，此时铸造）
→ Occurrence（CAT/WCT 消费 actualEvents；WCT 严格按 ev.id 找回 ✓；CAT/l1 带 ④ fallback）
→ Attribution（recordId=attr_${ev.id}_${characterId}——继承①）
→ T2（actualRef=ev.id；幂等仅比对 actualRef）
→ CW（块内累积；formation 通道 A 的 basisRefs=T2 actualRef）
```
逐问结论：Identity 在**提取器**产生（Q4 答：producer-local）；rerun 重建（session 级守卫仅防同进程重提）→ **新 id**；跨 chapter 无引用（prompt seam 不携 id——展示 S{index}+文本，identity 在接缝处**丢失**而非漂移）；timeline 行不携 id（identity 丢失）；historical data 的旧 id 在其持久化 scenes 文件内仍可解析（rerun 会覆盖该文件；git 快照留档）。

## 4. Identity Producer / Consumer Map

Producer：deterministic（①-regex 序号）/ LLM（①-llm 序号）/ schema（③-hash）/ 消费侧铸造引用（④）。
Consumer（全部读 `ev.id`）：T2 actualRef（幂等门槛）· WCT 严格找回 · CAT refOf（+④）· l1 refOf（+④）· attribution recordId · scenes json 持久化。**无消费者读 ②**（仅提取内部）。

## 5. Positional Identity Audit

producer 决定 id ✓；排序变化 → `_i` 漂移 ✓；同场插入一候选 → 其后全部序号移位 ✓；跨 producer 同事件 → 前缀与序号基都不同 ✓；rerun → 重建新 id ✓。**三维（cross-rerun/cross-producer/cross-extraction-ordering）全部不稳定。**

## 6. Content-Key Audit

② 为 dedupe 启发式：kind 参与（同证据不同 kind=两事件）、action 文本参与（R1 允许的转述改写 → 键变）、仅内存单次。**结论：dedupe key ≠ identity**（Seal 同向）；其 kind 参与若被未来当 identity 使用即违反「同 scene 同证据=同一事件」。

## 7. Fallback Identity Audit

④ 是「跨层找回」的临时引用而非 Truth identity；WCT 自身严格按 id 找回（无 fallback）——④ 只把不可解析的引用串写进 CAT/l1 sidecar（无人消费的死引用）。已 Seal 禁止其为身份 ⇒ EO 中废除此路径（fail-closed：无 id 不铸引用）。③（hash fallback）从未被任何契约定义 ⇒ 归入禁止（id 必须是锚定派生，非 action hash）。

## 8. Rerun Idempotency Audit（核心安全测试，代码路径证明）

Run1 Scene A Event X → `evt_A_speech_0`；Run2 同场景同事件重提取 → `evt_A_speech_0'`（重建）甚至 `_llm_1`（producer 切换）或全部移位（多一个前置候选）。T2 幂等仅比对 actualRef ⇒ **同事件双记**（duplicate experience）✓ 代码路径证实；**下游放大**：formation 通道 A 以 basisRefs 计「≥2 独立实际」——同一事件的两个 ref 会被误计为两次独立实际 ⇒ **durable formation 污染风险**（最重下游伤害）；timeline 无 id ⇒ rerun 重复行（F-06 族另案）。漂移最深层原因见 §13。

## 9. Cross-Producer Audit

同事件：deterministic `evt_s1_speech_0` vs LLM `evt_s1_llm_2`——不同 id 指同一事件（Q10 之一：两 id 一事件 ✓ 实证）。反向（一 id 两事件）：位置 id 在 rerun/重排后可指向不同事件 ✓ 实证。

## 10. 五概念边界（Event / Evidence Anchor / Occurrence / Attribution / Actual）

| 概念 | 回答 | 现状/编译 |
|---|---|---|
| **Event Identity** | 这是哪一个事件 | 编译：canonical ref = 确定性派生自 **(sceneId + 逐字 excerpt + 摘录在场景文本中的出现序数 ordinal)** ——ordinal 取**文本内第几次出现**（非候选列表序号 ⇒ 提取排序免疫，Q2 关键） |
| **Evidence Anchor** | 凭什么知道它存在/对应文本哪里 | (excerpt, offset) 证据元组；是 identity 的**派生输入**而非 identity 本身（Q3）；LLM 路径当前缺 offset ⇒ EO 在 admission 时计算 |
| **Occurrence** | 事件在某处的一次发生/表现 | **用法角色**（CAT/WCT/T2 各自引用同一 identity）⇒ Event:Occurrence = 1:N 用法；Occurrence ≠ Attribution 冻结不变（Q8） |
| **Attribution** | 归属哪个主体 | G1-A 已解（CharacterRef）；与本 EO 正交 |
| **Actual** | 是否被 Truth 接纳 | validator PASS = admission；**identity 先于 admission 存在**（由证据派生）——admission 不铸造 identity（Q7：「有 Event ID」≠「已是 Actual」） |

## 11. T2 / CW Dependency Audit

T2 依赖 `actualRef`（=ev.id）作幂等键——**T2 六契约的幂等条款预设稳定事件引用**（契约钩子：现行位置 id 违反该预设于 rerun 场景=实现缺口）。编译后 actualRef=锚定 identity ⇒ 幂等跨 rerun/producer 恢复；formation basisRefs 同步去污染。

## 12. Historical Compatibility Audit

旧位置 id：preserve（不迁移/不改写/不重解释）；其可解析性依附于持久化 scenes 文件（rerun 覆盖；git 快照留档）。新旧 id 并存（格式可区分）。**Historical Migration Required**（独立未来 EO：可选重锚定，须保 provenance）。

## 13. Root-Cause Chain

```
T2 双记 / formation 误计 / 引用死串
↓ Local：rerun/换 producer 后 ev.id 变化；refOf 前缀 fallback
↓ Pipeline：id 由提取器按候选序号铸造；幂等/找回全部押注该 id
↓ Semantic：Event Identity 从未被定义为 Truth 语义——producer 序号被默认当作身份
↓ Root：Event Identity 未形式化为「证据锚定派生」——Gate 1 Q6 Seal 正是补此根
```

## 14. All Findings（分类）

F1 位置 id 三维不稳定（**B**——违反已 Seal 语义）· F2 dedupe 键含 kind 不得当身份（**A→已 Seal 收口**）· F3 refOf 前缀 fallback（**B**，Seal 已禁）· F4 schema action-hash fallback id（**B**，同禁）· F5 LLM 证据缺 offset（**B**，锚定组件缺失）· F6 prompt seam/timeline 不携 id（**E/F**——展示层丢 identity，记录）· F7 rerun 双记+formation 误计（**B**，F1 下游）· F8 历史 id（**G**——Migration Required）。

## 15. Semantic Frontier

**无新前沿**（Q6 已 Seal；本审计未产生不能由 Seal 推出的语义点）。唯一实现级二选一（带推荐，非裁决）：**(i) 锚定 id 铸入既有 `id` 字段**（零 schema 变更，T2/WCT/CAT/attribution 全消费者免改——推荐）vs (ii) 新增独立字段（schema 变更，无必要）。

## 16. Design Gate Questions（Q1–Q10 速答）

Q1 Authority=Seal 本身；identity 为**确定性派生**（非铸造——同 resolveCharacter 先例）· Q2 三维稳定（rerun✓/producer✓条件=逐字摘录一致/ordering✓因 ordinal 取文本出现序）· Q3 Anchor=派生输入≠identity · Q4 sceneId=语境组件；offset=定位器+消歧序数 · Q5 content key=dedupe only · Q6 fallback 无 Truth 权→废除 · Q7 identity 先于 admission；PASS≠id 铸造 · Q8 1:N 用法 · Q9 T2 引用 Event Identity（actualRef=锚定 id）· Q10 preserve+并存；Migration Required。

## 17. Proposed Named EO — EO-G1-C-01（仅编译，不实现）

**Scope**：①`mintEventIdentity(sceneId, excerpt, ordinal)` 确定性派生（含 normalize：空白折叠；ordinal=折叠文本中该摘录第 N 次出现）于 admission 处统一铸造（两 producer 路径同函数）；②LLM/确定性证据补 offset 计算；③refOf 前缀 fallback 废除（CAT+l1：无 id→不铸引用，fail-closed）；④schema hash-fallback id 移除（caller 必须显式给锚定 id 或经 mint）；⑤dedupeEvents 键对齐锚定（kind 退出 identity 语义，仅限同 kind 组内去重或直接以 anchor 去重）；⑥T2/WCT/attribution 消费面零改（读 id 不变）。
**Non-scope**：历史迁移 / prompt seam·timeline 携 id（另案）/ G1-B / Gate 2 / Actual·validator·extractor 语义门 / schema 新字段。
**回归矩阵**：rerun 幂等（同场景重提取→T2 零双记）/ 跨 producer 同事件同 id / 排序扰动 id 不变（ordinal 免疫）/ 同摘录双现两 id / fallback 死路径断言 / 全量 24 套。
**生产验证**：batch 10/10；rerun 同章 T2 计数不变；attribution/WCT 引用零死串。
**Stop**：任何锚定歧义（normalize 规则争议/ordinal 边界）→ STOP 报告。

## 18. Scope / Non-Scope

见 §17；另禁：修改 Actual 语义、validator 门、extractor 门、SR/L1/L2/Choice、认知载体。

## 19. Stop Conditions

语义歧义 / 多重合法 normalize / 需 schema 变更 / 历史 id 需改写 → STOP。

## 20. Final Verdict

> **G1-C NAMED EO READY（情况 A+C）**——语义已由 Gate 1 Q6 Seal；四套现行方案全为实现缺口；历史迁移另案。

## 双扫描

- **FIRST REAL BLOCKER：NONE**
- **FIRST UNRESOLVED SEMANTIC AUTHORITY GAP**：Gate 1 剩余 **G1-C（本 EO 待执行令）→ G1-B**；其后 Gate 2。

**STOP——零代码零迁移；等待 EO-G1-C-01 执行令。**
