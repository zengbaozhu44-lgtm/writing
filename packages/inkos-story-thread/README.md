# @inkos/story-thread

Story Thread Engine — 主线控制（PR4）

## 四条线程

| 线程 | 说明 |
|------|------|
| **Main** | 主线目标 / Story DNA / 章节意图 |
| **Sub** | 支线（上限 **20%**） |
| **World** | 世界观 / 设定 exposition |
| **Character** | 人物内心 / 关系 / 成长 |

## 每 Scene 结束

1. 分析各线程占比与 `mainProgress`
2. 支线 > 20% → 记录 failure
3. 连续 **2** 个 Scene `mainProgress` **< 5%** → **`shouldReplan: true`**

## 输出

```
novel/_system/studio/story-thread/ch_XXXX/scene_XX/story_progress.json
novel/_system/studio/story-thread/state.json
```

## 接入

通过 Studio `sceneLifecycleHook` 的 `reviewed` 阶段；Runtime 仅在 hook 返回 `shouldReplan` 时调用既有 `replan()`。
