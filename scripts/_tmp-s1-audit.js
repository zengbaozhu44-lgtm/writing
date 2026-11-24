import { loadBrainContext } from '../packages/inkos-brain/src/loader.js';
import {
  projectStoryTruth,
  runCausalReasoning,
  isTemplateFallback,
  TEMPLATE_FALLBACKS,
} from '../packages/inkos-brain/src/causal/causal-reasoner.js';
import {
  loadAuthoredChapterPlan,
  isAuthoredPlanSpecific,
  planChapter,
  serializeAuthoredPlanToIntent,
} from '../packages/inkos-brain/src/planner/planner.js';
import { buildScenePlan } from '../packages/inkos-brain/src/scene/scene.js';

const ROOT = new URL('..', import.meta.url).pathname;
const book = (name) => `${ROOT}books/我的小说/books/${name}`;
const BOOKS = {
  sai: book('赛博修仙我靠玩家暴打克苏鲁旧日神'),
  ershou: book('二手书店老板的最后一周'),
};

function classifyTask(ctx) {
  const rows = [];
  for (const [k, v] of Object.entries(ctx.chapterTask || {})) {
    const s = String(v || '').trim();
    if (!s) {
      rows.push({ field: k, class: 'empty', value: '' });
      continue;
    }
    rows.push({
      field: k,
      class: isTemplateFallback(s) ? 'scaffold_template' : 'authored_or_specific',
      value: s.slice(0, 100),
    });
  }
  return rows;
}

function scanIntentTemplates(intent) {
  const hits = [];
  const walk = (obj, path = '') => {
    if (typeof obj === 'string') {
      const t = obj.trim();
      if (TEMPLATE_FALLBACKS.has(t) || isTemplateFallback(t) && t === 'no_causal_basis') {
        if (TEMPLATE_FALLBACKS.has(t)) hits.push({ path, value: t });
      } else if ([...TEMPLATE_FALLBACKS].some((x) => t.includes(x))) {
        hits.push({ path, value: t.slice(0, 80), note: 'contains_template_substring' });
      }
      return;
    }
    if (Array.isArray(obj)) obj.forEach((v, i) => walk(v, `${path}[${i}]`));
    else if (obj && typeof obj === 'object') {
      for (const [k, v] of Object.entries(obj)) walk(v, path ? `${path}.${k}` : k);
    }
  };
  walk(intent);
  return hits;
}

for (const [label, bookDir, chapter] of [
  ['sai-ch17', BOOKS.sai, 17],
  ['sai-ch5', BOOKS.sai, 5],
  ['sai-ch1', BOOKS.sai, 1],
  ['ershou-ch1', BOOKS.ershou, 1],
]) {
  console.log(`\n======== ${label} ========`);
  const ctx = loadBrainContext(bookDir, { chapter });
  const plan = loadAuthoredChapterPlan(bookDir, chapter);
  console.log('authoredPlan file:', plan?._file || null);
  console.log('authoredPlan specific:', isAuthoredPlanSpecific(plan));
  if (plan) {
    for (const k of ['goal', 'conflict', 'obstacle1', 'climax', 'choice', 'cost', 'hook', 'ending']) {
      if (plan[k] == null) continue;
      const s = String(plan[k]);
      console.log(`  plan.${k}: [${isTemplateFallback(s) ? 'TPL' : 'OK'}] ${s.slice(0, 70)}`);
    }
  }
  console.log('09 fields:');
  for (const r of classifyTask(ctx)) {
    console.log(`  [${r.class}] ${r.field}: ${r.value}`);
  }
  const st = projectStoryTruth(bookDir, { chapter });
  console.log('world_pressure:', JSON.stringify({
    event: st.world_pressure.event?.slice?.(0, 60) || st.world_pressure.event,
    obstacle: st.world_pressure.obstacle,
    cost: st.world_pressure.cost,
    hook: st.world_pressure.hook,
    authoredClimax: st.world_pressure.authoredClimax?.slice?.(0, 40) || st.world_pressure.authoredClimax,
    authoredChoice: st.world_pressure.authoredChoice,
    required_event: st.world_pressure.required_event,
  }));
  const { causalChain } = runCausalReasoning(bookDir, { chapter });
  console.log('causal:', {
    grade: causalChain.confidence.grade,
    ncb: causalChain.no_causal_basis,
    deg: causalChain.trace?.degradation,
    pressure: causalChain.pressure,
    choice: causalChain.choice?.action?.slice?.(0, 40),
    next: causalChain.next_pressure?.pressure?.slice?.(0, 40),
  });

  // Planner / intent leakage (non-causal path)
  let intent;
  try {
    if (isAuthoredPlanSpecific(plan)) {
      intent = serializeAuthoredPlanToIntent(plan, chapter, null);
    } else {
      intent = planChapter(ctx, chapter);
    }
  } catch (e) {
    intent = { error: e.message };
  }
  const hits = scanIntentTemplates(intent);
  console.log('intent template hits:', hits.length ? hits.slice(0, 12) : 'none');
  if (intent.scenes) {
    const scenes = buildScenePlan(intent);
    console.log('scene goals sample:', scenes.slice(0, 3).map((s) => ({
      i: s.index,
      goal: String(s.goal || '').slice(0, 50),
      conflict: String(s.conflict || '').slice(0, 40),
    })));
  }
}
