/**
 * F6.2 — Scene-derived Continuity Bridge (pure projection / binder)
 *
 * Scene N text → scene-local observedContinuity → Scene N+1 prompt.
 * NOT Reality / Canon / SR / Causality Engine.
 *
 * Freeze:
 * - Source = actual scene text (or existing scene.observedContinuity)
 * - Never from Planner / Scene Goal / Expected alone
 * - Never writes 08 / 11 / 13 / Minimal SR
 * - Plan ≠ Actual (plan cannot invent resolution of unresolved)
 */
import { extractCalendarHints } from '../../inkos-core/src/lib/story-clock.js';
import { stampInferenceCandidate } from '../../inkos-core/src/lib/inference-demotion.js';

const MARKER_HEADER = '### Previous Scene Observed Continuity';
const MARKER_ROLE = 'scene-derived · previous · ≠ Canon · ≠ Plan · ≠ Character SR';

/** Literal quote spans that count as established results when present in text. */
const SALIENT_QUOTE_RE = /「([^」]{1,48})」/gu;

/** Open-choice / countdown patterns (must appear in text). */
const OPEN_CHOICE_RE = /两个选择|跟我走|或者留|你有三十秒|三十秒内|三十秒[。！]|还是留/u;

/** Same-scene settlement of an open choice (literal). */
const CHOICE_SETTLED_RE = /跟着.{0,8}走了|选择了|决定跟|跟她走了|跟他走了|点头跟|答应跟/u;

/** Cliff / anomaly hooks from F6.1 REAL FAILURE corpus. */
const HOOK_PATTERNS = [
  { id: 'door_warning', label: '门缝警告「快跑」', re: /门缝[\s\S]{0,80}快跑|快跑[\s\S]{0,40}纸片|纸片[\s\S]{0,40}快跑/u },
  { id: 'notebook_message', label: '笔记本「告诉他真相」', re: /告诉他真相|笔记本[\s\S]{0,60}真相/u },
  { id: 'clock_anomaly', label: '墙钟秒针异常', re: /秒针/u },
];

function textHash(text) {
  let h = 0;
  const s = String(text || '').replace(/\s+/g, ' ').trim();
  for (let i = 0; i < s.length; i += 1) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return String(h);
}

function findEvidence(text, matchIndex, matchLen) {
  if (matchIndex < 0) return 'unavailable';
  const start = Math.max(0, matchIndex - 36);
  const end = Math.min(text.length, matchIndex + matchLen + 48);
  const excerpt = text.slice(start, end).replace(/\s+/g, ' ').trim();
  if (!excerpt) return 'unavailable';
  return { excerpt: excerpt.slice(0, 160) };
}

function pushUnique(list, item) {
  if (!item?.id) return;
  if (list.some((x) => x.id === item.id)) return;
  list.push(item);
}

/**
 * Pure projection from Scene N actual text.
 * @returns {object|null}
 */
