# 06 — Phase 4 Reverse-Attack Audit

**Mode:** ADVERSARIAL DESIGN AUDIT · READ-ONLY  
**Target:** `docs/design/phase-4/01`–`05` DRAFT (not sealed)  
**Code / Golden / Design Contract files:** **NOT MODIFIED**  
**Rule:** Success = find real bypasses; also prove which attacks the draft **does** block.

---

## 0. Audit Stance

This audit does **not** try to prove the Design Gate works.

It tries to prove the draft can still manufacture:

```text
pseudo-Choice · pseudo-Agency · pseudo-Character Causality Authority
```

without sufficient narrative evidence — especially via the four laundering loops named by Human.

---

## 1. Attack: Candidate Option Models A–E

| Model | Path | Attack | Verdict |
|-------|------|--------|---------|
| **A** | Character SR → Candidate Option | Does SR become Option Generator? | **UNSAFE** if SR invents “可做 X” without prose/Actual grounding; **PARTIALLY SAFE** only if SR stores *typed subjective availability already evidenced* and never feeds L1. Draft **rejects** SR→L1 but **OPEN-1 leaves A live** for production. |
| **B** | Narrative Evidence → Candidate Option | Observer infers options never in character model? | **UNSAFE** if “Candidate Option” = generated list from prose implications (E5/env). **PARTIALLY SAFE** if layer is only *Access evidence classes* (E1/E2/E4) with no open generation — which is L1 Evidence, not a separate Option object. Naming collision risk. |
| **C** | World Possibility → Candidate Option | Collapse objective into subjective? | **UNSAFE** — R1 exists in draft but OPEN-1/Candidate naming invites C as default impl. |
| **D** | Authored Option Seed → Candidate Option | Seed + Access check ⇒ Character Choice? | **UNSAFE** — Access alone never yields Choice (Access ∧ Agency ∧ SubjectPresent). Draft states conjuncts but **does not seal production path** that could mint Choice from `causalChain.options` + fabricated Access. |
| **E** | Hybrid | Boundary blur World/SR/Evidence/Option/Access/Choice | **OPEN / UNSAFE until OPEN-1** — hybrid is where laundering hides. |

**Do not pick a winner for convenience.**  
**Implication:** STOP-1 remains justified; sealing without OPEN-1 resolution would be unsafe.

---

## 2. Attack: L1 Observer + LLM Plausibility

| Prose | Inference | Legal L1 | Illegal |
|-------|-----------|----------|---------|
| 「他看着门。」 | 「他可以离开。」 | **UNKNOWN** (E5-class surface; no Access/Agency formation) | Option generation / Access from world prop |
| 「她知道钥匙在桌上。」 | 「她可以拿钥匙逃走。」 | Fact Access ≠ Option Access → **not Access for escape**; L1 **UNKNOWN** for Choice | Fact→Option Access; LLM invents path |
| 「他很害怕。」 | 「他可能选择逃跑。」 | Fear ≠ Choice; **UNKNOWN** | Emotion→Option / Agency |
| 「门是开的。」 | 「角色拥有离开的选择。」 | World Possibility only → **UNKNOWN** | World→Option Access / Choice |

**Draft defense:** R1, R2, R11, R12, E5 insufficient, L1 ≠ generator.  
**Vulnerability:** Draft forbids open generation in principle but **does not specify extraction I/O** (allowed labels vs free text). An LLM “classifier” that outputs invented options still fits a naive reading of “semantic classification.”

| Severity | **CRITICAL** (implementation drift) |
| Required Design Change (proposal only) | Constrain L1 LLM I/O to closed evidence labels (E1–E5 / Agency cue classes / SubjectAbsent markers) — **no free-form option strings**. Extension of Golden, not conflict. |

---

## 3. Attack: Fact Access vs Option Access

