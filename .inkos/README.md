# Novel OS V4

> Git + Database + Workflow Engine + State Machine + Knowledge Graph

**所有新开小说必须使用 V4**（`schemaVersion: 4`）。

## 快速开始

```bash
npm install
npm run inkos -- init 我的新书 "书名" "题材"
# 或
./scripts/init-book-v4.sh 我的新书 "书名" "题材"
```

## 16 模块

| # | 文件 | 职责 |
|---|------|------|
| 01 | `novel/01_world_bible.md` | 世界规则 |
| 02 | `novel/02_writing_bible.md` | 写作规则（唯一源） |
| 03 | `novel/03_character_bible/` | 人物恒定属性 |
| 04 | `novel/04_faction_bible/` | 势力恒定属性 |
| 05 | `novel/05_relationship_graph.yaml` | 关系图 |
| 06 | `novel/06_knowledge_matrix.yaml` | 信息差矩阵 |
| 07 | `novel/07_state_board.md` | 局势图 |
| 08 | `novel/08_current_state.md` | 当前状态 |
| 09 | `novel/09_current_chapter.md` | 本章任务 |
| 10 | `novel/10_volume_outline/` | 卷纲 |
| 11 | `novel/11_timeline.yaml` | 时间线 |
| 12 | `novel/12_foreshadow_db.yaml` | 伏笔库 |
| 13 | `novel/13_facts_db.yaml` | 不可逆事实 |
| 14 | `novel/14_resource_db.yaml` | 资源系统 |
| 15 | `novel/15_npc_simulation.yaml` | NPC 模拟 |
| 16 | `novel/16_chapter_review/` | 章后评审 |

## CLI 工作流

```bash
# Workflow 1 — 写前上下文（按注意力 Tier 排序）
npm run inkos -- context books/我的小说/books/书名 --pov 主角 --out /tmp/ctx.md

# 生成章后 delta 模板
npm run inkos -- delta books/我的小说/books/书名 1

# Workflow 2 — 写后自动更新全部动态模块
npm run inkos -- post books/我的小说/books/书名 1 novel/_system/delta_ch_0001.json

# Workflow 3 — 章后评审（<80 分 exit 1）
npm run inkos -- review books/我的小说/books/书名 1 novel/_system/delta_ch_0001.json

# NPC 模拟
npm run inkos -- npc books/我的小说/books/书名 3
```

## 版本共存

| 版本 | 判断 | 新书 |
|------|------|------|
| V4 | `novel/` + schemaVersion 4 | ✅ 默认 |
| V3 | `canon/` + runtime/ | 旧书保留 |
| V2 | `story/` | 旧书保留 |
