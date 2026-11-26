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

const EVENT_RE = /(获知|发现|追|撞|躲|停|转|拿|拨|说|问|答|杀|晕|逃|出手|知道|明白|意识到|决意|放弃|答应|拒绝|涌起|闪过|深吸|抬|走|来|去|给|开|关|锁|翻|倒|掉|响|亮|灭|断|碎|合|伤|死|扑|抓|砸|踢|推|拔|冲|喊|叫|挡|塞|递|抢|撕|夺|签|按|敲|划|割|填|写|扔|抛|收|藏|付|买|卖|换|丢|捡|挖|埋|烧|浇|撞|碰|擦|洗|刮|削|拉|拽|拖|提|背|扛|抱|搂|扶|掐|捂|堵|封|拆|装|修|接|递|伸|缩|摇|点|数|画|圈|挑|选|认|记|忘|猜|疑|信|断定|证实|识破|揭穿|暴露|坦白|承认|否认|抵赖|撒谎|隐瞒|泄露|告诉|通知|提醒|警告|威胁|许诺|发誓|决定|计划|准备|开始|结束|完成|失败|成功|赢|输|胜|败)/;
const DESC_RE = /(像|如|仿佛|似乎|般|色泽|气味|味道|轮廓|纹理|安静|沉默|缓缓|慢慢|静静|微微|轻轻|潮|霉|锈|灰|暗|闷|模糊|寂静|弥漫|笼罩|折射|透出|泛出|映出|斑驳|粗粝|细腻|光滑|粗糙|冰凉|温热|刺骨|灼热|喧嚣|嘈杂|空旷|狭小|逼仄|开阔|低矮|高耸|破旧|崭新|整洁|凌乱)/;
const ACTION_VERB_RE = /(跑|追|撞|躲|出手|打|拨|停|转|冲|拿|逃|抓|砸|踢|推|拔|扑|挡|喊|叫|塞|递|抢|撕|夺|按|敲|划|割|扔|抛|收|藏|挖|埋|烧|浇|擦|洗|拉|拽|拖|提|背|扛|抱|扶|掐|捂|堵|封|拆|装|修|接|伸|缩|摇|点|画|圈|挑|选)/;

function cleanText(t) {
  return String(t)
    .replace(/^--- PATCH.*?$/gm, '')
    .replace(/^#{1,3}.*$/gm, '')
    .replace(/^>.*$/gm, '')
    .replace(/^\[.*$/gm, '')
    .trim();
}

function sentences(t) {
  return t
    .split(/(?<=[。！？”])/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 4);
}

function evalFile(file, label) {
  const raw = fs.readFileSync(file, 'utf8');
  const text = cleanText(raw);
  const ss = sentences(text);
  if (!ss.length) return null;

  let event = 0, desc = 0, mixed = 0, neither = 0;
  for (const s of ss) {
    const e = EVENT_RE.test(s);
    const d = DESC_RE.test(s);
    if (e && d) mixed += 1;
    else if (e) event += 1;
    else if (d) desc += 1;
    else neither += 1;
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
    console.log('汇总: avg event=%.2f neither=%.2f action/k=%.1f density=%.1f（基准 event=%.2f neither=%.2f）',
      avg('eventSentenceRatio'), avg('neitherSentenceRatio'), avg('actionVerbPerKilo'), avg('infoDensity'),
      baseline.eventSentenceRatio, baseline.neitherSentenceRatio);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
