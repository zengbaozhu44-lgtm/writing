/**
 * Review 后处理日志 — 委托 @inkos/writer-optimizer
 */
import fs from 'node:fs';
import path from 'node:path';
import { writeJson } from '../../../inkos-core/src/lib/paths.js';
import { getWriterOptimizationDir } from './compile-writer-prompt.js';

export { MAX_REWRITES as MAX_STUDIO_REWRITES } from '@inkos/writer-optimizer';
export {
  analyzeCommercialScene as postReviewProcess,
  runWriterOptimizer,
} from '@inkos/writer-optimizer';

export function persistWriterMetricsLog(bookDir, chapter, scene, payload) {
  try {
    const dir = path.join(getWriterOptimizationDir(bookDir), 'metrics');
    fs.mkdirSync(dir, { recursive: true });
    const file = path.join(
      dir,
      `ch_${String(chapter).padStart(4, '0')}_scene_${String(scene?.index ?? 0).padStart(2, '0')}.json`,
    );
    writeJson(file, { ...payload, at: new Date().toISOString() });
    return file;
  } catch {
    return null;
  }
}
