/**
 * MemoryUnit — 章级唯一原子提交出口
 *
 * commit(chapterId, stateDiff)：
 *   1) chapters/*.md
 *   2) states/ch_XXXX.json（世界/人物/Facts 聚合）
 *   3) Git Memory Snapshot（+ 可选真实 git commit）
 *
 * EO-P1 Dual BLOCK A: Commit ≠ obtains. Persistence ≠ Reality Status.
 * Successful commit is operational / registration persistence only — not Authority Act.
 *
 * Living / AI Editor 不得在此之外写运行态；提案只能进入 stateDiff.livingPrepare。
 *
 * @see golden/reality/d1-implementation-contract/INTERPRETATION-BLOCK.md
 */
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { writeText, writeJson, readJson, exists } from '../../../inkos-core/src/lib/paths.js';
import { writeYaml, readYaml } from '../../../inkos-core/src/lib/yaml-store.js';
import {
  createSnapshot,
  rollbackToChapter as gitRollbackToChapter,
  listSnapshots,
} from '../../../inkos-brain/src/memory/git-memory.js';
import {
  applyStateDiffToCanon,
  updateManifestChapter,
  writeNextChapterTask,
  deriveNextChapterIntent,
  isTemplateFallback,
} from '../../../inkos-brain/src/memory/state-updater.js';
import {
  evolveFromChapter,
  collectActualEventsFromScenes,
} from '../../../inkos-brain/src/memory/state-evolution-engine.js';
import { brainSystemDir } from '../../../inkos-brain/src/loader.js';
import {
  chapterAnchorPath as plannerAnchorPath,
  chapterAnchorFileName,
} from '../../../inkos-brain/src/planner/planner.js';
import { updateMemoryHierarchy } from './memory-hierarchy.js';
import { stampOpsHint } from '../../../inkos-core/src/lib/inference-demotion.js';

/** 空正文 / 字数过低下禁止 commit + Git */
export class EmptyArtifactError extends Error {
  constructor(message, detail = {}) {
    super(message);
    this.name = 'EmptyArtifactError';
    this.code = 'EMPTY_ARTIFACT';
    this.detail = detail;
  }
}

export const MIN_CHAPTER_CHARS = Number(process.env.INKOS_MIN_CHAPTER_CHARS || 200);

export function statesDir(bookDir) {
  return path.join(bookDir, 'states');
}

export function chapterStatePath(bookDir, chapter) {
  return path.join(statesDir(bookDir), `ch_${String(chapter).padStart(4, '0')}.json`);
}

/** 章级时空/关系锚点 — commit 时写入，供下一章 Planner 强制读取（与 planner.chapterAnchorPath 同源） */
export function chapterAnchorPath(bookDir, chapter) {
  return plannerAnchorPath(bookDir, chapter);
}

