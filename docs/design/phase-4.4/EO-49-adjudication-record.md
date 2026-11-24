# EO-49 — B1-2 兼容边界裁决固化 · B2-1R2 契约闭合状态记录

```text
MODE: READ-ONLY ARCHAEOLOGY → MINIMAL DESIGN DOCUMENT UPDATE
DATE: 2026-10-22
STATUS: ADJUDICATION RECORD · NOT HUMAN SEAL (S-1..S-7 全部 PENDING)
IMPLEMENTATION: NOT AUTHORIZED · 无 Named EO
依据链: EO-49 调用链审计 / R-A / R-B / R-C / HS-01 / B2-1 深审 / B2-1R / B2-1R2 审议稿（对话交付）+ 本文件新建前经只读核查确认 docs/ 无既有 EO-49 文档
排除: 未修改运行时代码、测试、书籍数据、迁移数据、生产状态、V2.0 冻结路线图、Phase 编号/名称/边界
```

---

## 0. 文档定位

本文件只做两件事：固化用户已确认的 **B1-2 兼容政策裁决**，并记录 **B2-1R2 契约闭合（S-1..S-7）** 的当前状态与约束。本文件本身不构成 Human Seal，不构成 Named EO，不授权任何实现。证据分级：`CODE-PROVEN`（既有代码事实，附行号）/ `TEST-PROVEN`（既有测试事实）/ `设计推导` / `候选建议` / `UNKNOWN`。

---

## 1. B1-2 兼容边界裁决【用户已确认 · 2026-10-22】

**用户明确确认的五条决策（原文语义，不得扩大解释）**：

1. 当前《我的小说》（book id `我的小说`，`books/我的小说/book.json`）**不属于**放弃兼容的旧书范围。
2. 《我的小说》保留为 InkOS **新契约下的生产与验证对象**。
3. **其他旧书放弃兼容保证**：不再为它们增加兼容分支、自动迁移、历史状态补写或特殊放行逻辑。
4. 放弃兼容 **≠** 删除旧书、清理历史文件或重写历史数据。
5. 所有纳入新生产流程的书均遵守**统一的新审核、提交和章节顺序契约**；《我的小说》**不享有旧行为豁免**。

**随裁决固化的边界澄清**：

- 当前受支持生产书：**《我的小说》**（仅此一本）。
- 其他旧书：不保证兼容，系统不承担额外兼容与自动迁移义务。
- 旧数据不因本裁决自动删除或改写（与决策 4 同义重申）。
- 新生产流程统一遵守新契约（审核顺序 / pending-audit / accept 语义）。
- **本裁决仅解决兼容政策，不代表任何代码实现已获授权。**
- **不得**将"其他旧书放弃兼容"解释为可以破坏《我的小说》或清理全局历史数据。
- 历史回填、批量迁移、手工补写：仍全部排除（归后续独立裁决）。

**与其他 Seal 的关系**：B1-1（严格顺序原则）与 B1-2（本裁决）现在均为已确认原则；B1-1 的 **enforcement 时机**（顺序闸何时启用）仍待裁决——因《我的小说》ch1 当前无可接受材料（见 §2），启用顺序闸前必须先走合规 bootstrap（§2.4），故 enforcement 仍标记为 **PENDING**。

---

## 2. 《我的小说》新契约前置条件核查（任务 B4）【全部 CODE-PROVEN，核查日 2026-10-22】

| # | 前置条件 | 实测 | 判定 |
|---|---|---|---|
| 2.1 | `schemaVersion: 4` | `book.json` 中为 `null` | ✗ |
| 2.2 | `brainEnabled: true` | `book.json` 中为 `null` | ✗ |
| 2.3 | `novel/` 模块集（01/02/03/09 等） | **`novel/` 目录不存在**（无 world/writing bible、无 03_character_bible → G1-A 身份录取无载体、无 09 任务卡） | ✗ |
| 2.4 | audit-native（存在有效审核 entry） | 无 `chapter_audit.json` | ✗（legacy） |
| 2.5 | 章节材料链（state / pending） | `chapters/0001_逃出生天.md` 存在；**无 states/、无 pending** | ✗（ch1 在 EO-48 S3 下无充分接受材料） |

