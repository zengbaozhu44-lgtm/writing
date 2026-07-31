const HOOK_TAIL_RE = /[？?]|吗[？?]?$|呢[？?]?$|能否|会不会|到底|究竟|要不要|难道/u;

/** Hook：Scene 结尾是否形成悬念（末窗口） */
export function analyzeHookFormed(windowText, { isLast, scene }) {
  if (!isLast) return { pass: true, failures: [], score: 100, id: 'hook' };

  const tail = String(windowText || '').replace(/\s/g, '').slice(-120);
  const failures = [];
  const hasQuestion = HOOK_TAIL_RE.test(tail)
    || /悬念|未|还|仍|但是|然而|沉默|抉择|停住|愣住/u.test(tail.slice(-40));

  if (tail.length >= 40 && !hasQuestion) {
    failures.push('Hook：Scene 结尾未形成问题/悬念');
  }

  return {
    id: 'hook',
    pass: failures.length === 0,
    failures,
    score: hasQuestion ? 100 : 35,
    metrics: { hasQuestion, tailLen: tail.length },
  };
}
