# WL-00 — Baseline Freeze

```text
DATE: 2026-09-20
SOURCE: Batch #1（10 chapters / 40 scenes / 41,459 prose chars / 真实 LLM Production）
STATUS: FROZEN — 后续 WL-01…WL-06 的对照组
```

## Runtime Baseline

| 指标 | 值 |
|---|---|
| Chapters produced | 10/10 PASS |
| Scenes produced | 40/40 with prose |
| Total prose chars | 41,459 |
| Chars per chapter | 3,652–4,456 |
| Zero-failure rate | 100%（一次网络瞬态后重跑全 PASS） |

## Story Truth Baseline

| 指标 | 值 |
|---|---|
| 林逸 T2 | 124（kind: action=65, movement=28, discovery=24, speech=6, presence=1） |
| 林逸 T2 life/social/emotion | **0/124** |
| 林逸 T3 | 1（authored_formation belief） |
| 林逸 SR awareness trajectory | ch1=16 → ch5=41 → ch8=60 → ch10=60 |
| 林逸 SR belief | 2（[W] + [T3]） |
| 苏眠 T2 / T3 | 0 / 0 |
| 镜渊 T2 / T3 / World block / SR | 0 / 0 / 无 / 无 |
| 老周 T2 / T3 / World block / SR / bible | 0 / 0 / 无 / 无 / 无 |
| L1 Evaluation | UNKNOWN（access_unknown_absence_not_negation） |
| AccessTruth | 0 PASS（prose 无 E1/E2/E4 构式捕获） |
| WCT asserted | 0 |
| CADE | 1 item（authored channel） |
| Goal/Choice/Dominance leakage | **0**（全量 JSON 扫描） |

## World / Time / State Baseline

| 指标 | 值 |
|---|---|
| 11_timeline day entries | 11（**10/11 day=null**） |
| story_day_zero | null（无 producer） |
| 08_current_state 任务 | — |
| 08_current_state 地点 | 未标注 |
| 08_current_state 时间 | 未标注 |
| Story Clock canonical | 未标注（空值+锁定约束） |
| 15_npc_simulation | `npcs: []`（**runNpcSimulation 全仓零调用**） |
| 05_relationship_graph | **文件不存在** |
| 07_state_board | **空模板**（`{势力 A}` 占位） |
| authored plan time 字段 | ch1–ch10 **全部未填** |
| authored plan scene 主语 | 40/40 以林逸为唯一主语 |

## Writer Context / Realization Baseline

| 指标 | 值 |
|---|---|
| Prompt 模块 | goal, conflict, prev_actual, SR, clock, chapter_goal, world_rules, char_cards |
| Prompt 不含 | NPC / 日常 / 时间事实 / 家庭 / 社交 / faction |
| Scene 密度分类 | P=25% / P+C=45% / P+W=15% / P+W+C=15% / **L=0%** |
| Motif「数到七」 | 12 次（prompt=6 / prose=14 含回声） |
| 感官「指节发白」 | 11 次 |
| 心理解释标记 | 26 次（ch7–10 占 54%） |
| ch9/ch10 功能重复 | 镜渊等候 4+4 场；母亲揭示 4+0 场 |
| 信息密度峰值 | ch10_s1 = 1,409 字（goal=29 字） |
| 长程连续性 | 镜渊 10/10 章；档案 9/10；苏眠 8/10；弟弟 4/10；认定书 4/10 |
| 章缝质量 | 10/10 无缝（位置/道具/情绪全延续） |

## Literary Delta Baseline（周期 #1–#6）

| Delta | 结果 |
|---|---|
| 数到七签名 | 从首创→自我解释→身份固化（T3 投影产生） |
| SR 微观观察 | 领口追踪片→布防意图→镜渊无影子（T3 递进） |
| 认知崩塌弧 | 母亲真相由 World 124 条 T2 累积支撑 |
| 苏眠对比 | 零 T2/T3 → 行为全由对话博弈驱动（厚度差异可感） |
| 认知塑造线文学价值 | **六周期连续确证** |

## Frozen Observations

以下作为后续对照的**冻结观察事实**：

1. T2 本质是 prose action log（生活/社交/情感 = 0/124）
2. 镜渊 7/10 INPUT ABSENT（无 World/T2/T3/SR/bible 深度）
3. 时间不存在于 Story Truth（day=null × 10/11，08_state 全空）
4. NPC simulation producer 存在但零调用
5. relationship_graph 不存在、state_board 空
6. authored plan 40/40 单主语纯 P、零 time、零生活场景
7. Writer Context 忠实传递已有信息（不是主要损耗点）
8. Writer 能用已有输入（P+C=45%），但源头只给了 Plot 骨架
9. 零 Truth Carrier Gap——全部为 CONTENT/PRODUCER/PIPELINE 层
10. Story Truth 基础设施（T2/T3/SR/Access/L1）运行正确且持续产出文学价值

```text
WL-00 COMPLETE — 冻结为后续所有 WL-01…WL-06 的对照基线
NO CODE CHANGED
```
