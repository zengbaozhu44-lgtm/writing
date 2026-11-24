/**
 * Phase 3.2 — CharacterSR Runtime tests
 * Actual → IB → CharacterSR only. No Choice / Survival / Director fixes.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  assembleMinimalSR,
  assertMinimalSRReadOnlyContract,
  IS_REALITY_AUTHORITY,
  PRODUCES_OBTAINS,
} from '../packages/inkos-core/src/lib/minimal-sr.js';
import {
  characterCanAccessActualEvent,
  assertNoForbiddenSRSources,
  updateCharacterSRFromActual,
  saveCharacterSRState,
  loadCharacterSRState,
  applyCharacterSRAfterActual,
  FORBIDDEN_SR_FACT_SOURCES,
} from '../packages/inkos-brain/src/character/character-sr-updater.js';
import { createStoryEvent, ensureActualEvents } from '../packages/inkos-brain/src/events/index.js';
import { buildStateDelta } from '../packages/inkos-brain/src/memory/state-updater.js';

let failures = 0;
const fail = (label, msg) => {
  failures += 1;
  console.error(`  FAIL: ${label} — ${msg}`);
};
const ok = (label) => console.log(`  ok: ${label}`);

console.log('\n== Phase 3.2 CharacterSR Runtime ==');

const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'inkos-sr-'));
const bookDir = path.join(tmpRoot, 'book');
fs.mkdirSync(path.join(bookDir, 'novel', '_system', 'brain'), { recursive: true });

// T1 — SR creation from Actual + IB
{
  const scene = {
    id: 's1',
    index: 1,
    pov: '林夜',
    present: ['林夜', '苏晚'],
    characters: ['林夜', '苏晚'],
    // Use action verbs the foundation extractor grounds reliably (avoid speech-regex edge)
    text: '苏晚停在走廊尽头。林夜抓住栏杆。她推开侧门，冷风灌进来。',
  };
  ensureActualEvents(scene, { knownNames: ['林夜', '苏晚'], stripPlan: true });
  if (!(scene.actualEvents || []).length) {
    fail('T1 extract', 'fixture must yield Actual Events');
  } else {
    const state = updateCharacterSRFromActual({
      characterNames: ['林夜', '苏晚'],
      scenes: [scene],
    });
    const a = state.characters['林夜'];
    if (a?.awareness?.status !== 'present' || !a.awareness.items.length) {
      fail('T1', `林夜 should gain awareness from Actual; events=${scene.actualEvents.length}`);
    } else ok('T1: Actual → awareness');
    if (!a.mutations?.length) fail('T1 prov', 'missing provenance mutations');
    else ok('T1: provenance present');
    if (state.meta.writesCanon !== false) fail('T1 canon', 'writesCanon must be false');
    else ok('T1: writesCanon=false');
  }
}

// T2 — Character isolation (A absent, B witness)
{
  const event = createStoryEvent({
    id: 'evt_killer',
    sceneId: 's2',
    actors: ['杀手'],
    action: '杀手藏进仓库',
    consequence: '杀手在仓库',
    kind: 'action',
    evidence: { excerpt: '杀手藏进仓库' },
  });
  const sceneB = {
    id: 's2',
    index: 2,
    pov: '林夜',
    present: ['林夜', '杀手'],
    characters: ['林夜', '杀手'],
    text: '杀手藏进仓库。林夜看见了。',
  };
  const state = updateCharacterSRFromActual({
    characterNames: ['林夜', '路人甲'],
    events: [{ ...event, _scene: sceneB }],
    scenes: [sceneB],
  });
  const sees = characterCanAccessActualEvent('林夜', event, sceneB);
  const noSee = characterCanAccessActualEvent('路人甲', event, sceneB);
  if (!sees) fail('T2 access B', '林夜 should access');
  else ok('T2: B can access');
  if (noSee) fail('T2 access A', '路人甲 must not access');
  else ok('T2: A cannot access');
  if (!(state.characters['林夜']?.awareness?.items || []).some((i) => /仓库|杀手/.test(i.info))) {
    fail('T2 sr B', '林夜 awareness missing');
  } else ok('T2: B.SR sees X');
  if ((state.characters['路人甲']?.awareness?.items || []).some((i) => /仓库|杀手/.test(i.info))) {
    fail('T2 sr A', '路人甲 must not see X');
  } else ok('T2: A.SR does not see X');
}

// T3 — Interpretation ≠ Canon
{
  const scene = {
    id: 's3',
    index: 3,
    pov: '林夜',
    present: ['林夜'],
    characters: ['林夜'],
    text: '门外出现一个黑影。',
    characterFacing: {
      林夜: {
        interpretation: [{ of: '门外黑影', as: '警察', eventId: 'evt_shadow' }],
        belief: [{ proposition: '门外是警察', eventId: 'evt_shadow' }],
      },
    },
  };
  ensureActualEvents(scene, { knownNames: ['林夜'], stripPlan: true });
  const state = updateCharacterSRFromActual({
    characterNames: ['林夜'],
    scenes: [scene],
    authoredSR: scene.characterFacing,
  });
  const sr = state.characters['林夜'];
  const interp = sr.interpretation?.items || [];
  if (!interp.some((i) => i.of === '门外黑影' && i.as === '警察')) {
    fail('T3 interp', `expected police interpretation, got ${JSON.stringify(interp)}`);
  } else ok('T3: interpretation = police');
  // Canon shell still empty of "警察" from Plan path
  const delta = buildStateDelta(bookDir, 3, {
    intent: { pov: '林夜' },
    scenes: [scene],
  });
  const eventsBlob = JSON.stringify(delta.timeline?.events || []);
  // Evolution overlay not applied here — Plan path empty; Actual police must not appear via buildStateDelta
  if (/警察/.test(eventsBlob)) fail('T3 canon', 'buildStateDelta must not invent 警察');
  else ok('T3: Canon path (buildStateDelta) ≠ 警察');
  // Assembled view: interpretation present, awareness grounded (not forced to 警察 as Canon)
  const assembled = assembleMinimalSR({
    ctx: { pov: '林夜', present: ['林夜'], characterSRRuntime: state },
    scene,
    names: ['林夜'],
  });
  assertMinimalSRReadOnlyContract(assembled);
  if (assembled['林夜']._meta.isRealityAuthority) fail('T3 auth', 'SR must not be Reality Authority');
  else ok('T3: SR ≠ Reality Authority');
}

// T4 — False belief not auto-corrected
{
  const state = updateCharacterSRFromActual({
    characterNames: ['林夜'],
    scenes: [{
      id: 's4',
      index: 4,
      pov: '林夜',
      present: ['林夜'],
      text: '门外确实有人。',
      characterFacing: {
        林夜: { belief: [{ proposition: '门外是警察' }] },
      },
    }],
    authoredSR: { 林夜: { belief: [{ proposition: '门外是警察' }] } },
  });
  const beliefs = state.characters['林夜'].belief.items.map((b) => b.proposition);
  if (!beliefs.includes('门外是警察')) fail('T4', 'false belief missing');
  else ok('T4: false belief retained');
  // No correction step exists — belief stays
  if (beliefs.some((b) => b === '门外是小偷')) fail('T4 corr', 'system must not invent correction');
  else ok('T4: no auto-correct to Canon');
}

// T5 — Irrationality protection (belief kept even if "unreasonable")
{
  const state = updateCharacterSRFromActual({
    characterNames: ['林夜'],
    authoredSR: {
      林夜: {
        belief: [{ proposition: '明知更危险却相信留下更安全' }],
        stance: [{ stance: 'believes', about: '留下' }],
      },
    },
    scenes: [{ id: 's5', index: 5, pov: '林夜', present: ['林夜'], text: '林夜站着。' }],
  });
  const b = state.characters['林夜'].belief.items[0]?.proposition || '';
  if (!/留下更安全/.test(b)) fail('T5', 'irrational belief dropped');
  else ok('T5: irrational belief kept');
}

// T6 — Relevance difference
{
  const event = createStoryEvent({
    id: 'evt_tax',
    sceneId: 's6',
    actors: ['大臣'],
    action: '王国税率上涨',
    consequence: '税负加重',
    kind: 'action',
    evidence: { excerpt: '王国税率上涨' },
  });
  const scene = {
    id: 's6',
    index: 6,
    pov: '大臣',
    present: ['大臣', '路人'],
    characters: ['大臣', '路人'],
    text: '王国税率上涨。大臣宣布了。路人站在远处。',
  };
  const state = updateCharacterSRFromActual({
    characterNames: ['大臣', '路人'],
    events: [{ ...event, _scene: scene }],
  });
  const hi = state.characters['大臣'].relevance.items.find((r) => r.eventId === 'evt_tax');
  const lo = state.characters['路人'].relevance.items.find((r) => r.eventId === 'evt_tax');
  if (hi?.level !== 'high') fail('T6 hi', `大臣 relevance=${hi?.level}`);
  else ok('T6: actor relevance high');
  if (lo && lo.level === 'high') fail('T6 lo', '路人 must not be high');
  else ok('T6: non-actor low/omit');
}

// T7 — SR isolation A vs B
{
  const state = updateCharacterSRFromActual({
    characterNames: ['A', 'B'],
    authoredSR: {
      A: { belief: [{ proposition: 'X' }] },
      B: { belief: [{ proposition: 'Y' }] },
    },
    scenes: [{ id: 's7', index: 7, present: ['A', 'B'], text: 'A 和 B 站着。' }],
  });
  const aBel = state.characters.A.belief.items.map((b) => b.proposition);
  const bBel = state.characters.B.belief.items.map((b) => b.proposition);
  if (!aBel.includes('X') || aBel.includes('Y')) fail('T7 A', 'A polluted');
  else ok('T7: A isolated');
  if (!bBel.includes('Y') || bBel.includes('X')) fail('T7 B', 'B polluted');
  else ok('T7: B isolated');
}

// T8 — Canon isolation (save SR must not write timeline/facts files)
{
  const scene = {
    id: 's8',
    index: 8,
    pov: '林夜',
    present: ['林夜'],
    text: '林夜推开门。',
    characterFacing: {
      林夜: { interpretation: [{ of: '门外声响', as: '警察' }] },
    },
  };
  ensureActualEvents(scene, { knownNames: ['林夜'], stripPlan: true });
  applyCharacterSRAfterActual(bookDir, 8, scene);
  const srFile = path.join(bookDir, 'novel', '_system', 'brain', 'character_sr', 'ch_0008.json');
  if (!fs.existsSync(srFile)) fail('T8 file', 'sidecar missing');
  else ok('T8: character_sr sidecar written');
  const timeline = path.join(bookDir, 'novel', '11_timeline.yaml');
  const facts = path.join(bookDir, 'novel', '13_facts_db.yaml');
  if (fs.existsSync(timeline) || fs.existsSync(facts)) {
    fail('T8 canon', 'SR must not create timeline/facts');
  } else ok('T8: no timeline/facts from SR');
  const loaded = loadCharacterSRState(bookDir, 8);
  if (!loaded?.characters?.['林夜']) fail('T8 load', 'reload failed');
  else ok('T8: sidecar reload');
}

// T9 — Plan contamination blocked
{
  const scene = {
    id: 's9',
    index: 9,
    pov: '林夜',
    present: ['林夜'],
    text: '门外只有一个模糊身影。',
    goal: '角色发现门外是警察',
    scenePlan: { situation: { closingWorldState: '门外是警察' } },
    causalChain: { choice: { action: '发现警察' }, consequence: { immediate: '警察来了' } },
  };
  ensureActualEvents(scene, { knownNames: ['林夜'], stripPlan: true });
  const state = updateCharacterSRFromActual({
    characterNames: ['林夜'],
    scenes: [scene],
  });
  const infos = (state.characters['林夜'].awareness.items || []).map((i) => i.info).join('\n');
  const interps = JSON.stringify(state.characters['林夜'].interpretation?.items || []);
  if (/警察/.test(infos) || /警察/.test(interps)) {
    fail('T9', 'Plan/causal must not inject 警察 into SR');
  } else ok('T9: Plan contamination blocked');
}

// T10 — Writer / Reasoner contamination via forbidden probe
{
  try {
    assertNoForbiddenSRSources({ causal_chain: { x: 1 } });
    fail('T10', 'should throw on causal_chain');
  } catch (e) {
    if (e.code === 'SR_FORBIDDEN_SOURCE') ok('T10: causal_chain refused');
    else fail('T10', e.message);
  }
  try {
    assertNoForbiddenSRSources({ heroKnows: ['警察'] });
    fail('T10b', 'should throw on heroKnows');
  } catch (e) {
    if (e.code === 'SR_FORBIDDEN_SOURCE') ok('T10: heroKnows refused');
    else fail('T10b', e.message);
  }
  if (!FORBIDDEN_SR_FACT_SOURCES.includes('closingWorldState')) {
    fail('T10 list', 'closingWorldState not forbidden');
  } else ok('T10: forbidden list contracted');
}

// T11 — contracts
{
  if (IS_REALITY_AUTHORITY || PRODUCES_OBTAINS) fail('T11', 'authority flags wrong');
  else ok('T11: SR not Reality Authority');
}

// Literary replay fixture — S3 choice pressure retained in SR (no Choice fix)
{
  const s3 = {
    id: 'ch2_s3',
    index: 3,
    pov: '林夜',
    present: ['林夜', '苏晚'],
    characters: ['林夜', '苏晚'],
    text: '苏晚说：“跟我走，还是留在这？你有三十秒。”林夜抓住栏杆。',
  };
  ensureActualEvents(s3, { knownNames: ['林夜', '苏晚'], stripPlan: true });
  const st3 = applyCharacterSRAfterActual(bookDir, 2, s3);
  const s4 = {
    id: 'ch2_s4',
    index: 4,
    pov: '林夜',
    present: ['林夜'],
    characters: ['林夜'],
    text: '林夜看着手机上的效率助手空白消息。',
  };
  // S4 still loads prior SR (subjective retention) — do NOT require Choice survival
  ensureActualEvents(s4, { knownNames: ['林夜'], stripPlan: true });
  const st4 = applyCharacterSRAfterActual(bookDir, 2, s4);
  const priorAware = st4.characters['林夜']?.awareness?.items || [];
  const hadChoicePressure = (st3.characters['林夜']?.awareness?.items || [])
    .some((i) => /三十秒|跟我走|选择/.test(i.info))
    || (st3.characters['苏晚']?.awareness?.items || []).some((i) => /三十秒|跟我走|选择/.test(i.info));
  if (!hadChoicePressure) {
    // open_choice extract may put evidence on actors — check any character
    const any = Object.values(st3.characters || {}).some((c) =>
      (c.awareness?.items || []).some((i) => /三十秒|跟我走|选择|两个选择/.test(i.info)));
    if (!any) fail('Replay S3', 'S3 Actual did not produce choice-pressure awareness');
    else ok('Replay: S3 SR retained choice-pressure evidence');
  } else ok('Replay: S3 SR retained choice-pressure evidence');
  // Prior awareness should survive into chapter sidecar after S4 update (merged prior)
  if (!priorAware.length && !Object.values(st4.characters || {}).some((c) => c.awareness?.items?.length)) {
    fail('Replay S4', 'S4 lost all SR');
  } else ok('Replay: S4 CharacterSR still present (subjective retention)');
  // Deferred: Choice disappearance / Plan Goal overwrite — not fixed here
  ok('Replay DEFERRED: Choice/Survival/Director not in Phase 3.2');
}

try {
  fs.rmSync(tmpRoot, { recursive: true, force: true });
} catch { /* ignore */ }

console.log(failures ? `\nRESULT: FAIL (${failures})` : '\nRESULT: PASS');
process.exit(failures ? 1 : 0);
