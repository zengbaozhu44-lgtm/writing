/**
 * EO-G1-C-01 — Event Identity（Gate 1 Q6 Seal · 修正版）
 *
 * 唯一 Truth Contract：
 *   Event Identity = sceneId + raw scene.text 逐字 excerpt + stable in-scene offset/span
 *   ——确定性派生（非铸造权威）；同锚必同 id；hash 仅辅助表示。
 * 禁止：candidate/producer 序号、ordinal、action 前缀/hash、refOf fallback、
 *       semantic similarity、normalization、fuzzy/LLM matching。
 * Fail-closed：excerpt 无法唯一定位（NOT_FOUND / AMBIGUOUS）→ 不产 Identity。
 * Cross-producer semantic equivalence = NOT DEFINED（异摘录=异事件，如实双记）。
 */

const RAW_ANCHOR_SEPARATOR = '\u0000';

/**
 * 在 raw text 中定位逐字 excerpt。
 * @returns {{status:'FOUND', offset:number} | {status:'NOT_FOUND'} | {status:'AMBIGUOUS', offsets:number[]}}
 */
export function locateRawExcerpt(text, excerpt) {
  const t = String(text ?? '');
  const e = String(excerpt ?? '');
  if (!e) return { status: 'NOT_FOUND' };
  const offsets = [];
  let i = t.indexOf(e);
  while (i !== -1) {
    offsets.push(i);
    i = t.indexOf(e, i + 1);
  }
  if (offsets.length === 0) return { status: 'NOT_FOUND' };
  if (offsets.length === 1) return { status: 'FOUND', offset: offsets[0] };
  return { status: 'AMBIGUOUS', offsets };
}

/** 稳定散列（FNV-1a 32 → hex；仅辅助表示，非 Authority） */
function anchorHash(s) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

/**
 * 确定性派生 Event Identity。相同 (sceneId, excerpt, offset) 必得相同 id。
 * offset 必须使 text.slice(offset, offset+excerpt.length) === excerpt（调用方保证；
 * 本函数不读 text——identity 是锚组分的纯函数）。
 */
export function mintEventIdentity({ sceneId, excerpt, offset }) {
  const sid = String(sceneId ?? '').trim();
  const ex = String(excerpt ?? '');
  const off = Number(offset);
  if (!sid || !ex || !Number.isInteger(off) || off < 0) {
    return { ok: false, reason: 'invalid_anchor' };
  }
  const anchorKey = [sid, ex, String(off)].join(RAW_ANCHOR_SEPARATOR);
  return { ok: true, id: `evt_${sid}_e${anchorHash(anchorKey)}`, anchor: { sceneId: sid, excerpt: ex, offset: off } };
}

/** 便捷：定位并派生（FOUND 才 ok；NOT_FOUND/AMBIGUOUS 一律 fail-closed） */
export function deriveEventIdentityFromText({ sceneId, text, excerpt }) {
  const loc = locateRawExcerpt(text, excerpt);
  if (loc.status !== 'FOUND') return { ok: false, reason: `anchor_${loc.status.toLowerCase()}`, locate: loc };
  const minted = mintEventIdentity({ sceneId, excerpt, offset: loc.offset });
  return minted.ok ? { ...minted, offset: loc.offset } : minted;
}
