#!/usr/bin/env node
/**
 * 冒烟：Anchor 读写路径一致 + commit→planNext 顺序 + 缺文件抛错
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

const { chapterAnchorPath, chapterAnchorFileName, loadPriorChapterAnchor, planNextChapter } = await import(
  pathToFileURL(path.join(root, 'packages/inkos-brain/src/planner/planner.js')).href
);
const { buildChapterAnchor, chapterAnchorPath: muPath } = await import(
  pathToFileURL(path.join(root, 'packages/inkos-runtime/src/memory/memory-unit.js')).href
);

{
  assert.equal(chapterAnchorFileName(1), 'ch_0001_anchor.yaml');
  assert.equal(chapterAnchorFileName(12), 'ch_0012_anchor.yaml');
  assert.throws(() => chapterAnchorFileName(0));
  const p = chapterAnchorPath('/book', 3);
  assert.equal(p, path.join('/book', 'states', 'ch_0003_anchor.yaml'));
  assert.equal(muPath('/book', 3), p);
  ok('unified filename ch_XXXX_anchor.yaml');
}

{
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'inkos-anchor-'));
  const bookDir = path.join(tmp, 'book');
  fs.mkdirSync(path.join(bookDir, 'states'), { recursive: true });

  assert.throws(
    () => loadPriorChapterAnchor(bookDir, 1, { required: true }),
    /Anchor not found/,
  );
  ok('missing anchor throws');

  const { writeYaml } = await import(
    pathToFileURL(path.join(root, 'packages/inkos-core/src/lib/yaml-store.js')).href
  );
  const anchorPath = chapterAnchorPath(bookDir, 1);
  const anchor = buildChapterAnchor(1, {
    intent: {
      pov: '林小雅',
      location: '地下泵站',
      time: 'Day 1',
      present: ['林小雅'],
      mainGoal: '活下去',
    },
    chapterText: '他推开门。倒计时开始。',
  });
  writeYaml(anchorPath, anchor);
  assert.ok(fs.existsSync(anchorPath));
  assert.ok(anchorPath.endsWith('ch_0001_anchor.yaml'));
  ok('writes states/ch_0001_anchor.yaml');

  const loaded = loadPriorChapterAnchor(bookDir, 1, { required: true });
  assert.equal(loaded.pov, '林小雅');
  assert.equal(loaded.location, '地下泵站');
  ok('planner reads same path as write');

  const next = planNextChapter(bookDir, 1, {
    chapterTask: { 目标: '追查规则' },
    state: {},
    facts: [],
    volume: { goals: ['活下去'] },
    present: ['林小雅'],
  });
  assert.equal(next.chapter, 2);
  assert.equal(next.priorAnchor.pov, '林小雅');
  assert.equal(next.intent.anchorConstraintsApplied, true);
  ok('planNextChapter applies prior anchor');

  // MemoryUnit.commit 路径：与 planner 同源
  const muAnchor = muPath(bookDir, 2);
  assert.equal(muAnchor, chapterAnchorPath(bookDir, 2));
  ok('MemoryUnit.chapterAnchorPath === planner path');
}

{
  // 疯神纪元：现有 anchor 可被同一路径读到
  const book = path.join(root, 'books/我的小说/books/疯神纪元');
  if (fs.existsSync(path.join(book, 'states', 'ch_0003_anchor.yaml'))) {
    const a = loadPriorChapterAnchor(book, 3, { required: true });
    assert.ok(a.pov || a.chapter === 3);
    assert.equal(chapterAnchorPath(book, 3), path.join(book, 'states', 'ch_0003_anchor.yaml'));
    ok('疯神纪元 ch_0003_anchor.yaml readable');
  } else {
    ok('skip 疯神纪元 (no local book)');
  }
}

{
  const pipe = fs.readFileSync(
    path.join(root, 'packages/inkos-runtime/src/pipeline/chapter-pipeline.js'),
    'utf8',
  );
  // commit 必须出现在 planNextChapter 之前
  const iCommit = pipe.indexOf('MemoryUnit.commit');
  const iPlan = pipe.indexOf('planNextChapter(bookDir, chapter');
  assert.ok(iCommit > 0 && iPlan > 0 && iCommit < iPlan, 'commit before planNextChapter');
  ok('chapter-pipeline: commit → planNext order');
}

{
  const orch = fs.readFileSync(
    path.join(root, 'packages/inkos-runtime/src/pipeline/orchestrator.js'),
    'utf8',
  );
  assert.match(orch, /loadPriorChapterAnchor/);
  assert.match(orch, /priorAnchor/);
  ok('orchestrator loads prior anchor before planChapter');
}

console.log(`\n${n} checks passed.`);
