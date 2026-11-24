# E2E-LONGFORM-01 — Root Cause Archaeology · Phase 1
## Studio Living Story Context Integrity（E2E-1 / E2E-7）

**Mode**: READ-ONLY · **Date**: 2026-10-26 · **Scope**: 为何 ch1 部分忠实、ch2+ 整体漂移
**证据分级**：〔观测〕= 持久化产物实测；〔代码〕= 源码推导（CODE-DERIVED）；〔假设〕= 未证

---

## A. Production Data Flow Map（代码级实际管线）

```
向导建书（POST /api/books → book-wizard.js）
 ├ initBookV4（空模板）+ generateWizardContent（LLM 生成 world/writing/characters）
 │   └ serializeWorldMd(ai-serializers.js:3-18)：字段直接模板插值 ← 〔A 断点〕
 ├ scaffoldStoryMap（story-map/store.js:51）→ pov-grid.yaml + milestones.yaml
 │   └ primaryPov = names[0]（book-wizard.js:119，LLM 生成顺序第一名）← 〔E 断点〕
 └ story_dna 若未传 → 全 null 模板（实测本书全空）

生产运行（run-living → living-task → controlRun → getDaemon → StudioRuntimeOrchestrator）
 └ orchestrator._runChapter
    ├ loadAuthoredChapterPlan（无 → 派生 planChapter）
    │   ├ pov = priorAnchor?.pov || ctx.pov（planner.js:137）← 〔E 传播〕
    │   ├ mainGoal ← 卷纲首段（仅 ch1）或 story-map 里程碑句（ch2+）← 〔D 断点〕
    │   └ applyStoryMapToIntent（story-map.js:270-282）——POV/目标只填空不覆盖
    ├ prepareChapterRun（living-novel-engine.js:71）→ 09 回写 + povSync
    │   └ normalizeBrainContextForRun（brain-context-sync.js:260）→ resolveEffectiveChapterPov
    │       ├ 优先链：plan.goal 提名 → plan.pov → 09 POV → protagonist 兜底
    │       └ syncPlanPovForRun(:222)：把解析结果回写 plan.intent.pov ← 〔E 自锁〕
    └ 逐 scene：studioLlmWriter（studio-llm-writer.js:182）
        ├ compileScenePrompt(ctx,scene) → basePrompt（世界/Clock/IB/SR 全在内）
        ├ compileStudioWriterPrompt（compile-writer-prompt.js:53）→ optimizedPrompt
        └ executeBeatSequence（beat-execution.js）
            └ compileSingleBeatPrompt → compileSlimBeatUserPrompt（beat-slimmer.js:635）
                └ slimLoreForBeat(:361)：从 basePrompt 按 keys 命中裁 ≤220 字 ← 〔B 断点〕
                    keys = beat.label/content/libraryBeat + intent.pov + beat.characters + intent.characters
```

## B. Source-to-Writer Traceability Matrix

| Authored 源 | 进 basePrompt？ | 进 beat 实际 LLM 请求？ | 形态/证据 |
|---|---|---|---|
| 01_world_bible（损坏：8 段 [object Object]） | 是（compiler.js:660-674，362 字=仅 era 段有效+损坏段标题） | **几乎永不**——slimLore keys=角色名/POV（周砚），世界段正文=[object Object]/或不含角色名 → 永不命中；兜底行也不选世界 | 〔代码〕beat-slimmer.js:364-397 |
| 10_volume_outline 首段（雾桥+三线索全文） | **否**——volumeGoals 在 intent.plan（ch1/2/3 实测都在）但 compileScenePrompt 的 ranked sources 无 volumeGoals 通道；仅 ch1 经 mainGoal 转写进入 | 否（除 ch1 mainGoal 间接） | 〔观测〕plan json 三章 volumeGoals 全含雾桥全文；〔代码〕collect.js 源清单无 volume |
| pov-grid.yaml（沈昭/顾满仓正确轮换！） | 否（story-map 数据进 intent.storyMap → writer 侧「作者笔记」段，budget 内） | 部分（作者笔记 ≤BEAT_MAP_MAX_LINES） | 〔观测〕grid 内容正确；〔代码〕beat-slimmer.js:340-358 |
| milestones.yaml（都市异能量纲） | 经 buildChapterGoalFromMap → ch2+ mainGoal → 进 prompt | **是——成为最高优先叙事指令** | 〔观测〕ch2/3/9 mainGoal 实测 |
| 03_character_bible（5 人） | 是（entities TopK） | 是（keys 命中）——但 entities=[周砚]（scene.json 实测）→ 只有周砚段入选 | 〔观测〕scenes entities |
| 章锚（priorAnchor） | 是 | 是（pov/location 继承） | 〔观测〕锚 pov:周砚 ×9 |

## C. Chapter Differential（ch1 vs ch2 vs ch3 vs ch9）

| 维度 | ch1 | ch2 | ch3 | ch9 |
|---|---|---|---|---|
| mainGoal | **卷纲首段全文**（authored 唯一一次进入） | story-map 里程碑铺垫句 | 里程碑句 m2 | story-map 收束句 |
| volumeGoals 含三线索 | ✓ | ✓（在 plan 里但无 prompt 通道） | ✓ 同左 | ✓ 同左 |
| intent.pov | 周砚 | 周砚 | 周砚 | 周砚 |
| grid 指定 POV | 沈昭 | 顾满仓 | 沈昭 | （未落盘=NOT OBSERVED） |
| 正文与设定一致 | 部分（理赔/沈昭/顾满仓在场） | **完全漂移**（B2/闸门/终端） | 漂移延续 | 漂移延续 |
| 上章锚继承 | 无（首章） | pov 周砚+「疑虑·未解之问」情绪 | 同 | 同 |

