export const MEMORY_CATEGORIES = [
  'foreshadow',
  'promise',
  'readerExpectation',
  'mystery',
  'characterArc',
  'theme',
  'longGoal',
  'callback',
];

function normText(v) {
  return String(v || '').trim();
}

function hookToForeshadow(hook, i) {
  const text = normText(hook.text || hook.hook || hook.description || hook);
  if (!text) return null;
  return {
    id: hook.id || `fs_${i}`,
    text,
    status: hook.status ?? (hook.resolved ? 'resolved' : 'open'),
    chapter: hook.chapter ?? hook.planted_chapter ?? null,
    payoffChapter: hook.payoff_chapter ?? hook.resolved_chapter ?? null,
    category: 'foreshadow',
  };
}

export function collectStoryMemory(ctx = {}, storyDna = {}, options = {}) {
  const chapter = options.chapter ?? ctx.chapter ?? 1;
  const foreshadowRaw = ctx.foreshadow || storyDna.foreshadow || [];
  const foreshadow = (Array.isArray(foreshadowRaw) ? foreshadowRaw : [])
    .map(hookToForeshadow)
    .filter(Boolean);

  const promises = (storyDna.promises || ctx.promises || [])
    .map((p, i) => ({
      id: p.id || `promise_${i}`,
      text: normText(p.text || p),
      status: p.fulfilled ? 'fulfilled' : 'open',
      chapter: p.chapter ?? null,
      category: 'promise',
    }))
    .filter((p) => p.text);

  const readerExpectations = (storyDna.reader_expectations || ctx.readerExpectations || [])
    .map((e, i) => ({
      id: e.id || `expect_${i}`,
      text: normText(e.text || e),
      urgency: e.urgency ?? 'medium',
      category: 'readerExpectation',
    }))
    .filter((e) => e.text);

  const mysteries = (storyDna.mysteries || ctx.mysteries || [])
    .map((m, i) => ({
      id: m.id || `mystery_${i}`,
      text: normText(m.text || m.question || m),
      solved: Boolean(m.solved),
      category: 'mystery',
    }))
    .filter((m) => m.text);

  const characterArcs = Object.entries(ctx.characters || {})
    .filter(([, ch]) => ch && typeof ch === 'object')
    .map(([name, ch]) => ({
      id: `arc_${name}`,
      character: name,
      text: normText(ch.arc || ch.growth || ch.raw?.slice(0, 120) || ''),
      stage: ch.arc_stage || ch.stage || 'developing',
      category: 'characterArc',
    }))
    .filter((a) => a.text);

  const theme = normText(storyDna.theme || storyDna.core_theme || '');
  const longGoals = (storyDna.long_goals || storyDna.longGoals || [storyDna.mainGoal].filter(Boolean))
    .map((g, i) => ({
      id: `long_goal_${i}`,
      text: normText(g.text || g),
      progress: g.progress ?? null,
      category: 'longGoal',
    }))
    .filter((g) => g.text);

  const callbacks = (ctx.facts || [])
    .filter((f) => /回收|呼应|callback|伏笔/.test(String(f.fact || f)))
    .map((f, i) => ({
      id: `callback_${i}`,
      text: normText(f.fact || f),
      chapter: f.chapter ?? null,
      category: 'callback',
    }));

  return {
    chapter,
    foreshadow,
    promise: promises,
    readerExpectation: readerExpectations,
    mystery: mysteries,
    characterArc: characterArcs,
    theme: theme ? [{ id: 'theme', text: theme, category: 'theme' }] : [],
    longGoal: longGoals,
    callback: callbacks,
  };
}

export function buildStoryMemoryMetrics(memory, { chapter = 1 } = {}) {
  const openForeshadow = (memory.foreshadow || []).filter((f) => f.status !== 'resolved');
  const resolvedForeshadow = (memory.foreshadow || []).filter((f) => f.status === 'resolved');
  const totalFs = memory.foreshadow?.length || 0;
  const recoveryRate = totalFs
    ? Math.round((resolvedForeshadow.length / totalFs) * 100)
    : 100;

  const callbacks = memory.callback || [];
  const callbackResolved = callbacks.filter((c) => /回收|呼应|兑现/.test(c.text));
  const callbackRecoveryRate = callbacks.length
    ? Math.round((callbackResolved.length / callbacks.length) * 100)
    : 100;

  const longGoals = memory.longGoal || [];
  const progresses = longGoals.map((g) => g.progress ?? 0).filter((p) => p != null);
  const mainThreadProgress = progresses.length
    ? Math.round(progresses.reduce((a, b) => a + b, 0) / progresses.length)
    : null;

  const arcStages = { opening: 15, developing: 35, awakening: 55, turning: 75, resolved: 100 };
  const arcs = memory.characterArc || [];
  const characterArcCompletion = arcs.length
    ? Math.round(arcs.reduce((s, a) => s + (arcStages[a.stage] ?? 40), 0) / arcs.length)
    : null;

  return {
    openForeshadowCount: openForeshadow.length,
    openForeshadow,
    resolvedForeshadowCount: resolvedForeshadow.length,
    resolvedForeshadow,
    longGoals,
    characterArcs: arcs,
    recoveryRate,
    callbackRecoveryRate,
    mainThreadProgress,
    characterArcCompletion,
    openMysteries: (memory.mystery || []).filter((m) => !m.solved).length,
    openPromises: (memory.promise || []).filter((p) => p.status !== 'fulfilled').length,
    theme: memory.theme?.[0]?.text || null,
    chapter,
  };
}

export function buildStoryMemoryBlock(memory, metrics, { sceneIndex = null } = {}) {
  const lines = [
    '<!-- inkos-story-memory -->',
    '## Story Memory · 长篇一致性参考',
  ];

  if (metrics.theme) lines.push(`- **Theme**：${metrics.theme}`);
  if (metrics.longGoals?.length) {
    lines.push('- **Long Goal**：' + metrics.longGoals.slice(0, 3).map((g) => g.text).join('；'));
  }
  if (metrics.openForeshadow?.length) {
    lines.push('- **未回收伏笔**：' + metrics.openForeshadow.slice(0, 4).map((f) => f.text).join('；'));
  }
  if (metrics.characterArcs?.length) {
    lines.push('- **角色成长**：' + metrics.characterArcs.slice(0, 3).map((a) => `${a.character}（${a.stage}）`).join('、'));
  }
  if (metrics.recoveryRate != null) {
    lines.push(`- **剧情回收率**：${metrics.recoveryRate}%`);
  }
  if (sceneIndex != null) {
    lines.push(`- **当前 Scene**：${sceneIndex}`);
  }

  if (lines.length <= 2) return '';
  return lines.join('\n');
}
