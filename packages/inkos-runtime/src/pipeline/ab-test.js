/**
 * Temperature A/B Test — 同一章两套 temperature 并行生成
 * 强制共享同一 ExecutionPlan（beats/content/before/after 不可变），只比较文笔。
 */
import fs from 'node:fs';
import path from 'node:path';
import { writeJson, exists } from '../../../inkos-core/src/lib/paths.js';
import { brainSystemDir } from '../../../inkos-brain/src/loader.js';

const DEFAULT_TEMPS = [0.55, 0.8];
const DEFAULT_LABELS = ['A_temp_0.55', 'B_temp_0.8'];

/**
 * 抽取剧情骨架指纹（忽略文笔字段）
 */
export function fingerprintExecutionPlan(plan = null) {
  if (!plan || typeof plan !== 'object') return '';
  const beats = (plan.beats || []).map((b) => ({
    order: b.order ?? null,
    id: b.id ?? null,
    structuralBeat: b.structuralBeat ?? null,
    libraryBeat: b.libraryBeat ?? null,
    content: String(b.content || b.action || b.beatPlan?.action || '').trim(),
    beforeState: String(b.beforeState || b.beatPlan?.beforeState || '').trim(),
    afterState: String(b.afterState || b.beatPlan?.afterState || '').trim(),
    wordBudget: b.wordBudget ?? null,
  }));
  return JSON.stringify({
    sceneIndex: plan.sceneIndex ?? null,
    sceneType: plan.sceneType ?? null,
    wordTarget: plan.wordTarget ?? null,
    beats,
  });
}

/** 深拷贝并冻结骨架，防止 variant 侧写污染 */
export function freezeExecutionPlan(plan = {}) {
  const cloned = JSON.parse(JSON.stringify(plan || {}));
  return Object.freeze(deepFreeze(cloned));
}

function deepFreeze(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  Object.freeze(obj);
  for (const v of Object.values(obj)) {
    if (v && typeof v === 'object' && !Object.isFrozen(v)) deepFreeze(v);
  }
  return obj;
}

/**
 * 校验两套 variant 是否仍使用同一骨架
 * @returns {{ valid: boolean, invalidTest: boolean, reason?: string, fingerprints?: string[] }}
 */
export function validateSharedExecutionPlan(sharedPlan, variants = []) {
  const sharedFp = fingerprintExecutionPlan(sharedPlan);
  if (!sharedFp) {
    return {
      valid: false,
      invalidTest: true,
      reason: '缺少共享 ExecutionPlan',
      fingerprints: [],
    };
  }
  const fps = [];
  for (const v of variants) {
    const plan = v?.meta?.executionPlan || v?.executionPlan || null;
    const fp = fingerprintExecutionPlan(plan);
    fps.push(fp);
    if (!fp) {
      return {
        valid: false,
        invalidTest: true,
        reason: `${v.label || 'variant'} 未回传 ExecutionPlan，无法确认骨架一致`,
        fingerprints: fps,
      };
    }
    if (fp !== sharedFp) {
      return {
        valid: false,
        invalidTest: true,
        reason: `${v.label || 'variant'} 的 Beat content/before/after 与共享骨架不一致`,
        fingerprints: fps,
        sharedFingerprint: sharedFp,
      };
    }
  }
  return { valid: true, invalidTest: false, fingerprints: fps, sharedFingerprint: sharedFp };
}

/**
 * @param {object} opts
 * @param {object} opts.executionPlan  共享且冻结的剧情骨架（必填）
 * @param {(temperature: number, label: string, ctx: { executionPlan: object }) => Promise<object|string>} opts.generateFn
 */