**差分结论**：ch1 忠实的唯一原因=mainGoal 意外携带了卷纲全文（planner 从 volume goal 首段取材），使 beat keys 含「沈昭/顾满仓/陈小帆」→ slimLore 命中角色段。ch2 起 mainGoal 被里程碑句替换 → keys 只剩 周砚 → 世界/其余四人从此在 220 字 lore 窗内**零出现**。

## D. Root Cause Register

| ID | 症状 | 代码证据 | 根因判定 | 置信 | 证伪测试 |
|---|---|---|---|---|---|
| RC-1 | 世界观 ch2+ 整体漂移 | beat-slimmer.js:361-397 + BEAT_LORE_MAX_CHARS=220 | **世界事实在 Beat 通道结构性不可达**：keys-based 220 字裁剪使世界段（不含角色名）永不入 prompt——即使 bible 完好也漂移（ch1 证明唯一可达路径是 mainGoal 携带） | 高（代码+九章正文双重证） | 构造无损坏 bible 的书跑 2 章：若仍漂移→确证结构性 |
| RC-2 | 8×[object Object] bible | ai-service.js:208 LLM 返回 JSON 数组/对象；ai-serializers.js:8-16 直接 `${f.history}` 插值无类型守卫 | **序列化缺陷**（向导层），放大 RC-1（有效世界信息仅剩「现代都市」4 字） | 高 | 用 string 字段重建 bible 验证渲染 |
| RC-3 | POV 十章锁死周砚 | 三环：①wizard:119 names[0] ②planner:137 锚优先 ③brain-context-sync:222 回写自锁 | **锚形自锁**：首锚 pov=周砚（由 resolveEffectiveChapterPov 兜底 protagonist=names[0] 周砚——canon-analyzer:53 找「重要度」**数字**字段而向导写的是文字「主角」→全部 0 分→取首名）后，planner 锚优先+grid 只填空不覆盖+sync 回写三机制互锁 | 高（全链代码+产物） | 改 grid ch2 为强制或清锚 → 验证 pov 变化 |
| RC-4 | POV 警告判错对象且无效力 | story-map.js warning 逻辑读 grid（沈昭）而实际 pov 来自锚（周砚） | 警告=纯 console 无消费方、且数据源与实际 POV 不同源 | 高 | 代码审（无 enforcement 消费） |
| RC-5 | 三线索（钢筋/卷宗/笔迹）零落地 | plan json：volumeGoals 全程携带但 compiler collect 源无 volume 通道；mainGoal ch2+ 被里程碑替换 | **卷纲→章执行无约束通道**：volumeGoals 是死数据；story-map 里程碑（异能量纲）反而成为唯一活的章级指令源 | 高 | collect.js 源清单+ch2 mainGoal 实测 |
| RC-6 | 阵容塌缩（四人消失） | scene.entities=[周砚]（planner:359 present=[pov]） | **POV 与出场耦合**：present 只装 POV → keys 无他人 → prompt 无他人 → Writer 只写周砚世界（恶性循环） | 高 | planner:360 代码+scenes 实测 |

## E. Earliest Breakpoint

> **最早断点=向导建书时（一次性注入的三处初始化缺陷叠加）**：
> ① serializeWorldMd 类型缺陷（bible 出生即残）；② scaffoldStoryMap 的 primaryPov=names[0]=周砚（主角标记解析失败）；③ story-map 里程碑含「核心能力」异能量纲而无卷纲通道。
> **生产链第一个放大点=ch2 planChapter**：mainGoal 从卷纲段切换为里程碑句（ch1 的偶然忠诚终结）；**结构性不可达**由 beat-slimmer 220 字 keys 裁剪保证——即使上游全部修复，世界事实仍到不了 Beat prompt。

## F. Design Gate Recommendation

| 发现 | 分类 |
|---|---|
| RC-1 世界段在 Beat 通道结构性不可达 | **Semantic/Pipeline Gap（混合）**——需裁决「世界事实以何种权威/预算进入 Beat」→ **Design Gate + Human Adjudication** |
| RC-5 卷纲→章执行无约束通道 | **Missing production integration**（volumeGoals 已载入却无消费者）→ Design Gate |
| RC-3/RC-6 POV 锚形自锁+POV/出场耦合 | **Implementation defect + 语义混合**（「grid 只填空」是有意的 author-respect 设计 vs 锚无限优先是缺陷）→ 部分可直接 EO（解析缺陷+耦合），部分需裁决优先序 → **Design Gate** |
| RC-2 序列化缺陷 | **Data initialization defect**（纯实现）→ 可直接 Named EO |
| RC-4 警告无效力 | Implementation defect（低优先） |
| Studio vs Runtime 双链分歧（CW/brain 双轨） | Architecture divergence（E2E 报告已列）→ Human Adjudication |

**未证事项（保留假设）**：① writer 侧「作者笔记」段在预算内是否真渲染（未持久化 beat prompt 全文→NOT OBSERVED）；② scene-mode（非 beat）分支的世界注入未测（本书全部走 beat 路径）；③ 里程碑 yaml 由 scaffold 生成时为何含异能量纲（scaffold 模板 vs LLM——未溯源）。

> **READ-ONLY ARCHAEOLOGY COMPLETE** —— 零代码/数据/配置/章节改动；全部结论附文件:行号或产物路径。
