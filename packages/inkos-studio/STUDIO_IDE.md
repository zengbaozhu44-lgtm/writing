# Novel Studio IDE 1.0

全图形化小说创作操作系统 — 无需 Markdown · 无需 CLI。

## 架构

```
作者 → Novel Studio IDE (GUI)
         → Studio Server (API Wrapper)
         → Runtime 2.0 (LOCKED)
         → Brain → Prompt Compiler → Writer → Memory
```

## 启动

```bash
npm run studio:build && npm run studio:server
# 打开 http://localhost:4567
```

## 导航

| 页面 | 替代文件 | 可编辑 |
|------|---------|--------|
| 世界 | 01_world_bible.md | ✓ |
| 写作规则 | 02_writing_bible.md | ✓ |
| 人物 | 03_character_bible/ | ✓ |
| 势力 | 04_faction_bible/ | ✓ |
| 关系/时间线 | YAML | 只读 (Runtime) |
| 当前状态 | 08_current_state.md | 只读 |
| 当前章节 | 09_current_chapter.md | ✓ |
| Planner/Scene/Runtime | brain 产出 | 只读 + 控制 |
| Memory/Metrics/Prompt | 分析 | 只读 |

## API 新增

- `GET/PUT /api/books/:id/modules/:key` — Canon 读写
- `GET /api/books/:id/prompt-analytics` — Prompt 分析
- `POST /api/books/:id/copilot` — 自然语言控制

## 禁止

Studio 不得直写 Facts/Timeline/Scene 正文等 Runtime 管理数据。见 `docs/runtime-boundary.md`。