export function buildObservedContinuity(scene = {}, text = '') {
  const raw = String(text || scene?.text || '').trim();
  if (!raw) return null;

  const sceneId = scene.id || `scene_${scene.index || '?'}`;
  const index = Number(scene.index) || null;
  const confirmed = [];
  const unresolved = [];

  for (const hook of HOOK_PATTERNS) {
    const m = raw.match(hook.re);
    if (!m) continue;
    const idx = raw.search(hook.re);
    const evidence = findEvidence(raw, idx, m[0].length);
    pushUnique(confirmed, {
      id: hook.id,
      label: hook.label,
      evidence: evidence === 'unavailable'
        ? 'unavailable'
        : { sceneId, index, ...evidence },
    });
    // Meaning of established anomaly remains open unless text settles it
    if (hook.id === 'door_warning' || hook.id === 'notebook_message') {
      pushUnique(unresolved, {
        id: `meaning_${hook.id}`,
        label: `${hook.label} 含义未解`,
        evidence: evidence === 'unavailable'
          ? 'unavailable'
          : { sceneId, index, ...evidence },
      });
    }
  }

  // Additional quoted messages (cap) — only if quote literally in text
  let quoteCount = 0;
  SALIENT_QUOTE_RE.lastIndex = 0;
  let qm;
  while ((qm = SALIENT_QUOTE_RE.exec(raw)) && quoteCount < 4) {
    const q = String(qm[1] || '').trim();
    if (q.length < 2) continue;
    // skip if already covered by hooks
    if (/快跑|告诉他真相/.test(q) && confirmed.some((c) => /door_warning|notebook_message/.test(c.id))) {
      continue;
    }
    const id = `quote_${textHash(q).slice(0, 8)}`;
    const evidence = findEvidence(raw, qm.index, qm[0].length);
    pushUnique(confirmed, {
      id,
      label: `原文引语「${q.slice(0, 24)}」`,
      evidence: evidence === 'unavailable'
        ? 'unavailable'
        : { sceneId, index, ...evidence },
    });
    quoteCount += 1;
  }

  if (OPEN_CHOICE_RE.test(raw)) {
    const idx = raw.search(OPEN_CHOICE_RE);
    const m = raw.match(OPEN_CHOICE_RE);
    const evidence = findEvidence(raw, idx, m ? m[0].length : 4);
    const settled = CHOICE_SETTLED_RE.test(raw.slice(Math.max(0, idx)));
    // Scene-scoped ids so later open choices are not masked by earlier ones
    const choiceId = index != null ? `open_choice_s${index}` : 'open_choice';
    if (!settled) {
      pushUnique(unresolved, {
        id: choiceId,
        label: '未结算选择/倒计时',
        evidence: evidence === 'unavailable'
          ? 'unavailable'
          : { sceneId, index, ...evidence },
      });
    } else {
      pushUnique(confirmed, {
        id: index != null ? `choice_settled_s${index}` : 'choice_settled',
        label: '选择已在本场结算',
        evidence: evidence === 'unavailable'
          ? 'unavailable'
          : { sceneId, index, ...evidence },
      });
    }
  }

  // Tail cliff without settlement language
  const tail = raw.slice(-120);
  if (/门缝|伸出|纸片|倒计时|三十秒|跟我走/.test(tail) && !CHOICE_SETTLED_RE.test(tail)) {
    pushUnique(unresolved, {
      id: index != null ? `tail_cliff_s${index}` : 'tail_cliff',
      label: '段末未收束悬念',
      evidence: { sceneId, index, excerpt: tail.replace(/\s+/g, ' ').trim().slice(0, 160) },
    });
  }

  if (!confirmed.length && !unresolved.length) {
    return {
      role: 'scene_derived_continuity',
      sceneId,
      index,
      sourceTextHash: textHash(raw),
      confirmed: [],
      unresolved: [],
      empty: true,
      extractedAt: new Date().toISOString(),
      writesCanon: false,
      writesSR: false,
      d1InferenceDemotion: stampInferenceCandidate({
        paths: ['buildObservedContinuity'],
        role: 'scene_local_projection_not_reality',
      }),
    };
  }

  return {
    role: 'scene_derived_continuity',
    sceneId,
    index,
    sourceTextHash: textHash(raw),
    confirmed,
    unresolved,
    empty: false,
    extractedAt: new Date().toISOString(),
    writesCanon: false,
    writesSR: false,
    d1InferenceDemotion: stampInferenceCandidate({
      paths: ['buildObservedContinuity', 'scene.text literal spans'],
      role: 'scene_local_projection_not_reality',
      note: 'Observed Continuity ≠ Canon / SR / Plan. Text-span projection only.',
    }),
  };
}

/**
 * Attach / refresh scene.observedContinuity from scene.text.
 * Does not invent when text empty.
 */
export function ensureObservedContinuity(scene = {}) {
  if (!scene || typeof scene !== 'object') return null;
  const text = String(scene.text || '').trim();
  if (!text) return scene.observedContinuity || null;
  const hash = textHash(text);
  if (
    scene.observedContinuity
    && scene.observedContinuity.sourceTextHash === hash
    && scene.observedContinuity.role === 'scene_derived_continuity'
  ) {
    return scene.observedContinuity;
  }
  const built = buildObservedContinuity(scene, text);
  if (built) scene.observedContinuity = built;
  return built;
}

/**
 * Does later scene text literally settle an unresolved item?
 * Plan / goal text alone must NOT count as settlement (Test C).
 */
export function isUnresolvedSettledByText(item, laterText = '') {
  const t = String(laterText || '');
  if (!t.trim() || !item?.id) return false;
  if (/^open_choice/.test(item.id) || /^tail_cliff/.test(item.id)) {
    return CHOICE_SETTLED_RE.test(t);
  }
  if (item.id.startsWith('meaning_')) {
    // Explicit settlement phrases only — not presence of hospital/plan words
    return /真相是|原来是|揭开|揭晓|答案是/.test(t);
  }
  return false;
}

/**
 * Collect continuity for Scene N+1 from previous scenes (intent or disk).
 * Unresolved carries forward until a later *scene text* settles it.
 * Plan goal is never consulted for settlement.
 */
