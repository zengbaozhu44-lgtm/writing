# EO-P4-World-Consequence-Bridge-01 — Implementation Record

```text
MODE: IMPLEMENTATION · PRODUCTION MAIN CHAIN
DESIGN GATE: phase-4-minimal-character-action-world-consequence-design-gate.md (approved semantics)
STATUS: PASS WITH KNOWN LIMITATIONS
CODE CHANGED: YES
SCHEMA CHANGED: NO (scene-level carrier only)
```

## Implemented

- `packages/inkos-brain/src/causality/world-consequence-truth.js`
  - `WORLD_CONSEQUENCE_TRUTH_VERSION = 'world-consequence-truth-1'`
  - `WORLD_CONSEQUENCE_PROVENANCE = 'character_action_world_consequence'`
  - `deriveWorldConsequenceTruth({ characterActionTruth, occurrences|actualEvents, sceneText })`
    — fail-closed, deterministic, no LLM
  - `attachWorldConsequenceTruth(scene)` — carrier `scene.worldConsequenceTruth`;
    does not mutate `actualEvents` / SR / State
  - `isActionEchoOfY` / `isGroundedInAftermath` / `occurrenceYieldsGroundedWorldChange`
    — correspondence predicates (gate §D/§J)
- Wired in `packages/inkos-runtime/src/pipeline/orchestrator.js` immediately after
  `attachCharacterActionTruth` (post-Actual, pre-CharacterSR), with backfill into
  `intent.scenes[].worldConsequenceTruth`.
- Tests: `scripts/test-eo-p4-world-consequence-bridge-01.js`
  (`npm run test:eo-p4-world-consequence-bridge-01`) — 47 asserts, all pass.
- Regression: causal-bridge-01, character-action-bridge-01, story-route,
  event-foundation, state-evolution, character-sr — all PASS.

## Correspondence semantics (fail-closed)

W candidates on the SAME occurrence chain as Character Action (`occurrenceRef`):

