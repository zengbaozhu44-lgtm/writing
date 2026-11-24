#!/usr/bin/env node
/**
 * EO-P4-Intent-Realization-Correspondence-V2-01 — deterministic test matrix
 *
 * 原则：宁可 absent，不把 preparation/partial/failed/co-occurrence/third-party
 * 伪装成 Character Action Truth。isChoice 恒 false。
 * 语料来源标注：stress=8场生产stress corpus；B2=A/B实验真实提取occurrence（已固化为fixture）；
 * synthetic=构造样本（明确标注）。
 */
import assert from 'node:assert/strict';
import {
  evaluateRealization,
  deriveCharacterActionTruth,
} from '../packages/inkos-brain/src/causality/character-action-truth.js';
import { deriveActionIntentTruth } from '../packages/inkos-brain/src/causality/action-intent-truth.js';
import { createCADE } from '../packages/inkos-brain/src/causality/cade.js';

let pass = 0;
let fail = 0;
function ok(cond, label) {
  if (cond) { pass += 1; console.log(`  ok - ${label}`); }
  else { fail += 1; console.error(`  FAIL - ${label}`); }
}

function intent(Y, anchors, X = '林逸') {
  const cade = createCADE({
    characterId: X, actionContent: Y, decisionKind: 'commits',
    sourceRef: 'authored.character_decision', sceneId: 's1', chapter: 1,
    ...(anchors ? { anchors } : {}),
  });
  assert.equal(cade.ok, true, `CADE 构造失败: ${cade.reason}`);
  return deriveActionIntentTruth(cade.cade);
}

function occ(id, actors, action, consequence, excerpt, extra = {}) {
  return {
    id, sceneId: 's1', kind: 'action', actors, action,
    consequence, stateChanges: extra.stateChanges || [],
    affectedEntities: actors, evidence: { excerpt }, source: 'annotated',
  };
}

const ARCHIVE_TEXT = [
  '巡逻脚步声逼近。林逸肘尖砸向K27柜门的玻璃面板，钢化玻璃裂成蛛网状。',
  '他手探进去，指尖触到卷宗硬壳的棱角，抽出来时指节被碎玻璃划开一道口子。',
  '林逸蹲下身把卷宗塞进外套内袋，玻璃碴在膝盖下碾出细碎的响。警铃终于响了。',
].join('\n');

console.log('# EO-P4-Correspondence-V2-01');

console.log('## 0. anchors 校验与透传（authored → CADE → Intent）');
{
  const SRC = 'authored.character_decision';
  const bad1 = createCADE({ characterId: '林逸', actionContent: 'x', sourceRef: SRC, anchors: { object: ['地图'], action: ['烧'] } });
  ok(bad1.ok === false && bad1.reason === 'anchors_invalid', '缺 terminal 组 → 整项拒绝');
  const bad2 = createCADE({ characterId: '林逸', actionContent: 'x', sourceRef: SRC, anchors: { object: ['地图'], action: ['烧'], terminal: [''] } });
  ok(bad2.ok === false && bad2.reason === 'anchors_invalid', '空串锚 → 拒绝');
  const bad3 = createCADE({ characterId: '林逸', actionContent: 'x', sourceRef: SRC, anchors: { object: ['地图'], action: ['烧'], terminal: ['烧毁'], options: ['a'] } });
  ok(bad3.ok === false, 'Choice-shaped 污染 → 拒绝');
  const good = createCADE({ characterId: '林逸', actionContent: '烧掉地图', sourceRef: SRC, anchors: { object: ['地图'], action: ['烧'], terminal: ['烧毁'] } });
  ok(good.ok === true && good.cade.anchors.terminal[0] === '烧毁' && good.cade.isChoice === false, '合法 anchors 透传且 isChoice=false');
  const it = intent('烧掉地图', { object: ['地图'], action: ['烧'], terminal: ['烧毁'] });
  ok(it.status === 'asserted' && it.anchors?.object[0] === '地图', 'Intent Truth 透传 anchors');
  // 生产接线：anchors 存在 → Intent prompt 块自动带锚定 guidance；无 anchors 不变
  const { formatActionIntentTruthForPrompt } = await import('../packages/inkos-brain/src/causality/action-intent-truth.js');
  const withA = formatActionIntentTruthForPrompt(it);
  ok(withA.includes('锚定') && withA.includes('不得替换行动方式本身'), 'anchors → 锚定 realization guidance 自动启用');
  const noA = formatActionIntentTruthForPrompt(intent('推开厚重的铁门'));
  ok(!noA.includes('guidance') && !noA.includes('锚定'), '无 anchors → 块与存量完全一致');
}

