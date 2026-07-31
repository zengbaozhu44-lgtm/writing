/**
 * Scene Boundary Engine — Goal → Obstacle → Escalation → New Info → Hook
 */
const CROSS_SCENE_MARKERS = [
  / meanwhile/i,
  /与此同时/,
  /另一边/,
  /镜头切到/,
  /下一[个]?场景/,
  /Scene\s*\d/i,
];

function pickPlanField(scene, intent, key, fallback = '') {
  return scene?.scenePlan?.[key]
    || scene?.[key]
    || (key === 'obstacle' ? (scene?.conflict || intent?.obstacles?.[0]) : null)
    || fallback;
}

export function deriveSceneBoundaries(scene, intent, { prevHook = '', chapter = 1 } = {}) {
  const beat = scene?.beat || 'situation';
  const goal = pickPlanField(scene, intent, 'goal', intent?.mainGoal || '');
  const obstacle = pickPlanField(scene, intent, 'obstacle', '—');
  const escalation = pickPlanField(scene, intent, 'escalation', '冲突升级，代价逼近');
  const newInformation = pickPlanField(scene, intent, 'newInformation', '至少一条新规则或谜团');
  const cliffhanger = pickPlanField(scene, intent, 'cliffhanger', scene?.hook || '段末悬念');

  const startHint = beat === 'situation'
    ? (prevHook
      ? `承接上一 Scene 钩子：${prevHook.slice(0, 80)}…`
      : chapter === 1 && (scene?.index ?? 1) === 1
        ? '动作/感官先行，300 字内落地第一个异常事件'
        : '进入当前局面，300 字内出现事件或异常信号')
    : '从上一 Scene 结尾动作/对话直接延续';

  const endHint = {
    situation: 'Goal 明确 + Obstacle 出现 + 第一条 New Information 落地',
    complication: 'Escalation 可见，代价或选择收窄',
    turn: 'Escalation 峰值 + 局部 New Information 揭晓',
    hook: 'Hook / Cliffhanger 落地，读者必须想继续读',
  }[beat] || '五要素齐备后在 Hook 处停止';

  return {
    goal,
    obstacle,
    escalation,
    newInformation,
    cliffhanger,
    start: startHint,
    end: endHint,
    beat,
    conflict: obstacle,
    hook: String(cliffhanger).slice(0, 200),
  };
}

export function buildBoundaryBlock(boundaries) {
  return [
    '## Scene 边界（五段式 · Writer 不得越界）',
    `- **Goal**：${boundaries.goal}`,
    `- **Obstacle**：${boundaries.obstacle}`,
    `- **Escalation**：${boundaries.escalation}`,
    `- **New Information**：${boundaries.newInformation}`,
    `- **Hook**：${boundaries.hook}`,
    `- **Start**：${boundaries.start}`,
    `- **End**：${boundaries.end}`,
    '- 写到 **Hook** 即停止，不得进入下一 Scene 或全章总结。',
  ].join('\n');
}

/** Review 后处理：检测越界并裁剪到 Hook 附近 */
export function trimToSceneBoundary(text, boundaries) {
  let out = String(text || '').trim();
  if (!out) return { text: out, trimmed: false, reasons: [] };

  const reasons = [];
  const paras = out.split(/\n{2,}/);

  for (const marker of CROSS_SCENE_MARKERS) {
    const idx = out.search(marker);
    if (idx > out.length * 0.5) {
      out = out.slice(0, idx).trim();
      reasons.push(`裁剪跨 Scene 标记：${marker}`);
      break;
    }
  }

  const summaryPatterns = [
    /总之[，,]/,
    /综上所述/,
    /这意味着/,
    /由此可见/,
    /世界观[：:]/,
    /设定[：:]/,
  ];
  for (const p of summaryPatterns) {
    const m = out.match(p);
    if (m && m.index > out.length * 0.6) {
      out = out.slice(0, m.index).trim();
      reasons.push('裁剪总结解释段');
      break;
    }
  }

  if (paras.length > 8) {
    out = paras.slice(0, 8).join('\n\n').trim();
    reasons.push('裁剪超长段落（>8段）');
  }

  return { text: out, trimmed: reasons.length > 0, reasons };
}
