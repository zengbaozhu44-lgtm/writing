# Phase 1.R2 — Report

**Date**: 2026-09-04  
**Target**: R3-B1 Story Clock / Character Continuity (calendar consumption)  
**Minimal SR**: remains ACCEPTED / FROZEN  
**Phase 2**: remains NOT AUTHORIZED  

---

## Pre-change verdict (A/B/C)

见 `PHASE-1-R2-ANALYSIS.md`。

污染链已证实：

```text
disk legacy「六月十七日」
  → loadPreviousSceneTexts（未用 resolvePreviousScenes）
  → unlabeled Previous / 前序摘要
  → Writer 选旧日期为「今天」
```

另：Studio/Runtime 整章结束才 `persistScenes`，且未挂 `ctx.intent`，中途编译必然打到磁盘旧稿。

---

## Source Precedence（落地）

```text
Scene Current Date  = Story Clock Canonical
Historical Date     = prior prose / summaries（承接下文，≠ 今天）
Referenced Date     = 引用中的过去事件
```

冲突时：**Canonical > 旧摘要 / 磁盘 legacy 充当「今天」**。  
历史日期文本保留，仅禁止被误读为当前 Scene 日期。

---

## 最小修复

| 改动 | 目的 |
|------|------|
| `compileScenePrompt` → `resolvePreviousScenes` | 本轮 `intent.scenes[].text` 优先于磁盘 |
| 传入 `clock` → `formatPreviousSummaries` / `buildContinuationBlock` | 冲突月日标为历史，非今天 |
| prompt hash 含 clock + prevSummaries | 避免旧 unlabeled cache |
| Runtime + Studio orchestrator：`ctx.intent = intent` | 真实 Studio 路径可消费本轮正文 |

未改：Minimal SR · Persistence · Continuity Engine · Phase 2 · 删除全部旧摘要。

---

## 测试

```text
npm run test:phase1-sr   PASS
npm run test:phase1-r    PASS
npm run test:phase1-r2   PASS  (新增 R3-B1)
npm run test:eo-d1-final PASS
```

---

## Round 4 真实路径（≥3 Scene）

产物：`golden/story-architecture/validation-round4/`

| Scene | Prompt Canonical | Historical label | 正文六月 | 正文十月族 |
|-------|------------------|------------------|----------|------------|
| 1 | 10月27日 | n/a | 无 | 有「今天是10月27日」 |
| 2 | 10月27日 | 有 | 无 | 有「10月26日」时间戳 |
| 3 | 10月27日 | 有 | 无 | 有「2025.10.27.」血字 / 27↔28 日 |

对比 Round 3：S2/S3 正文仍写「六月十七日」→ **本轮未再出现**。

---

## Story Validation Round 4（仅 A/B/C/D + SR Consumption）

### A Information Boundary — **PASS**

苏晚未写成已知「世界硬重置 / 伊甸节点」。对车祸主张保持数据怀疑。

### B Character Continuity（日历 · R3-B1）— **PASS**

三场连续生成均未把磁盘旧稿「六月」当作当前日历；沿用 10 月族 / 日号与 Canonical 一致。  
**成功定义满足**：Writer 稳定以 Story Clock 为当前时间，不被历史摘要抢走。

### C Contradiction Preservation — **PASS**

林夜记忆 vs 系统/世界否认 在 S1–S3 仍在（刷新抹证、只有他记得）。

### D Action Plausibility — **PASS（计划内）**

S3 goal 本身要求医院病床 + 血写标记；正文贴合该计划。S2 为证明矛盾拉监控，未再跳到冲突月日。

### SR Consumption

Story Clock + Historical Continuity 标签进入 Prompt；本轮 **未被旧摘要覆盖**。  
**SR Gap：NONE**

---

## 总裁判

```text
A = PASS
B = PASS   ← R3-B1 repaired
C = PASS
D = PASS
SR Gap = NONE
```

```text
Minimal SR = ACCEPTED / FROZEN
Phase 1.R2 = IMPLEMENTED
Phase 2    = NOT AUTHORIZED
```

**STOP.** 下一阶段由项目负责人决定。
