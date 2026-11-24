/**
 * Story Route sidecar writer — non-canon only.
 */
import fs from 'node:fs';
import path from 'node:path';
import { writeJson } from '../../inkos-core/src/lib/paths.js';
import { storyRouteDir } from './load-route-input.js';
import { ROUTE_VERSION } from './contract.js';

export function ensureStoryRouteDir(bookDir) {
  const dir = storyRouteDir(bookDir);
  fs.mkdirSync(dir, { recursive: true });
  fs.mkdirSync(path.join(dir, 'traces'), { recursive: true });
  return dir;
}

/**
 * @param {string} bookDir
 * @param {object} payload
 */
export function writeRouteSidecar(bookDir, payload) {
  const dir = ensureStoryRouteDir(bookDir);
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const tracePath = path.join(dir, 'traces', `route_${ts}.json`);

  const latest = {
    version: ROUTE_VERSION,
    generated_at: new Date().toISOString(),
    chapter: payload.chapter,
    projection_excluded: payload.projection?.excluded || [],
    candidates: payload.candidates || [],
    filter: payload.filter || null,
    selection: payload.selection || null,
    provenance: {
      generator: payload.generator?.source || 'unknown',
      selector: payload.selection?.method || 'unknown',
    },
  };

  const selected = {
    version: ROUTE_VERSION,
    generated_at: latest.generated_at,
    chapter: payload.chapter,
    selected_route_id: payload.selection?.selected_route_id,
    selected_route: payload.selection?.selected_route,
    selection: {
      method: payload.selection?.method,
      reasons: payload.selection?.reasons || [],
      rejected: payload.selection?.rejected || [],
    },
  };

  writeJson(path.join(dir, 'latest_routes.json'), latest);
  writeJson(path.join(dir, 'selected_route.json'), selected);
  writeJson(tracePath, { ...latest, selected });

  return {
    dir,
    latest_routes: path.join(dir, 'latest_routes.json'),
    selected_route: path.join(dir, 'selected_route.json'),
    trace: tracePath,
  };
}
