# F4 — Entity Injection Hygiene Report

**Date**: 2026-09-07  
**Verdict**: **F4 = PASS**  
**Mode**: IMPLEMENTATION + REGRESSION + REAL PRODUCTION VALIDATION  

---

## Implementation

| File | Why |
|------|-----|
| `packages/inkos-prompt/src/entity-selector.js` | `filterKnowledgeForPrompt`；whitelist `formatCharacterCardForPrompt`；职责注释 vs runtime |
| `packages/inkos-prompt/src/compiler.js` | **filter → then rank**；人物卡改用 whitelist（不再 `c.raw` 主路径） |
| `packages/inkos-prompt/src/index.js` | 导出 filter / format helpers |
| `packages/inkos-runtime/src/memory/entity-selector.js` | 职责注释（磁盘加载；非 Writer 过滤） |
| `packages/inkos-studio-server/.../context-provenance.js` | `entity` / `character_context` / `knowledge` 来源说明对齐 F4 |
| `scripts/test-f4-entity-hygiene.js` | Test A–H |
| `package.json` | `test:f4-entity-hygiene` |
| `golden/story-architecture/run-validation-f4.js` | 真跑 |
| `golden/story-architecture/validation-f4/` | 产物 |

---

## Entity path

```text
Scene (pov | present | scene.entities)
  → inkos-prompt selectEntities (+ factions from corpus)
  → filterCharacters / filterKnowledgeForPrompt (POV know|partial only)
  → context-ranking TopK
  → whitelist character cards (+ Minimal SR separately)
  → Writer L1 lore → L2/L3/L4
```

**Priority（最终）**

1. Scene-active entities only（非全库 dump）  
2. Knowledge：**Information Asymmetry first**（unknown 先滤掉）  
3. 再 context-ranking TopK  
4. Character：**whitelist 公开卡**（identity / publicGoal / personality / voice…）  
5. Minimal SR：独立 Awareness 投影（unknown 仍 omit）

---

## Completion answers

| # | Question | Answer |
|---|----------|--------|
| 1 | filterKnowledge 是否真正进入 Writer path？ | **是** — `filterKnowledgeForPrompt` 在 `rankContextForCompiler` **之前**写入 `ctxForRank.knowledge.matrix` |
| 2 | c.raw 是否仍可能泄漏全知信息？ | **主路径否** — 用 whitelist；fallback scrub 去掉秘密/真实目标/`secret_future_fact`。**残余**：若结构化字段为空且 raw 用非标准标题写秘密，仍可能漏 — 见 Remaining Gaps |
| 3 | 两个 Entity Selector 是否重复？ | **职责不同，保留两处** — prompt=内存过滤；runtime=磁盘加载 bible。无第三套 |
| 4 | 是否需要 Location Entity？ | **否** — `scene.location` / world_bible / state 已够；未加 Location Engine |
| 5 | Entity Context 最终优先级？ | Scene 实体 → IB 过滤 → Ranking → whitelist 卡（见上） |
| 6 | F1/F2/F3 是否全部保持 PASS？ | **是** |

---

## Information Boundary

**PASS** — unknown 不进 knowledge TopK / Awareness；Test F A/B 非对称成立。

## Raw leak

**PASS**（测试 + 真跑 marker 均未进入 L1/L4）

## Selector duplication

**result**: 非重复能力；注释划清边界；禁止第三 selector。

## Location

**result**: 现有结构足够；未新增 Location selector。

## F3 provenance

**PASS** — `character_context` / `knowledge` / `entity` 均有 source/type/priority/kept/reason/L*；L3/L4 上 P2 块常 `budget_trim`（诚实，非伪造）。

## Regression

**PASS**

```text
test:f4-entity-hygiene
test:f3-provenance
test:f2-viewer
test:f1-survival
test:phase1-r2
test:phase1-sr
test:eo-d1-final
```

## Real Production

Book: `凌晨四点世界刷新` · Ch2 · 3 Scenes  

| Scene | Clock | IB | Char ctx | Unknown absent | Raw secret | Bystander | Text |
|-------|-------|-----|----------|----------------|------------|-----------|------|
| S1 进入局面 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ~1072 字，质量可用 |
| S2 受阻与博弈 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ~954 字 |
| S3 转折与代价 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ~1048 字 |

产物：`golden/story-architecture/validation-f4/`

---

## Remaining Gaps

1. Character card fallback 仍可读 scrubbed `raw`（无标准字段时）— 非标准秘密标题可能漏  
2. Beat L4 预算常 trim 掉 P2 `character_context` / `knowledge`（F3 已如实记 `budget_trim`）— 不等于注入失败  
3. World bible 整段仍注入 — 非本任务范围；地点依赖 world/state 而非 Location Entity  
4. `trimEntitiesByImportance` 可能缩减在场名单（真跑 log 偶发只 load 苏晚）— 既有 ranking，非 F4 新引入

---

## Verdict

```text
F4 = PASS
```
