# E2E-LONGFORM-01 — Production Breakpoint & Repairability Audit

**Mode**: READ-ONLY PRODUCTION ARCHAEOLOGY · **Date**: 2026-10-26
**Status**: `PRODUCTION BREAKPOINT ARCHAEOLOGY COMPLETE — REPAIRABILITY CLASSIFIED — NO IMPLEMENTATION AUTHORIZED — STOP`
**Zero changes**: 本轮仅 grep/sed/cat/node 只读/ls。零代码/零数据/零配置/零测试/零 E2E/零 EO/零 Seal。

---

## 1. 执行声明与范围

以唯一生产路径（Studio Living/Run→StudioRuntimeOrchestrator→createStudioLlmWriter→Beat Execution→F8.3→RF-01→Validation）为唯一事实源。A~C 域大量结论继承自已完成的统一契约考古三份文档（context-integrity / unified-contract-archaeology / design V2.2）——本报告只做**断点定位与可修复性分级**，不重复全文考古。

## 2. E2E 原始异常清单

| # | 异常 | 域 |
|---|------|----|
| AN-1 | 世界观 ch2+ 整体漂移（雾桥→B2 设施） | A |
| AN-2 | `[object Object]` ×8 世界 bible | A |
| AN-3 | POV 十章锁死周砚 / POV warning 判错对象 | B |
| AN-4 | 卷纲三线索零落地 | C |
| AN-5 | Timeline day:0 ×10 + 角色字符串污染 | D |
| AN-6 | CW/T2/l1_access 零产出 / character_brains 与 CW 关系未知 | E |
| AN-7 | ch10 三次复读硬门死锁 / ch1 一次同族 | F |

## 3. 六域断点证据链

### A. 世界设定 → Writer

| 项 | 结论 |
|---|------|
| 已观察事实 | ch1 部分忠实（沈昭/顾满仓/理赔在场）；ch2+ 雾桥=0/断桥=0/B2 设施词高频 |
| 首个断点 | **双层**：①初始化层 `serializeWorldMd`（ai-serializers.js:3-18）直接模板插值 LLM 返回的对象→损坏；②Beat 层 `slimLoreForBeat`（beat-slimmer.js:361-399）keys 命中裁 220 字——世界段不含 keys（角色名/POV）→**结构性不可达**（即使 bible 完好也到不了 Writer） |
| 代码证据 | RC-2/RC-1 全链（V1 考古 §3-7 已证） |
| 运行证据 | E2E 正文关键词矩阵（雾桥=0 等）+ bible 原文 8×[object Object] |
| 根因 | **已证实**（代码+产物双证） |
| 契约依据 | 序列化损坏=实现缺陷（无冻结契约被违反——**bible 无 Admission 门**）；Beat 不可达=**无契约**（Required/Optional 分类不存在——V2.2 §5 提案待裁） |

### B. POV / Presence

| 项 | 结论 |
|---|------|
| 首个断点 | **初始化层**——`resolveProtagonistName`（canon-analyzer.js:53,62）按「重要度数字≥90」判主角，向导写文字「主角」→全零分→数组首名=周砚；**传播层**——planner:137 锚无限优先+grid 只填空+sync 回写三机制自锁 |
| 根因 | 已证实（V1 考古 RC-3 全链） |
| 契约依据 | 数组首名兜底=实现缺陷（无契约支持）；grid 优先序=**V2.2 §7 PD 待裁（Q-UC-3）** |

### C. 卷纲 → Beat

| 项 | 结论 |
|---|------|
| 首个断点 | `loadVolumeGoal`→`intent.volumeGoals`（plan json 全程携带）→**`collect.js` ranking 源清单无 volume**——零消费者；ch2+ mainGoal 被 story-map 里程碑替换（V1 RC-5） |
| 根因 | 已证实 |
| 契约依据 | volumeGoals 消费形式=**V2.2 §6 T-1 PD 待裁（Q-UC-2）**——现有冻结契约无「卷纲必须被消费」条款 |

