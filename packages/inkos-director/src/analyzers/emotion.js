const EMOTIONS = [
  { name: '怒', re: /怒|愤|火|咬牙|攥拳/u },
  { name: '惧', re: /惧|怕|恐|慌|紧张|发冷/u },
  { name: '悲', re: /悲伤|伤心|失落|灰心|沮丧|沉沉/u },
  { name: '喜', re: /喜|笑|松|轻/u },
  { name: '疑', re: /疑|惑|犹豫|迟疑/u },
  { name: '焦', re: /焦|急|躁|等不及/u },
];

const TRANSITION = /从[\u4e00-\u9fa5]{1,8}到[\u4e00-\u9fa5]{1,8}|变得[\u4e00-\u9fa5]|不再[\u4e00-\u9fa5]|突然[\u4e00-\u9fa5]{0,6}|心里[\u4e00-\u9fa5]|心头[\u4e00-\u9fa5]{0,6}|一沉|一紧|僵住|愣住/u;

/** Emotion：全 Scene 至少一次情绪变化 */
export function analyzeEmotionChange(fullText) {
  const hits = EMOTIONS.filter((e) => e.re.test(fullText)).map((e) => e.name);
  const hasTransition = TRANSITION.test(fullText);
  const emotionChange = hits.length >= 2 || (hits.length >= 1 && hasTransition);
  const failures = [];

  if (!emotionChange && charCountSafe(fullText) >= 150) {
    failures.push('Emotion：Scene 缺少人物情绪变化');
  }

  return {
    id: 'emotion',
    pass: failures.length === 0,
    failures,
    score: emotionChange ? Math.min(100, 60 + hits.length * 15) : 30,
    metrics: { emotions: hits, hasTransition },
  };
}

function charCountSafe(t) {
  return String(t || '').replace(/\s/g, '').length;
}