| # | Scenario | Can Option Access be claimed? | Why |
|---|----------|-------------------------------|-----|
| 1 | Knows “door open”; never considers leaving | **NO** | Fact ≠ Option Access (R2) |
| 2 | Knows “I can physically run”; situation never considers running | **NO** | Capability ≠ situational Option Access |
| 3 | Sees gun on table; never considers taking it | **NO** | Perception of object ≠ Access to “take gun” |
| 4 | Says 「我可以从门离开」 | **YES for Access (of that path)** — typically E1/E4-class; **≠ Choice alone** | Explicit self-ascribed availability; still need Agency ∧ SubjectPresent for VALID |
| 5 | Prior belief “I can always leave”; now door locked | **NO automatic current Access** | Historical ≠ current (see §11) |

**Draft defense:** R2, E levels, OPEN-2 noted.  
**Vulnerability:** Phase 3.2 Fact Access in SR could be misread as Option Access by implementers; draft warns but **no positive schema wall**.

| Severity | **HIGH** |
| Required | Explicit non-promotion rule: `SR.awareness/belief ↛ Option Access` (contract seal) |

---

## 4. Attack: Agency Chains

| Attack | Must | Draft | Held? |
|--------|------|-------|-------|
| A Plan → Action → Agency | FAIL | Plan ≠ Agency; R10 | **Blocked in text**; production still does Plan→Writer→Action (**runtime contamination**, not contract approval) |
| B Pressure → Action → Agency | FAIL | R5 | **Blocked in text** |
| C Desire → Action → Agency | not auto-pass | Desire ≠ Choice; Desire classified | **Blocked as automatic**; weak on “authored desire in prompt ⇒ Writer agency prose” |
| D SR (belief/fear/…) → Action → Agency | not auto-pass | SR ≠ Choice; SR not L1 input | **Blocked for L1**; production OPEN |
| E Considers X → later does X | ? | Not fully specified | **VULNERABLE** — temporal proximity / consider→do not sealed |

**Attack E detail:** Explicit consider-then-do is **necessary-looking but not sufficient** without *t*-local narrated internal state linking consideration to the act (Golden Agency = narrated internal state **at moment t**). Cross-beat consider→do without local link → should be **UNKNOWN**, not VALID.

| Severity | **HIGH** (E); **CRITICAL** if production treats Desire/SR as Agency |
| Required | Seal: consideration at t0 ↛ Agency at t1 without local evidence; Desire/SR ↛ Agency |

---

## 5. Attack: Subject Presence ≠ Grammar

| Prose | Subject Presence | Agency | Choice (L1) |
|-------|------------------|--------|-------------|
| 她被人推下楼。 | Not auto-Absent (patient of violence ≠ SubjectAbsent set) | Likely insufficient / acted-upon | **UNKNOWN or INVALID only if SubjectAbsent evidenced** — not grammar |
| 他被迫交出钥匙。 | Present unless SubjectAbsent | Ambiguous — coercion without取舍 → like U08 | **UNKNOWN** (wording alone) |
| 她主动把钥匙交了出去。 | Present | Possible if intentional cue | May be VALID if Access+Agency evidence; 「主动」helps Agency but Access still needed |
| 他睡梦中打开了门。 | **Absent** (sleep) | N/A | **INVALID** |
| 她在意识清醒时挣扎后终于松手。 | Present | Strong (清醒+挣扎+终于) | Likely **VALID** if Access also shown |

**Draft:** Rejects grammatical rule — **SAFE** against both auto directions.  
**Severity:** SAFE (Presence definition).

---

## 6. Attack: Coercion Triplet

| Pattern | Golden | Draft | Held? |
|---------|--------|-------|-------|
| gunpoint + conscious tradeoff | L1-P07 VALID | aligned | **YES** |
| gunpoint +「只能」+ no tradeoff | L1-U08 UNKNOWN | aligned | **YES** |
| unconscious + another acts | L1-I06 INVALID | aligned | **YES** |

**Do not weaken.** Draft holds. **SAFE.**

---

## 7. Attack: Choice-like Contamination Inventory

