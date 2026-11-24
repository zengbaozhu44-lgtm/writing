# Golden Causal Baseline — 新因果路径裁判（Phase 4 · D4）

冻结并回归：

```text
StoryTruth → Causal Reasoning → causal_chain → Writer Prompt
         （Runtime inkos-prompt 与 Studio runtime PromptCompiler）
```

**不是** legacy 生成骨架的替代品。双轨并行：

| 轨道 | 目录 | npm | 验证什么 |
|------|------|-----|----------|
| Legacy generation | `tests/golden-baseline/` | `npm run test:golden` | 旧 Runtime 章节骨架（executionPlan / gate / memory） |
| **Causal** | `tests/golden-causal-baseline/` | `npm run test:golden-causal` | 新因果架构稳定性 / 可追溯 / 可降级 |

两者**不要互相替代**。Authored 清洗在 `test:authored-input-sanitize` / `test:s5-raw-09-lore`；本轨道只锁因果链 → Writer 消费面指纹。

### Baseline rebuild 原因日志

| 何时 | 原因 |
|------|------|
| S3.1 | Planner 模板隔离 → intent/scene 指纹变 |
| S3.2 | Chapter truth ownership（yaml vs 09 event） |
| S3.3 | WorldPressure + `required_event` |
| **S5** | **Writer prompt 输入边界：删除 `currentChapterMd→chapter_task` 整卡；投影 `intent.mainGoal` 为 `本章目标`** |
| **S6.3** | **Writer timeline Canon eligibility：`collectTimeline` 仅放行 class=A；B/C/D 不进 prompt（不改磁盘 11）** |
| **S8.2-R3** | **因果 options 降级：删除 mock「正面推进/放弃」；choice=null 不渲染 Options/不得另选** |
| **S8.2-R3** | **因果 options 降级：删除 mock「正面推进/放弃」；choice=null 不渲染 Options/不得另选** |

S5/S6.3 负向锁：`npm run test:s5-raw-09-lore` · `npm run test:s6-3-timeline-canon`

## 命令

```bash
# 首次 / 有意改因果行为后：固化 baseline.json
node tests/golden-causal-baseline/baseline.js build

# CI / 日常：重跑 + 结构锁 + 与基线深比较
node tests/golden-causal-baseline/baseline.js verify

npm run test:golden-causal   # = verify
```

## 锁住的场景

| id | 书 / 章 | grade | 锁 |
|----|---------|-------|----|
| `rich-full` | 二手书店 ch1 | full | 完整链、`choice.reason`、`new_information.changes`、authored choice→consequence（options 仅 authored，禁止 mock）、零模板 |
| **S8.2-R3** | — | — | **无 authored choice 时 options=[]；choice=null 不渲染 Options/不得另选** |
| `partial-actor-non-pov` | 赛博 ch5 | partial | 已知因果保留、fear/关系/状态诚实降级、**actor≠POV** 世界角色注明 |
| `degraded-no-basis` | 赛博 ch17 | degraded | `no_causal_basis` 穿透双 Compiler、不发明 choice/consequence、因果块零模板 |

另锁：**确定性**（同 StoryTruth 两次推理一致）、**指纹**（链变 → Runtime `promptHash` + Studio prompt fingerprint 变）、**ensure 每章一次**。

## 捕获字段（baseline.json → artifacts[]）

- `storyTruthFingerprint` — 输入投影指纹（书被改先报漂移）
- `causalChain` / `causalChainHash` — 章级推理结果
- `causalBlock` — `renderCausalChain` 正文
- `runtime.promptFingerprint` / `promptHash` — inkos-prompt 消费面
- `studio.promptFingerprint` / `causalBlock` — 生产 Studio PromptCompiler 消费面
- `determinism` / `fingerprintDelta` / `ensure`

## 硬纪律（D4 不做）

- Authored 任务卡清洗
- Director 删除 / Beat 重设计 / 两套 Compiler 合并
- 修既有红灯 / 调 Writer 文案「更好看」

D4 只回答：新因果系统有没有一个可信的、确定性的裁判？