**结论**：《我的小说》**当前不满足新契约前置条件**（2.1–2.5 全不满足）。作为生产与验证对象，其纳入新契约需要走合规通道，而非豁免或迁移。

**合规 bootstrap 推导（设计推导，未授权）**：无需历史补写的自然路径为——以新契约为准重建模块集与配置（如经 book-wizard 重建书档；wizard 建书即写首个 `ready_to_generate` entry，`book-wizard.js:133`，CODE-PROVEN → 生而 audit-native）→ 既有 `0001_逃出生天.md` 作为**作者素材**（不作权威审计记录，符合 B1-1"正文不替代审计记录"）→ ch1 经正式 living 生成（deferCommit → pending commit）→ accept → 解锁 ch2。该推导的**具体通道选择（wizard 重建 / 新建书目录 / 人工补模块）未裁决**，本轮不实施。

---

## 3. B2-1R2 契约闭合 S-1..S-7 状态【全部 PENDING SEAL】

以对话版《EO-49 · B2-1R2 — 最终契约闭合（Human Seal 审议稿）》为基准，逐项核对并收录用户约束（B 约束措辞以用户提交为准）。**任何一项都未被标记 SEALED。**

### 收录的约束（用户提交，本记录原样保留）

**B1 分离原则**：Runtime Completion ＝ `pass === true && awaiting == null && error == null`；Pending-Audit Artifact 必须由**本次写入成功证据**确认并验证材料绑定当前目标章节；不得用 `pass:true`、文件存在、正文非空或旧文件时间戳代替；写入失败不得被报告为待审核材料已成功建立。

**B2 Accepted 终态保护**：已 `accepted` 章节不能被普通完成回调降级为 `pending_audit`；既有 pending 材料与 accepted 状态不一致时**不自动清理**；`orphanPending` 若保留，仅为**诊断信号**——没有消费者之前不得宣称系统会自动处理。

**B3 材料绑定与消费安全**：消费入口验证材料章节与目标章节绑定；不匹配→拒绝消费、禁止提交写入；D-1 完成回调在写入失败／材料不匹配／章节已 accepted／状态读取失败时的行为必须明确；未验证的并发、外部编辑、残留文件风险不得描述为已解决。

**B4 Audit-native 与 Legacy 边界**：有效审核状态集合 ＝ `{pending_audit, accepted, ready_to_generate}`；`deleted`、`generating` **不得**作为有效状态（`CODE-PROVEN`：二者零生产写入者，本轮 grep 复核）；**书籍分类规则与章节审核顺序规则严格区分**；其他旧书不保证兼容（§1 已固化）；《我的小说》前置条件检查见 §2；不自动迁移、补写、重置任何书籍状态。

**B5 严格章节顺序**：接受第 N 章前，前面所有章节必须满足冻结后的审核顺序契约；`unlockedThrough`、`currentChapter`、章节正文文件、运行状态均不能代替权威审核记录；**不得仅增加 `assertChapterUnlocked` 就宣称实现全局严格顺序**（其为单章视野闸，CODE-PROVEN：chapter-audit.js:117-126）；五条生产路径门禁覆盖见 §4。

### S-1..S-7 状态表

