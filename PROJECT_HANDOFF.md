# InkOS 项目交接报告（PROJECT_HANDOFF）

**生成日期**：2026-10-15 · **生成依据**：实际代码、package.json（99 个 scripts）、Git 记录、docs/design/ 全部设计文档、本会话全部生产与回归记录
**阅读纪律（最高优先）**：本项目运行在一套严格的「Human Seal 治理」之下——**架构语义只能由项目负责人（用户，下称「女王」）裁决，AI 不得自行 Seal、不得把候选当已决、不得为推进而扩权**。接手 AI 必须先读 §10 执行指南再动手。

---

## 1. 项目概况

**核心目标**：InkOS 是一个**长篇小说生产运行时（Novel Runtime）**，解决 AI 长篇创作的三大顽疾：失忆（角色忘掉早期事实）、说谎（世界状态前后矛盾）、空壳（角色/世界只在出场瞬间存在）。其架构核心是 **Story Truth 路线**：

```
Prose → Actual(事件提取) → Information Boundary → SR(角色主观状态)
→ Access → L1 → L2 → Choice → Action → Consequence → Actual ↺
→ State Evolution → Survival → Next Scene → Writer
支线：Actual → Character Access → T2(经历) → Character World → T3(成型) → 投影 → SR
```

三层铁律：**Story Truth ≠ Story Control ≠ Story Realization**；Writer 只填正文非真相权威；角色知识必须过 Access 门；缺东西≠马上造东西。

**目标用户/场景**：作者用 InkOS Studio（Novel Runtime Console）或 CLI 持续生产多章节小说；系统保障跨章一致性（事实/时间/角色认知/世界状态）。

**当前开发阶段**：V2.0 冻结路线图执行中。主干 22 个节点中 16 个已 Seal 且实现回归锁定；当前处于 **Gate 2（Time/State Authority）Human Adjudication 中期**——Q-S1-c 已 Seal 未实现，Q-T1+九类时间证据表待裁。

**技术栈**：Node.js ≥20（实测 v22.22.0）· 纯 ESM（`"type":"module"`）· 零编译直跑 JS monorepo（18 个 packages，npm workspaces symlink 互引）· LLM 外部 API（DeepSeek 主力写作/提取；zhipu glm-4-flash 备用）· 无传统数据库（书数据=YAML/MD/JSON 文件树；git 快照做 memory）。

**运行/部署**：本地开发为主；`inkos runtime run/daemon` 跑管线；`npm run studio:build && npm run studio:server`（http://localhost:4567）跑 Studio UI。

## 2. 当前实际进度

### 已实现且验证（回归锁定，25 套测试全绿）

| 能力 | 证据 |
|---|---|
| Actual 事件提取链（R1 中文 grounding 修复 / R2 consequence 语义分离 / R3 兜底修正） | `test:eo-extract-harden-01` 12/12、`test:eo-r2-consequence-split-01` 23/23、`test:phase13-extraction` 23/23 |
| Character Identity 注册与解析（G1-A：03_character_bible=唯一录取权威，五接线点，quarantine sidecar） | `test:eo-g1a-identity-resolution-01` 26/26；生产 10/10 零伪块 |
| Event Identity 证据锚（G1-C：sceneId+逐字 excerpt+offset；四套旧 ID 全废） | `test:eo-g1c-event-identity-01` 19/10 组；生产 104/104 唯一 |
| Relationship Affect Basis（G1-B：图边不直投 SR affect，authored 独占） | `test:eo-g1b-affect-basis-01` 12/12 |
| Character World 四层（seed/store/T2/T3/投影）+ T2 六契约 | `test:eo-cw-*` 四套 101 断言 |
| L1 三载体（Eligibility/Access/Evaluation）+ L2 负边界封闭 | `test:eo-l1-*` + `test:l1-audit` |
| CADE→Intent→CharacterActionTruth v2 + WCT（含 Risk7 立法） | `test:eo-p4-*` 六套 176 断言 |
| F-06 timeline delta 守卫（S6.1/EO-P2 执行） | `test:eo-f06-timeline-delta-guard-01` 12/12 |
| WL-01~04 世界输入（时间接地/T2 提取修正/NPC 集成/关系势力管线） | `test:eo-wl03/wl04`；多轮生产 batch 文学验证 |
| 生产基线 | 多次 DeepSeek batch 10/10 章、0 提取失败（最近 G1-B batch：§7 五项统计全达标） |

