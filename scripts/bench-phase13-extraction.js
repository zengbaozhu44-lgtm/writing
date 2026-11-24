#!/usr/bin/env node
/**
 * Phase 1.3 — Offline Extraction Benchmark（只读，不改生产代码）
 *
 * 三方对比（同一 8 场真实生产 prose）：
 *   A. deterministic extractor（现行 Phase 1，原样调用）
 *   B. LLM-assisted candidates → 现有 validateStoryEvent + 候选侧确定性闸门
 *      （actor ⊆ knownNames；consequence 须过 echo 检查 + aftermath grounding；
 *        excerpt 字面 grounding 由现有 validator 强制）
 *
 * 指标：actor 有效率 / 金标核心事件召回 / 真实 aftermath consequence 数 /
 *       false evidence 审计（通过闸门但不属于金标的事件 → 人工复核清单）
 */
import fs from 'node:fs';
import { extractStoryEventsFromScene } from '../packages/inkos-brain/src/events/event-extractor.js';
import { validateStoryEvent } from '../packages/inkos-brain/src/events/event-validator.js';
import { isActionEchoOfY, isGroundedInAftermath } from '../packages/inkos-brain/src/causality/world-consequence-truth.js';
import { chatCompletion } from '../packages/inkos-brain/src/writer/llm-writer.js';

const KNOWN = ['林逸', '苏眠', '镜渊'];
const MODEL = { baseUrl: 'https://api.deepseek.com', model: 'deepseek-chat' };

/** 人工金标：18 个核心事件（actor + 动作关键词 + aftermath 关键词） */
const GOLD = {
  ch1_s1: [
    { actors: ['苏眠'], action: ['地图', '画'], aftermath: ['内袋', '对折'] },
  ],
  ch1_s2: [
    { actors: ['林逸'], action: ['玻璃', '档案'], aftermath: ['警铃', '光栅', '红外线'] },
    { actors: ['管理员', '林逸'], action: ['交出', '递'], aftermath: ['光栅熄', '警铃也停'] },
  ],
  ch1_s3: [
    { actors: ['林逸'], action: ['撬', '档案盒'], aftermath: ['撕'] },
    { actors: ['林逸', '镜渊'], action: ['地图', '松手'], aftermath: ['收进大衣'] },
  ],
  ch1_s4: [
    { actors: ['苏眠'], action: ['画', '地图'], aftermath: ['折痕对不上'] },
  ],
  ch2_s1: [
    { actors: ['林逸'], action: ['摊开', '质问'], aftermath: [] },
    { actors: ['苏眠'], action: ['离开', '转身'], aftermath: ['融进'] },
    { actors: ['林逸'], action: ['日期', '铅笔'], aftermath: [] },
  ],
  ch2_s2: [
    { actors: ['林逸'], action: ['渊', '日期'], aftermath: [] },
    { actors: ['林逸'], action: ['袖口', '轮廓'], aftermath: [] },
  ],
  ch2_s3: [
    { actors: ['林逸'], action: ['真图', '腕骨', '搜'], aftermath: ['摊在'] },
    { actors: ['苏眠'], action: ['塞回', '袖口'], aftermath: [] },
    { actors: ['苏眠'], action: ['离开', '侧门'], aftermath: ['桌上空了'] },
  ],
  ch2_s4: [
    { actors: ['林逸'], action: ['镜渊', '日期', '底页'], aftermath: [] },
    { actors: ['苏眠'], action: ['布条', '门框'], aftermath: [] },
  ],
};

function actorValid(ev) {
  return (ev.actors || []).length > 0 && (ev.actors || []).every((a) => KNOWN.includes(a));
}

function realAftermath(ev) {
  const c = String(ev.consequence || '');
  return c && !isActionEchoOfY(c, ev.action) && isGroundedInAftermath(c, ev.__text ?? '', 0);
}

function matchGold(ev, goldList) {
  return goldList.filter((g) => {
    const actorHit = (ev.actors || []).some((a) => g.actors.includes(a));
    const actionHit = g.action.some((k) => String(ev.action || '').includes(k))
      || g.action.every((k) => String(ev.action + (ev.evidence?.excerpt || '')).includes(k));
    return actorHit && actionHit;
  });
}

function score(label, eventsByScene, texts) {
  let total = 0; let validActor = 0; let aftermath = 0;
  const matchedGold = new Set(); const unmatched = [];
  for (const [sid, evs] of Object.entries(eventsByScene)) {
    for (const ev of evs) {
      total += 1;
      ev.__text = texts[sid];
      if (actorValid(ev)) validActor += 1;
      if (realAftermath(ev)) aftermath += 1;
      const m = matchGold(ev, GOLD[sid] || []);
      if (m.length) m.forEach((g) => matchedGold.add(`${sid}|${g.action.join('')}`));
      else unmatched.push({ sid, actors: ev.actors, action: String(ev.action).slice(0, 40), consequence: String(ev.consequence).slice(0, 40) });
    }
  }
  const goldCount = Object.values(GOLD).reduce((n, l) => n + l.length, 0);
  console.log(`\n== ${label} ==`);
  console.log(`events=${total} actorValid=${validActor}(${total ? Math.round(100 * validActor / total) : 0}%) realAftermathConsequence=${aftermath}`);
  console.log(`gold recall = ${matchedGold.size}/${goldCount}`);
  return { total, validActor, aftermath, goldHit: matchedGold.size, goldCount, unmatched };
}

