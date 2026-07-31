import { loadInkOsConfig } from '../packages/inkos-core/src/lib/config.js';

const cfg = loadInkOsConfig();
const root = cfg.llm.baseUrl.replace(/\/$/, '').replace(/\/v1$/, '');
const url = /\/paas\/v4$/u.test(root) || /bigmodel\.cn/u.test(root)
  ? `${root}/chat/completions`
  : `${root}/v1/chat/completions`;
console.log({ url, model: cfg.llm.model, hasKey: Boolean(cfg.llm.apiKey) });
const res = await fetch(url, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${cfg.llm.apiKey}`,
  },
  body: JSON.stringify({
    model: cfg.llm.model,
    messages: [{ role: 'user', content: '用五个字回答：你好' }],
    max_tokens: 32,
  }),
});
console.log('status', res.status);
console.log((await res.text()).slice(0, 400));