### 已 Seal / 已裁决但**未实现**（勿当成已存在）

- **Q-S1-c**（08.时间单载体+类别/provenance+源③条件消费）——Sealed 2026-10-15，**代码零改动**，现行 Clock 三级序+raw-append 原样。
- Gate 1 期间多项「DEFINED/NOT AUTHORIZED」语义（L1 观察者 test-only、Choice object NOT PROVEN、affect 形成机制未定义等）。

### 待裁决（Human 唯一）

- **Q-T1**（时间权威四选一：A′/B′/C′/混合）+ **九类时间证据类别表**——完整裁决包已在 Gate-2 finalization/packet 就绪；**Q-T2、Q-S2–S5** 依波次开放。

### 已知问题/技术债（证据在案）

1. **~1060 行未提交变更（`git status --short | wc -l`=1060，其中 packages/ 占 145 文件）**——整条 Truth 主干+G1 系列全部悬在工作树；末次提交 `d1a0ed8` 停在 **2026-09-11**，其后一个多月的全部成果无版本保护。
2. cli.js/brain-chapter.js 两条 legacy delta 通道绕过 F-06 守卫（Q-S4 待裁）。
3. 11_timeline：day 前进机制不存在（ch2+ day:null，current_day 冻 1）；同章 rerun 会追加重复行（Q-S3/S5 待裁）。
4. 08 四写者混语义（Q-S1-c 已 Seal 待 EO 实施）；锚无 authored 保护（Q-S2）。
5. LLM 供应商依赖：DeepSeek 余额曾耗尽（402）中断生产；备用 zhipu glm-4-flash 质量仅够管道验证。
6. 上层真相链（Intent/CharacterAction/WCT asserted≈0/40）dormant——章计划无 authored decisions，属内容供给缺口非代码缺陷。
7. test:golden / test:golden-causal 存在与当前措辞的基线漂移（历史遗留，未更新）。

### 最近一次开发

G1-B Relationship Affect Basis EO 全链闭环（实现+专项 12/12+全量 26 套+DeepSeek 生产 10/10+Rescan），随后进入 Gate 2：七问裁决包→一致性修正→证据资格审计→Q-S1-c 候选→Seal→状态同步（最近一次写入即两份 Gate 2 文档同步）。

### 当前最需解决的 3–5 件事

1. **Q-T1+九类证据表 Human 裁决**（阻塞 Gate 2 收口的一切下游）。
2. **145 文件提交策略**（主干成果无版本保护，风险最高）。
3. Q-S1-c 实现 EO（Seal 已在，待女王下令）。
4. DeepSeek 余额监控/多 provider 降级策略固化。
5. 上层链 authored decisions 内容供给（激活 dormant 的 Intent/Action/WCT）。

## 3. 项目结构与模块关系

