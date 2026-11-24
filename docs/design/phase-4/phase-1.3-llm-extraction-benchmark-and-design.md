# Phase 1.3 — Real Literary Evidence Extraction: Offline Benchmark & Minimal Design

```text
MODE: READ-ONLY DESIGN + OFFLINE BENCHMARK（未改任何生产代码）
BASIS: 双章 8 场真实生产 prose（tmp-stress/corpus.json，stress-test 工件）
BENCH: scripts/bench-phase13-extraction.js（纯工具；候选走「现有」validator 闸门）
VERDICT: 基准通过 —— 达到进入 implementation 的门槛（见 §5）
```

## 1. 真实 prose failure corpus（现行确定性提取器，8 场）

| # | 失败模式 | 实例 |
|---|---|---|
| F1 | 实体误归 actor（被动句/名词短语） | `偏厅的门被从外面`（把门当人物）、`把抽屉重新`（副词片段当 actor） |
| F2 | 代词 actor 无解析 | `他`/`她`/`又`（5/9 事件） |
| F3 | 句中残片 action | presence 事件 = 尾部 120 字截断（`来如此。折痕对不上…`） |
| F4 | 重大世界变化全漏 | 警铃炸响+红外光栅封锁、门禁红锁、光栅解除——**0** 捕获 |
| F5 | 动词词表召回缺口 | 撞碎（非「砸碎」）、撬开、扣腕骨搜出——核心动作 0 捕获 |
| F6 | canned consequence echo | 9/9 全为 `场面动作已发生：X` 回声 |
| F7 | SR 级 speech-act 漏 | 苏眠坦白「是我画的」、声称被跟踪——0 捕获 |

量化：actor有效率 2/9（22%）、真实 aftermath 0、金标核心事件召回 **1/16**。

## 2. 金标（人工，18→16 条去重）

每场核心事件 {actors, action 关键词, aftermath 关键词}，含 5 个真实世界变化
（警铃/光栅封锁、光栅解除、地图易手×3、真图搜出、桌上空了）。见 bench 脚本 GOLD。

## 3. Benchmark 结果（两轮）

| 方案 | events | actor有效 | 真实aftermath(逐字非回声) | 金标召回 | false evidence |
|---|---|---|---|---|---|
| A 确定性（现行） | 9 | 2 (22%) | 0 | 1/16 | —（本来就漏） |
| B-L1 LLM候选（自由转述） | 0 | — | — | 0 | 闸门全拒（`evidence_not_in_text`/`action_not_grounded`）——证明闸门有效拦住转述 |
| B-L2 LLM候选（逐字约束 prompt） | 24 | **24 (100%)**（闸门强制） | 24 逐字非回声（人工复核：~14-16 条为真实状态变化，其余为装饰性引文） | 机器 4/16 → **人工 ~8.5/16** | **0 伪造**（全部 excerpt 逐字、actor ⊆ 名单、actorEvidence 逐字） |

关键事件捕获实例（现行提取器全漏、B-L2 全中）：
- `左手肘撞上档案柜的玻璃 → 整块碎开，碎片溅到手背上` + `侧门门禁灯由绿转红，锁舌咬死`
- `把地图…递过去 → 光栅熄了。警铃也停了`（条件解除型 W）
- `扣住她腕骨，往上一翻 → 纸角从折缝里滑出来`（真图现世——本章关键 Action→W）
- `把地图对折，塞进自己内袋 → 苏眠的视线跟着那张纸移动`（道具转移链）

## 4. 已知限制（如实）

- **装饰性 consequence**（~10/24）：逐字但不构成状态变化（如「离他两步远」）。grounding
  ≠ aftermath 语义。缓解：prompt 已限「世界变化」；残余由 WCT mint 侧 echo+grounding
  再过滤，但**可能 mint 弱 WCT**——实现时 WCT 消费侧保持 consume-only 可审计即可。
- **speech-act 召回缺口**：苏眠坦白（SR 级关键）仍漏；ch2_s1 六候选全被闸门正确拒绝
  （fail-closed 代价）。金标中坦白/声称类事件召回最低。
- 模型为 deepseek-chat（生产 solar-pro 401）；N=8 场单轮；金标为单人标注。

## 5. 最小接口设计（Phase 1.3，未实现）

```text
extractStoryEventsLLMAssisted(scene, opts)  — 与 extractStoryEventsFromScene 同签名
  1. LLM 只做 EXTRACT（proposal）：严格 JSON 契约（kind/actors/action/consequence/
     stateChanges/affectedEntities/excerpt/actorEvidence），逐字约束 + 示例（bench 已验证）
  2. 确定性闸门（全部已有或纯函数）：
     - createStoryEvent 归一 + validateStoryEvent（excerpt 字面 / action grounding /
       source 黑名单 / writes* 强制 false）—— 现有，不改
     - actor ⊆ knownNames（fail-closed 整项拒绝）
     - actorEvidence 逐字存在于 scene.text（代词归属可审计）
     - consequence 过 isActionEchoOfY + isGroundedInAftermath（echo→拒/清空）
  3. source = STORY_EVENT_SOURCES.ANNOTATED（schema 既有合法值——无需改 schema）
  4. provenance：scene.actualEventMeta = { extraction:'llm-assisted-v1', model,
     candidateCount, rejectedCount }（既有 meta 槽）
  5. fallback：LLM 失败/超时/全拒 → 现行确定性提取器（不劣于现状）；ensureActualEvents
     语义不变；LLM 永不直接写 actualEvents/sidecar
  6. 接线：ensureActualEvents(scene, { extraction:'llm-assisted' }) 显式 opt-in，
     Runtime/Studio 按 feature flag 启用
Authority: LLM = evidence proposer only；Truth 判定仍全在确定性闸门 + 下游 Truth 桥
（Character Action correspondence / WCT mint 不变）。
```

## 6. VERDICT

Benchmark 证明：候选方案在真实散文上把 actor 有效性 22%→100%（闸门强制）、
金标召回 1/16→~8.5/16（人工）、世界变化捕获 0→14+、伪造证据 0（逐字闸门全程生效）。
**未增加 false evidence 风险**（两轮实验中闸门把所有转述/幻觉拒之门外）。
→ **进入 implementation 的条件已满足**。实现顺序：
① `event-extractor-llm.js`（闸门管道）→ ② ensureActualEvents opt-in 接线 →
③ 复用 stress-test 复跑验证四条 Truth 链（Action/WCT/SR/timeline）供血 → ④ 全量回归。
