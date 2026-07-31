/**
 * Reader Satisfaction — 满足感驱动追更
 * Question → Promise → Payoff → Reader Satisfaction → New Promise
 * 每章：兑现旧期待 + 制造新期待，避免只吊胃口
 */

function norm(v = '') {
  return String(v || '').trim();
}

/**
 * Scene/章级读者满足感规划 — Writer P2
 */
export function buildReaderSatisfaction({
  questions = {},
  reward = {},
  promiseLifecycle = {},
  chapter = 1,
  sceneIndex = 1,
  sceneCount = 4,
} = {}) {
  const answered = questions.answeredReaderQuestion?.readerQuestion
    || questions.answeredQuestion;
  const payoff = promiseLifecycle?.payoff || (reward?.valid ? {
    promise: reward.promise,
    payoff: reward.payoff,
  } : null);
  const newPromise = promiseLifecycle?.newPromise?.text
    || promiseLifecycle?.newPromise;

  const satisfactionSignals = [];
  if (payoff?.payoff) satisfactionSignals.push('期待兑现');
  if (answered) satisfactionSignals.push('追问有回应');
  if (reward?.valid && reward.payoff) satisfactionSignals.push('读者赚到');

  const isLastScene = sceneIndex >= sceneCount;
  const chapterComplete = isLastScene && payoff?.payoff && newPromise;

  let satisfactionLevel = 'building';
  if (payoff?.payoff && satisfactionSignals.length >= 2) satisfactionLevel = 'high';
  else if (payoff?.payoff) satisfactionLevel = 'medium';

  const writerMust = [
    payoff?.payoff ? `Payoff Beat 须让读者感到「终于等到了」— ${payoff.payoff.slice(0, 40)}` : null,
    newPromise ? `Hook 须种下新期待 — ${String(newPromise).slice(0, 40)}` : null,
    isLastScene ? '章末：满足 + 新悬念并存，禁止只吊胃口无爽点' : null,
  ].filter(Boolean);

  return {
    version: 'reader-satisfaction-1',
    chain: ['Question', 'Promise', 'Payoff', 'Reader Satisfaction', 'New Promise'],
    answeredQuestion: answered || null,
    payoff: payoff?.payoff || reward?.payoff || null,
    promise: payoff?.promise || reward?.promise || null,
    newPromise: typeof newPromise === 'string' ? newPromise : newPromise?.text || null,
    satisfactionLevel,
    satisfactionSignals,
    chapterComplete,
    mustPayoffThisChapter: true,
    mustNewPromiseThisChapter: true,
    writerMust,
    rule: '每章至少兑现 1 Promise + 制造 1 新 Promise — 满足与期待并存',
    valid: Boolean(payoff?.payoff || (isLastScene && newPromise)),
  };
}

export function formatReaderSatisfactionBlock(satisfaction = {}) {
  if (!satisfaction?.chain) return '';

  return [
    '### Reader Satisfaction · 满足感（P2）',
    '**链式**：Question → Promise → Payoff → **满足感** → New Promise',
    '',
    satisfaction.payoff
      ? `- **Payoff（爽点/兑现）**：${satisfaction.payoff.slice(0, 50)}`
      : '- **Payoff**：⚠ 本 Scene 须落地至少一次读者期待兑现',
    satisfaction.newPromise
      ? `- **New Promise（继续期待）**：${satisfaction.newPromise.slice(0, 50)}`
      : '',
    satisfaction.answeredQuestion
      ? `- **追问回应**：${satisfaction.answeredQuestion.slice(0, 45)}`
      : '',
    `- **满足等级**：${satisfaction.satisfactionLevel}`,
    satisfaction.satisfactionSignals?.length
      ? `- **满足信号**：${satisfaction.satisfactionSignals.join(' · ')}`
      : '',
    '',
    '**铁律**：',
    '- 禁止一直吊胃口无爽点',
    '- 每章：读者既获得满足，又产生新期待',
    ...(satisfaction.writerMust || []).map((w) => `- ${w}`),
  ].filter(Boolean).join('\n');
}

export function buildChapterReaderSatisfaction({
  chapter = 1,
  sceneCount = 4,
  intent = {},
} = {}) {
  const scenes = intent.scenes || [];
  const lastScene = scenes.find((s) => (s.index ?? sceneCount) === sceneCount) || {};

  return {
    chapter,
    mustPayoffCount: 1,
    mustNewPromiseCount: 1,
    chain: ['Question', 'Promise', 'Payoff', 'Reader Satisfaction', 'New Promise'],
    rule: '每章：读者既获得满足，又产生新期待 — 禁止只吊胃口无爽点',
    climaxSceneIndex: sceneCount,
    expectedPayoff: lastScene.scenePlan?.reward?.payoff || '章内至少 1 次期待兑现',
    expectedNewPromise: lastScene.cliffhanger || lastScene.hook || '章尾种下新 Promise',
  };
}

export function formatChapterReaderSatisfactionBlock(plan = {}) {
  if (!plan?.chapter) return '';
  return [
    '### Reader Satisfaction · 章级满足感',
    `- **链式**：${(plan.chain || []).join(' → ')}`,
    `- **须兑现**：≥${plan.mustPayoffCount} Promise（${plan.expectedPayoff?.slice?.(0, 40) || plan.expectedPayoff}）`,
    `- **须新期待**：≥${plan.mustNewPromiseCount}（${plan.expectedNewPromise?.slice?.(0, 40) || plan.expectedNewPromise}）`,
    `- **铁律**：${plan.rule}`,
  ].join('\n');
}

export function formatReaderSatisfactionBrief(s = {}) {
  if (!s?.payoff && !s?.newPromise) return '';
  const parts = [];
  if (s.payoff) parts.push(`满足：${s.payoff.slice(0, 20)}`);
  if (s.newPromise) parts.push(`新期待：${s.newPromise.slice(0, 20)}`);
  return parts.join(' · ');
}
