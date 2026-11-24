/**
 * Golden Causal Baseline — 共享核心（Phase 4 · D4）
 *
 * 冻结：StoryTruth → Causal Reasoning → causal_chain → Writer Prompt（Runtime + Studio）
 * 与 tests/golden-baseline（legacy 生成骨架）双轨独立，互不替代。
 *
 * 原则：
 *  - mock provider 确定性；无 LLM
 *  - 真书输入；prompt cache 写入隔离到 tmp
 *  - 基线只含确定性产物；verify 深比较 + 结构锁
 */
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import {
  runCausalReasoning,
  ensureChapterCausalChain,
  TEMPLATE_FALLBACKS,
} from '../../packages/inkos-brain/src/causal/causal-reasoner.js';
import { loadBrainContext } from '../../packages/inkos-brain/src/loader.js';
import {
  planChapter,
  loadAuthoredChapterPlan,
  isAuthoredPlanSpecific,
  serializeAuthoredPlanToIntent,
} from '../../packages/inkos-brain/src/planner/planner.js';
import { buildScenePlan } from '../../packages/inkos-brain/src/scene/scene.js';
import {
  compileScenePrompt,
  renderCausalChain,
} from '../../packages/inkos-prompt/src/compiler.js';
import { compile as compileStudioPrompt } from '../../packages/inkos-runtime/src/compiler/prompt-compiler.js';

export const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = path.resolve(__dirname, '../..');

/** 三档场景：rich / partial(+actor≠POV) / degraded —— 真书数据，与 D1–D3.2 同源 */
export const SCENARIOS = Object.freeze([
  {
    id: 'rich-full',
    bookRel: 'books/我的小说/books/二手书店老板的最后一周',
    chapter: 1,
    expectGrade: 'full',
    locks: ['rich', 'determinism', 'fingerprint_delta'],
  },
  {
    id: 'partial-actor-non-pov',
    bookRel: 'books/我的小说/books/赛博修仙我靠玩家暴打克苏鲁旧日神',
    chapter: 5,
    expectGrade: 'partial',
    locks: ['partial', 'actor_non_pov', 'determinism', 'fingerprint_delta'],
  },
  {
    id: 'degraded-no-basis',
    bookRel: 'books/我的小说/books/赛博修仙我靠玩家暴打克苏鲁旧日神',
    chapter: 17,
    expectGrade: 'degraded',
    locks: ['degraded', 'determinism', 'fingerprint_delta'],
  },
]);

export function stableHash(text) {
  return crypto.createHash('sha256').update(String(text)).digest('hex');
}

/** prompt 指纹输入：剥离 wall-clock compileMs 等易变嵌入（与 legacy golden 同口径） */
const COMPILE_MS = /compile=\d+ms/g;
const ISO_TS = /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/g;
const WORKDIR = /\/inkos-gcb-rt-[A-Za-z0-9]+/g;

export function sanitizePromptForFingerprint(text) {
  return String(text)
    .replace(COMPILE_MS, 'compile=<MS>')
    .replace(ISO_TS, '<TS>')
    .replace(WORKDIR, '/<WORKDIR>');
}

export function promptFingerprint(text) {
  return stableHash(sanitizePromptForFingerprint(text));
}

/** 递归 canonical：键排序，供指纹与基线比较 */
export function canonicalize(value) {
  if (Array.isArray(value)) return value.map((v) => canonicalize(v));
  if (value && typeof value === 'object') {
    const out = {};
    for (const k of Object.keys(value).sort()) out[k] = canonicalize(value[k]);
    return out;
  }
  return value;
}

export function canonicalJson(value) {
  return JSON.stringify(canonicalize(value));
}

function bookDirOf(scenario) {
  return path.join(REPO_ROOT, scenario.bookRel);
}

function buildIntent(bookDir, chapter) {
  const realCtx = loadBrainContext(bookDir, { chapter });
  let intent;
  try {
    const authoredPlan = loadAuthoredChapterPlan(bookDir, chapter);
    if (isAuthoredPlanSpecific(authoredPlan)) {
      intent = serializeAuthoredPlanToIntent(authoredPlan, chapter, realCtx.priorAnchor || null);
    } else {
      intent = planChapter(realCtx, chapter);
    }
  } catch {
    intent = {
      chapter,
      pov: realCtx.pov || '主角',
      mainGoal: '推进章目标',
      obstacles: ['no_causal_basis'],
      scenes: [{ index: 1, goal: '推进章目标', conflict: 'no_causal_basis', beat: 'situation' }],
    };
  }
  intent.chapter = chapter;
  return { intent, realCtx };
}

