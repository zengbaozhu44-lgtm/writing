#!/usr/bin/env node
/**
 * EO-P4-50-LEGACY-TRUTH-COVERAGE-AUDIT-01 — 只读审计（零数据写入）
 *
 * 逐书逐章输出 Truth 架构覆盖矩阵：
 *   state / anchor / scenes(actualEvents) / SR / attribution / l1_* / world / quarantine
 * + timeline 伪角色检出（对照 G1-A loadCharacterRegistry，fail-closed）
 * + timeline.day=null 计数（WL-01 家族）
 * + 重复章节文件 / 审计解锁状态
 *
 * 输出：stdout 摘要 + /tmp/inkos-obs/legacy-truth-coverage.{json,md}
 * 不修改任何书籍数据、不修改 Runtime 状态。
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadCharacterRegistry } from '../packages/inkos-core/src/lib/entity-identity.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const BOOK_ROOT = path.join(ROOT, 'books', '我的小说', 'books');
const OUT_DIR = '/tmp/inkos-obs';

const pad = (n) => String(n).padStart(4, '0');
const readJsonSafe = (p) => {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return null; }
};
const readYamlActorsSafe = (p) => {
  // 轻量解析 anchor 不必要；本脚本只读 states JSON 里的 timeline/evolution
  try { return fs.readFileSync(p, 'utf8'); } catch { return null; }
};

function listChapterFiles(bookDir) {
  const dir = path.join(bookDir, 'chapters');
  const map = new Map(); // chapter -> files[]
  if (!fs.existsSync(dir)) return map;
  for (const f of fs.readdirSync(dir).sort()) {
    const m = f.match(/^(\d{4})_.*\.md$/);
    if (!m) continue;
    const n = Number(m[1]);
    if (!map.has(n)) map.set(n, []);
    map.get(n).push(f);
  }
  return map;
}

function auditBook(bookDir) {
  const meta = readJsonSafe(path.join(bookDir, 'book.json')) || {};
  const registry = loadCharacterRegistry(bookDir);
  const canonicals = registry?.canonicals ? [...registry.canonicals.keys()] : [];
  const known = (name) => {
    if (!name) return false;
    if (registry?.canonicals?.has(name)) return true;
    if (registry?.aliasOwners?.has(name)) return true;
    return false;
  };

  const chapterFiles = listChapterFiles(bookDir);
  const stateDir = path.join(bookDir, 'states');
  const stateFiles = fs.existsSync(stateDir)
    ? fs.readdirSync(stateDir).filter((f) => /^ch_\d{4}\.json$/.test(f)).map((f) => Number(f.match(/ch_(\d{4})/)[1])).sort((a, b) => a - b)
    : [];
  const brain = path.join(bookDir, 'novel', '_system', 'brain');
  const has = (rel) => fs.existsSync(path.join(brain, rel));

  const audit = readJsonSafe(path.join(bookDir, 'novel', '_system', 'chapter_audit.json'));
  const world = readJsonSafe(path.join(brain, 'character_world', 'world.json'));
  const quarantine = readJsonSafe(path.join(brain, 'identity_quarantine.json'));

  const worldCharacters = world?.characters ? Object.keys(world.characters) : [];
  const worldPseudo = worldCharacters.filter((c) => !known(c));

  const rows = [];
  const pseudoActorsAll = new Map(); // name -> chapters[]
  let dayNullCount = 0;
  const maxCh = Math.max(0, ...chapterFiles.keys(), ...stateFiles);

  for (let n = 1; n <= maxCh; n += 1) {
    const p = pad(n);
    const state = readJsonSafe(path.join(stateDir, `ch_${p}.json`));
    const scenes = readJsonSafe(path.join(brain, `ch_${p}_scenes.json`));
    const sceneList = Array.isArray(scenes?.scenes) ? scenes.scenes : (Array.isArray(scenes) ? scenes : []);
    const actualEvents = sceneList.reduce((acc, s) => acc + (Array.isArray(s.actualEvents) ? s.actualEvents.length : 0), 0);

    const timeline = state?.timeline || {};
    const hints = state?.evolution?.characterHints || [];
    const actors = new Set();
    for (const ev of timeline.events || []) {
      const m = String(ev || '').match(/^(.+?)：/);
      if (m) actors.add(m[1].trim());
    }
    for (const h of hints) if (h?.character) actors.add(String(h.character).trim());
    for (const c of timeline.characters_present || []) actors.add(String(c).trim());
    const pseudo = [...actors].filter((a) => !known(a));
    for (const a of pseudo) {
      if (!pseudoActorsAll.has(a)) pseudoActorsAll.set(a, []);
      pseudoActorsAll.get(a).push(n);
    }
    if (timeline.day === null && (timeline.events || []).length) dayNullCount += 1;

    rows.push({
      chapter: n,
      chapterFiles: chapterFiles.get(n) || [],
      duplicateChapterFile: (chapterFiles.get(n) || []).length > 1,
      state: Boolean(state),
      anchor: fs.existsSync(path.join(stateDir, `ch_${p}_anchor.yaml`)),
      scenesFile: Boolean(scenes),
      actualEvents,
      sr: has(`character_sr/ch_${p}.json`),
      attribution: has(`attribution/ch_${p}.json`),
      l1Access: has(`l1_access/ch_${p}.json`),
      l1Eligibility: has(`l1_eligibility/ch_${p}.json`),
      l1Audit: has(`l1_audit/ch_${p}.json`),
      timelineActors: actors.size,
      timelinePseudoActors: pseudo,
      dayNull: timeline.day === null && (timeline.events || []).length > 0,
      auditStatus: audit?.chapters?.[String(n)]?.status || null,
    });
  }

  return {
    book: path.basename(bookDir),
    meta: {
      id: meta.id, targetChapters: meta.targetChapters, brainEnabled: meta.brainEnabled, schemaVersion: meta.schemaVersion,
    },
    canonicalRoster: canonicals,
    auditUnlockedThrough: audit?.unlockedThrough ?? null,
    worldPresent: Boolean(world),
    worldCharacters: worldCharacters.length,
    worldPseudoCharacters: worldPseudo,
    quarantine: quarantine ? { present: true, entries: (quarantine.entries || quarantine.quarantined || []).length } : { present: false },
    l1EvaluationBookLevel: has('l1_evaluation/l1_evaluation.json'),
    chapters: rows,
    totals: {
      chapters: rows.length,
      withState: rows.filter((r) => r.state).length,
      withAnchor: rows.filter((r) => r.anchor).length,
      withActualEvents: rows.filter((r) => r.actualEvents > 0).length,
      actualEventsSum: rows.reduce((a, r) => a + r.actualEvents, 0),
      withSR: rows.filter((r) => r.sr).length,
      withAttribution: rows.filter((r) => r.attribution).length,
      withL1: rows.filter((r) => r.l1Access || r.l1Eligibility).length,
      dayNull: dayNullCount,
      duplicateChapterFiles: rows.filter((r) => r.duplicateChapterFile).length,
      pseudoActorNames: [...pseudoActorsAll.keys()].length,
    },
    pseudoActorsByChapter: pseudoActorsAll.size
      ? Object.fromEntries([...pseudoActorsAll.entries()].map(([k, v]) => [k, v.join(',')]))
      : {},
  };
}

function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const books = fs.existsSync(BOOK_ROOT)
    ? fs.readdirSync(BOOK_ROOT).filter((d) => fs.existsSync(path.join(BOOK_ROOT, d, 'book.json'))).sort()
    : [];
  const reports = books.map((b) => {
    try { return auditBook(path.join(BOOK_ROOT, b)); } catch (e) { return { book: b, error: String(e.message || e) }; }
  });

  fs.writeFileSync(path.join(OUT_DIR, 'legacy-truth-coverage.json'), JSON.stringify(reports, null, 2));

  const lines = ['# Legacy Truth Coverage Audit — EO-P4-50（只读）', `generated: ${new Date().toISOString()}`, ''];
  for (const r of reports) {
    if (r.error) { lines.push(`## ${r.book}`, `ERROR: ${r.error}`, ''); continue; }
    const t = r.totals;
    lines.push(
      `## ${r.book} (target=${r.meta.targetChapters} brain=${r.meta.brainEnabled} schema=v${r.meta.schemaVersion})`,
      `- roster(03 bible): ${r.canonicalRoster.length} 人 [${r.canonicalRoster.join('、')}]`,
      `- audit unlockedThrough: ${r.auditUnlockedThrough ?? '—'} | world: ${r.worldPresent ? `${r.worldCharacters} characters（伪角色 ${r.worldPseudoCharacters.length}）` : '无'} | quarantine: ${r.quarantine.present ? `${r.quarantine.entries} entries` : '无'} | l1_evaluation(book级): ${r.l1EvaluationBookLevel}`,
      `- 覆盖(${t.chapters}章): state ${t.withState} · anchor ${t.withAnchor} · actualEvents ${t.withActualEvents}(共${t.actualEventsSum}) · SR ${t.withSR} · attribution ${t.withAttribution} · L1 ${t.withL1}`,
      `- 数据卫生: day=null ${t.dayNull} 章 · 重复章节文件 ${t.duplicateChapterFiles} 章 · timeline 伪角色名 ${t.pseudoActorNames} 个`,
    );
    if (r.worldPseudoCharacters.length) lines.push(`  - world 伪角色: ${r.worldPseudoCharacters.slice(0, 12).join('、')}${r.worldPseudoCharacters.length > 12 ? ' …' : ''}`);
    const pseudoChapters = Object.entries(r.pseudoActorsByChapter).slice(0, 10);
    if (pseudoChapters.length) lines.push(`  - timeline 伪角色分布: ${pseudoChapters.map(([k, v]) => `「${k}」@ch${v}`).join(' · ')}`);
    lines.push('');
  }
  fs.writeFileSync(path.join(OUT_DIR, 'legacy-truth-coverage.md'), lines.join('\n'));
  console.log(lines.join('\n'));
  console.log(`\n[audit] json → ${path.join(OUT_DIR, 'legacy-truth-coverage.json')}`);
  console.log(`[audit] md   → ${path.join(OUT_DIR, 'legacy-truth-coverage.md')}`);
  console.log('[audit] 数据零写入（只读）');
}

main();
