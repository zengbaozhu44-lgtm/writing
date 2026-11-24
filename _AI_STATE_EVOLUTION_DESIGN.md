# Phase 2.2 — State Evolution Engine Design Gate

**Status:** FROZEN for Step 2.3 minimal impl  
**Date:** 2026-09-08  
**Depends on:** `_AI_STATE_WRITE_AUDIT.md` · Phase 1 freeze

---

## Decision

| Item | Choice |
|------|--------|
| Strategy | **WRAP** — 不重写 Writer/Director/Living 全文 |
| Location | `packages/inkos-brain/src/memory/state-evolution-engine.js` |
| Public API | `evolveFromChapter({ bookDir, chapter, scenes, intent, … })` → StateDiff |
| Wire point | `buildStateDiff` **必须**经 Evolution；禁止旁路直接语义填 Canon |
| Timeline fill | **仅** `scene.actualEvents`（text-grounded StoryEvent）→ `timeline.events` |
| Plan / modelled | 仍禁止（EO-P2 保持：`resolveTimelineEvents` → `[]`） |
| Facts (13) | 本步仍 `[]`（Authority / 更严过滤未就绪） |
| Character Canon | 本步只写 `evolution.characterHints` 进 StateDiff / states；**不**直写 `writeCharacterBrain` |
| Living / CLI bypass | 记录为 residual；本步不一次迁完 |
| Provenance | 每次 evolution 必带 `provenance` 对象 |

---

## API Shape

```js
evolveFromChapter({
  bookDir,
  chapter,
  scenes,          // 须含 text + actualEvents（可 reextract）
  intent,
  chapterText,
  metrics,
  nextChapterPlan,
  force,
})
→ {
  ...StateDiff,
  evolution: {
    version: 'state-evolution-1',
    actualEventIds: string[],
    timelineEvents: string[],      // 写入 canonDelta.timeline.events
    characterHints: object[],      // 标签级；非 SR
    openLoops: string[],
    worldHints: string[],
  },
  provenance: {
    engine: 'state-evolution-engine',
    version: 'state-evolution-1',
    source: 'actual_events',
    at: ISO,
    writesCanonTimeline: boolean,
    writesFacts: false,
    writesCharacterBrain: false,
  },
}
```

---

## Mapping Rules（Actual → Timeline）

1. 收集章内全部 `actualEvents`（缺则 `ensureActualEvents` + stripPlan）。  
2. 对每个 event 生成候选句：`actors.join('/') + ': ' + action`（截断）。  
3. 必须 `isActualTimelineEvent(candidate) === true`。  
4. 去重；上限 N（如 12）。  
5. **禁止**读取：goal / closingWorldState / causalChain / expected。

---

## Out of Scope（本步）

- Director Actual Migration（Phase 7）  
- Character SR（Phase 3）  
- Open Loop Ledger 强制（Phase 6）  
- Living `writeWorldState` / `writeCharacterBrain` 全迁  
- CLI `inkos post` BLOCK 执法（可后续）  
- `writesCanon=true` 翻 StoryEvent 标志（Evolution 写 Canon；事件记录本身仍标记 false）

---

## Acceptance（Step 2.3）

1. `npm run test:state-evolution` PASS  
2. `npm run test:s6-1-timeline-events` PASS（EO-P2 不回退）  
3. 有 actualEvents 时：`canonDelta.timeline.events.length > 0` 且含 actors/action  
4. 无 actualEvents / 仅 Plan 字段时：events 仍 `[]`  
5. StateDiff 带 provenance  

---

## Freeze Statement

> State Evolution 是章级语义状态的唯一构造入口（经 `buildStateDiff`）。  
> Canon timeline 只接受 Actual Event 派生句；Plan 永不回填。  
> Character brain / Living 物理写仍属 residual，不得在本步扩大。
