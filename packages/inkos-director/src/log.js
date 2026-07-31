import fs from 'node:fs';
import path from 'node:path';

export function getDirectorLogDir(bookDir) {
  return path.join(bookDir, 'novel', '_system', 'studio', 'director');
}

export function persistDirectorLog(bookDir, chapter, scene, payload) {
  try {
    const dir = path.join(getDirectorLogDir(bookDir), `ch_${String(chapter).padStart(4, '0')}`);
    fs.mkdirSync(dir, { recursive: true });
    const file = path.join(dir, `scene_${String(scene?.index ?? 0).padStart(2, '0')}.json`);
    fs.writeFileSync(file, JSON.stringify({ ...payload, at: new Date().toISOString() }, null, 2), 'utf8');
    return file;
  } catch {
    return null;
  }
}