1. `StoryEvent.consequence` — accepted only if not action-echo of Y AND a
   contiguous normalized ≥4-char window appears in the aftermath region of
   `scene.text` (at/after the occurrence's evidence offset).
2. `stateChanges` entries — echo-prefixed labels (`action:`/`speech:`/`presence:`/`open_loop:`)
   are stripped to payload and must independently survive echo + grounding checks.

Rejected (→ `absent`): canned extractor consequences (`场面动作已发生：…` etc. — echo markers
and/or ungrounded), `action:X:verb` restatements, ungrounded W, occurrence-chain break,
Character Action not asserted, foreign authority probes (plan/director/beat/writer/
attribution/sr/stateChanges-alone), forbidden record fields.

## Known limitations

- Grounding is a deterministic ≥4-char normalized window match — conservative;
  valid literary W phrased entirely differently from the prose will fail-closed
  (recorded, not invented).
- Extractor-level `consequence` strings are mostly canned today, so in current
  production runs most scenes will yield `world_consequence_not_grounded_or_echo`.
  This is correct fail-closed behavior: the bridge does not mint W the text does
  not ground. Richer aftermath grounding is future evidence-extraction work, not
  bridge-authority work.

## NOT authorized this EO (per design gate)

- State consumption of World Consequence Truth (`evolveFromChapter` still runs
  from Actual occurrence only) — requires a future Human Named EO.
- Choice — remains NOT PROVEN; `isChoice: false` on every record.

## Follow-up EO: EO-P4-World-Consequence-Consumption-01 (DONE)

The design gate's reserved "future EO" (STATE ROLE: "evolveFromChapter may later
CONSUME World Consequence Truth") — implemented as consume-only wiring, no new
authority, no engine:

- `actual-events-prompt.js` — `collectPreviousActualEvents` now also collects
  per-scene asserted `worldConsequenceTruth` → `bundle.worldConsequences`;
  `formatActualEventsBlock` renders a `### Proven World Consequences` section
  (consume-only headers, ≠ Choice, continuity obligation). Injected into
  Scene N+1 Writer prompt via `compiler.js` (existing `actualEventsBlock` slot).
- `state-evolution-engine.js` — `collectWorldConsequencesFromScenes` (new,
  exported): reads only asserted `scene.worldConsequenceTruth`; `evolveFromChapter`
  appends `wct:<W>` hints to `evolution.worldHints`, records
  `evolution.worldConsequences`, sets provenance
  `consumesWorldConsequenceTruth` / `worldConsequenceCount`. `canonDelta.timeline`
  remains Actual-only (untouched).
- Production wiring verified: orchestrator attaches WCT per scene → backfill
  `intent.scenes` (Scene N+1 prompt) + same scene refs into
  `chapter-pipeline.js buildStateDiff` → `evolveFromChapter`; `persistScenes`
  (`saveSceneArtifacts`) serializes whole scenes → `ch_XXXX_scenes.json` carries
  `worldConsequenceTruth` for later chapters.
- Tests: `scripts/test-eo-p4-world-consequence-consumption-01.js` (29 asserts,
  all pass; `npm run test:eo-p4-world-consequence-consumption-01`).
- Regression: bridge-01, causal-bridge-01, character-action-bridge-01,
  story-route, event-foundation, state-evolution, character-sr — all PASS.
- Known limitation: the deterministic extractor still emits canned echo
  `consequence` labels, so live chapters mostly yield WCT `absent` until the
  Phase 1.3 LLM-assisted extractor (same schema + validator) lands. Fail-closed
  by design; consumption paths are already proven by tests.

## Follow-up EO: EO-P4-Chapter-Seam-Actual-Readback-01 (DONE)

FIRST REAL BLOCKER found by route rescan: the chapter seam. Chapter N+1 Scene 1
has no same-chapter predecessors, so the Actual/WCT readback silently dropped —
the total route's `... → WORLD CONSEQUENCE → ACTUAL → ... → NEXT SCENE` broke
structurally at chapter boundaries (anchor yaml carries only ops hints:
pov/relationship/emotion/tailExcerpt; `resolvePreviousScenes` is same-chapter).

- `packages/inkos-prompt/src/compiler.js` — new `loadPriorChapterScenesForActual(bookDir, chapter)`:
  loads last ≤2 text-bearing scenes from `ch_(N-1)_scenes.json` (persisted by
  `saveSceneArtifacts`, carries actualEvents + worldConsequenceTruth).
  Consume-only, fail-closed (no file / corrupt JSON / chapter ≤ 1 → []).
  `compileScenePrompt` uses it only when same-chapter prevScenes are empty
  (chapter N+1 Scene 1); same-chapter scenes still take priority (no duplication).
- No new authority: same `collectPreviousActualEvents` / WCT readback semantics;
  Plan fields in persisted scenes cannot enter worldConsequences (tested).
- Tests: `scripts/test-eo-p4-chapter-seam-actual-readback-01.js` (20 asserts,
  all pass; `npm run test:eo-p4-chapter-seam-actual-readback-01`).
- Regression: prompt-regression, prompt-metrics, f1-survival, story-route,
  all four P4 bridge/consumption EOs — PASS. (`test:writer-prompt` fails
  identically on a clean tree — pre-existing fixture issue, not a regression.)

## Follow-up EO: EO-P4-Authored-CADE-Channel-01 (DONE)

FIRST REAL BLOCKER found by route rescan (Character Causality focus): the CADE
producer never existed in production. `writeCADEToChapter` / `createCADE` had
ZERO production callers; production books have no `cade/` sidecar → in real
chapter runs Action Intent Truth / Character Action Truth / World Consequence
Truth were fail-closed-absent everywhere. The entire downstream chain built by
the previous EOs minted nothing in live production.

Legal producer already frozen (EO-P4-Causal-Bridge-01 design gate §B):
"Explicit character-decision authoring into the CADE channel (same *pattern* as
authored Character SR — character-side material, separate semantic channel)".
No Choice involvement (CADE `isChoice: false`; choice/options/agency fields
forbidden). Semantics were frozen; only the channel was missing → pure wiring,
no human judgment needed.

