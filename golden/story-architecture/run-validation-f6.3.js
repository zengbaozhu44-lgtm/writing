#!/usr/bin/env node
/**
 * F6.3 production + contrast validation (golden artifacts only; no Canon write)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildObservedContinuity,
  ensureObservedContinuity,
  collectPreviousObservedContinuity,
} from '../../packages/inkos-prompt/src/scene-observed-continuity.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const BOOK = path.join(ROOT, 'books/我的小说/books/凌晨四点世界刷新');
const OUT = path.join(ROOT, 'golden/story-architecture/validation-f6.3');

function loadCh2() {
  const f = path.join(BOOK, 'novel/_system/brain/ch_0002_scenes.json');
  const data = JSON.parse(fs.readFileSync(f, 'utf8'));
  return (data.scenes || []).slice(0, 3).map((s) => ({
    index: s.index,
    id: s.id,
    title: s.title,
    goal: s.goal,
    text: s.text || '',
  }));
}

/** Human audit checklist vs binder (MATCH/MISSING/OVER-INCLUDED/UNKNOWN) */
function humanRecallAudit(scenes) {
  const rows = [];

  const s1Human = [
    { key: 'door_warning_快跑', need: true },
    { key: 'notebook_告诉他真相', need: true },
    { key: 'clock_秒针', need: true },
    { key: 'open_choice_告诉真相与否', need: true },
    { key: 'tail_cliff_门缝', need: true },
    { key: 'location_天台', need: true },
    { key: 'scar_消失', need: true },
    { key: 'crash_陈述', need: true },
  ];
  const oc1 = buildObservedContinuity(scenes[0], scenes[0].text);
  const c1 = new Set((oc1.confirmed || []).map((x) => x.id));
  const u1 = new Set((oc1.unresolved || []).map((x) => x.id));
  const s1Map = {
    door_warning_快跑: c1.has('door_warning') ? 'MATCH' : 'MISSING',
    notebook_告诉他真相: c1.has('notebook_message') ? 'MATCH' : 'MISSING',
    clock_秒针: c1.has('clock_anomaly') ? 'MATCH' : 'MISSING',
    open_choice_告诉真相与否: u1.has('open_choice_s1') ? 'MATCH' : 'MISSING',
    tail_cliff_门缝: u1.has('tail_cliff_s1') ? 'MATCH' : 'MISSING',
    location_天台: 'MISSING',
    scar_消失: 'MISSING',
    crash_陈述: 'MISSING',
  };
  rows.push({ scene: 1, human: s1Human.map((h) => h.key), binder: s1Map, oc: oc1 });

  const oc2 = buildObservedContinuity(scenes[1], scenes[1].text);
  const s2Map = {
    open_choice_跟我走: (oc2.unresolved || []).some((u) => u.id === 'open_choice_s2') ? 'MATCH' : 'MISSING',
    video_消失半秒: 'MISSING',
    cctv_绷带证据: 'MISSING',
    location_公司: 'MISSING',
  };
  rows.push({ scene: 2, binder: s2Map, oc: oc2 });

  const oc3 = buildObservedContinuity(scenes[2], scenes[2].text);
  const s3Map = {
    refresh_hospital: 'UNKNOWN',
    open_choice_s3: (oc3.unresolved || []).some((u) => u.id === 'open_choice_s3') ? 'MATCH' : 'MISSING',
    clock_anomaly: (oc3.confirmed || []).some((c) => c.id === 'clock_anomaly') ? 'MATCH' : 'MISSING',
  };
  rows.push({ scene: 3, binder: s3Map, oc: oc3 });

  const toS3 = collectPreviousObservedContinuity(scenes.slice(0, 2), { planText: scenes[2].goal });
  return {
    perScene: rows,
    crossScene: {
      s1CriticalInS2: collectPreviousObservedContinuity([scenes[0]], { planText: scenes[1].goal }),
      s2OpenInS3: toS3.unresolved.filter((u) => /open_choice_s2/.test(u.id)),
      planHospitalClearedOpen: toS3.unresolved.every((u) => !/open_choice/.test(u.id)),
    },
  };
}

function precisionContrasts() {
  return [
    {
      id: 'contrast_pure_action',
      text: '她把手机放进包里，拉上拉链，站起身。',
      oc: buildObservedContinuity({ index: 1, id: 'c1' }, '她把手机放进包里，拉上拉链，站起身。'),
    },
    {
      id: 'contrast_plan_conflict',
      plan: '下一场去医院',
      text: '她决定不去医院。她把外套挂回衣架。',
      bundle: (() => {
        const s = { index: 1, id: 'c2', text: '她决定不去医院。她把外套挂回衣架。' };
        ensureObservedContinuity(s);
        return collectPreviousObservedContinuity([s], { planText: '下一场去医院' });
      })(),
    },
    {
      id: 'contrast_unresolved_carry',
      bundle: (() => {
        const a = { index: 1, id: 'c3a', text: '「跟我走。」或者留在这里。你有三十秒。' };
        const b = { index: 2, id: 'c3b', text: '雨越下越大。他仍站在门口。' };
        ensureObservedContinuity(a);
        ensureObservedContinuity(b);
        return collectPreviousObservedContinuity([a, b], { planText: '医院' });
      })(),
    },
  ];
}

function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const scenes = loadCh2();
  for (const s of scenes) ensureObservedContinuity(s);

  const recall = humanRecallAudit(scenes);
  const contrasts = precisionContrasts();

  const criticalMatch = ['door_warning_快跑', 'notebook_告诉他真相', 'clock_秒针', 'open_choice_告诉真相与否', 'tail_cliff_门缝']
    .every((k) => recall.perScene[0].binder[k] === 'MATCH');
  const s2Choice = recall.perScene[1].binder.open_choice_跟我走 === 'MATCH';
  const planDidNotClear = recall.crossScene.planHospitalClearedOpen === false
    && recall.crossScene.s2OpenInS3.length > 0;

  const contrastOk = contrasts[0].oc?.empty !== false
    && !(contrasts[0].oc?.confirmed?.length)
    && contrasts[2].bundle.unresolved.some((u) => /open_choice/.test(u.id));

  const summary = {
    book: '凌晨四点世界刷新',
    chapter: 2,
    criticalF61Recall: criticalMatch && s2Choice && planDidNotClear,
    knownRecallGaps: ['location_天台', 'scar_消失', 'crash_陈述', 'video_消失半秒', 'cctv_绷带证据', 'location_公司'],
    precisionContrastsOk: contrastOk,
    trivialQuoteOverInclude: (() => {
      const oc = buildObservedContinuity({ index: 1, id: 'q' }, '她说：「嗯。」然后坐下。');
      return (oc?.confirmed || []).some((c) => /嗯/.test(c.label));
    })(),
    allPass: criticalMatch && s2Choice && planDidNotClear && contrastOk,
  };

  fs.writeFileSync(path.join(OUT, 'recall_audit.json'), JSON.stringify(recall, null, 2));
  fs.writeFileSync(path.join(OUT, 'precision_contrasts.json'), JSON.stringify(contrasts, null, 2));
  fs.writeFileSync(path.join(OUT, 'summary.json'), JSON.stringify(summary, null, 2));
  console.log(JSON.stringify(summary, null, 2));
  process.exit(summary.allPass ? 0 : 1);
}

main();
