#!/usr/bin/env node
/**
 * Phase 1 — Minimal SR Read-only Projection VERIFY
 * Categories A–H from Phase 1 authorization.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  assembleMinimalSR,
  assembleCharacterMinimalSR,
  formatCharacterSRForPrompt,
  extractMotiveSeedsFromBible,
  assertMinimalSRReadOnlyContract,
  PRODUCES_OBTAINS,
  IS_REALITY_AUTHORITY,
} from '../packages/inkos-core/src/lib/minimal-sr.js';
import { sourceProducesObtains } from '../packages/inkos-core/src/lib/authority-act.js';
import { compileScenePrompt } from '../packages/inkos-prompt/src/compiler.js';

let failures = 0;
const fail = (msg) => {
  failures += 1;
  console.error(`  FAIL: ${msg}`);
};
const ok = (msg) => console.log(`  ok: ${msg}`);

console.log('\n== Phase 1 Minimal SR VERIFY ==');

// --- A. Awareness boundary ---
{
  const ctx = {
    pov: '阿梅',
    present: ['阿梅', '丈夫'],
    knowledge: {
      matrix: [
        { info: '丈夫提出离婚', 阿梅: 'know', 丈夫: 'know' },
        { info: '丈夫出轨证据', 阿梅: 'unknown', 丈夫: 'know' },
        { info: '公司裁员名单', 阿梅: 'partial', 丈夫: 'unknown' },
      ],
    },
    relationships: [],
    characters: {
      阿梅: { name: '阿梅', publicGoal: '维持婚姻', values: '重视家庭', personality: '责任感强' },
    },
    facts: [{ fact: '丈夫出轨证据已客观存在' }],
  };
  const sr = assembleCharacterMinimalSR(ctx, {}, '阿梅');
  const infos = sr.awareness.items.map((i) => i.info);
  if (!infos.includes('丈夫提出离婚')) fail('A: known info missing');
  else ok('A: know → awareness');
  if (!infos.includes('公司裁员名单')) fail('A: partial should enter awareness');
  else ok('A: partial → awareness');
  if (infos.includes('丈夫出轨证据')) fail('A: unknown must NOT enter awareness');
  else ok('A: unknown excluded from awareness');
  // Objective fact alone ≠ awareness
  if (infos.some((i) => i.includes('客观存在'))) fail('A: Reality/facts must not auto→awareness');
  else ok('A: facts ↛ awareness');
}

// --- B. Stance boundary ---
{
  const ctx = {
    pov: '阿梅',
    characters: { 阿梅: { name: '阿梅', personality: '多疑' } },
    knowledge: { matrix: [] },
    relationships: [],
  };
  const bare = assembleCharacterMinimalSR(ctx, {}, '阿梅');
  if (bare.stance.status !== 'omit') fail('B: no evidence should omit stance');
  else ok('B: no evidence → stance omit');

  const withAuthored = assembleCharacterMinimalSR(
    {
      ...ctx,
      authoredCharacterSR: {
        阿梅: {
          stance: [{ stance: 'suspects', about: '婚姻还能维持', source: 'scene_dialogue' }],
        },
      },
    },
    {},
    '阿梅',
  );
  if (withAuthored.stance.items[0]?.stance !== 'suspects') fail('B: authored stance not projected');
  else ok('B: authored stance projected');
}

// --- C. Motive boundary (Bible ≠ current Motive) ---
{
  const ctx = {
    pov: '阿梅',
    characters: {
      阿梅: {
        name: '阿梅',
        publicGoal: '维持婚姻',
        values: '责任感强',
        personality: '重视家庭',
        realGoal: '不想被抛弃',
      },
    },
    knowledge: { matrix: [] },
    relationships: [],
  };
  const seeds = extractMotiveSeedsFromBible(ctx.characters.阿梅);
  if (!seeds.seeds.length) fail('C: bible seeds should exist as seeds');
  else ok('C: bible yields motive seeds');

  const sr = assembleCharacterMinimalSR(ctx, { goal: '面对离婚提议' }, '阿梅');
  if (sr.motive.status !== 'omit' || sr.motive.items.length) {
    fail('C: bible/personality/scene goal must NOT auto-create Motive');
  } else ok('C: bible ↛ current Motive');

  if (!sr.long_term_motive_seeds?.length) fail('C: seeds should be diagnostic-only present');
  else ok('C: seeds kept off Motive channel');

  // Authored motive OK
  const authored = assembleCharacterMinimalSR(
    {
      ...ctx,
      authoredCharacterSR: {
        阿梅: { motive: [{ text: '先问清他是否已决意离开', polarity: 'pursue' }] },
      },
    },
    {},
    '阿梅',
  );
  if (authored.motive.items[0]?.text !== '先问清他是否已决意离开') fail('C: authored motive missing');
  else ok('C: authored motive allowed');

  assertMinimalSRReadOnlyContract({ 阿梅: sr });
  ok('C: contract: bible seed not in Motive provenance');
}

// --- D. Contradiction ---
{
  const sr = assembleCharacterMinimalSR(
    {
      pov: '阿梅',
      characters: { 阿梅: { name: '阿梅' } },
      knowledge: { matrix: [] },
      relationships: [],
      authoredCharacterSR: {
        阿梅: {
          motive: [
            { text: '想挽回婚姻', polarity: 'pursue' },
            { text: '想立刻结束这段关系', polarity: 'pursue' },
          ],
          affect_relationship: ['愤怒', '依恋'],
        },
      },
    },
    {},
    '阿梅',
  );
  if (sr.motive.items.length !== 2) fail('D: conflicting motives must coexist');
  else ok('D: conflicting motives kept');
  if (sr.affect_relationship.items.length < 2) fail('D: conflicting affect must coexist');
  else ok('D: conflicting affect kept');
}

// --- E. Unknown ---
{
  const sr = assembleCharacterMinimalSR(
    { pov: '路人', characters: {}, knowledge: { matrix: [] }, relationships: [] },
    {},
    '路人',
  );
  if (sr.awareness.status !== 'omit' || sr.stance.status !== 'omit' || sr.motive.status !== 'omit') {
    fail('E: empty evidence must omit');
  } else ok('E: omit on missing evidence');
  if (sr.validity.value !== 'current') fail('E: default validity should be current');
  else ok('E: validity default = current (no persistence)');
}

// --- F. Reality isolation ---
{
  if (PRODUCES_OBTAINS || IS_REALITY_AUTHORITY) fail('F: SR flags wrong');
  else ok('F: SR flags ≠ Authority');
  if (sourceProducesObtains('minimalSR') || sourceProducesObtains('characterSR')) {
    fail('F: authority-act must not treat SR as obtains source');
  } else ok('F: sourceProducesObtains(SR) false/undefined');
  const map = assembleMinimalSR({
    ctx: {
      pov: '阿梅',
      knowledge: { matrix: [{ info: '秘密', 阿梅: 'know' }] },
      relationships: [],
      characters: {},
    },
  });
  assertMinimalSRReadOnlyContract(map);
  ok('F: assertMinimalSRReadOnlyContract');
}

// --- G. Shared path (compileScenePrompt) ---
{
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'inkos-p1-sr-'));
  const novel = path.join(tmp, 'novel');
  fs.mkdirSync(path.join(novel, '_system', 'brain'), { recursive: true });
  const ctx = {
    bookDir: tmp,
    chapter: 1,
    pov: '阿梅',
    present: ['阿梅'],
    knowledge: {
      matrix: [{ info: '丈夫提出离婚', 阿梅: 'know' }],
    },
    relationships: [{ from: '阿梅', to: '丈夫', trust: -2, hostility: 1 }],
    characters: {
      阿梅: {
        name: '阿梅',
        raw: '- **公开目标**：维持婚姻\n- **价值观**：责任感强',
        publicGoal: '维持婚姻',
        values: '责任感强',
      },
    },
    facts: [],
    timeline: [],
    resources: { by_character: {} },
    foreshadow: [],
    factions: {},
    writingBible: '',
    worldBible: '',
    currentStateMd: '| 字段 | 值 |\n|------|-----|\n| POV | 阿梅 |\n',
    intent: { pov: '阿梅', mainGoal: '处理离婚谈话' },
  };
  const scene = {
    id: 's1',
    index: 1,
    title: '离婚谈话',
    goal: '谈清去留',
    conflict: '对方已决意离开',
    entities: ['阿梅'],
  };
  const compiled = compileScenePrompt(ctx, scene);
  const prompt = compiled.text || '';
  if (!prompt.includes('Character Subjective State')) fail('G: prompt missing SR block label');
  else ok('G: compileScenePrompt includes Character Subjective State');
  if (!prompt.includes('丈夫提出离婚')) fail('G: awareness not in prompt');
  else ok('G: awareness reaches shared prompt');
  if (!prompt.includes('阿梅↔丈夫') && !prompt.includes('Affect / Relationship')) {
    fail('G: affect/relationship projection missing');
  } else ok('G: affect/relationship in SR path');
  const motiveSection = prompt.split('**Motive**')[1]?.slice(0, 280) || '';
  if (motiveSection.includes('[pursue] 维持婚姻') || motiveSection.includes('[pursue] 责任感')) {
    fail('G: bible goal leaked into Motive in prompt');
  } else ok('G: Motive omit despite bible (prompt)');
  if (!ctx.characterSR?.阿梅) fail('G: ctx.characterSR not attached');
  else ok('G: ctx.characterSR attached on compile');
  try {
    fs.rmSync(tmp, { recursive: true, force: true });
  } catch { /* ignore */ }
}

