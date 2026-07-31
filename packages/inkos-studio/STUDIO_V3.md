# Novel Studio V3.1

在 V3.0 六栏导航基础上，强化 AI 工作流与实时 Runtime 反馈。

## V3.1 新增

### Wizard 全流程联调
- 分步 API：`POST /api/ai/generate/{world|writing|characters|factions|volume|chapter-task}`
- 世界生成子步骤进度动画
- 每步独立失败恢复（重新生成，无需从头开始）
- 建书自动写入：世界、规则、人物、势力、卷纲、第一章任务

### Runtime SSE 实时进度
- `GET /api/runtime/events/:bookId` — SSE 事件流（Runtime Event Bus 转发）
- `useRuntimeStream()` — React Hook 监听 Pipeline 阶段
- 写作工作台显示 Planner → Writer → Review → Memory 实时状态

### 创作中心 AI 协作卡
- `GET /api/books/:id/creation-insights` — 完成度 / 缺失项 / AI 建议
- 世界 / 人物 / 势力卡支持「立即生成」

### 写作工作台
- 阅读 / 编辑 / AI修改 三模式
- 增强描写、改变文风、增加冲突、检查逻辑、继续生成

## 架构约束（不变）

只改 `inkos-studio` + `inkos-studio-server`；Runtime / Brain / Prompt Compiler 不修改。


## 一级导航（6 项）

| 导航 | 路由 | 说明 |
|------|------|------|
| 📚 我的小说 | `/` | 书库首页，展示状态/章节/字数/健康度 |
| ✍️ 创作中心 | `/book/:id/create` | AI 协作设定卡（世界/人物/势力/规则/大纲） |
| 📖 写作工作台 | `/book/:id/write` | 三栏：章节目录 \| 正文 \| AI 助手 |
| 🤖 AI助手 | `/book/:id/ai` | 全局 Copilot |
| 📊 数据中心 | `/book/:id/data` | Story Health、Token、Prompt 分析 |
| ⚙️ 系统设置 | `/book/:id/settings` | 高级：Runtime / Memory / Snapshot |

隐藏子路由：`world` `writing` `characters` `factions` `chapter`

## 创建流程（Wizard）

`POST /new` → 6 步：

1. 创意定位 — `POST /api/ai/generate` module=positioning
2. 选择文风 — presets
3. 世界构建 — world + writing
4. 主要角色 — characters
5. 势力组织 — factions
6. 第一卷 — volume → `POST /api/books` 写入 Canon

## 架构边界

```
作者 → Novel Studio (GUI)
         → Studio Server (薄 API)
         → Runtime 2.0 (LOCKED) → Brain → Prompt Compiler → DeepSeek → Memory
```

**禁止修改**：Runtime Pipeline、Brain、Prompt Compiler  
**只允许改**：`packages/inkos-studio`、`packages/inkos-studio-server`

## 开发阶段

- **Phase 1** ✅ 书库、Wizard、Book Home
- **Phase 2** ✅ 创作中心 + AI 生成 Canon
- **Phase 3** ✅ 写作工作台三栏 + 生成进度
- **Phase 4** ✅ 数据中心 + 高级设置

## 启动

```bash
npm run studio:build
npm run studio:server
# 访问 http://localhost:4567
```

可选：`INKOS_LLM_API_KEY` 启用 DeepSeek；未配置时使用 preset 模板回退。
