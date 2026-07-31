const QUESTION_RE = /[？?]|吗|呢|能否|会不会|到底|为何|如何|谁|什么|难道|究竟|要不要|会不会/u;

export function analyzeHookEnd(text, scene = {}) {
  const t = String(text || '').trim();
  const tail = t.replace(/\s/g, '').slice(-180);
  const failures = [];

  const hasQuestion = QUESTION_RE.test(tail)
    || QUESTION_RE.test(scene?.goal || '')
    || /悬念|未|还|仍|却|但是|然而/.test(tail);

  if (tail.length >= 40 && !hasQuestion) {
    failures.push('Hook：Scene 结尾须留下问题/悬念（？、吗、呢、能否、到底等）');
  }

  const suspenseBonus = /但是|然而|却|没想到|突然|声音|门|影子|沉默|抉择/u.test(tail) ? 15 : 0;
  const score = hasQuestion ? Math.min(100, 75 + suspenseBonus) : Math.max(0, 40);

  return {
    id: 'hook',
    pass: failures.length === 0,
    failures,
    score,
    metrics: { tailLen: tail.length, hasQuestion },
  };
}
