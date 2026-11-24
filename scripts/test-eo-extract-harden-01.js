#!/usr/bin/env node
/**
 * EO-EXTRACT-HARDEN-01 — 测试 R1 / R3 + 假阳性防护
 *
 * R1（grounding 修复，不放宽门槛）：
 *   P1 actor 前缀改写（他→林逸）动作 grounded
 *   P2 无标点中文动作尾部逐字在文本 → grounded
 *   P3 假阳性防护：相似但未出现的动作仍被拒（打开门 vs 打开了窗 / 未发生的杀害）
 *   P4 excerpt 逐字门不变（坏 excerpt 仍拒）
 * R3（presence 兜底）：
 *   P5 candidateCount>0 + validCount=0 → presence 进入且过完整 validator
 *   P6 candidateCount>0 + validCount>0 → 不额外产生 presence
 *   P7 presence consequence 公式不变
 *   P8 ch10_s4 法医文本回放：确定性提取器现在产出 ≥1 有效事件
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateStoryEvent } from '../packages/inkos-brain/src/events/event-validator.js';
import { createStoryEvent } from '../packages/inkos-brain/src/events/story-event.schema.js';
import { extractStoryEventsFromScene } from '../packages/inkos-brain/src/events/event-extractor.js';

let pass = 0;
let fail = 0;
function ok(cond, label) {
  if (cond) { pass += 1; console.log(`  ok - ${label}`); }
  else { fail += 1; console.error(`  FAIL - ${label}`); }
}

const TEXT = '他左手摸到录音带，拇指抵住磁带壳的边角。林逸盯着清空回收站那个图标看了很久。最后林逸伸手，按下了那个键。';

function mk(action, excerpt, kind = 'action') {
  return createStoryEvent({
    id: 'evt_t1', sceneId: 't1', kind,
    actors: ['林逸'], action,
    consequence: '场面叙述成为后续可引用事实',
    stateChanges: [`action:林逸:${action.slice(0, 6)}`],
    affectedEntities: ['林逸'],
    evidence: { excerpt },
    source: 'annotated',
  });
}

console.log('# EO-EXTRACT-HARDEN-01');

console.log('## R1 — grounding 假阴性修复');
{
  const v1 = validateStoryEvent(mk('林逸摸到录音带', '他左手摸到录音带，拇指抵住磁带壳的边角'), { text: TEXT });
  ok(v1.ok, `P1 actor 前缀改写动作 grounded（${JSON.stringify(v1.errors)}）`);
  const v2 = validateStoryEvent(mk('林逸按下了那个键', '林逸伸手，按下了那个键'), { text: TEXT });
  ok(v2.ok, `P2 无标点尾部逐字在文本 → grounded（${JSON.stringify(v2.errors)}）`);
}
console.log('## R1 — 假阳性防护（门槛未放宽）');
{
  const absent = validateStoryEvent(mk('林逸砸碎了录音带', '他左手摸到录音带，拇指抵住磁带壳的边角'), { text: TEXT });
  ok(!absent.ok && absent.errors.includes('action_not_grounded') || !absent.ok,
    `P3a 未发生的动作（砸碎）仍拒（${JSON.stringify(absent.errors)}）`);
  ok(!(absent.ok), 'P3a 严格断言：absent 不得通过');
  const near = validateStoryEvent(mk('林逸打开了窗户', '林逸伸手，按下了那个键'), { text: TEXT });
  ok(!near.ok, `P3b 相似但未出现的动作（打开了窗户 vs 按下了那个键）仍拒（${JSON.stringify(near.errors)}）`);
  const badExcerpt = validateStoryEvent(mk('林逸摸到录音带', '这句摘录根本不在正文里出现哦'), { text: TEXT });
  ok(!badExcerpt.ok && badExcerpt.errors.includes('evidence_not_in_text'),
    `P4 excerpt 逐字门不变（${JSON.stringify(badExcerpt.errors)}）`);
}

console.log('## R3 — presence 兜底抑制修正');
{
  // 构造：一个必然被拒的候选（action 无文本依据）+ 文本有 tail
  const scene = { id: 'r3a', index: 1, pov: '林逸', characters: ['林逸'], text: TEXT };
  const r = extractStoryEventsFromScene(scene, { knownNames: ['林逸'] });
  ok(r.events.length >= 1, `P5a 零有效候选时产出 ≥1 事件（实得 ${r.events.length}）`);
  const pres = r.events.find((e) => e.kind === 'presence');
  ok(!!pres, 'P5b presence 兜底触发（candidateCount>0 + validCount=0 场景）');
  ok(pres?.consequence === '场面叙述成为后续可引用事实', 'P7 presence consequence 公式不变');

  // candidateCount>0 + validCount>0 → 无 presence
  const good = '林逸推开档案室的门，灰尘落下来。他说：「就是这里。」';
  const r2 = extractStoryEventsFromScene({ id: 'r3b', index: 1, pov: '林逸', characters: ['林逸'], text: good }, { knownNames: ['林逸'] });
  ok(r2.events.length >= 1, `P6a 正常文本仍有事件（${r2.events.length}）`);
  ok(!r2.events.some((e) => e.kind === 'presence'), 'P6b 有有效候选时不产生 presence');
}

console.log('## P8 — ch10_s4 法医文本回放');
{
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const f = path.join(root, 'tmp-stress', 'ch10_s4-forensic.json');
  let forensic = null;
  const candidates = [
    '/var/folders/5d/l_7hygg15k14cstgpvz0lrwh0000gn/T/inkos-stress-Dj6Y28',
  ];
  for (const c of candidates) {
    const p = path.join(c, 'novel', '_system', 'brain', 'extraction_failures', 'ch10_s4.json');
    if (fs.existsSync(p)) { forensic = JSON.parse(fs.readFileSync(p, 'utf8')); break; }
  }
  if (!forensic) {
    // 法医样本已随临时目录消失 → 用保存副本（若研究时已导出）；否则跳过并声明
    if (fs.existsSync(f)) forensic = JSON.parse(fs.readFileSync(f, 'utf8'));
  }
  if (!forensic) {
    console.log('  skip - 法医样本不可得（insufficient evidence，非失败）');
  } else {
    const r = extractStoryEventsFromScene(
      { id: 'ch10_s4', index: 4, pov: '林逸', characters: ['林逸'], text: forensic.text },
      { knownNames: ['林逸', '苏眠', '镜渊', '老周'] },
    );
    ok(r.events.length >= 1, `ch10_s4 确定性提取 ≥1 有效事件（实得 ${r.events.length}）——原为 0`);
  }
}

console.log(`\n# 结果: ${pass} pass / ${fail} fail`);
process.exit(fail ? 1 : 0);
