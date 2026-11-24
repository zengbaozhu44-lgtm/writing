#!/usr/bin/env node
/**
 * OBSERVATION ONLY — Stress Test 工件采集器（只读）
 * 用法：node scripts/stress-story-route-collect.js [workDir]
 */
import fs from 'node:fs';
import path from 'node:path';
import { readYaml } from '../packages/inkos-core/src/lib/yaml-store.js';

const workDir = process.argv[2]
  || fs.readFileSync(path.resolve('tmp-stress/workdir.txt'), 'utf8').trim();
const B = (p) => path.join(workDir, 'novel', '_system', 'brain', p);
const readJson = (p) => (fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : null);
const out = {};

// 1. CADE sidecar
for (const ch of [1, 2]) {
  const cade = readJson(B(`cade/ch_000${ch}.json`));
  out[`cade_ch${ch}`] = cade ? cade.items.map((c) => ({
    who: c.characterId, y: c.actionContent, scene: c.sceneId, src: c.sourceRef,
  })) : 'ABSENT';
}

// 2. Scenes truth matrix + prompt seam check
for (const ch of [1, 2]) {
  const bag = readJson(B(`ch_000${ch}_scenes.json`));
  const scenes = (bag?.scenes || []).map((s) => ({
    idx: s.index,
    chars: String(s.text || '').replace(/\s/g, '').length,
    events: (s.actualEvents || []).map((e) => `${e.kind}:${(e.actors || []).join('/')}:${String(e.action).slice(0, 24)}`),
    intent: s.actionIntentTruth?.status === 'asserted' ? `Y=${String(s.actionIntentTruth.actionContent).slice(0, 18)}` : (s.actionIntentTruth?.status || 'none'),
    action: s.characterActionTruth?.status === 'asserted' ? `occ=${String(s.characterActionTruth.occurrenceRef).slice(0, 22)}` : (s.characterActionTruth?.status || 'none'),
    wct: s.worldConsequenceTruth?.status === 'asserted' ? `W=${String(s.worldConsequenceTruth.worldChangeContent).slice(0, 20)}` : `absent(${s.worldConsequenceTruth?.reason || 'no_slot'})`,
    srState: s.characterSRState ? Object.keys(s.characterSRState) : [],
    promptHasOccurrence: String(s.prompt || '').includes('Previous Scene Occurrence Events'),
    promptHasWCT: String(s.prompt || '').includes('Proven World Consequences'),
    promptHasIntentBlock: String(s.prompt || '').includes('Action Intent Truth'),
  }));
  out[`scenes_ch${ch}`] = scenes;
}

// 3. State evolution aggregate
for (const ch of [1, 2]) {
  const st = readJson(path.join(workDir, `states/ch_000${ch}.json`));
  out[`state_ch${ch}`] = st ? {
    timelineEvents: (st.evolution?.timelineEvents || []).slice(0, 8),
    worldHints: (st.evolution?.worldHints || []).slice(0, 12),
    wctHints: (st.evolution?.worldHints || []).filter((h) => String(h).startsWith('wct:')),
    worldConsequences: (st.evolution?.worldConsequences || []).length,
    openLoops: st.evolution?.openLoops || [],
    provenance: st.provenance || null,
  } : 'ABSENT';
}

// 4. Canon files
const tl = fs.existsSync(path.join(workDir, 'novel/11_timeline.yaml'))
  ? readYaml(path.join(workDir, 'novel/11_timeline.yaml')) : null;
out.timeline = (tl?.days || []).slice(-3).map((d) => ({ day: d.day, ch: d.chapter, events: (d.events || []).slice(0, 5) }));
out.anchor_ch1 = (() => {
  const p = path.join(workDir, 'states/ch_0001_anchor.yaml');
  if (!fs.existsSync(p)) return 'ABSENT';
  const a = readYaml(p);
  return { pov: a.pov, location: a.location, relationship: a.relationship_state, momentum: a.narrative_momentum?.closing_emotion, tail: (a.narrative_momentum?.tailExcerpt || '').slice(0, 60) };
})();
out.state08 = fs.existsSync(path.join(workDir, 'novel/08_current_state.md'))
  ? fs.readFileSync(path.join(workDir, 'novel/08_current_state.md'), 'utf8').split('\n').slice(0, 8).join(' | ') : 'ABSENT';
out.task09 = fs.existsSync(path.join(workDir, 'novel/09_current_chapter.md'))
  ? fs.readFileSync(path.join(workDir, 'novel/09_current_chapter.md'), 'utf8').split('\n').slice(0, 6).join(' | ') : 'ABSENT';

// 5. Character SR sidecars
const srDir = B('character_sr');
out.characterSR = {};
if (fs.existsSync(srDir)) {
  for (const f of fs.readdirSync(srDir).slice(0, 6)) {
    const j = readJson(path.join(srDir, f));
    out.characterSR[f] = j ? Object.fromEntries(Object.entries(j.characters || j).slice(0, 3).map(([k, v]) => [k, JSON.stringify(v).slice(0, 160)])) : null;
  }
}

// 6. Prose continuity excerpts（人工阅读用）
const s1 = readJson(B('ch_0001_scenes.json'))?.scenes || [];
const s2 = readJson(B('ch_0002_scenes.json'))?.scenes || [];
const last1 = s1[s1.length - 1];
const first2 = s2[0];
out.excerpt = {
  ch1_last_scene_tail: String(last1?.text || '').replace(/\s+/g, ' ').slice(-180),
  ch2_s1_head: String(first2?.text || '').replace(/\s+/g, ' ').slice(0, 220),
  ch2_s1_goal: first2?.goal || null,
};
// SR 视角差异样本：林逸 vs 苏眠 在 ch2 的 SR（如存在）
const sr2 = (() => {
  const p = B('character_sr/ch_0002.json');
  return readJson(p);
})();
out.sr_ch2_sample = sr2 ? JSON.stringify(sr2).slice(0, 500) : 'ABSENT';

fs.writeFileSync(path.resolve('tmp-stress/matrix.json'), JSON.stringify(out, null, 2));
console.log(JSON.stringify(out, null, 2));