| Object | Mistaken for Character Choice? | Classification (narrow) |
|--------|-------------------------------|-------------------------|
| plan.choice / scene.choice / deriveSceneChoice | **YES high** | **9 Contamination** (names “choice”) / also **7 Plan Instruction** |
| causalChain.options | YES if treated as Character options | **2 World/Plan Possibility** + **9** if framed as character’s |
| causalChain.choice | **YES** | **9 Contamination** |
| beat.choice / choiceHint | YES | **6 Opportunity** / **3 Situation** / **9** if “Decision” |
| Beat Library Decision / FAKE_CHOICE | **YES** | **9 Contamination** |
| characterPush / desire | YES if “will choose” | **5 Desire** |
| pressure | If Pressure→Agency | **4 Pressure** |
| scene.goal / beat.action | YES (“must do X”) | **7 Plan Instruction** |
| Writer instructions | YES | **8 Writer Realization** |
| — | None of the above is **1 Character Causality Authority** | |

No deletes / renames this round.

---

## 8. Critical Attack: Narrow “Choice-like” Definition

**Reject freezing Proposal F as:** “any object containing an action.”

### Legal (NOT Choice-like Contamination)

| Kind | Example |
|------|---------|
| World Possibility | 「逃跑是一个可能的行动路径。」 |
| Pressure | 「角色受到离开的压力。」 |
| Narrative Situation | 「场景存在留下/离开的冲突。」 |
| Plan Instruction (non-authority) | 「本场目标：迫使对峙升级」without “character chose/decided” |
| Opportunity | 「门开着，提供离开条件」 |

### Candidate Choice-like Contamination (analyze, not auto-freeze)

An object is **Choice-like Contamination** iff it asserts **Character Causality Authority** without L1-grade evidence / without sealed production authority — including claims that:

| Claim pattern | Why dangerous |
|---------------|---------------|
| character **chose** X | Mints Option Chosen |
| character **decided** X | Same |
| character **will** choose X | Future Choice Authority |
| character **should** choose X | Normative Choice Authority |
| character **must** choose X *(as character decision)* | See §14 — may be constraint OR contamination |
| X is character’s **selected** action | Selected = Chosen |
| Action **attributable** to character without evidence | Direct Causality claim |

**Not contamination by default:** action verbs in Situation/Pressure/Possibility; leave/stay/trust/fight as **world/scene semantics**.

| Severity | **HIGH** if Proposal F frozen broad; draft already warned “care” |
| Required before seal | Replace Proposal F freeze with **narrow Choice-like = Causality Authority claim** definition above |

**Do NOT freeze broad F now** — Human adjudication confirmed.

---

## 9. Attack: Writer Authorization Gap

**Input soup:** scene.goal + beat.action + pressure + desire + character_sr + causal_chain + world_possibility  

**Writer:** 「她决定逃走。」 when only fear + open door evidenced upstream.

| Question | Answer |
|----------|--------|
| Legal as Character Causality Authority? | **NO** |
| Missing authority? | Sealed **production Action Intent / Character Causality attribution** (OPEN-4) — **not** Plan, Desire, or Writer |
| Ban Writer from writing decisions? | **NO** — realization still needed when authorized |
| Laundering risk? | Prose becomes L1-readable evidence → see Loop ① |

**Draft:** Writer ≠ Choice Authority (candidate).  
**Gap:** No sealed rule: *Writer may realize decision prose only when production attribution exists* OR *L1 VALID on Writer-origin decision prose must not mint production Choice*.

| Severity | **CRITICAL** |
| Required | Dual wall: (a) production authorization before decision realization; (b) L1 Judgment ≠ production Choice mint (already hinted in §0 scope split — **must seal**) |

---

## 10. Attack: Actual ≠ Choice

```text
Writer → Prose → Actual
```

| Claim | Verdict |
|-------|---------|
| Writing action into prose makes it extractable Actual? | **Usually YES** under Phase 1 Event Foundation (text-grounded) — subject to extractor rules |
| Actual proves Character Chose? | **NO** — R8 Action Happened ≠ Character Chose |
| Validation boundary for Choice? | Must be L1 (observation) and/or sealed production attribution — **not** Actual reverse authority |

**Draft:** R8 stated.  
**Vulnerability:** Loop ④ Actual→Choice not fully sealed as **forbidden consumer edge**.

