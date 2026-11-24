/**
 * Golden Baseline — 共享核心
 *
 * Phase 1.5：把 Runtime 章节生成（确定性骨架）固化为可对比基线。
 * 不用真实 LLM：确定性 writer stub + force 跑通全链（含 memory commit），
 * 捕获 execution plan / prompt fingerprint / gate outputs / memory mutation。
 *
 * 关键原则：
 *  - fixture 只读，每次运行复制到仓库外临时目录（避免 tryRealGitCommit 把文件 stage 进主仓库）
 *  - 基线只含确定性产物；时间戳/随机 id 由 canonicalizer 剥离
 *  - verify 重跑同 fixture → 深比较，漂移即失败
 */
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { RuntimeOrchestrator } from '../../packages/inkos-runtime/src/pipeline/orchestrator.js';
import { buildRuntimeContinuationBlock } from '../../packages/inkos-brain/src/writer/llm-writer.js';
import { optimizeWriterPrompt } from '../../packages/inkos-writer/src/optimizer.js';

// ── P3.2 Golden Determinism（方案 B，2026-08-20）───────────────────────────
// golden 不得复用生产 .env 的 LLM_API_KEY：否则 readerSimulator 走真实双评审 LLM，
// gateOutputs/reader_sim_baseline/run.json 全漂移，且 softFail 时 polish 会改写正文。
// 进程级清空 → loadInkOsConfig 读到空 key（loadDotEnv 只在 key 未设置时填充 .env 值，
// 见 config.js:15）→ readerSimulator 走既有确定性 heuristic/degraded 路径。
// 仅本进程内生效，进程退出即恢复，不修改 .env，不触生产代码。
process.env.INKOS_LLM_API_KEY = '';
process.env.LLM_API_KEY = '';

export const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const FIXTURE_DIR = path.join(__dirname, 'fixtures', 'book');

/** JSON 递归剥离的易变键：时间戳/运行 id/路径/编译耗时，不属于生成行为 */
const VOLATILE_KEYS = new Set([
  'committedAt', 'builtAt', 'attachedAt', 'updatedAt', 'finishedAt',
  'createdAt', 'startedAt', 'deferredAt', 'timestamp', 'ts',
  'traceId', 'traceDir', 'traceHtml', 'snapshotId', 'sessionId',
  'compile_time_ms', 'compileMs', 'elapsed', 'elapsedMs',
  // git-memory 原子快照：raw 短哈希（源含 compileMs）+ 易变 id；其 canonical 哈希已在 memoryMutation 独立追踪
  'snapshot',
]);

const ISO_TS = /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/g;
/** prompt-compiler v2 头部把 wall-clock compileMs 嵌入 prompt 文本 → 指纹/文件 canonical 一律打码 */
const COMPILE_MS = /compile=\d+ms/g;
const COMPILE_REPLACER = 'compile=<MS>';
/** run.json 内的绝对路径指向临时工作目录（每运行随机）→ 归一化 */
const WORKDIR_PATH = /\/inkos-golden-[A-Za-z0-9]+/g;
const WORKDIR_REPLACER = '/<WORKDIR>';

function sanitizeStringValue(s) {
  return s.replace(ISO_TS, '<TS>')
    .replace(COMPILE_MS, COMPILE_REPLACER)
    .replace(WORKDIR_PATH, WORKDIR_REPLACER);
}

/** 递归 JSON canonicalizer：剥易变键 + 键排序 → 稳定字符串 */
export function canonicalizeJson(value, key = '') {
  if (key && VOLATILE_KEYS.has(key)) return undefined;
  if (Array.isArray(value)) {
    const out = [];
    for (const item of value) {
      const c = canonicalizeJson(item);
      if (c !== undefined) out.push(c);
    }
    return out;
  }
  if (value && typeof value === 'object') {
    const out = {};
    for (const k of Object.keys(value).sort()) {
      const c = canonicalizeJson(value[k], k);
      if (c !== undefined) out[k] = c;
    }
    return out;
  }
  if (typeof value === 'string') return sanitizeStringValue(value);
  return value;
}