### D. Timeline

| 项 | 结论 |
|---|------|
| 首个断点 | ①day:0=`resolveWorldEventDay` 对无 authored day/time 的书全部返回 `day: null`→buildStateDelta 写 `day: 0`（time-semantics.js:58-110——宁缺设计=**已冻结**）；②角色字符串=确定性提取器 SPEECH_RE/ACTION_RE 捕获语法主语「他」「林异」（ch_0001 实测 actors=["他"]）→ `formatTimelineCandidate` 前缀 `${actors}：${action}` 直接入 timeline——**Studio 链无 G1-A resolve 前置**（G1-A resolver 在 loader 05 过滤层共享，但 timeline 写入不经该层） |
| 根因 | day:0=设计行为（Gate 2 B′ unknown 合法）；角色污染=Studio timeline 写入路径绕过 G1-A——**较强推断**（代码路径确认：state-evolution-engine:186 `actors.slice(0,3).join('/')` 无 resolve） |
| 契约依据 | day:0 合法〔FC EO-P2 宁缺〕；角色污染违反 G1-A「UNRESOLVED 不物化」——**但 G1-A Seal 范围是 T2/CW/Attribution，timeline 未明列**→契约适用性待裁 |

### E. Actual / CW / character_brains 双链

| 项 | 结论 |
|---|------|
| CW 零产出 | seed 不存在→sync 条件跳过（代码路径存在）；E2E 实际命中 UNKNOWN（日志无 [runtime] CW sync 行——但无成功行≠未调用；V2.2 Err-R2-B 四情形） |
| character_brains 读写链 | **本轮已补齐**（Q-UC-5 前置）：**写入**=living-novel-engine:100（applyLivingPrepareToRuntime 回写上一章 proposal）+:251（evolveCharacterBrains——读 brain→LLM 推理→writeCharacterBrain persist）；**读取**=living-novel-engine:361（getLivingNovelStatus 展示）+story-context-provider:61（buildNovelIntelligenceContext→`characterStates[name]=brain.current_state`）；**消费去向**=syncContextToCanon→09 任务卡注入（「Intelligence Context Injected」标记=09 原文实证）→ planner ctx（09→parseChapterTask）——**进规划层，不直接进 Writer prompt**；E2E 书 brains mtime=10-22 16:53（建书时刻，**运行时零更新**——evolveCharacterBrains 的调用时机/条件待查） |
| 根因 | CW=条件性未激活（seed 供给义务 UNK）；brains 消费链=**已证实进 09/规划层，未进 Writer prompt**（与 CW 无数据交互=代码层零调用） |
| 契约依据 | 双链关系=Q-UC-5（**HA——现已有前置考古事实基础**） |

### F. 复读硬门 / 重试

| 项 | 结论 |
|---|------|
| 判定逻辑 | `findOpeningPhraseRecycle`（beat-continuity.js:1072-1097）：开场句与 base 的 LCS≥7 字=hardRun 硬失败；跨 Scene 复读=chapterTextSoFar 为 base 同法；幕内=accumulatedText 剔除续写锚窗后为 base（beat-execution.js:466-508） |
| 重试机制 | SCENE_HARD_FAIL→orchestrator:235-266→保留已完成场景正文（keptScenes）→`_replanFromScene` 重跑 planChapter→**scene 计划重建**（新 goal/conflict）→MAX=2 次重规划（:23）→第 3 次失败→章级 fail。**关键**：重规划重建的是 scene 层（goal/conflict/beat plan），**不改 intent.mainGoal/pov**——生成上下文的核心约束不变 |
| ch10 三次失败 | 尝试 1：S3/4 跨 Scene「周砚把屏幕掰回来…」9 字；尝试 2：S3/4 跨 Scene 同句；尝试 3：S2/4 幕内「数着，一步、两步，拐角处…」24 字——**同一根因强推断**：Writer 在该章的叙事状态（intent/beat 上下文）持续诱导相同开场句型，重规划换了 scene goal 但 intent 层（mainGoal=story-map 收束句「收束代价与余韵，兑现伏笔」——极抽象）无差异化引导 |
| 根因 | **生成端持续重复+重试策略无法改变生成结果**——硬门正确拦截（不放过坏稿✓），但重试不改上游约束=死循环；分类为「重试策略无法改变生成结果」 |
| 契约依据 | 硬门本身=**正确执行**（设计意图=拦「悬在确认键上方×17」级复读——注释原文）；死锁=**重试策略缺陷**（重规划只到 scene 层，未触及 intent/beat 层的复读诱因）——无冻结契约覆盖「重试必须改变上游约束」→**新需求** |

