# WL-04 Relationship / Faction / State Pipeline — Implementation Record

**Status**: IMPLEMENTED + REGRESSED + PRODUCTION BATCH
**Date**: 2026-09-21
**Prev**: WL-03 NPC Runtime Integration

## 1. Read-only Archaeology

### Relationship（05_relationship_graph.yaml）

| 环节 | 结论 |
|------|------|
| carrier | `{from, to, relation, trust, hostility, cooperation, debt, hidden, note}`（边属性=from 对 to 的立场） |
| producer | authored（作者/驱动写入）；post-chapter 有可选 delta 通道 |
| loader | `readYaml(05)?.edges → ctx.relationships` ✓ |
| compiler | ranking 源 `relationships`（collect.js）→ `relationship` 模块「关系 TopK」priority 60 ✓ |
| SR consumer | `minimal-sr.projectAffectRelationship`：逐角色过滤（只含本角边）→ `affect_relationship` 槽，provenance=05 ✓ |
| 生产实证 | WL-03 batch：关系 TopK 36/40 scenes；SR Affect 槽 34/40 |
| **缺陷** | **方向塌缩**：渲染 `A↔B：信任x` 把 from 的私人立场对称化成双方共识（如 `镜渊↔林逸：信任none` 让 POV=林逸 场景看似林逸也不信任镜渊）。SR 投影同病（`${name}↔${other}`） |

### Faction（04_faction_bible/*.md）

| 环节 | 结论 |
|------|------|
| carrier | 每势力一个 .md（authored） |
| loader | `ctx.factions[name] = raw` ✓ |
| 注入 | `detectFactions`：势力名 substring 命中 `goal+conflict+stateBoard+entities` → compiler `faction:${name}` 模块 ✓ |
| 生产实证 | WL-03 batch：**0/40**——wiring 完好，**内容失配**（fixture 势力为异世界名，永不命中 story corpus） |
| 结论 | 非 pipeline 断裂，是 authored 内容缺口 → 作者通道补匹配势力档（driver `STRESS_WL04=1`：都市守夜人 + 档案馆） |

### State（07_state_board.md）

| 环节 | 结论 |
|------|------|
| 语义判定 | **A. Authored State**（作者快照）。post-chapter 有 `delta.state_board` 手动通道，但 Runtime 生产路径无调用者；无 runtime mutation；绝不自动变 Actual ✓ |
| compiler | 仅 `beat ∈ {hook, turn}` 注入「局势」模块（20/40）；`detectFactions` corpus 无条件含 stateBoard |
| 粒度 | Book 级静态快照；与 WL-03 NPC day-4 快照同属 **stale snapshot 风险类**（§9 记录） |
| **semantic gap** | **无合法 runtime State evolution**——记录不动手：除非真实生产证明它是 FIRST REAL BLOCKER，否则不开新 EO |

### Time（只读确认，未动）

Story Clock（`resolveStoryClock`）→ scene seed clockBlock + compiler clock 块；08_current_state 表；11_timeline；authored plan time。链路完整，本 EO 零修改。

## 2. §13 L1 Access Carrier 现行状态

- `rosterNames2` 作用域 bug 已于 WL-03 修复；batch3 workdir `l1_access/access_truth.json` 持续产出 ✓
- Studio：`StudioRuntimeOrchestrator extends RuntimeOrchestrator` → 同一 carrier 路径 ✓
- 历史结论修订声明：**WL-02 及更早 batch 的 Access 类指标产自被静默跳过的 carrier，不可纵向比较**（已在 WL-03 报告单独声明，不重写历史结论）

## 3. Minimal Implementation（仅 wiring / 渲染保真）

1. **方向保真渲染**（修 Shared Relationship ≠ Shared Knowledge）：
   - `context-ranking/collect.js`：`A↔B：信任x` → `A→B（A 对 B）：信任x`
   - `minimal-sr.js projectAffectRelationship`：`${name}↔${other}` → `${e.from}→${e.to}`（本角 SR 只见事实方向；对向内心判断仍受 Information Boundary 约束不得写成 POV 已知）