```
packages/
  inkos-core      基础库：book 路径/版本、yaml-store、minimal-sr(SR 槽)、story-clock、
                  time-semantics、entity-identity(G1-A resolver)、legacy workflows(cli 用)
  inkos-brain     语义心脏：事件提取(3 文件)/validator/schema/event-identity(G1-C)/
                  character-world(CW+T2+T3+quarantine)/character-sr-updater/
                  causality(CADE·Intent·CAT v2·WCT)/l1(三载体)/attribution/npc/
                  loader(ctx 组装)/planner/memory(state-updater·state-evolution-engine·git-memory)
  inkos-prompt    Prompt Compiler v2：context ranking 消费、SR/时钟/Actual 回读/信息边界块
  inkos-runtime   编排：pipeline/orchestrator.js(主链 ~900 行)、memory-unit(Canon 唯一写口)、
                  scheduler、daemon、compiler/prompt-compiler
  inkos-context-ranking  TopK 引擎(collect/rank/format，含关系方向保真)
  inkos-studio(-server) 前端 Console + 薄 API 包装(不改 Runtime)
  其余(director/writer/adaptive-learning/…) 支撑件
books/我的小说/        真实生产书(V4)+.inkos/secrets.json(LLM keys，勿外泄)
tests/golden-baseline/ 压测 fixture 书(含 03 bible/伪 day-1 timeline 等)
scripts/               全部测试/压测驱动(stress-story-route-run.js=生产 batch 驱动)
docs/design/phase-4(.4)/ 全部 EO/Gate/审计文档——**本项目的第二源代码**
```

**核心调用链**（生产一次 scene，锚点=函数名可 grep，行号约值会漂移）：

```
orchestrator._runScenesAndChapter (packages/inkos-runtime/src/pipeline/orchestrator.js)
 ├ ensureActualEventsWithExtraction (≈:549) → event-extractor-llm.gateCandidate
 │   → event-identity.locateRawExcerpt/mintEventIdentity (G1-C 锚定)
 │   → event-validator.validateStoryEvent (R1/R2 门)
 ├ applyCharacterSRAfterActual (character-sr-updater.js) + projectWorldToSRScene (CW 投影，跳 quarantine)
 ├ appendT2Experiences (character-world.js ≈:339；G1-A resolve 前置+resolution-aware 匹配)
 ├ L1 三载体 + attribution(candidatesFromScene resolve 化) + CAT/WCT (causality/)
 ├ buildDynamicPrompt → compileScenePrompt (inkos-prompt/src/compiler.js) → Writer(LLM)
 └ 章末 memory-unit.commit → evolveFromChapter(state-evolution-engine)
     → applyStateDiffToCanon (state-updater.js；F-06 timeline 守卫) → 07/08/11 + 锚 + git 快照
```

**一次 scene 的数据足迹**：chapters/NNNN_*.md（正文）+ novel/_system/brain/ch_NNNN_scenes.json（actualEvents 含锚定 id/各 Truth sidecar 引用）+ world.json 追加 T2 + l1_*/attribution/ 副作用 + states/ch_NNNN_anchor.yaml。

**配置**：`getBookPaths`（book.json schemaVersion=4 或 novel/ 目录判定）；LLM config 经 `loadInkOsConfig`+secrets；压测 env：STRESS_BATCH/WL01/CW_SEED/EXTRACTION/WL03/WL04/PROVIDER。

## 4. 核心业务逻辑（不可随意改变的行为）

