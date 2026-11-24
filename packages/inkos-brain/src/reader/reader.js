/**
 * Reader Simulation — 多读者视角评分
 */
const PERSONAS = [
  { id: 'commercial', name: '商业网文读者', weights: { hook: 0.3, pace: 0.3, payoff: 0.25, emotion: 0.15 } },
  { id: 'mystery', name: '悬疑读者', weights: { hook: 0.2, pace: 0.2, payoff: 0.35, emotion: 0.25 } },
  { id: 'editor', name: '编辑', weights: { hook: 0.25, pace: 0.25, payoff: 0.25, emotion: 0.25 } },
];

export function simulateReaders(chapterText, intent, metrics) {
  const signals = analyzeText(chapterText, intent, metrics);
  const personas = PERSONAS.map((p) => scorePersona(p, signals));

  const avgDrive = Math.round(personas.reduce((s, p) => s + p.readingDrive, 0) / personas.length);

  return {
    personas,
    highlights: {
      best: signals.bestMoment,
      boring: signals.boringPart,
      draggy: signals.draggyPart,
      anticipated: signals.anticipated,
      withheld: signals.withheld,
    },
    readingDrive: avgDrive,
    pass: avgDrive >= 60,
  };
}

function analyzeText(text, intent, metrics) {
  const len = text.replace(/\s/g, '').length;
  const lines = text.split('\n').filter((l) => l.trim());
  const dialogueLines = lines.filter((l) => /[「」""''"]/.test(l) || /^[\u4e00-\u9fff]{1,8}[：:]/.test(l));
  const dialogueRatio = lines.length ? dialogueLines.length / lines.length : metrics?.dialogueRatio ?? 0;

  const lastPara = lines.slice(-3).join(' ');
  const hasHook = /[？?！!…]|发现|看见|听见|门|电话|短信/.test(lastPara);
  const hasConflict = /但是|却|然而|代价|失去|阻止|追|逃/.test(text);

  let boringPart = '中段铺垫';
  if (dialogueRatio < 0.15) boringPart = '对话偏少，节奏偏叙述';
  if (len < 1500) boringPart = '篇幅偏短，高潮不足';

  let draggyPart = null;
  if (len > 4000 && dialogueRatio < 0.2) draggyPart = '长叙述段缺少硬切';

  // 留白检测：结尾 120 字内情绪身体词过密 = 写尽，无留白（悬念章密集身体描写是合理钩子，软判放过）
  const BODY_EMOTION_RE = /抖|颤|耳鸣|咬|跪|攥|抵|砸|跳|缩|冒汗|发白|刺痛|闷响/g;
  const tail = String(text).replace(/\s/g, '').slice(-120);
  const bodyEmotionCount = (tail.match(BODY_EMOTION_RE) || []).length;
  const withheld = {
    bodyEmotionCount,
    overloaded: bodyEmotionCount > 2,
    note: bodyEmotionCount > 2 ? `结尾 120 字内情绪身体词 ${bodyEmotionCount} 个，写尽无留白，建议删减收束` : null,
  };

  return {
    len,
    dialogueRatio,
    hasHook,
    hasConflict,
    bestMoment: intent.turningPoint || '转折场景',
    boringPart,
    draggyPart,
    anticipated: intent.ending || '章末钩子',
    withheld,
    hookScore: hasHook ? 85 : 50,
    paceScore: dialogueRatio >= 0.25 && dialogueRatio <= 0.65 ? 80 : 65,
    payoffScore: hasConflict ? 78 : 55,
    emotionScore: /痛|怕|跳|缩|汗|抖|呼吸/.test(text) ? 82 : 60,
  };
}

function scorePersona(persona, signals) {
  const w = persona.weights;
  const readingDrive = Math.round(
    signals.hookScore * w.hook +
    signals.paceScore * w.pace +
    signals.payoffScore * w.payoff +
    signals.emotionScore * w.emotion
  );
  return {
    id: persona.id,
    name: persona.name,
    readingDrive,
    scores: {
      hook: signals.hookScore,
      pace: signals.paceScore,
      payoff: signals.payoffScore,
      emotion: signals.emotionScore,
    },
    comment: readingDrive >= 75 ? '会继续读' : readingDrive >= 60 ? '可读但需加强钩子' : '容易弃读',
  };
}
