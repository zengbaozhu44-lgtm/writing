/**
 * Phase 1 — Actual Events → N+1 prompt (read-only Occurrence projection)
 *
 * Rules (freeze):
 * - Source = scene.actualEvents already extracted from scene.text
 * - Never invent from Plan / closingWorldState
 * - writesCanon / writesSR / writesReality remain false
 * - Does NOT replace Director Plan bridge (Phase 7)
 * - Does NOT drive State Evolution (Phase 2)
 *
 * Phase 4.4.1d-R S3 (AA20):
 * Writer-facing = Occurrence read-back / continuity fuel only.
 * ≠ Character-attributable Action · ≠ Agency · ≠ Choice · ≠ Intentionality
 * ≠ Character Causal History · ≠ Attribution certificate
 * Attribution remains: Prose → TypedEvidence → Gate → Registry only.
 *
 * Purpose: Scene N+1 can answer "what prior text presented as having happened"
 * without Plan — without pre-certifying Character Causality.
 */
import { ensureActualEvents } from './event-extractor.js';

export const ACTUAL_EVENTS_PROMPT_VERSION = 'occurrence-readback-s3';

/**
 * Collect previous scenes' actualEvents for Scene N+1.
 * Re-extracts from text if missing (Plan fields stripped by extractor).
 *
 * EO-P4-World-Consequence-Consumption-01: also collects each scene's asserted
 * worldConsequenceTruth (consume-only readback; absent → nothing collected).
 *
 * @param {object[]} prevScenes
 * @param {{ knownNames?: string[], reextract?: boolean }} [opts]
 */
export function collectPreviousActualEvents(prevScenes = [], opts = {}) {
  const list = Array.isArray(prevScenes) ? prevScenes : [];
  const events = [];
  const sources = [];
  const worldConsequences = [];

  for (const ps of list) {
    if (!ps || !String(ps.text || '').trim()) continue;
    ensureActualEvents(ps, {
      knownNames: opts.knownNames,
      stripPlan: true,
      reextract: opts.reextract === true,
    });
    const attached = Array.isArray(ps.actualEvents) ? ps.actualEvents : [];
    const sceneId = String(ps.id || `scene_${ps.index || '?'}`);
    if (!attached.length && ps.worldConsequenceTruth?.status !== 'asserted') continue;
    if (attached.length) {
      sources.push({ sceneId, index: ps.index, count: attached.length });
      for (const ev of attached) {
        events.push({
          ...ev,
          fromScene: ps.index,
          fromSceneId: sceneId,
        });
      }
    }
    // Consume-only: read already-minted World Consequence Truth (never mint here)
    const wct = ps.worldConsequenceTruth;
    if (wct && wct.status === 'asserted' && String(wct.worldChangeContent || '').trim()) {
      worldConsequences.push({
        fromScene: ps.index,
        fromSceneId: sceneId,
        characterId: wct.characterId || null,
        actionContent: String(wct.actionContent || '').slice(0, 80),
        worldChangeContent: String(wct.worldChangeContent).slice(0, 120),
        occurrenceRef: wct.occurrenceRef || null,
        provenance: wct.provenance || null,
      });
    }
  }

  return {
    role: 'previous_scene_actual_events',
    version: ACTUAL_EVENTS_PROMPT_VERSION,
    events: events.slice(-16),
    worldConsequences,
    sources,
    writesCanon: false,
    writesSR: false,
    writesReality: false,
    planCannotCreate: true,
  };
}

/**
 * Format Occurrence Events block for Writer / Compiler prompt (S3).
 * Continuity fuel only — never Character Choice / Attribution certificate.
 *
 * @param {ReturnType<typeof collectPreviousActualEvents>|null} bundle
 * @returns {string}
 */