console.log('## P1 — v1 回退不变性（无 anchors 存量行为逐字段不变）');
{
  const it = intent('推开厚重的铁门'); // 无 anchors
  const occs = [occ('o1', ['林夜'], '林夜推开厚重的铁门', '场面动作已发生：推开', '林夜推开厚重的铁门')];
  const r = deriveCharacterActionTruth({ intentTruth: { ...it, characterId: '林夜' }, occurrences: occs, sceneText: '林夜推开厚重的铁门。' });
  ok(r.status === 'asserted', 'v1 路径照常命中');
  ok(!('occurrenceRefs' in r) && !('terminalOccurrenceRef' in r) && r.occurrenceRef === 'o1', 'v1 record 无新字段（byte-compat）');
  const r2 = deriveCharacterActionTruth({ intentTruth: { ...it, characterId: '林夜' }, occurrences: [occ('o9', ['苏晚'], '苏眠转身', '', '苏眠转身')], sceneText: '苏眠转身。' });
  ok(r2.status === 'absent' && r2.reason === 'character_mismatch', 'v1 失配行为不变');
}

console.log('## P2/P3 — R1 同义 + R2 插入（B2 真实提取 occurrence 固化）');
{
  const it = intent('砸碎档案柜玻璃取出档案', { object: ['卷宗'], action: ['砸', '玻璃'], terminal: ['抽出'] });
  const occs = [ // B2 archive/B21 真实提取（砸向K27柜门的玻璃 → 裂成蛛网状；手探进去…抽出来）
    occ('o1', ['林逸'], '肘尖砸向K27柜门的玻璃面板', '钢化玻璃裂成蛛网状', '肘尖砸向K27柜门的玻璃面板钢化玻璃裂成蛛网状'),
    occ('o2', ['林逸'], '手探进去指尖触到卷宗硬壳的棱角抽出来', '指节被碎玻璃划开一道口子', '手探进去指尖触到卷宗硬壳的棱角抽出来时指节被碎玻璃划开一道口子'),
    occ('o3', ['林逸'], '蹲下身把卷宗塞进外套内袋', '警铃终于响了', '林逸蹲下身把卷宗塞进外套内袋玻璃碴在膝盖下碾出细碎的响'),
  ];
  const r = evaluateRealization(it, occs, ARCHIVE_TEXT);
  ok(r.ok === true && r.reason === 'anchor_chain_direct', 'R1+R2+R3 复合 → direct asserted');
  ok(r.terminalOccurrenceRef === 'o2', 'terminal = 终局证据所在 occurrence（抽出+卷宗）');
  const rec = deriveCharacterActionTruth({ intentTruth: it, occurrences: occs, sceneText: ARCHIVE_TEXT });
  ok(rec.status === 'asserted' && rec.occurrenceRef === rec.terminalOccurrenceRef
    && Array.isArray(rec.occurrenceRefs) && rec.occurrenceRefs.length === 3
    && rec.isChoice === false, 'record 三字段 + 别名 = terminal + isChoice=false');
}