| # | 条目 | 状态 | 依据 |
|---|---|---|---|
| S-1 | C1 双判据与组合表（含写入失败不改运行失败语义） | **PENDING SEAL** | CODE-PROVEN 基础（:205-215 写失败告警继续；:108-113 空正文硬闸不受 force 旁路）＋审议稿 |
| S-2 | C2：维持 resume 允许性＋accepted 终端守卫＋orphanPending（诊断信号/不清理/无消费者零行为） | **PENDING SEAL** | B2 约束已收录；orphanPending 定位为诊断信号 |
| S-3 | C2 附带：清理策略独立裁决（本轮不删） | **PENDING SEAL** | 与 B1-2 决策 4 同向 |
| S-4 | C3：`pendingCommitWritten` 事实源＋绑定校验两消费点＋失败行为 | **PENDING SEAL** | 需新设计（chapter-pipeline 返回契约） |
| S-5 | C4：有效集合（剔除 deleted/generating）＋入口快照＋快照缺失 fail-safe=legacy | **PENDING SEAL** | 集合剔除依据 CODE-PROVEN 死值事实 |
| S-6 | C5：D-1 限 audit-native；legacy 阻塞项仅"全域启用"；渐进纳入归 B1-2 终裁 | **PENDING SEAL · 受 §1 影响更新**：legacy 域现仅余《我的小说》且其应**进入**新契约（§2），"legacy 豁免"实际适用面已收敛至"未纳入流程前的过渡期行为" | §1 决策 |
| S-7 | Named EO 范围（审议稿 §6）与测试矩阵（§8） | **PENDING SEAL** | 候选建议 |

---

## 4. B5：生产路径门禁覆盖现状【全部 CODE-PROVEN，行号经复核】

| 生产路径 | 入口 | 门禁（assertChapterUnlocked） | 提交语义 |
|---|---|---|---|
| HTTP run / next / replan（living 与非 living） | `controlRun`（runtime-control.js:167-177） | **有** | daemon 路径 deferCommit:true（:70-72） |
| **HTTP resume / retry** | `controlResume`/`controlRetry`（:251-260） | **无** | 同上 defer；**完成不 markPendingAudit**（:100-163 无该调用） |
| **daemon auto-next** | `_onPipelineCompleted`（daemon.js:302-315） | **无** | 直 commit（仅 watcher 直 commit 链可触发；HTTP 全 defer 不触发） |
| **章节 watcher（chapters/*.md 保存）** | `_onChapterFinished`（daemon.js:200-235；trigger.js:17-32） | **无** | 无 plan→带正文生成；有 plan→**直 commit**（:216） |
| **scene watcher auto-resume** | `_handleSceneUpdate`（daemon.js:173-188） | **无**（有界：仅存在未完成 scenes 的章） | 直 commit |
| **rejection auto-requeue** | :283-291、:295-301 | **无** | 随重跑路径 |
| 接受路径（acceptChapter 四分支） | chapter-audit.js:199+ | 无顺序闸（EO-48 后 fail-closed 材料闸在场） | 按分支 |

**结论（B5 约束收录）**：全局严格顺序**未在任何路径实现**；`assertChapterUnlocked` 是单章闸；B1-1 enforcement 属后续独立裁决与 Named EO。

---

## 5. 风险与未决

1. 《我的小说》纳入通道未裁决（§2 bootstrap 三选一：wizard 重建／新目录／人工补模块）。【PENDING】
2. B1-1 顺序闸启用时点未裁决（依赖 §2 bootstrap 完成）。【PENDING】
3. S-1..S-7 全部待 Seal；chapter-pipeline 返回契约变更的下游涟漪需在 EO 回归中显式覆盖。【UNKNOWN 面】
4. 残余 stale 风险（外部手改 pending、串行化外并发覆盖）明确**未解决、不宣称解决**（B3 约束）。
5. orphanPending 无消费者前仅为诊断信号（B2 约束）。
6. 其他旧书放弃兼容后的**长期存放语义**（只读保留？归档？）未裁决——本裁决只声明不删除不清理。

---

## 6. 边界声明

```text
· 本文件 = 裁决记录，≠ Human Seal（S-1..S-7 PENDING），≠ Named EO，≠ 实现授权
· IMPLEMENTATION NOT AUTHORIZED
· 不迁移、不补写、不清理、不重置任何书籍状态；未触碰运行时代码/测试/书籍数据/生产状态
· 未修改 V2.0 冻结路线图与 Phase 编号/名称/边界
· 不得将 GLM/助手建议写成用户已确认决定；§1 五条与 §3 B1-B5 约束措辞为用户提交原文语义
```
