const EMOTIONS = [
  { name: '怒', re: /怒|愤|火|咬牙|攥拳/u },
  { name: '惧', re: /惧|怕|恐|慌|紧张|发冷/u },
  { name: '悲', re: /悲|伤|失落|灰|沉/u },
  { name: '喜', re: /喜|笑|松|轻/u },
  { name: '疑', re: /疑|惑|犹豫|迟疑|不确定/u },
  { name: '焦', re: /焦|急|躁|等不及/u },
];

const TRANSITION = /从.+到|变得|不再|突然|情绪|心里|心头|一沉|一紧|松了|僵/u;

export function analyzeEmotion(text) {
  const hits = EMOTIONS.filter((e) => e.re.test(text)).map((e) => e.name);
  const hasTransition = TRANSITION.test(text);
  const failures = [];

  const emotionChange = hits.length >= 2 || (hits.length >= 1 && hasTransition);
  if (!emotionChange) {
    failures.push('Emotion：Scene 至少一次人物情绪变化（需 2 种情绪或情绪转折）');
  }

  const score = emotionChange
    ? Math.min(100, 60 + hits.length * 15 + (hasTransition ? 10 : 0))
    : Math.max(0, hits.length * 30);

  return {
    id: 'emotion',
    pass: failures.length === 0,
    failures,
    score,
    metrics: { emotions: hits, hasTransition, emotionChange },
  };
}
