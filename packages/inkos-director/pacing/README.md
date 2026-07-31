# Director Pacing

实时分析 Scene 正文节奏，输出 `pacing_report.json`。

## 规则

| 规则 | 阈值 | 修正 |
|------|------|------|
| 事件节奏带 | 每 **800~1200** 字 | 须发生至少 1 次事件 |
| 连续说明 | **> 250** 字 | 加入事件 |
| 连续心理描写 | **> 180** 字 | 加入动作 |
| 连续设定 | **> 150** 字 | 加入对话 |

## Scene 节拍

**禁止**：解释 → 解释 → 解释 → 解释

**要求**：动作 → 对白 → 冲突 → 解释 → 动作 → Hook

## 输出路径

```
novel/_system/studio/director/pacing/ch_XXXX/scene_XX/pacing_report.json
```

## API

```js
import { analyzePacing, analyzeRealtimeWindow, persistPacingReport } from '@inkos/director';

const result = analyzePacing(text, scene, intent);
// result.report — 完整 pacing_report 结构

const window = analyzeRealtimeWindow(partialText, offsetChars);
// 流式扩展用

persistPacingReport(bookDir, chapter, scene, result.report);
```
