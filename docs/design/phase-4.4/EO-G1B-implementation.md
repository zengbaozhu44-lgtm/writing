# EO-G1-B — Relationship Affect Basis — Implementation Record

**Status**: CLOSED · **Date**: 2026-10-08 · **Seal**: Gate 1 Q5 + Q5′=C

## 实现

`minimal-sr.js::projectAffectRelationship`：**图边循环整段移除**（Q5′ 头号禁令 `Relationship Fact → direct SR affect` 切断，零等价 fallback）；authored per-character affect 路径原样（provenance/schema/渲染契约不变；无块→omit fail-closed）；切断计数 `getAffectSeveredBySeal()`（模块级访问器——**不进槽、不序列化、不持久化**，纯 audit）。§8 反泄漏穷举：`affect_relationship` 无其他写入者；TopK/其他模块零改。

## 测试

- 专项 `test:eo-g1b-affect-basis-01` **12/12**（B1 图边→omit / B2 authored 投影+provenance / **B3 T2 丰富仍 omit（反泄漏关键）** / B4 counter≠Truth（槽与渲染零痕迹）/ B5 TopK 90% 注入+方向保真+SR 槽无图边 / B6 全空 omit）
- 全量 **26 套全绿**；wl04 P2 按 Seal 更新（原断言锚定的正是被禁行为）；phase1-sr OR 条件天然兼容

## 生产（DeepSeek 全配置，10/10，0 提取失败）

| §7 统计 | 结果 |
|---|---|
| graph-edge direct affect | **0**（预期 0 ✓） |
| authored affect | 6 条（合法源照常） |
| SR affect omit/unknown | 22/40（**非法投影被正确切断——非质量回退**） |
| severed（末章重放） | 3（林逸涉 3 边，与 05 图一致） |
| Relationship TopK 注入率 | **36/40=90%**（较 G1-C 的 80% 不降反升——世界层路径完整） |

下游零漂移：T2 98 条全唯一 / attribution 10 章 / T3 1（authored seal）/ Event Identity 锚定 100%。
文学（§10 导向）：40,186 字（-2% 噪声内）、对白 6.7、NPC 8.2——**无明显退化**；关系信息经 TopK 到达 Writer（90%），SR 停止无依据 affect，主观性更干净。

## Rescan

- FIRST REAL BLOCKER：NONE
- 新 Relationship/Affect/Provenance/Access 问题：无
- **Gate 1 三部曲（G1-A Identity / G1-C Event / G1-B Affect）全部 CLOSED** → 下一节点 = **Gate 2 TIME / STATE AUTHORITY**（DEFINED / NOT AUTHORIZED 非 blocker）

## Gate 2 准备（Design Gate 问题框架，证据已在案）

**Time 域**：六载体（plan.time=Control / Story Clock / 11 day+time / 08 时间 / chapter meta / 事件无时戳）；现行 canonical 序=**Control 优先**（源码实证——03:40 压 06:15 的根因）。
**State 域**：07=authored ✓ / 08=**四写者混语义** / 11=actual+delta（F-06 已守卫 runtime 咽喉，cli/brain-chapter legacy 通道无守卫）/ 章锚=runtime 写无 authored 保护 / day:null 缺口。
**待 Seal 问题（草案八问）**：Q1 Story Time Authority 归属（plan-lock / Actual 链派生 / authored canon-time）/ Q2 Event 是否须具时戳（或证明不依赖）/ Q3 07-08-11-锚四载体 Authority 分层表 / Q4 08 写者纪律与 provenance / Q5 锚 authored 保护 / Q6 day 派生权威 / Q7 legacy delta 通道处置 / Q8 rerun 状态重建语义。

**STOP——G1-B CLOSED；Gate 2 Design Gate 待您下令开启。**
