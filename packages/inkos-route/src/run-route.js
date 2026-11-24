/**
 * Story Route V1 — full pipeline orchestration.
 */
import { buildRouteInput } from './load-route-input.js';
import { generateRouteCandidates } from './generate-candidates.js';
import { filterRouteCandidates } from './hard-filter.js';
import { selectRouteQualitatively } from './select-route.js';
import { writeRouteSidecar } from './sidecar.js';

/**
 * @param {string} bookDir
 * @param {{ chapter?: number, pov?: string, present?: string[], mock?: boolean, llm?: object }} [options]
 */
export async function runStoryRouteGenerate(bookDir, options = {}) {
  const input = buildRouteInput(bookDir, {
    chapter: options.chapter,
    pov: options.pov,
    present: options.present,
  });

  const generator = await generateRouteCandidates(input.route_input, {
    mock: options.mock,
    llm: options.llm,
  });

  const filter = filterRouteCandidates(
    generator.candidates,
    input.route_input.hard_constraints,
  );

  if (!filter.valid.length) {
    const detail = filter.invalid.map((i) => `${i.id}: ${i.violations[0]?.code}`).join('; ');
    throw new Error(`所有候选路线均未通过 hard filter: ${detail}`);
  }

  const selection = await selectRouteQualitatively(
    filter.valid,
    input.route_input,
    {
      invalid: filter.invalid,
      mock: options.mock,
      llm: options.llm,
    },
  );

  const paths = writeRouteSidecar(bookDir, {
    chapter: input.chapter,
    projection: input.projection,
    candidates: generator.candidates,
    generator,
    filter,
    selection,
  });

  return {
    version: input.version,
    bookDir,
    chapter: input.chapter,
    projection: input.projection,
    route_input: input.route_input,
    generator,
    filter,
    selection,
    paths,
  };
}