- `planner.js serializeAuthoredPlanToIntent` — authored chapter plan may carry
  `characterDecisions: [{characterId, actionContent, decisionKind?, sceneIndex?}]`
  → `intent.characterDecisions` (explicit channel; NEVER derived from mainGoal /
  scene.goal / causalChain).
- `bridge.js mintCADEFromAuthoredDecisions(bookDir, chapter, intent)` — per-item
  fail-closed mint via `writeCADEToChapter`; `sceneIndex → ch{N}_s{i}` sceneId;
  Choice-shaped fields on an authored decision (options/choice/agency…) are
  REJECTED (never stripped-and-accepted); `decisionKind` restricted to
  decides/commits/self_endorsed/character_decision; sourceRef
  `authored.character_decision`; idempotent (dedupe by CADE id); empty channel →
  no sidecar, no side effects.
- `orchestrator.js` — mints once per chapter run before the scene loop (soft,
  try/catch warn). Existing `attachActionIntentTruthFromCADE` (L440) then picks
  up the sidecar per scene — the pre-existing read side needed no change.
- Tests: `scripts/test-eo-p4-authored-cade-channel-01.js` (26 asserts, all pass;
  `npm run test:eo-p4-authored-cade-channel-01`) — includes full production chain
  authored decision → CADE → Intent → Character Action → WCT asserted, plus
  anti-laundering (mainGoal/scene.goal never scanned; 5 rejection cases).
- Regression: all P4 EOs, story-route, prompt, prompt-metrics, f1-survival,
  event-foundation, state-evolution, character-sr — PASS.

Literary-path note: the chain now runs end-to-end in production when the author
writes character decisions into the authored plan. Without authored decisions
the chain stays fail-closed-absent (correct: an un-authored character decision
must not be invented by Plan/LLM).

## Follow-up verification round: Authored-CADE boundary audit + production integration

### Task 1 — Story Truth boundary audit (PASS)

Full-repo archaeology of every `characterDecisions` read/write:

- ONLY producer chain: human-authored
  `novel/_system/chapter_plans/ch_NNNN.yaml → loadAuthoredChapterPlan →
  serializeAuthoredPlanToIntent (verbatim, no derivation) → intent.characterDecisions
  → mintCADEFromAuthoredDecisions → CADE sidecar`.
- ZERO implicit derivation: no `mainGoal/scene.goal/causal_chain/Director/
  Planner-inference/Reasoner/Writer/Desire/SR → characterDecisions` path exists
  (grep-verified across packages; Director intent-backfill whitelist excludes it).
- The ONLY programmatic writer of chapter_plans YAML is Studio
  `persistChapterPlan` (living-novel-engine.js) — its field whitelist does NOT
  include `characterDecisions`, so the Chapter Director (LLM) cannot inject it.
  Hardened with an explicit refusal (`DIRECTOR_CANNOT_AUTH_CHARACTER_DECISIONS`)
  so future whitelist expansion cannot launder Story Control → Story Truth.
- Scene-level explicit CADE channels (`scene.cade` /
  `characterActionDecisionEvidence` / `characterSideActionDecision`): zero
  production writers.

### Task 2 — Production integration (PASS · `test:eo-p4-authored-cade-production-01`)

Real `RuntimeOrchestrator` over the golden fixture book + deterministic writer
stub, authored plan with `characterDecisions`:

- CADE sidecar written (provenance `character_action_decision`, sourceRef
  `authored.character_decision`, sceneId `ch1_s1`, isChoice false)
