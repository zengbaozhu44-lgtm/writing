# EO-FIX-RETRY-01 — Implementation Record

**Status**: CLOSED — AN-7 MITIGATED (production: ch10 completed) / FIX MECHANISM UNIT-VALIDATED-ONLY (Human Review Option B: await natural production hard-fail for E2E evidence)
**Date**: 2026-10-26 · **Authorization**: EO-FIX-RETRY-01 ONLY（其余三个 A 类 EO 与六项 C 类未授权）

## 1. 根因（已接受，不扩大）

重规划只到 scene 层（goal/conflict 重建），不改 intent 层约束→连续重规划可能继续生成同族开场→耗尽 MAX=2 次→章级失败（E2E ch10 三次全败实证）。

## 2. 修改文件与函数

**仅一个文件**：`packages/inkos-studio-server/src/studio-orchestrator.js`

| 变更 | 位置 | 内容 |
|---|---|---|
| **新增 `extractRepeatPhrases()`** | :38-44 | 从硬失败错误消息提取「…」内被判定为复读的短语（2-24 字、须含 复读/重复/相似 关键词）；纯函数零副作用 |
| **重试传递** | :296-298（_runScenesAndChapter 的 SCENE_HARD_FAIL catch 内） | `_hardFailForbiddenPhrases: [...(options 既有), ...extractRepeatPhrases(msg)]` ——累积式（前次短语保留） |
| **注入 intent** | :140-155（_runScenesAndChapter 方法头） | `intent.forbiddenOpenings = [...new Set([...existing, ...phrases])]`——合并保留既有（Set 去重）；同步到未完成 scene 的 `forbiddenOpenings`（首 ≤4 条） |

## 3. 数据流（修改前后）

```
Before:
  Scene 硬失败 → buildHardFailCorrection(err) → 修正指令文本
    → 仅附加到失败场景的 prompt（:209-211 scene.prompt += correction）
    → 重规划 _replanFromScene → planChapter 重建 intent
    → forbiddenOpenings 从 priorAnchor.narrative_momentum 派生（planner:555）
    → 硬门判定短语丢失 → Writer 看不到禁令 → 可能再次复读 → 死循环

After:
  Scene 硬失败 → buildHardFailCorrection(err) → 修正指令文本（不变）
    + extractRepeatPhrases(err.message) → 短语数组（新增）
    → options._hardFailForbiddenPhrases 累积传递（新增）
    → 重规划 → planChapter 重建 intent
    → _runScenesAndChapter 头部：短语合并入 intent.forbiddenOpenings（新增）
    → beat-execution:92-95 formatSceneOpeningConstraintBlock 消费
      → 每 scene 首 beat prompt 含「禁：{短语}」
    → Writer 看到具体禁令 → 不再仅因相同开场触发同一失败
```

## 4. 定向测试（18/18 全过）

| # | 验证 | 结果 |
|---|---|---|
| T1 | 首次复读短语提取+进入 intent.forbiddenOpenings | ✓ |
| T2 | 累积：第二次后之前保留+新追加 | ✓（两条均在） |
| T3 | 原始 intent mainGoal/pov/obstacles 不变+旧禁令保留 | ✓ |
| T4 | 非复读错误/空消息/无 options → 零添加 | ✓ |
| T5 | 新任务无该字段→不含历史短语；buildHardFailCorrection 纯函数 | ✓ |
| T6 | MAX_SCENE_HARD_FAIL_REPLAN=2 不变 | ✓ |
| T7 | findOpeningPhraseRecycle 硬门仍拦真复读（hardRun=true）+不误杀干净文本 | ✓ |
| T8 | formatSceneOpeningConstraintBlock 将禁令写入 Writer prompt（scene 级+intent 级兜底） | ✓ |

## 5. 全量回归

27 套全绿（含 reality-golden OK、story-route ALL PASS）。**本轮改动文件=studio-orchestrator.js 一个**；其余 26 套证明零副作用。

## 6. 任务隔离与状态污染

- `_hardFailForbiddenPhrases` 仅存于函数参数 `options` 对象——不写盘、不持久化、不入锚/manifest/任何载体
- 新章/新任务调用不传该字段→intent 不含历史短语（T5 实证）
- `buildHardFailCorrection` 维持纯函数（无全局可变状态）

## 7. 已知限制

1. 单元测试证明了数据流（短语提取→累积→注入→Writer 到达）但**未启动 LLM E2E**——真实生成端是否因此改变行为（「不再仅因相同开场触发同一失败」）需后续生产验证（本 EO 授权范围不含完整 E2E）
2. `extractRepeatPhrases` 从错误消息的「…」中提取——依赖 `fmtRepeatHit` 的引号包裹格式（beat-execution:474-484）；若硬门错误格式变化需同步
3. intent.forbiddenOpenings 的 `slice(0,2)` 消费上限（beat-execution:96）意味着最多 2 条禁令到达每个 beat 的 prompt——多条短语时优先级由数组顺序隐式决定
4. `_hardFailCorrection` 的原路径（:209-211 单 scene prompt 附加）**保留不动**——本修复是增量（补 intent 层），非替代

## 8. 工作区状态

本轮新增改动（vs. 上轮 Production Breakpoint Audit 后）：
- 修改：`packages/inkos-studio-server/src/studio-orchestrator.js`（+3 处变更）
- 新增：`scripts/test-eo-fix-retry-01.js` + package.json script 注册
- **其余全部为既有差异**（~1060 行 uncommitted，含之前所有 EO 成果）

## 9. Rescan

- **FIRST REAL BLOCKER**: AN-7 复读死锁的**代码层修复已完成**——但需 LLM E2E 验证后方可宣告关闭。下一个 FIRST REAL BLOCKER 候选：**AN-1 世界漂移**（最重文学影响，但依赖 Q-UC-1 C 类裁决）或 AN-2 序列化损坏（A 类 EO-FIX-SERIALIZE-01 已就绪待令）。
- **FIRST UNRESOLVED SEMANTIC AUTHORITY GAP**: 不变——Q-UC-1~6 六项 C 类裁决。

> **IMPLEMENTED / VALIDATED (unit) — STOP**
