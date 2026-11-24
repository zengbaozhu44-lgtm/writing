# EO-G1-A — Character Identity Registry & Resolution — Implementation Record

**Status**: IMPLEMENTED + S1–S11 (26/26) + 全量 24 套全绿 + PRODUCTION 10/10（0 提取失败）+ LITERARY PARITY + RESCAN
**Date**: 2026-10-08 · **Seal 链**: Gate 1 Human Seal → S-A（Seed=Reference-only）

## 1. 实现（严格按 G1-A-final-eo-card.md）

| 件 | 内容 |
|---|---|
| `inkos-core/src/lib/entity-identity.js`（NEW） | `loadCharacterRegistry`（03 文件名=canonical + `> identity-alias:` 标记行）/ `resolveCharacter`（RESOLVED(CharacterRef) \| UNRESOLVED(reason: empty/not_in_registry/alias_collision)，碰撞 fail-closed）/ `resolveCanonicalSet`；**纯读零写路径**（S8 结构保证）；character-only（不依赖版本判定，直连 `novel/03_character_bible`） |
| `character-world.js` | ①appendT2：candidateNames resolve 前置 + **resolution-aware participant 匹配**（别名经历归 canonical）+ witness 经 canonical 比对 + unresolvedSubjects 计数；④materializeWorldFromSeeds：seed key resolve 前置（UNRESOLVED→rejected[character_unresolved]、不建块不物化；别名 key 归 canonical 块）；⑤projectWorldToSRScene：跳过 quarantined；quarantine 分类器 `ensureIdentityQuarantine`（只读 world.json；invalid 须证据特征；sidecar manifest） |
| `attribution-wiring.js` | ②candidatesFromScene：actors∪pov 兜底 resolve 化（UNRESOLVED 跳过） |
| `loader.js` | ③05 边端点 resolve 过滤（无效边不入 ctx，不累及他边） |
| `orchestrator.js` | 投影传 bookDir；CW 同步后挂 quarantine 分类（soft） |

## 2. Fixture 供给修正（执行令 #4，非语义）

CW 四套 + R2 套临时书补 03 bible（林逸/苏眠[+管理员]）——**未反向 fallback seed**。执行中两处工具失误已修复（试探性 perl 误替换 store-seed 一行；程序化补丁的箭头语句语法错）——如实记录。resolver 初版经 `getBookPaths` 版本判定（无 book.json 即 null）导致 fixture 全 UNRESOLVED——改为直连目录后消除（该耦合与身份语义无关）。

## 3. 验证

- **专项 `test:eo-g1a-identity-resolution-01` 26/26**：S1 伪 actor 不建块 · S2/S3 unresolved 计数 · S4 无效边不入图且不造 Character · S5 未录取 POV 不建块 · S6 attribution 零伪主体 · S7 碰撞不猜 + 别名归 canonical（周师傅→老周 participant）· S8 无写路径 · S9 world.json 逐字节不动 + manifest（invalid=车门/unknown=他）· S10 语义不变 · **S11 未录取 seed 零物化（rejected 可审计，sync 重跑仍零）** · 空串/空 registry fail-closed
- **全量 24 套全绿**（含 reality-golden / story-route ALL PASS）
- **生产 batch（DeepSeek 全配置）10/10、0 提取失败**：

| G1-A 验证项 | 结果 |
|---|---|
| world.json characters | **[林逸, 苏眠]——零伪块**（此前每 batch 累积 ~10 个伪实体） |
| attribution | 88 records，subjects={林逸}——**全 RESOLVED，零伪主体** |
| seed | 全部 RESOLVED（fixture 书 bible 齐）；别名归 canonical 生效 |
| quarantine | manifest 0 entries（新 run 无 legacy；分类器对存量书待用） |
| 05 边 | 全 resolve，零拒绝日志 |
| T2 | 88 条（差值≈此前被伪主体误占的条目——现正确丢弃而非误归） |
| 文学 | 41,440 字 / 对白 6.8 / NPC 8.1 千字——与 R2-EO 基线噪声内持平（身份层不进 prompt） |

**诚实修正一项预期**：原期待「苏眠 T2>0」。实测 0——正确原因：她的 actors 从未出现（LLM knownNames=scene.characters∪pov，而章计划只声明 林逸 出场；旧「苏眠已经」类伪主体已被正确拒收而非误归）。她要获得经历需计划声明其在场——**Control 内容供给项**（F-04 族已知，非 G1-A 缺陷）。

## 4. 双扫描 Rescan

- **FIRST REAL BLOCKER：NONE**
- **FIRST UNRESOLVED SEMANTIC AUTHORITY GAP**：按冻结序——**G1-B（affect basis）与 G1-C（Event identity）**为 Gate 1 剩余子项；其后 Gate 2（Time/State）。新增观察（记录不扩张）：出场角色声明缺失使非 POV 已录取角色无法成为 witness/actor（内容层，喂给 G1-B/后续 rescan）。

## 5. 未做（按令）

Coreference / G1-B / G1-C / Location·Faction runtime / 历史迁移 / equivalence / SR·L1·L2·Choice·extractor·validator·WCT 接入 / 认知 Truth 载体——全部未触碰。

**G1-A CLOSED。按冻结路线等待下一裁决：G1-C / G1-B（顺序可并行）→ Rescan → Gate 2。**
