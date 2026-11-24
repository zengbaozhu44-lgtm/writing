# Q-UC-1 — Three-Scope Inheritance Semantic Review · Rev1.2

**Status**: `THREE-SCOPE INHERITANCE SEMANTIC REVIEW REV1.2 — HS-7 SEALED (A) · SI-1 SEALED (I-1A) · SI-4a SEALED (OPTION A) · HS-1~HS-6 / SI-2~SI-3 / SI-4b / SI-5~SI-8 / SI-10 AWAITING HUMAN REVIEW · SI-9 BOUNDARY CONFIRMATION`
**Date**: 2026-11-01（创建）· 2026-11-07（SI-1 + SI-4a Seal 落档+状态同步）· **Mode**: READ-ONLY DOCUMENT REVISION + SEAL RECORD（零代码/零 Schema）
**Authority**: V2.2 FINAL + ERRATA · Q-UC-1 Packet · Rev2.1 · HS-7=SEALED A · Character World 冻结架构
**前置**: Rev0/Rev1/Rev1.1 保留为历史——本文件为当前权威
**标注**: 〔V2.2〕冻结 · 〔SEALED〕Human 已裁 · 〔SEALED-P〕原则级已裁 · 〔CW-FC〕CW 冻结契约 · 〔Rev2.1〕已定义 · 〔CODE〕代码架构事实 · 〔E2E〕生产实证 · 〔GLM〕本轮推理 · 〔PEND〕待 Human 裁决 · 〔AS〕ALREADY SEALED · 〔OBS〕OBSERVED · 〔UNK〕UNKNOWN / NOT OBSERVED

## Rev1.1 → Rev1.2 修改对照表

| 项 | Rev1.1 问题 | Rev1.2 修正 |
|---|---|---|
| R1 | F-14 将 E2E 观察结果归类为冻结原则（〔CW-FC/E2E〕混标） | F-14 从冻结原则列表移出→独立 E2E Evidence Status 节；F-13 来源细化 |
| R2 | CW E2E 证据写成「无 seed→sync 早退→world.json 不存在」未经证明的因果链 | 拆为六项独立证据状态（OBS/CODE/UNK 分别标注） |
| R3 | SI-4a/4b 依赖图通过 SI-1┘分支暗示逻辑依赖 | 明确声明 SI-4a/4b 不依赖 SI-1；顺序≠依赖 |

---

## A. 已冻结原则（13 项 = F-1~F-12 + F-13；F-14 已移出）

> Rev1.1 §A 为 F-1~F-12 + F-13 + F-14；本版将 F-14 移出冻结原则（R1 修正），F-13 保留并细化来源。

| # | 原则 | 来源 |
|---|---|---|
| F-1~F-12 | 与 Rev1.1 §A 相同（引用，不重复） | 〔SEALED/SEALED-P/V2.2/Rev2.1〕 |
| **F-13** | Reality = `obtains` SoA only——Actual 提取/validator/post 等状态不独立产生 Reality Authority | **来源细化**〔V2.2 EO-P6 authority-act.js:1-10（Sole semantic producer of obtains / ¬obtains）+ V2.2 架构层 Reality 定义〕 |

### F-13 来源支持明细

| 表述 | 来源 | 支持状态 |
|---|---|---|
| Reality = `obtains` SoA only | EO-P6 authority-act.js:4「Sole semantic producer of obtains / ¬obtains」+ V2.2 架构三层分离 | 支持 |
| Actual 提取不独立产生 Reality Authority | V2.2 Story Truth/Control/Realization 分离 + EO-P6 「Does not wrap commit / accept / validate / post / inference / narrative / legacy」 | 支持 |
| Validator 不独立产生 Reality Authority | 同上 EO-P6 不包裹 validator | 支持 |
| `post`/`confirmed`/`verified` 等状态不构成 Reality Authority | 同上 EO-P6 不包裹 post + Phase 1 StoryEvent validator 头注释（「Does NOT write Canon / SR / Reality」） | 支持 |

**F-14 已从冻结原则移出**——见下方独立节。

---

## A-2. E2E Evidence Status / Production Observation（新独立节——R1 修正）

> 本节记录生产运行观察状态——**不是冻结原则**。某次 E2E 观察结果不得提升为永久冻结契约。

### CW E2E 证据状态（R2 修正：六项独立，非因果链）

| # | 观察项 | 状态 | 依据 |
|---|---|---|---|
| CW-E1 | E2E 测试书缺少 `character_world_seeds.yaml` 文件 | **OBSERVED** | E2E 书文件系统（find 零结果）〔E2E〕 |
| CW-E2 | `character_world/world.json` 不存在 | **OBSERVED** | E2E 书文件系统〔E2E〕 |
| CW-E3 | Orchestrator 存在 seed 缺失时条件跳过的 early return 代码路径 | **CODE OBSERVED** | character-world.js:309-312 `syncCharacterWorldFromSeeds`——`if (!seed) return { synced: false, reason: 'no_seed_file' }`〔CODE〕 |
| CW-E4 | 该次 E2E 运行是否实际进入 early return | **UNKNOWN / NOT OBSERVED** | 无调用轨迹/返回值/日志行〔E2E〕 |
| CW-E5 | 缺少 seed 是否触发了该次 early return | **UNKNOWN** | CW-E1（seed 不存在）+ CW-E3（代码路径存在）不能联合证明 CW-E4〔E2E〕 |
| CW-E6 | CW 通道是否实际执行、跳过或失败 | **UNKNOWN / NOT OBSERVED** | 无 [runtime] CW sync skipped/success 日志行——但无记录≠未发生〔E2E〕 |