| Severity | **CRITICAL** |
| Required | Explicit: `Actual ↛ Choice Authority`; Actual may update facts/SR awareness only |

---

## 11. Attack: Circular Authority / Four Dangerous Loops

### Loop ① Plan → Writer → Prose → L1 → “proves Plan choice”

| Step | Draft stance | Bypass? |
|------|--------------|---------|
| Plan instructs action | ≠ Choice | OK |
| Writer realizes Plan | ≠ Authority | **Missing production gate** |
| Prose contains decision cues | L1 may read | **Golden-legal** |
| L1 VALID | Judgment only | Draft says ≠ ontological Choice |
| System treats VALID as “Character chose Plan” | **FORBIDDEN if sealed** | **NOT SEALED** → **laundering WORKS** |

**Attack SUCCESS.** Severity: **CRITICAL**.

### Loop ② World → Candidate Option → Access → Choice

Draft R1 + conjuncts should reject. OPEN-1/C leave **impl path open**.  
**Attack PARTIAL SUCCESS** (ontology hole). Severity: **CRITICAL** until OPEN-1 closed safely.

### Loop ③ SR → “可能做 X” → Candidate Option → Choice

Draft rejects SR→L1. Production SR→Option **OPEN**.  
**Attack PARTIAL SUCCESS**. Severity: **CRITICAL** if SR Option Generator allowed.

### Loop ④ Writer → Action → Actual → “Actual proves Choice” → SR

R8 + SR updater forbids Choice writes today (Phase 3.2), but contract doesn’t freeze Actual↛Choice.  
**Attack SUCCESS as semantic bypass.** Severity: **CRITICAL**.

### Other circles

| Pattern | Verdict |
|---------|---------|
| SR says chose → Choice → SR | **authority laundering** — forbid SR Choice claims |
| Plan → Writer → L1 proves | = Loop ① |
| Writer-created evidence as sole Choice proof for production | **post-hoc / self-confirming** — CRITICAL |

**Human criterion:** *any one of ①–④ still able to hold ⇒ cannot seal.*  
**This audit:** **① and ④ hold as unresolved CRITICAL; ② and ③ hold via OPEN holes.**

---

## 12. Attack: Historical Evidence

```text
Scene 1: considered leaving
Scene 5: leaves
```

Scene 1 **must not** auto-establish Scene 5 Choice Formation.  
Need *t*-local Access ∧ Agency ∧ SubjectPresent in Scene 5 prose (for L1) / sealed production rules.

**Draft:** Incomplete (OPEN / Agency E gap).  
| Severity | **HIGH** |
| Required | Explicit historical non-transfer rule |

---

## 13. Attack: Relevance / Knowledge / Interpretation

```text
knows X · understands X
↛ cares about X
↛ considers X actionable
↛ Option Access
↛ will choose X
```

Relevance must not silently become Desire or Choice.

**Draft:** Phase 3.2 fields exist; Phase 4 draft does not fully attack relevance.  
| Severity | **MEDIUM–HIGH** |
| Required | Freeze: Relevance ↛ Desire ↛ Access ↛ Choice |

---

## 14. Attack: Irrationality

Objectively terrible option **must not** make L1 INVALID.  
L1 ≠ rationality judge (L2+ if anywhere).

**Draft:** R7. **SAFE** if sealed. Extension aligned with Golden (attributability).

---

## 15. Attack: 「必须 / 只能 / 不得不」

| Reading | Not automatic |
|---------|---------------|
| External constraint description | ≠ Subject Absence; ≠ Agency |
| Character internal judgment | May support Agency if取舍 evidenced |
| Author/Plan instruction | ≠ Character Choice |
| Conscious coerced tradeoff | May be VALID (P07) |
| 「只能」without tradeoff | UNKNOWN (U08) |

Wording alone ↛ Absence and ↛ Agency.  
**Draft:** Coercion triplet helps; general 必须 lexicon **not fully specified**.  
| Severity | **MEDIUM** |
| Required | Lexical non-automatic rule for 必须/只能/不得不 |

---

## 16. Golden SPEC Alignment Check

