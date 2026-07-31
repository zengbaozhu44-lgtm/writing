/**
 * @inkos/hash-dependency — Hash Dependency（PR8）
 *
 * 替代固定 Tier Prompt Cache：按模块 Hash 追踪依赖，
 * 任意变化 → Invalidate → 重新 Compile，禁止旧 Prompt。
 */
export { runHashDependencyCheck, invalidateAllPromptCaches } from './engine.js';
export { onCanonModified, invalidateAllBookPromptCaches } from './canon-sync.js';
export { computeModuleHashes, MODULE_KEYS, extractModuleTexts } from './collect.js';
export { hashContent, hashCombined } from './hash.js';
export {
  isSemanticallyEquivalent,
  semanticSimilarity,
  semanticFingerprint,
  computeSemanticHashes,
} from './semantic-hash.js';
export {
  buildCacheDependencyReport,
  persistCacheDependencyReport,
  getHashDependencyDir,
} from './report.js';
export {
  buildHashDependencyTree,
  persistDependencyTree,
  loadDependencyTree,
} from './tree.js';
export {
  buildDependencyGraph,
  persistDependencyGraph,
  loadDependencyGraph,
  invalidateAffectedPromptCaches,
  invalidateBookByCanonChange,
  getAffectedSceneIndices,
  MODULE_SCENE_SCOPE,
} from './graph.js';
export {
  loadCanonHashState,
  saveCanonHashState,
  modulesForCanonKey,
  CANON_TRIGGER_MODULES,
} from './canon-state.js';
export { MODULE_LABELS, STATUS } from './labels.js';
