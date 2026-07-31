import fs from 'node:fs';
import path from 'node:path';

export function buildPacingReport({
  pass,
  failures,
  totalChars,
  bands,
  runs,
  beats,
  scene,
  intent,
  meta = {},
}) {
  return {
    version: 'pacing-1',
    pass,
    failures,
    totalChars,
    rules: {
      eventBand: '每 800~1200 字须有事件',
      expositionRun: '连续说明 > 250 字 → 加入事件',
      psychologyRun: '连续心理 > 180 字 → 加入动作',
      settingRun: '连续设定 > 150 字 → 加入对话',
      beatSequence: '动作→对白→冲突→解释→动作→Hook',
      forbid: '禁止连续 4 段解释',
    },
    bands,
    runs,
    beats,
    scene,
    intent: { pov: intent?.pov, mainGoal: intent?.mainGoal },
    ...meta,
    generatedAt: new Date().toISOString(),
  };
}

export function getPacingReportDir(bookDir, chapter) {
  return path.join(
    bookDir,
    'novel',
    '_system',
    'studio',
    'director',
    'pacing',
    `ch_${String(chapter).padStart(4, '0')}`,
  );
}

export function persistPacingReport(bookDir, chapter, scene, report) {
  try {
    const dir = path.join(
      getPacingReportDir(bookDir, chapter),
      `scene_${String(scene?.index ?? 0).padStart(2, '0')}`,
    );
    fs.mkdirSync(dir, { recursive: true });
    const file = path.join(dir, 'pacing_report.json');
    fs.writeFileSync(file, JSON.stringify(report, null, 2), 'utf8');
    return file;
  } catch {
    return null;
  }
}