- Scene 1: `actionIntentTruth` asserted (Y = authored decision verbatim) →
  `characterActionTruth` asserted (occurrence-backed) → `worldConsequenceTruth`
  correctly **absent** (`world_change_not_grounded_or_echo`) — the deterministic
  extractor only emits canned echo consequences; grounding NOT loosened
- Negative run (authored plan WITHOUT decisions): no sidecar, no Intent/Action/
  WCT anywhere, Actual extraction and chapter production unaffected
  (Plan-only prose produces no Character Causality)

Anti-reverse-mint verified: Writer only returns `scene.text`; no code path
writes CADE except the authored mint; SR/Actual/Desire/Attribution have no
CADE write path; Choice-shaped fields rejected per-item (unit-tested).

Recorded integration gaps (evidence-dependent, NOT wiring gaps):
- WCT-asserted / State-wct-consumption / chapter-seam-WCT are proven at unit
  level but not yet in a full production run — they require Phase 1.3-grade
  aftermath evidence (or a richer extractor) to fire; fail-closed until then.

Pre-existing failures (NOT regressions, verified via git stash on clean tree):
`test:golden`, `test:golden-causal` (causal-block wording drift), `test-living-novel`
(world rebellion assertion). Flagged for the owner; untouched per PRINCIPLE 1.

## HPA-02-L1 — Writer Realization Contract (DONE · PASS WITH KNOWN LIMITATIONS)

Ruling: settled Actual 不可被静默否定（无叙事桥接不得写成冲突状态）；≠ Actual>Plan；
合法 A→新事件→B。Level 1 contract only — enforcement (L2) NOT opened.

Implemented:
- `llm-writer.js` system message 增「已发生事实承接」条款（女王收紧版措辞，不含
  Plan 冲突触发条件，只约束 Writer 如何实现已成立 Truth）。
- Studio `_actionIntentPromptBlock` 双注入 cleanup（studio-llm-writer.js 两处手工
  追加移除；canonical = compiler `action_intent_truth` 模块；orchestrator 先
  attach 后 compile，传入 prompt 必含模块，删除安全；Runtime 无变化）。

Same-condition observation (deepseek-chat, temp 0.85 — 生产模型 401 未验证)：

| Case A (Truth+冲突Plan) | 契约前 N=15 | 契约后 N=20 |
|---|---|---|
| R4s silent reset | 9 (60%) | 5 (25%) |
| R4b explicit bridge | 5 (33%) | 15 (75%) |
| R3 hybrid | 1 (7%) | 0 |

Case B (Truth only) R1 5/5 → 5/5（无回归）；Case C (Plan only) 计划执行 5/5 → 5/5
（行为无变化）。人工全文分类（正则分类器三轮误判后弃用）。

Verdict: 明确行为变化（静默重置 60%→25%，桥接 33%→75%），无新错误桥接；R4s ≠ 0
（L1 = steering，符合预期）→ **HPA-02-L1 PASS WITH KNOWN LIMITATIONS**。
L2 enforcement 未开启；若未来 R4s 需归零，另开 HPA-02-L2 设计门。
已知瑕疵：契约后 A 样本出现 1 例 POV 代词漂移（他/她，N=1 未定性）。
证据：`tmp-observer/case{A,B,C}-*` + `scripts/observe-writer-truth-plan-conflict-01.js`。

## Intent Realization Steering A/B（DONE · 实验性 · 默认不启用 · STOP at correspondence boundary）

裁决边界遵守：correspondence / Character Action ontology / CADE / Authority 零改动；
`formatActionIntentTruthForPrompt` 仅新增两个**默认关闭**的 opt-in 参数
（realizationGuidance 软引导 / realizationGuidanceAnchored 锚定引导），生产路径不变。

三臂各 2 场景×5 次（真实 deepseek Writer → Phase 1.3 LLM 提取+闸门 → 冻结链）：