console.log('## P4 — R3 分解（B2 map 真实链）：无终局=absent，有终局=asserted');
{
  const base = [ // B2 map/B21 真实提取
    occ('o1', ['苏眠'], '苏眠把真图举起来', '', '苏眠把真图举起来对着头顶那盏昏黄的灯'),
    occ('o2', ['苏眠'], '她摸出打火机', '金属壳磕在拇指上一声脆响', '她摸出打火机金属壳磕在拇指上一声脆响'),
    occ('o3', ['苏眠'], '打火机的火焰跳出来舔上纸角', '火舌爬得很慢先是一道焦褐的边', '打火机的火焰跳出来舔上纸角火舌爬得很慢先是一道焦褐的边'),
  ];
  const TEXT = '苏眠把真图举起来对着灯。她摸出打火机。打火机的火焰跳出来舔上纸角。' + (process.env.Z || '');
  const it = intent('当着镜渊的面烧掉真地图', { object: ['图'], action: ['烧', '火焰'], terminal: ['烧毁'] }, '苏眠');
  const partial = evaluateRealization(it, base, TEXT);
  ok(partial.ok === false && partial.reason === 'terminal_evidence_missing', 'partial（焦褐的边≠烧毁）→ absent(terminal_evidence_missing)');
  const done = [...base, occ('o4', ['苏眠'], '松手让图纸落进铁盆', '整张图烧成灰烬卷起的边角一碰就散', '松手让图纸落进铁盆整张图烧成灰烬卷起的边角一碰就散')];
  const r = evaluateRealization({ ...it, anchors: { object: ['图'], action: ['烧', '火焰'], terminal: ['烧成灰烬'] } }, done, TEXT + '松手让图纸落进铁盆，整张图烧成灰烬，卷起的边角一碰就散。');
  ok(r.ok === true && r.terminalOccurrenceRef === 'o4', '补终局（烧成灰烬，synthetic 终局句）→ asserted，terminal=o4');
}

console.log('## P5 — R7 indirect（stress ch1_s3 真实文本固化）');
{
  const it = intent('把地图交给镜渊', { object: ['地图'], action: ['松手'], terminal: ['落进', '掌心'] });
  const occs = [
    occ('o1', ['林逸'], '林逸捏着地图的一角', '', '他捏着地图的一角，悬在两人之间'),
    occ('o2', ['林逸'], '林逸松手', '地图落进镜渊摊开的掌心', '林逸松手。地图落进镜渊摊开的掌心'),
    occ('o3', ['镜渊'], '镜渊把地图折好收进大衣内侧', '', '镜渊把地图折好，收进大衣内侧'),
  ];
  const TEXT = '他捏着地图的一角，悬在两人之间。林逸松手。地图落进镜渊摊开的掌心。镜渊把地图折好，收进大衣内侧。';
  const r = evaluateRealization(it, occs, TEXT);
  ok(r.ok === true && r.reason === 'anchor_chain_direct' && r.terminalOccurrenceRef === 'o2', 'indirect（易主即终局）→ direct asserted');
}

console.log('## P6 — Mediated / Direct（stress ch1_s2 真实形态）');
{
  const it = intent('交出档案平息警报', { object: ['档案'], action: ['递'], terminal: ['光栅熄', '警铃也停'] });
  // 真实形态：光栅熄/警铃停 落在 X 参与的 occurrence 的 consequence → direct
  const real = evaluateRealization(it, [
    occ('o1', ['林逸', '管理员'], '他把档案捏着边角递过去', '光栅熄了。警铃也停了', '他把档案捏着边角递过去管理员接时光栅熄了警铃也停了'),
  ], '他把档案捏着边角递过去，管理员接时，光栅熄了，警铃也停了。');
  ok(real.ok === true && real.reason === 'anchor_chain_direct', '真实形态（X 在场承接终局）→ direct asserted');

  // mediated 变体：机制响应挂非 X occurrence（对象在 excerpt，action 不操作对象锚）
  const med = evaluateRealization(it, [
    occ('o1', ['林逸'], '他把档案捏着边角递过去', '', '他把档案捏着边角递过去'),
    occ('o2', ['管理员'], '管理员按下解除钮', '光栅熄了。警铃也停了', '管理员接过档案按下解除钮光栅熄了警铃也停了'),
  ], '他把档案捏着边角递过去。管理员接过档案，按下解除钮，光栅熄了，警铃也停了。');
  ok(med.ok === true && med.reason === 'anchor_chain_mediated', 'mediated（共享档案、X 行动在前、机制终局）→ asserted');
  ok(med.terminalOccurrenceRef === 'o2', 'terminal = 机制响应 occurrence');
}

