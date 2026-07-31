#!/usr/bin/env node
/**
 * 冒烟：前三章基调 → Planner 读取 → 审计状态机（待审计→删除重跑→接受→解锁下一章）
 *
 * 链路：向导填基调 → 写 wizard_chapter_tones.json → Planner intent
 *      → pending_audit → delete draft → ready_to_generate
 *      → accept → unlockedThrough +1
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let n = 0;
function ok(label) {
  n += 1;
  console.log(`✓ ${label}`);
}
function toUrl(p) {
  return pathToFileURL(p).href;
}

function mkTmpBook() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'inkos-audit-'));
  fs.mkdirSync(path.join(dir, 'chapters'), { recursive: true });
  fs.mkdirSync(path.join(dir, 'states'), { recursive: true });
  fs.mkdirSync(path.join(dir, 'novel', '_system', 'brain'), { recursive: true });
  fs.writeFileSync(
    path.join(dir, 'book.json'),
    JSON.stringify({ id: 'smoke-audit', title: '审计冒烟', currentChapter: 0, schemaVersion: 4, brainEnabled: true }, null, 2),
  );
  fs.writeFileSync(
    path.join(dir, 'novel', '_system', 'manifest.json'),
    JSON.stringify({ schemaVersion: 4, lastAppliedChapter: 0, brain: { enabled: true } }),
  );
  const novelFiles = {
    '01_world.md': '# world\n',
    '02_writing.md': '# writing\n',
    '08_current_state.md': '# state\n',
    '09_current_chapter.md': '# task\n',
    '07_state_board.md': '# board\n',
    '11_timeline.yaml': 'events: []\n',
    '13_facts_db.yaml': 'facts: []\n',
    '05_relationship_graph.yaml': 'edges: []\n',
    '06_knowledge_matrix.yaml': 'items: []\n',
    '12_foreshadow_db.yaml': 'items: []\n',
    '14_resource_db.yaml': 'items: []\n',
  };
  for (const [name, body] of Object.entries(novelFiles)) {
    fs.writeFileSync(path.join(dir, 'novel', name), body);
  }
  return dir;
}

{
  const step7 = fs.readFileSync(
    path.join(root, 'packages/inkos-studio/src/components/wizard/Step7ChapterTones.tsx'),
    'utf8',
  );
  assert.match(step7, /ChapterToneCard/);
  assert.match(step7, /前三章基调/);
  assert.doesNotMatch(step7, /beatPlan|chapter1Hook|Beat 1/);
  ok('Step7ChapterTones: tones only, no beatPlan form');
}

{
  const card = fs.readFileSync(
    path.join(root, 'packages/inkos-studio/src/components/wizard/ChapterToneCard.tsx'),
    'utf8',
  );
  assert.match(card, /1000/);
  assert.match(card, /dirtyRef|debounce/);
  assert.match(card, /tonePresetsForGenre/);
  ok('ChapterToneCard: debounce + presets');
}

{
  const planner = fs.readFileSync(
    path.join(root, 'packages/inkos-brain/src/planner/planner.js'),
    'utf8',
  );
  assert.match(planner, /loadWizardChapterTone/);
  assert.match(planner, /wizard_chapter_tones\.json/);
  assert.match(planner, /chapterTone\.coreEvent/);
  assert.match(planner, /endingDirection/);
  assert.match(planner, /wordTarget/);
  ok('Planner source: loadWizardChapterTone wired');
}

{
  const routes = fs.readFileSync(
    path.join(root, 'packages/inkos-studio-server/src/routes.js'),
    'utf8',
  );
  assert.match(routes, /chapterAcceptMatch/);
  assert.match(routes, /chapterDraftMatch/);
  assert.match(routes, /chapterOptimizeMatch/);
  assert.match(routes, /acceptChapter\(/);
  assert.match(routes, /deleteChapterDraft\(/);
  assert.match(routes, /optimizeChapter\(/);
  ok('Routes: accept / draft DELETE / optimize');
}

{
  const drawer = fs.readFileSync(
    path.join(root, 'packages/inkos-studio/src/components/drawers/DiagnosticsDrawer.tsx'),
    'utf8',
  );
  assert.match(drawer, /ChapterActions/);
  assert.match(drawer, /toneDeviation|tone-deviation/);
  assert.match(drawer, /pending_audit/);
  ok('DiagnosticsDrawer: ChapterActions + tone deviation');
}

{
  const home = fs.readFileSync(
    path.join(root, 'packages/inkos-studio/src/pages/BookHomePage.tsx'),
    'utf8',
  );
  assert.match(home, /待审计/);
  assert.match(home, /已接受/);
  assert.match(home, /待解锁/);
  ok('BookHomePage: audit status badges');
}

// ── runtime 链路（无 LLM）──
const {
  saveWizardChapterTones,
  loadWizardChapterTone,
  markPendingAudit,
  acceptChapter,
  deleteChapterDraft,
  optimizeChapter,
  getChapterStatus,
  assertChapterUnlocked,
  loadChapterAudit,
  checkToneDeviation,
} = await import(toUrl(path.join(root, 'packages/inkos-studio-server/src/chapter-audit.js')));

const { loadWizardChapterTone: plannerLoadTone, planChapter } = await import(
  toUrl(path.join(root, 'packages/inkos-brain/src/planner/planner.js'))
);

{
  const bookDir = mkTmpBook();
  const tones = [
    {
      chapterIndex: 1,
      tone: '压抑惊悚',
      coreEvent: '主角在雨夜发现邻居并非人类',
      endingDirection: '门锁内侧出现抓痕，读者不敢回头',
      wordTarget: 2500,
    },
    {
      chapterIndex: 2,
      tone: '日常异变',
      coreEvent: '白天一切如常，只有他看见裂缝',
      endingDirection: '裂缝里传出熟悉的笑声',
      wordTarget: 2500,
    },
    {
      chapterIndex: 3,
      tone: '悬念突袭',
      coreEvent: '警察上门，却认错了人',
      endingDirection: '真正的目标其实是他',
      wordTarget: 2800,
    },
  ];
  saveWizardChapterTones(bookDir, tones);
  const file = path.join(bookDir, 'novel', '_system', 'wizard_chapter_tones.json');
  assert.ok(fs.existsSync(file));
  const t1 = loadWizardChapterTone(bookDir, 1);
  assert.equal(t1.tone, '压抑惊悚');
  assert.equal(plannerLoadTone(bookDir, 1)?.coreEvent, t1.coreEvent);
  ok('wizard_chapter_tones.json persist + dual loaders');

  const intent = planChapter(
    {
      bookDir,
      chapter: 1,
      chapterTask: {},
      state: {},
      volume: { goals: ['测试'] },
      facts: [],
      pov: '林深',
      present: [],
    },
    1,
  );
  assert.equal(intent.mainGoal, tones[0].coreEvent);
  assert.equal(intent.tone, '压抑惊悚');
  assert.equal(intent.endingDirection, tones[0].endingDirection);
  assert.equal(intent.wordTarget, 2500);
  assert.ok(intent.chapterTone);
  ok('Planner planChapter applies chapterTone for Ch1');

  // 模拟生成完成：写正文 + pending_audit
  fs.writeFileSync(
    path.join(bookDir, 'chapters', '0001_雨夜.md'),
    '雨打在铁皮棚上。林深停在邻居门前，空气里有一股锈味。他听见里面有人笑。\n\n'.repeat(40),
    'utf8',
  );
  markPendingAudit(bookDir, 1, { deferredCommit: true });
  assert.equal(getChapterStatus(bookDir, 1), 'pending_audit');
  assert.throws(() => assertChapterUnlocked(bookDir, 1), /待审计/);
  assert.equal(getChapterStatus(bookDir, 2), 'locked');
  ok('Ch1 pending_audit blocks regenerate; Ch2 locked');

  const dev = checkToneDeviation(
    '因为所以意味着实际上也就是说因为所以意味着实际上也就是说因为所以意味着实际上也就是说。'.repeat(3),
    tones[0],
  );
  assert.equal(dev.deviation, true);
  assert.match(dev.reason || '', /压抑惊悚|旁白|解释/);
  ok('checkToneDeviation detects explanatory voice vs 压抑惊悚');

  const opt = optimizeChapter(bookDir, 1, 'enhance-ending');
  assert.ok(opt.text?.length >= opt.originalLength || opt.note);
  ok('optimize enhance-ending');

  const deleted = deleteChapterDraft(bookDir, 1);
  assert.equal(deleted.status, 'ready_to_generate');
  assert.equal(getChapterStatus(bookDir, 1), 'ready_to_generate');
  // 重新写入正文以便 accept
  fs.writeFileSync(
    path.join(bookDir, 'chapters', '0001_雨夜.md'),
    '雨打在铁皮棚上。林深停在邻居门前，空气里有一股锈味。他听见里面有人笑，门锁内侧有新鲜抓痕。\n\n'.repeat(50),
    'utf8',
  );
  markPendingAudit(bookDir, 1);
  ok('delete draft → ready_to_generate → re-mark pending');

  const accepted = acceptChapter(bookDir, 1, { title: '雨夜' });
  assert.equal(accepted.nextChapterUnlocked, true);
  assert.equal(accepted.nextChapter, 2);
  assert.equal(getChapterStatus(bookDir, 1), 'accepted');
  const audit = loadChapterAudit(bookDir);
  assert.ok(Number(audit.unlockedThrough) >= 2);
  assert.equal(getChapterStatus(bookDir, 2), 'ready_to_generate');
  assert.doesNotThrow(() => assertChapterUnlocked(bookDir, 2));
  ok('accept Ch1 → unlock Ch2');

  fs.rmSync(bookDir, { recursive: true, force: true });
}

console.log(`\nAll ${n} checks passed.`);
