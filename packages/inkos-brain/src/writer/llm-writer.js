/**
 * LLM Writer — DeepSeek / OpenAI 兼容写作接口
 * Writer 只负责正文，不参与规划。
 * 集成 Writer Optimizer + 真实 Token 统计
 */
import { loadInkOsConfig } from '../../../inkos-core/src/lib/config.js';
import { optimizeWriterPrompt } from '../../../inkos-writer/src/optimizer.js';
import { buildTokenRecord, countTokens } from '../../../inkos-prompt/src/token-meter.js';
import { recordWriterMetrics } from '../../../inkos-prompt/src/metrics.js';
import { resolveStoryClock } from '../../../inkos-core/src/lib/story-clock.js';

/**
 * 提取上一 Scene 结尾作为续写锚点（取末尾 ~220 字，保持一个完整动作/画面）
 */
export function extractPrevSceneTail(scene, intent) {
  if (!scene || scene.index <= 1 || !intent?.scenes) return '';
  const prev = (intent.scenes || []).find((s) => s.index === scene.index - 1);
  const raw = String(prev?.text || '').trim();
  if (!raw) return '';
  // 尽量取最后一个完整段落；段落过短则回溯拼接
  const paras = raw.split(/\n{2,}/).filter(Boolean);
  let chunk = paras[paras.length - 1] || raw;
  const len = (s) => s.replace(/\s/g, '').length;
  if (len(chunk) < 80 && paras.length > 1) {
    chunk = paras.slice(-2).join('\n\n');
  }
  if (len(chunk) > 260) chunk = chunk.slice(-260);
  return chunk.trim();
}

/**
 * 强约束续写块 — 锁定紧接上一 Scene 结尾续写；Phase 1.R 锁定故事钟
 */
export function buildRuntimeContinuationBlock(scene, intent, ctx = {}) {
  const tail = extractPrevSceneTail(scene, intent);
  if (!tail && Number(scene?.index) <= 1) return '';
  const clock = resolveStoryClock({ ctx, intent, scene });
  const lines = [
    '<!-- runtime-continuity v1 -->',
    '## 续写硬约束（必须遵守）',
  ];
  if (tail) {
    lines.push(
      '- **必须紧接上一 Scene 的结尾续写**——动作、位置、人物、情绪全部从下面这段「上一 Scene 结尾」延续。',
      `- **上一 Scene 结尾：**\n---\n${tail}\n---`,
      '- **禁止**：重新开一个新场景、新倒计时、新威胁、新的「他正站在…」开场。',
      '- **禁止**：回到上一个动作之前的原点（如反复「手按确认键」）。',
      '- 若上一 Scene 停在某个动作/对话/悬念，本 Scene 必须**接着把它往下推**（后果、反应、下一步），而不是另起炉灶。',
    );
  }
  lines.push(`- ${clock.lockRule}`);
  return lines.join('\n');
}

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
      // Phase 1.R — R2-A1/A2 consumption (not SR schema)
      '信息边界：Scene 目标/冲突中的事实不是角色先验知识；若 Character Subjective State 的 Awareness=omit，禁止写成该角色已经知道/亲眼看见/确知（允许本场新发现并写出获得过程）。',
      // HPA-02-L1 — Writer realization contract（非 Truth Authority）
      // 裁决：settled Actual 不可被静默否定；状态变化须经正文中的叙事桥接。
      // 不含 Actual>Plan 仲裁；不限制合法变化（A→新事件→B 合法）。
      '已发生事实承接：上一场已经建立的世界事实必须被视为已经发生。不得在没有新的叙事事件桥接的情况下，将该事实直接写成与其冲突的状态。若故事需要改变该状态，必须通过正文中的新事件、行动或其他明确叙事桥接实现状态变化。',
      '故事钟：遵守 prompt 中的 Story Clock；禁止跨 Scene 改换互相冲突的月日系统。',
    ].join('\n');

    // 场景 2+ 注入强约束续写块：锁定紧接上一 Scene 结尾续写，杜绝「碎片堆」
    const continuityBlock = buildRuntimeContinuationBlock(scene, intent, ctx || {});
    const basePrompt = continuityBlock
      ? [prompt, continuityBlock].join('\n\n')
      : prompt;

    const { prompt: optimizedPrompt } = optimizeWriterPrompt({ prompt: basePrompt, scene, ctx, intent });


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

// 可自动重试的瞬时错误状态码：服务过载 / 网关瞬时故障。其它 4xx（鉴权、限流策略等）不重试。
function isRetryableStatus(status) {
  return status === 429 || status === 502 || status === 503 || status === 504 || status >= 500;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function chatCompletion({ baseUrl, apiKey, model, messages, maxTokens, temperature }) {
  const root = String(baseUrl || '').replace(/\/$/, '');
  // OpenAI 兼容：/v1/chat/completions
  // 智谱 GLM：baseUrl 已含 /api/paas/v4，应接 /chat/completions
  const url = /\/paas\/v4$/i.test(root) || /bigmodel\.cn/i.test(root)
    ? `${root}/chat/completions`
    : `${root}/v1/chat/completions`;
  const body = JSON.stringify({
    model,
    messages,
    max_tokens: maxTokens,
    temperature,
    stream: false,
  });

  const maxRetries = Number(process.env.INKOS_LLM_MAX_RETRIES || 3);
  const baseDelayMs = Number(process.env.INKOS_LLM_RETRY_BASE_MS || 1000);
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${apiKey}`,
  };

  let lastErr;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    let res;
    try {
      res = await fetch(url, { method: 'POST', headers, body });
    } catch (networkErr) {
      lastErr = networkErr;
      if (attempt >= maxRetries) break;
      const delay = baseDelayMs * 2 ** attempt;
      await sleep(delay);
      continue;
    }

    if (res.ok) {
      const data = await res.json();
      return {
        content: data.choices?.[0]?.message?.content?.trim() || '',
        usage: data.usage || null,
        model: data.model || model,
      };
    }

    const errBody = (await res.text()).slice(0, 300);
    const err = new Error(`LLM 请求失败 ${res.status}: ${errBody}`);

    if (!isRetryableStatus(res.status) || attempt >= maxRetries) {
      throw err;
    }

    lastErr = err;
    // 指数退避：1s → 2s → 4s；若服务方返回 Retry-After，则以其为准
    let delay = baseDelayMs * 2 ** attempt;
    const retryAfter = Number(res.headers.get('retry-after'));
    if (retryAfter > 0) delay = Math.max(delay, retryAfter * 1000);
    await sleep(delay);
  }

  throw lastErr || new Error('LLM 请求失败');
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
