import fs from 'node:fs';
import path from 'node:path';
import { readJson, writeJson, writeText } from '../lib/paths.js';
import { getBookPaths } from '../lib/book.js';
import {
  appendFacts,
  appendTimeline,
  patchHooks,
  patchNpcSim,
  patchResources,
  readYaml,
} from '../lib/yaml-store.js';

/**
 * applyPostChapter — physical / operational carrier write.
 *
 * EO-P3 (W-10): This function never sets Authority Subject = caller / Operator.
 * Persistence here ≠ Reality Status / obtains / Authority Act (EO-P1 Dual BLOCK A).
 * When invoked from `inkos post`, the CLI stamps Executor=Operator; Subject remains Author.
 * EO-TR-01: callers with Operator/raw delta MUST partition 11/13 before this function.
 * This helper itself is unchanged for MemoryUnit.commit (EO-P2 already emptied plan facts/events).
 *
 * @see golden/reality/d1-implementation-contract/OPERATOR-PROXY.md
 */

const CURRENT_CHAPTER_TEMPLATE = `# 09 Current Chapter

> 只保存本章任务。禁止其他信息。上限 300 字。

- **POV**：
- **目标**：
- **第一阻碍**：
- **第二阻碍**：
- **博弈**：
- **高潮**：
- **代价**：
- **新增伏笔**：
- **结尾**：
`;

export function applyPostChapter(bookDir, chapter, delta) {
  const bp = getBookPaths(bookDir);
  if (bp.version !== 4) throw new Error(`仅支持 V4，当前: ${bp.version}`);
  const m = bp.modules;
  const results = [];

  if (delta.timeline) {
    appendTimeline(m.timeline, { ...delta.timeline, chapter });
    results.push('11_timeline');
  }
  if (delta.facts?.length) {
    appendFacts(m.facts_db, delta.facts, chapter);
    results.push('13_facts_db');
  }
  if (delta.state_board) {
    writeText(m.state_board, typeof delta.state_board === 'string' ? delta.state_board : delta.state_board.content);
    results.push('07_state_board');
  }
  if (delta.foreshadow) {
    patchHooks(m.foreshadow_db, delta.foreshadow);
    results.push('12_foreshadow_db');
  }
  if (delta.resources) {
    patchResources(m.resource_db, { ...delta.resources, meta: { last_updated_chapter: chapter } });
    results.push('14_resource_db');
  }
  if (delta.current_state) {
    const body = typeof delta.current_state === 'string' ? delta.current_state : delta.current_state.content;
    writeText(m.current_state, body.startsWith('#') ? body : `# 08 Current State · 第 ${chapter} 章后\n\n${body}`);
    results.push('08_current_state');
  }
  if (delta.npc?.length) {
    patchNpcSim(m.npc_simulation, delta.npc);
    results.push('15_npc_simulation');
  }
  if (delta.reset_current_chapter !== false) {
    writeText(m.current_chapter, CURRENT_CHAPTER_TEMPLATE);
    results.push('09_current_chapter_reset');
  }

  snapshot(bookDir, m.snapshots, chapter);
  results.push(`snapshot:ch_${String(chapter).padStart(4, '0')}`);

  const manifest = readJson(bp.manifest);
  manifest.lastAppliedChapter = chapter;
  manifest.updatedAt = new Date().toISOString();
  if (delta.timeline?.day != null) manifest.currentDay = delta.timeline.day;
  writeJson(bp.manifest, manifest);
  results.push('manifest');

  return { chapter, updated: results };
}

function snapshot(bookDir, snapRoot, chapter) {
  const snapDir = path.join(snapRoot, `ch_${String(chapter).padStart(4, '0')}`);
  fs.mkdirSync(snapDir, { recursive: true });
  const files = [
    '08_current_state.md', '07_state_board.md', '11_timeline.yaml', '12_foreshadow_db.yaml',
    '13_facts_db.yaml',
    '14_resource_db.yaml', '15_npc_simulation.yaml',
  ];
  for (const name of files) {
    const src = path.join(bookDir, 'novel', name);
    if (fs.existsSync(src)) fs.copyFileSync(src, path.join(snapDir, name));
  }
}

export function generateDeltaTemplate(chapter) {
  return {
    chapter,
    timeline: { day: 1, time: '00:00', events: ['事件描述'], characters_present: [] },
    facts: ['不可逆事实陈述'],
    state_board: '# 07 State Board\n\n## 势力\n- **正在执行**：\n',
    foreshadow: { add: [{ id: `H${String(chapter).padStart(3, '0')}`, title: '', first_seen: `ch_${String(chapter).padStart(4, '0')}`, status: 'open', done: false }], update: [] },
    resources: { by_character: { 主角: { cash: 0 } } },
    current_state: '| 字段 | 值 |\n|------|-----|\n| 时间 | Day 1 |\n| 地点 | |\n',
    npc: [{ name: '', day: 1, today_goal: '', plan_location: '', may_meet: [], plan_changed: false, world_impact: '' }],
    review: { goal_progress: 85, conflict: 80, character_growth: 75, info_release: 70, foreshadow: 80, pacing: 85, readability: 90, world_progress: 75, emotion_curve: 80, notes: '' },
  };
}

export function writeDeltaTemplate(bookDir, chapter) {
  const out = path.join(bookDir, 'novel', '_system', `delta_ch_${String(chapter).padStart(4, '0')}.json`);
  writeJson(out, generateDeltaTemplate(chapter));
  return out;
}

export function loadDelta(deltaPath) {
  if (deltaPath.endsWith('.json')) return readJson(deltaPath);
  return readYaml(deltaPath);
}
