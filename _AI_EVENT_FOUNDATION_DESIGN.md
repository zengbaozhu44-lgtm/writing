# Phase 1.2 — StoryEvent Design Freeze

**Status:** FROZEN for Step 1.3 wiring  
**Date:** 2026-09-08

## Decision

| Item | Choice |
|------|--------|
| Location | `packages/inkos-brain/src/events/` |
| Files | `story-event.schema.js` · `event-extractor.js` · `event-validator.js` · `index.js` |
| Extractor | Deterministic, text-only（宁缺勿滥）；LLM extract 可后加，须过同一 validator |
| Canon write | **禁止**（`writesCanon/SR/Reality = false`）；timeline 仍 EO-P2 空 |
| Plan | `stripPlanFromScene`；forbidden sources 含 `closingWorldState` |
| Persistence (1.3) | 挂 `scene.actualEvents`，随 `ch_*_scenes.json` 落盘 |
| Hard gate (1.3) | 有正文却 0 PASS 事件 → 禁止进下一章 |

## Out of scope（本步）

- State Evolution 唯一写入口（Phase 2）
- Director Actual Migration（Phase 7）
- Open Loop Ledger 强制（Phase 6）— 仅提取 `open_loop:choice=OPEN` 标记
