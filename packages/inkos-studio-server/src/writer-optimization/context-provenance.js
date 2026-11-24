/**
 * F3 — Context Provenance Trace (READ-ONLY diagnostic)
 *
 * Describes what happened during Prompt compilation.
 * Does NOT define Story truth / Canon / SR / Memory / Reality.
 * Prefer unknown/unavailable over invented sources.
 */
import { resolveStoryClock } from '../../../inkos-core/src/lib/story-clock.js';
import { hasStoryClock, hasInformationBoundary } from '../../../inkos-core/src/lib/prompt-survival.js';

export const PROVENANCE_ROLE = 'read_only_diagnostic_trace';
export const PROVENANCE_WRITES_CANON = false;
export const PROVENANCE_WRITES_SR = false;

export const PROVENANCE_TYPES = Object.freeze([
  'canon',
  'projection',
  'plan',
  'sr',
  'historical',
  'temporary',
  'guard',
  'derived',
  'unavailable',
]);

export const LAYER_STATUS = Object.freeze(['present', 'absent', 'trimmed', 'unavailable']);

/**
 * @typedef {{
 *   key: string,
 *   type: string,
 *   source: string,
 *   priority: 'P0'|'P1'|'P2'|'P3'|string,
 *   kept: boolean,
 *   reason: string,
 *   layers?: { L1?: string, L2?: string, L3?: string, L4?: string },
 *   channels?: string[],
 *   note?: string,
 * }} ProvenanceBlock
 */

function presentIn(text, markers = []) {
  const t = String(text || '');
  if (!t.trim() || !markers.length) return false;
  return markers.some((m) => (m instanceof RegExp ? m.test(t) : t.includes(String(m))));
}

function layerStatus(text, markers, { hadEarlier = false } = {}) {
  const hit = presentIn(text, markers);
  if (hit) return 'present';
  if (hadEarlier) return 'trimmed';
  return 'absent';
}

function clockSourceLabel(clock, intent = {}) {
  if (!clock || clock.source === 'none') return 'unavailable';
  if (clock.source === 'intent_or_scene_field') {
    if (intent.time) return 'intent.time';
    if (intent.currentDate) return 'intent.currentDate';
    return 'intent.time|intent.currentDate|scene.time';
  }
  if (clock.source === 'prior_scene_text') return 'prior_scene.text';
  if (clock.source === '08_current_state') return '08_current_state.时间';
  return clock.source || 'unknown';
}

function moduleKeyPresent(modules, key) {
  return (modules || []).some((m) => m.key === key || String(m.key || '').startsWith(`${key}:`));
}

/**
 * Build provenance blocks from layer texts + known compile metadata.
 * Does not mutate prompts.
 */
