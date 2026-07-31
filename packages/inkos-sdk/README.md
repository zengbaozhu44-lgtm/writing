# @inkos/sdk — Future SDK (Placeholder)

> **Status: RESERVED** — 当前 Studio 使用 HTTP Wrapper。未来可切换为 SDK，UI 无需修改。

## 目标架构

```
React Studio UI
      │
      ▼
@inkos/sdk          ← 本包（未实现）
      │
      ▼
@inkos/runtime      ← LOCKED
```

## 接口契约

SDK 必须实现与 Studio Server 相同的 API Schema：

- `.inkos/schemas/api/dashboard.schema.json`
- `.inkos/schemas/api/scene.schema.json`
- 等

## 当前

请使用 `packages/inkos-studio-server/` HTTP Wrapper。

```bash
npm run studio:server
```

## 切换路径

1. 实现 `@inkos/sdk` 导出与 `api.ts` 相同的接口
2. Studio `api.ts` 切换 import 源
3. UI 组件零修改
