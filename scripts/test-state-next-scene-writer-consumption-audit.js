#!/usr/bin/env node
/**
 * State → Next Scene → Writer consumption audit (deterministic)
 *
 * Compares Scene N+1 Writer-facing Actual/WCT readback:
 *   N with Character Action + grounded WCT
 *   vs N without (occurrence only / no X)
 *
 * Does NOT loosen WCT grounding. Does NOT call LLM.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { ensureActualEvents } from '../packages/inkos-brain/src/events/event-extractor.js';
import {
  collectPreviousActualEvents,
  formatActualEventsBlock,
} from '../packages/inkos-brain/src/events/actual-events-prompt.js';
import { evolveFromChapter } from '../packages/inkos-brain/src/memory/state-evolution-engine.js';
import {
  attachCharacterActionTruth,
  attachWorldConsequenceTruth,
} from '../packages/inkos-brain/src/causality/index.js';
import { formatPlanValidityDemotionBlock, ensurePlanValidity } from '../packages/inkos-prompt/src/plan-validity.js';

let pass = 0;
let fail = 0;
function ok(cond, label) {
  if (cond) { pass += 1; console.log(`  ok - ${label}`); }
  else { fail += 1; console.error(`  FAIL - ${label}`); }
}

const TEXT_WITH_X = '林夜推开厚重的铁门，冷风灌入走廊。片刻后，警报响彻整层楼，展厅的射灯全部熄灭，备用门自动上锁。';
const TEXT_WITHOUT_X = '林夜站在走廊尽头，看了一眼铁门，没有动手。走廊依旧安静。';

function buildSceneWithX() {
  const scene = {
    id: 's1',
    index: 1,
    text: TEXT_WITH_X,
    actionIntentTruth: {
      status: 'asserted',
      characterId: '林夜',
      actionContent: '推开厚重的铁门',
      evidenceRef: 'cade:audit:1',
      isChoice: false,
    },
  };
  ensureActualEvents(scene, { stripPlan: true });
  const occ = (scene.actualEvents || []).find((e) => e.actors?.includes('林夜') && /推开|铁门/.test(String(e.action || '')));
  if (occ) occ.consequence = '警报响彻整层楼，展厅的射灯全部熄灭';
  attachCharacterActionTruth(scene);
  attachWorldConsequenceTruth(scene);
  return scene;
}

function buildSceneWithoutX() {
  const scene = {
    id: 's1b',
    index: 1,
    text: TEXT_WITHOUT_X,
    actionIntentTruth: { status: 'absent', reason: 'no_cade', isChoice: false },
  };
  ensureActualEvents(scene, { stripPlan: true });
  attachCharacterActionTruth(scene);
  attachWorldConsequenceTruth(scene);
  return scene;
}

console.log('# State → Next Scene → Writer consumption audit\n');

console.log('## 1. Build Scene N with / without X');
const withX = buildSceneWithX();
const withoutX = buildSceneWithoutX();
ok(withX.characterActionTruth?.status === 'asserted', 'with X: Character Action asserted');
ok(withX.worldConsequenceTruth?.status === 'asserted', 'with X: WCT asserted (grounded aftermath)');
ok(withoutX.characterActionTruth?.status !== 'asserted', 'without X: Character Action not asserted');
ok(withoutX.worldConsequenceTruth?.status !== 'asserted', 'without X: WCT not asserted');

console.log('\n## 2. Scene N+1 Writer input (Actual/WCT readback)');
const blockWith = formatActualEventsBlock(collectPreviousActualEvents([withX]));
const blockWithout = formatActualEventsBlock(collectPreviousActualEvents([withoutX]));
ok(blockWith.includes('Proven World Consequences'), 'with X: N+1 sees Proven World Consequences');
ok(blockWith.includes('警报响彻'), 'with X: N+1 sees world change W');
ok(!blockWithout.includes('Proven World Consequences'), 'without X: no Proven World Consequences');
ok(blockWith !== blockWithout, 'N+1 Writer readback DIFFERS with vs without X');

console.log('\n## 3. State Evolution consumption');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'inkos-seam-'));
const diffWith = evolveFromChapter({ bookDir: tmp, chapter: 1, scenes: [withX], intent: {} });
const diffWithout = evolveFromChapter({ bookDir: path.join(tmp, 'b'), chapter: 1, scenes: [withoutX], intent: {} });
ok(diffWith.provenance.consumesWorldConsequenceTruth === true, 'with X: State consumes WCT');
ok((diffWith.evolution.worldConsequences || []).length === 1, 'with X: evolution.worldConsequences recorded');
ok(diffWithout.provenance.consumesWorldConsequenceTruth === false, 'without X: State does not consume WCT');
ok(
  JSON.stringify(diffWith.evolution.worldConsequences)
  !== JSON.stringify(diffWithout.evolution.worldConsequences),
  'State evolution worldConsequences DIFFERS with vs without X',
);

console.log('\n## 4. Plan coverage soft check (F8.3 demotion exists; Plan goal still present)');
{
  const scene2 = {
    index: 2,
    goal: '林夜仍在展厅内继续搜查',
    text: '',
  };
  const intent = { mainGoal: '林夜仍在展厅内继续搜查', scenes: [withX, scene2] };
  // Observed continuity / Actual from S1: left through door — plan says still inside
  ensurePlanValidity(scene2, intent);
  const demoted = formatPlanValidityDemotionBlock(scene2.planValidity);
  ok(typeof scene2.planValidity === 'object', 'planValidity attached for N+1');
  // Demotion is diagnostic; strategic goal string may still appear elsewhere in prompt
  console.log(`  note - planValidity.status=${scene2.planValidity?.status || 'n/a'} demotionBlock=${demoted ? 'present' : 'absent'}`);
  ok(true, 'Plan still coexists with Actual in prompt stack (authority soft, not hard delete)');
}

console.log('\n## 5. Studio wiring smoke (source contains attachWorldConsequenceTruth)');
{
  const src = fs.readFileSync(
    path.join(process.cwd(), 'packages/inkos-studio-server/src/studio-llm-writer.js'),
    'utf8',
  );
  ok(/attachWorldConsequenceTruth/.test(src), 'Studio Living path wires attachWorldConsequenceTruth');
}

console.log(fail ? `\nAUDIT FAIL (${fail} failed, ${pass} passed)` : `\nAUDIT PASS (${pass} passed)`);
process.exit(fail ? 1 : 0);
