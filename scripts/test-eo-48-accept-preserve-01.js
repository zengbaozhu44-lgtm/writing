#!/usr/bin/env node
/**
 * EO-P4-48-ACCEPT-PRESERVE-01 — 隔离测试 M1–M8（Human Seal S1/S2/S3）
 *
 * 全部在 os.tmpdir() 合成书上运行；任何路径意外指向正式书籍立即终止。
 * M1 pending 正常接受 · M2 state 保全 · M3 幂等 no-op · M4 中断重入 ×2
 * M5 充分输入唯一论 · M6 无材料 fail-closed 零写入 · M7 09 POV 守卫 · M8 tmpdir 边界
 * （M8 的"正式书树前后快照"由外部执行器包裹整个回归序列完成，脚本内为 tmpdir 断言）
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const REAL_BOOKS = path.join(root, 'books');
let n = 0;
function ok(label) { n += 1; console.log(`✓ ${label}`); }
const toUrl = (p) => pathToFileURL(p).href;

function assertTmp(bookDir, tag) {
  const t = path.join(os.tmpdir(), '');
  if (!path.resolve(bookDir).startsWith(t) || path.resolve(bookDir).includes(REAL_BOOKS)) {
    console.error(`[EO-48] 路径越界（${tag}）: ${bookDir}`);
    process.exit(2);
  }
}

function makeBook() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'inkos-eo48-'));
  fs.mkdirSync(path.join(dir, 'chapters'), { recursive: true });
  fs.mkdirSync(path.join(dir, 'states'), { recursive: true });
  fs.mkdirSync(path.join(dir, 'novel', '_system', 'brain'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'book.json'), JSON.stringify({
    id: 'eo48-test', title: 'EO-48 隔离书', currentChapter: 0, schemaVersion: 4, brainEnabled: true,
  }, null, 2));
  fs.writeFileSync(path.join(dir, 'novel', '_system', 'manifest.json'), JSON.stringify({
    schemaVersion: 4, lastAppliedChapter: 0, brain: { enabled: true },
  }));
  const novelFiles = {
    '01_world.md': '# world\n',
    '02_writing.md': '# writing\n',
    '08_current_state.md': '# state\n',
    '09_current_chapter.md': '# 09 Current Chapter\n',
    '07_state_board.md': '# board\n',
    '11_timeline.yaml': 'events: []\n',
    '13_facts_db.yaml': 'facts: []\n',
  };
  for (const [name, body] of Object.entries(novelFiles)) fs.writeFileSync(path.join(dir, 'novel', name), body);
  return dir;
}

const pad = (c) => String(c).padStart(4, '0');
const hashFile = (p) => (fs.existsSync(p) ? crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex') : null);

function treeHash(bookDir) {
  const out = [];
  const walk = (d) => {
    for (const f of fs.readdirSync(d).sort()) {
      const p = path.join(d, f);
      if (fs.statSync(p).isDirectory()) walk(p);
      else out.push(`${path.relative(bookDir, p)}:${hashFile(p)}`);
    }
  };
  walk(bookDir);
  return crypto.createHash('sha256').update(out.join('\n')).digest('hex');
}

const BODY = '雨打在铁皮棚上。林深停在邻居门前，空气里有一股锈味。他听见里面有人笑，门锁内侧有新鲜抓痕。\n\n'.repeat(50);

function fullStateDiff({ pov = '林深', mainGoal = '查明邻居的真实身份', mustLose = '安稳的日常', chapter = 1 } = {}) {
  return {
    chapterText: BODY,
    chapterTitle: `第${chapter}章`,
    intent: { pov, mainGoal, mustLose },
    scenes: [{ index: 1, id: `ch${chapter}_s1`, text: BODY }],
    skipGitCli: true,
    deferredAt: new Date().toISOString(),
  };
}

function writePending(bookDir, chapter, diff) {
  const dir = path.join(bookDir, 'novel', '_system', 'pending_commit');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, `ch_${pad(chapter)}.json`), JSON.stringify(diff));
  return path.join(dir, `ch_${pad(chapter)}.json`);
}

function writeSettledState(bookDir, chapter, { pov = '苏晚', anchorPov } = {}) {
  // 模拟既有已 commit 真相：states JSON + anchor + canon 文件
  const stateBlob = {
    version: 'memory-unit-1',
    chapter,
    committedAt: '2026-09-11T06:48:04.951Z',
    intent: { pov, mainGoal: '处理天花板漏水', mustLose: '独自掌控钥匙的安全感' },
    facts: [{ id: 'f1', text: '钥匙已交给老何' }],
    timeline: { day: 2, time: '21:00', events: [`${pov}：把钥匙交给老何`] },
    evolution: { actualEventIds: ['evt_a', 'evt_b'], characterHints: [{ character: pov, action: '交出钥匙' }] },
  };
  fs.writeFileSync(path.join(bookDir, 'states', `ch_${pad(chapter)}.json`), JSON.stringify(stateBlob, null, 2));
  const anchorPovValue = anchorPov === undefined ? pov : anchorPov;
  const anchorLines = [
    'version: chapter-anchor-3',
    `chapter: ${chapter}`,
    anchorPovValue === null ? '' : `pov: ${anchorPovValue}`,
    'narrative_momentum:',
    '  version: narrative-momentum-1',
    '  closing_emotion: 压抑·余波未平',
  ].filter((l) => l !== '');
  fs.writeFileSync(path.join(bookDir, 'states', `ch_${pad(chapter)}_anchor.yaml`), `${anchorLines.join('\n')}\n`);
  fs.writeFileSync(path.join(bookDir, 'novel', '08_current_state.md'), '# state · settled\n');
  fs.writeFileSync(path.join(bookDir, 'novel', '11_timeline.yaml'), `events:\n  - ${pov}：把钥匙交给老何\n`);
  return stateBlob;
}

const {
  acceptChapter, getChapterStatus, markPendingAudit, loadChapterAudit,
} = await import(toUrl(path.join(root, 'packages/inkos-studio-server/src/chapter-audit.js')));

// ── M1：有 pending 的正常接受（完整 stateDiff 提交）──
{
  const book = makeBook(); assertTmp(book, 'M1');
  fs.writeFileSync(path.join(book, 'chapters', '0001_雨夜.md'), BODY, 'utf8');
  writePending(book, 1, fullStateDiff({ chapter: 1 }));
  markPendingAudit(book, 1, { deferredCommit: true });
  const res = acceptChapter(book, 1, {});
  assert.equal(res.ok, true); assert.equal(res.idempotent, undefined);
  assert.ok(res.memoryCommit?.stateFile, 'M1 stateFile written');
  const state = JSON.parse(fs.readFileSync(res.memoryCommit.stateFile, 'utf8'));
  assert.equal(state.intent.pov, '林深');
  assert.equal(state.intent.mainGoal, '查明邻居的真实身份');
  assert.equal(state.intent.mustLose, '安稳的日常');
  const anchor = fs.readFileSync(res.memoryCommit.anchorFile, 'utf8');
  assert.match(anchor, /pov: 林深/);
  assert.equal(getChapterStatus(book, 1), 'accepted');
  assert.ok(Number(loadChapterAudit(book).unlockedThrough) >= 2);
  assert.ok(!fs.existsSync(path.join(book, 'novel', '_system', 'pending_commit', 'ch_0001.json')), 'pending consumed');
  ok('M1 pending accept → full stateDiff commit (pov/mainGoal/mustLose preserved) + unlock');
  fs.rmSync(book, { recursive: true, force: true });
}

// ── M2：有 state、无 pending → Truth 保全（S1）──
{
  const book = makeBook(); assertTmp(book, 'M2');
  writeSettledState(book, 2, { pov: '苏晚' });
  fs.writeFileSync(path.join(book, 'chapters', '0002_第2章.md'), BODY, 'utf8');
  markPendingAudit(book, 2);
  const truthFiles = [
    'states/ch_0002.json', 'states/ch_0002_anchor.yaml',
    'novel/08_current_state.md', 'novel/11_timeline.yaml', 'novel/_system/manifest.json',
  ].map((f) => path.join(book, f));
  const before = truthFiles.map(hashFile);
  const res = acceptChapter(book, 2, {});
  assert.equal(res.memoryCommit?.skipped, true);
  assert.equal(res.memoryCommit?.reason, 'existing_state_preserved');
  const after = truthFiles.map(hashFile);
  assert.deepEqual(after, before, 'M2 truth files must be byte-identical');
  assert.equal(getChapterStatus(book, 2), 'accepted');
  assert.ok(Number(loadChapterAudit(book).unlockedThrough) >= 3);
  const entry = loadChapterAudit(book).chapters[2];
  assert.equal(entry.preserved, true);
  ok('M2 S1: state exists + no pending → zero truth overwrite, preserved flag, unlock');
  fs.rmSync(book, { recursive: true, force: true });
}

// ── M3：已 accepted 重复接受 → 幂等 no-op，全树零写入（S2）──
{
  const book = makeBook(); assertTmp(book, 'M3');
  writeSettledState(book, 1, { pov: '苏晚' });
  markPendingAudit(book, 1);
  acceptChapter(book, 1, {});
  const before = treeHash(book);
  const again = acceptChapter(book, 1, {});
  assert.equal(again.ok, true); assert.equal(again.idempotent, true);
  assert.equal(again.memoryCommit, null);
  assert.equal(treeHash(book), before, 'M3 whole tree (incl. chapter_audit.json & 09) unchanged');
  ok('M3 S2: re-accept → idempotent no-op, whole-tree zero writes');
  fs.rmSync(book, { recursive: true, force: true });
}

// ── M4a：commit 成功后、unlink 前中断 → 重入再次全量提交（无 Truth 丢失）──
{
  const book = makeBook(); assertTmp(book, 'M4a');
  writePending(book, 1, fullStateDiff({ chapter: 1 }));
  markPendingAudit(book, 1);
  const auditFileA = path.join(book, 'novel', '_system', 'chapter_audit.json');
  const preAudit = fs.readFileSync(auditFileA, 'utf8'); // 崩溃时点：status 仍为 pending_audit
  const first = acceptChapter(book, 1, {});
  const state1 = JSON.parse(fs.readFileSync(first.memoryCommit.stateFile, 'utf8'));
  // 模拟崩溃点（commit 后、unlink 前）：pending 仍在 + audit 状态未落 → 恢复两处后重入
  writePending(book, 1, fullStateDiff({ chapter: 1 }));
  fs.writeFileSync(auditFileA, preAudit);
  const second = acceptChapter(book, 1, {});
  assert.ok(second.memoryCommit?.stateFile, 'M4a re-entry re-commits full stateDiff (not idempotent skip)');
  const state2 = JSON.parse(fs.readFileSync(second.memoryCommit.stateFile, 'utf8'));
  assert.equal(state2.intent.pov, state1.intent.pov);
  assert.equal(state2.intent.mainGoal, state1.intent.mainGoal);
  assert.equal(state2.intent.mustLose, state1.intent.mustLose);
  console.log(`  M4a committedAt: ${state1.committedAt} → ${state2.committedAt}（允许变化；生产代码零逻辑读消费者，已审计）`);
  ok('M4a interrupt(after commit, before unlink) → re-entry full re-commit, no truth loss');
  fs.rmSync(book, { recursive: true, force: true });
}

// ── M4b：unlink 后、setStatus 前中断 → 重入走 S1 保全路径 ──
{
  const book = makeBook(); assertTmp(book, 'M4b');
  writePending(book, 1, fullStateDiff({ chapter: 1 }));
  markPendingAudit(book, 1);
  const auditFile = path.join(book, 'novel', '_system', 'chapter_audit.json');
  const preAudit = fs.readFileSync(auditFile, 'utf8'); // status=pending_audit 快照
  acceptChapter(book, 1, {});
  // 模拟崩溃点：audit 状态未落（回滚到 pending_audit），pending 已消耗，state 已存在
  fs.writeFileSync(auditFile, preAudit);
  const statePath = path.join(book, 'states', 'ch_0001.json');
  const before = hashFile(statePath);
  const res = acceptChapter(book, 1, {});
  assert.equal(res.memoryCommit?.skipped, true);
  assert.equal(hashFile(statePath), before, 'M4b state preserved on re-entry');
  assert.equal(getChapterStatus(book, 1), 'accepted');
  ok('M4b interrupt(after unlink, before setStatus) → re-entry S1 preserve + unlock');
  fs.rmSync(book, { recursive: true, force: true });
}

// ── M5：充分输入唯一论 —— 正文/anchor/scenes 单独存在均不充分（S3）──
{
  const book = makeBook(); assertTmp(book, 'M5');
  fs.writeFileSync(path.join(book, 'chapters', '0003_仅正文.md'), BODY, 'utf8'); // a) 仅正文
  assert.throws(() => acceptChapter(book, 3, {}), /缺少接受材料/);
  fs.writeFileSync(path.join(book, 'states', 'ch_0003_anchor.yaml'), 'version: chapter-anchor-3\nchapter: 3\npov: 林深\n'); // b) +仅 anchor
  assert.throws(() => acceptChapter(book, 3, {}), /缺少接受材料/);
  fs.writeFileSync(path.join(book, 'novel', '_system', 'brain', 'ch_0003_scenes.json'), JSON.stringify({ scenes: [{ index: 1, text: BODY }] })); // c) +仅 scenes
  assert.throws(() => acceptChapter(book, 3, {}), /缺少接受材料/);
  writePending(book, 3, fullStateDiff({ chapter: 3 })); // d) 完整 stateDiff = 唯一充分输入
  const res = acceptChapter(book, 3, {});
  assert.equal(res.ok, true); assert.ok(res.memoryCommit?.stateFile);
  ok('M5 S3: text/anchor/scenes alone ≠ sufficient; full pending stateDiff is the only sufficient input');
  fs.rmSync(book, { recursive: true, force: true });
}

// ── M6：无 pending、无 state → fail-closed，书籍文件与 audit store 零变化（S3）──
{
  const book = makeBook(); assertTmp(book, 'M6');
  const before = treeHash(book);
  assert.throws(
    () => acceptChapter(book, 5, {}),
    (e) => /缺少接受材料/.test(e.message)
      && /pending_commit\/ch_0005\.json/.test(e.message)
      && /states\/ch_0005\.json/.test(e.message),
  );
  assert.equal(treeHash(book), before, 'M6 zero writes (incl. audit store)');
  ok('M6 S3: no materials → explicit error listing missing artifacts; zero writes');
  fs.rmSync(book, { recursive: true, force: true });
}

// ── M7：09 回填 POV 守卫 —— pov 缺失/未标注 → 跳过回填，不写占位卡（S3）──
{
  const book = makeBook(); assertTmp(book, 'M7');
  writeSettledState(book, 2, { pov: '苏晚', anchorPov: '未标注' });
  markPendingAudit(book, 2);
  const card = path.join(book, 'novel', '09_current_chapter.md');
  const before = hashFile(card);
  const res = acceptChapter(book, 2, {});
  assert.equal(res.ok, true);
  assert.equal(hashFile(card), before, 'M7a placeholder pov(未标注) → no 09 write');
  ok('M7a guard: anchor pov=未标注 → skip backfill');
  fs.rmSync(book, { recursive: true, force: true });

  const book2 = makeBook(); assertTmp(book2, 'M7b');
  writeSettledState(book2, 2, { anchorPov: null }); // anchor 无 pov 键
  markPendingAudit(book2, 2);
  const card2 = path.join(book2, 'novel', '09_current_chapter.md');
  const before2 = hashFile(card2);
  const res2 = acceptChapter(book2, 2, {});
  assert.equal(res2.ok, true);
  assert.equal(hashFile(card2), before2, 'M7b missing pov → no 09 write');
  ok('M7b guard: anchor pov missing → skip backfill');
  fs.rmSync(book2, { recursive: true, force: true });

  const book3 = makeBook(); assertTmp(book3, 'M7c');
  writeSettledState(book3, 2, { pov: '苏晚', anchorPov: '苏晚' }); // 真实 POV → 正常回填
  markPendingAudit(book3, 2);
  const res3 = acceptChapter(book3, 2, {});
  assert.equal(res3.ok, true);
  const card3 = fs.readFileSync(path.join(book3, 'novel', '09_current_chapter.md'), 'utf8');
  assert.match(card3, /\*\*POV\*\*：苏晚/, 'M7c real pov → backfilled card carries it');
  assert.doesNotMatch(card3, /\*\*POV\*\*：主角/, 'M7c pov line never placeholder');
  ok('M7c guard: real anchor pov → backfill proceeds with real pov');
  fs.rmSync(book3, { recursive: true, force: true });
}

console.log(`\nEO-P4-48 ACCEPT-PRESERVE-01: all ${n} checks passed (M1–M7; M8 tree snapshots run by executor).`);