### CW E2E 证据边界（继承 Q-UC-1 V2.2 Err-R2-B + Rev1.1 R2）

- 不推断 seed 是每书强制契约（=Q-UC-5 UNK）
- 不推断 silent failure（代码 try/catch 存在≠实际发生异常）
- 不推断实际 invocation / skip / failure
- 不将 UNKNOWN 写成 PASS 或 FAIL
- 代码存在≠生产已验证；函数存在≠已执行；SR 可消费≠已消费

---

## B. 六类语义问题（仅列 Rev1.2 变更——其余引用 Rev1.1）

### B-5 E-2b（R1 修正后版本——与 Rev1.1 相同但 F-13 引用更新）

> 实际发生条件必须依据符合现有 Actual Authority 与 Admission 契约的 Actual 事实判定。
> - Actual 提取属于证据处理过程，不独立产生 Reality Authority〔F-13〕
> - Validator 属于现有验证流程，不独立产生 Reality Authority〔F-13〕
> - `post`/`confirmed`/`verified` 等状态不构成 Reality Authority〔F-13〕
> - Narrative Intent / 计划性标记不能替代 Actual admission〔V2.2 Plan≠Actual〕
> - Reality = obtains SoA only〔F-13〕

### B-6 M-4b（R2 修正版——区分架构证据与生产证据+引用 A-2）

> **架构/代码层**：存在 Projection→SR→Compiler 消费的既有代码通道〔CODE〕。
>
> **生产运行层**：某次 Studio Production Run 是否实际调用、成功执行并消费该通道——见 §A-2 CW E2E 证据状态（CW-E1~CW-E6）——**当前 UNKNOWN / NOT OBSERVED**。
>
> 不可推导线（四条，与 Rev1.1 相同）。

### B-3 SI-4a/4b（R3 修正：独立化确认+依赖修正）

与 Rev1.1 相同的 O-3/O-4 拆分——SI-4a（作者修改权）/ SI-4b（语义持续性）为**独立问题**。SOURCE SUPPORT INSUFFICIENT 标注不变。

---

## C/D. 三层矩阵与反例

与 Rev1.1 相同（引用，不重复）。

---

## E. 修正后 SI 问题清单

与 Rev1.1 §E 相同——仅 SI-9 引用从 F-14 改为 §A-2。

> **SI-1 状态更新（2026-11-07）**：SEALED — I-1A — Semantic Default Applicability（Human 正式裁决，见 §J Seal Record）。§E 问题文本保留为历史审查记录，不改写。
>
> **SI-4a 状态更新（2026-11-07）**：SEALED — OPTION A — Author-Exclusive Configuration Change（Human 正式裁决，见 §K Seal Record）。§E 问题文本保留为历史审查记录，不改写。SI-2、SI-3、SI-4b、SI-5~SI-8、SI-10 仍为开放选择；SI-9 仍为边界确认。

## E-2. SI 依赖图（R3 修正版）

```text
SI-1 ──→ SI-3 ──→ SI-10

SI-4a：独立问题，不建立对 SI-1 的逻辑依赖
SI-4b：独立问题，不建立对 SI-1 的逻辑依赖

SI-2 ──→ SI-7
  └──→ SI-5 ──→ SI-6

SI-8：独立的多来源合并原则

SI-9：既有 CW 冻结边界确认 + E2E 证据状态（§A-2）
```

**文字依赖关系**：
- SI-3 依赖 SI-1（须先定语义适用原则才能定覆盖范围）
- SI-10 依赖 SI-1+SI-3（跳层规则须先有基本继承+覆盖）
- SI-7 依赖 SI-2（条件性补充是补充的子类）
- SI-5→SI-6（冲突识别先定，才能定真矛盾响应级别）
- SI-8 独立（通用合并原则，不依赖 SI-9）
- SI-9 不在依赖链上（边界确认，非待裁选择）
- **SI-4a/SI-4b 均为独立问题，不依赖 SI-1**——Rev1.1 图中 SI-1 的┘分支指向 SI-4a/4b 造成视觉暗示依赖，本版移除

## F. Human Review 建议顺序

**第一批：基础继承**——SI-1 → SI-4a → SI-4b → SI-3
**第二批：交互规则**——SI-2 → SI-5 → SI-6
**第三批：边界处理**——SI-7 → SI-8 → SI-10
**SI-9**：边界核对（可在任一批后）。

> **该顺序是审查安排（arrangement），不代表 SI-4a/SI-4b 在逻辑上依赖 SI-1。** 不得把排列顺序当成授权或前置契约。

---

## G. 来源与证据状态

