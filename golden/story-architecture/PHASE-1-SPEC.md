# Phase 1 — Minimal SR Read-only Projection

**Status**: `ACCEPTED` + `FROZEN` (human 2026-09-04)  
**Date**: 2026-09-04  
**Mode**: READ-ONLY VIEW only  

Upstream Phase 0: `PHASE-0-AUDIT.md` **APPROVED** with corrections:

```text
03 Bible → current Motive     = FORBIDDEN (seed/context only)
Current Validity persistence  = NOT IN PHASE 1
```

**Post-accept**: No Phase 1.1 · No SR expansion · Next = Story Validation (`PHASE-1-STORY-VALIDATION.md`) · Phase 2 not auto-started.
---

## Goal

```text
existing evidence/state
        ↓
assembleMinimalSR()
        ↓
characterSR
        ↓
compileScenePrompt
        ↓
Writer
```

SR is a **View / Projection**, not a new State Authority / psychology engine / Persistence Engine.

---

## Code

| File | Role |
|------|------|
| `packages/inkos-core/src/lib/minimal-sr.js` | Pure projector + prompt formatter |
| `packages/inkos-brain/src/loader.js` | Attaches chapter-level `ctx.characterSR` |
| `packages/inkos-prompt/src/compiler.js` | Scene-scoped re-assemble + lore module |

## Explicitly NOT done

```text
No SR sidecar / MemoryUnit writeback
No character_brains
No state-updater / Canon write
No Planner / Choice / L1 change
No D1 change
No LLM completion
No Bible → current Motive
```

## VERIFY

```bash
npm run test:phase1-sr
```
