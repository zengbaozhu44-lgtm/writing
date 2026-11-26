#!/usr/bin/env node
/**
 * 提取叙事效率 golden sample — 从 PATCH 格式的 0001_逃出生天.md
 *
 * 用法:
 *   node scripts/extract-golden-0001.js            # 输出到 stdout（人工确认）
 *   node scripts/extract-golden-0001.js --write    # 写入 golden/（确认后执行）
 *
 * 产物:
 *   golden/narrative-efficiency-0001.md  — 干净最终正文（无 PATCH/元数据）
 *   golden/principles.md                 — 为什么有效的分句标注（供 prompt 注入）
 *
 * 回滚: rm golden/narrative-efficiency-0001.md golden/principles.md
 */
import fs from 'node:fs';
import path from 'node:path';

const SRC = path.resolve('books/我的小说/chapters/0001_逃出生天.md');
const WRITE = process.argv.includes('--write');

function main() {
  const raw = fs.readFileSync(SRC, 'utf8');

  // 1) 最终正文 = 最后一个 REPLACEMENT_TEXT 之后、「## 章尾钩子」之前
  const parts = raw.split(/--- PATCH \d+ ---/);
  const last = parts[parts.length - 1];
  const m = last.match(/REPLACEMENT_TEXT:\s*\n(.*?)\n/);
  const rep = m ? m[1] : '';
  const after = m ? last.slice(last.indexOf(rep) + rep.length) : last;
  const prose = after.split('## 章尾钩子')[0]
    .split('\n')
    .map((p) => p.trim())
    .filter((p) => p && !p.startsWith('#') && !p.startsWith('['));
  const finalText = prose.join('\n\n');

  // 2) PATCH 对照（编辑意图 = 压缩叙述、提信息密度）
  const patches = [...raw.matchAll(
    /--- PATCH (\d+) ---\s*\nTARGET_TEXT:\s*\n(.*?)\nREPLACEMENT_TEXT:\s*\n(.*?)\n(?=--- PATCH|\Z)/gs,
  )].map((mm) => ({ n: Number(mm[1]), target: mm[2].trim(), replacement: mm[3].trim() }));

  // 3) 逐句标注（principles）：每句的叙事功能
  const sentences = finalText
    .split(/(?<=[。！？”])/)
    .map((s) => s.trim())
    .filter(Boolean);
  const EVENT = /(获知|发现|追|撞|躲|停|转|拿|拨|说|问|答|杀|晕|逃|出手|知道|决意|放弃|答应|拒绝|涌起|闪过|深吸|抬)/;
  const annotated = sentences.map((s) => {
    const func = EVENT.test(s) ? '事件/判断变化' : '情境描写';
    const density = (s.replace(/[，。！？、；：“”「」\s]/g, '').length
      / Math.max(1, s.split(/，|。|；/).length)).toFixed(1);
    return { s, func, density: Number(density) };
  });

  const sampleOut = [
    '# 叙事效率 Golden Sample · 提取自 0001_逃出生天',
    '',
    '> 每句都在改变局面。描写是动作的附属品。信息密度高。主角是行动发起者。',
    '> 人工确认日期：2026-11-26（scripts/extract-golden-0001.js 提取）',
    '',
    finalText,
    '',
  ].join('\n');

  const avgDensity = (annotated.reduce((a, x) => a + x.density, 0) / annotated.length).toFixed(1);
  const eventRatio = Math.round(annotated.filter((x) => x.func.includes('事件')).length / annotated.length * 100);
  const principlesOut = [
    '# 叙事效率原则 · 提取自 0001 逐句分析',
    '',
    `## 统计（供 eval 对照口径）`,
    `- 句子数: ${annotated.length}`,
    `- 事件/判断句占比: ${eventRatio}%`,
    `- 平均信息密度（去标点字数/子句数）: ${avgDensity}`,
    `- PATCH 编辑 ${patches.length} 处：全部是「长叙述 → 短句」，平均压缩 ${Math.round(
      (1 - patches.reduce((a, p) => a + p.replacement.length / p.target.length, 0) / patches.length) * 100,
    )}%`,
    '',
    '## 原则（prompt 注入用）',
    '1. 每句都改变局面（新信息 / 关闭选项的选择 / 物理/关系改变）；删除后影响后续逻辑',
    '2. 感官与环境描写只在动作/对白需要时出现，且必须承担叙事功能（揭示判断、引入障碍、改变理解）',
    '3. 主角是行动发起者：停下、转身、拨号、出手——动词链推进，不等待世界发生',
    '4. 对白短促、每句带博弈（威胁/拒绝/承诺），无寒暄',
    '5. 认知句（他知道/明白）必须紧跟决策或行动，不单独悬浮',
    '',
    '## 逐句标注（节选）',
    ...annotated.slice(0, 12).map((x) => `- [${x.func}] 密度${x.density} · ${x.s.slice(0, 50)}`),
  ].join('\n');

  if (WRITE) {
    fs.mkdirSync('golden', { recursive: true });
    fs.writeFileSync('golden/narrative-efficiency-0001.md', sampleOut, 'utf8');
    fs.writeFileSync('golden/principles.md', principlesOut, 'utf8');
    console.log('written: golden/narrative-efficiency-0001.md');
    console.log('written: golden/principles.md');
  } else {
    console.log('=== narrative-efficiency-0001.md ===');
    console.log(sampleOut);
    console.log('\n=== principles.md ===');
    console.log(principlesOut);
    console.log('\n(dry run — 加 --write 落盘)');
  }
}

main();
