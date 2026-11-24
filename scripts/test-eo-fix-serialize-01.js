#!/usr/bin/env node
/**
 * EO-FIX-SERIALIZE-01 — serializeWorldMd 类型归一验证
 *
 * R1-R6: 类型归一行为矩阵
 * R7:   E2E 书已损坏样本内存渲染对照
 * R9:   二手书店已损坏样本内存渲染对照
 * 附加: 0/false/空串/空数组/混合数组/多层嵌套
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { serializeWorldMd } from '../packages/inkos-studio-server/src/ai-serializers.js';

let pass = 0;
let fail = 0;
function ok(cond, label) {
  if (cond) { pass += 1; console.log(`  ok - ${label}`); }
  else { fail += 1; console.error(`  FAIL - ${label}`); }
}

console.log('# EO-FIX-SERIALIZE-01');

console.log('## R1 — object 输入结构化输出');
{
  const md = serializeWorldMd({ title: 'T', era: '现代', history: { period: '近代', events: ['战争', '重建'] } });
  const line = md.split('\n').find((l) => l.includes('period'));
  ok(line !== undefined, `object 字段产出结构化 JSON（${line?.slice(0, 40)}）`);
  ok(!md.includes('[object Object]'), '零 [object Object]');
}

console.log('## R2 — string array 处理');
{
  const md = serializeWorldMd({ title: 'T', era: 'E', rules: ['规则一', '规则二', '规则三'] });
  const line = md.split('\n').find((l) => l.includes('规则一'));
  ok(line?.includes('规则一；规则二；规则三'), `string array 用；连接（${line?.slice(0, 30)}）`);
}

console.log('## R3 — object array 结构完整性');
{
  const cities = [{ name: '雾桥镇', pop: 50000 }, { name: '邻城', pop: 120000 }];
  const md = serializeWorldMd({ title: 'T', era: 'E', cities });
  ok(md.includes('"name":"雾桥镇"') && md.includes('"name":"邻城"'), '两个对象完整保留');
  ok(md.includes('；'), '数组元素用；分隔');
  ok(!md.includes('[object Object]'), '零 [object Object]');
}

console.log('## R4 — string 原样保留');
{
  const md = serializeWorldMd({ title: 'T', era: '现代都市', history: '二十年前一场大雾改变了小镇' });
  ok(md.includes('二十年前一场大雾改变了小镇'), 'string 原样');
  ok(!md.includes('"二十年前'), '不重复 JSON.stringify');
}

console.log('## R5 — null / undefined 边界');
{
  const md = serializeWorldMd({ title: 'T', era: null, history: undefined, rules: '' });
  const eraLine = md.split('\n').find((l) => l.includes('世界背景'));
  ok(eraLine !== undefined, 'null/undefined 字段不崩溃');
  ok(!md.includes('null') && !md.includes('undefined'), 'null/undefined 不产出字面文本');
}

console.log('## R6 — 嵌套 object 含 null/number/boolean');
{
  const nested = { level1: { level2: { num: 42, bool: false, nil: null, str: '深层' } }, arr: [1, 'two', { three: 3 }] };
  const md = serializeWorldMd({ title: 'T', era: 'E', powerSystem: nested });
  ok(md.includes('"num":42'), 'number 保留');
  ok(md.includes('"bool":false'), 'boolean false 保留');
  ok(md.includes('"str":"深层"'), '深层 string 保留');
  ok(!md.includes('[object Object]'), '嵌套零 [object Object]');
}

console.log('## 附加 — 原始值边界');
{
  const md0 = serializeWorldMd({ title: 'T', era: 0 });
  ok(md0.includes('## 1. 世界背景 / 时代\n0'), 'number 0 保留（不清空）');
  const mdF = serializeWorldMd({ title: 'T', era: false });
  ok(mdF.includes('## 1. 世界背景 / 时代\nfalse'), 'boolean false 保留（不清空）');
  const mdE = serializeWorldMd({ title: 'T', era: '' });
  ok(!mdE.includes('[object Object]'), '空字符串不崩溃');
}

console.log('## 附加 — 空数组 / 混合数组 / 多层嵌套数组');
{
  const mdEmpty = serializeWorldMd({ title: 'T', era: 'E', cities: [] });
  ok(!mdEmpty.includes('[object Object]'), '空数组不产出 [object Object]（段头保留是既有 ternary 行为）');
  const mixed = ['文字一', 42, { key: 'val' }, ['嵌套数组']];
  const mdMixed = serializeWorldMd({ title: 'T', era: 'E', places: mixed });
  ok(mdMixed.includes('文字一') && mdMixed.includes('42') && mdMixed.includes('"key":"val"') && mdMixed.includes('嵌套数组'), '混合数组全保留');
  ok(!mdMixed.includes('[object Object]'), '混合数组零 [object Object]');
  const deep = [{ outer: [{ inner: '最深' }] }];
  const mdDeep = serializeWorldMd({ title: 'T', era: 'E', dangerZones: deep });
  ok(mdDeep.includes('"inner":"最深"'), '多层嵌套保留');
}

console.log('## R7 — E2E 书已损坏样本内存渲染对照');
{
  const path = 'books/我的小说/books/E2E-LONGFORM-01A/novel/01_world_bible.md';
  const original = fs.readFileSync(path, 'utf8');
  const corruptCount = (original.match(/\[object Object\]/g) || []).length;
  console.log(`  原始文件 ${corruptCount} 处 [object Object]（只读，不修改文件）`);
  // 用类型归一函数重新序列化一个等价结构化输入
  const repaired = serializeWorldMd({
    title: '雾桥谜案',
    era: '现代都市',
    history: { timeline: '二十年前断桥坍塌至今', key_events: ['坍塌', '失踪', '重建'] },
    rules: { supernatural: '无超自然力量，纯悬疑推理', world_rule: '现代中国社会背景' },
    powerSystem: { type: 'none', description: '本作品无超凡体系' },
    socialStructure: { setting: '南方多雨小城雾桥镇', community: '熟人社会' },
    factions: ['雾桥镇政府', '镇派出所', '民间维权者'],
    map: '雾桥镇位于南方山区，常年多雾，一座断桥横跨雾河',
    cities: [{ name: '雾桥镇', feature: '断桥/雾河/老城区' }],
    dangerZones: [{ zone: '断桥遗址', risk: '危险，禁止靠近' }],
    places: ['雾河', '断桥', '老城区茶馆'],
  });
  ok(!repaired.includes('[object Object]'), '重新序列化零 [object Object]');
  ok(repaired.includes('雾桥镇') && repaired.includes('断桥'), '结构化内容正确呈现');
  console.log(`  （原始文件未修改——仅内存对照）`);
}

console.log('## R9 — 二手书店已损坏样本内存渲染对照');
{
  const path = 'books/我的小说/books/二手书店老板的最后一周/novel/01_world_bible.md';
  const original = fs.readFileSync(path, 'utf8');
  const corruptCount = (original.match(/\[object Object\]/g) || []).length;
  console.log(`  原始文件 ${corruptCount} 处 [object Object]（只读，不修改文件）`);
  const repaired = serializeWorldMd({
    title: '二手书店老板的最后一周',
    era: '现代都市',
    factions: [{ name: '书店常客群', type: '松散社群' }, { name: '房东', type: '个人' }, { name: '线上书商', type: '商业竞争' }],
    dangerZones: [{ zone: '拆迁区域', risk: '即将拆除' }, { zone: '仓库', risk: '旧书堆积' }],
    map: '老城区街道，书店位于巷口',
  });
  ok(!repaired.includes('[object Object]'), 'object array 重新序列化零 [object Object]');
  ok(repaired.includes('"name":"书店常客群"'), '嵌套结构保留');
  console.log(`  （原始文件未修改——仅内存对照）`);
}

console.log(`\n# 结果: ${pass} pass / ${fail} fail`);
process.exit(fail ? 1 : 0);