| Draft rule | vs Golden |
|------------|-----------|
| L1 prose-only input | **Explicitly supported** |
| Access E1–E5 / L1-U03 | **Explicitly supported** |
| Agency narrated internal state | **Explicitly supported** |
| SubjectAbsent set / P07 U08 I06 | **Explicitly supported** |
| VALID ≠ ontological Choice | **Explicitly supported** |
| R1–R3, R4–R8 style | **Implied** by three boundaries + epistemology |
| R9 Writer ≠ Causality | **Extension** (production) — not conflict |
| R10 Plan ≠ Choice | **Implied** (Never from Planner) |
| R11–R12 LLM / Option gen | **Implied** by iron law; I/O constraint = **extension** |
| Scope split Judgment vs Production | **Extension** — necessary; not conflict |
| SR→L1 | **Conflict** (correctly rejected) |
| Broad Proposal F | **Extension risk** — over-broad vs narrative planning |
| Production Action Intent authority | **Extension OPEN** — not Golden |

Do not upgrade interpretation to freeze without Human seal.

---

## 17. Adversarial Matrix

| Attack | Expected Result | Current Contract | Vulnerability | Severity | Required Design Change |
|--------|-----------------|------------------|---------------|----------|------------------------|
| World → Option | reject auto | R1 stated; OPEN-1 | Ontology hole invites collapse | **CRITICAL** | Close OPEN-1 without World→Option |
| Fact → Option Access | reject auto | R2; OPEN-2 | SR Fact misread as Option Access | **HIGH** | Non-promotion rule |
| SR → Option | reject as generator | Rejects SR→L1; production OPEN | Loop ③ | **CRITICAL** | Forbid SR Option generation; separate evidence vs authority |
| LLM → Option | reject generation | R11/R12 | No closed I/O | **CRITICAL** | Closed-label extraction only |
| Pressure → Agency | reject | R5 | Runtime Writer path | **HIGH** (runtime) / SAFE (text) | Seal + later enforce |
| Plan → Agency | reject | R10 | Loop ① | **CRITICAL** | Anti-laundering walls |
| Desire → Agency | reject auto | Desire classified | Prompt→Writer | **HIGH** | Desire ↛ Agency / Choice |
| Action → Choice | reject auto | R8 | Weak Actual edge | **CRITICAL** | Actual ↛ Choice |
| Writer → Choice | reject authority | Candidate Writer boundary | No auth gate; decision prose | **CRITICAL** | OPEN-4 + realization gate |
| Prose → Choice | Judgment ≠ mint Choice | §0 scope split | Easy to ignore | **CRITICAL** | Seal: L1 VALID ↛ production Choice |
| Actual → Choice | reject reverse | R8 only | Loop ④ | **CRITICAL** | Explicit forbidden edge |
| Grammar → Presence | reject | Rejected | — | **SAFE** | — |
| Coercion → Absence | reject | P07/U08/I06 | — | **SAFE** | — |
| Historical SR → Current Choice | reject auto | Incomplete | Cross-scene transfer | **HIGH** | Historical non-transfer |
| Rationality → L1 | reject | R7 | — | **SAFE** (if sealed) | Seal R7 |
| “Must” → Absence | reject auto | Partial | Lexicon gap | **MEDIUM** | Lexical rule |
| Plan → Writer → L1 | reject laundering | Incomplete | **Loop ① SUCCESS** | **CRITICAL** | Dual wall (§9) |
| Broad Choice-like ban | must not kill Situation | Proposal F care note | Over-broad freeze risk | **HIGH** | Narrow Choice-like def only |

---

## 18. What the Draft Successfully Blocks (attacks that fail)

These attacks were attempted and **fail against the draft text** (if Human seals and implementers obey):

1. Grammatical subject ⇒ Presence / non-subject ⇒ Absence  
2. Coercion ⇒ Subject Absence (triplet intact)  
3. Irrationality ⇒ Invalid (R7)  
4. Reader counterfactual ⇒ Access (Golden + R3)  
5. Environmental plausibility alone ⇒ Agency (Golden + R4)  
6. Feeding Plan/SR/canon **directly** into L1 Observer input  
7. Treating L1 as L2 rationality / best-option judge  
8. Equating Free Will with Attributability  