/** 文本文件 canonical 内容：ISO 时间戳/编译耗时打码 + 行尾规范化（YAML/md 通用） */
export function canonicalizeText(content) {
  return String(content).replace(/\r\n/g, '\n')
    .replace(ISO_TS, '<TS>')
    .replace(COMPILE_MS, COMPILE_REPLACER)
    .replace(/\n+$/g, '');
}

/** 最终 prompt 指纹输入：剥离 compileMs 后哈希 */
export function promptFingerprintText(text) {
  return sanitizeStringValue(String(text));
}

export function stableHash(text) {
  return crypto.createHash('sha256').update(String(text)).digest('hex');
}

/** 文件 canonical hash：JSON 走 canonicalizeJson，其余走文本打码 */
export function fileCanonicalHash(filePath) {
  const buf = fs.readFileSync(filePath);
  const isJson = filePath.endsWith('.json');
  let content;
  if (isJson) {
    try {
      content = JSON.stringify(canonicalizeJson(JSON.parse(buf.toString('utf8'))));
    } catch {
      content = canonicalizeText(buf.toString('utf8'));
    }
  } else {
    content = canonicalizeText(buf.toString('utf8'));
  }
  return stableHash(content);
}

/** 遍历目录 → { relativePath: { size, rawHash } }（忽略 .gitkeep） */
export function walkTree(dir) {
  const out = {};
  const walk = (cur, rel = '') => {
    for (const entry of fs.readdirSync(cur, { withFileTypes: true })) {
      const p = path.join(cur, entry.name);
      const r = rel ? `${rel}/${entry.name}` : entry.name;
      if (entry.isDirectory()) walk(p, r);
      else if (!entry.name.endsWith('.gitkeep')) {
        const buf = fs.readFileSync(p);
        out[r] = { size: buf.length, rawHash: stableHash(buf.toString('utf8')) };
      }
    }
  };
  walk(dir);
  return out;
}

/** fixture 输入指纹：全部输入文件 raw hash 聚合（fixture 变更时 verify 先报错） */
export function fixtureFingerprint() {
  const tree = walkTree(FIXTURE_DIR);
  return stableHash(Object.keys(tree).sort().map((k) => `${k}:${tree[k].rawHash}`).join('\n'));
}

/** 复制 fixture → 仓库外临时工作目录；返回 { workDir, cleanup } */
export function createWorkDir() {
  const workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'inkos-golden-'));
  fs.cpSync(FIXTURE_DIR, workDir, { recursive: true });
  return {
    workDir,
    cleanup: () => fs.rmSync(workDir, { recursive: true, force: true }),
  };
}

/**
 * 确定性 writer stub：
 *  - 复刻真实 writer 的最终 prompt 组装（continuityBlock + optimizeWriterPrompt），算出 fingerprint
 *  - 返回固定模板正文（含 POV 名/对话/世界词，绕开禁词），使 metrics/critic/validation 有真实数值
 * 返回 { writer, collector }，collector 累积 scenes 快照 + 指纹
 */
export function createDeterministicWriter() {
  const scenes = new Map();
  const fingerprints = {};
  const writer = async ({ scene, prompt, chapter, bookDir, ctx, intent }) => {
    const continuity = buildRuntimeContinuationBlock(scene, intent);
    const basePrompt = continuity ? [prompt, continuity].join('\n\n') : prompt;
    const { prompt: optimized } = optimizeWriterPrompt({ prompt: basePrompt, scene, ctx, intent });
    fingerprints[scene.id] = stableHash(promptFingerprintText(optimized));
    // 写正文前快照场景计划对象（executionPlan 捕获点）
    scenes.set(scene.id, JSON.parse(JSON.stringify(scene)));
    const pov = intent.pov || '主角';
    const lines = [
      `${pov}推开门，光线从缝隙里倾泻进来，落在手背上。`,
      `“我们得${scene.goal || '继续前进'}，但是时间不等人啊！”${pov}喊道。`,
      `代价已经支付，威胁仍在前方。${pov}发现局势比预想更糟。`,
      `下一步必须快，${pov}不能在此停留。`,
      `远处传来声响，像是什么东西正在靠近。`,
      `“${pov}，别犹豫了，快走！”同伴的声音从背后传来。`,
    ];
    return lines.join('\n\n');
  };
  return { writer, collector: { scenes, fingerprints } };
}

