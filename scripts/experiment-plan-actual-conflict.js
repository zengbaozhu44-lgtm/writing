#!/usr/bin/env node
/**
 * Plan–Actual conflict real production experiment (v2)
 * - Archaeology of prompt positions + F8.3
 * - Case A (consistent) + Case B×3 (conflict)
 * - Full-budget vs default-budget clip comparison
 * - Writer body runs if LLM configured
 */
import fs from 'node:fs';
import path from 'node:path';
import { ensureActualEvents } from '../packages/inkos-brain/src/events/event-extractor.js';
import {
  collectPreviousActualEvents,
  formatActualEventsBlock,
} from '../packages/inkos-brain/src/events/actual-events-prompt.js';
import {
  ensurePlanValidity,
  formatPlanValidityDemotionBlock,
  isExecutionPrivilegeDemoted,
  evaluatePlanValidity,
} from '../packages/inkos-prompt/src/plan-validity.js';
import {
  compileSlimBeatUserPrompt,
  BEAT_PROMPT_CHAR_BUDGET,
  clipBeatPromptToBudget,
} from '../packages/inkos-studio-server/src/writer-optimization/beat-slimmer.js';
import { chatCompletion, isLlmConfigured } from '../packages/inkos-brain/src/writer/llm-writer.js';
import { loadInkOsConfig } from '../packages/inkos-core/src/lib/config.js';

const OUT = path.join(process.cwd(), 'tmp-plan-actual-conflict');
fs.mkdirSync(OUT, { recursive: true });

function classifyLocation(text = '') {
  const t = String(text || '');
  if (t.startsWith('ERROR:')) return 'ERROR';
  const outside = /走廊|门外|离开了房间|走出房间|不在房间|房门外|已经离开|走了出去/u.test(t);
  const inside = /仍在房间|房间内|屋里|房里翻|抽屉|房间里继续|仍在屋里|回到房间|又进了房间/u.test(t);
  if (outside && inside) return 'MIXED';
  if (outside && !inside) return 'OUTSIDE';
  if (inside && !outside) return 'INSIDE';
  if (/离开|走出|门外|走廊/u.test(t) && !/房间内|屋里|抽屉/u.test(t)) return 'OUTSIDE_WEAK';
  if (/房间|屋里|抽屉/u.test(t) && !/走廊|离开|走出/u.test(t)) return 'INSIDE_WEAK';
  return 'UNCLEAR';
}

function scan(tag, prompt, pv) {
  return {
    tag,
    len: prompt.length,
    budgetAtCompile: BEAT_PROMPT_CHAR_BUDGET,
    hasOccHeader: /Previous Scene Occurrence Events/.test(prompt),
    hasOccAction: /推开房门|reported happening/.test(prompt),
    hasOutsideCue: /离开了房间|不在房间|走廊/.test(prompt),
    hasPlanInside: /仍在房间|房间内翻找|抽屉/.test(prompt),
    hasPlanOutside: /走廊里继续|门外是否/.test(prompt),
    hasSceneGoal: /Scene explicit goal/.test(prompt),
    hasChapterGoal: /章目标/.test(prompt),
    hasContinuitySoft: /不得用 Plan 覆盖/.test(prompt),
    hasDemotion: /Plan Validity|executionPrivilege=/.test(prompt),
    hasBeatInstr: /## 当前 Beat|指令：/.test(prompt),
    f83: pv?.status,
    demoted: isExecutionPrivilegeDemoted(pv),
  };
}

const sceneN = {
  id: 's1',
  index: 1,
  pov: '苏晚',
  characters: ['苏晚'],
  text: [
    '苏晚推开房门，头也不回地走了出去。',
    '门锁在身后咔哒一声扣上。',
    '走廊里只剩下她的脚步声——她已经离开了房间，不在房间里。',
  ].join(''),
};
ensureActualEvents(sceneN, { knownNames: ['苏晚'], stripPlan: true });

function makeBeat(goal) {
  return {
    order: 1,
    label: '承接',
    structuralBeat: 'goal',
    libraryBeat: 'Discovery',
    content: goal,
    wordBudget: 180,
    beforeState: '上一场已结束',
    afterState: '本场必须推进',
  };
}

function compile(goal, mainGoal) {
  const scene2 = {
    id: 's2',
    index: 2,
    pov: '苏晚',
    goal,
    conflict: '时间紧迫',
    characters: ['苏晚'],
  };
  const intent = { pov: '苏晚', mainGoal, scenes: [sceneN, scene2] };
  ensurePlanValidity(scene2, intent);
  const prompt = compileSlimBeatUserPrompt({
    beat: makeBeat(goal),
    scene: scene2,
    intent,
    executionPlan: { scenePlan: { goal }, beats: [makeBeat(goal)] },
    accumulatedText: '',
    continuityState: null,
    beatMemory: null,
    profile: null,
  });
  return {
    prompt,
    pv: scene2.planValidity,
    demotion: formatPlanValidityDemotionBlock(scene2.planValidity),
    actualBlock: formatActualEventsBlock(collectPreviousActualEvents([sceneN])),
  };
}

console.log('# Plan–Actual Conflict Experiment v2');
console.log(`compile budget = ${BEAT_PROMPT_CHAR_BUDGET}`);
console.log(`Scene N actualEvents = ${(sceneN.actualEvents || []).map((e) => e.action).join(' | ')}`);

