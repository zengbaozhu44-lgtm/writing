/**
 * Token Meter — 真实/估算 LLM Token 统计
 * 优先使用 API usage；无 API 时用中英混合启发式估算
 */

const CJK_RE = /[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff]/g;
const PRICE_PER_M = {
  'deepseek-chat': { input: 0.14, output: 0.28, cached: 0.014 },
  'deepseek-reasoner': { input: 0.55, output: 2.19, cached: 0.14 },
  default: { input: 0.14, output: 0.28, cached: 0.014 },
};

export function countTokens(text) {
  if (!text) return 0;
  const s = String(text);
  const cjk = (s.match(CJK_RE) || []).length;
  const other = s.length - cjk;
  return Math.ceil(cjk / 1.5 + other / 4);
}

export function estimateCost(inputTokens, outputTokens, model = 'deepseek-chat') {
  const p = PRICE_PER_M[model] || PRICE_PER_M.default;
  const inputCost = (inputTokens / 1_000_000) * p.input;
  const outputCost = (outputTokens / 1_000_000) * p.output;
  return Math.round((inputCost + outputCost) * 1_000_000) / 1_000_000;
}

export function resolveTokenUsage({ text, usage, role = 'input' }) {
  if (usage) {
    if (role === 'input') return usage.prompt_tokens ?? usage.input_tokens ?? countTokens(text);
    return usage.completion_tokens ?? usage.output_tokens ?? countTokens(text);
  }
  return countTokens(text);
}

export function buildTokenRecord({
  inputText,
  outputText,
  usage,
  model,
  temperature,
  latencyMs,
  retryCount = 0,
  cacheHit = false,
}) {
  const inputTokens = resolveTokenUsage({ text: inputText, usage, role: 'input' });
  const outputTokens = resolveTokenUsage({ text: outputText, usage, role: 'output' });
  return {
    input_tokens: inputTokens,
    output_tokens: outputTokens,
    total_tokens: inputTokens + outputTokens,
    estimated_cost: estimateCost(inputTokens, outputTokens, model),
    llm_latency_ms: latencyMs ?? null,
    temperature: temperature ?? null,
    retry_count: retryCount,
    cache_hit: cacheHit,
    model: model ?? null,
    token_source: usage ? 'llm_api' : 'estimated',
  };
}