export function loadChapterAnchor(bookDir, chapter, { required = false } = {}) {
  const file = chapterAnchorPath(bookDir, chapter);
  if (!exists(file)) {
    if (required) throw new Error(`Anchor not found: ${file}`);
    return null;
  }
  try {
    return readYaml(file);
  } catch (err) {
    if (required) {
      throw new Error(`Anchor not readable: ${file} (${err?.message || err})`);
    }
    return null;
  }
}

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function sanitizeTitle(title = 'untitled') {
  return String(title)
    .replace(/[\\/:*?"<>|]/g, '')
    .replace(/\s+/g, '_')
    .slice(0, 40) || 'untitled';
}

function countBodyChars(chapterText = '') {
  const raw = String(chapterText || '').trim();
  const body = raw.replace(/^#.+\n+/, '');
  return { raw, body, chars: body.replace(/\s/g, '').length };
}

/**
 * Empty Artifact Guard — commit 入口硬拦截
 * 空正文永远拒绝；字数 < 阈值默认拒绝（force 仅放宽字数下限，仍禁止空文）
 */
export function assertCommitableArtifact(chapterText, {
  chapter,
  minChars = MIN_CHAPTER_CHARS,
  force = false,
} = {}) {
  const { raw, chars } = countBodyChars(chapterText);
  if (!raw || chars === 0) {
    throw new EmptyArtifactError(
      `EmptyArtifact: 第 ${chapter} 章正文为空，严禁 MemoryUnit.commit / Git`,
      { chapter, chars: 0, minChars },
    );
  }
  if (chars < minChars && !force) {
    throw new EmptyArtifactError(
      `EmptyArtifact: 第 ${chapter} 章仅 ${chars} 字（阈值 ${minChars}），严禁提交状态与 Git`,
      { chapter, chars, minChars },
    );
  }
  return { chars, belowFloor: chars < minChars, forced: Boolean(force && chars < minChars) };
}

/**
 * 清除某一章的半吊子制品（正文 / states / scenes），崩溃自愈用
 */
export function purgeChapterDrafts(bookDir, chapterId) {
  const chapter = Number(chapterId);
  if (!Number.isFinite(chapter) || chapter < 1) return { purged: [] };
  const purged = [];
  const pad = String(chapter).padStart(4, '0');

  const chDir = path.join(bookDir, 'chapters');
  if (exists(chDir)) {
    for (const name of fs.readdirSync(chDir)) {
      if (name.startsWith(`${pad}_`) && name.endsWith('.md')) {
        fs.unlinkSync(path.join(chDir, name));
        purged.push(`chapters/${name}`);
      }
    }
  }

  const stateFile = chapterStatePath(bookDir, chapter);
  if (exists(stateFile)) {
    fs.unlinkSync(stateFile);
    purged.push(`states/ch_${pad}.json`);
  }

  const anchorFile = chapterAnchorPath(bookDir, chapter);
  if (exists(anchorFile)) {
    fs.unlinkSync(anchorFile);
    purged.push(`states/${chapterAnchorFileName(chapter)}`);
  }

  try {
    const brain = brainSystemDir(bookDir);
    for (const name of fs.readdirSync(brain)) {
      if (name.startsWith(`ch_${pad}`) && (
        name.endsWith('_scenes.json')
        || name.endsWith('_run.json')
        || name.endsWith('_plan.json')
      )) {
        // 保留 plan 可选；残缺 scenes/run 必须清
        if (name.endsWith('_scenes.json') || name.endsWith('_run.json')) {
          fs.unlinkSync(path.join(brain, name));
          purged.push(`brain/${name}`);
        }
      }
    }
  } catch { /* brain 可不存在 */ }

  return { chapter, purged };
}

/**
 * 运行时崩溃自愈：回滚到上一章干净态，并清掉失败章草稿
 */
export function recoverFailedChapter(bookDir, chapterId, { reason = 'task-failed' } = {}) {
  const chapter = Number(chapterId);
  const draft = purgeChapterDrafts(bookDir, chapter);
  let rollback = null;
  const prev = chapter - 1;
  if (prev >= 1) {
    try {
      rollback = gitRollbackToChapter(bookDir, prev);
    } catch (err) {
      rollback = { softError: err?.message || String(err), chapter: prev };
      console.warn('[MemoryUnit] recoverFailedChapter rollback 失败:', rollback.softError);
    }
  }
  return {
    ok: true,
    failedChapter: chapter,
    rolledBackTo: prev >= 1 ? prev : null,
    draft,
    rollback,
    reason,
  };
}

/**
 * @typedef {object} StateDiff
 * @property {string} [chapterText]
 * @property {string} [chapterTitle]
 * @property {object} [intent]
 * @property {object} [metrics]
 * @property {object[]} [scenes]
 * @property {object} [nextChapterPlan]
 * @property {object} [livingPrepare]  下一章提案（不得即时写 world_state）
 * @property {boolean} [force]
 * @property {boolean} [skipGitCli]
 */

/**
 * Phase 2: semantic StateDiff MUST go through State Evolution Engine.
 * buildStateDelta remains the operational shell used inside Evolution (EO-P2 empty plan path).
 */
export function buildStateDiff(bookDir, chapter, payload = {}) {
  return evolveFromChapter({
    bookDir,
    chapter,
    scenes: payload.scenes || [],
    intent: payload.intent || {},
    chapterText: payload.chapterText || '',
    metrics: payload.metrics || null,
    nextChapterPlan: payload.nextChapterPlan || null,
    force: Boolean(payload.force),
    livingPrepare: payload.livingPrepare || null,
    readerSimulator: payload.readerSimulator || null,
  });
}

function writeChapterMarkdown(bookDir, chapter, { chapterText, chapterTitle, intent }) {
  const text = String(chapterText || '').trim();
  const dir = path.join(bookDir, 'chapters');
  ensureDir(dir);
  const pad = String(chapter).padStart(4, '0');
  for (const name of fs.readdirSync(dir)) {
    if (name.startsWith(`${pad}_`) && name.endsWith('.md')) {
      fs.unlinkSync(path.join(dir, name));
    }
  }
  const title = chapterTitle || intent?.chapterTitle || `第${chapter}章`;
  const file = path.join(dir, `${pad}_${sanitizeTitle(title)}.md`);
  const body = text.startsWith('#') ? text : `# ${title}\n\n${text}`;
  writeText(file, body);
  return file;
}

/** 仅写正文（审计 defer：不写 anchor / 不 Git） */
export function writeChapterOnly(bookDir, chapter, stateDiff = {}) {
  return writeChapterMarkdown(bookDir, chapter, {
    chapterText: stateDiff.chapterText,
    chapterTitle: stateDiff.chapterTitle,
    intent: stateDiff.intent,
  });
}

/** 占位符判定（模板串 / no_causal_basis / 空值）→ 落盘时置 null */
function isTemplateFallbackIntent(value) {
  return !value || isTemplateFallback(String(value));
}

function writeAggregatedState(bookDir, chapter, stateDiff) {
  ensureDir(statesDir(bookDir));
  const blob = {
    version: 'memory-unit-1',
    chapter,
    committedAt: new Date().toISOString(),
    title: stateDiff.chapterTitle,
    intent: {
      pov: stateDiff.intent?.pov,
      // 占位符不落盘（no_causal_basis 等模板串曾直接进 states/ch_N.json）
      mainGoal: isTemplateFallbackIntent(stateDiff.intent?.mainGoal) ? null : stateDiff.intent?.mainGoal,
      mustLose: isTemplateFallbackIntent(stateDiff.intent?.mustLose) ? null : stateDiff.intent?.mustLose,
    },
    world: stateDiff.livingPrepare?.worldProposal || null,
    characters: stateDiff.livingPrepare?.characterProposals || null,
    facts: stateDiff.canonDelta?.facts || [],
    timeline: stateDiff.canonDelta?.timeline || null,
    current_state: stateDiff.canonDelta?.current_state || null,
    evolution: stateDiff.evolution || null,
    provenance: stateDiff.provenance || null,
    metrics: stateDiff.metrics,
    livingPrepare: stateDiff.livingPrepare || null,
    nextChapter: stateDiff.nextChapterPlan
      ? { chapter: chapter + 1, intent: stateDiff.nextChapterPlan.intent || null }
      : { chapter: chapter + 1 },
    force: Boolean(stateDiff.force),
  };
  const file = chapterStatePath(bookDir, chapter);
  writeJson(file, blob);
  return { file, blob };
}

/**
 * 构建并写入 ch_XXXX_anchor.yaml
 *
 * EO-P4 (W-17/W-18): relationship_state / closing_emotion = operational planner hints.
 * They are NOT relationship facts, Character Reality, or obtains.
 */
export function buildChapterAnchor(chapter, stateDiff = {}) {
  const intent = stateDiff.intent || {};
  const scenes = stateDiff.scenes || [];
  const ch = Number(chapter) || 1;
  const present = [
    intent.pov,
    ...(intent.present || []),
    ...scenes.flatMap((s) => s.entities || []),
  ].filter(Boolean);

  const relationship_state = deriveRelationshipState(intent, present, stateDiff, ch);
  const banned_elements = deriveBannedElements(intent, stateDiff, ch);
  const voiceDna = resolveAnchorVoiceDna(intent, stateDiff);
  const recent_actuals = buildRecentActuals(scenes);
  const state_ledger = evolveStateLedger(
    intent.priorAnchor?.state_ledger || stateDiff.priorAnchor?.state_ledger || null,
    { intent, recentActuals: recent_actuals, chapterText: stateDiff.chapterText, chapter: ch },
  );

  return {
    version: 'chapter-anchor-3',
    chapter: ch,
    current_date: String(intent.time || intent.currentDate || intent.current_date || '未标注').trim(),
    pov: String(intent.pov || '主角').trim(),
    location: String(intent.location || intent.place || '未标注').trim(),
    relationship_state,
    banned_elements,
    voiceDna,
    narrative_momentum: buildNarrativeMomentum(chapter, stateDiff, intent),
    recent_actuals,
    state_ledger,
    committedAt: new Date().toISOString(),
    d1InferenceDemotion: stampOpsHint({
      paths: ['deriveRelationshipState', 'deriveClosingEmotion', 'buildChapterAnchor'],
      relationship_state: 'operational_planner_hint_not_fact',
      closing_emotion: 'ops_hint_not_character_reality',
    }),
  };
}

/**
 * 章级软记忆：真实发生事件（scene.actualEvents，text-grounded）→ 下一章 Anchor 读回。
 * ≠ Canon timeline 写入（EO-P2 不变）；Plan 字段由 collectActualEventsFromScenes 剥离。
 * text 经 formatActualEventText 整形为完整句（结构化字段优先），上限 5 条配合 Prompt 预算。
 */
function buildRecentActuals(scenes = []) {
  const { events } = collectActualEventsFromScenes(scenes);
  const out = [];
  const seen = new Set();
  for (const ev of events) {
    const text = formatActualEventText(ev, 60);
    if (!text) continue;
    const key = text.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ sceneIndex: ev.fromScene ?? null, text });
  }
  return out.slice(0, 5);
}

/**
 * 把一条 actual event 变成可读完整句（优先结构化字段）。
 */
function formatActualEventText(ev, maxLen = 80) {
  if (!ev) return '';
  if (typeof ev === 'string') return cleanSentence(ev, maxLen);

  const action = String(ev.action || ev.act || '').trim();
  let consequence = String(ev.consequence || ev.outcome || '').trim();
  // 提取器的合成标记（场面动作已发生：X）不是叙事后果，不得参与拼接
  if (/^(场面动作已发生|action:|已发生：)/.test(consequence)) consequence = '';
  const summary = String(ev.summary || ev.text || '').trim();

  let text = '';
  if (action && consequence) {
    text = `${action}，导致${consequence}`;
  } else if (action) {
    text = action;
  } else if (consequence) {
    text = consequence;
  } else if (summary) {
    text = summary;
  } else {
    return '';
  }

  return cleanSentence(text, maxLen);
}

/**
 * 尽量保留完整句，避免「己改的。」这类残片。
 */
function cleanSentence(raw, maxLen = 80) {
  let t = String(raw || '')
    .replace(/\s+/g, ' ')
    .replace(/^[\s"'“”‘’「」『』【】\[\]（）()：:，,。.!！?？]+/, '')
    .trim();

  if (!t) return '';

  // 丢弃开头的残句碎片（如「己改的。」）：首句读符号出现过早 → 从下一句起
  const firstEnd = t.search(/[。！？!?；;]/);
  if (firstEnd >= 0 && firstEnd < 10 && t.length > firstEnd + 12) {
    t = t.slice(firstEnd + 1).replace(/^[\s“”‘'「」『』【】\[\]（）()：:，,]+/, '').trim();
  }

  if (t.length <= maxLen) return t;

  // 在 maxLen 内找最后一个句读，保留完整句
  const slice = t.slice(0, maxLen);
  const m = slice.match(/^(.*[。！？!?；;])/);
  if (m && m[1].length >= 12) {
    return m[1].trim();
  }

  return slice.trim() + '…';
}

/**
 * P1 状态台账：键化硬事实（道具归属 / 已支付代价 / 未关闭承诺）。
 * 规则少而硬——只信已支付代价与窄标记，不做性格/文风/词表猜测。
 */
function evolveStateLedger(prev, { intent, recentActuals, chapterText, chapter }) {
  const ledger = prev && typeof prev === 'object'
    ? JSON.parse(JSON.stringify(prev))
    : { version: 1, updated_chapter: chapter, items: [], locations: [], open_promises: [], settled_costs: [] };
  ledger.version = 1;
  ledger.updated_chapter = chapter;
  ledger.items = ledger.items || [];
  ledger.open_promises = ledger.open_promises || [];
  ledger.settled_costs = ledger.settled_costs || [];

  // 已支付代价 → settled_costs（幂等按 claim 去重）
  const mustLose = String(intent?.mustLose || '').trim();
  if (mustLose && mustLose !== 'no_causal_basis') {
    pushUnique(ledger.settled_costs, {
      id: `cost_ch${chapter}`,
      claim: mustLose.slice(0, 80),
      since_chapter: chapter,
    }, 'claim');
    applyKeyHandoff(ledger, intent, chapter);
  }

  // open_promises：actuals 带未闭合窄标记（没有记录/按了回去/折死/锁死/未读/翘着）
  const UNCLOSED_RE = /(没有记录|按了回去|折死|锁死|未读|未解|翘着)/;
  for (const a of recentActuals || []) {
    const t = String(a?.text || '').trim();
    if (!t || !UNCLOSED_RE.test(t)) continue;
    pushUnique(ledger.open_promises, {
      id: `p_ch${chapter}_${t.slice(0, 10)}`,
      claim: t.slice(0, 60),
      status: 'open',
      since_chapter: chapter,
    }, 'claim');
  }
  ledger.open_promises = ledger.open_promises.slice(0, 6);

  tryClosePromises(ledger, { recentActuals, chapterText, chapter });

  return ledger;
}

/**
 * open_promises 关闭规则（保守，宁可不关）：
 * 正文/actuals 明确出现闭环语言（查清/确认是/原来是/有记录…）
 * 且与 claim 有实词交集 → status: paid。
 */
function tryClosePromises(ledger, { recentActuals, chapterText, chapter }) {
  const actualsBlob = (recentActuals || []).map((a) => a?.text || '').join('\n');
  const corpus = `${actualsBlob}\n${String(chapterText || '').slice(0, 2000)}`;
  if (!corpus.trim()) return;

  const CLOSED_RE = /(查清|查实|确认是|原来是|有记录|记录在|真相是)/;
  if (!CLOSED_RE.test(corpus)) return;

  for (const p of ledger.open_promises || []) {
    if (!p || p.status !== 'open') continue;
    if (claimOverlap(p.claim, corpus)) {
      p.status = 'paid';
      p.paid_chapter = chapter;
    }
  }
}

/**
 * claim 与语料的实词交集（4→2 字片段，跳过虚词开头；只服务关闭判定）。
 */
function claimOverlap(claim, corpus) {
  const c = String(claim || '').replace(/\s/g, '');
  if (c.length < 4) return false;
  const flat = String(corpus || '').replace(/\s/g, '');
  for (let n = 4; n >= 2; n -= 1) {
    for (let i = 0; i <= c.length - n; i += 1) {
      const sub = c.slice(i, i + n);
      if (/^[的了在是有和与]/.test(sub)) continue;
      if (flat.includes(sub)) return true;
    }
  }
  return false;
}

/**
 * 极窄钥匙归属规则：语料含钥匙 + 交割动词（交给/交还/递给/递出/换给）
 * → holder 落交割对象（代词/空则 other）。禁止用泛化词（门/箱/冷）触发。
 */
function applyKeyHandoff(ledger, intent, chapter) {
  const corpus = [
    intent?.turningPoint, intent?.bargain, intent?.mainGoal, ...(intent?.obstacles || []),
  ].map((s) => String(s || '')).join('\n');
  if (!/钥匙/.test(corpus) || !/(交给|交还|递给|递出|换给)/.test(corpus)) return;

  const m = corpus.match(/(?:交给|交还|递给|递出|换给)([^\s，。、""''：:]{2,6})/);
  const holder = (m && m[1] && !/^(他|她|它|对方|别人)$/.test(m[1])) ? m[1] : 'other';
  const name = /配电间/.test(corpus) ? '配电间钥匙' : '钥匙';
  const id = name === '配电间钥匙' ? 'key_distribution_room' : 'key_general';
  const evidence = String(intent?.mustLose || '').slice(0, 40);

  const existing = ledger.items.find((i) => i && i.id === id);
  if (existing) {
    existing.holder = holder;
    existing.status = 'held';
    existing.since_chapter = chapter;
    existing.evidence = evidence;
  } else {
    ledger.items.push({ id, name, holder, status: 'held', since_chapter: chapter, evidence });
  }
}

function pushUnique(list, entry, key) {
  if (list.some((e) => e && e[key] === entry[key])) return;
  list.push(entry);
}

/**
 * 叙事动量：closing_emotion + forbidden_openings（下章 Scene1 强制继承）
 */
export function buildNarrativeMomentum(chapter, stateDiff = {}, intent = {}) {
  const text = String(stateDiff.chapterText || '').trim();
  const closing_emotion = deriveClosingEmotion(text, intent, stateDiff);
  const forbidden_openings = [
    '禁止用天气/闹钟/睁开眼开场',
    '禁止复述上一章已发生的同一事件',
    '禁止「就在这时」式硬切空降',
    ...(Array.isArray(intent.forbiddenOpenings) ? intent.forbiddenOpenings : []),
  ].filter(Boolean).slice(0, 8);

  return {
    version: 'narrative-momentum-1',
    fromChapter: Number(chapter) || 1,
    closing_emotion,
    forbidden_openings,
    mustInheritScene1: true,
    tailExcerpt: text.replace(/\s+/g, ' ').slice(-120),
  };
}

function deriveClosingEmotion(text = '', intent = {}, stateDiff = {}) {
  // EO-P4 (W-18): heuristic / ops hint for chapter seam — ≠ Character Reality / obtains.
  const tail = String(text).slice(-400);
  if (/倒计时|来不及|必须|消失/u.test(tail)) return '紧迫·倒计时压迫';
  if (/[？?]/u.test(tail)) return '疑虑·未解之问';
  if (/冷|沉默|门|离开/u.test(tail)) return '压抑·余波未平';
  if (/系统|刷新|异常/u.test(tail)) return '惊悚·规则压迫';
  if (intent.closingEmotion || intent.closing_emotion) {
    return String(intent.closingEmotion || intent.closing_emotion).slice(0, 40);
  }
  const fromSim = stateDiff.readerSimulator?.summary;
  if (fromSim) return String(fromSim).slice(0, 40);
  return '悬置·章末未落定';
}

function resolveAnchorVoiceDna(intent = {}, stateDiff = {}) {
  const dna = intent.voiceDna
    || stateDiff.voiceDna
    || intent.priorAnchor?.voiceDna
    || stateDiff.priorAnchor?.voiceDna
    || null;
  if (!dna || typeof dna !== 'object') {
    return {
      id: 'inherit-default',
      label: '章级 Voice DNA（待首次写入）',
      sentenceLength: 'mixed',
      rhythm: 'varied',
      dialogueRatio: 0.45,
      actionDensity: 'high',
      descriptionDensity: 'low',
      forced: true,
    };
  }
  return {
    ...dna,
    forced: true,
    inherited: Boolean(intent.priorAnchor?.voiceDna || stateDiff.priorAnchor?.voiceDna),
  };
}

function deriveRelationshipState(intent = {}, present = [], stateDiff = {}, chapter = 1) {
  // EO-P4 (W-17): plan-derived edges = operational planner hint — ≠ relationship fact / obtains.
  const uniq = [...new Set(present.map((n) => String(n).trim()).filter(Boolean))];
  const pairs = [];
  const pov = intent.pov || uniq[0] || '主角';
  for (const name of uniq) {
    if (name === pov) continue;
    pairs.push({
      from: pov,
      to: name,
      status: intent.bargain ? '博弈中' : '同场',
      tension: intent.mustLose ? '高' : '中',
      note: intent.obstacles?.[0] ? String(intent.obstacles[0]).slice(0, 40) : '',
      expectedTransition: {
        toStatus: intent.bargain ? '同盟或决裂' : '信任加深',
        byChapter: chapter + 2,
        reason: intent.turningPoint
          ? `随转折推进：${String(intent.turningPoint).slice(0, 36)}`
          : '下一至两章内关系须可见位移',
      },
    });
  }
  if (!pairs.length) {
    pairs.push({
      from: pov,
      to: '世界/系统',
      status: '对抗',
      tension: '高',
      note: '与异常规则对峙',
      expectedTransition: {
        toStatus: '知情对抗',
        byChapter: chapter + 1,
        reason: '确认规则后进入主动追查',
      },
    });
  }

  const living = stateDiff.livingPrepare?.characterProposals;
  if (Array.isArray(living)) {
    for (const c of living.slice(0, 4)) {
      if (!c?.name) continue;
      const existing = pairs.find((p) => p.to === c.name);
      if (existing && c.relation) existing.note = String(c.relation).slice(0, 40);
      else if (!existing && c.name !== pov) {
        pairs.push({
          from: pov,
          to: c.name,
          status: c.status || '变化中',
          tension: '中',
          note: String(c.relation || c.delta || '').slice(0, 40),
          expectedTransition: {
            toStatus: c.nextStatus || '关系改写',
            byChapter: chapter + 2,
            reason: c.transitionReason || 'Living 提案中的关系演化',
          },
        });
      }
    }
  }

  // Planner 显式覆盖（需带原因，由 planner 校验后写入 intent）
  if (intent.relationshipOverride?.edges?.length && intent.relationshipTransitionReason) {
    return {
      machine: 'relationship-state-v2',
      pov,
      present: uniq,
      edges: intent.relationshipOverride.edges.slice(0, 8).map((e) => ({
        ...e,
        expectedTransition: e.expectedTransition || {
          toStatus: e.status,
          byChapter: chapter + 1,
          reason: intent.relationshipTransitionReason,
        },
      })),
      overridden: true,
      transitionReason: intent.relationshipTransitionReason,
    };
  }

  return {
    machine: 'relationship-state-v2',
    pov,
    present: uniq,
    edges: pairs.slice(0, 8),
    overridden: false,
  };
}

/**
 * banned_elements: { text, expiresAtChapter|null }
 * expiresAtChapter = 禁止生效到该章（含）；之后自动失效
 */
function deriveBannedElements(intent = {}, stateDiff = {}, chapter = 1) {
  const banned = [];
  const pushBan = (text, expiresAtChapter = null) => {
    const t = String(text || '').trim();
    if (!t) return;
    banned.push({
      text: t,
      expiresAtChapter: expiresAtChapter == null ? null : Number(expiresAtChapter),
    });
  };

  // 继承上一章仍生效的禁令
  const prior = intent.priorAnchor?.banned_elements || stateDiff.priorAnchor?.banned_elements || [];
  for (const item of prior) {
    if (typeof item === 'string') {
      pushBan(item, null);
      continue;
    }
    if (item?.text) {
      const exp = item.expiresAtChapter;
      if (exp == null || Number(exp) >= chapter) pushBan(item.text, exp);
    }
  }

  const ending = String(intent.ending || intent.newForeshadow || '').trim();
  if (ending && !isTemplateFallback(ending)) pushBan(`禁止提前揭晓章末钩子：${ending.slice(0, 60)}`, chapter + 1);
  if (intent.mustLose && !isTemplateFallback(String(intent.mustLose))) {
    pushBan(`禁止无损撤回本章代价：${String(intent.mustLose).slice(0, 40)}`, chapter + 2);
  }
  pushBan('禁止重开篇式介绍世界观与主角履历', null);
  pushBan('禁止复述上一章已确认的同一事实（换角度推进）', chapter + 1);

  // 显式禁令（如「禁止兄妹关系直到第 5 章」）
  const explicit = intent.bannedElementsExplicit || intent.banned_elements_explicit || [];
  for (const item of explicit) {
    if (typeof item === 'string') {
      const m = item.match(/直到第\s*(\d+)\s*章/);
      pushBan(item, m ? Number(m[1]) : null);
    } else if (item?.text) {
      pushBan(item.text, item.expiresAtChapter ?? null);
    }
  }

  // 去重
  const seen = new Set();
  return banned.filter((b) => {
    const k = b.text;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  }).slice(0, 12);
}

function writeChapterAnchorFile(bookDir, chapter, stateDiff) {
  ensureDir(statesDir(bookDir));
  const anchor = buildChapterAnchor(chapter, stateDiff);
  const file = chapterAnchorPath(bookDir, chapter);
  writeYaml(file, anchor);
  console.log('[anchor] written to', file);
  return { file, anchor };
}

function tryRealGitCommit(bookDir, chapter, message) {
  try {
    execSync('git rev-parse --is-inside-work-tree', {
      cwd: bookDir,
      stdio: ['ignore', 'ignore', 'ignore'],
    });
  } catch {
    return { skipped: true, reason: 'not-a-git-repo' };
  }

  try {
    execSync('git add -- chapters states novel/_system/brain novel/_system/manifest.json 2>/dev/null || true', {
      cwd: bookDir,
      shell: '/bin/bash',
      stdio: ['ignore', 'ignore', 'ignore'],
    });
    // stage known paths explicitly (portable)
    const addPaths = ['chapters', 'states'];
    for (const p of addPaths) {
      const abs = path.join(bookDir, p);
      if (exists(abs)) {
        try {
          execSync(`git add -- "${p}"`, { cwd: bookDir, stdio: ['ignore', 'ignore', 'ignore'] });
        } catch { /* ignore */ }
      }
    }
    const msg = message || `inkos: commit chapter ${chapter}`;
    execSync(`git commit -m ${JSON.stringify(msg)} --allow-empty-message`, {
      cwd: bookDir,
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    let hash = null;
    try {
      hash = execSync('git rev-parse --short HEAD', { cwd: bookDir }).toString().trim();
    } catch { /* ignore */ }
    // 打章级 tag，供 rollbackToChapter → git checkout
    try {
      const tag = `inkos-ch-${chapter}`;
      execSync(`git tag -f ${JSON.stringify(tag)}`, {
        cwd: bookDir,
        stdio: ['ignore', 'ignore', 'ignore'],
      });
      return { committed: true, hash, tag };
    } catch {
      return { committed: true, hash, tag: null };
    }
  } catch (err) {
    return { skipped: true, reason: err?.message || 'git-commit-failed' };
  }
}

/**
 * 唯一物理落盘出口
 * @param {string} bookDir
 * @param {number} chapterId
 * @param {StateDiff} stateDiff
 */
export function commit(bookDir, chapterId, stateDiff = {}) {
  const chapter = Number(chapterId);
  if (!Number.isFinite(chapter) || chapter < 1) {
    throw new Error('MemoryUnit.commit: invalid chapterId');
  }

  // ⓪ Empty Artifact Guard — 任何 Git / states 写入之前硬拦截
  const artifact = assertCommitableArtifact(stateDiff.chapterText ?? '', {
    chapter,
    force: Boolean(stateDiff.force),
  });

  const diff = {
    ...stateDiff,
    chapter,
    chapterText: stateDiff.chapterText ?? '',
    chapterTitle: stateDiff.chapterTitle,
    intent: stateDiff.intent || {},
    canonDelta: stateDiff.canonDelta || evolveFromChapter({
      bookDir,
      chapter,
      scenes: stateDiff.scenes || [],
      intent: stateDiff.intent || {},
      chapterText: stateDiff.chapterText || '',
      metrics: stateDiff.metrics || null,
      nextChapterPlan: stateDiff.nextChapterPlan || null,
      force: Boolean(stateDiff.force),
    }).canonDelta,
  };

  // ① chapters/*.md
  const chapterFile = writeChapterMarkdown(bookDir, chapter, diff);

  // ② states/ 聚合 JSON
  const { file: stateFile, blob } = writeAggregatedState(bookDir, chapter, diff);

  // ②b ch_XXXX_anchor.yaml — 下一章 Planner 强制约束
  const { file: anchorFile, anchor } = writeChapterAnchorFile(bookDir, chapter, diff);

  // ②c Memory Hierarchy — L1 forever / L2 5章 / L3 关键Scene / L4 实体；每 5 章压缩
  let hierarchy = null;
  try {
    hierarchy = updateMemoryHierarchy(bookDir, chapter, {
      anchor,
      chapterText: diff.chapterText,
      scenes: diff.scenes || [],
      metrics: diff.metrics || null,
      narrativeMomentum: anchor.narrative_momentum,
    });
  } catch (err) {
    console.warn('[MemoryUnit] memory-hierarchy 更新失败（已忽略）:', err?.message || err);
  }

  // Canon（timeline/facts/current_state）仅由此口写入
  let canonResult = null;
  try {
    canonResult = applyStateDiffToCanon(bookDir, chapter, diff.canonDelta);
  } catch (err) {
    console.warn('[MemoryUnit] Canon 应用失败（正文/states 已写入）:', err?.message || err);
    canonResult = { softError: err?.message || String(err), nextChapter: chapter + 1 };
  }

  // 下一章任务卡（若 canonDelta 未带 next_chapter_task）
  // B 回声切断：用本章 finished intent + 本章刚生成的 anchor 派生，不复印旧目标
  if (diff.nextChapterPlan?.intent && !diff.canonDelta?.next_chapter_task) {
    writeNextChapterTask(bookDir, chapter + 1, deriveNextChapterIntent(
      diff.nextChapterPlan.intent,
      anchor,
      { nextChapter: chapter + 1 },
    ));
  }

  updateManifestChapter(bookDir, chapter);

  // ③ Git Memory 原子快照（含 chapters + states）
  const snapshot = createSnapshot(bookDir, {
    chapter,
    label: `ch_${chapter} memory-unit commit`,
    memoryUnit: true,
    chapterFile,
    stateFile,
    anchorFile,
  });

  const gitCli = diff.skipGitCli
    ? { skipped: true, reason: 'skipGitCli' }
    : tryRealGitCommit(bookDir, chapter, `inkos(ch${chapter}): ${diff.chapterTitle || 'chapter commit'}`);

  return {
    ok: true,
    chapter,
    chapterFile,
    stateFile,
    anchorFile,
    anchor,
    hierarchy: hierarchy
      ? {
        file: hierarchy.file,
        compression: hierarchy.compression,
      }
      : null,
    state: blob,
    canon: canonResult,
    snapshot,
    gitCli,
    artifact,
    committedAt: blob.committedAt,
  };
}

/**
 * 章后 Living Prepare 提案 — 仅更新 states 中的 livingPrepare 字段
 * 不得写 world_state / character_brains（留给下一章 Prepare 应用）
 */
export function commitLivingPrepare(bookDir, chapterId, livingPrepare) {
  const chapter = Number(chapterId);
  if (!Number.isFinite(chapter) || chapter < 1) {
    throw new Error('MemoryUnit.commitLivingPrepare: invalid chapterId');
  }
  ensureDir(statesDir(bookDir));
  const prev = readChapterState(bookDir, chapter) || {
    version: 'memory-unit-1',
    chapter,
  };
  const blob = {
    ...prev,
    livingPrepare: {
      ...livingPrepare,
      analysisOnly: true,
      attachedAt: new Date().toISOString(),
    },
    updatedAt: new Date().toISOString(),
  };
  const file = chapterStatePath(bookDir, chapter);
  writeJson(file, blob);

  // 轻量快照，保证 Prepare 提案也可回滚找回
  const snapshot = createSnapshot(bookDir, {
    chapter,
    label: `ch_${chapter} living-prepare`,
    livingPrepareOnly: true,
  });

  return { ok: true, chapter, stateFile: file, livingPrepare: blob.livingPrepare, snapshot };
}

export function readChapterState(bookDir, chapter) {
  const file = chapterStatePath(bookDir, chapter);
  if (!exists(file)) return null;
  try {
    return readJson(file);
  } catch {
    return null;
  }
}

/** 下一章 Prepare：只读读取上章 livingPrepare 提案，不写运行态 */
export function loadLivingPrepareInput(bookDir, fromChapter) {
  const state = readChapterState(bookDir, fromChapter);
  return state?.livingPrepare || null;
}

/**
 * 回退到指定章：经 Git Memory 全量还原，防止局部污染
 */
export function rollbackToChapter(bookDir, chapterId) {
  const chapter = Number(chapterId);
  if (!Number.isFinite(chapter) || chapter < 0) {
    throw new Error('rollbackToChapter: invalid chapterId');
  }

  const result = gitRollbackToChapter(bookDir, chapter);

  // 真实 git：若存在 tag inkos-ch-N 则尝试 checkout（最佳努力）
  try {
    execSync('git rev-parse --is-inside-work-tree', {
      cwd: bookDir,
      stdio: ['ignore', 'ignore', 'ignore'],
    });
    const tag = `inkos-ch-${chapter}`;
    try {
      execSync(`git rev-parse ${tag}`, { cwd: bookDir, stdio: ['ignore', 'ignore', 'ignore'] });
      execSync(`git checkout -f ${tag}`, { cwd: bookDir, stdio: ['ignore', 'ignore', 'ignore'] });
      result.gitCheckout = tag;
    } catch {
      result.gitCheckout = null;
    }
  } catch {
    result.gitCheckout = null;
  }

  return result;
}

export const MemoryUnit = {
  commit,
  commitLivingPrepare,
  buildStateDiff,
  buildChapterAnchor,
  buildNarrativeMomentum,
  loadChapterAnchor,
  chapterAnchorPath,
  readChapterState,
  loadLivingPrepareInput,
  rollbackToChapter,
  recoverFailedChapter,
  purgeChapterDrafts,
  writeChapterOnly,
  assertCommitableArtifact,
  EmptyArtifactError,
  MIN_CHAPTER_CHARS,
  listSnapshots,
};
