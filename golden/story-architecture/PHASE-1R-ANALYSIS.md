# Phase 1.R — Pre-change Analysis (read-only)

**Date**: 2026-09-04  
**Scope**: Fix Round 2 REAL FAILURE only · Minimal SR remains FROZEN  

---

## 1. R2-A1 call chain

```text
Scene.goal / Scene.conflict
  （含「林夜确认刷新 / 唯一清醒者 / 伤疤消失」等世界·他者知识）
        ↓
buildSceneWritePrompt  （把 goal/conflict 写成 Writer 任务）
        ↓
compileScenePrompt
  ├─ 人物卡 raw（含 omniscient 秘密）
  ├─ 时间线 / 世界设定
  └─ Character Subjective State
        Awareness = omit
        ↓
createLlmWriter
        ↓
正文把 Goal 世界信息写成「她已经知道 / 亲眼看见」
```

**Root files**:  
`packages/inkos-prompt/src/compiler.js`（SR 呈现过弱）  
`packages/inkos-core/src/lib/minimal-sr.js`（`formatCharacterSRForPrompt` 仅写 omit，无消费纪律）  
`packages/inkos-brain/src/scene/scene.js`（goal/conflict 直灌，无「≠ Awareness」标注）  
**Not root**: `assembleMinimalSR` 投影逻辑（omit 正确）

---

## 2. R2-A2 call chain

同 A1。特化：

```text
Awareness = omit（诚实）
        +
Goal/Timeline 含「车祸 / 刷新」事实
        ↓
Writer：「她知道…亲眼看见…」
```

**Root cause**: Prompt 未区分 **World/Narration vs Character Knowledge**；omit 未被当作刹车。

---

## 3. R2-B1 call chain

```text
08_current_state.时间 = "Day 1"（无公历）
worldBible ≈ 「近未来约2045年」
prior scene summary / 时间线 提及「六月十七日」
        ↓
Scene1 Writer 自由发明「2045年10月14日」
Scene2+ 跟随摘要「六月十七日」
        ↓
历法冲突
```

**Root files**:  
缺 **Story Calendar Lock**（Prompt/Context）  
`08` 仅 Day N；无单一公历源  
prior summary 与 Scene1 发明并存  

**Not SR** · 不新增 SR 时间字段。

---

## 4. Minimal change set

| Change | File | What |
|--------|------|------|
| A | `minimal-sr.js` | 加强 `formatCharacterSRForPrompt`：omit 消费纪律（World≠Character Knowledge） |
| A | `compiler.js` | SR 模块旁附加最短 Information Boundary 消费块；goal 旁标注 ≠ Awareness |
| A | `scene.js` `buildSceneWritePrompt` | 一行硬约束：Goal/冲突事实 ≠ POV 已知，除非 SR Awareness 支持或本场新获得 |
| B | `compiler.js` 或小助手 | `resolveStoryCalendarLock(ctx, scene)`：从 prior summaries / intent.currentDate / state 时间锁定；禁止另造公历 |

## 5. Will NOT modify

```text
assembleMinimalSR 字段结构 / 投影源优先级
authority-act / D1 / L1
Planner / Choice / MemoryUnit / state-updater Canon 写语义
character_brains / Living Evolution
Persistence / 新 Engine
Phase 2 Causality
```

## 6. Regression plan

```text
npm run test:phase1-sr
npm run test:eo-d1-final
scripts/test-phase1r-consumption.js  （A1/A2 omit 边界 + 日期 lock 文本）
Round 3 真实生成 ≥3 Scene（优先有 06/05 的书；Case A omit + Case B 有值）
```