// --- H. Non-write ---
{
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'inkos-p1-nowrite-'));
  const before = fs.readdirSync(tmp);
  assembleMinimalSR({
    ctx: {
      bookDir: tmp,
      pov: 'X',
      knowledge: { matrix: [{ info: 'y', X: 'know' }] },
      relationships: [],
      characters: {},
    },
  });
  const after = fs.readdirSync(tmp);
  if (JSON.stringify(before) !== JSON.stringify(after)) fail('H: assembleMinimalSR wrote files');
  else ok('H: assembleMinimalSR writes nothing');
  // No Canon touch helpers imported
  const src = fs.readFileSync(
    new URL('../packages/inkos-core/src/lib/minimal-sr.js', import.meta.url),
    'utf8',
  );
  if (/writeText|writeJson|applyPostChapter|writeCharacterBrain|MemoryUnit/.test(src)) {
    fail('H: minimal-sr.js must not import/write Canon helpers');
  } else ok('H: no Canon write symbols in minimal-sr.js');
  try {
    fs.rmSync(tmp, { recursive: true, force: true });
  } catch { /* ignore */ }
}

// format smoke
{
  const block = formatCharacterSRForPrompt({
    阿梅: assembleCharacterMinimalSR(
      {
        pov: '阿梅',
        knowledge: { matrix: [] },
        relationships: [],
        characters: { 阿梅: { name: '阿梅' } },
      },
      {},
      '阿梅',
    ),
  });
  if (!block.includes('omit')) fail('format should show omit');
  else ok('format: omit visible to Writer');
}

if (failures) {
  console.error(`\nPhase 1 Minimal SR FAILED: ${failures}`);
  process.exit(1);
}
console.log('\nPhase 1 Minimal SR PASSED — read-only View only; STOP (no persistence / no Planner / no Choice)\n');