export async function runTemperatureAbTest({
  temperatures = DEFAULT_TEMPS,
  labels = DEFAULT_LABELS,
  executionPlan = null,
  generateFn,
  bookDir = null,
  chapter = null,
  persist = true,
} = {}) {
  if (typeof generateFn !== 'function') {
    throw new Error('runTemperatureAbTest: generateFn 必填');
  }
  if (!executionPlan?.beats?.length) {
    throw new Error('runTemperatureAbTest: 必须提供共享 executionPlan.beats（同一剧情骨架）');
  }

  const frozenPlan = freezeExecutionPlan(executionPlan);
  const sharedFingerprint = fingerprintExecutionPlan(frozenPlan);

  const temps = temperatures.slice(0, 2);
  if (temps.length < 2) {
    throw new Error('runTemperatureAbTest: 需要至少两组 temperature');
  }
  const labs = labels.length >= 2
    ? labels.slice(0, 2)
    : temps.map((t, i) => `${i === 0 ? 'A' : 'B'}_temp_${t}`);

  const variants = await Promise.all(
    temps.map(async (temperature, i) => {
      const label = labs[i];
      const t0 = Date.now();
      try {
        const raw = await generateFn(temperature, label, { executionPlan: frozenPlan });
        const text = typeof raw === 'string' ? raw : String(raw?.text || '');
        const chars = text.replace(/\s/g, '').length;
        // 强制回填共享骨架；若调用方擅自改 plan，后续校验会 invalidTest
        const returnedPlan = (typeof raw === 'object' && raw?.meta?.executionPlan)
          || (typeof raw === 'object' && raw?.executionPlan)
          || frozenPlan;
        return {
          label,
          temperature,
          ok: true,
          text,
          chars,
          meta: {
            ...(typeof raw === 'object' && raw?.meta ? raw.meta : {}),
            executionPlan: returnedPlan,
            sharedFingerprint,
          },
          executionPlan: returnedPlan,
          latencyMs: Date.now() - t0,
          preview: text.replace(/\s+/g, ' ').slice(0, 160),
        };
      } catch (err) {
        return {
          label,
          temperature,
          ok: false,
          text: '',
          chars: 0,
          error: err?.message || String(err),
          meta: { executionPlan: frozenPlan, sharedFingerprint },
          executionPlan: frozenPlan,
          latencyMs: Date.now() - t0,
          preview: '',
        };
      }
    }),
  );

  const planGuard = validateSharedExecutionPlan(frozenPlan, variants);
  const report = buildAbComparisonReport(variants, {
    chapter,
    temperatures: temps,
    planGuard,
    sharedFingerprint,
  });

  let reportPath = null;
  if (persist && bookDir && chapter != null) {
    reportPath = persistAbReport(bookDir, chapter, {
      variants: variants.map((v) => ({
        ...v,
        // 报告里不重复落全文大 plan；保留指纹
        executionPlanFingerprint: fingerprintExecutionPlan(v.executionPlan),
      })),
      report,
      sharedFingerprint,
      frozenPlanSummary: {
        sceneIndex: frozenPlan.sceneIndex,
        sceneType: frozenPlan.sceneType,
        beatCount: frozenPlan.beats?.length,
      },
    });
  }

  return {
    version: 'chapter-ab-test-2',
    chapter,
    variants,
    report,
    reportPath,
    winner: report.invalidTest ? null : report.winner,
    invalidTest: report.invalidTest,
    sharedFingerprint,
    executionPlan: frozenPlan,
  };
}