| 臂 | Character Action | WCT | 机械复读 | 发现 |
|---|---|---|---|---|
| A 现状 | 0/10 | 0 | 0/10 | writer 方法替换（撬锁≠砸玻璃）+ 同义漂移（地图→图） |
| B 软引导 | 0/10 | 0 | 0/10 | 软引导无效：writer 仍把 Intent 当目标级提示 |
| B2 锚定 | 0/10 | 0 | 0/10 | **锚词进入正文 8/10、提取完整捕获动作+aftermath，但对应仍全败** |

B2 失败的精确解剖（非 steering/extraction 缺陷，为**冻结谓词的两个结构属性**）：
1. **连续性要求**：Y 窗口需连续 5 字片段；自然散文把锚词拆开（肘尖砸**向K27柜门的**玻璃 →
   yN 窗口「砸碎档案柜」「档案柜玻璃」均不连续出现）。
2. **单 occurrence 评价**：实现常为**分解动作序列**（举起真图→摸出打火机→火焰舔上纸角），
   无任何单个 occurrence 含 Y 片段；对应无组合能力。

结论（STOP，按裁决不扩权）：Writer-side steering 已尽其所能——B2 证明可让锚词在场、
零机械复读、正文自然；剩余断点全部在 correspondence 语义内部。候选出路（均需女王裁决，
本层不动）：① 接受现状（严格低产）；② **authored anchors**（authored 决策自带锚 token，
对应改为「锚集齐现于单 occurrence」，权威仍在人类+确定性）；③ 作者确认注记通道；
④ LLM 语义匹配（**禁止**——Truth Authority）。
证据：`tmp-ab/results*.json`、`scripts/ab-intent-realization-steering.js`。

## EO-P4-Intent-Realization-Correspondence-V2-01 (IMPLEMENTED / VALIDATED)

按授权实施：CADE optional anchors（三组结构，键白名单，非法整项拒绝）→ Intent Truth
透传 → `evaluateRealization`（ordered chain[excerpt 字面位置] + object 锚分布 + action
锚限 X-occurrence 的 action 字段[R8 纪律] + terminal 锚限终局 grounded 字段[Chain≠Completion]
+ 否定词表[8 项冻结] + 第三方接管防线）→ record `occurrenceRefs[]/terminalOccurrenceRef/
occurrenceRef(别名)`；无 anchors 存量走 v1 逐字节不变；WCT/SR/State/Attribution 零改动。

- 测试：`test-eo-p4-correspondence-v2-01` 27/27（P1-P7 正例、N1-N15 负例含 mediated
  假阳性、v1 byte-compat、anchors 校验链）。
- 回归：15 项全 PASS（三项一度失败为与后台 LLM 提取并发竞争，串行复测全绿）。
- 真实固定 corpus（8 场，重新 LLM 提取，v1/v2 同 occurrence 集）：
  - ch1_s2（目标场景）：v1 absent(content_mismatch) → **v2 asserted**，且
    **WCT asserted（W=纸页哗啦散在地上，terminal grounded）** —— Intent→Action→WCT
    全链首次在真实生产语料贯通；
  - 其余 7 场（非该 Intent 的场景）：v2 全部 absent(no_anchor_coverage) —— **0 误判**。
- 证据：`tmp-stress/v1v2.json`、`tmp-ab/results*.json`。
- isChoice:false 恒定；未触 Choice/L1/L2/Goal/GGC/Survival/Director；无新 ontology primitive。

## SR roster wiring（State→SR 接线补齐，本轮）

重扫描发现：authored 路径 scene 不携带 pov/present/characters → Phase 3.2
`applyCharacterSRAfterActual` 名单恒空 → SR sidecar 空（stress 实测 characterCount:0）。
判定为**接线层缺口**（非封存语义）：封存 API 既有 `opts.extraNames` 通道未被调用。
最小修复：orchestrator 调用点传 `extraNames: collectKnownNames(scene, intent)`
（封存文件零改动；IB 仍由 characterCanAccessActualEvent 逐事件把守）。

