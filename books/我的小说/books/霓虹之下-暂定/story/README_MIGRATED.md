# ⚠️ 已迁移至 Novel OS V3

本目录（`story/`）为 **V2 遗留结构**，仅作归档与回滚参考。

**权威来源已迁至：**

| V2 路径 | V3 路径 |
|---------|---------|
| `outline/story_frame.md` | `canon/01_world_bible.md` + `canon/05_volume_outlines/` |
| `book_rules.md` + `style_guide.md` | `canon/02_writing_bible.md` |
| `roles/` | `canon/03_characters/` |
| `outline/story_frame.md` 对手段 | `canon/04_factions/` |
| `current_state.md` | `runtime/06_current_state.md` |
| `pending_hooks.md` / `state/hooks.json` | `runtime/08_hooks.yaml` |
| `character_matrix.md` | `runtime/hidden/info_matrix.yaml` + `relation_net.yaml` |
| `subplot_board.md` | `runtime/hidden/state_board.md` |
| `runtime/chapter-*.plan.md` | `runtime/plans/` |
| `snapshots/` | `runtime/snapshots/` |

**写章请使用 V3 工作流：**

1. 读 `runtime/07_chapter_task.md`
2. 按 `.inkos/schema/v3/write-context.tiers.yaml` 加载上下文
3. 写后按 `.inkos/schema/v3/post-chapter.yaml` 更新 runtime

迁移时间：2026-07-08