**Note:** Blocking in text ≠ blocking in runtime. Archaeology contamination remains live in code; this audit does not claim runtime safety.

---

## 19. Subtraction Check (no new Engines)

| Vulnerability | Prefer |
|---------------|--------|
| Loop ① / ④ | Authority restriction + input restriction + “L1 ≠ mint Choice” |
| LLM option invent | Deterministic closed I/O validation |
| OPEN-1 | Ontology contract, not Option Generator Engine |
| Broad F | Narrow contamination definition |

**No new Engine required to document fixes.** Any Engine remains DESIGN PROPOSAL ONLY.

---

## 20. Final Verdict

```text
PHASE 4 REVERSE-ATTACK AUDIT

STATUS:
BLOCKED

CODE CHANGED:
NO

GOLDEN SPEC CHANGED:
NO

DESIGN CONTRACT CHANGED:
NO
```

### CRITICAL VULNERABILITIES

1. **Loop ① Plan→Writer→Prose→L1 laundering** — L1 may VALID Plan-injected decision prose; draft does not seal “VALID ↛ production Choice” + Writer realization gate.  
2. **Loop ④ Actual→Choice reverse authority** — R8 stated but Actual↛Choice edge not sealed.  
3. **OPEN-1 / Models A–E** — Candidate Option ontology hole allows World/SR/Authored→Option collapse (Loops ②③).  
4. **LLM L1 without closed I/O** — plausibility can invent Options (door/key/fear examples).  
5. **Writer decision prose without production attribution (OPEN-4)** — manufactures Choice-shaped narrative then launders via L1/Actual.

### HIGH VULNERABILITIES

1. Fact Access / SR fields → Option Access drift  
2. Desire / Pressure → Writer Agency prose (runtime)  
3. Historical consider→later do without *t*-local link  
4. Broad Proposal F freeze would kill legitimate Situation/Pressure/Possibility  
5. Relevance → actionable/Choice silent promotion  

### SAFE BOUNDARIES (draft holds under attack)

- Grammar ≠ Subject Presence  
- Coercion triplet P07 / U08 / I06  
- L1 ≠ L2 rationality judge (R7)  
- Direct Plan/SR as L1 Observer **inputs** rejected  
- Cause/Pressure ≠ Agency **as stated principles**  
- Exists ≠ Accessible ≠ Chosen **as principles** (ontology of middle term still OPEN)

### OPEN DESIGN QUESTIONS

- OPEN-1…OPEN-6 remain  
- Narrow Choice-like Contamination definition (this audit proposes candidate; **not frozen**)  
- How production authorization interacts with Writer without banning decision narration  
- Whether L1 is allowed to run on production prose for **audit-only** vs **authority**  

### REQUIRED CONTRACT CHANGES BEFORE SEAL

1. Seal **anti-laundering**: `L1 VALID ≠ production Character Choice mint`.  
2. Seal **Actual ↛ Choice Authority**.  
3. Seal **Writer realization gate** (authorization source = OPEN-4, not Plan).  
4. Close **OPEN-1** without selecting unsafe Models A/C/D as L1 path.  
5. Add **closed-label L1 extraction** constraint (no free option generation).  
6. Replace broad Proposal F with **narrow Choice-like = Causality Authority claim**.  
7. Seal **historical non-transfer** + **Relevance ↛ Access/Choice** + **必须 lexicon non-auto**.  
8. Explicit **SR/Fact ↛ Option Access** non-promotion.

*(Document as Contract v0.2 revision task — **not done this round**.)*

### IMPLEMENTATION READINESS

```text
BLOCKED
```

Not ready for Human Seal until CRITICAL items addressed in a revised contract draft.  
**Not** ready for Phase 4 implementation.

```text
BLOCKED → STOP
```

Await Contract revision → second attack pass optional → only then Human:

```text
PHASE 4 DESIGN GATE APPROVED
```
