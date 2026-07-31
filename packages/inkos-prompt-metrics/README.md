# @inkos/prompt-metrics

Prompt Metrics（PR7）— 每个 Scene 全量记录 LLM / 质量指标。

## 记录字段

| 字段 | 说明 |
|------|------|
| input_tokens | 输入 token |
| output_tokens | 输出 token |
| cached_tokens | 缓存 token |
| cache_hit | 是否命中缓存 |
| compile_time / compile_time_ms | Prompt 编译耗时 |
| llm_latency / llm_latency_ms | LLM 调用延迟 |
| retry | 重试次数 |
| temperature | 采样温度 |
| cost / usd_cost | 估算费用（USD） |
| quality / commercial_score | 商业质量分 |

## 输出

```
novel/_system/studio/prompt-metrics/ch_XXXX/scene_XX/prompt_metrics.json
novel/_system/studio/prompt-metrics/ch_XXXX/rollup.json
```

## 接入

`createStudioLlmWriter` 在 Scene 完成后调用 `recordScenePromptMetrics`，并 emit `promptMetricsUpdated` SSE 事件。

Studio Dashboard / 写作台实时展示。