/** 场景计划归一化：只保留规划字段（去 prompt/text/正文等运行时产物） */
export function normalizeScenePlan(scene) {
  const out = {};
  for (const k of [
    'id', 'index', 'title', 'goal', 'conflict', 'beat', 'entities',
    'wordTarget', 'status', 'reviewRequired',
  ]) {
    if (scene[k] !== undefined) out[k] = scene[k];
  }
  // authored plan 若自带 executionPlan（Studio 产物），原样 pin
  if (scene.executionPlan) out.executionPlan = canonicalizeJson(scene.executionPlan);
  return out;
}

/** memory mutation：运行后工作树 vs 原始 fixture 的差异（新增/修改 → canonical hash） */
// 易变子树：路径带时间戳+随机后缀，是运行时诊断/基础设施，不属于生成行为
const VOLATILE_PATH_PREFIXES = [
  'novel/_system/brain/git/',    // git 记忆原子快照目录 snap_<ts>_<rand>
  'novel/_system/brain/traces/', // 章 trace 目录 tr_ch<NNNN>_<ts>_<rand>
];
const isVolatilePath = (rel) => VOLATILE_PATH_PREFIXES.some((p) => rel.startsWith(p));

export function diffMemoryMutation(workDir) {
  const before = walkTree(FIXTURE_DIR);
  const after = walkTree(workDir);
  const added = {};
  const modified = {};
  for (const [rel, info] of Object.entries(after)) {
    if (isVolatilePath(rel)) continue;
    if (!before[rel]) {
      added[rel] = fileCanonicalHash(path.join(workDir, rel));
    } else if (before[rel].rawHash !== info.rawHash) {
      modified[rel] = fileCanonicalHash(path.join(workDir, rel));
    }
  }
  return { added, modified, unchangedCount: Object.keys(before).length };
}

/** 跑一章并捕获全部基线产物 */
export async function captureChapter({ workDir, quiet = false }) {
  const { writer, collector } = createDeterministicWriter();
  const suppress = quiet && console.log;
  if (suppress) console.log = () => {};
  try {
    const runtime = new RuntimeOrchestrator(workDir, { writer, force: true, noAutoNext: true });
    const result = await runtime.runChapter({ chapter: 1, force: true, noAutoNext: true });
    if (suppress) console.log = suppress;

    const consistency = (result.log || []).find((e) => e.stage === 'consistency');
    const scenePlan = [...collector.scenes.values()]
      .sort((a, b) => (a.index ?? 0) - (b.index ?? 0))
      .map(normalizeScenePlan);

    return {
      executionPlan: {
        scenes: scenePlan,
        count: scenePlan.length,
      },
      promptFingerprint: { ...collector.fingerprints },
      gateOutputs: {
        consistency: consistency?.pass ?? null,
        metrics: canonicalizeJson(result.metrics ?? null),
        critic: canonicalizeJson(result.critic ?? null),
        reader: canonicalizeJson(result.reader ?? null),
        validation: canonicalizeJson(result.validation ?? null),
        readerSimulator: canonicalizeJson(result.readerSimulator ?? null),
      },
      memoryMutation: diffMemoryMutation(workDir),
      pipeline: {
        pass: result.pass,
        awaiting: result.awaiting ?? null,
        error: result.error ?? null,
        stages: canonicalizeJson(result.stages ?? []),
      },
    };
  } catch (err) {
    if (suppress) console.log = suppress;
    throw err;
  }
}

/** 深度比较两基线产物；返回差异描述数组 */
export function diffBaselines(got, want) {
  const diffs = [];
  const walk = (a, b, prefix = '') => {
    if (a && typeof a === 'object' && b && typeof b === 'object' && !Array.isArray(a)) {
      const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
      for (const k of keys) walk(a[k], b[k], prefix ? `${prefix}.${k}` : k);
      return;
    }
    if (JSON.stringify(a) !== JSON.stringify(b)) {
      diffs.push(`${prefix}: ${JSON.stringify(b)} → ${JSON.stringify(a)}`);
    }
  };
  walk(got, want);
  return diffs;
}