export function buildContextProvenanceTrace({
  l1Text = '',
  l2Text = '',
  l3Text = '',
  l4Text = '',
  intent = {},
  scene = {},
  ctx = {},
  l1Modules = null,
} = {}) {
  const L1 = String(l1Text || '');
  const L2 = String(l2Text || '');
  const L3 = String(l3Text || '');
  const L4 = String(l4Text || '');

  const clock = resolveStoryClock({ ctx, intent, scene });
  const blocks = [];

  const push = (block) => {
    const layers = block.layers || {};
    // kept = retained in final Writer consumption when L4 exists; else sealed L3
    const hasL4 = Boolean(L4.trim());
    const kept = hasL4
      ? layers.L4 === 'present'
      : (layers.L3 === 'present' || layers.L2 === 'present');
    blocks.push({
      key: block.key,
      type: PROVENANCE_TYPES.includes(block.type) ? block.type : 'unavailable',
      source: block.source || 'unknown',
      priority: block.priority || 'unavailable',
      kept: Boolean(kept),
      reason: block.reason || 'unavailable',
      layers,
      ...(block.channels ? { channels: block.channels } : {}),
      ...(block.note ? { note: block.note } : {}),
    });
  };

  // --- Story Clock ---
  {
    const markers = [/Story Clock/u, /Canonical/u, /故事钟/u];
    const l1 = layerStatus(L1, markers);
    const l2 = layerStatus(L2, markers, { hadEarlier: l1 === 'present' });
    // Clock is injected at L2 header / P1 — L1 lore alone may lack it
    const l2p = hasStoryClock(L2) || presentIn(L2, markers) ? 'present' : l2;
    const l3p = hasStoryClock(L3) || presentIn(L3, markers) ? 'present' : layerStatus(L3, markers, { hadEarlier: l2p === 'present' });
    const l4p = hasStoryClock(L4) || presentIn(L4, markers) ? 'present' : layerStatus(L4, markers, { hadEarlier: l3p === 'present' });
    push({
      key: 'story_clock',
      type: 'plan',
      source: clockSourceLabel(clock, intent),
      priority: 'P1',
      reason: l4p === 'present' || l3p === 'present' ? 'semantic_protected' : (l3p === 'trimmed' ? 'budget_trim' : 'unavailable'),
      layers: { L1: l1, L2: l2p, L3: l3p, L4: l4p },
    });
  }

  // --- Information Boundary ---
  {
    const markers = [/信息边界/u, /Information Boundary/u];
    const l1 = layerStatus(L1, markers);
    const l2p = hasInformationBoundary(L2) || presentIn(L2, markers) ? 'present' : 'absent';
    const l3p = hasInformationBoundary(L3) || presentIn(L3, markers) ? 'present' : layerStatus(L3, markers, { hadEarlier: l2p === 'present' });
    const l4p = hasInformationBoundary(L4) || presentIn(L4, markers) ? 'present' : layerStatus(L4, markers, { hadEarlier: l3p === 'present' });
    push({
      key: 'information_boundary',
      type: 'guard',
      source: 'buildSceneWritePrompt / prompt-survival',
      priority: 'P1',
      reason: l4p === 'present' || l3p === 'present' ? 'semantic_protected' : (l3p === 'trimmed' ? 'budget_trim' : 'unavailable'),
      layers: { L1: l1, L2: l2p, L3: l3p, L4: l4p },
    });
  }

  // --- Character SR ---
  {
    const markers = [/Character Subjective State/u, /### Character Subjective/u];
    const fromModules = moduleKeyPresent(l1Modules, 'character_sr');
    const l1 = fromModules || presentIn(L1, markers) ? 'present' : 'absent';
    const l2p = presentIn(L2, markers) ? 'present' : layerStatus(L2, markers, { hadEarlier: l1 === 'present' });
    const l3p = presentIn(L3, markers) ? 'present' : layerStatus(L3, markers, { hadEarlier: l2p === 'present' || l1 === 'present' });
    const l4p = presentIn(L4, markers) ? 'present' : layerStatus(L4, markers, { hadEarlier: l3p === 'present' });
    push({
      key: 'character_sr',
      type: 'sr',
      source: 'minimal-sr (assembleMinimalSR)',
      priority: 'P2',
      reason: l1 === 'present' || l2p === 'present'
        ? (l4p === 'present' || l3p === 'present' ? 'scene_relevant' : 'budget_trim')
        : 'unavailable',
      layers: { L1: l1, L2: l2p, L3: l3p, L4: l4p },
    });
  }

  // --- Prior excerpt (Historical) ---
  {
    const markers = [/Prior Excerpt/u, /Historical Continuity · 非当前日历/u];
    const l1 = 'absent';
    const l2p = presentIn(L2, markers) ? 'present' : 'absent';
    const l3p = presentIn(L3, markers) ? 'present' : layerStatus(L3, markers, { hadEarlier: l2p === 'present' });
    const l4p = presentIn(L4, markers) ? 'present' : layerStatus(L4, markers, { hadEarlier: l3p === 'present' });
    const prevIdx = Number(scene?.index) > 1 ? Number(scene.index) - 1 : null;
    push({
      key: 'prior_excerpt',
      type: 'historical',
      source: prevIdx ? `scene-${String(prevIdx).padStart(2, '0')}.text` : 'prior_scene.text',
      priority: 'P3',
      reason: l3p === 'present' || l4p === 'present'
        ? 'historical_continuity'
        : (l2p === 'present' && l3p === 'trimmed' ? 'budget_trim' : (l3p === 'absent' && l2p === 'absent' ? 'unavailable' : 'historical_continuity')),
      layers: { L1: l1, L2: l2p, L3: l3p, L4: l4p },
      note: 'Historical dates ≠ current Story Clock; demoted vs P1 Canonical',
    });
  }

  // --- Prev summary / continuation (Historical) ---
  {
    const markers = [/前序 Scene/u, /Historical Continuity/u, /Previous（历史承接/u];
    const fromModules = moduleKeyPresent(l1Modules, 'prev_summary') || moduleKeyPresent(l1Modules, 'continuation');
    const l1 = fromModules || presentIn(L1, markers) ? 'present' : 'absent';
    const l2p = presentIn(L2, markers) ? 'present' : layerStatus(L2, markers, { hadEarlier: l1 === 'present' });
    const l3p = presentIn(L3, markers) ? 'present' : layerStatus(L3, markers, { hadEarlier: l2p === 'present' || l1 === 'present' });
    const l4p = presentIn(L4, markers) ? 'present' : layerStatus(L4, markers, { hadEarlier: l3p === 'present' });
    push({
      key: 'prev_summary',
      type: 'historical',
      source: 'resolvePreviousScenes → scene-summary',
      priority: 'P2',
      reason: l1 === 'present' || l2p === 'present'
        ? (l3p === 'trimmed' || l4p === 'trimmed' ? 'budget_trim' : 'historical_continuity')
        : 'unavailable',
      layers: { L1: l1, L2: l2p, L3: l3p, L4: l4p },
    });
  }

  // --- F6.2 Observed Continuity (derived, scene-local; ≠ Canon / Plan / SR) ---
  {
    const markers = [/Previous Scene Observed Continuity/u, /scene-derived · previous/u, /\*\*confirmed（上一场已发生）\*\*/u];
    const fromModules = moduleKeyPresent(l1Modules, 'observed_continuity');
    const l1 = fromModules || presentIn(L1, markers) ? 'present' : 'absent';
    const l2p = presentIn(L2, markers) ? 'present' : layerStatus(L2, markers, { hadEarlier: l1 === 'present' });
    const l3p = presentIn(L3, markers) ? 'present' : layerStatus(L3, markers, { hadEarlier: l2p === 'present' || l1 === 'present' });
    const l4p = presentIn(L4, markers) ? 'present' : layerStatus(L4, markers, { hadEarlier: l3p === 'present' });
    const prevIdx = Number(scene?.index) > 1 ? Number(scene.index) - 1 : null;
    push({
      key: 'observed_continuity',
      type: 'derived',
      source: prevIdx
        ? `scene_${prevIdx}.text → buildObservedContinuity`
        : 'previous_scene.text → buildObservedContinuity',
      priority: 'P2',
      reason: l1 === 'present' || l2p === 'present' || l3p === 'present' || l4p === 'present'
        ? (l4p === 'trimmed' || l3p === 'trimmed' ? 'budget_trim' : 'scene_continuity')
        : (Number(scene?.index) > 1 ? 'unavailable' : 'unavailable'),
      layers: { L1: l1, L2: l2p, L3: l3p, L4: l4p },
      note: 'Scene-local derived projection for N+1 only; ≠ Canon / SR / Plan settlement',
    });
  }

  // --- Chapter / Scene goal ---
  {
    const markers = [/章目标/u, /本章目标/u, /\*\*章目标\*\*/u];
    const fromModules = moduleKeyPresent(l1Modules, 'chapter_goal');
    const l1 = fromModules || presentIn(L1, markers) ? 'present' : 'absent';
    const l2p = presentIn(L2, [/章目标/u, /Scene Lore Seed/u]) ? 'present' : layerStatus(L2, markers, { hadEarlier: l1 === 'present' });
    const l3p = presentIn(L3, markers) ? 'present' : layerStatus(L3, markers, { hadEarlier: true });
    const l4p = presentIn(L4, [/章目标/u, /Scene explicit goal/u, /Scene 进度/u]) ? 'present' : layerStatus(L4, markers, { hadEarlier: l3p === 'present' });
    push({
      key: 'chapter_goal',
      type: 'plan',
      source: intent?.mainGoal ? 'intent.mainGoal' : 'unavailable',
      priority: 'P1',
      reason: intent?.mainGoal ? 'scene_relevant' : 'unavailable',
      layers: { L1: l1, L2: l2p, L3: l3p, L4: l4p },
    });
  }

  {
    const markers = [/Scene 目标/u, /\*\*Scene 目标\*\*/u, /目标:/u];
    const fromModules = moduleKeyPresent(l1Modules, 'scene_goal');
    const l1 = fromModules || presentIn(L1, [/Scene 目标/u]) ? 'present' : 'absent';
    const l2p = presentIn(L2, [/目标:/u, /Scene Lore Seed/u]) ? 'present' : 'absent';
    const l3p = presentIn(L3, [/Scene 目标/u, /\*\*Scene 目标\*\*/u]) ? 'present' : layerStatus(L3, markers, { hadEarlier: l1 === 'present' });
    const l4p = presentIn(L4, [/Scene explicit goal/u, /当前 Beat/u]) ? 'present' : layerStatus(L4, [/Scene 目标/u], { hadEarlier: l3p === 'present' });
    push({
      key: 'scene_goal',
      type: 'plan',
      source: scene?.goal ? 'scene.goal' : 'unavailable',
      priority: 'P1',
      reason: scene?.goal ? 'scene_relevant' : 'unavailable',
      layers: { L1: l1, L2: l2p, L3: l3p, L4: l4p },
    });
  }

  // --- Causal chain (dual channel possible) ---
  {
    const markers = [/欲望（desire）/u, /因果/u, /causal_chain/u, /### Causal/u, /- 压力（pressure）/u];
    const l1 = presentIn(L1, markers) ? 'present' : 'absent';
    const l2p = presentIn(L2, markers) ? 'present' : layerStatus(L2, markers, { hadEarlier: l1 === 'present' });
    const l3p = presentIn(L3, markers) ? 'present' : layerStatus(L3, markers, { hadEarlier: l1 === 'present' || l2p === 'present' });
    const l4p = presentIn(L4, markers) ? 'present' : layerStatus(L4, markers, { hadEarlier: l3p === 'present' });
    const channels = [];
    if (l1 === 'present') channels.push('L1_compile_append');
    if (l3p === 'present' && /P1 · Narrative Task/u.test(L3)) channels.push('L3_P1_narrative');
    push({
      key: 'causal_chain',
      type: 'plan',
      source: scene?.causalChain || intent?.causalChain ? 'scene.causalChain|intent.causalChain' : 'unavailable',
      priority: 'P1',
      reason: channels.length > 1
        ? 'intentional_projection'
        : (l1 === 'present' || l3p === 'present' ? 'scene_relevant' : 'unavailable'),
      layers: { L1: l1, L2: l2p, L3: l3p, L4: l4p },
      channels,
      note: channels.length > 1
        ? 'duplicate: intentional projection (L1 lore append + sealed P1)'
        : undefined,
    });
  }

  // --- F4 entity selection (names only; not a third selector) ---
  {
    const entityNames = [
      ctx?.pov,
      ...(ctx?.present || []),
      ...(scene?.entities || []),
    ].filter(Boolean);
    const markers = entityNames.length
      ? entityNames.map((n) => new RegExp(String(n).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'u'))
      : [];
    const charMods = (l1Modules || []).filter((m) => String(m.key || '').startsWith('char:'));
    const l1 = charMods.length || (markers.length && presentIn(L1, markers)) ? 'present' : (entityNames.length ? 'present' : 'absent');
    const l2p = markers.length
      ? (presentIn(L2, markers) ? 'present' : layerStatus(L2, markers, { hadEarlier: l1 === 'present' }))
      : 'unavailable';
    const l3p = markers.length
      ? (presentIn(L3, markers) ? 'present' : layerStatus(L3, markers, { hadEarlier: l1 === 'present' || l2p === 'present' }))
      : 'unavailable';
    const l4p = markers.length
      ? (presentIn(L4, markers) ? 'present' : layerStatus(L4, markers, { hadEarlier: l3p === 'present' }))
      : 'unavailable';
    push({
      key: 'entity',
      type: 'derived',
      source: entityNames.length
        ? 'scene.entities|ctx.pov|ctx.present → inkos-prompt/entity-selector'
        : 'unavailable',
      priority: 'P2',
      reason: entityNames.length ? 'scene_relevant' : 'unavailable',
      layers: { L1: l1, L2: l2p, L3: l3p, L4: l4p },
      note: entityNames.length ? `selected: ${entityNames.join(',')}` : undefined,
    });
  }

  // --- Character context cards (F4.1 whitelist; never raw) ---
  {
    const markers = [/### 人物/u, /人物卡/u, /恒定属性/u];
    const charMods = (l1Modules || []).filter((m) => String(m.key || '').startsWith('char:'));
    const fallbackMods = charMods.filter((m) => m.fallbackUsed || m.cardMode === 'minimal_identity');
    const l1 = charMods.length || presentIn(L1, markers) ? 'present' : 'absent';
    const l2p = presentIn(L2, markers) ? 'present' : layerStatus(L2, markers, { hadEarlier: l1 === 'present' });
    const l3p = presentIn(L3, markers) ? 'present' : layerStatus(L3, markers, { hadEarlier: l1 === 'present' });
    const l4p = presentIn(L4, markers) ? 'present' : layerStatus(L4, markers, { hadEarlier: l3p === 'present' });
    const noteParts = [];
    if (fallbackMods.length) {
      noteParts.push(`fallback_used=minimal_identity (${fallbackMods.map((m) => m.key).join(',')})`);
    }
    push({
      key: 'character_context',
      type: 'canon',
      source: charMods.length
        ? `03_character_bible whitelist → ${charMods.map((m) => m.key).join(',')}`
        : (l1 === 'present' ? '03_character_bible whitelist' : 'unavailable'),
      priority: 'P2',
      reason: l1 === 'present'
        ? (fallbackMods.length
          ? 'fallback_minimal_identity'
          : (l4p === 'present' || l3p === 'present' ? 'scene_relevant' : 'budget_trim'))
        : 'unavailable',
      layers: { L1: l1, L2: l2p, L3: l3p, L4: l4p },
      note: noteParts.length ? noteParts.join('; ') : undefined,
    });
  }

  // --- Ranked knowledge (F4: filterKnowledgeForPrompt BEFORE ranking) ---
  {
    const markers = [/信息差\s*TopK/u, /Knowledge TopK/u, /相关知识 TopK/u, /### 信息差/u];
    const fromModules = moduleKeyPresent(l1Modules, 'knowledge');
    const l1 = fromModules || presentIn(L1, markers) ? 'present' : 'absent';
    const l2p = presentIn(L2, markers) ? 'present' : layerStatus(L2, markers, { hadEarlier: l1 === 'present' });
    const l3p = presentIn(L3, markers) ? 'present' : layerStatus(L3, markers, { hadEarlier: l1 === 'present' });
    const l4p = presentIn(L4, markers) ? 'present' : layerStatus(L4, markers, { hadEarlier: l3p === 'present' || l1 === 'present' });
    const trimmedAway = l1 === 'present' && l4p !== 'present' && l3p !== 'present';
    push({
      key: 'knowledge',
      type: 'projection',
      source: fromModules || l1 === 'present'
        ? '06_knowledge_matrix → filterKnowledgeForPrompt → context-ranking'
        : 'unavailable',
      priority: 'P2',
      reason: l1 === 'present'
        ? (trimmedAway || l3p === 'trimmed' || l4p === 'trimmed' ? 'budget_trim' : 'context_ranked')
        : 'unavailable',
      layers: { L1: l1, L2: l2p, L3: l3p, L4: l4p },
    });
  }

  return {
    role: PROVENANCE_ROLE,
    readOnly: true,
    writesCanon: false,
    writesSR: false,
    schema: {
      fields: ['key', 'type', 'source', 'priority', 'kept', 'reason', 'layers'],
      types: [...PROVENANCE_TYPES],
      priorities: ['P0', 'P1', 'P2', 'P3'],
    },
    blocks,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Recompute provenance after L4 is known (merge into existing compile-time trace).
 */
export function refreshProvenanceWithL4(existing, { l1Text, l2Text, l3Text, l4Text, intent, scene, ctx, l1Modules }) {
  return buildContextProvenanceTrace({
    l1Text: l1Text ?? '',
    l2Text: l2Text ?? '',
    l3Text: l3Text ?? '',
    l4Text: l4Text ?? '',
    intent,
    scene,
    ctx,
    l1Modules,
  });
}

export function findProvenanceBlock(trace, key) {
  return (trace?.blocks || []).find((b) => b.key === key) || null;
}