- 单点验证：无 pov 场景 + extraNames → SR 逐角色填充（awareness/relevance）。
- 全链复跑（extraction+v2 anchors+SR 接线）：ch1 SR 从空 → 林逸（awareness 11 条，
  逐字 excerpt grounded）。**已知限制**：名单当前 POV 绑定（intent.present），
  非名单角色（苏眠/镜渊）无 SR 槽——增强项非 blocker。
- 本轮 ch1_s2 Character Action absent：writer 随机措辞再次游离锚集 → v2 正确
  fail-closed（固定 corpus 判读中同场景已证 asserted+WCT）。**剩余方差杠杆** =
  启用 B2 锚定 realization guidance（A/B 已证锚词入文 8/10，默认关闭待裁决）。
- 回归 8/8 PASS。

## 承载性扫描轮（State→SR→Survival→Next Scene）+ live 接线（本轮）

A–H 扫描结论：State 产物中 timeline 已被 prompt 消费（p72）；SR 生产供血（上轮接线）；
openLoops 仅由确定性 choice 标签产生、无任何消费者；**Survival 无契约定义（4.4 门明确
❌ 排除）、无 producer、无 consumer；生产链在其缺失下持续运行（实证）→ FUTURE GAP，
非 FIRST REAL BLOCKER**。未把 Planner/openLoops 偷渡为 Survival。

本轮三项落地（均零 ontology 变更）：
1. **anchors → 自动锚定 guidance 接线**（情况 B）：`formatActionIntentTruthForPrompt`
   对携带 anchors 的 Intent 自动附锚定 realization 行（无锚存量逐字节不变；A/B 已验证）。
2. **锚组语义修正**：object/terminal 组 every→some（同义备选）。AND 语义与「锚抗同义
   漂移」的立论自相矛盾——run3 真实提取字段在 AND 下误判 absent、OR 重判 asserted
   （anchor_chain_direct）。单测 29/29 仍绿（单锚用例 AND≡OR）。
3. **LLM 提取双重回退加固**：L1 路径零事件时强制确定性兜底（不劣于现状不变量）——
   修复一次偶发 `ACTUAL_EVENT_REQUIRED` 生产失败（ch1 断→ch2 anchor 缺失连锁）。

LIVE 测量（deepseek 0.85，全生产 prompt，单章×N）：固定 corpus 判读与真实字段重判
**确定性命中**（asserted+WCT）；live 单发命中率受两层随机残差限制——writer 方法替换
（撞门≠砸玻璃）与提取事件选择（锚词在正文但未入 action 字段）。残余杠杆=writer 依从性
（模型/参数/引导强度）与提取事件数——质量调参，非语义缺口。全部回归 PASS。

## L1 Audit-only Production Observation（本轮 · 零 Truth 变更）

按授权以 **diagnostic 模式**挂载 observeL1（`l1/l1-audit.js` + orchestrator soft 旁路 +
`l1_audit/ch_NNNN.json` sidecar）。词汇表 OBSERVED/NOT_OBSERVED/UNKNOWN；输出无
choice/l1_valid/证书词；Plan/Action/Attribution 零影响（反洗白测试锁定）；测试 22/22。

生产观察（双章 corpus，全 4 场 POV）：access OBSERVED / presence OBSERVED /
subject OBSERVED / **agency UNKNOWN（全程）** → l1_candidate UNKNOWN（合法）。
文学漏报核查：ch1_s3「脑子里飞快地过了一遍」（权衡措辞不在冻结 Golden 词表）为
**词表外漏报类**——记录为观察，不扩词表（Golden 冻结）。**未铸造 Choice Truth /
Agency Truth / Option；无新 FIRST REAL BLOCKER**（人物尚在 Choice Formation 门外，
主链不需 L1 即完整运转——4.1 考古与边界文档裁决维持）。

## Phase 3.2 Authored Character SR Channel Wiring（DONE · 授权范围闭合）

