/**
 * Reader Simulation — 模拟读者阅读后的追读动力指标
 * 结果输入 Reader Feedback Loop → Adaptive Planner → Next Director
 */
const QUESTION_RE = /[？?]|吗|呢|能否|会不会|到底|为何|如何|谁|什么|难道|究竟|要不要/u;
const HOOK_TAIL_RE = /但是|然而|却|没想到|突然|声音|门|影子|沉默|抉择|来不及|还剩/u;
const DROP_RISK_RE = /总结|总之|因此|所以|看来|显然|平静|一切恢复正常|松了口气|结束了/u;

function countQuestions(text) {
  const matches = String(text || '').match(new RegExp(QUESTION_RE.source, 'gu'));
  return matches?.length ?? 0;
}

function scoreCuriosity(text, beatMemory = {}) {
  const t = String(text || '');
  const tail = t.replace(/\s/g, '').slice(-200);
  let score = 35;

  score += Math.min(25, countQuestions(tail) * 8);
  if (HOOK_TAIL_RE.test(tail)) score += 15;
  if (beatMemory.unresolvedIssues?.length) {
    score += Math.min(20, beatMemory.unresolvedIssues.length * 6);
  }
  if (/(发现|原来|竟然|不可能|异常)/u.test(tail)) score += 10;
  if (DROP_RISK_RE.test(tail)) score -= 20;

  return Math.max(0, Math.min(100, Math.round(score)));
}

function scoreDropRisk(text, curiosity = 50) {
  const t = String(text || '');
  const tail = t.replace(/\s/g, '').slice(-150);
  let risk = 30;

  if (DROP_RISK_RE.test(tail)) risk += 35;
  if (tail.length < 30) risk += 15;
  if (!QUESTION_RE.test(tail) && !HOOK_TAIL_RE.test(tail)) risk += 15;
  if (curiosity >= 70) risk -= 20;
  if (curiosity < 40) risk += 15;

  return Math.max(0, Math.min(100, Math.round(risk)));
}

/**
 * 模拟读者阅读 Scene/Beat 后的追读动力
 */
export function simulateReader({
  text = '',
  scene = {},
  intent = {},
  beatMemory = {},
  emotionCurve = null,
} = {}) {
  const questionCount = countQuestions(text);
  const curiosity = scoreCuriosity(text, beatMemory);
  const dropRisk = scoreDropRisk(text, curiosity);

  let continueProbability = Math.round(
    curiosity * 0.55
    + (100 - dropRisk) * 0.35
    + Math.min(10, questionCount * 2),
  );

  if (emotionCurve?.chapterPeak) {
    const peak = Math.max(
      emotionCurve.chapterPeak.fear ?? 0,
      emotionCurve.chapterPeak.hope ?? 0,
      emotionCurve.chapterPeak.anger ?? 0,
      emotionCurve.chapterPeak.surprise ?? 0,
    );
    if (peak >= 60) continueProbability = Math.min(100, continueProbability + 8);
    if (peak < 20) continueProbability = Math.max(0, continueProbability - 10);
  }

  continueProbability = Math.max(0, Math.min(100, continueProbability));

  return {
    curiosity,
    questionCount,
    dropRisk,
    continueProbability,
    sceneIndex: scene.index ?? null,
    pov: intent.pov || scene.pov || null,
    simulatedAt: new Date().toISOString(),
  };
}
