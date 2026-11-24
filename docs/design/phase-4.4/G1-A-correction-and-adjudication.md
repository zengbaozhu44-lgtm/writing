# G1-A — PRE-EXECUTION SEMANTIC BOUNDARY CORRECTION（READ-ONLY）

**Date**: 2026-10-08 · **Gate 1**: SEALED（不重开）· **Implementation**: FORBIDDEN
**性质**：对 G1-A-named-eo-preparation.md 的三处边界修正；零代码。

---

## CORRECTION #1 — CW Seed 是否拥有 Identity Admission 权 → **HUMAN ADJUDICATION REQUIRED**

### 考古结果（三问逐答）

1. **契约是否明授？** 否。CW Store/Seed 冻结契约（character-world-formation-projection-design-gate.md + 代码头注）定义 seed 为 **Character World 主观内容的 authored grounding 通道**：knowledge/belief/interpretation/stance 逐条显式 seed、basis 纪律、「防 Author→Character 全知」、`Bible→Character Knowledge ❌ 自动推导`。全部条款围绕**内容如何进入 World**——无任何一条裁定「seed 键 = 录取的 Character Identity」。
2. **生产 seed 是否预设角色已存在？** 代码**无交叉校验**（`materializeWorldFromSeeds` 直接 `for (const [name, block] of Object.entries(seed.characters))` 物化，不查 bible）；但全部生产 seed 恰好只用于 bible 已有角色（林逸/苏眠）——**前提未被契约明示，也未被行为反证**。
3. **建块行为性质**：**implementation / bootstrap behavior**——契约授权的是「World 由 seed 产生」（内容层），块创建是其存储副产物；「seed 键=身份录取」从未被冻结。

### 判定

> **CW Seed 的 Identity Admission 地位无法由既有冻结契约唯一推出 → HUMAN ADJUDICATION REQUIRED**

两个互斥编译均合法（见 #2），不得自行选择。

## CORRECTION #2 — 同名 ≠ 同一 Entity（编译修正）

**接受并删除原推论**「same name + same class = same entity」。修正原则：

> **String equality is not by itself Identity equality.**

修正后 G1-A 词汇表：**canonical identity**（载体文件自身的录取记录）/ **source record**（03 文件或 seed 键，两个独立 authored record）/ **alias**（载体声明的显式别名）/ **explicit identity equivalence**（跨 record 的同一性**只能**由 Identity Authority 显式声明——现存契约中**不存在**此机制）/ **collision**（fail-closed）/ **unresolved**。

**与 #1 合并为同一裁决问题**：

- **选项 S-A（Seed = Reference）**：seed 键是引用，必须 resolve 到 bible 录取的 canonical；未录取键 → seed 主体 fail-closed 跳过（块不建、内容不物化）。register 源集 = 03 only。
- **选项 S-B（Seed = 独立录取通道）**：seed 键构成第二个 authored 录取记录；则 bible-林逸 与 seed-林逸 是**两个 source record**，需**显式 equivalence 声明**（新语义机制，须 Seal 定义其形态）才合并为同一 Entity；无声明则并存为不同实体（现行 string-merge 行为违规需改）。

两选项都改变现行行为，均无契约背书 → 唯 Human 可裁。

## CORRECTION #3 — Location/Faction 退出 runtime resolution（纯收窄，无需裁决）

**接受**。修正后 runtime 实现范围：

- `resolveCharacter(bookDir, surface)` ——**仅 character 域**；输出无 faction/location class
- Registry 源集 = `03_character_bible`（+可选 alias 标记行）【seed 悬置待 #1 裁决】
- 05 endpoint：当前 05 是**角色**关系图——endpoint resolve = character resolution，在范围内
- 04/04b：**不加载进 resolver、不实现 runtime registry/membership**——只保留 Q8 边界记录（字符串出现不创 Truth）

## Q3 表达修正（接受）

```
Resolution Status
├── RESOLVED(CharacterRef)
└── UNRESOLVED(reason)
      ├── not_in_registry
      ├── alias_collision
      └── 其他显式定义的 resolution failure
```
UNRESOLVED = status ≠ Entity；不入 T2/CW/Attribution Subject；Event/Evidence 保留；observable/auditable（各咽喉计数+日志，不物化）。

## Q7 Classifier 边界修正（接受）

Quarantine classifier **不是 Identity Authority**：它是 historical 运营分类（Preserve→Classify→Quarantine 的一环）——`invalid` 必须附证据依据（registry UNRESOLVED + 结构特征，记录 rationale）；`unknown` 保留不确定性；classifier 不得反向创造 Identity、不得反向修改 historical Truth（world.json 只读；清单仅门控 legacy 块的投影，非身份裁定）。

## 修正后 Identity Authority Contract（待 #1 裁决生效）

- Authority = 统一逻辑 / 物理分载 / 统一 resolution API（Q1 Seal 不变）
- **Runtime resolution 域 = character-only**（#3）
- Character Admission = authored-only（Q2）；**admission 记录=source record，同名不合流，跨 record 同一性需显式 equivalence**（#2）
- Seed 的地位 = **S-A / S-B 待 Human 裁决**（#1）
- API 只读（resolve 无写）；碰撞 fail-closed；UNRESOLVED 不物化

## 修正后 G1-A Implementation Boundary

不变项（全部保持）：四接线点（appendT2 / candidatesFromScene / 05 endpoint / quarantine 投影跳过）、resolution-aware 匹配、S1–S10 安全矩阵、quarantine sidecar、SR/L1/L2/Choice/extractor/validator/WCT/迁移 全不接。
变更项：resolver 更名 `resolveCharacter` 且只读 03（+alias 标记行）；registry 源集中 seed 悬置；同名合并逻辑移除、以待裁 equivalence 机制占位。

## 最终判定

> **HUMAN ADJUDICATION REQUIRED**（非 EXECUTION READY）

**待裁问题（唯一）**：CW Seed 的 Identity 地位——
**S-A** Seed=Reference（必须 resolve 到 03 录取；未录取键 fail-closed）／
**S-B** Seed=独立录取通道（需同时裁决跨 record **显式 equivalence** 机制的语义与载体）。

CORRECTION #3、Q3 表达、Q7 classifier 边界：纯收窄/澄清，**无新裁决点**。

**STOP——零代码；Gate 1 不重开；等待 S-A/S-B 裁决。**
