# InkOS Studio UI 2.0

> **Novel Runtime Console** — 不是 Markdown 编辑器，是 Runtime 控制台。

## 启动

```bash
# 安装依赖（首次）
npm install

# 构建前端 + 启动服务（端口 4567）
npm run studio

# 或开发模式（前端热更新 + 需另开 server）
npm run studio:server   # 终端 1
npm run studio:dev      # 终端 2 → http://localhost:5173
```

## 架构

```
packages/inkos-studio/          React 前端（Runtime Console UI）
packages/inkos-studio-server/   HTTP API 薄包装（不修改 Runtime）
packages/inkos-runtime/         Runtime 2.0（不变）
packages/inkos-brain/           Brain 1.0（不变）
```

## API 端点

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/books` | 书籍列表 |
| GET | `/api/books/:id/dashboard` | 聚合 Dashboard 数据 |
| PUT | `/api/books/:id/chapters/:n/scenes` | 保存 Scene 正文 |
| POST | `/api/books/:id/runtime/run` | 启动 Runtime |
| POST | `/api/books/:id/runtime/resume` | 断点续写 |
| POST | `/api/books/:id/runtime/daemon/start` | 启动 Daemon |
| POST | `/api/books/:id/memory/snapshot` | 创建 Snapshot |
| POST | `/api/books/:id/memory/rollback` | 回滚 Snapshot |
| GET | `/api/books/:id/memory/diff?from=&to=` | Memory Diff |

## UI 模块对照 PRD

| PRD 目标 | 实现 |
|----------|------|
| 首页 Novel Runtime | `Home` 组件 |
| Runtime Dashboard | 顶部状态栏 + phase pill |
| Scene Pipeline | 左栏 Scene 列表 |
| Brain Panel | 右侧 Brain stages |
| Event Timeline | 右侧事件流 |
| Story Health | 健康度条 + 分数 |
| Current State | 状态卡片 |
| Planner Visualization | Goal→Conflict→Scene 流程图 |
| Dynamic Prompt Viewer | Scene dynamic modules |
| Git Memory Diff | semantic diff + Snapshot/Rollback |
| Reader/Critic | 评论卡片 |
| Runtime Console | 底部状态条 |
| World Runtime | State Board 势力 |
| Scene Editor | Scene 级 textarea |
| Runtime Control | Start/Resume/Daemon/Stop |
| Health Center | Review/Validation/Metrics |
| Adaptive Planner | weight grid |

## 兼容性

- V4 + Brain 书籍：完整 Runtime Console 功能
- V2/V3 书籍：可浏览，Runtime 功能需迁移到 V4
