# PROJECT_HANDOFF_DELTA.md — InkOS 交接增量报告（面向 ChatGPT）

**生成**：2026-10-15 · **性质**：对 `PROJECT_HANDOFF.md` 的增量核验与修订 · **治理**：全程只读；零代码修改、零提交/重置/部署、零密钥输出
**核验环境**：本机仓库直接访问（git/node 实测），无权限障碍；下述每项结论附证据，不确定处显式标注。

---

## 1. Git 状态真值（比 HANDOFF 更细的分类）

**分支/HEAD**：`master` @ `d1a0ed8`（2026-09-11 14:48, "inkos(ch2): 第2章"）——此后**一个多月零提交**（证据：`git log -1 --format`）。

**未提交总量 1060 行**（`git status --short | wc -l`），分类：

| 类别 | 数量 | 构成与含义 |
|---|---|---|
| 未跟踪新增（??） | **715** | 其中 **556 在 books/我的小说**（真实书生产数据：章节/副作用产物）；**~34 为 packages 内整目录级新模块**——`events/`、`causality/`、`l1/`、`character/`、`attribution/`、`authored/`、`npc/`、`entity-identity.js`、`minimal-sr.js`、`story-clock.js`、`time-semantics.js`、`state-evolution-engine.js` 等，**即整个 Story Truth 语义心脏从未进过版本库** |
| 已跟踪修改（M） | 251 | books/我的小说 130 + studio-server 22 + brain 21 + director 19 + studio 12 + runtime 8 + core 8 + prompt 5 等 |
| 删除（D） | 94 | 全部在 books/（旧载体被生产运行清理，如 2055日常切片 的 05/06/脑历史文件） |

**🔴 敏感数据发现（HANDOFF 未记录，最高优先）**：`books/我的小说/.inkos/secrets.json`（含 LLM API keys）**被 git 跟踪且当前有修改**（`git log` 显示自 `1086724 init` 起即在库；`git diff --stat`=+4/-1）——意味着**密钥可能已存在于 git 历史中**。它不在 .gitignore（`git check-ignore` 判负）。处置（加入 ignore/历史清洗/轮换 key）属破坏性操作与安全决策，**必须项目负责人批准，本报告未做任何处理**。不确定性标注：历史中该文件各版本是否含真实有效 key 未验证（避免读出内容）。

## 2. Gate 2 最新权威状态（文档时间戳序实证）

权威链（`ls -lt` 降序）：**finalization.md（10-15 17:53，最新）→ qs1c-candidate-record.md（17:52）** → decision-pack → qualification-audit → consistency-correction → packet → design-gate（10-14）。

- **Q-S1-c：SEALED**——权威 Seal 文本=`gate-2-qs1c-candidate-record.md` **Part 4**（七项冻结条款；文件头 :3 `HUMAN SEALED — C · 2026-10-15 · NO IMPLEMENTATION`；finalization §6 同步）。**实现状态=零实现**：story-clock.js 三级序（:69 intent/:72 prior/:75 state）与 raw-append 原样在库（本轮 grep 复核）；S1-c 生效需专门 EO，未授权。
- **Q-T1 + 九类时间证据表：PENDING HUMAN ADJUDICATION**——最新可裁材料=finalization §3/§4 + 本会话 10-15 裁决包（四方案十要素矩阵/九类九字段表/WL-01 条件分支，含「#2 资格门授权」独立待裁项）。证据文件路径如上；**ChatGPT 接手后不得替裁**。
- Q-T2/Q-S2–S5：OPEN（finalization §6/§7）。整体 Gate 2：NOT SEALED。

## 3. 未解决问题全清单（五分类）

**A. 代码缺陷（已定位、有测试证据）**：①legacy delta 通道（cli.js:170 / brain-chapter.js:28 直调 applyPostChapter）绕过 F-06 守卫——Q-S4 待裁后修；②11 同章 rerun 重复行（appendTimeline 无章键）——Q-S5 待裁后修；③day 前进机制不存在（ch2+ day:null）——Q-S3 待裁；④08 四写者混语义/锚无保护——Q-S1-c 已 Seal 待 EO、Q-S2 待裁。
**B. 测试基线漂移**：`test:golden` / `test:golden-causal` 与当前因果块措辞不一致（历史遗留；重建须授权——HANDOFF §10 问6）。
**C. 内容供给不足（非缺陷）**：上层链 dormant（Intent asserted 1/40、Action/WCT 0/40——章计划无 authored decisions/anchors；`test:eo-p4-authored-cade-*` 证明链路本身完好）；非 POV 角色出场声明缺失（苏眠 T2=0 的根因）。
**D. 外部服务**：DeepSeek 曾 402 中断（余额依赖）；备用 glm-4-flash 仅够管道验证；moonshot 封号、glm-4.6 欠费、solar-pro-4 401（本会话实测矩阵）。
**E. 等待 Human 裁决（纯阻塞，无代码可做）**：Q-T1+九类表（材料就绪）→ 其后 Q-S2–S5/Q-T2 波次；另 HANDOFF §10 七问（提交策略/书籍数据性质/Studio 交付要求等）。

## 4. 当前最安全的下一步行动（三档风险分级）

**✅ 只读（ChatGPT 可立即做，零风险）**：①按 HANDOFF §5.0 跑离线冒烟+25 套回归确认基线；②通读 Gate2 权威链七文档+`story-truth-root-cause-archaeology-01.md`；③为 Q-T1 裁决准备问询清单（材料已在 finalization §3/§4，只需呈报不需新考古）。
**🟡 修改文件但不触代码（仍建议先获口头批准）**：把 `.inkos/secrets.json` 加入 .gitignore（新增一行 ignore，不删不提交——但因涉及已跟踪文件，效果有限且属安全决策一部分，**归入下档更稳妥**）。
**🔴 必须项目负责人明确批准**：①任何 `git add/commit`（提交策略=待裁问1，且须先解决 secrets 处置）；②secrets 历史清洗/轮换；③任何 Gate 2 EO 实现（Q-S1-c 落码等）；④golden 基线重建；⑤books/ 数据的任何清理。

## 5. 与现有 PROJECT_HANDOFF.md 的冲突/修订点（仅新增发现）

1. **[重大新增] secrets.json 被跟踪且已可能入库历史**——HANDOFF 仅说"勿输出值"，未发现"已被跟踪+有修改"这一事实（§1 本报告）。
2. **[精化] 未提交构成**：HANDOFF 的"145 文件"已修订为 1060 行，本报告进一步拆明 **251M/715??/94D**，且指出 packages 内是**整目录级未跟踪新模块**（语义心脏从未入库）——比"修改未提交"更严重。
3. **[时间戳证据] Gate2 权威链**：HANDOFF 列了文档但未给时间戳序与"最新=finalization 17:53"的判定依据（§2 本报告）。
4. 无发现 HANDOFF 其他事实性冲突（其 §2–§10 与本轮复测一致）。

---
*证据方法：全部结论来自本轮 git/git-check-ignore/ls-lt/grep 实测；未读出 secrets 内容；未做任何写操作（本文件为唯一新增）。*
