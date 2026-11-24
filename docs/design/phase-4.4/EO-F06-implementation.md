# EO-F-06 — Timeline Delta Channel Guard — Implementation Record

**Status**: IMPLEMENTED + REGRESSED (12/12 + 22 套) + PRODUCTION (10/10) + LITERARY PARITY
**Date**: 2026-10-08 · **契约依据**: S6.1 / EO-P2（已封——本 EO 为契约执行，非新语义）

## 1. 考古修正（如实记录）

原判「Plan 被运行时写成历史（ch1 day-1）」**不成立**：day-1 骨架条目与 golden fixture 的 11_timeline.yaml **逐字节相同**——是测试书自带历史数据（G 类），非本次生产写入。结构缺陷仍真：`applyPostChapter → appendTimeline` 是 S6.1/EO-P2 的**无守卫旁路**（裸 push），属 implementation gap。本 EO 补齐该旁路，与 engine 路径同规。

## 2. 实现（最小）

- **守卫位置**：`state-updater.js::applyStateDiffToCanon`——runtime 生产唯一咽喉（MemoryUnit ②c「Canon 仅由此口写入」）；delta.timeline.events 经 `isActualTimelineEvent` 过滤（同文件既有谓词，零重复、零 core 改动、零 schema）
- **谓词补一前缀**：`PLANNER_SKELETON_EVENT_RE` 增 `建立\s*POV`（依据：narrative-renderer.js:7 自有该外壳剥离正则——系统内已知其为规划壳；属 S6.1「等」类既有意图，非新语义）
- **残留面（记录不修）**：cli/brain-chapter 手动 legacy delta 通道仍无守卫——归 Gate 2（Time/State Authority）管辖
- **历史数据不动**：fixture day-1 条目按冻结令保留（G 类，清洗归 Gate 1 §12 裁决）

## 3. 验证

- 定向 `test:eo-f06-timeline-delta-guard-01` **12/12**（骨架全滤/Actual 保留/透传不破坏/rerun 两次生效/engine 不回归/谓词同源零漂移）
- 全量 22 套全绿（含 reality-golden、story-route ALL PASS）
- **生产 batch（DeepSeek 全配置）10/10 章、0 提取失败、守卫 0 触发**（engine 已过滤 ⇒ 现行生产无非法 delta 写入；守卫为封契约的保险层）
- 11_timeline 结构：ch2–10 全为 Actual 行；day-1 仅剩 fixture 继承条目（未清洗，冻结令）
- 文学验证（vs R2-EO batch）：40,521 字（−1.2%）、对白 6.7/千字、NPC 8.6/千字持平、世界细节 16.0——单 run 噪声内持平；**未改变任何合法文学内容**（守卫生产零触发 ⇒ prose 路径未受影响）

## 4. 双扫描 Rescan（F-06 后）

- **FIRST REAL BLOCKER：NONE**（主干+CW 支线全通，10/10 零失败）
- **FIRST UNRESOLVED SEMANTIC AUTHORITY GAP**：Gate 1 实体身份族（已交付只读设计审计，待 Seal）；Gate 2 Time/State 族按序排在 Gate 1 Seal 之后（含 F-07 day:null、legacy delta 通道纪律、08 多写者）
- Event ID 未修（按令）；未动 State/Time/Identity 任何语义

## 5. 交付物

- 代码：`state-updater.js`（守卫 + 谓词前缀）
- 测试：`scripts/test-eo-f06-timeline-delta-guard-01.js`（npm `test:eo-f06-timeline-delta-guard-01`）
- Gate 1 设计审计：`docs/design/phase-4.4/gate1-entity-identity-subject-boundary.md`（16 项输出 + Seal 八问）

**STOP——F-06 关闭；Gate 1 只读设计完毕；等待 Human Seal。**
