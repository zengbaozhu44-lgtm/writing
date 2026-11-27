#!/usr/bin/env node
/**
 * 叙事推进度评估 — 第 0 步质量回归骨架
 *
 * 用法:
 *   node scripts/eval-narrative.js <file-or-dir> [--judge] [--baseline golden/narrative-efficiency-0001.md]
 *
 * 输出（每文件 + 汇总）：
 *   eventSentenceRatio      事件句占比（对照 0001 ≈ 72%）
 *   neitherSentenceRatio    悬浮句占比（非事件非描写；越低越好，0001 ≈ 23%）
 *   singlePurposeDescRatio  单用途纯描写占比（0001 ≈ 2%）
 *   actionVerbDensity       动作动词/千字（0001 ≈ 28/千字）
 *   infoDensity             去标点字数/子句数（0001 ≈ 4.1）
 *   --judge: LLM 盲评 vs baseline（胜/平/负）——用主 LLM，只发正文（去标题）
 *
 * 与 tests/golden-baseline 的关系：那边是 promptFingerprint 结构回归（防意外变更），
 * 本脚本是质量回归（测「好不好」）。fixture hash 刷新不代表本评估自动通过。
 */
import fs from 'node:fs';
import path from 'node:path';
// 3a 口径对齐：句子切分与判定从共享工具 import（causal-gate 同源），禁止两套口径
import {
  EVENT_RE,
  DESC_RE,
  ACTION_VERB_RE,
  FUNCTIONAL_RE,
  splitSentences as sentences,
} from '../packages/inkos-brain/src/metrics/sentence-utils.js';

function cleanText(t) {
  return String(t)
    .replace(/^--- PATCH.*?$/gm, '')
    .replace(/^#{1,3}.*$/gm, '')
    .replace(/^>.*$/gm, '')
    .replace(/^\[.*$/gm, '')
    .trim();
}

function evalFile(file, label) {
  const raw = fs.readFileSync(file, 'utf8');
  const text = cleanText(raw);
  const ss = sentences(text);
  if (!ss.length) return null;

  let event = 0, desc = 0, mixed = 0, neither = 0;
  let singlePurposeDesc = 0, functionalDesc = 0;
  for (const s of ss) {
    const e = EVENT_RE.test(s);
    const d = DESC_RE.test(s);
    if (e && d) mixed += 1;
    else if (e) event += 1;
    else if (d) desc += 1;
    else neither += 1;
    // 1c-2: 描写句的叙事功能分类（口径与定位报告一致：
    // 只含环境/感官/外貌，且不含新信息/选择/障碍/判断/动作结果 → 单用途纯描写）
    if (d) {
      if (FUNCTIONAL_RE.test(s) || e) functionalDesc += 1;
      else singlePurposeDesc += 1;
    }
  }
  const chars = text.replace(/\s/g, '').length;
  const actionVerbs = (text.match(new RegExp(ACTION_VERB_RE.source, 'g')) || []).length;
  const clauses = text.split(/[，。；！？]/).filter(Boolean).length;

  return {
    file: label || file,
    chars,
    sentences: ss.length,
    eventSentenceRatio: +(event / ss.length).toFixed(2),
    descSentenceRatio: +(desc / ss.length).toFixed(2),
    mixedRatio: +(mixed / ss.length).toFixed(2),
    neitherSentenceRatio: +(neither / ss.length).toFixed(2),
    singlePurposeDescriptionRatio: +(singlePurposeDesc / ss.length).toFixed(2),
    functionalDescriptionRatio: +(functionalDesc / ss.length).toFixed(2),
    actionVerbPerKilo: +(actionVerbs / chars * 1000).toFixed(1),
    infoDensity: +(chars / clauses).toFixed(1),
  };
}

async function llmJudge(text, baselineText) {
  const { loadInkOsConfig } = await import('../packages/inkos-core/src/lib/config.js');
  const { chatCompletion } = await import('../packages/inkos-brain/src/writer/llm-writer.js');
  const cfg = loadInkOsConfig().llm;
  if (!cfg.apiKey) return { error: 'no api key' };
  const sys = [
    '你是盲评评委。两段网文正文（A/B），按以下六项打分（0-10）：推进、冲突、悬念、节奏、语言效率、角色主动性。',
    '只输出 JSON：{"scoresA":{...},"scoresB":{...},"verdict":"A"|"B"|"tie"}',
    '判断推进：每句是否改变局面（新信息/关闭选项的选择/局面改变）。',
  ].join('\n');
  const res = await chatCompletion({
    baseUrl: cfg.baseUrl,
    apiKey: cfg.apiKey,
    model: cfg.model,
    messages: [
      { role: 'system', content: sys },
      {
        role: 'user',
        content: `【A】\n${cleanText(text).slice(0, 2500)}\n\n【B】\n${cleanText(baselineText).slice(0, 2500)}`,
      },
    ],
    maxTokens: 1600,
    temperature: 0.2,
  });
  try {
    const m = res.content.match(/\{[\s\S]*\}/);
    return JSON.parse(m[0]);
  } catch {
    return { error: 'parse fail', raw: res.content.slice(0, 200) };
  }
}

async function main() {
  const args = process.argv.slice(2);
  const target = args[0];
  const doJudge = args.includes('--judge');
  if (!target || !fs.existsSync(target)) {
    console.error('用法: node scripts/eval-narrative.js <file-or-dir> [--judge]');
    process.exit(1);
  }
  const files = fs.statSync(target).isDirectory()
    ? fs.readdirSync(target).filter((f) => f.endsWith('.md')).map((f) => path.join(target, f)).sort()
    : [target];

  const baselineFile = path.resolve('golden/narrative-efficiency-0001.md');
  const baseline = evalFile(baselineFile, 'BASELINE 0001');
  console.log('基准（golden 提取）:', JSON.stringify(baseline, null, 1));

  const results = [];
  for (const f of files) {
    const r = evalFile(f);
    if (r) results.push(r);
    if (doJudge && fs.statSync(target).isFile()) {
      const j = await llmJudge(fs.readFileSync(f, 'utf8'), fs.readFileSync(baselineFile, 'utf8'));
      r.judge = j;
    }
  }
  console.table(results.map(({ file, judge, ...x }) => ({ file: path.basename(file), ...x })));
  for (const r of results) {
    if (r.judge) console.log(`\n[blind judge] ${path.basename(r.file)} →`, JSON.stringify(r.judge));
  }

  if (results.length > 1) {
    const avg = (k) => +(results.reduce((s, r) => s + r[k], 0) / results.length).toFixed(2);
    console.log('汇总: avg event=%.2f neither=%.2f singleDesc=%.2f action/k=%.1f density=%.1f（基准 event=%.2f neither=%.2f）',
      avg('eventSentenceRatio'), avg('neitherSentenceRatio'), avg('singlePurposeDescriptionRatio'), avg('actionVerbPerKilo'), avg('infoDensity'),
      baseline.eventSentenceRatio, baseline.neitherSentenceRatio);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