function chainHasTemplate(causalChain) {
  const blob = JSON.stringify(causalChain || {});
  return [...TEMPLATE_FALLBACKS].filter((t) => t && blob.includes(t));
}

function causalBlockOf(text) {
  const i = String(text).indexOf('### 因果链');
  if (i < 0) return null;
  return String(text).slice(i);
}

function compileRuntime(bookDir, chapter, intent, scene) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'inkos-gcb-rt-'));
  const realCtx = loadBrainContext(bookDir, { chapter });
  const ctx = {
    ...realCtx,
    bookDir: tmp,
    intent: { ...(realCtx.intent || {}), ...intent },
  };
  const compiled = compileScenePrompt(ctx, {
    ...scene,
    causalChain: intent.causalChain,
    pov: scene.pov || intent.pov,
  });
  return {
    text: compiled.text,
    promptHash: compiled.promptHash || null,
    tmp,
  };
}

function compileStudio(chapter, intent, scene) {
  const sealed = compileStudioPrompt({
    scene: { ...scene, causalChain: scene.causalChain || intent.causalChain },
    chapter,
    intent,
    executionPlan: {
      scenePlan: { goal: scene.goal, obstacle: scene.conflict },
      beats: [{ order: 1, structuralBeat: 'situation', libraryBeat: 'open' }],
    },
    wordBudget: scene.wordTarget || 800,
  });
  return { text: sealed.text };
}

/**
 * 结构锁：每次 verify 必跑（不依赖 baseline 相等性以外的裁判）。
 * @returns {string[]} 失败消息
 */
export function runStructuralLocks(scenario, captured) {
  const fails = [];
  const chain = captured.causalChain;
  const grade = chain?.confidence?.grade;
  const locks = scenario.locks || [];

  if (grade !== scenario.expectGrade) {
    fails.push(`${scenario.id}: grade 期望 ${scenario.expectGrade}，得 ${grade}`);
  }

  if (locks.includes('rich')) {
    if (!chain?.choice?.reason) fails.push(`${scenario.id}/rich: choice.reason 缺失`);
    if (!chain?.new_information?.changes) fails.push(`${scenario.id}/rich: new_information.changes 为空`);
    // S8.2-R3：options 仅 authored；禁止 mock 默认方向；无 authored options 时允许为空
    const mockOpts = (chain?.options || []).filter(
      (o) => o?.derivation === 'mock_minimal' || /正面推进|放弃\s*\/\s*回避/.test(String(o?.action || '')),
    );
    if (mockOpts.length) fails.push(`${scenario.id}/rich: 不得含默认 mock options`);
    if ((chain?.options || []).some((o) => o?.derivation && o.derivation !== 'authored')) {
      fails.push(`${scenario.id}/rich: options.derivation 须为 authored`);
    }
    if (!chain?.choice?.action) fails.push(`${scenario.id}/rich: choice 未闭合`);
    if (!chain?.consequence?.immediate && !chain?.consequence?.long_term) {
      fails.push(`${scenario.id}/rich: consequence 未闭合`);
    }
    if (chain?.no_causal_basis?.length) fails.push(`${scenario.id}/rich: 不应有 no_causal_basis`);
    const tpl = chainHasTemplate(chain);
    if (tpl.length) fails.push(`${scenario.id}/rich: 链含模板 ${tpl.join('/')}`);
  }

  if (locks.includes('partial')) {
    if (!chain?.desire && !chain?.pressure) {
      fails.push(`${scenario.id}/partial: 已知因果应继续生成（desire/pressure）`);
    }
    const deg = chain?.trace?.degradation || [];
    const hasHonest = deg.some((d) => /fear_unknown|relationship_missing|state_board_empty/.test(d));
    if (!hasHonest) fails.push(`${scenario.id}/partial: 缺 fear/relationship/state 诚实降级标记`);
    const tpl = chainHasTemplate(chain);
    if (tpl.length) fails.push(`${scenario.id}/partial: 链含模板 ${tpl.join('/')}`);
  }

  if (locks.includes('degraded')) {
    if (!chain?.no_causal_basis?.length) fails.push(`${scenario.id}/degraded: no_causal_basis 应非空`);
    if (!captured.runtime?.causalBlock?.includes('no_causal_basis')) {
      fails.push(`${scenario.id}/degraded: Runtime prompt 未穿透 no_causal_basis`);
    }
    if (!captured.studio?.causalBlock?.includes('no_causal_basis')) {
      fails.push(`${scenario.id}/degraded: Studio prompt 未穿透 no_causal_basis`);
    }
    // Writer 不得在因果块发明 choice/consequence（缺槽时渲染块无 Chosen/后果行，或仅有链内诚实字段）
    if (!chain?.choice?.action && /Chosen（已选）/.test(captured.studio?.causalBlock || '')) {
      fails.push(`${scenario.id}/degraded: Studio 因果块发明了 Chosen`);
    }
    if (!chain?.consequence && /后果（consequence）/.test(captured.studio?.causalBlock || '')) {
      fails.push(`${scenario.id}/degraded: Studio 因果块发明了 consequence`);
    }
    const tplRt = [...TEMPLATE_FALLBACKS].filter((t) => t && (captured.runtime?.causalBlock || '').includes(t));
    const tplSt = [...TEMPLATE_FALLBACKS].filter((t) => t && (captured.studio?.causalBlock || '').includes(t));
    if (tplRt.length) fails.push(`${scenario.id}/degraded: Runtime 因果块模板 ${tplRt.join('/')}`);
    if (tplSt.length) fails.push(`${scenario.id}/degraded: Studio 因果块模板 ${tplSt.join('/')}`);
  }

  if (locks.includes('actor_non_pov')) {
    const actor = chain?.choice?.actor;
    if (!actor) fails.push(`${scenario.id}/actor: choice.actor 缺失`);
    if (!(captured.studio?.causalBlock || '').includes(actor || '___')) {
      fails.push(`${scenario.id}/actor: Studio 块未保留 actor`);
    }
    if (!(captured.studio?.causalBlock || '').includes('非 POV')
      && !(captured.studio?.causalBlock || '').includes('世界角色')) {
      fails.push(`${scenario.id}/actor: Studio 未标明世界角色选择`);
    }
    if (!(captured.runtime?.causalBlock || '').includes('非 POV')
      && !(captured.runtime?.causalBlock || '').includes('世界角色')) {
      fails.push(`${scenario.id}/actor: Runtime 未标明世界角色选择`);
    }
  }

  if (locks.includes('determinism') && captured.determinism?.twinMatch !== true) {
    fails.push(`${scenario.id}/determinism: 同 StoryTruth 两次推理不一致`);
  }

  if (locks.includes('fingerprint_delta') && captured.fingerprintDelta?.changed !== true) {
    fails.push(`${scenario.id}/fingerprint: 链变更未导致 prompt/cache 指纹变化`);
  }

  // 双路径必须消费同一章级链对象指纹
  if (captured.runtime?.causalChainHash !== captured.causalChainHash) {
    fails.push(`${scenario.id}: Runtime 链指纹 ≠ 章级链`);
  }
  if (captured.studio?.causalChainHash !== captured.causalChainHash) {
    fails.push(`${scenario.id}: Studio 链指纹 ≠ 章级链`);
  }

  return fails;
}

