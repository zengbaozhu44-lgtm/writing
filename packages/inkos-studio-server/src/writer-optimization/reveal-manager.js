/**
 * Reveal Manager — 按章节 / Scene 控制世界观与秘密渐进释放
 */
const CHAPTER_REVEAL_BUDGET = {
  1: { maxWorldTerms: 3, maxSecrets: 1, allowLoreDump: false },
  2: { maxWorldTerms: 5, maxSecrets: 2, allowLoreDump: false },
  3: { maxWorldTerms: 8, maxSecrets: 3, allowLoreDump: false },
};

const WORLD_TERM_PATTERNS = [
  /AI|人工智能|算法|系统|芯片|评分|碳中和|数字隔离|神经|公社|205\d/g,
  /世界观|设定|铁律|历史背景|科技树/g,
];

const SECRET_PATTERNS = [
  /秘密|真相|幕后|阴谋|隐藏|不为人知|其实|原来/g,
];

function countMatches(text, patterns) {
  let n = 0;
  for (const p of patterns) {
    const m = text.match(p);
    if (m) n += m.length;
  }
  return n;
}

export function getRevealBudget(chapter) {
  const ch = Number(chapter) || 1;
  return CHAPTER_REVEAL_BUDGET[ch] || {
    maxWorldTerms: 10 + ch,
    maxSecrets: Math.min(5, 2 + Math.floor(ch / 2)),
    allowLoreDump: ch >= 5,
  };
}

export function buildRevealBlock({ chapter, scene, priorScenesText = '' }) {
  const budget = getRevealBudget(chapter);
  const beat = scene?.beat || 'situation';
  const usedWorld = countMatches(priorScenesText, WORLD_TERM_PATTERNS);
  const usedSecrets = countMatches(priorScenesText, SECRET_PATTERNS);

  const lines = [
    '## Reveal Manager · 信息释放预算',
    `- 章节：第 ${chapter} 章 | Scene ${scene?.index ?? '?'} (${beat})`,
    `- 本章已用世界观术语约 ${usedWorld} 次（预算 ${budget.maxWorldTerms}）`,
    `- 本章已揭示秘密线索约 ${usedSecrets} 次（预算 ${budget.maxSecrets}）`,
  ];

  if (!budget.allowLoreDump) {
    lines.push('- **首章禁止信息倾泻**：不得集中解释世界观、制度、历史背景');
    lines.push('- 只写 POV 当下可感知的一个细节，让读者自己拼图');
  }

  const beatRule = {
    situation: '呈现 1 个可感知细节，不解释成因',
    complication: '可暗示 1 条矛盾，不说破',
    turn: '揭示 1 个局部真相，保留更大悬念',
    hook: '释放 1 条关键信息 + 1 个新疑问',
  }[beat];
  if (beatRule) lines.push(`- 本 Scene：${beatRule}`);
  lines.push(
    '- **信息增量铁律**：本 Scene 必须至少新增以下之一（禁止复述已知）：',
    '  · 一个谜团 · 一个世界规则 · 一个人物秘密 · 一个组织信息 · 一个伏笔',
    '- 新增须通过事件或对白呈现，禁止说明腔与设定百科',
  );

  return lines.join('\n');
}

export function scoreWorldExposure(text, chapter) {
  const budget = getRevealBudget(chapter);
  const worldHits = countMatches(text, WORLD_TERM_PATTERNS);
  const secretHits = countMatches(text, SECRET_PATTERNS);
  const loreDump = /(?:在这个世界|设定上|世界观|背景是|众所周知)/.test(text);

  const overWorld = worldHits > budget.maxWorldTerms;
  const overSecret = secretHits > budget.maxSecrets;
  const dump = !budget.allowLoreDump && loreDump;

  return {
    worldHits,
    secretHits,
    loreDump: dump,
    pass: !overWorld && !overSecret && !dump,
    exposureRate: Math.min(1, worldHits / Math.max(1, budget.maxWorldTerms)),
  };
}

/** 从前文提取已高频引入的世界术语（出现 ≥2 次，说明已建立但可能未落地后果） */
function extractRevisitTerms(priorScenesText = '') {
  const text = String(priorScenesText || '');
  if (!text) return [];
  const freq = {};
  for (const term of WORLD_TERM_PATTERNS) {
    const m = text.match(new RegExp(term.source, 'g'));
    if (m && m.length >= 2) freq[term.source] = m.length;
  }
  return Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([k, n]) => ({ term: k, count: n }));
}

/**
 * 复处理旧后果指令 — 让 Scene 优先「处理旧信息」而非「只加新词」。
 * 从 storyMemory 未回收伏笔 + 前文高频术语生成「待重访后果」清单。
 */
export function buildRevisitBlock({
  chapter = 1,
  scene = {},
  priorScenesText = '',
  storyMemory = {},
} = {}) {
  const memory = storyMemory || {};
  const callbacks = Array.isArray(memory.callback) ? memory.callback : [];
  const openCallbacks = callbacks
    .filter((c) => !/回收|呼应|兑现/.test(String(c.text || '')))
    .slice(0, 3)
    .map((c) => String(c.text || '').slice(0, 40));
  const foreshadows = Array.isArray(memory.foreshadow) ? memory.foreshadow : [];
  const openForeshadow = foreshadows
    .filter((f) => f.status !== 'resolved')
    .slice(0, 2)
    .map((f) => String(f.text || f.seed || '').slice(0, 40));
  const terms = extractRevisitTerms(priorScenesText);

  const lines = ['## 待重访后果（复处理旧信息，禁止只加新词）'];
  if (openCallbacks.length || openForeshadow.length) {
    if (openCallbacks.length) lines.push('- 未回收伏笔：', ...openCallbacks.map((c) => `  · ${c}`));
    if (openForeshadow.length) lines.push('- 未落地伏笔：', ...openForeshadow.map((f) => `  · ${f}`));
  }
  if (terms.length) {
    lines.push('- 前文已引入术语（须让其一在本 Scene 落地代价/连锁反应）：', ...terms.map((t) => `  · ${t.term}（已出现 ${t.count} 次）`));
  }
  lines.push('- **本 Scene 优先「处理旧后果」（回收费用的代价、伏笔的兑现）而非「发现新信息」。**');
  if (openCallbacks.length === 0 && openForeshadow.length === 0 && terms.length === 0) {
    lines.push('- （暂无明确旧后果；避免一次引入超过 2 个新概念，让已有信息沉淀）');
  }
  return lines.join('\n');
}
