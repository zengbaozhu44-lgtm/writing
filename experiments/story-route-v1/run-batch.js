/**
 * Story Route V1 — 10-case acceptance batch (real LLM).
 *
 *   node experiments/story-route-v1/run-batch.js
 *   node experiments/story-route-v1/run-batch.js --case C07
 *   node experiments/story-route-v1/run-batch.js --from C03
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { getBookPaths } from '../../packages/inkos-core/src/lib/book.js';
import { exists, readText, writeJson } from '../../packages/inkos-core/src/lib/paths.js';
import { runStoryRouteGenerate } from '../../packages/inkos-route/src/index.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const EXP = path.join(ROOT, 'experiments/story-route-v1');
const CASES = JSON.parse(readText(path.join(EXP, 'cases.json')));

function sha256(filePath) {
  if (!exists(filePath)) return null;
  return crypto.createHash('sha256').update(readText(filePath)).digest('hex');
}

function canonSnapshot(bookDir) {
  const bp = getBookPaths(bookDir);
  const m = bp.modules;
  return {
    timeline: sha256(m.timeline),
    facts_db: sha256(m.facts_db),
    current_state: sha256(m.current_state),
    current_chapter: sha256(m.current_chapter),
  };
}

function copySidecar(caseId, bookDir) {
  const src = path.join(EXP, 'sidecars', caseId);
  const dest = path.join(bookDir, 'novel', '_system', 'story-route');
  fs.mkdirSync(dest, { recursive: true });
  for (const name of ['author_trajectory.md', 'hard_constraints.yaml', 'literary_orientation.yaml']) {
    fs.copyFileSync(path.join(src, name), path.join(dest, name));
  }
}

function parseArgs(argv) {
  const flags = { case: null, from: null };
  const positional = [];
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--case') flags.case = argv[++i];
    else if (a === '--from') flags.from = argv[++i];
    else positional.push(a);
  }
  return flags;
}

async function runOne(caseDef) {
  const bookDir = path.join(ROOT, caseDef.book);
  const outDir = path.join(EXP, 'results', caseDef.id);
  fs.mkdirSync(outDir, { recursive: true });

  console.log(`\n━━ ${caseDef.id} · ${caseDef.label} ━━`);
  console.log(`  book: ${caseDef.book} ch${caseDef.chapter}`);
  console.log(`  probe: ${caseDef.probe}`);

  if (!exists(path.join(bookDir, 'book.json'))) {
    throw new Error(`book not found: ${bookDir}`);
  }

  copySidecar(caseDef.sidecar, bookDir);
  const before = canonSnapshot(bookDir);
  const t0 = Date.now();

  const result = await runStoryRouteGenerate(bookDir, { chapter: caseDef.chapter });
  const elapsed = Date.now() - t0;
  const after = canonSnapshot(bookDir);

  const pollution = Object.keys(before).filter((k) => before[k] !== after[k]);
  const payload = {
    case: caseDef,
    elapsed_ms: elapsed,
    canon_before: before,
    canon_after: after,
    canon_pollution: pollution,
    projection_confirmed: result.projection?.confirmed || null,
    projection_excluded: result.projection?.excluded || null,
    candidates: result.generator?.candidates || [],
    filter: result.filter,
    selection: result.selection,
    selected_route: result.selection?.selected_route || null,
  };

  writeJson(path.join(outDir, 'result.json'), payload);
  if (result.paths?.selected_route && exists(result.paths.selected_route)) {
    fs.copyFileSync(result.paths.selected_route, path.join(outDir, 'selected_route.json'));
  }

  console.log(`  candidates: ${payload.candidates.length} → valid ${result.filter?.valid?.length}`);
  console.log(`  selected: ${result.selection?.selected_route_id} · ${result.selection?.selected_route?.title}`);
  console.log(`  elapsed: ${(elapsed / 1000).toFixed(1)}s`);
  if (pollution.length) {
    console.error(`  ⚠ CANON POLLUTION: ${pollution.join(', ')}`);
  } else {
    console.log('  canon: unchanged ✓');
  }

  return { caseDef, payload, pollution };
}

async function main() {
  const flags = parseArgs(process.argv.slice(2));
  let cases = CASES.cases;
  if (flags.case) cases = cases.filter((c) => c.id === flags.case);
  if (flags.from) {
    const idx = CASES.cases.findIndex((c) => c.id === flags.from);
    if (idx >= 0) cases = CASES.cases.slice(idx);
  }

  console.log(`Story Route V1 batch · ${cases.length} case(s) · real LLM`);
  const summary = [];

  for (const caseDef of cases) {
    try {
      const r = await runOne(caseDef);
      summary.push({
        id: caseDef.id,
        ok: true,
        pollution: r.pollution,
        selected: r.payload.selection?.selected_route_id,
        title: r.payload.selected_route?.title,
      });
    } catch (err) {
      console.error(`  FAIL ${caseDef.id}: ${err.message}`);
      summary.push({ id: caseDef.id, ok: false, error: err.message });
    }
  }

  writeJson(path.join(EXP, 'results', 'batch_summary.json'), {
    run_at: new Date().toISOString(),
    cases: summary,
  });
  console.log('\n━━ batch complete ━━');
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