/**
 * 捕获单场景确定性产物。
 */
export function captureScenario(scenario) {
  const bookDir = bookDirOf(scenario);
  if (!fs.existsSync(bookDir)) {
    throw new Error(`书目录不存在: ${bookDir}`);
  }
  const chapter = scenario.chapter;

  // 确定性：同输入跑两次
  const first = runCausalReasoning(bookDir, { chapter });
  const second = runCausalReasoning(bookDir, { chapter });
  const twinMatch = canonicalJson(first.causalChain) === canonicalJson(second.causalChain);

  const { storyTruth, causalChain } = first;
  const storyTruthFingerprint = stableHash(canonicalJson(storyTruth));
  const causalChainHash = stableHash(canonicalJson(causalChain));

  // 模拟生产：ensure 挂 intent → scene；强制使用本次章级推理结果（双路径同源）
  const { intent } = buildIntent(bookDir, chapter);
  ensureChapterCausalChain(bookDir, intent, { chapter });
  intent.causalChain = causalChain;

  const scenes = buildScenePlan(intent);
  // actor≠POV：用 intent.pov（authored 场景 POV）渲染，而非强制 storyTruth.pov
  const scene = {
    ...scenes[0],
    causalChain: intent.causalChain,
    pov: intent.pov,
  };

  const causalBlock = renderCausalChain(causalChain, scene, { pov: intent.pov || '' });

  const rt = compileRuntime(bookDir, chapter, intent, scene);
  const st = compileStudio(chapter, intent, scene);
  const rtBlock = causalBlockOf(rt.text);
  const stBlock = causalBlockOf(st.text);

  // 指纹 delta：改 consequence → Runtime promptHash + Studio prompt 指纹必须变
  const mutated = {
    ...causalChain,
    consequence: {
      ...(causalChain.consequence || {}),
      immediate: `GCB_MUTATION_${causalChainHash.slice(0, 12)}`,
    },
  };
  const intentMut = { ...intent, causalChain: mutated };
  const sceneMut = { ...scene, causalChain: mutated };
  const rtMut = compileRuntime(bookDir, chapter, intentMut, sceneMut);
  const stMut = compileStudio(chapter, intentMut, sceneMut);
  const fingerprintDelta = {
    changed: (rt.promptHash !== rtMut.promptHash)
      && (promptFingerprint(st.text) !== promptFingerprint(stMut.text)),
    runtimePromptHashBefore: rt.promptHash,
    runtimePromptHashAfter: rtMut.promptHash,
    studioPromptFingerprintBefore: promptFingerprint(st.text),
    studioPromptFingerprintAfter: promptFingerprint(stMut.text),
  };

  fs.rmSync(rt.tmp, { recursive: true, force: true });
  fs.rmSync(rtMut.tmp, { recursive: true, force: true });

  return {
    id: scenario.id,
    bookRel: scenario.bookRel,
    chapter,
    expectGrade: scenario.expectGrade,
    storyTruthFingerprint,
    causalChain: canonicalize(causalChain),
    causalChainHash,
    grade: causalChain.confidence?.grade ?? null,
    no_causal_basis: causalChain.no_causal_basis || [],
    degradation: causalChain.trace?.degradation || [],
    choiceReason: causalChain.choice?.reason || null,
    choiceActor: causalChain.choice?.actor || null,
    newInformationChanges: causalChain.new_information?.changes || null,
    causalBlock,
    runtime: {
      promptFingerprint: promptFingerprint(rt.text),
      promptHash: rt.promptHash,
      causalBlock: rtBlock,
      causalChainHash,
    },
    studio: {
      promptFingerprint: promptFingerprint(st.text),
      causalBlock: stBlock,
      causalChainHash,
    },
    determinism: { twinMatch },
    fingerprintDelta: {
      changed: fingerprintDelta.changed,
      // 不固化 mutation 后的绝对指纹（含标记串）；只锁「会变」行为
    },
    ensure: {
      // 二次 ensure 不得重推：用已挂链的 intent
      secondReasoned: (() => {
        const again = { ...intent, causalChain };
        const r = ensureChapterCausalChain(bookDir, again, { chapter });
        return r.reasoned;
      })(),
    },
  };
}

