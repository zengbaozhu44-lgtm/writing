# EO-G1-C-01 — Event Identity Implementation Record

**Status**: CLOSED（实现 + T1–T10 + 全量 25 套 + 生产 10/10 + 文学持平 + Rescan）
**Date**: 2026-10-08 · **契约**: Gate 1 Q6 Seal（修正版：sceneId + raw 逐字 excerpt + span/offset 消歧；ordinal 已删）

## 实现

| 件 | 内容 |
|---|---|
| `events/event-identity.js`（NEW） | `locateRawExcerpt`（FOUND/NOT_FOUND/**AMBIGUOUS**——fail-closed 不选 first occurrence 不用 ordinal）/ `mintEventIdentity`（(sceneId,excerpt,offset)→`evt_{sceneId}_e{FNV-8}` 纯函数；hash 仅辅助表示）/ `deriveEventIdentityFromText` |
| 确定性 producer | 四类事件 id 全部改锚定 mint；**evidence=raw 逐字窗口**（去空白折叠）+ offset=excerpt 起点（与 mint 一致）；presence=raw 尾片；dedupe 键=id |
| LLM producer | 候选过 gate 后先锚定位：NOT_FOUND/AMBIGUOUS → 拒（`evidence_anchor_*`）——**绝不猜位置**；id=mint；evidence 带 offset |
| schema | `hashShort(action)` fallback 废除——无锚不铸 id（空 id 下游 fail-closed 跳过） |
| 消费侧 | CAT 两处 refOf + l1 refOf 的 `occurrence:` 前缀 fallback 全废（无 id→无引用）；attribution 跳过无 id 事件 |
| 不做 | validator/extractor 语义门、Actual/T2/T3/CW/WCT/SR/L1/L2/Choice、历史迁移、G1-B、Gate 2 |

## 测试

- **T1–T10 专项 19/19**：rerun 全等 / 锚组分逐字命中 / 双现消歧（derive=AMBIGUOUS 拒；异 offset 两 id）/ **跨 producer 同锚同 id** / 异摘录异 id（不合并）/ NOT_FOUND+AMBIGUOUS fail-closed / schema 零 hash id / 消费侧零伪造（attempted=0）/ **T2 重放零双记** / **T3 通道 A 拒同 ref 冒充**
- 全量 25 套全绿；三处锚定**旧行为**的断言按 Seal 更新（phase13 转述摘录改死于更早的锚门；bridge §11 fallback 用例改断言 fail-closed——意图保持：拒绝/不伪造）

## 生产（DeepSeek 全配置，10/10，0 提取失败）

| §8 统计 | 结果 |
|---|---|
| total events / unique ids / duplicates / missing | **104 / 104 / 0 / 0** |
| fallback ids（occurrence: 前缀）/ 非-锚定格式 | **0 / 0**（锚定格式 100%；fresh run 无 legacy——历史旧 id 全部原样保留于既有工件，未迁移未改写） |
| T2 | 91 条，actualRef **全唯一**；T3=1（authored seal） |
| Attribution | 91 records，非锚定 ref=0 |
| kinds | 体验多样性保持（informational 30/discovery 18/social 11…）——LLM 摘录在严锚下照常存活 |
| 上层链 | intent 1/40（authored decisions 内容缺口不变，D） |
| 文学 | 41,022 字（vs G1-A 41,440 噪声内）；对白 5.9；NPC 8.7 千字 |

## Rescan（双扫描）

- FIRST REAL BLOCKER：NONE
- FIRST UNRESOLVED SEMANTIC AUTHORITY GAP：**G1-B（Relationship Affect Basis）**——其 Seal 残留一个未决子点（见完成报告）；其后 Gate 2
- 新 defect：无（identity/provenance/idempotency 全清）
