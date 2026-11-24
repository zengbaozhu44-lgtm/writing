#!/usr/bin/env node
/**
 * EO-P4-World-Consequence-Consumption-01 — 主链测试
 *
 * World Consequence Truth → Actual readback (Scene N+1) + State Evolution
 *
 * Consume-only：读已 mint 的 Truth；absent → 零变化；Plan 永远不能注入。
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  collectPreviousActualEvents,
  formatActualEventsBlock,
} from '../packages/inkos-brain/src/events/actual-events-prompt.js';
import {
  evolveFromChapter,
  collectWorldConsequencesFromScenes,
} from '../packages/inkos-brain/src/memory/state-evolution-engine.js';
import {
  attachWorldConsequenceTruth,
  attachCharacterActionTruth,
} from '../packages/inkos-brain/src/causality/index.js';

let pass = 0;
let fail = 0;
function ok(cond, label) {
  if (cond) { pass += 1; console.log(`  ok - ${label}`); }
  else { fail += 1; console.error(`  FAIL - ${label}`); }
}

const SCENE_TEXT = '林夜推开厚重的铁门，冷风灌入走廊。片刻后，警报响彻整层楼，展厅的射灯全部熄灭，备用门自动上锁。';

function makeScene1() {
  return {
    id: 's1',
    index: 1,
    text: SCENE_TEXT,
    actionIntentTruth: {
      version: 'action-intent-truth-1',
      status: 'asserted',
      characterId: '林夜',
      actionContent: '推开厚重的铁门',
      evidenceRef: 'cade:ch1:s1',
      isChoice: false,
    },
  };
}

const { ensureActualEvents } = await import('../packages/inkos-brain/src/events/event-extractor.js');

function builtScene1() {
  const scene = makeScene1();
  ensureActualEvents(scene, { stripPlan: true });
  // Phase 1.3 前置：确定性提取器只产 canned 回声标签（WCT 正确 fail-closed）。
  // 为消费路径测试，按同一 StoryEvent schema 给被引用 occurrence 附加
  // 文本内 grounded 的 aftermath 注记（LLM-assisted extractor 的合法产物形态）。
  const occ = (scene.actualEvents || []).find((e) => e.kind === 'action' && e.actors?.includes('林夜'));
  if (occ) occ.consequence = '警报响彻整层楼，展厅的射灯全部熄灭';
  attachCharacterActionTruth(scene);
  attachWorldConsequenceTruth(scene);
  return scene;
}

console.log('# EO-P4-World-Consequence-Consumption-01');

console.log('## 1. 端到端：文本 → Action → WCT asserted（前置确认）');
let s1;
{
  s1 = builtScene1();
  ok(s1.characterActionTruth?.status === 'asserted', 'Character Action asserted');
  ok(s1.worldConsequenceTruth?.status === 'asserted', 'World Consequence asserted');
}

console.log('## 2. Actual 读回（Scene N+1 prompt）');
{
  const bundle = collectPreviousActualEvents([s1]);
  ok(Array.isArray(bundle.worldConsequences) && bundle.worldConsequences.length === 1,
    'bundle.worldConsequences 收集到 1 条');
  const wc = bundle.worldConsequences[0];
  ok(wc.characterId === '林夜' && wc.actionContent.includes('推开'), 'X/Y 读回');
  ok(wc.worldChangeContent.length > 0 && wc.provenance === 'character_action_world_consequence',
    'W + provenance 读回');
  ok(bundle.writesCanon === false && bundle.writesSR === false && bundle.writesReality === false,
    'readback 仍不写 Canon/SR/Reality');

  const block = formatActualEventsBlock(bundle);
  ok(block.includes('### Proven World Consequences'), 'block 含 Proven World Consequences 段');
  ok(block.includes('world_consequence_truth_readback'), 'role 标注 consume-only');
  ok(block.includes('已发生的世界变化'), 'W 以世界事实形式呈现');
  ok(block.includes('推开'), '动作 Y 出现在读回');
  ok(block.includes('≠ Choice') && !block.includes('做出了选择'), '只声明 ≠ Choice 免责，无正向 Choice 声明');
}

console.log('## 3. fail-closed：无 WCT / absent WCT → 读回零变化');
{
  const plain = { id: 's0', index: 1, text: '陈默坐下。屋里很安静。' };
  ensureActualEvents(plain, { stripPlan: true });
  const b0 = collectPreviousActualEvents([plain]);
  ok(b0.worldConsequences.length === 0, '无 WCT → worldConsequences 空');
  ok(!formatActualEventsBlock(b0).includes('Proven World Consequences'), '无 WCT → 无 Proven 段');
  const absentScene = { ...plain, worldConsequenceTruth: { status: 'absent', reason: 'no_world_change_evidence' } };
  const b1 = collectPreviousActualEvents([absentScene]);
  ok(b1.worldConsequences.length === 0, 'absent WCT → 忽略');
}

console.log('## 4. State Evolution 消费');
{
  const diff = evolveFromChapter({
    bookDir: fs.mkdtempSync(path.join(os.tmpdir(), 'inkos-wct-c-')),
    chapter: 1,
    scenes: [s1],
    intent: {},
  });
  ok(diff.evolution.worldHints.some((h) => h.startsWith('wct:')), 'worldHints 含 wct: 前缀条目');
  ok(diff.evolution.worldConsequences?.length === 1, 'evolution.worldConsequences 记录 1 条');
  ok(diff.provenance.consumesWorldConsequenceTruth === true, 'provenance.consumesWorldConsequenceTruth = true');
  ok(diff.provenance.writesCanonTimeline !== undefined, 'canon timeline 路径未被移除');
  // canonDelta.timeline.events 仍是 Actual-only（不混入 wct: 条目）
  ok(!(diff.canonDelta.timeline.events || []).some((e) => e.includes('wct:')),
    'canonDelta.timeline 不混入 WCT（Actual-only 保持）');
}

console.log('## 5. fail-closed：无 WCT → State 输出与旧语义一致');
{
  const plain = { id: 's0', index: 1, text: '陈默坐下。屋里很安静。' };
  ensureActualEvents(plain, { stripPlan: true });
  const diff = evolveFromChapter({
    bookDir: fs.mkdtempSync(path.join(os.tmpdir(), 'inkos-wct-c-')),
    chapter: 1,
    scenes: [plain],
    intent: {},
  });
  ok(diff.evolution.worldHints.every((h) => !h.startsWith('wct:')), '无 WCT → 无 wct: hint');
  ok(diff.provenance.consumesWorldConsequenceTruth === false, 'consumesWorldConsequenceTruth = false');
  ok(diff.evolution.worldConsequences?.length === 0, 'worldConsequences 空');
}

console.log('## 6. Plan 不能注入（STORY CONTROL ≠ STORY TRUTH）');
{
  const planScene = {
    id: 's2',
    index: 2,
    text: '苏晚转身离开。',
    consequence: '主角会赢得战争',          // Plan/Director 字段（STORY CONTROL）
    goal: '迫使对方离开',
    worldConsequenceTruth: undefined,
  };
  ensureActualEvents(planScene, { stripPlan: true });
  const b = collectPreviousActualEvents([planScene]);
  ok(b.worldConsequences.length === 0, 'scene.consequence 不进 worldConsequences');
  ok(!formatActualEventsBlock(b).includes('主角会赢得战争'), 'Plan consequence 不出现在读回 Proven 段');
  const collected = collectWorldConsequencesFromScenes([planScene]);
  ok(collected.count === 0, 'collectWorldConsequencesFromScenes 拒绝 Plan 字段');
  const diff = evolveFromChapter({
    bookDir: fs.mkdtempSync(path.join(os.tmpdir(), 'inkos-wct-c-')),
    chapter: 1,
    scenes: [planScene],
    intent: {},
  });
  ok(!diff.evolution.worldHints.some((h) => h.includes('赢得战争')), 'State worldHints 不含 Plan consequence');
}

console.log('## 7. 去重与多场景');
{
  const s1b = { ...s1 };
  const c = collectWorldConsequencesFromScenes([s1, s1b]);
  ok(c.count === 1, '同 occurrenceRef+W 去重');
}

console.log('## 8. 文学路径：下一场必须承接 W（读回块作为 continuity fuel）');
{
  const bundle = collectPreviousActualEvents([s1]);
  const block = formatActualEventsBlock(bundle);
  ok(block.includes('Continuity: 下一场必须把 W 当作已发生的世界事实承接'),
    '读回块声明 continuity 义务');
  ok(block.includes('警报响彻') || block.includes('射灯'), 'W 具体内容进入 Writer 上下文');
}

console.log(`\n# EO-P4-World-Consequence-Consumption-01: ${pass} pass, ${fail} fail`);
process.exit(fail ? 1 : 0);