export function collectPreviousObservedContinuity(prevScenes = [], opts = {}) {
  const planText = String(opts.planText || opts.sceneGoal || '').trim();
  const list = Array.isArray(prevScenes) ? prevScenes : [];
  const confirmed = [];
  const unresolved = [];
  const sources = [];

  for (let i = 0; i < list.length; i += 1) {
    const ps = list[i];
    const oc = ensureObservedContinuity(ps);
    if (!oc) continue;
    sources.push({ sceneId: oc.sceneId, index: oc.index });
    for (const c of oc.confirmed || []) {
      pushUnique(confirmed, { ...c, fromScene: oc.index });
    }
    for (const u of oc.unresolved || []) {
      pushUnique(unresolved, { ...u, fromScene: oc.index });
    }
  }

  // Settle only via subsequent scene texts (not plan)
  const still = [];
  for (const u of unresolved) {
    const fromIdx = Number(u.fromScene) || 0;
    let settled = false;
    for (const ps of list) {
      if (Number(ps.index) <= fromIdx) continue;
      if (isUnresolvedSettledByText(u, ps.text)) {
        settled = true;
        break;
      }
    }
    // Guard: plan text alone never settles
    if (!settled && planText && isUnresolvedSettledByText(u, planText)) {
      // Explicitly ignore — plan cannot invent resolution
      settled = false;
    }
    if (!settled) still.push(u);
  }

  return {
    role: 'previous_scene_observed_continuity',
    confirmed: confirmed.slice(-12),
    unresolved: still.slice(-8),
    sources,
    planCannotResolve: true,
    writesCanon: false,
    writesSR: false,
  };
}

function formatEvidence(ev) {
  if (!ev || ev === 'unavailable') return 'evidence: unavailable';
  if (typeof ev === 'string') return `evidence: ${ev}`;
  const sid = ev.sceneId || (ev.index != null ? `Scene ${ev.index}` : '?');
  const ex = ev.excerpt ? `「${String(ev.excerpt).slice(0, 80)}」` : 'unavailable';
  return `evidence: ${sid} ${ex}`;
}

function normalizeDateKey(d) {
  return String(d || '').replace(/\s+/g, '');
}

/**
 * Prompt formatter — clearly separated from Plan / Clock / SR / Canon.
 */
export function formatObservedContinuityBlock(bundle, clock = {}) {
  if (!bundle) return '';
  const confirmed = bundle.confirmed || [];
  const unresolved = bundle.unresolved || [];
  if (!confirmed.length && !unresolved.length) return '';

  const canonical = clock?.canonical || null;
  const lines = [
    MARKER_HEADER,
    `> **角色：${MARKER_ROLE}**`,
    '> Observed Continuity = 上一场正文实际建立的结果（confirmed）与未结算事项（unresolved）。',
    '> **不是** Plan / Scene Goal；**不是** Character SR；**不是** Canon Reality。',
    '> Plan 可以安排下一场方向，但 **不得假设** 上一场未结算事项已被解决。',
    // F7.1 early so budget head-clip keeps Goal≠settlement + Expected≠Actual
    '> **F7.1**：unresolved remain unresolved unless this Scene explicitly resolves them. Goal≠prior settlement. Beat After=EXPECTED TARGET≠Actual.',
  ];
  if (canonical) {
    lines.push(
      `> 当前 Story Clock Canonical = **${canonical}**。若 continuity evidence 含其他月日，视为历史提及，≠ 当前钟。`,
    );
  }

  if (confirmed.length) {
    lines.push('', '**confirmed（上一场已发生）**');
    for (const c of confirmed) {
      let label = c.label;
      if (canonical && c.evidence?.excerpt) {
        const hints = extractCalendarHints(c.evidence.excerpt);
        const bad = hints.filter((d) => /月/.test(d) && normalizeDateKey(d) !== normalizeDateKey(canonical));
        if (bad.length) label = `${label} 〔历史日期 ${bad.join('、')} ≠ ${canonical}〕`;
      }
      lines.push(`- ${label} · ${formatEvidence(c.evidence)}`);
    }
  }

  if (unresolved.length) {
    lines.push('', '**unresolved（上一场建立、尚未结算 — Plan 不得静默结算）**');
    for (const u of unresolved) {
      lines.push(`- ${u.label} · ${formatEvidence(u.evidence)}`);
    }
  }

  lines.push('', 'Writer：承接 confirmed；不得遗忘 unresolved；不得用本场 Plan/Goal 假装已解决 unresolved。');
  return lines.join('\n');
}

export function hasObservedContinuityMarkers(text = '') {
  return /Previous Scene Observed Continuity/u.test(String(text || ''))
    || /scene-derived · previous/u.test(String(text || ''));
}

export {
  MARKER_HEADER,
  MARKER_ROLE,
  OPEN_CHOICE_RE,
  CHOICE_SETTLED_RE,
};
