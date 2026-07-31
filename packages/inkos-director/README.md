# @inkos/director

**Director ≠ Planner**。Director 只负责规划，不拦截 Writer。

## 五层结构

| 层 | 职责 | 阶段 |
|----|------|------|
| **Story Director** | 书级 Hook / 冲突 / 基调 | plan |
| **Chapter Director** | 章目标 / POV / 节拍 | plan |
| **Scene Director** | Scene 写作指令 + Adaptive 反馈 | plan |
| **Scene Review** | 正文加权质量评分 | reviewed |
| **Chapter Review** | 章级 Review 汇总 | 章完成后 |

## Scene Review — 加权评分

六维各 0~100：

`Dialogue · Conflict · Hook · Emotion · Style · Pacing`

**Genre 自动权重**（来自 Story DNA / Writing Bible）：

| 类型 | 高权重维度 |
|------|-----------|
| 商业 | Conflict、Hook、Pacing |
| 文学 | Emotion、Style |
| 悬疑 | Hook、Pacing、Conflict |
| 言情 | Dialogue、Emotion |

输出：

```json
{
  "scores": { "dialogue": 80, "conflict": 90, ... },
  "weights": { "conflict": 0.25, "hook": 0.20, ... },
  "weightedScore": 85,
  "verdict": "pass",
  "suggestions": ["hook: ...", "dialogue: ..."]
}
```

**禁止**输出 `failures` 硬规则。

| weightedScore | 判定 |
|---------------|------|
| >= 80 | Pass |
| 70~79 | Warning |
| < 70 | Retry（Adaptive Hint，不阻塞 Scene） |

## 流程

```
plan: Story → Chapter → Scene Director → Writer（单次 Draft）
reviewed: Scene Review（不阻塞）→ Story Thread（不阻塞，shouldReplan=false）
章末: Chapter Review → Adaptive hints → 下次 plan
```

## Studio 非阻塞 Scene Gate

Studio Server 使用 `StudioRuntimeOrchestrator` + `runNonBlockingScenePipeline`：

- Brain Scene Pipeline 的 Decision/Consistency **重试循环**被绕过
- 正文质量检查 **仅** 在 `@inkos/director` Scene Review 阶段执行
- 彻底解决 Scene1 无限 Replan 循环

## 核心原则

- **禁止** Writer 生成过程中运行 Director 检测
- Review Retry → `hints.json` → 下次 Scene Director 参考
- **不阻塞** 当前 Scene / Pipeline

## 输出

```
novel/_system/studio/director/reviews/ch_XXXX/scene_XX/review_report.json
novel/_system/studio/director/reviews/ch_XXXX/chapter_review.json
novel/_system/studio/director/adaptive/ch_XXXX/hints.json
```
