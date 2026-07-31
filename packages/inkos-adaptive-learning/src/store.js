import fs from 'node:fs';
import path from 'node:path';

export function getAdaptiveLearningDir(bookDir) {
  return path.join(bookDir, 'novel', '_system', 'studio', 'adaptive-learning');
}

export function loadAdaptiveLearningState(bookDir) {
  const file = path.join(getAdaptiveLearningDir(bookDir), 'state.json');
  if (!fs.existsSync(file)) return null;
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

export function saveAdaptiveLearningState(bookDir, state) {
  try {
    const dir = getAdaptiveLearningDir(bookDir);
    fs.mkdirSync(dir, { recursive: true });
    const file = path.join(dir, 'state.json');
    fs.writeFileSync(file, JSON.stringify({ ...state, updatedAt: new Date().toISOString() }, null, 2), 'utf8');
    return file;
  } catch {
    return null;
  }
}

export function loadAdaptiveAdjustments(bookDir) {
  const state = loadAdaptiveLearningState(bookDir);
  return state?.adjustments || null;
}
