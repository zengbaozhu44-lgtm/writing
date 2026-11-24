# EO-G1-B — Relationship Affect Basis — Named EO Compilation

**Mode**: READ-ONLY COMPILATION（零实现）· **Date**: 2026-10-08 · **Seal**: Gate 1 Q5 + **Q5′=C SEALED**
**前置**: G1-A CLOSED（endpoint resolution 可用）· G1-C CLOSED

---

## 1. Seal → 实现映射（唯一推导证明）

`projectAffectRelationship` 现行**仅两路输入**（考古确认）：

| 输入源 | Seal 五条件核验 | 推导 |
|---|---|---|
| (a) 全局图边循环（`for (const e of ctx.relationships)` → trust/hostility 直投 affect 槽） | **败于条件 1**（全局非角色认知路径）+ **败于条件 5**（关系图存在≠affect 成立——正是 Seal 明禁的 `Relationship Fact → direct SR affect`） | **切断** |
| (b) authored per-character affect 块（`readAuthoredCharacterBlock` → provenance `authored_character_subjective`） | 条件 1✓（作者=角色认知路径权威，authored-only 原则）2✓ 3✓（authorship 即 Access 授予）4✓（provenance 在案）5✓（显式断言非存在性推断） | **保留——成为 affect 槽唯一合法源** |

**T2 载体条款**：Seal 明示「T2 可作合法证据载体，但 T2 exists ≠ affect formation authority」且**不定义 affect 如何形成** ⇒ 当前**无任何运行时形成路径可编译**；不建 basis ledger/新载体（未授权）。记为未来能力（须独立 Gate 定义形成机制后方可启用）。

**无新肯定式歧义**：五条件+两路输入的穷举使编译唯一 ⇒ **EXECUTION READY**（按令仅编译，待执行令）。

## 2. Scope

1. `minimal-sr.js::projectAffectRelationship`：移除全局图边循环（整段）；authored 块路径原样保留；被 Seal 切断的投影以计数观测（如 `affectSeveredBySeal`，进现有 SR meta/日志，不建载体）
2. **不变**：关系 TopK prompt 模块（世界层展示 + 信息边界文案——展示≠SR 主体状态）；05 图本身与 G1-A endpoint 校验；WCT/CAT/T2/T3/CW/SR 其余槽/L1/L2/Choice；affect 槽渲染格式（无 authored 块 → 既有 `omit / unknown` 语义）
3. 测试更新（意图保持，锚定被 Seal 禁止的旧行为的断言）：`wl04` P2（SR affect 来自图边+方向保真 → 改为 **affect 槽零图边投影** + TopK 仍方向保真）；`phase1-minimal-sr` 阿梅↔丈夫 用例（若其来源为图边则改 authored 源断言）
4. 新增专项 `test:eo-g1b-affect-basis-01`：
   - B1 图边存在 + 无 authored affect → affect 槽 `omit / unknown`（Seal 直测：Fact ↛ direct affect）
   - B2 authored affect 块 → 照常投影 + provenance
   - B3 T2 丰富的角色（有大量 experiences）+ 无 authored affect → affect 仍 omit（T2 exists ≠ affect）
   - B4 切断计数可观测
   - B5 关系 TopK prompt 块不受影响（世界层展示仍在）
   - B6 无 authored 块且无图 → 槽 omit（fail-closed 不变）

## 3. Non-Scope（Seal 明列不定义项 + 冻结令）

affect 形成机制 / 强度 / 更新衰减 / Emotion Engine / Goal / Value / Thought / Decision / Choice / basis ledger 或任何新载体 / L1/L2 / Gate 2 / 历史 SR 数据迁移。

## 4. 回归与验证链

全量 26 套（含 wl04/phase1-sr 更新后）→ 生产 batch（DeepSeek 全配置，10/10）→ 观测：affect 槽 authored-only（SR 渲染统计 omit 率上升=合法）、关系 TopK 注入率不降、T2/T3/attribution 基线持平、文学指标噪声内（关系信息仍经世界层 TopK 到达 Writer）→ 双扫描 Rescan。

## 5. Stop Conditions

编译外新语义浮现（如 affect 形成需求、authored 块 schema 歧义、TopK 边界质疑）→ STOP 报告，不扩权。

## 6. 判定

> **G1-B NAMED EO — EXECUTION READY（由 Q5′ Seal 唯一推出；零实现；等待执行令）**

**STOP。**
