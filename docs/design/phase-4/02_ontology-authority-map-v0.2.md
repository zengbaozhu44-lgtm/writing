# 02 — Ontology / Authority Map v0.2

**Companion to:** Semantic Contract v0.2  
**Supersedes:** `02_authority-map.md` (v0.1)

---

## 1. Object Map

| Object | Meaning | Can establish | Cannot establish | Legal producer (draft) | Forbidden promotion |
|--------|---------|---------------|------------------|------------------------|---------------------|
| **World Possibility** | Path possible in world | Objective possibility; Situation fuel | Option Access, Agency, Choice, Candidate Option as Character Option | Canon/Actual world; Plan-as-situation; physics | World → Option / Access / Choice |
| **Fact** | World or text-grounded fact | Occurrence / property | Choice | Actual; authored canon (as fact) | Fact → Option Access / Choice |
| **Fact Access** | Character knows/perceives fact | Epistemic awareness | Option Access, Agency, Choice | Actual+IB→SR; prose evidence | Fact Access → Option Access |
| **Narrative Evidence** | Prose cues under Golden taxonomy | E1–E5, Agency cues, SubjectAbsent markers | Ontological Choice; free Options | Prose surface | Evidence field as Observer input; inventing Options |
| **Character SR** | Subjective projection | Fact subjectivity (awareness, belief, interpretation, stance, relevance) | Automatic Options, Access, Agency, Choice; L1 input | SR updater (Actual+IB+matrix+authored) | SR → Option gen; SR → L1; SR → Choice |
| **Candidate Option** | **OPEN** | — | Must not be auto-filled by World/SR/Plan/LLM | **NONE sealed** | World/SR/Plan/LLM → Option |
| **Option Access** | Path available-to-self at *t* | Access dimension of formation | Choice alone | L1 judgment from prose (E1/E2/E4); production store **OPEN-2** | Fact/capability/desire/relevance/world → Option Access |
| **Agency** | Narrated internal-state trace at *t* | Agency dimension | Choice alone | L1 from prose; production **OPEN-3** | Plan/Pressure/Desire/SR/history → Agency |
| **Subject Presence** | Not SubjectAbsent | Presence dimension | Choice alone; grammar | L1 from prose | Grammar ↔ Presence auto |
| **L1 Judgment** | VALID/UNKNOWN/INVALID | Question A only | Production Choice mint | L1 Observer | L1 VALID → production Choice |
| **Choice (production)** | Instantiated Character Choice / Action Intent | Question B (if sealed) | — | **OPEN-4** only | Plan/Writer/Actual/Desire/L1 alone |
| **Action** | Narrated or Actual act | That something occurred | That it was Chosen | Writer prose; Actual extract | Action → Choice |
| **Action Intent** | Authorized intent for realization | Permission for Writer to realize Choice narratively | — | **OPEN-4** | Plan/Desire/Pressure/Writer pref |
| **Writer** | Realization layer | Prose | Choice Authority | LLM under prompts | Writer → Choice Authority |
| **Prose** | Narrative text | Surface for Actual + L1 input | Choice Authority by itself | Writer | Prose → Choice without L1/OPEN-4 rules |
| **Actual** | Text-grounded events | Occurrence, consequences, SR awareness (legit) | Choice, Option, Access, Agency | Event extractor | Actual → Choice / Option / Access / Agency |

---

## 2. Forbidden Edges (summary)

```text
World Possibility ↛ Candidate Option (as Character Option)
World Possibility ↛ Option Access
World Possibility ↛ Choice

Fact / Fact Access ↛ Option Access
SR.* ↛ Option Access / Agency / Choice / L1 input
SR ↛ automatic Option generation

Option existence ↛ Option Access
Option Access ↛ Choice

Plan / Desire / Pressure / causalChain ↛ Choice Authority
Plan / Desire / Pressure / SR belief ↛ Agency

L1 VALID ↛ production Character Choice
Actual ↛ Choice Authority
Action Happened ↛ Character Chose
Writer ↛ Choice Authority

Historical evidence ↛ current Choice authority
Relevance ↛ Desire / Option Access / Agency / Choice
Consider(t0) ↛ Agency(t1) without local evidence
```

---

## 3. Legal / Context-only edges

| Edge | Mark |
|------|------|
| World Possibility → Situation / Pressure / Opportunity (as narrative fuel) | **LEGAL** (not Choice) |
| Plan → Narrative Instruction / Situation | **LEGAL** as Plan Instruction; **FORBIDDEN** as Choice Authority |
| Actual → SR awareness (fact) | **LEGAL** where IB allows |
| Actual → State Evolution | **LEGAL** |
| Prose → L1 Evidence → L1 Judgment | **LEGAL** |
| L1 Judgment → Golden audit / read-only diagnostics | **LEGAL** |
| L1 Judgment → production Choice | **FORBIDDEN** |
| OPEN-4 Action Intent → Writer realization | **OPEN** (required if authoritative Choice narration) |
| Writer → Prose → Actual | **LEGAL** for occurrence; **FORBIDDEN** as Choice proof |

---

## 4. Competing illegal claimants (runtime contamination — classified, not fixed)

| Artifact | If asserts Causality Authority | Default class if not |
|----------|--------------------------------|----------------------|
| plan.choice / causalChain.choice | Choice-like Contamination | Plan Instruction / artifact |
| causalChain.options | Contamination if “character’s options” | World/Plan Possibility |
| beat.choice / Library Decision | Contamination / FAKE_CHOICE risk | Opportunity / Situation |
| desire / characterPush | Contamination if “will choose” | Desire |
| pressure | If Pressure→Agency/Choice claimed | Pressure |
| scene.goal / beat.action | If “character decided” | Plan Instruction |
