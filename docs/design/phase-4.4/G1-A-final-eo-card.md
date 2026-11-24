# G1-A — Character Identity Registry & Resolution — FINAL EO CARD（S-A Compiled · Execution-Ready）

**Date**: 2026-10-08 · **Seal 链**: Gate 1 Human Seal → 三项边界修正 → **S-A SEALED（CW Seed = Reference-only）**
**判定**: **G1-A EXECUTION READY**（本 turns 零实现，等待执行令）

---

## 1. Sealed Contract（最终编译，不得再动）

```
03_character_bible = 唯一 Character Identity Admission Authority（authored-only）
CW Seed key = Reference——必须 resolve 到已录取 Character；UNRESOLVED → 不建 Identity/不建块/不物化内容（fail-closed，入 seed sync rejected 审计）
ensureCharacterBlock ≠ Identity 来源——只做 RESOLVED CharacterRef → 存储块映射
String equality ≠ Identity equality；不建 cross-record equivalence 机制
alias 仅在 Authority 载体内显式声明（03 标记行）方有 resolution 权
resolveCharacter() character-only；04/04b 不进 runtime（Q8）
UNRESOLVED = status ≠ Entity；可观测可审计；不物化
Quarantine classifier ≠ Identity Authority；world.json 只读；迁移另 EO
```

## 2. 接线点（五处，含 S-A 新增）

| # | 位置 | 变更 |
|---|------|------|
| ① | `appendT2Experiences`（character-world.js） | candidateNames → resolveCharacter 前置；仅 RESOLVED 入主体循环；resolution-aware participant 匹配（别名经历归 canonical）；unresolved 计数上报 |
| ② | `candidatesFromScene`（attribution-wiring.js） | actors∪pov 兜底 → resolve；仅 RESOLVED 成归因候选 |
| ③ | loader.js 05 边读取 | 端点 resolve；任一 UNRESOLVED → 该边不入 ctx.relationships（fail-closed+warn） |
| ④ **S-A 新增** | `materializeWorldFromSeeds` | seed key → resolve；UNRESOLVED → 该主体跳过物化 + 计入既有 `rejected`（reason: `character_unresolved`） |
| ⑤ | `projectWorldToSRScene` | 跳过 quarantine manifest 内的 legacy 名 |

新文件：`inkos-core/src/lib/entity-identity.js`（`resolveCharacter`/registry 加载/别名/碰撞 fail-closed；**纯读、无写函数**）+ `identity_quarantine.json` sidecar 分类器（只读 world.json）。

## 3. Safety Matrix（S1–S11）

S1–S10 原样（actor/mention/T2/endpoint/roster 不造 Character；UNRESOLVED 零物化；碰撞不猜；API 无写；world.json 字节不动；L1/L2/Choice/attribution-gate 语义不变）。
**S11（S-A 新增）**：seed key 未录取 → 无块、无物化、`rejected` 可审计；`ensureCharacterBlock` 无 string 直通路径。

## 4. Regression 计划

- 新套件 `test:eo-g1a-identity-resolution-01`（S1–S11 + 别名归属 + 碰撞 + seed-reference 行为）
- 全量 23 套；**fixture 调整（实现时）**：CW 四套（store-seed/projection/trace/formation）临时书需补 03 bible 文件（fixture 供给，非语义变更——S-A 后 seed 必须可 resolve）；wl03/wl04 套件已有 bible ✓
- 真实书内容缺口排查：**零**（当前无生产书携带 seeds）

## 5. Production / Literary Validation

DeepSeek batch 全配置：10/10；world.json **零新增伪块**；苏眠 T2>0（误归属修复）；attribution 全 RESOLVED；无效 05 边零入；seed 全部 RESOLVED（fixture 书 bible 齐）；quarantine 清单生成而 world.json 未动；L1/SR/WCT/提取失败率基线持平；prose 指标噪声内持平。

## 6. Stop Conditions（执行中）

遇：别名语义新歧义 / equivalence 需求浮现 / 需动 world.json / 需接 SR/L1/extractor → 立即 STOP 报告，不扩张。

## 7. 不做清单（重申）

Coreference / G1-B affect / G1-C Event id / Location·Faction runtime / 历史迁移 / equivalence 机制 / SR·L1·L2·Choice·extractor·validator·WCT 接入 / Goal·Emotion·Thought·Decision Trace。

## 8. 遗留项清零确认

别名标记行语法（提案 `> identity-alias: …`，实现时按提案执行）/ registry 缓存（per-book 单载）/ quarantine 分类特征（registry-UNRESOLVED + 结构特征，rationale 记录）——**全部实现级，无语义分叉**。

---

> **G1-A EXECUTION READY — 等待执行令。**
