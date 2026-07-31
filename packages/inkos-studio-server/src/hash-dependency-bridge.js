/**
 * Hash Dependency 桥接 — Canon 写入自动同步 Hash + 依赖树 SSE
 */
import { loadBrainContext } from '../../inkos-brain/src/loader.js';
import { onCanonModified, loadDependencyTree } from '@inkos/hash-dependency';
import { readStoryDna, readSystemFile } from './system-store.js';
import { resolveModuleKey } from './module-service.js';
import { getBookMeta } from './book-service.js';
import { studioEmitRuntimeEvent } from './event-stream.js';

export function readHashDependencyTree(bookDir, chapter) {
  return loadDependencyTree(bookDir, chapter);
}

export function syncHashAfterCanonWrite(bookDir, { triggerKey, chapter, bookId = null } = {}) {
  try {
    const meta = getBookMeta(bookDir);
    const ch = chapter || meta.currentChapter || 1;
    const ctx = loadBrainContext(bookDir, { chapter: ch });
    const storyDna = readStoryDna(bookDir) || {};
    const styleDna = readSystemFile(bookDir, 'style_dna') || {};
    const resolved = triggerKey ? resolveModuleKey(triggerKey) : null;

    const result = onCanonModified({
      bookDir,
      chapter: ch,
      ctx,
      storyDna,
      styleDna,
      trigger: 'canon-write',
      triggerKey: resolved,
    });

    if (result) {
      studioEmitRuntimeEvent(bookDir, bookId, 'hashDependencyTreeUpdated', {
        chapter: ch,
        tree: result.tree,
        changed: result.changed,
        invalidated: result.invalidated,
        triggerKey: resolved,
        combinedHash: result.tree?.combinedHash,
      });
    }

    return result;
  } catch (err) {
    console.warn('[hash-dependency] canon sync failed:', err.message);
    return null;
  }
}
