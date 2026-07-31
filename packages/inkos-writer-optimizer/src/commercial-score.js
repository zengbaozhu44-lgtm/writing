export const COMMERCIAL_THRESHOLD = 85;

const WEIGHTS = {
  hook: 0.2,
  conflict: 0.2,
  emotion: 0.15,
  dialogue: 0.15,
  pacing: 0.15,
  suspense: 0.15,
};

export function computeSuspenseScore(hookResult, text) {
  const tail = String(text || '').slice(-200);
  let score = hookResult?.score ?? 50;
  if (/但是|然而|却|没想到|突然|危险|威胁|秘密|发现/u.test(tail)) score += 10;
  if (/沉默|停顿|未|仍|还/u.test(tail)) score += 5;
  return Math.min(100, score);
}

/**
 * @param {Record<string, { score: number }>} dimensions
 */
export function computeCommercialScore(dimensions) {
  const scores = {
    hook: dimensions.hook?.score ?? 0,
    conflict: dimensions.conflict?.score ?? 0,
    emotion: dimensions.emotion?.score ?? 0,
    dialogue: dimensions.dialogue?.score ?? 0,
    pacing: dimensions.pacing?.score ?? 0,
    suspense: dimensions.suspense ?? dimensions.hook?.score ?? 0,
  };

  let total = 0;
  for (const [key, w] of Object.entries(WEIGHTS)) {
    total += (scores[key] ?? 0) * w;
  }

  scores.commercial_score = Math.round(total);
  return scores;
}