## 4. 可修复性分级总表

| 问题 | 断点 | 分级 | 理由 |
|---|---|---|---|
| AN-2 [object Object] | serializeWorldMd 无类型守卫 | **A** | 纯实现缺陷；修复=序列化前 string/array 归一（不新语义不改架构）；回归=向导重建书验证 bible 渲染 |
| AN-7 复读死锁 | 重规划只到 scene 层，intent 层复读诱因不变 | **A** | 实现缺陷（重试策略不变上游约束）；修复最小向=重规划时将已判复读的短语注入 intent 层 forbiddenOpenings（机制已存在——scene.forbiddenOpenings 字段在 V2.2 §7.5 已引用）或降级 DEGRADE+人工审核；回归=ch10 复跑 |
| AN-3(部分) 数组首名兜底 | resolveProtagonistName 全零分→names[0] | **A** | 实现缺陷（EO-48 已禁 placeholder POV——数组首名=变相 placeholder）；修复=解析失败→上呈/POV_UNRESOLVED；回归=重建书验证 POV |
| AN-5(部分) timeline 角色污染 | timeline 写入无 G1-A resolve | **A** | state-evolution-engine:186 actors 直拼——G1-A resolver 已在库中，加一行 resolve 即可（不改语义，扩展 G1-A Seal 适用范围到 timeline=**需确认**——严格来说这可能需 C） |
| AN-1 世界漂移 | Beat 层结构性不可达 | **C** | Required/Optional 分类不存在——V2.2 §5 是 PD 非 FC；需 Q-UC-1 裁决 |
| AN-3(部分) POV 优先序 | grid vs 锚 vs 09 | **C** | Q-UC-3 |
| AN-4 三线索零落地 | volumeGoals 死数据 | **C** | Q-UC-2 |
| AN-5(部分) day:0 | 无 authored day/time | **C** | day 前进=Q-S3（Gate 2 已列） |
| AN-6 CW 零产出 | seed 供给义务 | **C** | Q-UC-5（现已有前置考古事实） |
| AN-6(部分) brains 双链 | brains 进规划不进 Writer | **C** | Q-UC-5（架构裁决） |

## 5. A 类 Named EO 候选清单

| EO 名 | Scope | 修改文件 | 回归 |
|---|---|---|---|
| **EO-FIX-SERIALIZE-01** | serializeWorldMd/serializeWritingMd 增加类型归一（object→JSON.stringify / array→join；string 不变） | ai-serializers.js | 重建 E2E 书 bible 验证渲染 + 全量 26 套 |
| **EO-FIX-RETRY-01** | scene 硬失败重规划时，将复读短语注入 intent.forbiddenOpenings（或 chapter 级），使重试改变生成约束 | studio-orchestrator.js | ch10 复跑×3 验证不再死锁 + 硬门仍正确拦截人为注入复读 |
| **EO-FIX-PROTAGONIST-01** | resolveProtagonistName 全零分时返回 null（不取 names[0]）；resolveEffectiveChapterPov 兜底改为 POV_UNRESOLVED+上呈 | canon-analyzer.js / brain-context-sync.js | 重建书+ch1 跑通验证 POV 非数组首名 |
| **EO-FIX-TL-ACTORS-01** | formatTimelineCandidate 的 actors 经 resolveCharacter 过滤（G1-A 已有） | state-evolution-engine.js | F-06 套件+timeline 手动检查无伪角色 |

