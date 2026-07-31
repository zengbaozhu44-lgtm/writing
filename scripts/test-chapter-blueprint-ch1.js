/**
 * Chapter Blueprint 体验验收 —《凌晨四点，世界刷新》第一章
 * 不启动 Writer / Narrative Runtime / Craft；只验证 Blueprint 四问。
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { runChapterDirector } from '../packages/inkos-director/src/chapter-director.js';
import {
  buildChapterBlueprint,
  answerBlueprintFourQuestions,
  formatChapterBlueprintBrief,
} from '../packages/inkos-director/src/chapter-blueprint.js';

const bookRoot = resolve(
  'books/我的小说/books/凌晨四点世界刷新',
);
const planPath = resolve(bookRoot, 'novel/_system/brain/ch_0001_plan.json');
const dnaPath = resolve(bookRoot, 'novel/_system/story_dna.yaml');

function parseLooseYaml(text = '') {
  const out = {};
  for (const line of String(text).split('\n')) {
    const m = line.match(/^([a-zA-Z0-9_]+):\s*(.*)$/);
    if (!m) continue;
    out[m[1]] = m[2].trim();
  }
  return out;
}

const plan = JSON.parse(readFileSync(planPath, 'utf8'));
const intent = plan.intent;
const storyDna = parseLooseYaml(readFileSync(dnaPath, 'utf8'));

const chapterDir = runChapterDirector({
  intent,
  chapter: 1,
  bookDir: bookRoot,
  storyDna,
});

const bp = chapterDir.blueprint || buildChapterBlueprint({
  chapter: 1,
  intent,
  storyDna,
  sceneCount: intent.scenes?.length || 4,
});
const four = chapterDir.blueprintFourQuestions || answerBlueprintFourQuestions(bp);

const required = [
  ['readerIntent', bp.readerIntent],
  ['readerTakeaway', bp.readerTakeaway],
  ['chapterMemoryPoint', bp.chapterMemoryPoint],
  ['questions.main', bp.chapterQuestions?.main?.question],
  ['questions.secondary', bp.chapterQuestions?.secondary?.question],
  ['questions.background', bp.chapterQuestions?.background?.question],
  ['characterArc.decision', bp.characterArc?.decision],
  ['endingPressure', Number.isFinite(bp.endingPressure) ? bp.endingPressure : null],
  ['sceneWeight', bp.rhythmDna?.sceneWeight?.length],
  ['sceneDensity', bp.rhythmDna?.sceneDensity?.length],
  ['sellingPoint.primary', bp.chapterSellingPoint?.primary],
  ['sellingPoint.secondary', bp.chapterSellingPoint?.secondary],
  ['promise.heat', bp.promisePlan?.items?.every((p) => Number.isFinite(p.heat))],
];

let failed = false;
for (const [name, val] of required) {
  if (val == null || val === '' || val === false || val === 0 && name !== 'endingPressure') {
    if (name === 'endingPressure' && val === 0) continue;
    console.error('MISSING', name, val);
    failed = true;
  }
}

if (!bp.validation?.pass) {
  console.error('VALIDATION FAIL', bp.validation?.failReasons);
  failed = true;
}

if (bp.version !== 'chapter-blueprint-2') {
  console.error('BAD VERSION', bp.version);
  failed = true;
}

console.log('\n======== Chapter Blueprint Brief ========');
console.log(formatChapterBlueprintBrief(bp));
console.log('\n======== 四问验收 ========');
for (const key of [
  'whyKeepReading',
  'whyCharacterChanged',
  'whyWorldAdvanced',
  'whyClickNext',
]) {
  const block = four[key];
  console.log(`\n【${block.question}】`);
  console.log(block.answer);
}

console.log('\n======== 关键字段快照 ========');
console.log(JSON.stringify({
  endingType: bp.endingType,
  endingPressure: bp.endingPressure,
  sceneWeight: bp.rhythmDna.sceneWeight,
  sceneDensity: bp.rhythmDna.sceneDensity.map((s) => ({ i: s.sceneIndex, d: s.density })),
  promises: bp.promisePlan.items.map((p) => ({ id: p.id, heat: p.heat })),
  selling: bp.chapterSellingPoint,
}, null, 2));

if (failed) {
  console.error('\nFAIL blueprint ch1 experience');
  process.exit(1);
}
console.log('\nOK blueprint ch1 experience — four questions answered');