EO 限定：「既有 Phase 3.2 authored SR 槽位的生产 wiring 闭合」——非「实现人物自主思考」。

1. `serializeAuthoredPlanToIntent`：`plan.characterSR`（按人物名键控 {
   interpretation:[{of,as}], belief:[…], stance:[{stance,about}] }）→ `intent.characterSR`
   （可选；非法形状 null fail-closed）。producer 侧零改动——既有 `authoredCharacterSR`
   管道 + `readAuthoredBlock` 直达三槽（explicit-only 语义原样）。
2. **投影保全修复（compiler · presentation-only）**：真实预算（character≈519 →
   SR 块上限 388 字）下，SR 块固定 IB 前言（~340 字）+ Awareness 12 条会把
   Interpretation/Belief/Stance 整段挤出 prompt——这是三槽「长期 omit」之后发现的
   **第二个隐形断点**（即便 authored 也到不了 Writer）。修复：无压力时块原样；
   压力下主观三槽优先 + 分组均衡截断（IB 纪律在 Lore Seed/system message 另有两份投递）。
3. 测试 17/17（序列化/槽位+provenance/投影/不强迫 Action 验收/反洗白：goal·mainGoal·
   characterDecisions 永不进三槽；stance 枚举拒绝行动词；SR 不产生 Intent/Action/WCT；
   压力预算保全）。回归 16 项全 PASS。
4. 真实双章文学验证：4/4 场 prompt 含三槽原文；**s1 实证「SR=世界非任务」**——
   belief「管理员不只是一名值夜班的」使 writer 给管理员值班室投以可疑细节的显著感知
   （椅背朝门/没拧紧的杯盖/热气白线），而林逸**选择放轻脚步绕过而非对质**：
   主观世界改变了「看见什么」，没有强迫「做什么」。CAT/WCT 本轮 absent（措辞方差，
   fail-closed 如常）。
禁线核查：无 Actual/Prose/Writer/Plan.goal/characterDecisions→belief；无 SR→Choice/
Action/L1；无自动生成三槽。authored-only + 人类权威 + provenance(source=authored)。

## Route status after this EO

```text
Character Action Truth      IMPLEMENTED + NOW MINTS IN PRODUCTION (authored CADE)
World Consequence Truth      IMPLEMENTED (thin bridge)
Actual readback ← WCT        WIRED (Scene N+1 prompt · Proven World Consequences)
State Evolution ← WCT        WIRED (evolution.worldHints wct: · consume-only)
CHAPTER SEAM Actual/WCT      WIRED (chapter N+1 Scene 1 reads prior chapter scenes)
AUTHORED CADE CHANNEL        WIRED (characterDecisions → CADE → Intent → Action → WCT)
Character SR                 SEALED Phase 3.2 (runs from Actual; not re-wired)
Story Survival / Open Loop   openLoops surfaced in evolution; NO consumer (future gap)
Choice                       NOT PROVEN (reserved for its own node)
```

NEXT SCAN (Step A–G): remaining route positions:

- State → Character SR re-wiring: touches sealed Phase 3.2 → STOP + REPORT if
  ever required; not currently blocking (SR updates from Actual each scene).
- Story Survival / Open Loop: per rule 7, must first show the exact production
  step that cannot continue without a Survival Truth. Today the loop continues
  via Planner control + Actual/WCT readback (now including the seam) → NOT a
  first real blocker (recorded future gap; PRINCIPLE 3 forbids auto-building).
- Choice: the authored CADE channel satisfies Action Intent legally WITHOUT
  Choice (frozen design gate §B); Choice remains NOT PROVEN and reserved for
  its own node. If a future requirement demands machine-derived character
  decisions (L1/L2 formation from SR), that is the Choice node's Human Gate —
  not reachable by wiring alone.

→ No further safely-derivable main-route blocker this scan. Continuing past
this point requires Human semantic judgment (Choice node / Survival semantics)
→ HUMAN DECISION REQUIRED on which to open next.