export function formatActualEventsBlock(bundle) {
  if (!bundle) return '';
  const events = bundle.events || [];
  const wcs = bundle.worldConsequences || [];
  if (!events.length && !wcs.length) return '';

  const lines = [
    '### Previous Scene Occurrence Events',
    '> role: occurrence_readback（continuity fuel · 只读）',
    '> = 上一场正文所呈现的「发生了什么」的结构化读回（WORLD ACTUALITY → Occurrence）。',
    '> ≠ Character Choice Fact · ≠ Attribution Fact · ≠ Agency proof · ≠ Intentionality proof',
    '> ≠ Character Causal History · ≠ Plan / Character SR / Canon Reality certificate',
    '> Continuity: 下一场须承接这些 Occurrence（文本已呈现之事）；不得用 Plan 覆盖或假装未呈现。',
    '> Attribution 若需要：仍仅经 Prose → TypedEvidence → Gate → Registry（本块不跳过 Gate）。',
    '',
  ];

  for (const ev of events) {
    const idx = ev.fromScene != null ? `S${ev.fromScene}` : (ev.sceneId || '?');
    const actors = (ev.actors || []).join('、') || '（未标）';
    const changes = (ev.stateChanges || []).slice(0, 3).join('; ') || '—';
    const happening = String(ev.action || '').slice(0, 100);
    // participants + reported happening — Occurrence shape; not “X chose / intentionally did”
    lines.push(
      `- [${idx}/${ev.kind || 'action'}] participants: ${actors} · reported happening: ${happening}`,
    );
    if (ev.consequence) {
      lines.push(`  text-noted aftermath: ${String(ev.consequence).slice(0, 80)}`);
    }
    lines.push(`  state_mentions: ${changes}`);
  }

  // EO-P4-World-Consequence-Consumption-01: proven World Consequences readback
  // (consume-only; Source = scene.worldConsequenceTruth already minted by the bridge)
  if (wcs.length) {
    lines.push(
      '',
      '### Proven World Consequences',
      '> role: world_consequence_truth_readback（consume-only · 只读）',
      '> = 已证明：Character Action（同一 occurrence 链，文本 grounded）→ 世界变化 W。',
      '> ≠ Choice · ≠ Plan/Beat consequence · ≠ Writer 意图 · 此处不得新增或改写 W。',
      '> Continuity: 下一场必须把 W 当作已发生的世界事实承接。',
    );
    for (const wc of wcs) {
      const idx = wc.fromScene != null ? `S${wc.fromScene}` : (wc.fromSceneId || '?');
      const who = wc.characterId || '（未标）';
      lines.push(
        `- [${idx}] ${who}「${wc.actionContent}」→ 已发生的世界变化: ${wc.worldChangeContent}`,
      );
    }
  }

  return lines.join('\n');
}

/**
 * HPA-01 — Truth-preserving presentation compact for budget clipping.
 *
 * Presentation-only: extracts already-present Occurrence / Proven WCT lines.
 * Does NOT invent Actual, WCT, or Plan facts. Does NOT mutate scene truth.
 *
 * @param {string} block - existing formatActualEventsBlock output (or prior compact)
 * @returns {string} minimal equivalent block, or '' if no proven truth present
 */
export function compactActualTruthForBudget(block = '') {
  const text = String(block || '').trim();
  if (!text) return '';

  const isTruthBlock = /Previous Scene Occurrence Events|Proven World Consequences|Proven Actual \(compact\)|Proven WCT \(compact\)/u
    .test(text);
  if (!isTruthBlock) return '';

  const happenings = [];
  for (const m of text.matchAll(/reported happening:\s*(.+)/gu)) {
    const v = String(m[1] || '').trim();
    if (v) happenings.push(v.slice(0, 80));
  }
  // Already-compact form
  for (const m of text.matchAll(/^- Actual:\s*(.+)$/gmu)) {
    const v = String(m[1] || '').trim();
    if (v) happenings.push(v.slice(0, 80));
  }

  const wcts = [];
  for (const m of text.matchAll(/已发生的世界变化:\s*(.+)/gu)) {
    const v = String(m[1] || '').trim();
    if (v) wcts.push(v.slice(0, 80));
  }
  for (const m of text.matchAll(/^- WCT:\s*(.+)$/gmu)) {
    const v = String(m[1] || '').trim();
    if (v) wcts.push(v.slice(0, 80));
  }

  const uniq = (arr) => [...new Set(arr.filter(Boolean))];
  const occ = uniq(happenings).slice(0, 4);
  const wc = uniq(wcts).slice(0, 3);
  if (!occ.length && !wc.length) return '';

  const lines = [
    '### Proven Actual (compact · continuity fuel)',
    '> HPA-01 presentation-only · ≠ new Story Truth · ≠ Plan · ≠ Authority ranking',
  ];
  for (const h of occ) lines.push(`- Actual: ${h}`);
  if (wc.length) {
    lines.push('### Proven WCT (compact · continuity fuel)');
    lines.push('> presentation-only · consume-only readback · ≠ fabricated consequence');
    for (const w of wc) lines.push(`- WCT: ${w}`);
  }
  return lines.join('\n');
}

/**
 * Whether a clipped prompt still carries minimal Actual / WCT truth fuel.
 * @param {string} prompt
 */
export function promptPreservesActualTruth(prompt = '') {
  const t = String(prompt || '');
  if (/reported happening:\s*\S/u.test(t)) return true;
  if (/^- Actual:\s*\S/mu.test(t)) return true;
  if (/Proven Actual \(compact\)[\s\S]{0,200}- Actual:\s*\S/u.test(t)) return true;
  if (/已发生的世界变化:\s*\S/u.test(t)) return true;
  if (/^- WCT:\s*\S/mu.test(t)) return true;
  return false;
}

/**
 * Build a compact Actual summary string (for tests / Director soft field later).
 * Not a Writer Context certificate — keep Occurrence framing if exposed later.
 * @param {object[]} events
 */
export function summarizeActualEvents(events = []) {
  const list = Array.isArray(events) ? events : [];
  if (!list.length) return '';
  return list
    .slice(0, 8)
    .map((ev) => {
      const who = (ev.actors || []).join('/') || '?';
      return `${who}:${String(ev.action || '').slice(0, 40)}`;
    })
    .join(' | ');
}
