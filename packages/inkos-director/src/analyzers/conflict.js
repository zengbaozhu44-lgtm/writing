import { hasConflictMarker, hasEscalation, hasEvent } from '../utils.js';

/** Conflict：是否升级 */
export function analyzeConflictEscalation(windowText, { isFirst, windowIndex, scene, intent }) {
  const corpus = `${windowText} ${scene?.goal || ''} ${scene?.conflict || ''} ${intent?.mainGoal || ''}`;
  const failures = [];

  if (isFirst) {
    if (!hasConflictMarker(windowText) && !hasEvent(windowText)) {
      failures.push('Conflict：首段正文未体现目标/阻碍张力');
    }
  } else if (!hasEscalation(windowText) && !hasConflictMarker(windowText)) {
    failures.push(`Conflict：检测点 ${(windowIndex ?? 0) + 1} 未体现冲突升级`);
  }

  const score = failures.length ? 40 : (hasEscalation(corpus) ? 100 : 75);

  return {
    id: 'conflict',
    pass: failures.length === 0,
    failures,
    score,
  };
}