const f83Room = evaluatePlanValidity({
  actualText: sceneN.text,
  nPlus1Plan: { goal: '苏晚仍在房间内翻找抽屉，确认文件还在。' },
});
const f83Hospital = evaluatePlanValidity({
  actualText: '苏晚站在公司楼下，电梯门刚关上。',
  nPlus1Plan: { goal: '苏晚在医院的病床上醒来，亲眼目睹世界刷新。' },
});
console.log('\n## F8.3');
console.log(`  room leave vs remain-inside: status=${f83Room.status} privilege=${f83Room.executionPrivilege} conflicts=${(f83Room.conflicts || []).map((c) => c.type).join(',') || 'none'}`);
console.log(`  company vs hospital (detectable): status=${f83Hospital.status} privilege=${f83Hospital.executionPrivilege}`);

const caseA = compile(
  '苏晚在走廊里继续追查线索，确认门外是否有人跟踪。',
  '苏晚在走廊完成追查',
);
const caseB = compile(
  '苏晚仍在房间内翻找抽屉，确认文件还在。',
  '苏晚仍在房间内完成搜查',
);

fs.writeFileSync(path.join(OUT, 'caseA-prompt-full.txt'), caseA.prompt);
fs.writeFileSync(path.join(OUT, 'caseB-prompt-full.txt'), caseB.prompt);

const scanA = scan('CaseA-full', caseA.prompt, caseA.pv);
const scanB = scan('CaseB-full', caseB.prompt, caseB.pv);
console.log('\n## Full-budget Writer input scan');
console.log(JSON.stringify(scanA, null, 2));
console.log(JSON.stringify(scanB, null, 2));

// Simulate default production budget clip (1400) on the compiled full prompt parts
const clippedA = clipBeatPromptToBudget(caseA.prompt.split(/\n\n/), 1400);
const clippedB = clipBeatPromptToBudget(caseB.prompt.split(/\n\n/), 1400);
fs.writeFileSync(path.join(OUT, 'caseA-prompt-clipped1400.txt'), clippedA);
fs.writeFileSync(path.join(OUT, 'caseB-prompt-clipped1400.txt'), clippedB);
console.log('\n## Default-budget (1400) clip scan — production Studio default');
console.log(JSON.stringify(scan('CaseA-clip1400', clippedA, caseA.pv), null, 2));
console.log(JSON.stringify(scan('CaseB-clip1400', clippedB, caseB.pv), null, 2));

// PROTECT_RE archaeology note
console.log('\n## Prompt module priority / survival (beat-slimmer clipBeatPromptToBudget)');
console.log('  PROTECTED: Semantic Protected / Story Clock / IB / Observed Continuity / Scene explicit goal / Plan Validity / Beat / narrative 七元素');
console.log('  NOT PROTECTED: Previous Scene Occurrence Events (Actual) / Proven World Consequences');
console.log('  Last-resort compact keeps: F1 + OC + Plan Validity + Scene explicit goal + Beat + tail — DROPS Actual Occurrence Events');
console.log('  F8.3: demotion soft instruction only; strategicGoalPreserved=true; no hard delete of Plan goal');
console.log('  No code-level hard override Actual>Plan or Plan>Actual');

async function runWriter(prompt, tag) {
  const cfg = loadInkOsConfig().llm || {};
  const result = await chatCompletion({
    baseUrl: cfg.baseUrl,
    apiKey: cfg.apiKey,
    model: cfg.model,
    messages: [
      {
        role: 'system',
        content: '你是小说正文写手。只输出连续小说正文，不要标题、不要解释、不要 JSON。字数约 120–200 字。',
      },
      { role: 'user', content: prompt },
    ],
    maxTokens: 450,
    temperature: 0.4,
  });
  const text = String(result?.content || result?.text || result || '').trim();
  fs.writeFileSync(path.join(OUT, `${tag}.txt`), text);
  return text;
}

const llm = isLlmConfigured();
console.log(`\n## Writer body runs (llmConfigured=${llm})`);
const writer = { caseA: null, caseB: [] };

if (llm) {
  try {
    // Prefer full-budget prompts so both Actual and Plan are visible (isolates authority, not clip loss)
    const outA = await runWriter(caseA.prompt, 'caseA-writer');
    writer.caseA = { loc: classifyLocation(outA), text: outA };
    console.log(`\n### Case A → ${writer.caseA.loc}`);
    console.log(`  ${outA.slice(0, 200).replace(/\n/g, ' ')}`);

    for (let i = 1; i <= 3; i += 1) {
      const out = await runWriter(caseB.prompt, `caseB-writer-${i}`);
      const row = { i, loc: classifyLocation(out), text: out };
      writer.caseB.push(row);
      console.log(`\n### Case B run ${i} → ${row.loc}`);
      console.log(`  ${out.slice(0, 200).replace(/\n/g, ' ')}`);
    }
  } catch (err) {
    console.error(`LLM error: ${err.message}`);
    writer.error = err.message;
  }
} else {
  console.log('  SKIP — LLM not configured');
}

const bLocs = writer.caseB.map((r) => r.loc);
fs.writeFileSync(
  path.join(OUT, 'summary2.json'),
  JSON.stringify({
    sceneN: { text: sceneN.text, actualEvents: sceneN.actualEvents },
    f83Room,
    f83Hospital: { status: f83Hospital.status, privilege: f83Hospital.executionPrivilege },
    scanA,
    scanB,
    clipA: scan('CaseA-clip1400', clippedA, caseA.pv),
    clipB: scan('CaseB-clip1400', clippedB, caseB.pv),
    writer,
    bLocs,
  }, null, 2),
);

console.log('\n## Case B location tally', bLocs);
console.log(`Artifacts → ${OUT}`);
console.log('DONE');
