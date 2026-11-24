# Writer Literary Quality — Root Cause Archaeology Report

```text
MODE: READ-ONLY · ZERO CODE · ZERO SCHEMA · ZERO ENGINE
证据: Batch #1（10 章 40 场 41,459 字真实 LLM 生产 + 全部 sidecar/prompt 工件）
路径: Beat → Director/Presentation → Writer Context → Writer Prompt → Writer → Prose
     + Character World → Projection → SR → Writer
日期: 2026-09-20
```

## 1. Motif「数到七」重复来源

**OBSERVED**：12 次 prose / 6 次 prompt。

**PROVEN——来源链完整**：
```
Writer 在 ch1_s2 首创「他数到七才动」（无 prompt 源——prompt=0, prose=1, ch1 首场）
  → 同章后续场 prose 复现（Writer 自发维持人物一致性）
  → 续写锁「Previous（历史承接）」将该句尾文本注入 ch2+ prompt（ch2_s4 可见）
  → Writer 看见 → 继续 → 正反馈回路确立
```
**Root Cause = Writer 自发创建 + 续写锁回声放大**。非 Beat（beat=situation 标签零内容）；非 Director（runtime path 无 executionPlan.beats/directorBrief）；非 SR/World（authored seed 中无数到七）；是 **Writer realization 层的正反馈**。

**分层：Story Realization**。

## 2. 感官描写重复

**OBSERVED**：「指节发白/泛白」11 次（跨 8 章）；「掌心全是汗」3 次；「喉结动」3 次；「消毒水」2 次（ch8/ch9）；「铁锈味」2 次。

**PROVEN——高频来源为 Writer 风格习惯**：
- 「指节发白」——无任何 prompt/SR 源（authored seed 无此措辞）；系 DeepSeek-Writer 在高压场景的默认身体描写 fallback。prompt 中出现率 = 0（除经由续文锁间接回声）。
- 「消毒水」「铁锈味」有合法叙事依据（档案馆/医院/铁锈环境），低频 2 次可接受。
- **「指节发白」11 次是真实重复问题**——Writer 缺乏意象防复读机制的精确证据。

**分层：Story Realization**（Writer 风格层；Writer 已有 `usedImages` 防复读但仅限 Studio Beat 路径——runtime path 无此防护）。

## 3. 心理解释过量

**OBSERVED**：26 次心理标记（他想起/他意识到/他知道/他明白/他告诉自己等），集中在 ch7–ch10（4+4+0+6=14 次，占 54%）。

**PROVEN——来源为后期信息密度+Writer 解释本能**：
- ch1–ch5 平均 1.8 次/章 → ch7–ch10 平均 4.7 次/章——与剧情信息密度（真相揭示弧）正相关。
- Writer system 的禁词内心标记（`/他想起|他意识到|他觉得|他知道/`）仅产生 reviewScene **warning**（非阻断）——Writer 知道不该写但无硬性约束。
- **根因组合**：后期 Beat goal 本身要求大量内心反应（「林逸面对真相」「林逸在崩溃后」）+ Writer 在高信息密度场景倾向用内心标记压缩情感→信息转换。

**分层：Story Realization**（部分源于 Story Control——scene goal 措辞「面对真相」「崩溃后」预设了内心状态）。

## 4. ch9/ch10 Scene 功能重复

**OBSERVED**：ch9 四场中「镜渊等候」出现 4 场、「母亲真相揭示」4 场、「录音/文件」3 场、「实验室」2 场。ch10 中「镜渊等候」4 场、「录音/文件」4 场。

**PROVEN——来源为 authored Plan 本身的功能重复**：
```
authored plan（Story Control 层）：
  ch9_s1: 工牌过三道门 → 镜渊已在等候
  ch9_s2: 门后是实验室 → 镜渊说等你
  ch9_s3: 镜渊坐转椅等 → 她没有被害
  ch9_s4: 镜渊站六步外 → 她是负责人
  ch10_s1: 检查实验室 → 找到录音带
  ch10_s2: 通道深处 → 播放第二盘磁带
  ch10_s3: 听第二遍 → 磁带三秒空白
  ch10_s4: 管理员再现 → 最终对峙
```
同一「镜渊等候+揭示真相」功能在 ch9 被拆为 4 场重复执行（authored plan 直接写明了每场都含镜渊+真相同义反复）；ch10 的 s1/s2/s3 都是「找到录音/播放录音/再听录音」——**authored plan 的 scene goal 本身就在重复**。

**分层：Story Control**（authored plan 质量；非 Writer/非 Truth 缺陷）。

## 5. 信息密度问题归因

**OBSERVED**：ch10_s1 prose 1409 字（全 batch 最高）对应 goal 29 字；ch9_s1 仅 1 个 Actual Event 但 1163 字。

