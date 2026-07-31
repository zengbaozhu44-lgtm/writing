/**
 * MemoryUnit.commit — 原子三写 + Empty Artifact Guard + rollback / crash recover
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  MemoryUnit,
  rollbackToChapter,
  recoverFailedChapter,
  EmptyArtifactError,
  readChapterState,
  loadLivingPrepareInput,
} from '../packages/inkos-runtime/src/memory/memory-unit.js';

const bookDir = fs.mkdtempSync(path.join(os.tmpdir(), 'inkos-mem-'));
fs.mkdirSync(path.join(bookDir, 'novel', '_system', 'brain'), { recursive: true });
fs.writeFileSync(
  path.join(bookDir, 'book.json'),
  JSON.stringify({ id: 'mem-test', title: 'MemTest', schemaVersion: 4, brainEnabled: true }),
);
fs.writeFileSync(
  path.join(bookDir, 'novel', '_system', 'manifest.json'),
  JSON.stringify({ schemaVersion: 4, lastAppliedChapter: 0, brain: { enabled: true } }),
);

fs.mkdirSync(path.join(bookDir, 'novel'), { recursive: true });
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
for (const [name, content] of Object.entries(novelFiles)) {
  fs.writeFileSync(path.join(bookDir, 'novel', name), content);
}

// Empty Artifact Guard: 空正文必须拒绝
let emptyBlocked = false;
try {
  MemoryUnit.commit(bookDir, 1, { chapterText: '', chapterTitle: '空', skipGitCli: true });
} catch (err) {
  emptyBlocked = err instanceof EmptyArtifactError || err?.code === 'EMPTY_ARTIFACT';
}
if (!emptyBlocked) {
  console.error('FAIL empty artifact should throw EmptyArtifactError');
  process.exit(1);
}

// 字数过低（无 force）必须拒绝
let shortBlocked = false;
try {
  MemoryUnit.commit(bookDir, 1, {
    chapterText: '短文。',
    chapterTitle: '短',
    skipGitCli: true,
  });
} catch (err) {
  shortBlocked = err instanceof EmptyArtifactError || err?.code === 'EMPTY_ARTIFACT';
}
if (!shortBlocked) {
  console.error('FAIL short artifact should throw EmptyArtifactError');
  process.exit(1);
}

const commit1 = MemoryUnit.commit(bookDir, 1, {
  chapterText: '门开了。冷风扑面。他按下权限。',
  chapterTitle: '第一章测试',
  intent: { pov: '林夜', mainGoal: '进入机房' },
  metrics: { wordCount: 20 },
  scenes: [{ goal: '进入' }],
  force: true,
  skipGitCli: true,
});

if (!commit1.ok || !fs.existsSync(commit1.chapterFile) || !fs.existsSync(commit1.stateFile)) {
  console.error('FAIL commit1', commit1);
  process.exit(1);
}

const attach = MemoryUnit.commitLivingPrepare(bookDir, 1, {
  worldProposal: { ai_control: 80, _proposal: true },
  characterProposals: [],
});
if (!attach.ok || !loadLivingPrepareInput(bookDir, 1)?.worldProposal) {
  console.error('FAIL living prepare', attach);
  process.exit(1);
}

const commit2 = MemoryUnit.commit(bookDir, 2, {
  chapterText: '第二场。名单变红。',
  chapterTitle: '第二章',
  intent: { pov: '林夜', mainGoal: '读名单' },
  force: true,
  skipGitCli: true,
});

if (!fs.existsSync(commit2.chapterFile)) {
  console.error('FAIL commit2 file');
  process.exit(1);
}

// 模拟半章草稿后崩溃自愈
fs.mkdirSync(path.join(bookDir, 'chapters'), { recursive: true });
fs.writeFileSync(path.join(bookDir, 'chapters', '0003_draft.md'), '# 残缺\n\n半吊子');
fs.mkdirSync(path.join(bookDir, 'novel', '_system', 'brain'), { recursive: true });
fs.writeFileSync(
  path.join(bookDir, 'novel', '_system', 'brain', 'ch_0003_scenes.json'),
  JSON.stringify({ scenes: [{ id: 's1', text: 'partial' }] }),
);

const recovered = recoverFailedChapter(bookDir, 3, { reason: 'test-crash' });
if (!recovered.ok || recovered.rolledBackTo !== 2) {
  console.error('FAIL recoverFailedChapter', recovered);
  process.exit(1);
}
if (!recovered.draft?.purged?.length) {
  console.error('FAIL draft not purged', recovered.draft);
  process.exit(1);
}
if (fs.existsSync(path.join(bookDir, 'chapters', '0003_draft.md'))) {
  console.error('FAIL ch3 draft still exists');
  process.exit(1);
}

const rb = rollbackToChapter(bookDir, 1);
const st2 = readChapterState(bookDir, 2);
if (st2) {
  console.error('FAIL ch2 state should be purged after rollback', st2);
  process.exit(1);
}
const ch2files = fs.readdirSync(path.join(bookDir, 'chapters')).filter((f) => f.startsWith('0002_'));
if (ch2files.length) {
  console.error('FAIL ch2 md purged', ch2files);
  process.exit(1);
}

console.log('OK memory-unit', {
  emptyGuard: true,
  shortGuard: true,
  snap1: commit1.snapshot?.id?.slice(0, 12),
  recover: recovered.rolledBackTo,
  rollback: rb.mode,
  purged: rb.purged,
});

fs.rmSync(bookDir, { recursive: true, force: true });