export function buildAbComparisonReport(variants = [], {
  chapter = null,
  temperatures = [],
  planGuard = null,
  sharedFingerprint = null,
} = {}) {
  const guard = planGuard || validateSharedExecutionPlan(
    variants[0]?.executionPlan || variants[0]?.meta?.executionPlan,
    variants,
  );

  if (guard.invalidTest) {
    return {
      version: 'ab-comparison-2',
      chapter,
      temperatures,
      invalidTest: true,
      winner: null,
      reason: guard.reason || 'ExecutionPlan 骨架不一致',
      recommendation: '请固定同一 ExecutionPlan 再跑 AB；只比较文笔，不比较剧情改写',
      sharedFingerprint: sharedFingerprint || guard.sharedFingerprint || null,
      planGuard: guard,
      comparedAt: new Date().toISOString(),
    };
  }

  const [a, b] = variants;
  const metricsA = scoreVariant(a);
  const metricsB = scoreVariant(b);

  let winner = 'tie';
  let reason = '双方接近或均失败';
  if (a?.ok && !b?.ok) {
    winner = a.label;
    reason = `${b.label} 生成失败`;
  } else if (b?.ok && !a?.ok) {
    winner = b.label;
    reason = `${a.label} 生成失败`;
  } else if (a?.ok && b?.ok) {
    if (metricsA.total !== metricsB.total) {
      winner = metricsA.total >= metricsB.total ? a.label : b.label;
      reason = `综合分 ${metricsA.total} vs ${metricsB.total}（同骨架·钩子/长度/低重复）`;
    } else {
      winner = 'tie';
      reason = `综合分并列 ${metricsA.total}`;
    }
  }

  return {
    version: 'ab-comparison-2',
    chapter,
    temperatures,
    invalidTest: false,
    metrics: {
      [a?.label || 'A']: metricsA,
      [b?.label || 'B']: metricsB,
    },
    delta: {
      chars: (b?.chars || 0) - (a?.chars || 0),
      latencyMs: (b?.latencyMs || 0) - (a?.latencyMs || 0),
      hookSignal: (metricsB.hookSignal || 0) - (metricsA.hookSignal || 0),
      totalScore: (metricsB.total || 0) - (metricsA.total || 0),
    },
    winner,
    reason,
    recommendation: winner === 'tie'
      ? '同骨架下文笔接近；可按章节类型切换温度'
      : `建议默认采用 ${winner}（${reason}）`,
    sharedFingerprint: sharedFingerprint || guard.sharedFingerprint || null,
    planGuard: guard,
    comparedAt: new Date().toISOString(),
  };
}

function scoreVariant(v = {}) {
  if (!v?.ok || !v.text) {
    return {
      ok: false,
      chars: 0,
      hookSignal: 0,
      uniqueRatio: 0,
      total: 0,
      latencyMs: v?.latencyMs || 0,
    };
  }
  const text = String(v.text);
  const chars = v.chars || text.replace(/\s/g, '').length;
  const tail = text.slice(-400);
  const hookSignal = [
    /[？?]/u,
    /倒计时|必须|来不及|消失|空白|系统|异常/u,
    /门|手机|消息|脚步|枪|血/u,
  ].reduce((n, re) => n + (re.test(tail) ? 1 : 0), 0);

  const compact = text.replace(/\s/g, '');
  const grams = new Set();
  for (let i = 0; i <= Math.max(0, compact.length - 4); i += 1) {
    grams.add(compact.slice(i, i + 4));
  }
  const uniqueRatio = compact.length > 4
    ? grams.size / (compact.length - 3)
    : 1;

  const lengthScore = chars < 800 ? 20
    : chars < 2000 ? 40
      : chars <= 8000 ? 55
        : 35;
  const hookScore = hookSignal * 12;
  const diversityScore = Math.round(Math.min(1, uniqueRatio) * 30);
  const total = lengthScore + hookScore + diversityScore;

  return {
    ok: true,
    chars,
    hookSignal,
    uniqueRatio: Math.round(uniqueRatio * 1000) / 1000,
    lengthScore,
    hookScore,
    diversityScore,
    total,
    latencyMs: v.latencyMs || 0,
  };
}

export function persistAbReport(bookDir, chapter, payload) {
  const dir = path.join(brainSystemDir(bookDir), 'ab-tests');
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `ch_${String(chapter).padStart(4, '0')}_ab.json`);
  writeJson(file, {
    ...payload,
    persistedAt: new Date().toISOString(),
  });
  return file;
}

export function loadAbReport(bookDir, chapter) {
  const file = path.join(
    brainSystemDir(bookDir),
    'ab-tests',
    `ch_${String(chapter).padStart(4, '0')}_ab.json`,
  );
  if (!exists(file)) return null;
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

export default {
  runTemperatureAbTest,
  buildAbComparisonReport,
  fingerprintExecutionPlan,
  freezeExecutionPlan,
  validateSharedExecutionPlan,
  persistAbReport,
  loadAbReport,
};