- **数据结构**：书=文件树（novel/01~16 编号载体+_system/brain/ 下的 scenes/cade/l1_*/character_world/world.json 等副作用产物）。StoryEvent schema（actors/action/consequence 可空[R2 Seal]/evidence{excerpt,offset}/source 禁令）；Event id=G1-C 锚定格式 `evt_{sceneId}_e{8hex}`。
- **权威规则（冻结）**：03_bible=Character 唯一录取；CW seed=Reference；UNRESOLVED 不物化；同锚=同 Event、异摘录=异事件；Experience consequence 可空但 WC 断言必 grounding；图边不直投 affect；枚举≠证据(Frozen#10)；plan↛timeline.events；日历串≠Day-N；unknown 合法禁编造；Choice=NOT PROVEN；L2 负边界。
- **Canon 写口唯一**：memory-unit ②c → applyStateDiffToCanon（+F-06 守卫）。
- **无传统鉴权**：单机本地工具；secrets 仅 LLM key（.inkos/secrets.json，含 deepseek/zhipu/moonshot/solar-pro-4 四 provider，**报告中严禁输出值**）。
- **治理流程**（必须遵守）：发现→只读考古→Design Gate→Human Seal→Named EO→实现→专项测试→全量回归→生产 batch→文学验证→双扫描 Rescan（FIRST REAL BLOCKER + FIRST UNRESOLVED SEMANTIC AUTHORITY GAP）→STOP 等令。

## 5. 开发环境与运行

### 5.0 快速启动与冒烟（新 AI 第一小时做什么）

```bash
# ① 零成本冒烟（无 LLM、秒级）：任一 EO 专项应全绿
npm run test:eo-g1a-identity-resolution-01     # 期望 26 pass / 0 fail

# ② 离线全量语义回归（25 套 EO/WL 系列，无 LLM 消耗）
for t in test:phase13-extraction test:eo-p4-world-consequence-bridge-01 \
  test:eo-p4-world-consequence-consumption-01 test:eo-p4-chapter-seam-actual-readback-01 \
  test:eo-p4-authored-cade-channel-01 test:eo-p4-authored-cade-production-01 \
  test:eo-p4-correspondence-v2-01 test:eo-l1-subject-eligibility-01 \
  test:eo-l1-access-carrier-01 test:eo-l1-production-evaluation-01 test:l1-audit \
  test:eo-cw-store-seed-01 test:eo-cw-projection-01 test:eo-cw-trace-01 test:eo-cw-formation-01 \
  test:p32-authored-sr-wiring test:eo-wl03-npc-runtime-integration-01 \
  test:eo-wl04-rfs-pipeline-01 test:eo-extract-harden-01 test:eo-r2-consequence-split-01 \
  test:eo-f06-timeline-delta-guard-01 test:eo-g1a-identity-resolution-01 \
  test:eo-g1c-event-identity-01 test:eo-g1b-affect-basis-01 \
  test:reality-golden test:story-route; do npm run -s $t 2>&1 | tail -1; done
# 期望：26 行全部 0 fail / OK / ALL PASS（golden 系历史漂移除外，见 §2）

# ③ CLI 入口：package.json bin 提供 `inkos` 命令（npx inkos … 或 node packages/inkos-core/src/cli.js）
#    子命令见 cli.js case 分支：init/context/delta/post/review/npc/version/brain…；
#    runtime 用法（run/daemon）以 AGENTS.md 为准：inkos runtime run <book-dir> --chapter N --text 正文.md
```

### 5.1 生产与工具命令

```bash
# 环境：Node ≥20（实测 22.22）；npm workspaces 已 link（node_modules/@inkos/*）
node scripts/stress-story-route-run.js            # 单次生产压测（ch1-2）
STRESS_BATCH=1 STRESS_WL01=1 STRESS_CW_SEED=1 STRESS_EXTRACTION=1 STRESS_WL03=1 STRESS_WL04=1 \
  node scripts/stress-story-route-run.js          # 10 章 batch（DeepSeek）
STRESS_PROVIDER=zhipu …同上                       # 余额应急切 glm-4-flash
npm test                                          # 主套件（部分历史漂移，见 §2）
npm run test:eo-<name>                            # 25 套 EO 专项（当前全绿清单见 package.json）
npm run studio:build && npm run studio:server     # Studio → http://localhost:4567
node scripts/stress-wl03-delta.js [workDir] [基线md]   # 文学指标对比（只读）
```

- LLM key：`books/我的小说/.inkos/secrets.json`（**勿打印**）；provider 可用性曾实测：deepseek(主力，曾 402)、zhipu glm-4-flash(可用)、moonshot(封)、glm-4.6(欠费)、solar-pro-4(401)。
- 无迁移系统：书结构演进靠代码兼容+git 快照（`inkos memory snapshot/rollback/branch`）。
- 常见坑：fresh 临时书若走 `getBookPaths` 必须带 book.json（否则 version=null——G1-A 曾踩）；batch 偶发 LLM 瞬态失败重跑即愈（有 extraction_failures/ 落盘尸检）；DeepSeek 402 时勿误判语义故障。

## 6. 已做工作与历史决策（浓缩）

- **时间线**：Phase1 事件提取→P4 真相主干(19 EO)→CW 四层→L1/L2 封闭→写手质量考古→WL-00~04 世界输入→EXTRACT-HARDEN(R1/R3)→R2 语义分离(Seal)→伪角色发现→根因考古(两族缺口)→F-06→**Gate 1 三部曲 G1-A/G1-C/G1-B 全 CLOSED**→Gate 2 进行中。
- **失败/弃用方案（勿重复）**：字符占比类模糊 grounding；≥3 字尾部子串匹配（假阳性）；soft-kind 豁免表（R2 改为语义分离）；seed 作身份录取源（S-A 裁定 Reference-only）；ordinal 作事件消歧（Q6 指定 offset）；「同名=同实体」；图边直投 affect；shell 内嵌 perl 正则批量改码（多次静默失配，应改 Edit 工具）。
- **关键既定原则**：见 §4 冻结清单 + docs/design 内 40+ 份文档；尤其 `story-truth-root-cause-archaeology-01`（两族根因收敛）与 Gate-2 系列七文档。

## 7. 当前问题深入分析（top 3）

**P-1 未提交工作树（145 文件）**：表现=主干成果仅存于工作区；复现=`git status`；风险=任何误操作不可恢复；涉及=全 packages；已证=最近提交 d1a0ed8 早于全部 G1 系列；建议=请示女王批准按 EO 粒度分批提交（先 docs 后代码），**未经批准不得自行 commit**。
**P-2 Gate 2 停摆点**：Q-T1 待裁——材料齐备（gate-2-finalization §3/§4 + 最新裁决包），纯等待 Human；无代码可做；勿替裁。
**P-3 上层链 dormant**：Intent 1/40 asserted；复现=batch 后统计 scenes json；根因=章计划 yaml 无 decisions/anchors 内容（内容缺口 D 类）；建议=压测驱动加 authored decisions 后跑 eo-p4 套件验证链路复活——属内容供给，不需新架构。

## 8. 下一阶段计划（依优先级）

- **P0**：①工作树提交（待授权）；②Q-T1+证据表裁决后 → Gate 2 各 EO 序列（G2-A Clock/G2-B Carrier/G2-C Day&Rerun，条件 Seal）。
- **P1**：③Q-S1-c 实现 EO（Seal 在案）；④Q-S2–S5 依次 Seal+EO；⑤Q-T2（事件时戳 prove-or-rule）。
- **P2**：⑥上层链内容激活；⑦provider 降级固化；⑧golden 基线漂移清理；⑨legacy 通道守卫（随 Q-S4）。
- **P3**：Gate 2 后按冻结路线：Phase 4 Access+Agency→L1→L2→Choice；WL-05 CW Grounding 与 WL-06 批量文学验证重估。

## 9. 代码质量评估

**稳定勿轻动**：events/ 链（validator+identity+两 producer）、character-world.js（G1-A 后）、minimal-sr、l1/*、orchestrator 主链、context-ranking——全部被 25 套回归钉死，任何改动须跑全量。

**模块→必跑回归映射**（改左必跑右，缺一即回归漏网）：

| 改动模块 | 必跑专项 |
|---|---|
| event-validator / event-identity / 两 extractor | extract-harden + r2-consequence-split + phase13 + g1c |
| character-world.js（T2/CW/投影/quarantine） | cw 四套 + g1a + g1b + g1c |
| entity-identity.js / loader.js(05 过滤) | g1a + wl04 + p32 |
| minimal-sr.js | phase1-sr + wl04 + g1b |
| state-updater / state-evolution-engine / memory-unit | f06 + s6-1-timeline-events + s6-3-timeline-canon + l1-audit |
| attribution-wiring / causality/* | eo-p4 六套 + l1 三套 |
| compiler.js / prompt 相关 | test:prompt + test:writer-prompt + story-route + reality-golden |
| orchestrator.js | 全量 25 套 + 生产 batch |
**必须修复**：无阻塞性代码缺陷（当前阻塞全在流程层）；唯提交缺失是真实风险。
**可选改进**（标注为建议，勿擅自做）：orchestrator.js 体量偏大可拆（但高风险低收益）；scripts 测试断言风格不一；docs 与 AGENTS.md 的 Runtime 描述基本准确但未含 Gate 治理流程，可补。
**测试覆盖**：语义层覆盖优秀（25 套 ≈600 断言+生产 batch 验证链）；缺端到端 Studio UI 自动化、缺 CI（全靠本地手跑）。

## 10. 新 AI 执行指南

**先读（按序）**：①本文件；②`AGENTS.md`；③`docs/design/phase-4.4/gate1-human-seal-document.md`+`gate-2-finalization.md`（当前裁决前沿）；④`docs/design/phase-4/story-truth-root-cause-archaeology-01.md`（全景根因）；⑤`docs/design/phase-4/gate-2-qs1c-candidate-record.md`（Part 4=最新 Seal 文本）；⑥package.json scripts。
**稳定禁改**：§4 冻结清单全部；25 套绿测覆盖的模块。
**优先调查**：§7 三项；一切以「只读考古→报告→等令」节奏推进。
**改码前确认**：是否已有对应 Human Seal/EO 授权？scope 是否越界（Gate 清单 docs/design）？是否触碰 Actual/SR/T2/CW/L1/WCT 语义？
**每次修改必跑**（复制即用）：
```bash
npm run test:eo-<本模块专项>                      # ① 专项
# ② 25 套全量（§5.0 循环块原样执行；模块映射见 §9）
STRESS_BATCH=1 STRESS_WL01=1 STRESS_CW_SEED=1 STRESS_EXTRACTION=1 STRESS_WL03=1 STRESS_WL04=1 \
  node scripts/stress-story-route-run.js          # ③ DeepSeek 生产 batch（须 10/10、0 提取失败）
node scripts/stress-wl03-delta.js                 # ④ 文学指标对比（vs 前次 batch 基线）
```
⑤ 双扫描 Rescan 报告（FIRST REAL BLOCKER + FIRST UNRESOLVED SEMANTIC AUTHORITY GAP）。
**完成定义**：六环齐（实现+专项+全量+生产+文学+Rescan）→ 向女王报告 → **STOP 等令**。任何一环红=未完成，如实上报不得放行。

**与女王的沟通方式**：本项目一切语义裁决以对话中女王指令为准——新 AI 遇到歧义时的正确动作是**整理最小裁决问题并 STOP**，而不是选择一个「看起来合理」的方案；docs/design 内每份 Seal 文档的「Human Decision」栏就是这种交互的沉淀格式。

**缺失资料（需负责人回答，无法从仓库确定）**：
1. ~1060 行未提交变更的提交策略（分批粒度？先 docs 还是先代码？是否含 books/ 下的书数据？）。
2. Q-T1 + 九类时间证据类别表的裁决（材料已就绪，纯等待）。
3. DeepSeek 账户归属与充值政策；zhipu glm-4-flash 是否允许作正式生产 writer。
4. books/我的小说 下的书是真实创作数据还是测试数据（决定提交与迁移策略）。
5. Studio UI 是否有真实用户/交付要求（当前仅压测验证）。
6. golden/golden-causal 两套历史漂移基线是否允许更新（需授权重建）。
7. 除对话渠道外是否有其他裁决/审批通道。

---

*本报告事实均可追溯至：代码文件、package.json、git log、docs/design/ 文档族、25 套测试与多轮生产 batch 记录。不确定项已标注；无任何敏感值输出。*