console.log('## N1/N2/N3 — preparation / failed / partial');
{
  const it = intent('砸碎档案柜玻璃取出档案', { object: ['卷宗'], action: ['砸', '玻璃'], terminal: ['抽出'] });
  const prep = evaluateRealization(it, [
    occ('o1', ['林逸'], '他有过撬锁的念头手摸向口袋', '', '他有过撬锁的念头手摸向口袋里面只有一根半弯的回形针'),
    occ('o2', ['林逸'], '他隔着起雾的玻璃打量卷宗', '', '标签泛黄他隔着起雾的玻璃打量第三排的卷宗'),
  ], '他有过撬锁的念头。他隔着起雾的玻璃打量第三排的卷宗。');
  ok(prep.ok === false
    && ['no_action_anchor_in_x_occurrence', 'terminal_evidence_missing'].includes(prep.reason),
    `N1 preparation → absent（reason=${prep.reason}）`);

  const failed = evaluateRealization(intent('烧掉地图', { object: ['地图'], action: ['烧', '点燃'], terminal: ['烧毁'] }, '林逸'), [
    occ('o1', ['林逸'], '林逸点燃地图', '火苗晃了晃熄灭了地图没能烧毁', '林逸点燃地图火苗晃了晃熄灭了'),
  ], '林逸点燃地图，火苗晃了晃熄灭了，地图没能烧毁。');
  ok(failed.ok === false && failed.reason === 'terminal_negated', 'N2 failed（终局在场但被否定）→ absent(terminal_negated)');

  const noTerminal = evaluateRealization(it, [
    occ('o1', ['林逸'], '林逸抬肘砸向玻璃探向卷宗', '玻璃纹丝不动', '林逸抬肘砸向玻璃探向卷宗玻璃纹丝不动'),
  ], '林逸抬肘砸向玻璃，探向卷宗，玻璃纹丝不动。');
  ok(noTerminal.ok === false && noTerminal.reason === 'terminal_evidence_missing', 'N2b 终局锚不在场（纹丝不动）→ absent(terminal_evidence_missing)');
}

console.log('## N3 partial（火焰舔上纸角，终局未落笔）');
{
  const it = intent('烧掉地图', { object: ['地图'], action: ['烧', '火焰'], terminal: ['烧毁'] }, '苏眠');
  const r = evaluateRealization(it, [
    occ('o1', ['苏眠'], '苏眠把地图举起来', '', '苏眠把地图举起来'),
    occ('o2', ['苏眠'], '打火机的火焰跳出来舔上纸角', '火舌爬得很慢先是一道焦褐的边', '打火机的火焰跳出来舔上纸角火舌爬得很慢'),
  ], '苏眠把地图举起来。打火机的火焰跳出来舔上纸角，火舌爬得很慢，先是一道焦褐的边。');
  ok(r.ok === false && r.reason === 'terminal_evidence_missing', 'N3 partial → absent');
}

console.log('## N4/N14 — 无关共现 / 仅环境匹配锚');
{
  const it = intent('砸碎档案柜玻璃取出档案', { object: ['卷宗'], action: ['砸', '玻璃'], terminal: ['抽出'] });
  const env = evaluateRealization(it, [
    occ('o1', ['林逸'], '林逸站在档案柜前打量', '', '林逸站在档案柜前打量柜门上那层起雾的玻璃'),
    occ('o2', ['管理员'], '管理员推车收卷宗', '', '管理员推车收当日归还的卷宗经过门口'),
  ], '林逸站在档案柜前打量柜门上那层起雾的玻璃。管理员推车收当日归还的卷宗经过门口。');
  ok(env.ok === false && env.reason === 'no_action_anchor_in_x_occurrence', 'N4/N14 环境共现 → absent（锚未落在 X 行动）');
}

