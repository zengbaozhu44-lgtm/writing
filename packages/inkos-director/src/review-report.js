import fs from 'node:fs';
import path from 'node:path';

export function getReviewReportDir(bookDir, chapter) {
  return path.join(
    bookDir,
    'novel',
    '_system',
    'studio',
    'director',
    'reviews',
    `ch_${String(chapter).padStart(4, '0')}`,
  );
}

export function getAdaptivePlannerDir(bookDir, chapter) {
  return path.join(
    bookDir,
    'novel',
    '_system',
    'studio',
    'director',
    'adaptive',
    `ch_${String(chapter).padStart(4, '0')}`,
  );
}

export function persistSceneReviewReport(bookDir, chapter, scene, report) {
  try {
    const dir = path.join(
      getReviewReportDir(bookDir, chapter),
      `scene_${String(scene?.index ?? 0).padStart(2, '0')}`,
    );
    fs.mkdirSync(dir, { recursive: true });
    const file = path.join(dir, 'review_report.json');
    fs.writeFileSync(file, JSON.stringify(report, null, 2), 'utf8');
    return file;
  } catch {
    return null;
  }
}

export function persistChapterReviewReport(bookDir, chapter, report) {
  try {
    const dir = getReviewReportDir(bookDir, chapter);
    fs.mkdirSync(dir, { recursive: true });
    const file = path.join(dir, 'chapter_review.json');
    fs.writeFileSync(file, JSON.stringify(report, null, 2), 'utf8');
    return file;
  } catch {
    return null;
  }
}

export function loadSceneReviewReports(bookDir, chapter) {
  const base = getReviewReportDir(bookDir, chapter);
  if (!fs.existsSync(base)) return [];
  const reports = [];
  for (const name of fs.readdirSync(base)) {
    if (!name.startsWith('scene_')) continue;
    const file = path.join(base, name, 'review_report.json');
    if (!fs.existsSync(file)) continue;
    try {
      reports.push(JSON.parse(fs.readFileSync(file, 'utf8')));
    } catch { /* skip */ }
  }
  return reports.sort((a, b) => (a.scene?.index ?? 0) - (b.scene?.index ?? 0));
}

export function persistReaderCurveReport(bookDir, chapter, report) {
  try {
    const dir = getReviewReportDir(bookDir, chapter);
    fs.mkdirSync(dir, { recursive: true });
    const file = path.join(dir, 'reader_curve_report.json');
    fs.writeFileSync(file, JSON.stringify(report, null, 2), 'utf8');
    return file;
  } catch {
    return null;
  }
}

export function loadReaderCurveReport(bookDir, chapter) {
  const file = path.join(getReviewReportDir(bookDir, chapter), 'reader_curve_report.json');
  if (!fs.existsSync(file)) return null;
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}
