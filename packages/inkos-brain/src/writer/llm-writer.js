/**
 * LLM Writer — DeepSeek / OpenAI 兼容写作接口
 * Writer 只负责正文，不参与规划。
 * 集成 Writer Optimizer + 真实 Token 统计
 */
import { loadInkOsConfig } from '../../../inkos-core/src/lib/config.js';
import { optimizeWriterPrompt } from '../../../inkos-writer/src/optimizer.js';
import { buildTokenRecord, countTokens } from '../../../inkos-prompt/src/token-meter.js';
import { recordWriterMetrics } from '../../../inkos-prompt/src/metrics.js';

export function createLlmWriter(options = {}) {
  const config = { ...loadInkOsConfig().llm, ...options };

  return async function llmWriter({ scene, prompt, chapter, bookDir, ctx, intent }) {
    if (!config.apiKey) {
      throw new Error('未配置 LLM API Key（INKOS_LLM_API_KEY / LLM_API_KEY / OPENAI_API_KEY）');
    }

    const system = [
      '你是小说正文写手，不是规划师。',
      '只输出本 Scene 正文，不要标题、不要 markdown 代码块、不要解释。',
      `目标字数约 ${scene.wordTarget || 800} 字。`,
      '遵守写作圣经中的硬切、身体先行、限知视角规则。',
    ].join('\n');

    const { prompt: optimizedPrompt } = optimizeWriterPrompt({ prompt, scene, ctx, intent });

    const t0 = performance.now();
    const result = await chatCompletion({
      baseUrl: config.baseUrl,
      apiKey: config.apiKey,
      model: config.model,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: optimizedPrompt },
      ],
      maxTokens: config.maxTokens,
      temperature: config.temperature,
    });
    const latencyMs = Math.round(performance.now() - t0);
    const content = stripFences(result.content);

    if (bookDir && chapter) {
      const tokenRecord = buildTokenRecord({
        inputText: `${system}\n${optimizedPrompt}`,
        outputText: content,
        usage: result.usage,
        model: config.model,
        temperature: config.temperature,
        latencyMs,
      });
      recordWriterMetrics(bookDir, chapter, scene.id, {
        ...tokenRecord,
        input_tokens: tokenRecord.input_tokens,
        output_tokens: tokenRecord.output_tokens,
        llm_latency_ms: latencyMs,
        temperature: config.temperature,
      });
    }

    return content;
  };
}

export async function chatCompletion({ baseUrl, apiKey, model, messages, maxTokens, temperature }) {
  const root = String(baseUrl || '').replace(/\/$/, '');
  // OpenAI 兼容：/v1/chat/completions
  // 智谱 GLM：baseUrl 已含 /api/paas/v4，应接 /chat/completions
  const url = /\/paas\/v4$/i.test(root) || /bigmodel\.cn/i.test(root)
    ? `${root}/chat/completions`
    : `${root}/v1/chat/completions`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: maxTokens,
      temperature,
      stream: false,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`LLM 请求失败 ${res.status}: ${err.slice(0, 300)}`);
  }

  const data = await res.json();
  return {
    content: data.choices?.[0]?.message?.content?.trim() || '',
    usage: data.usage || null,
    model: data.model || model,
  };
}

function stripFences(text) {
  return text
    .replace(/^```[\w]*\n?/m, '')
    .replace(/\n?```$/m, '')
    .trim();
}

export function isLlmConfigured() {
  const { apiKey } = loadInkOsConfig().llm;
  return Boolean(apiKey);
}