2. **Faction authored 内容**：driver `STRESS_WL04=1` 写入 `04_faction_bible/都市守夜人.md` + `档案馆.md`（与 WL-01 stateBoard 分节同名 → detectFactions 可命中）
3. **不新增 schema / 不建 State Evolution Engine / 不动 Time**（§8/§18）

## 4. Regression

- 新测试 `test:eo-wl04-rfs-pipeline-01` **18/18**：P1 TopK 方向保真 · P2 SR 投影方向保真 · P3 Faction 端到端注入 · P4 Faction fail-closed · P5 局势 hook/turn 门控=现行契约 · P6 关系≠Motive/Choice/Goal（结构层+渲染层）· P7 WL-03 NPC 隔离不破坏
- 16 项 WL 套件全绿（同 WL-03 清单，451 断言）；`phase1-sr` PASS；`reality-golden` OK；`story-route` ALL PASS

## 5. Production Observation（WL01+CW_SEED+EXTRACTION+WL03+WL04）

**run1：9/10 章过**（ch10_s4 提取失败——见 §5.2 缺陷解剖，非 WL-04 域）。重跑 run2 全败：
**DeepSeek 402 Insufficient Balance（账户余额耗尽，外部阻断，待充值）**。

### 5.1 生产接缝验证（run1，36 scenes）

| 链 | 结果 |
|----|------|
| 关系 TopK | 32/36，**方向保真**（`林逸→苏眠（林逸 对 苏眠）：信任low`）；SR affect 同（`林逸→苏眠 (trust:low)`）。（初测 32 处 `↔` 为 Story Clock 边界行 `10月↔六月` 误报，排除后零残留） |
| Faction | **8/36**（修复前 0/40）：`势力:档案馆` 等注入 ✓；fail-closed 保持 |
| NPC（WL-03 不破坏） | 20/36（56%） |
| 局势（07） | 18/36（hook/turn 门控契约） |
| L1 access | `access_truth.json` 持续产出 ✓ |

### 5.2 Literary Delta（run1 ch1–9 vs WL-03 基线 ch1–10）

| 指标 | WL-04 | WL-03 基线 |
|------|-------|-----------|
| NPC 提及/千字 | 8.2（老周 76→99 显著上升） | 7.8 |
| 对白密度/千字 | 7.2 | 6.5（+11%） |
| 世界细节句/千字 | 15.9 | 15.1（+5%） |

文学形态（§14 目标验证）：守夜人以**角色中介知识**入场 2 次（均经老周话语转述——
"封存区不联网，因为里面的东西连守夜人都不想让人查到"），无 lore 说明文；
机构纹理（闭馆/门禁/地下二层/设备层）20 处。角色开始拥有「关系历史 + 所处社会世界」。

### 5.3 附带发现：提取健壮性三重缺陷（跨域，待裁决）

run1 ch10_s4 尸检（`extraction_failures/ch10_s4.json` 已落盘）+ 确定性复现：
1. **R1 中文 grounding 误判**：`actionGroundedInText` 按标点分词，中文无标点动作串成单 token →
   任何转述型 action 必失败（且 LLM 习惯把「他」改写为角色名前缀，破坏 excerpt 前缀包含路径）
2. **R2 体验型节拍无情节后果**：内心高潮场景 LLM 正确产出 experiential 候选，但 validator 硬性要求
   非空 plot `consequence` → 全拒（missing_consequence ×6）
3. **R3 兜底抑制**：确定性 presence 路径仅在零候选时运行；1 个坏候选即抑制恒有产出的兜底

频率：4 次 batch 3 次命中（每 run 约 1 scene）。**Realization 层稳定缺陷，候选 FIRST REAL BLOCKER。**

## 6. Known Limitations

- 07_state_board 与 15_npc_simulation 均为 book 级静态 authored 快照（stale 风险已记录，§8 待 FIRST REAL BLOCKER 判定）
- faction 注入依赖名字 substring 命中（无语义归一）——别名/代称不命中属内容层问题，非 wiring
- T2 组成跨 run 噪声大（提取 LLM 随机性 + 章 cliff），不宜作单 run 纵比较（WL-06 批量验证处理）
- `WL-01-KNOWN-LIMITATION-TIME-OVERRIDE` 沿袭
- DeepSeek 余额耗尽：后续真实生产 batch 需先充值
