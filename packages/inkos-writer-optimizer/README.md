# @inkos/writer-optimizer

**独立优化层**，位于 Studio Writer 路径，不修改 Runtime。

## 流程

```
Prompt Compiler
    ↓
LLM（单次 Draft）
    ↓
Writer Optimizer（七维评分）
    ↓
Auto Polish（仅尾部 300~500 字）
    ↓
Novel
    ↓
Scene Review（Director）
```

## 七维评分（各 0~100）

| 维度 | 说明 |
|------|------|
| **pacing** | 节奏 |
| **climax** | 高潮 |
| **hook** | Hook |
| **commercialPleasure** | 商业爽点 |
| **styleConsistency** | 文风一致性 |
| **characterConsistency** | 人物一致性 |
| **infoRelease** | 信息释放 |

## Auto Polish

- **不是**全文重写
- 仅修改尾部 **300~500 字**
- 允许：结尾、高潮、Hook、过渡、对白
- 规则润色 + 可选 LLM 尾部润色（Studio 配置 API Key 时启用）

## 输出

```
novel/_system/studio/writer-optimizer/ch_XXXX/scene_XX/
  draft.md
  polished_draft.md
  optimizer_report.json
```

## Studio API

`GET /api/books/:id/writer-optimizer?chapter=N&scene=M`

Studio IDE 正文区：**Draft → Diff → Polished** 三视图。

## API

```js
import { runWriterOptimizer } from '@inkos/writer-optimizer';

const result = await runWriterOptimizer({
  text: draft,
  scene, chapter, intent, ctx, styleDna, bookDir,
  polishFn: async (tail, instructions) => polishedTail,
});
// result.draftText, result.polishedText, result.scores, result.reportPath
```
