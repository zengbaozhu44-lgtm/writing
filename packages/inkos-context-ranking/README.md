# @inkos/context-ranking

Context Ranking Engine — **Prompt Compiler 仅发送 TopK，禁止全量 Context**。

## 排序源（均计算 relevance score）

| 源 | Compiler 模块 |
|----|---------------|
| **Facts** | 相关事实 TopK |
| **Knowledge** | 信息差 TopK |
| **Resources** | 资源 TopK |
| **Relationships** | 关系 TopK |
| **Timeline** | 时间线 TopK |

## 评分

主排序键：**relevance**（Scene/Intent 关键词重叠）

辅助维度：importance · freshness · storyWeight · sceneWeight · budgetWeight

TopK 上限由 Dynamic Budget 各模块 Token 预算推导。

## API

```js
import { rankContextForCompiler } from '@inkos/context-ranking';

const ranked = rankContextForCompiler(ctx, scene, intent, { budget });
// ranked.bySource.facts.selected — TopK only
```

## 输出

```
novel/_system/studio/context-ranking/ch_XXXX/scene_XX/context_rank.json
```
