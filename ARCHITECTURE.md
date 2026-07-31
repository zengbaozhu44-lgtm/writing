# InkOS 三层架构

> **Runtime Stability 1.0** — 架构冻结与长期边界

## 层级

```
┌─────────────────────────────────────┐
│  InkOS Studio（UI）                  │  展示 · 控制 · 调试
│  packages/inkos-studio/             │
└─────────────────┬───────────────────┘
                  │ HTTP / 未来 SDK
┌─────────────────▼───────────────────┐
│  Studio Server（API Wrapper）        │  只包装，不实现业务
│  packages/inkos-studio-server/        │
└─────────────────┬───────────────────┘
                  │ 调用公开 Runtime API
┌─────────────────▼───────────────────┐
│  InkOS Runtime 2.0（LOCKED）         │  唯一业务核心
│  packages/inkos-runtime/              │
└─────────────────┬───────────────────┘
                  │
┌─────────────────▼───────────────────┐
│  Brain 1.0（LOCKED）                 │
│  packages/inkos-brain/              │
└─────────────────┬───────────────────┘
                  │
┌─────────────────▼───────────────────┐
│  DeepSeek Writer（LLM）              │
└─────────────────────────────────────┘
```

## 铁律

1. **Studio 不是 Runtime** — Studio 不得承担小说逻辑、状态计算、Memory 更新、Planner 决策
2. **Studio 不得绕过 Runtime** — 禁止直接写入 `novel/` 业务文件
3. **Runtime 是唯一真相（SSOT）** — 所有小说状态由 Runtime Pipeline 产出
4. **API Schema 契约** — Studio 只消费 Schema 定义的响应结构
5. **Runtime LOCKED** — 见 `packages/inkos-runtime/RUNTIME_ARCHITECTURE.md`

## API 权限分类

| 类型 | 方法 | 说明 |
|------|------|------|
| **Read Only** | GET | 读取 Runtime 产出物，禁止副作用 |
| **Runtime Control** | POST `/runtime/*` | 调用 Runtime 公开命令，禁止直写业务数据 |

### 禁止的 Studio 写入

```
POST /facts          POST /timeline       POST /relationship
POST /knowledge      POST /resource       POST /state
PUT  /sceneText      POST /memory/snapshot（绕过 Pipeline）
```

Memory / Facts / Timeline / State 更新 **只能**由 Runtime Pipeline 自动维护。

## 版本

| 组件 | 版本源 |
|------|--------|
| Runtime | `@inkos/runtime` package.json |
| API | `packages/inkos-studio-server/src/version.js` |
| Schema | `.inkos/schemas/api/` |

## 文档

- [Runtime 边界详解](docs/runtime-boundary.md)
- [Runtime 架构冻结](packages/inkos-runtime/RUNTIME_ARCHITECTURE.md)
- [API Schema](.inkos/schemas/api/)

## 未来 SDK

```
packages/inkos-sdk/   # 占位，未来替代 HTTP Wrapper
```

Studio UI 通过 Compatibility Layer 消费 API，切换 SDK 时 UI 无需修改。