**归因结论**：
- **Beat 层**：runtime path scene.beat 仅为标签（situation/complication/turn/hook），**零内容**——不贡献信息密度。
- **Writer Context 层**：chapter_goal + scene_goal（~30 字）+ 前文 summary + SR 块 + Actual readback——信息密度主要来自 **前文累积的摘要与 SR**（ch10 的 SR 含 60 条 awareness + belief×2）。Writer 在 prompt 中看到大量背景 → 倾向在 prose 中塞入回应。
- **Writer Prompt 层**：无「本场只推进一件事」的密度约束；wordTarget=500 但 Writer 产出 700–1400 字。
- **Writer 层**：DeepSeek-Writer 在高上下文密度下倾向「全回应」——每个 SR/前文线索都想在 prose 中体现。

**分层：Story Realization + Story Control 混合**（Writer 无密度纪律 + prompt 无密度约束）。

## 6. 林逸主动性是否为真实文学问题

**OBSERVED**：全 10 章 scene goal 均以「承接上章推进：林逸…」开头——林逸是每场唯一主语。

**判断：SUSPECTED（非当前问题，但为未来趋势）**：
- Batch #1 中林逸的主动性由 authored plan（Story Control）合法驱动——每场 goal 指定他做什么。这是 authorial design，非系统伪造。
- SR/World 的影响体现在**怎么执行**（数到七/警觉/围观察能力）而非**要不要做**（由 Plan 决定）——**这正是当前两线分离设计的正确表现**（作者因果线控制方向，认知塑造线控制质感）。
- **潜在未来风险**：如果持续 20+ 章每场都以林逸为唯一主语，将变成结构性单调——但这需要更多批次才能判定是否为真实文学退化。

**分层：Story Control**（当前合法；长期观察项）。

## 7. 苏眠行动因果是否存在 Character Truth 缺口

**OBSERVED**：苏眠 World seed=1b/1k，T2=0，T3=0。prose 中主动句 7 / 反应句 1——但她在 ch4/ch7/ch10 有重大剧情行动（带回情报/承认全部/最后出现在通道）。

**判断：SUSPECTED——存在缺口但非当前 blocker**：
- 苏眠的行动因果目前由 **authored Plan + 前文摘要 + 续写锁** 合法承载（Story Control 层）——她的行为在 prose 中因果完整（每次行动都有对话/前文驱动）。
- **Character Truth 缺口**：她零 T2/T3——没有系统级的经历记录和稳定认识。这意味着她的行为因果**不在 Story Truth 中**，只在 Plan + prose 水位。**如果**未来需要苏眠有独立于 Plan 的行为动机（如她主动背叛/主动牺牲），当前无 Truth 支撑。
- **但这不构成当前 blocker**：Batch #1 中苏眠的功能是信息载体/关系张力对手——由 Plan 驱动是正确设计。缺口是**架构预留位空置**，不是功能故障。
- **T2=0 的直接原因**：LLM 提取器在本 batch 中未将苏眠提取为 occurrence actor（提取偏差——她在大多数场景中出现但非动作主语）。

**分层：Story Truth（预留位空置，非阻塞）+ 提取质量（T2 actor 归属偏差）**。

---

## Root Cause 汇总表

| # | 问题 | Root Cause | 分层 | 证据等级 |
|---|---|---|---|---|
| 1 | 数到七×12 | Writer 首创→续写锁回声→正反馈 | **Story Realization** | PROVEN |
| 2 | 指节发白×11 | Writer 风格 fallback；runtime path 无防复读 | **Story Realization** | PROVEN |
| 3 | 心理解释×26 | 后期 Beat goal 预设内心态 + Writer 解释本能 + 禁词仅 warning | **Realization + Control** | PROVEN |
| 4 | ch9/ch10 功能重复 | authored plan scene goal 本身重复 | **Story Control** | PROVEN |
| 5 | 信息密度（ch10_s1 1409 字） | SR 累积高密度 + Writer 全回应倾向 + 无密度约束 | **Realization + Control** | PROVEN |
| 6 | 林逸单主语 | authored plan 设计选择（当前合法） | **Story Control** | SUSPECTED |
| 7 | 苏眠零 Truth 因果 | authored plan 承载 + T2 actor 提取偏差 | **Truth 预留空置 + 提取** | SUSPECTED |

## 关键结论

**Batch #1 的文学质量问题全部位于 Story Realization 和 Story Control 层，零个位于 Story Truth 层**——即：Truth 基础设施（T2/T3/SR/Access/Eligibility/L1）运行正确且持续产出文学价值；问题出在 Writer 怎么用这些 Truth（realization 质量），以及 Plan 怎么设计场景（control 质量）。

> **下一步方向（仅记录不实现）**：
> - Realization 层：Writer 的意象防复读扩展到 runtime path / 内心标记从 warning 升级为可控约束 / 密度纪律
> - Control 层：authored plan 场景功能去重 / 多主语设计
> - 提取层：Phase 1.3 actor 归属精度（苏眠）
>
> 均为独立 Named EO 候选——不自动实现。
