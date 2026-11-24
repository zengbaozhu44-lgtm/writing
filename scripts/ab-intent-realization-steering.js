#!/usr/bin/env node
/**
 * Intent Realization Steering A/B（真实 LLM，全生产链，不改任何 Truth Gate）
 *
 * A = 现 Intent 块（默认）；B = +realizationGuidance（默认关闭的 opt-in）。
 * 每 run：真实 Writer 写正文 → Phase 1.3 LLM 提取+闸门 → 冻结 correspondence
 *         → Character Action → WCT。
 * 指标：Character Action PASS 率 / WCT 率 / 机械复读（Y 逐字入 prose）/
 *       false correspondence（asserted 但语义不符——人工审计）/ 自然度（人工）。
 */
import fs from 'node:fs';
import path from 'node:path';
import { createLlmWriter } from '../packages/inkos-brain/src/writer/llm-writer.js';
import { formatActionIntentTruthForPrompt, deriveActionIntentTruth } from '../packages/inkos-brain/src/causality/action-intent-truth.js';
import { createCADE } from '../packages/inkos-brain/src/causality/cade.js';
import { deriveCharacterActionTruth, normalizeActionContent } from '../packages/inkos-brain/src/causality/character-action-truth.js';
import { deriveWorldConsequenceTruth } from '../packages/inkos-brain/src/causality/world-consequence-truth.js';
import { extractStoryEventsLLMAssisted } from '../packages/inkos-brain/src/events/event-extractor-llm.js';

const RUNS = Number(process.env.AB_RUNS || 5);
const PROVIDER = { baseUrl: 'https://api.deepseek.com', model: 'deepseek-chat', maxTokens: 1800, temperature: 0.85 };
const EXTRACT_LLM = { baseUrl: PROVIDER.baseUrl, model: PROVIDER.model };
const KNOWN = ['林逸', '苏眠', '镜渊'];

const SCENARIOS = [
  {
    id: 'archive',
    pov: '林逸',
    y: '砸碎档案柜玻璃取出档案',
    goal: '林逸潜入档案馆档案区取出K字头卷宗，巡逻脚步声正在逼近',
    conflict: '柜子上锁、警铃待触、时间只剩几分钟',
  },
  {
    id: 'map',
    pov: '苏眠',
    y: '当着镜渊的面烧掉真地图',
    goal: '仓库后间对峙升级，苏眠用真地图逼镜渊让步',
    conflict: '镜渊的人守住出口，谈判濒临破裂',
  },
];

function buildPrompt(sc, intentBlock) {
  return [
    '# Scene Lore Seed',
    '',
    `Scene 1/1 · POV ${sc.pov}`,
    `- 目标: ${sc.goal}`,
    `- 冲突: ${sc.conflict}`,
    `- 节拍: complication`,
    `- 字数: ~450 字`,
    '',
    intentBlock,
  ].filter(Boolean).join('\n');
}

async function main() {
  const key = JSON.parse(fs.readFileSync('books/我的小说/.inkos/secrets.json', 'utf8')).services.deepseek.apiKey;
  const writer = createLlmWriter({ ...PROVIDER, apiKey: key });
  const outDir = path.resolve('tmp-ab');
  fs.mkdirSync(outDir, { recursive: true });

  const ARMS = process.env.AB_ARMS ? process.env.AB_ARMS.split(',') : ['A', 'B'];
  const results = [];
  for (const sc of SCENARIOS) {
    for (const arm of ARMS) {
      for (let run = 1; run <= RUNS; run += 1) {
        const cade = createCADE({
          characterId: sc.pov, actionContent: sc.y, decisionKind: 'commits',
          sourceRef: 'authored.character_decision', sceneId: 's1', chapter: 1,
        }).cade;
        const intentTruth = deriveActionIntentTruth(cade);
        const block = formatActionIntentTruthForPrompt(
          intentTruth,
          arm === 'B' ? { realizationGuidance: true } : arm === 'B2' ? { realizationGuidanceAnchored: true } : {},
        );
        const prompt = buildPrompt(sc, block);
        let prose = '';
        try {
          prose = await writer({
            scene: { id: `${sc.id}_${arm}${run}`, index: 1, goal: sc.goal, wordTarget: 450 },
            prompt, chapter: 1, bookDir: null,
            ctx: { pov: sc.pov }, intent: { pov: sc.pov, scenes: [] },
          });
        } catch (e) {
          results.push({ sc: sc.id, arm, run, error: String(e.message || e) });
          continue;
        }

        // Phase 1.3 提取（真实 LLM + 闸门）
        const scene = { id: `${sc.id}_${arm}${run}`, index: 1, text: prose, characters: KNOWN, pov: sc.pov };
        const ext = await extractStoryEventsLLMAssisted(scene, { knownNames: KNOWN, llm: { ...EXTRACT_LLM, apiKey: key } });
        const occurrences = ext.events;

        // 冻结链
        const cat = deriveCharacterActionTruth({ intentTruth, occurrences });
        const wct = deriveWorldConsequenceTruth({ characterActionTruth: cat, occurrences, sceneText: prose });
        const yN = normalizeActionContent(sc.y);
        const proseN = normalizeActionContent(prose);
        const mechanicalCopy = proseN.includes(yN);

        results.push({
          sc: sc.id, arm, run,
          catStatus: cat.status, catReason: cat.reason || null,
          wctStatus: wct.status, wctW: wct.worldChangeContent || null,
          events: occurrences.length, fallback: ext.meta.fallbackUsed,
          mechanicalCopy, prose, y: sc.y,
        });
        console.log(`[${sc.id}/${arm}${run}] cat=${cat.status}${cat.status === 'absent' ? `(${cat.reason})` : ''} wct=${wct.status} ev=${occurrences.length} mechCopy=${mechanicalCopy}`);
      }
    }
  }

  // 汇总
  const summary = {};
  for (const arm of ['A', 'B']) {
    const rs = results.filter((r) => r.arm === arm && !r.error);
    const bySc = {};
    for (const scid of SCENARIOS.map((s) => s.id)) {
      const x = rs.filter((r) => r.sc === scid);
      bySc[scid] = {
        n: x.length,
        catPass: x.filter((r) => r.catStatus === 'asserted').length,
        wct: x.filter((r) => r.wctStatus === 'asserted').length,
        mech: x.filter((r) => r.mechanicalCopy).length,
        reasons: [...new Set(x.filter((r) => r.catStatus === 'absent').map((r) => r.catReason))],
      };
    }
    summary[arm] = bySc;
  }
  console.log('\n=== SUMMARY ===');
  console.log(JSON.stringify(summary, null, 1));
  fs.writeFileSync(path.join(outDir, 'results.json'), JSON.stringify({ summary, results }, null, 2));
  console.log('→ tmp-ab/results.json');
}

main().catch((e) => { console.error(e); process.exit(1); });
