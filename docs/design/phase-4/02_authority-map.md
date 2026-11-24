# 02 — Authority Map (Phase 4 Design Gate DRAFT)

**Golden SPEC unchanged.** **No code.**

Legend: `UNKNOWN` · `DESIGN DECISION REQUIRED` · filled cells = evidence-backed draft.

| Object | Ontology | Owner | Legal Producer | Legal Consumer | Allowed Input | Forbidden Input | Authority |
|--------|----------|-------|----------------|----------------|---------------|-----------------|-----------|
| World Possibility | World path possible | Canon/Actual/Plan-as-situation | Actual; Plan (as possibility only); physics/authored world | Planner, Writer (as situation), **not** L1 as Choice | World/Actual/Plan situation | Claiming it is Character Choice | **Not** Choice Authority |
| Character Perception | Subjective intake | Character (future typed) | Actual via IB (Phase 3.2 partial via awareness) | CharacterSR | Actual+IB | Plan/heroKnows as perception | Projection; not Choice |
| Character SR | Subjective projection | Character | Actual+IB+matrix+authored SR | Writer (context); future production TBD | Allowed SR sources only | Plan/Reasoner/Living/heroKnows | Fact subjectivity; **≠ Choice** |
| Candidate Option | **DESIGN DECISION REQUIRED** (OPEN-1) | TBD | TBD | TBD | TBD | Open generation; Plan.options as Character Option | **UNKNOWN until OPEN-1** |
| Access (L1) | Judgment dimension | L1 Observer | Observer from prose evidence E1–E5 | L1 Judgment | Prose (+pov) | SR/Plan/canon/expected/evidence field | Part of L1 only |
| Access (Fact, production) | SR awareness | CharacterSR | Phase 3.2 updater | Prompt; future | Actual+IB | Plan contamination | Fact Access only |
| Option Access | **DESIGN DECISION REQUIRED** (OPEN-2) | TBD | TBD | TBD | TBD | Fact Access auto-upgrade | **UNKNOWN** |
| Agency (L1) | Judgment dimension | L1 Observer | Narrated internal state evidence in prose | L1 Judgment | Prose | Pressure/Plan alone; env inference without text | Part of L1 only |
| Agency (production) | Attribution | **OPEN-4** | TBD | Writer Action Intent | TBD | Plan→Action as Agency | **UNKNOWN** |
| Subject Presence | Judgment dimension | L1 Observer | Prose evidence of subject participation / absence | L1 Judgment | Prose | Grammatical subject alone | Part of L1; INVALID only if SubjectAbsent |
| L1 Evidence | Extracted/classified evidence | L1 Observer | Constrained extraction from prose only | L1 Judgment | Prose | Open option invention | Evidence, not Choice |
| L1 Judgment | VALID/UNKNOWN/INVALID | L1 Observer | Observer | Golden runner; future gates | L1 Evidence | Plan/Reasoner/Writer intent | **L1 Judgment Authority only** |
| Choice (ontological / production) | **OPEN-4** | TBD | TBD | Writer | Must not be Plan/Writer-minted | plan.choice, causalChain.choice | **UNKNOWN** |
| Action Intent | Authorized action for realization | **OPEN-4** | Character Causality production (candidate) | Writer | Post-attribution | Direct Plan/Beat as Intent | Candidate only |
| Writer | Realization layer | System | LLM under prompts | Prose | Action Intent / narrative instructions | Claiming Choice Authority | **Realization ≠ Causality Authority** |
| Prose | Narrative text | Writer | Writer | Actual extractor; L1 Observer | — | — | Surface narrative |
| Actual | Text-grounded events | Event foundation | Extractor from prose | SR; State Evolution; L1 (via prose) | scene.text | Plan fields | Actual Authority for what happened; **≠ Choice** |

### Competing Choice-like authorities today (contamination — not legal)

| Illegal claimant | Classification |
|------------------|----------------|
| plan.choice / deriveSceneChoice | PLAN ARTIFACT |
| causalChain.choice / options | PLAN / Reasoner guidance |
| beat.choice / Decision library | FABRICATED CHOICE-LIKE |
| Writer improvisation | WRITER REALIZATION |
| Desire / characterPush | DESIRE parallel |

**Legal Choice claim today:** **none in production runtime.** Only Golden L1 **oracle** defines judgment semantics; Observer unimplemented.