console.log('## N5 — contradiction / reversal（synthetic）');
{
  const it = intent('保护地图', { object: ['地图'], action: ['保护', '收好'], terminal: ['完好', '收进'] });
  const r = evaluateRealization(it, [
    occ('o1', ['林逸'], '林逸把地图收好', '', '林逸把地图收好塞进内袋'),
    occ('o2', ['林逸'], '他当众撕毁地图', '地图被撕成两半失败了谁也没能拿走', '他当众撕毁地图地图被撕成两半'),
  ], '林逸把地图收好塞进内袋。他当众撕毁地图，地图被撕成两半。');
  ok(r.ok === false, 'N5 reversal → absent（终局锚不满足于撕毁 span）');
}

console.log('## N6/N15 — external 第三方（synthetic，NOT OBSERVED in corpus）');
{
  const it = intent('让门打开', { object: ['门'], action: ['按', '按钮'], terminal: ['门开启'] });
  const ext = evaluateRealization(it, [
    occ('o1', ['林逸'], '林逸按下按钮', '', '林逸按下按钮'),
    occ('o2', ['镜渊'], '镜渊拉开门', '门开启', '镜渊拉开门门开启'),
  ], '林逸按下按钮。镜渊拉开门，门开启。');
  ok(ext.ok === false && ext.reason === 'external_unlinked_realization', 'N6 第三方执行（terminal action 含第三方行动）→ absent');

  // N15 mediated 假阳性：共享「门」但第三方独立操作
  const fp = evaluateRealization(it, [
    occ('o1', ['林逸'], '林逸按下墙上的按钮', '', '林逸按下墙上的按钮按钮对着门'),
    occ('o2', ['镜渊'], '镜渊转动门把手', '门开启', '镜渊转动门把手门开启'),
  ], '林逸按下墙上的按钮，按钮对着门。镜渊转动门把手，门开启。');
  ok(fp.ok === false && fp.reason === 'external_unlinked_realization', 'N15 共享对象但第三方执行 → absent（共享锚≠因果归属）');

  // 真 mediated 对照：机制完成（无第三方人物 actor 承接行动锚）
  const med = evaluateRealization(it, [
    occ('o1', ['林逸'], '林逸按下开门按钮', '', '林逸按下开门按钮'),
    occ('o2', ['林逸'], '他后退半步看着门', '感应门开启绿色指示灯亮起', '他后退半步看着门感应门开启绿色指示灯亮起'),
  ], '林逸按下开门按钮。他后退半步看着门，感应门开启，绿色指示灯亮起。');
  ok(med.ok === true, 'N7 真 mediated（机制终局、无第三方行动锚）→ asserted');
}

console.log('## 兼容性 — WCT 经别名消费 terminal');
{
  const it = intent('砸碎档案柜玻璃取出档案', { object: ['卷宗'], action: ['砸', '玻璃'], terminal: ['抽出'] });
  const occs = [
    occ('o1', ['林逸'], '肘尖砸向柜门的玻璃面板', '钢化玻璃裂成蛛网状', '肘尖砸向柜门的玻璃面板钢化玻璃裂成蛛网状'),
    occ('o2', ['林逸'], '手探进去卷宗抽出来', '指节被碎玻璃划开一道口子', '手探进去卷宗抽出来时指节被碎玻璃划开一道口子'),
  ];
  const rec = deriveCharacterActionTruth({ intentTruth: it, occurrences: occs, sceneText: ARCHIVE_TEXT });
  ok(rec.occurrenceRef === rec.terminalOccurrenceRef, 'occurrenceRef === terminalOccurrenceRef（WCT backward-compat）');
}

console.log(`\n# EO-P4-Correspondence-V2-01: ${pass} pass, ${fail} fail`);
process.exit(fail ? 1 : 0);
