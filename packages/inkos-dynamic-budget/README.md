# @inkos/dynamic-budget

Dynamic Budget Allocator（PR6）— **禁止固定 Tier Budget**。

## 总预算

**2500 Tokens**（`TOTAL_BUDGET_TOKENS`）

## 八模块动态分配

| 模块 | Compiler 用途 |
|------|---------------|
| **Goal** | Scene 目标、章任务 |
| **Conflict** | Scene 冲突、局势 |
| **Character** | 出场人物卡 |
| **World** | 世界观、势力、写作规则 |
| **Facts** | 事实、资源变化 |
| **History** | 前序 Scene、状态/差量 |
| **Relationship** | 关系图 |
| **Knowledge** | 信息差矩阵 |

不同 **Scene Type**（opening / dialogue / climax / action / exposition / closing / standard）自动调整各模块占比。

## 与 Prompt Compiler 统一

`@inkos/prompt` 的 `getAdaptiveBudget()` 委托本包 `allocateDynamicBudget()`，Compiler 按模块 Token 上限裁剪 Prompt。

## 输出

```
novel/_system/studio/dynamic-budget/ch_XXXX/scene_XX/budget.json
```

## API

```js
import { runDynamicBudget, formatBudgetBlock, allocationToCompilerBudget } from '@inkos/dynamic-budget';

const result = runDynamicBudget({ bookDir, chapter, scene, intent });
// result.pie — 八模块饼图
// result.contextTokenBudget — Context Ranking 上限
```
