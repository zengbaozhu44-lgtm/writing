import fs from 'node:fs';
import path from 'node:path';
import { ROOT, readJson, exists } from './paths.js';

function loadDotEnv() {
  const envPath = path.join(ROOT, '.env');
  if (!exists(envPath)) return;
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim();
    if (!process.env[key]) process.env[key] = val;
  }
}

export function loadInkOsConfig() {
  loadDotEnv();
  const file = path.join(ROOT, 'inkos.json');
  const base = exists(file) ? readJson(file) : {};
  const llm = base.llm || {};

  const apiKey =
    process.env.INKOS_LLM_API_KEY ||
    process.env.LLM_API_KEY ||
    process.env.OPENAI_API_KEY ||
    '';

  const baseUrl = (
    process.env.INKOS_LLM_BASE_URL ||
    process.env.LLM_BASE_URL ||
    llm.baseUrl ||
    'https://api.deepseek.com'
  ).replace(/\/$/, '').replace(/\/v1$/, '');

  const model =
    process.env.INKOS_LLM_MODEL ||
    process.env.LLM_MODEL ||
    llm.model ||
    'deepseek-chat';

  return {
    ...base,
    llm: {
      provider: process.env.INKOS_LLM_PROVIDER || llm.provider || 'openai',
      baseUrl: baseUrl.replace(/\/$/, ''),
      model,
      apiKey,
      apiFormat: process.env.INKOS_LLM_API_FORMAT || llm.apiFormat || 'chat',
      stream: llm.stream !== false,
      maxTokens: Number(process.env.INKOS_LLM_MAX_TOKENS || llm.maxTokens || 4096),
      temperature: Number(process.env.INKOS_LLM_TEMPERATURE || llm.temperature || 0.85),
    },
    runtime: {
      autoWrite: base.runtime?.autoWrite !== false,
      autoNextChapter: base.runtime?.autoNextChapter !== false,
      maxSceneRetries: base.runtime?.maxSceneRetries ?? 2,
      maxReplan: base.runtime?.maxReplan ?? 3,
      ...(base.runtime || {}),
    },
  };
}