export function captureAll() {
  return SCENARIOS.map((s) => captureScenario(s));
}

/** 参与 baseline 深比较的字段（剥掉仅展示/易变的探测细节） */
export function artifactsForBaseline(capturedList) {
  return capturedList.map((c) => ({
    id: c.id,
    bookRel: c.bookRel,
    chapter: c.chapter,
    expectGrade: c.expectGrade,
    storyTruthFingerprint: c.storyTruthFingerprint,
    causalChain: c.causalChain,
    causalChainHash: c.causalChainHash,
    grade: c.grade,
    no_causal_basis: c.no_causal_basis,
    degradation: c.degradation,
    choiceReason: c.choiceReason,
    choiceActor: c.choiceActor,
    newInformationChanges: c.newInformationChanges,
    causalBlock: c.causalBlock,
    runtime: {
      promptFingerprint: c.runtime.promptFingerprint,
      promptHash: c.runtime.promptHash,
      causalBlock: c.runtime.causalBlock,
      causalChainHash: c.runtime.causalChainHash,
    },
    studio: {
      promptFingerprint: c.studio.promptFingerprint,
      causalBlock: c.studio.causalBlock,
      causalChainHash: c.studio.causalChainHash,
    },
    determinism: c.determinism,
    fingerprintDelta: c.fingerprintDelta,
    ensure: c.ensure,
  }));
}

export function diffArtifacts(got, want, prefix = '') {
  const diffs = [];
  if (canonicalJson(got) === canonicalJson(want)) return diffs;
  if (typeof got !== typeof want || Array.isArray(got) !== Array.isArray(want)) {
    diffs.push(`${prefix}: type/shape 漂移`);
    return diffs;
  }
  if (got && typeof got === 'object' && !Array.isArray(got)) {
    const keys = new Set([...Object.keys(got || {}), ...Object.keys(want || {})]);
    for (const k of [...keys].sort()) {
      diffs.push(...diffArtifacts(got?.[k], want?.[k], prefix ? `${prefix}.${k}` : k));
    }
    return diffs;
  }
  if (Array.isArray(got)) {
    const n = Math.max(got.length, want?.length || 0);
    for (let i = 0; i < n; i += 1) {
      diffs.push(...diffArtifacts(got[i], want?.[i], `${prefix}[${i}]`));
    }
    return diffs;
  }
  if (got !== want) diffs.push(`${prefix}: ${JSON.stringify(want)} → ${JSON.stringify(got)}`);
  return diffs;
}