async function llmExtract(sid, text) {
  const sys = [
    '你是小说正文的证据提取器。只输出 JSON 数组，不要解释。',
    '',
    '【最重要规则】excerpt 与 consequence 必须是从正文「复制粘贴」的连续原文，一个字都不能改、不能增删；action 只能用 excerpt 中实际出现的字词拼接主谓短语。转述=非法。',
    '',
    '每个元素：',
    '{ "kind": "action|speech|discovery|movement",',
    '  "actors": ["只能从人物名单选"],',
    '  "action": "≤40字，主谓短语，字词须出现在 excerpt 中",',
    '  "consequence": "该动作之后正文明确呈现的世界变化原文短语（≤50字，逐字摘自正文）；没有则填空字符串",',
    '  "stateChanges": ["简短标签"],',
    '  "affectedEntities": ["人物或物件"],',
    '  "excerpt": "正文连续原文 10-120 字，逐字复制，包含动作证据",',
    '  "actorEvidence": "正文中逐字出现的、支持 actor 归属的短语（人名本身或紧邻代词的先行语段）" }',
    '',
    '示例——正文片段：「警铃炸响。不是从头顶，是从走廊两端同时压过来的…走廊尽头降下一道红色光栅」',
    '合法输出：{"kind":"action","actors":["林逸"],"action":"撞上档案柜的玻璃","consequence":"走廊尽头降下一道红色光栅","stateChanges":["world:光栅封锁"],"affectedEntities":["林逸","档案柜"],"excerpt":"左手肘撞上档案柜的玻璃。第一下只裂了纹，第二下整块碎开，碎片溅到手背上，凉得像水。","actorEvidence":"他探进去"}',
    '',
    '禁止：推断、计划、心理、可能性；consequence 与 action 同义反复；人物名单外 actors；自造 excerpt。宁缺勿滥，每场 ≤6 个事件。',
  ].join('\n');
  const user = `人物名单：${KNOWN.join('、')}\n场景ID：${sid}\n\n正文：\n${text}`;
  const r = await chatCompletion({
    ...MODEL, apiKey: KEY(),
    messages: [{ role: 'system', content: sys }, { role: 'user', content: user }],
    maxTokens: 3000, temperature: 0.1,
  });
  const raw = String(r.content || '').replace(/```json|```/g, '').trim();
  const arr = JSON.parse(raw);
  return Array.isArray(arr) ? arr.slice(0, 6) : [];
}

function KEY() {
  return JSON.parse(fs.readFileSync('books/我的小说/.inkos/secrets.json', 'utf8')).services.deepseek.apiKey;
}

/** 候选侧确定性闸门：现有 validator + actor 白名单 + consequence echo/grounding */
function gateLLMCandidates(sid, text, cands) {
  const passed = []; const rejected = [];
  for (const c of cands) {
    const errs = [];
    if (!Array.isArray(c.actors) || !c.actors.length || !c.actors.every((a) => KNOWN.includes(a))) errs.push('actor_not_in_knownNames');
    if (!c.actorEvidence || !text.includes(String(c.actorEvidence).trim())) errs.push('actorEvidence_not_literal');
    const cons = String(c.consequence || '').trim();
    if (cons && (isActionEchoOfY(cons, c.action) || !isGroundedInAftermath(cons, text, 0))) errs.push('consequence_echo_or_ungrounded');
    const v = validateStoryEvent({
      id: `evt_${sid}_llm_${passed.length}`, sceneId: sid,
      kind: c.kind || 'action', actors: c.actors, action: c.action,
      consequence: cons, stateChanges: c.stateChanges, affectedEntities: c.affectedEntities,
      evidence: { excerpt: c.excerpt }, source: 'annotated',
    }, { text });
    if (!v.ok) errs.push(...v.errors);
    if (errs.length) rejected.push({ errs: [...new Set(errs)].slice(0, 3), action: String(c.action || '').slice(0, 30) });
    else passed.push(v.event);
  }
  return { passed, rejected };
}

async function main() {
  const texts = JSON.parse(fs.readFileSync('tmp-stress/corpus.json', 'utf8'));

  // A. deterministic baseline（原样）
  const base = {};
  for (const [sid, text] of Object.entries(texts)) {
    base[sid] = extractStoryEventsFromScene({ id: sid, index: 1, text }, { knownNames: KNOWN }).events;
  }
  const sA = score('A. deterministic (现行)', base, texts);

  // B. LLM-assisted（同一 validator 闸门）
  const llm = {}; const rejections = []; let parseFail = 0;
  for (const [sid, text] of Object.entries(texts)) {
    try {
      const cands = await llmExtract(sid, text);
      const { passed, rejected } = gateLLMCandidates(sid, text, cands);
      llm[sid] = passed;
      rejections.push({ sid, rejected });
    } catch (e) {
      parseFail += 1;
      llm[sid] = [];
      rejections.push({ sid, error: String(e.message || e).slice(0, 80) });
    }
  }
  const sB = score('B. LLM-assisted + 现有 validator 闸门', llm, texts);

  console.log('\n== B 闸门拒绝明细（fail-closed 证据） ==');
  console.log(JSON.stringify(rejections, null, 1).slice(0, 2400));
  console.log(`\nparseFail=${parseFail}`);
  fs.writeFileSync('tmp-stress/bench.json', JSON.stringify({ sA, sB, rejections, llmSample: llm }, null, 2));
}

main().catch((e) => { console.error(e); process.exit(1); });