与 Rev1.1 §G 相同，新增：
- 〔OBS〕=OBSERVED（仅记录观察事实，不含因果推断）
- 〔UNK〕=UNKNOWN / NOT OBSERVED（不能被用作 PASS/FAIL/因果证据）

F-13 来源已细化至 EO-P6 authority-act.js 具体条款——无笼统归因。

## H. 未解决事项

与 Rev1.1 §H 相同，增加：
- CW-E5（缺 seed 是否触发 early return）：**UNKNOWN**——须加运行观测（后续 EO/Q-UC-6）

## OUT OF SCOPE / NOT ACTIONED

- 无额外发现。

---

## I. 状态检查

| 检查 | 结果 |
|---|---|
| F-14 已从冻结原则移出→独立 E2E Evidence Status 节 | ✓（§A-2） |
| CW 因果链已拆为六项独立证据状态 | ✓（CW-E1~CW-E6） |
| SI-4a/4b 已从 SI-1 逻辑依赖移出 | ✓（图示┘分支已删除+文字声明独立） |
| F-13 来源已细化（非笼统归因） | ✓（EO-P6 authority-act.js 具体条款） |
| 审查顺序≠逻辑依赖已明确声明 | ✓（§F 注释） |
| 未新增 SI | ✓ |
| 未改变已有 Human Seal | ✓ |
| 未修改 V2.2/Rev2.1/Packet/Rev0/Rev1/Rev1.1 | ✓（Packet 仅按授权同步 SI-1/SI-4a 状态索引） |
| 零代码/零 Schema | ✓ |
| SI-4a Seal 已落档且边界逐字完整（含非扩张条款） | ✓（§K） |
| SI-4-AS 仍 ALREADY SEALED / SI-4b 仍 PENDING 且独立 | ✓ |

---

## J. SI-1 Human Seal Record（2026-11-07 落档）

> **这是 Human 对 SI-1 的正式裁决——不是 GLM 推理结论。**
>
> ### 裁决：SI-1 = SEALED — I-1a — Semantic Default Applicability
>
> Book Core 在语义上默认适用于全部下层 Volume / Scene，无需下层显式声明继承。
>
> **解释边界（六条，逐字保留）：**
>
> 1. 本裁决只确定 Semantic Applicability，不代表每项 Core 内容在所有下层场景中无条件成立。
> 2. 某项约束自身的语义范围、时间条件或适用条件，不因默认继承而被取消。
> 3. Semantic Applicability 不等于 Production Context Inclusion，也不等于 Beat-level Continued Availability。
> 4. 本裁决不授权设计 Scope 字段、条件机制、继承 Schema 或自动判定机制。
> 5. Planner 不得仅以相关性判断为由，降低、删除或改写作者指定的 Book-level Required。
> 6. 本裁决不改变 Q-UC-1-a 已冻结的 Scene Required / Beat Optional 注入规则。
>
> **裁决范围**：SI-1 only。
>
> **下游影响**：
> - SI-3、SI-10 在本裁决确定的语义原则下继续审查。
> - SI-4a、SI-4b 仍为独立问题，不因 SI-1 裁决而获得预设答案或逻辑依赖。
>
> **本 Seal 不授权**：Named EO、生产实现、Scope/条件/Schema 设计、SI-3/SI-4a/SI-4b/SI-10 的预设答案。

---

## K. SI-4a Human Seal Record（2026-11-07 落档）

> **这是 Human 对 SI-4a 的正式裁决——不是 GLM 推理结论。**
>
> ### 裁决：SI-4a = SEALED — OPTION A — AUTHOR-EXCLUSIVE CONFIGURATION CHANGE
>
> **正式裁决**：作者有权通过显式 Author Configuration Change（ACC）修改自己此前设定的 Book Core，包括 Required 与 Optional 项。
>
> **解释边界（逐字保留）：**
>
> 1. 修改权属于作者，不属于 Planner；不改变 SI-4-AS 已冻结的 Planner 禁降规则。
> 2. 修改必须是显式 Author Configuration Change，不得伪装成 Planner 运行时相关性调整。
> 3. 配置变更本身不自动追溯改写已生成章节、已建立 Actual 或既有因果历史。
> 4. 显式配置变更及其记录原则成立；具体载体、审计机制、Schema 和操作流程不在本次裁决范围。
> 5. 本裁决不预设 SI-4b 的答案；作者可修改配置，不等于 Book Core 默认不再持续适用。
> 6. 本裁决不授权 Named EO、Schema 设计或生产实现。
> 7. 本次裁决仅涉及 SI-4a，不改变其他 SI 的状态。
>
> **非扩张条款**：不得将第 3 条扩大解释为禁止作者通过其他独立、明确授权的流程修订作品；本裁决只确定 ACC 本身不产生自动追溯效果。
>
> **裁决范围**：SI-4a only。

---

> **THREE-SCOPE INHERITANCE — SI-1 SEALED (I-1A) · SI-4a SEALED (OPTION A) — STATUS SYNCHRONIZED — SI-2~SI-3 / SI-4b / SI-5~SI-8 / SI-10 AWAITING HUMAN REVIEW · SI-9 BOUNDARY CONFIRMATION**