**注意**：A 类 ≠ 已获授权。每个 EO 须女王下令后才可实施。EO-FIX-TL-ACTORS-01 的 G1-A Seal 适用范围扩展可能需女王一句话确认。

## 6. B 类（继续考古）

无——六域断点均已定位（A/C 分级覆盖全部），无需更多考古。

## 7. C 类（Human Adjudication）

Q-UC-1（世界进 Beat 语义保障）/ Q-UC-2（volumeGoals）/ Q-UC-3（POV 优先序）/ Q-UC-5（双链——**前置考古已完成**：character_brains 读写链已补齐，可进入裁决）/ Q-S3（day 前进）/ 违规响应分级（Q-UC-1 附带）。

## 8. 依赖关系

```
EO-FIX-SERIALIZE-01（bible 修复）──独立──┐
EO-FIX-PROTAGONIST-01（POV 兜底）──独立──┼──→ Q-UC-3 裁决后 → 完整 POV 修复
EO-FIX-RETRY-01（重试约束）────独立──────┤
EO-FIX-TL-ACTORS-01（timeline 过滤）─独立─┘
Q-UC-1（世界进 Beat）───依赖 bible 修复──→ 世界漂移完整修复
Q-UC-2（volumeGoals）───独立──────────→ 三线索落地
Q-UC-5（双链）─────────前置已备───────→ CW/brains 统一
```

**四个 A 类 EO 全部互相独立且不依赖任何 C 类裁决**——可先行实施。

## 9. FIRST REAL BLOCKER

> **推荐 FIRST REAL BLOCKER = 复读硬门死锁（AN-7）**。
>
> 理由：①它是唯一在 E2E 中**实际阻塞章节完成**的缺陷（ch10 三次全败=10% 章节不可产出）；②修复不触任何语义（重试策略纯实现层）；③与其他问题零依赖；④不修复它，后续任何改进的世界观/POV 修复效果都无法通过完整 10 章验证。
>
> 争议说明：AN-1 世界漂移从文学角度更严重（90% 章节内容偏离作者意图），但其修复依赖 Q-UC-1 裁决（C 类），不是当前可执行的阻塞点。FIRST REAL BLOCKER 按「生产链可执行性」排序——死锁使生产链物理中断，漂移是语义偏离但生产继续。

## 10. 最小修复顺序建议

```
第 1 批（A 类，互相独立，可并行）:
  ① EO-FIX-RETRY-01（解死锁=恢复 10/10 产出能力）
  ② EO-FIX-SERIALIZE-01（bible 渲染正确）
  ③ EO-FIX-PROTAGONIST-01（POV 不再数组默认）
  ④ EO-FIX-TL-ACTORS-01（timeline 角色净化）
第 2 批（C 类裁决后）:
  ⑤ Q-UC-1+Q-UC-2+Q-UC-3 → 世界/卷纲/POV 修复 EO
  ⑥ Q-UC-5 → CW/brains 统一
```

## 11. 未能证明的内容与剩余 UNKNOWN

①CW E2E 实际命中跳过分支（UNKNOWN——需加观测）；②evolveCharacterBrains 运行时调用时机（E2E 书 brains mtime 未变=零更新，但调用条件未查明——B 类遗留但不影响分级）；③beat prompt 完整内容（未持久化——Q-UC-6 裁决后可观测）；④G1-A Seal 对 timeline 写入的适用范围（EO-FIX-TL-ACTORS-01 实施前需女王确认一句话）；⑤L4 语义满足验证能力（V2.2 已声明不具备）。

---

> **PRODUCTION BREAKPOINT ARCHAEOLOGY COMPLETE — REPAIRABILITY CLASSIFIED — NO IMPLEMENTATION AUTHORIZED — STOP**
