# PHASE 1 COMPLETION REPORT

**Phase:** Actual Event Foundation  
**Date:** 2026-09-08  
**Gate process:** Audit → Design → Minimal impl → Test → Failure replay → Freeze

---

## 1. Changed Files

| File | Change |
|------|--------|
| `_AI_ACTUAL_FLOW_AUDIT.md` | 重写：脚手架已存在；消费缺口已记录 |
| `_AI_AUDIT_PRODUCTION_PATH.md` | Phase 0 产物（前置） |
| `packages/inkos-brain/src/events/actual-events-prompt.js` | **新增** N+1 只读 Actual 投影 |
| `packages/inkos-brain/src/events/index.js` | 导出 collect/format/summarize |
| `packages/inkos-brain/src/index.js` | 对外导出 |
| `packages/inkos-prompt/src/compiler.js` | 注入 `actual_events` 模块 + cache hash |
| `packages/inkos-studio-server/src/writer-optimization/beat-slimmer.js` | Scene 开场 Beat 注入 Actual block |
| `packages/inkos-studio-server/src/studio-orchestrator.js` | intent 回写 mirror `actualEvents` / OC |
| `scripts/test-event-foundation.js` | 增补 Case E：N+1 无 Plan 可见 Actual |

**Pre-existing（本 Phase 收尾前已在仓库）：**

- `packages/inkos-brain/src/events/{story-event.schema,event-extractor,event-validator,index}.js`
- Studio Writer / Runtime orch `ensureActualEvents` + `ACTUAL_EVENT_REQUIRED`

---

## 2. Architecture Change

```
BEFORE:
  Writer → scene.text → OC → Persist
  N+1 Prompt ← OC + Plan/Expected
  Director ← Plan closingWorldState

AFTER (Phase 1 freeze):
  Writer → scene.text → OC → Actual Events → Persist
  N+1 Prompt ← Actual Events (只读) + OC + Plan/Expected
  Director ← Plan closingWorldState  （仍在；Phase 7）
  Canon timeline ← []               （EO-P2；Phase 2）
```

**冻结边界：**

- StoryEvent 只来自 `scene.text`；`writesCanon/SR/Reality = false`
- Actual block **不得**被 Plan closing 覆盖生成
- 不在本 Phase 替换 Director Plan bridge
- 不在本 Phase 建立 State Evolution 唯一入口

---

## 3. Tests Added

- `scripts/test-event-foundation.js` Case E：删 Plan 后 `collectPreviousActualEvents` + `formatActualEventsBlock` 仍含 actors；Plan 文案不得泄漏

---

## 4. Test Result

```
npm run test:event-foundation     → PASS
npm run test:f8.3-plan-validity   → PASS
npm run test:rf01-prose-boundary  → PASS
```

（需 Node ≥20；默认 nvm v12 会语法失败。）

---

## 5. Failure Replay

| Case | 结果 |
|------|------|
| **Ch2 S3 Choice disappearance** | 可从正文抽 `open_choice` Actual Event，并进入 N+1 Prompt；**仍不能强制结算**（Open Loop = Phase 6） |
| **Plan override** | Prompt 层：N+1 可见 Actual，Plan 不得泄漏进 Actual block。**Director situation 仍可读 Plan closing**（Phase 7） |
| **Hospital cold open** | F8.3 软降权仍在；Actual 提供承接事实，非重生 Plan |

---

## 6. Remaining Risks

1. **Director Plan bridge 未拆** — 操作面「世界」仍可被 Plan 主导（已知；属 Phase 7）。  
2. **stateChanges 仅为标签** — 未写入 08/11/13；删 Plan **不能**恢复 Canon 世界状态（属 Phase 2）。  
3. **提取器启发式** — presence fallback / 弱事件可能噪声；宁缺勿滥需持续守住。  
4. **CLI `createLlmWriter` 路径** — Phase 0 NEED MIGRATION；无 RF-01；有 Runtime `ensureActualEvents` 但无 Beat L4 Actual 注入同等体验。  
5. **Optimizer / ReaderSim 后置改写** — 可能在 RF-01/Actual 门闩后改正文（Phase 0 residual）。

---

## 7. Can Enter Next Phase?

**YES** — 进入 **Phase 2: State Evolution Engine**（先做 `_AI_STATE_WRITE_AUDIT.md`）。

**Phase 1 冻结声明：**

> Actual Event Foundation 已具备：提取、校验、门闩、落盘、N+1 Prompt 只读消费。  
> 「Actual First」在 **Prompt 可见性** 上成立；在 **Canon / Director / State** 上仍未成立 — 不得宣称 Story Survival 完成。

---

## Acceptance vs Roadmap

| Roadmap 验收 | 状态 |
|--------------|------|
| 删 Plan → 谁做了什么 | **PASS** |
| 删 Plan → 世界/人物标签（stateChanges） | **PASS（标签级）** |
| 删 Plan → 下一场输入含 Actual | **PASS（Prompt）** |
| 删 Plan → Canon/Director 世界恢复 | **FAIL（刻意留给 Phase 2/7）** |
