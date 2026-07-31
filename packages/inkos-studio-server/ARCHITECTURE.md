# Studio Server — API Wrapper

> **不是 Runtime。** 只包装，不实现小说业务逻辑。

## 层级

```
Studio UI  →  Studio Server (本包)  →  Runtime 2.0 (LOCKED)
```

## 模块

| 文件 | 职责 |
|------|------|
| `api-gateway.js` | 路由权限分类（READ_ONLY / RUNTIME_CONTROL / FORBIDDEN） |
| `runtime-reader.js` | 只读 Runtime 产出物，禁止业务计算 |
| `runtime-control.js` | 委托 Runtime 公开命令 |
| `compatibility.js` | API 版本适配层 |
| `event-stream.js` | Runtime Event Bus → SSE |
| `version.js` | `runtimeVersion` 从 `@inkos/runtime` 读取 |

## 禁止

见 `api-gateway.js` → `FORBIDDEN_ROUTES`

## Schema

`.inkos/schemas/api/` — Runtime 修改响应结构时必须同步更新
