# InkOS Prompt Compiler 2.0 + Writer Intelligence 1.0

> **不修改 Runtime / Brain Pipeline。** 仅优化 Prompt 编译与 Writer 层。

## 架构

```
Runtime (LOCKED)
    │
    ▼
Prompt Compiler v2
    ├─ Cache Validator（Hash 失效）
    ├─ Prompt Cache
    ├─ Context Diff
    ├─ Entity Importance Ranking
    ├─ Context Ranking（Facts/Knowledge/Relationship Top-K）
    ├─ Adaptive Budget（按 Scene 类型动态分配）
    └─ Token Meter（真实 LLM Token）
    │
    ▼
Writer Optimizer (@inkos/writer)
    ├─ Style Adapter（文风蒸馏）
    ├─ Rhythm Model（铺垫/推进/高潮/结尾）
    ├─ Info Release / Conflict / Hook
    │
    ▼
DeepSeek Writer
```

## Token Budget（Adaptive）

| Profile | 典型 Scene | 总 Token Max |
|---------|-----------|-------------|
| dialogue | 对话博弈 | ~2200 |
| combat | 战斗转折 | ~2200 |
| investigation | 调查揭秘 | ~2200 |
| default | 其他 | ~2200 |

预算按 `goal / character / facts / knowledge / relationship / world / writing / state` 动态分配，非固定 Tier。

## Metrics（prompt_metrics.json）

```json
{
  "sceneId": "ch1_s1",
  "input_tokens": 1850,
  "output_tokens": 920,
  "compile_time_ms": 2,
  "cache_hit": true,
  "cache_hit_rate": 100,
  "ranking_drop": 3,
  "budget_usage": { "usage": {}, "pct": {} },
  "llm_latency_ms": 3400,
  "estimated_cost": 0.0004,
  "temperature": 0.85,
  "retry_count": 0
}
```

## 缓存失效

`cache-validator.json` 追踪 world / writing / character / facts / relationship / resource / knowledge hash。任一变化 → 自动 `invalidatePromptCache()`。

## Studio

Dashboard 新增 **Prompt Analytics**：Input/Output Tokens、Cost、Latency、Cache Hit、历史趋势。
