# InkOS Agent 指引

## 版本

| 模式 | 判断 | 命令 |
|------|------|------|
| V4 + Runtime 2.0 | `brainEnabled: true` | `inkos runtime run` / `inkos brain run`（默认走 Runtime） |
| Brain 1.0 旧管线 | `--legacy` | `inkos brain run --legacy` |
| V4 无 Brain | `brainEnabled: false` | `inkos context` |

## Runtime 2.0 — 全自动闭环

```
Planner → Decision → Conflict → Scene → Writer
  → Review → Consistency → Decision（逐 Scene）
  → Metrics → Reader → Critic → Validation
  → Adaptive → Git Memory → Story Health → Next Planner
```

**不要**手动串联 `brain plan` → `brain scene` → `brain run`。使用：

```bash
inkos runtime run <book-dir> --chapter N --text 正文.md
inkos runtime daemon <book-dir>    # 监听 chapters/ 自动跑 Pipeline
```

## Writer 角色

Writer（DeepSeek）只负责填 `scenes[].text` 或 `chapters/NNNN_*.md`。Runtime 负责其余全部步骤。

## Git Memory

```bash
inkos memory snapshot <book-dir> --chapter N
inkos memory rollback <book-dir> <snapshotId>
inkos memory branch <book-dir> experiment
```

## 禁止

- 不要为 Runtime 新增 Markdown 知识库文件
- 不要堆 Prompt；动态 Prompt 由 `dynamic-prompt.js` 按 Scene 实体组装
- Scene 失败不要继续写下一 Scene；Chapter Validation 七项须全部通过

## InkOS Studio UI 2.0

Studio 是 **Novel Runtime Console**（不是 Markdown 编辑器）。

```bash
npm run studio:build && npm run studio:server   # http://localhost:4567
```

- 前端：`packages/inkos-studio/`
- API：`packages/inkos-studio-server/`（薄包装，不修改 Runtime）
- Scene 是一级对象；数据来自 `ch_*_scenes.json`、`story_health.json`、`runtime_state.json`
