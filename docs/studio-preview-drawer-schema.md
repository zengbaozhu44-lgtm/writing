# Studio 预览抽屉 Schema（预审-确认-执行 · 设计稿）

> 状态：草案 · 2026-08-14 · **MVP（goal + scenes + plant）已于当日接入 IDE 诊断抽屉**（`packages/inkos-studio` 的 PlanPreviewDrawer + Server render-preview/commit 路由）；本文档为完整闭环（cost/hook/foreshadow 可编辑 + 抽屉内覆盖确认）定接口，不碰 Runtime/Brain 核心。
> 渲染层现状：`_tools/generate-chapter-plan.mjs` 已具备「预审（--review）+ 写入 + --plant 覆盖」CLI 能力，本 Schema 是它的 UI 投影。

---

## 1. 工作流（与 CLI 一一对应）

```
作者点「生成下一章」
  → POST /api/chapters/:ch/preview            （= CLI --review --dry）
  → 前端渲染 预览抽屉（只读审计 + 可编辑字段）
  → 作者改 goal/scenes/plant/gap_focus …
  → 「确认执行」 → POST /api/chapters/:ch/commit  （渲染器写盘 chapter_NNNN.yaml → Orchestrator 执行）
  → 「重新渲染」 → POST /api/chapters/:ch/preview?plant=…&gap_focus=…（换参数重跑，不落盘）
```

原则：**渲染器是唯一写盘者**。UI 只传「覆盖参数」（plant / gap_focus / 字段覆写），不直接改 plan；写盘前仍过渲染器的 POV/闭合/覆盖校验。

---

## 2. 数据契约 · `POST /api/chapters/:ch/preview` → 响应

```yaml
preview:
  # ── 只读审计（来自渲染器 auditSummary + buildChapterPlan）──
  audit:
    chapter: 3
    chapter_function: milestone          # ctx.chapterFunction
    distance_to_milestone: 0
    milestone: 阿婆手帕上的「周」字浮现…
    pov: 林守常
    pov_check:
      ok: true
      entrance_chapter: 1
    vol:
      index: 1
      cost_prefix: 咽回的话              # volume_tones.yaml
      emotion_baseline: 压抑
    gaps:
      advance: []                       # 本章推进目标
      carried: [{ id: gap_002, ref: H002, title: 等你纸片是谁写的… }]
      protect: [{ id: gap_001, … }]
    active_threads: [main_core]
    whitelist_coverage:
      ok: true                          # goal/scenes/cost/hook/foreshadow 非空
      missing: []
    plant_heuristic: 手帕                # extractPlant 结果；作者可 --plant 覆盖
    out_path: novel/_system/chapter_plans/chapter_0003.yaml
    overwrite: true                     # 已存在，commit 需 force（抽屉里体现为确认弹窗）

  # ── 可编辑字段（作者改完 commit 时随覆盖参数回传）──
  editable:
    goal: 近乎默片。时间的液态感。…
    plant: 手帕                          # 埋物证覆盖（→ cost/foreshadow/mustGain 联动）
    gap_focus: []                       # 推进/承接/保护之外临时加注的缺口（渲染器校验 ID 存在）
    scenes:
      - 1: 上章末，目录在抽屉里翻了个身…
      - 2: …
    cost: 【角色代价: 咽回的话】…
    hook: 【钩子类型: 认知缺口】…
    foreshadow: 【新伏笔: 手帕→同型回收体系】…
```

---

## 3. 字段可编辑性（核心决策）

| 字段 | 来源 | 可编辑 | 理由 |
|---|---|---|---|
| `pov` | renderer 派生 | 只读（校验态） | POV 合法性由渲染器保证，作者换 POV 走「重新渲染」 |
| `vol / cost_prefix` | volume_tones.yaml | 只读 | 卷基调是作者意图的权威源，UI 不改 |
| `goal` | composeGoal | ✅ 可编辑 | 章方向的最大杠杆 |
| `scenes[i]` | composeScenes | ✅ 可编辑（逐 beat） | 节拍编排 |
| `plant` | extractPlant 启发式 | ✅ 可编辑 | 启发式不可靠时的作者修正，联动 cost/foreshadow/mustGain |
| `gap_focus` | loadGapDirectives | ✅ 可编辑（追加） | 临时改缺口重点，不污染 cognitive-gaps.yaml |
| `cost / hook / foreshadow / mustGain` | compose* | ✅ 可编辑 | 协议前缀 + 叙事文本整段可改 |
| `chapter / wordTarget / location / time` | derive | 只读 | 机器派生 |
| `_plan_note` | renderer | 只读 | serializer 不读，仅下章「承接」用，UI 不暴露 |

**约束**：可编辑字段以**覆盖参数**回传（`{ goal?: string, scenes?: Record<number,string>, plant?: string, gap_focus?: string[], cost?: string, hook?: string, foreshadow?: string }`），渲染器 merge 进 plan 时**重新过一遍卫生规则**（前缀 ≤2/字段、gap ID 真实、POV 合法、白名单覆盖），不合格拒绝 commit。

---

## 4. commit 契约 · `POST /api/chapters/:ch/commit`

```yaml
request:
  overrides:            # 与 preview.editable 同构，缺省 = 不改
    goal: …
    plant: 铜钥匙
    gap_focus: [gap_007]
    scenes: { "1": …, "2": … }
    cost: …
    hook: …
    foreshadow: …
  force: true           # out_path 已存在时需显式确认（= CLI --force）

response:
  ok: true
  written_to: novel/_system/chapter_plans/chapter_0003.yaml
  validation:           # 落盘前渲染器重跑的校验
    pov: ok
    gap_ids: ok
    prefixes_per_field: ok
    whitelist_coverage: ok
```

失败即 4xx + `validation` 明细（如 `{ ok: false, error: 'gap_focus 含不存在 ID: gap_999' }`），**不落盘**。

---

## 5. 实现要点（供 2 周周期）

1. 渲染器暴露一个 `renderPreview(ch, { overrides })` 纯函数（现 `buildChapterPlan` 加 `overrides` 参数即可，**不改磁盘行为**）。
2. Studio Server 加 2 个薄端点（`/preview`、`/commit`），各自内部调渲染器函数；**不碰** LOCKED orchestrator。
3. 前端抽屉 = 只读 audit 区（上半）+ 可编辑表单（下半）+ 三个按钮（确认执行 / 重新渲染 / 取消）。
4. commit 的 `force` 默认 false，`overwrite: true` 时抽屉内弹确认。
5. 协议卫生规则（§7.3/§7.4）在 commit 时由渲染器统一执行，前端不做规则判断，只展示错误。
