/**
 * Load Route sidecar inputs + assemble full RouteInput contract.
 */
import path from 'node:path';
import { exists, readText } from '../../inkos-core/src/lib/paths.js';
import { readYaml } from '../../inkos-core/src/lib/yaml-store.js';
import { loadBrainContext } from '../../inkos-brain/src/loader.js';
import { loadPriorChapterAnchor } from '../../inkos-brain/src/planner/planner.js';
import { projectRouteRealityInput } from './project-route-reality.js';
import {
  ROUTE_VERSION,
  normalizeHardConstraints,
  normalizeLiteraryOrientation,
} from './contract.js';

export function storyRouteDir(bookDir) {
  return path.join(bookDir, 'novel', '_system', 'story-route');
}

export function loadSidecarInputs(bookDir) {
  const root = storyRouteDir(bookDir);
  const trajectoryPath = path.join(root, 'author_trajectory.md');
  const constraintsPath = path.join(root, 'hard_constraints.yaml');
  const orientationPath = path.join(root, 'literary_orientation.yaml');

  let authorInitialTrajectory = '';
  let trajectoryProvenance = { kind: 'default_empty', source: 'author_trajectory.md' };
  if (exists(trajectoryPath)) {
    authorInitialTrajectory = readText(trajectoryPath).trim();
    trajectoryProvenance = { kind: 'authored', source: 'author_trajectory.md' };
  }

  let hardConstraints = [];
  let constraintsProvenance = { kind: 'default_empty', source: 'hard_constraints.yaml' };
  if (exists(constraintsPath)) {
    try {
      hardConstraints = normalizeHardConstraints(readYaml(constraintsPath));
      constraintsProvenance = { kind: 'authored', source: 'hard_constraints.yaml' };
    } catch {
      hardConstraints = [];
    }
  }

  let literaryOrientation = normalizeLiteraryOrientation();
  let orientationProvenance = { kind: 'default_empty', source: 'literary_orientation.yaml' };
  if (exists(orientationPath)) {
    try {
      literaryOrientation = normalizeLiteraryOrientation(readYaml(orientationPath));
      orientationProvenance = { kind: 'authored', source: 'literary_orientation.yaml' };
    } catch {
      literaryOrientation = normalizeLiteraryOrientation();
    }
  }

  return {
    author_initial_trajectory: authorInitialTrajectory,
    hard_constraints: hardConstraints,
    literary_orientation: literaryOrientation,
    provenance: {
      author_initial_trajectory: trajectoryProvenance,
      hard_constraints: constraintsProvenance,
      literary_orientation: orientationProvenance,
    },
  };
}

/**
 * @param {string} bookDir
 * @param {{ chapter?: number, pov?: string, present?: string[] }} [options]
 */
export function buildRouteInput(bookDir, options = {}) {
  let ctx = loadBrainContext(bookDir, {
    chapter: options.chapter,
    pov: options.pov,
    present: options.present,
  });

  const priorChapter = Number(ctx.chapter) - 1;
  let priorAnchor = null;
  if (priorChapter >= 1) {
    try {
      priorAnchor = loadPriorChapterAnchor(bookDir, priorChapter, { required: false });
    } catch {
      priorAnchor = null;
    }
  }

  let projection = projectRouteRealityInput(ctx, {
    priorAnchor,
    chapter: ctx.chapter,
    pov: options.pov,
    present: options.present,
  });

  // Reload characters for chapter-N cast (timeline POV may differ from stale 08/09)
  if (
    projection.resolvedPov
    && (projection.resolvedPov !== ctx.pov
      || (projection.resolvedPresent?.length
        && projection.resolvedPresent.some((n) => !ctx.characters?.[n])))
  ) {
    ctx = loadBrainContext(bookDir, {
      chapter: options.chapter ?? ctx.chapter,
      pov: projection.resolvedPov,
      present: projection.resolvedPresent,
    });
    projection = projectRouteRealityInput(ctx, {
      priorAnchor,
      chapter: ctx.chapter,
      pov: projection.resolvedPov,
      present: projection.resolvedPresent,
    });
  }

  const sidecar = loadSidecarInputs(bookDir);

  return {
    version: ROUTE_VERSION,
    bookDir,
    chapter: ctx.chapter,
    projection,
    route_input: {
      world: projection.confirmed.world,
      people: projection.confirmed.people,
      relations: projection.confirmed.relations,
      history: projection.confirmed.history,
      current_reality: projection.confirmed.current_reality,
      author_initial_trajectory: sidecar.author_initial_trajectory,
      hard_constraints: sidecar.hard_constraints,
      literary_orientation: sidecar.literary_orientation,
    },
    provenance: sidecar.provenance,
  };
}
