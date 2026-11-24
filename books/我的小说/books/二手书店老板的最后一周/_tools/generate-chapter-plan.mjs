#!/usr/bin/env node
// ============================================================================
// P1 · Authored-Plan 生成器（零 planner.js 改动）— IRP v0.1 协议化渲染
// ----------------------------------------------------------------------------
// 把「缺口感知 / 节拍功能 / 支线推进 / 角色代价」按协议前缀渲染进
// chapter_plans/chapter_NNNN.yaml 的 prose 字段（goal/scenes/hook/cost/foreshadow），
// 因为这些是 serializeAuthoredPlanToIntent 的白名单收割字段（见
// memory/inkos-authored-plan-serializer + docs/inkos-intent-rendering-protocol-v0.1.md）。
// 结构化智能（缺口列表/里程碑约束/支线事件）放进 `_plan_note`——serializer 不读，
// 纯作者记录，也供下一章生成器读取「承接」。
//
// 协议要点：
//   - goal      → 【主线推进】/【缺口管理】/【支线交汇】（≤2 前缀）
//   - scenes[i] → 【节拍功能: setup|advance|reveal】+ 可选的【认知缺口: 推进 gap_0XX】
//                 （serializer 会把场景文本截到 150 字，前缀必须紧凑、叙事放优先位）
//   - hook      → 【钩子类型: 认知缺口|情绪悬念|反转】
//   - cost      → 【角色代价: 咽回的话|信任破裂|身份暴露|失去之物】
//   - foreshadow→ 【新伏笔: X→同型回收体系】/【伏笔回收: H###】
//   - POV 渲染前校验 entrance_chapter（character-roster.yaml），不合法即拒绝。
//
// 用法：
//   node _tools/generate-chapter-plan.mjs            # 默认写 unlockedThrough+1 章
//   node _tools/generate-chapter-plan.mjs 2          # 指定章
//   node _tools/generate-chapter-plan.mjs 2 --dry    # 只打印不写文件
//   node _tools/generate-chapter-plan.mjs 2 --out /tmp/ch2.yaml   # 写到自定义路径（供 pilot）
//
// 依赖真实 Brain/Core 代码（resolveChapterMapContext / readYaml / writeYaml），
// 保证派生结果与 saveStoryMap、orchestrator 完全一致。
// ============================================================================

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { readYaml, writeYaml } from '../../../../../packages/inkos-core/src/lib/yaml-store.js';
import { resolveChapterMapContext } from '../../../../../packages/inkos-brain/src/planner/story-map.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const getArg = (name) => {
  const i = args.indexOf(name);
  if (i >= 0 && args[i + 1]) return args[i + 1];
  const eq = args.find((a) => a.startsWith(`${name}=`));
  return eq ? eq.split('=').slice(1).join('=') : null;
};
// CLI（生产入口）：
//   node _tools/generate-chapter-plan.mjs --chapter 12 --book /path/to/book [--review] [--dry] [--force] [--out x]
const targetChapter = (() => {
  const f = getArg('--chapter');
  if (f && /^\d+$/.test(f)) return Number(f);
  const pos = args.find((a) => /^\d+$/.test(a)); // 向后兼容：位置参数
  return pos ? Number(pos) : null;
})();
const dry = args.includes('--dry');
const review = args.includes('--review');
const force = args.includes('--force');
const outArg = getArg('--out');
const bookArg = getArg('--book');
const plantArg = getArg('--plant'); // 作者预审覆盖：本章新埋物证（启发式结果不可靠时）
const jsonMode = args.includes('--json'); // 机器输出（Studio 抽屉用）：隐含 dry，--force 才写盘
const overrideGoal = getArg('--override-goal'); // 作者覆写：goal 整段替换（预审抽屉回传）
const overrideScenesRaw = getArg('--override-scenes'); // 作者覆写：JSON 数组字符串（逐 beat）
let overrides = {};
if (overrideGoal != null) overrides.goal = overrideGoal;
if (overrideScenesRaw != null) {
  try {
    const arr = JSON.parse(overrideScenesRaw);
    if (!Array.isArray(arr)) throw new Error('不是数组');
    overrides.scenes = arr.map(String);
  } catch {
    console.error('[P1] --override-scenes 需是 JSON 数组字符串，如 --override-scenes \'["beat1","beat2"]\'');
    process.exit(1);
  }
}
const hasOverrides = Object.keys(overrides).length > 0;
// 书目录：--book 优先（生产路径），否则默认本脚本所在书（二手书店老板的最后一周）
const bookDir = bookArg ? path.resolve(bookArg) : path.resolve(__dirname, '..');
const repoRoot = path.resolve(bookDir, '../../../..');

const VOL = path.join(bookDir, 'novel/10_volume_outline/vol_01.md');
const GAPS = path.join(bookDir, 'novel/_system/story-map/cognitive-gaps.yaml');
const THREADS = path.join(bookDir, 'novel/_system/story-map/plot-threads.yaml');
const ROSTER = path.join(bookDir, 'novel/_system/story-map/character-roster.yaml');
const PLANS = path.join(bookDir, 'novel/_system/chapter_plans');

// ---------------------------------------------------------------------------
// 0. 角色名册 → POV 合法性校验（IRP v0.1 第 4.7 条）
// ---------------------------------------------------------------------------
export function loadCharacterRoster(dir = bookDir) {
  const roster = readYaml(path.join(dir, 'novel/_system/story-map/character-roster.yaml'));
  return roster?.characters || [];
}

export function validatePov(ch, pov, dir = bookDir) {
  if (!pov) return { ok: false, reason: `pov 为空` };
  const roster = loadCharacterRoster(dir);
  const c = roster.find((x) => x.name === pov);
  if (!c) return { ok: false, reason: `pov「${pov}」不在角色名册（character-roster.yaml）` };
  if (c.pov_allowed === false) {
    return { ok: false, reason: `pov「${pov}」在角色名册标记为不可作 POV` };
  }
  const ent = Number(c.entrance_chapter);
  if (!Number.isFinite(ent) || ent > ch) {
    return { ok: false, reason: `pov「${pov}」入场章=${c.entrance_chapter} > 当前章 ${ch}，禁止提前出场` };
  }
  return { ok: true, entrance_chapter: ent };
}

// ---------------------------------------------------------------------------
// 1. 解析 vol_01.md → 本章事实（事件 / 结尾 / 基调 / 字数）
// ---------------------------------------------------------------------------
function parseVolChapter(text, ch) {
  // ① 前三章基调行：- 第N章 · 基调｜事件：…｜结尾：…｜字数：NNNN
  const toneRe = new RegExp(`- 第${ch}章 · ([^｜]+)｜事件：([^｜]+)｜结尾：([^｜]+)｜字数：([0-9]+)`, 'u');
  const m = text.match(toneRe);
  if (m) {
    return { title: null, tone: m[1].trim(), event: m[2].trim(), ending: m[3].trim(), wordTarget: Number(m[4]) };
  }
  // ② 回退：### 第N章 · 标题 段落
  const sec = text.match(new RegExp(`### 第${ch}章[^\\n]*\\n([\\s\\S]*?)(?=\\n### |\\n## |\\n# |$)`, 'u'));
  if (sec) {
    return {
      title: (text.match(new RegExp(`### 第${ch}章 · ([^\\n]+)`, 'u')) || [])[1] || null,
      tone: '',
      event: sec[1].trim().split('\n')[0].trim(),
      ending: '',
      wordTarget: null,
    };
  }
  return null;
}

function prevPlanPath(ch, dir = bookDir) {
  return ch > 1 ? path.join(dir, 'novel/_system/chapter_plans', `chapter_${String(ch - 1).padStart(4, '0')}.yaml`) : null;
}

// 承接上章：读上一章计划的 hook/ending，抽一句「还没被回答的东西」作承接语
function loadPrevChapterCarry(ch, dir = bookDir) {
  const prevPath = prevPlanPath(ch, dir);
  if (!prevPath) return '';
  const prev = readYaml(prevPath);
  const hook = prev?.hook || prev?.ending || '';
  if (!hook) return '';
  const first = String(hook).split(/[。！？]/u)[0].trim().replace(/[「」"'（）()]/gu, '');
  return first ? `上章末，${first}——这些悬在心头的事，还没有被回答。` : '';
}

// ---------------------------------------------------------------------------
// 2. 缺口账本 → 本章「推进 / 承接 / 不解答」三态
// ---------------------------------------------------------------------------
function loadGapDirectives(ch, prevPlan, dir = bookDir) {
  const gaps = readYaml(path.join(dir, 'novel/_system/story-map/cognitive-gaps.yaml'))?.gaps || [];
  const open = gaps.filter((g) => !['resolved', 'cut'].includes(g.status));
  const sameCh = (g) =>
    String(g.expected_reveal_ch || '').includes(`ch_00${ch}`) || String(g.expected_reveal_ch || '').includes(`第${ch}章`);

  // advance：本章计划揭示的缺口（expected_reveal_ch 指向本卷章号）
  const advance = open.filter(sameCh);
  // carried：上一章把悬念推进到本章待回收的缺口 → 本章只推进不解答
  const prevAdvance = prevPlan?._plan_note?.advanceGaps || [];
  const carried = [];
  const seen = new Set();
  const maybeCarry = (g) => {
    if (!g || seen.has(g.id) || sameCh(g)) return;
    seen.add(g.id);
    carried.push(g);
  };
  // ① 上一章 _plan_note.advanceGaps 显式传播
  for (const g of prevAdvance) {
    const hit = open.find((x) => x.id === g.id || x.title === g.title);
    if (hit) maybeCarry(hit);
  }
  // ② 兜底：上一章 hook/ending 叙事里「露过面」的缺口——用标题里的引号名（「等你」）做精确
  //    关键词匹配，避免中文字符级误判（「是」「的」到处都有）；retention 型（如「目录」会不会死）
  //    是每章常驻节拍而非待回收悬念，不进入 carried。
  const prevHook = String(prevPlan?.hook || prevPlan?.ending || '');
  const gapKeywords = (g) => {
    const quoted = (g.title.match(/「[^」]+」/u) || [])[0];
    return quoted ? [quoted.replace(/[「」]/gu, '')] : [g.title.slice(0, 4)];
  };
  for (const g of open) {
    if (g.type === 'retention') continue;
    if (gapKeywords(g).some((k) => k.length >= 2 && prevHook.includes(k))) maybeCarry(g);
  }
  // protect：更晚才揭晓、本章绝不能偷跑的（供作者笔记）——按 urgency 高→低取前 4
  const carriedIds = new Set(carried.map((g) => g.id));
  const urgencyRank = (g) => ({ high: 0, medium: 1, low: 2 })[g.urgency] ?? 1;
  const protect = open
    .filter((g) => !sameCh(g) && !carriedIds.has(g.id))
    .sort((a, b) => urgencyRank(a) - urgencyRank(b))
    .slice(0, 4);

  return {
    advance: advance.map((g) => ({ id: g.id, title: g.title, ref: g.foreshadowing_ref })),
    carried: carried.map((g) => ({ id: g.id, title: g.title, ref: g.foreshadowing_ref })),
    protect: protect.map((g) => ({ id: g.id, title: g.title })),
  };
}

// ---------------------------------------------------------------------------
// 3. 协议前缀（IRP v0.1 词汇表）
// ---------------------------------------------------------------------------
function goalPrefix(ctx, gaps) {
  const parts = ['【主线推进】'];
  if (gaps.advance.length) {
    parts.push(`【缺口管理】推进 ${gaps.advance.map((g) => g.id).join('/')}，不闭合`);
  } else if (gaps.carried.length) {
    parts.push(`【缺口管理】承接 ${gaps.carried.map((g) => g.id).join('/')}，只推进不解答`);
  }
  const t = (ctx.activeThreads || [])[0];
  if (t && t.threadId !== 'main_core' && parts.length < 2) parts.push('【支线交汇】');
  return parts.slice(0, 2).join(' ');
}

const BEAT_FN = ['setup', 'advance', 'reveal']; // 三场景骨架
function scenePrefix(idx, gaps) {
  const fn = BEAT_FN[idx - 1] || 'advance';
  let p = `【节拍功能: ${fn}】`;
  // 认知缺口：开场场景若承接上章悬念，标「推进不解答」（≤2 前缀约束内）
  if (idx === 1 && gaps.carried.length) p += `【认知缺口: 推进 ${gaps.carried[0].id}】`;
  return p;
}

function hookTypePrefix(facts) {
  const e = `${facts.ending || ''}${facts.event || ''}`;
  if (/(卡|纸片|照片|字迹|借阅卡|手帕|枯叶|叶子)/u.test(e)) return '【钩子类型: 认知缺口】';
  if (/(离开|背影|告别|转身|走了)/u.test(e)) return '【钩子类型: 情绪悬念】';
  return '【钩子类型: 反转】';
}

function costTypePrefix(facts, volTone = {}) {
  const e = `${facts.event || ''}${facts.ending || ''}`;
  if (/(撒谎|谎|咽|说不出口|没说出口)/u.test(e)) return '【角色代价: 咽回的话】';
  if (/(暴露|被认出|戳穿)/u.test(e)) return '【角色代价: 身份暴露】';
  if (/(失去|烧掉|拆|关门|离开)/u.test(e)) return '【角色代价: 失去之物】';
  // 卷级默认（novel/_system/volume_tones.yaml）：chapter 信号未命中时按卷取基调。
  // 换卷只改配置不改代码——卷 1 压抑（咽回的话）、卷 2 爆发（撕破的脸）、卷 3 虚无（无声的叹息）。
  // loadVolumeTone 返回 { vol, tone: cfg块 }，cost_prefix 在 tone 下；兼容裸配置两种形状。
  const cp = volTone.cost_prefix || volTone.tone?.cost_prefix;
  if (cp) return `【角色代价: ${cp}】`;
  return '【角色代价: 咽回的话】';
}

function foreshadowPrefix(gaps, facts, plantOverride) {
  if (gaps.advance.length) return `【伏笔回收: ${gaps.advance[0].ref || 'H###'}】`;
  const plant = extractPlant(facts, plantOverride);
  if (plant) return `【新伏笔: ${plant.replace(/[「」]/gu, '')}→同型回收体系】`;
  return '';
}

// ---------------------------------------------------------------------------
// 4. 组装 plan（协议前缀进 prose 字段；结构化笔记进 _plan_note）
// ---------------------------------------------------------------------------
function dayOf(ch) {
  const days = ['Day 0', 'Day 1', 'Day 2', 'Day 3', 'Day 4', 'Day 5', 'Day 6'];
  return days[ch - 1] || `Day ${ch - 1}`;
}

function stripQuote(s) {
  return String(s || '').replace(/[「」"'（）()]/gu, '');
}

function composeGoal(facts, ctx, gaps, carry) {
  const prefix = goalPrefix(ctx, gaps);
  const tone = facts.tone ? stripQuote(facts.tone).replace(/[。！？]+$/u, '') : '';
  const milestoneHint =
    ctx.chapterFunction === 'milestone' && ctx.milestone
      ? `本章是卷内里程碑，必须落到「${stripQuote(ctx.milestone.event)}」。`
      : ctx.nextMilestone && ctx.distanceToMilestone <= 2
        ? `本章须为「${stripQuote(ctx.nextMilestone)}」完成情感前置。`
        : '';
  const gapClause = gaps.carried.length
    ? `对${gaps.carried.map((g) => `「${stripQuote(g.title)}」`).join('、')}只推进、不解答——用物证与质感加深悬疑，绝不给答案。`
    : '对悬而未决的悬念只推进、不解答——用物证与质感加深悬疑，绝不给答案。';
  return `${prefix} ${tone ? `${tone}。` : '沉缓的日常里。'}${facts.event}本章的折痕是一个被咽回去的句子：有人看破不说破，有人用一个体面的借口维持处境。${carry}${milestoneHint}${gapClause}POV 林守常——只写他看见的与咽回去的，不写答案。`;
}

function composeConflict(facts) {
  return (
    `表面冲突是「${stripQuote(facts.event)}」。真正的冲突不在动作，而在没说出口的话：` +
    `一方不肯承认自己的窘迫，另一方不肯戳穿这个谎。若本章没有这样一个「被咽回去的句子」作折痕，` +
    `场景就只是日常流水账——写作时让每一个停顿都压着话。`
  );
}

function composeClimax(facts) {
  return facts.ending ? `${facts.ending}` : `收束在一个静默动作上：${stripQuote(facts.event)}——没有台词，只有动作。`;
}

function composeCost(facts, plantOverride, volTone) {
  const relic = extractPlant(facts, plantOverride);
  const r = relic ? stripQuote(relic).slice(0, 12) : '旧物';
  return (
    `${costTypePrefix(facts, volTone)}他接住的不是一件买卖，是一个不肯说出口的处境——他用「多做一点、多给一分」的方式` +
    `替对方的体面买单，代价是他越来越熟练地接受「告别不必被说出来」。真正的损失不在钱，` +
    `在每一次被咽回去的话、每一件被轻轻放下又收进抽屉的${r}。`
  );
}

// 叙事化钩子：结尾收在小物被归置的余波上（按收尾物件给出「推进不解答」的质感回扣）
function narrativeHookEcho(facts) {
  const e = facts.ending || '';
  if (/(借阅卡|卡片|卡)/u.test(e)) return '他盯着那张卡看了两秒——卡缘微微卷着，像被压在某本书里很多年。他没有把它放回原处，只把抽屉推上。';
  if (/手帕/u.test(e)) return '手帕上那个模糊的字，他看见了，没说——有些痕迹，只该被收好。';
  if (/枯叶|叶子/u.test(e)) return '他站在门口，往门槛内侧看了一眼——什么也没有。那片叶子，不知道还会不会有人放回来。';
  return '他把它收进抽屉最里面，没有放回原处——安静里，悬着一点什么。';
}

function composeHook(facts) {
  if (!facts.ending) return `收束在一个静默动作上：${stripQuote(facts.event)}——没有台词，只有动作。`;
  const last = facts.ending.split('。').filter(Boolean).pop().trim();
  return `${hookTypePrefix(facts)}${last}。${narrativeHookEcho(facts)}`;
}

function composeScenes(facts, ctx, gaps, carry) {
  const tone = facts.tone ? stripQuote(facts.tone).replace(/[。！？]+$/u, '') : '';
  const eventClauses = facts.event.split('。').filter((s) => s.trim()).map((s) => s.trim());
  const scenes = [];
  const narr = (idx, body) => `${scenePrefix(idx, gaps)}${body}`;
  if (eventClauses.length >= 2) {
    scenes.push(narr(1, `${carry ? carry : ''}${tone ? `${tone}。` : ''}${eventClauses[0]}。`));
    scenes.push(narr(2, `${eventClauses[1]}——真正的话没说出口，一个动作代替了它。`));
    scenes.push(narr(3, facts.ending ? facts.ending : '一个静默的收束动作。'));
  } else {
    scenes.push(narr(1, `${tone ? `${tone}。` : ''}${facts.event}。`));
    scenes.push(narr(2, '冲突落在「没说出口的话」上——一个动作代替一句话。'));
    scenes.push(narr(3, facts.ending ? facts.ending : '归置一个小物，悬念变厚而不解答。'));
  }
  return scenes;
}

// ---------------------------------------------------------------------------
// 4.5 每拍叙事推进 + 环境关键词（deriveBeats）
// 把每个场景摘要切成 3-6 拍，每拍一句 narrativePush + 匹配场景环境词表的 envKeywords。
// 产出 beats 键（scene1/2/3 → [{order, narrativePush, envKeywords, wordTarget}]），
// 供 Studio beat-slimmer 的 loadSceneContext 读取（七元素 prompt 的【叙事推进】【环境触发器】）。
// 场景文本是压缩摘要，拆拍是启发式：优先子句粒度（≤6 拍），否则退回句粒度。
// ---------------------------------------------------------------------------
const ENV_NOUNS = [
  '梧桐叶', '门闩', '煤炉', '煤块', '猫', '抽屉', '橘子', '陶庵梦忆',
  '书脊', '浆糊', '书页', '门轴', '灰烬', '钉子', '门框', '煤火',
  '纸页', '卷帘', '柜台', '脚步声', '铁锈', '霉味', '烟草味', '木屑', '橘皮',
];

function deriveBeats(sceneTexts, ch, dir) {
  const env = (() => {
    try {
      return readYaml(path.join(dir, 'novel/_system/scene_environments.yaml'));
    } catch {
      return null;
    }
  })();
  const beats = {};
  sceneTexts.forEach((sceneText, i) => {
    const key = `scene${i + 1}`;
    const body = String(sceneText || '')
      .replace(/^场景\d+：[^—]*——/u, '') // 剥「场景N：标题——」导演语前缀
      .replace(/【[^】]+】/gu, '') // 剥【节拍功能】【认知缺口】协议前缀
      .replace(/「|」/gu, '')
      .trim();
    const isMeta = (c) => /禁止|不会出现|本场景|勿写|避免/u.test(c) || [...c].length < 3;
    const sentences = body.split(/[。！？；\n]/u).map((s) => s.trim()).filter(Boolean).filter((c) => !isMeta(c));
    // 子句粒度：全拆成段；句粒度优先（避免把「但绝不过度」这类语气片段当拍），
    // 只有句子不足 2 时才退回子句拆（保持 3-6 拍）
    const segments = body.split(/[。！？；，、\n]/u).map((s) => s.trim()).filter(Boolean).filter((c) => !isMeta(c));
    let clauses = sentences.length >= 2 ? sentences : segments;
    // 兜底：太短/全被滤掉时给一个静默收束拍
    if (!clauses.length) clauses = ['一个静默的收束动作。'];
    // cap 6：超出的并入最后一拍
    const capped = [];
    for (const c of clauses) {
      if (capped.length >= 6) capped[capped.length - 1] = `${capped[capped.length - 1]}。${c}`;
      else capped.push(c);
    }
    const sceneEnv = env?.scenes?.[`ch${ch}_scene${i + 1}`]?.environment;
    const envItems = [sceneEnv?.visual, sceneEnv?.tactile, sceneEnv?.olfactory, sceneEnv?.auditory]
      .filter(Boolean)
      .join('，');
    // 环境关键词候选：整书词表去重（环境配置覆盖多场景时可能跨场景出现）
    const envAll = env?.scenes ? Object.values(env.scenes).flatMap((s) => {
      const e = s?.environment || s;
      return [e?.visual, e?.tactile, e?.olfactory, e?.auditory].filter(Boolean).join('，');
    }) : [];
    beats[key] = capped.map((c, idx) => {
      // ① 优先：拍文本词且当前场景环境可命中（extractEnvTrigger 用 .includes 匹配条目）
      const strict = ENV_NOUNS.filter((n) => c.includes(n) && sceneEnv && envItems.includes(n));
      // ② 兜底：拍文本词（无环境配置/词不在本场景时，保留叙事词供后续配置命中）
      const loose = strict.length ? strict : ENV_NOUNS.filter((n) => c.includes(n) && envAll.some((s) => s.includes(n)));
      const matched = (loose.length ? loose : ENV_NOUNS.filter((n) => c.includes(n)))
        .sort((a, b) => b.length - a.length)
        .slice(0, 2);
      return {
        order: idx + 1,
        narrativePush: c.slice(0, 60),
        envKeywords: matched,
        wordTarget: 180,
      };
    });
  });
  return beats;
}

function composeEmotionalBeat(facts) {
  return (
    `从开篇的滞涩与微疑，到中段的温柔角力，再到收束时一个静默动作的落定，` +
    `最后落在一丝悬而未决的凉意上——像煤炉将熄未熄时那一点暗红的光。` +
    (facts.tone ? `（本章情绪线：${facts.tone}）` : '')
  );
}

function composeObstacle2(ctx) {
  const t = ctx.activeThreads?.[0];
  if (t) return `本章由「${t.threadName}」承载：${t.thisChapterEvent || '推进'}。支线推进时，主线悬念保持不解答。`;
  return '信息不完整：对方的真实处境只露一角。';
}

function composeBargain(facts, plantOverride) {
  const t = stripQuote(facts.tone) || '这一来一回';
  const relic = extractPlant(facts, plantOverride);
  const r = relic ? stripQuote(relic).slice(0, 12) : '旧物';
  return `「${t}」——没有人把话说破，物的流转（${r}、一句没说完的话、一次没回头的离开）就是他们之间唯一的契约。`;
}

// 本章「新埋物证」抽取（启发式，供 mustGain / foreshadow / cost / bargain 复用）：
// 优先顺序 —— ① 抽出一张「X」（借阅卡持卡对象）② 绣/写/刻着字的物件（发现型物证）
// ③ 引号物（剔除「目录」等常驻角色 / 世界物件）④ 首现名词。
// 启发式非权威：作者预审可 --plant 覆盖（见 main）。
function extractPlant(facts, override) {
  if (override) return override;
  const e = facts.ending || '';
  const card = e.match(/抽出一张「([^」]+)」/u);
  if (card) return `借阅卡「${card[1]}」`;
  const stitched = e.match(/(手帕|卡片|纸片|枯叶)[^。]{0,12}(绣着|写着|刻着|缝着)/u);
  if (stitched) return stitched[1];
  const bracket = e.match(/「[^」]{2,20}」/u);
  if (bracket && !/目录|木牌|报纸|湖心亭看雪/u.test(bracket[0])) return bracket[0];
  const noun = e.match(/(手帕|借阅卡|卡片|纸片|枯叶|橘子)/u);
  return noun ? noun[1] : '';
}

function composeMustGain(ctx, gaps, facts, plantOverride) {
  const parts = [];
  const plant = extractPlant(facts, plantOverride);
  // 新埋物证最优先（它是本章「留下什么」的具体答案）
  if (plant) parts.push(`新埋物证：${plant}，留待后续同型回收。`);
  if (gaps.advance.length) parts.push(`本章揭示：${gaps.advance.map((g) => g.title).join('、')}。`);
  if (gaps.carried.length) parts.push(`承接推进（不解答）：${gaps.carried.map((g) => g.title).join('、')}。`);
  if (ctx.milestone) parts.push(`里程碑（${stripQuote(ctx.milestone.event)}）在本章落地。`);
  return parts.join('') || '本章为后续转折埋下物证。';
}

function composeForeshadow(gaps, facts, plantOverride) {
  const head = [];
  const tail = [];
  const prefix = foreshadowPrefix(gaps, facts, plantOverride);
  if (prefix) head.push(prefix);
  const plant = extractPlant(facts, plantOverride);
  // 前缀后紧跟本章实际落下的物证叙事（卫生规则 6：前缀后必须有正文）
  if (plant) head.push(`${plant}在本章留下，留待后续同型回收。`);
  for (const g of gaps.carried.slice(0, 2)) tail.push(`承接推进（不解答）：${g.title}，后文回收（${g.ref || '待定'}）。`);
  for (const g of gaps.advance.slice(0, 2)) tail.push(`本章落地：${g.title}（${g.ref || '待定'}）。`);
  if (!head.length && !tail.length) return `新伏笔：${plant || '待定'}。`;
  return head.join('') + tail.join('；');
}

function composeLocation() {
  return '二手书店——柜台、门槛、地砖、抽屉';
}

function composePlan(ch, facts, ctx, gaps, carry, { plant, volTone } = {}) {
  const plan = {
    chapter: ch,
    goal: composeGoal(facts, ctx, gaps, carry),
    conflict: composeConflict(facts),
    climax: composeClimax(facts),
    cost: composeCost(facts, plant, volTone),
    hook: composeHook(facts),
    scenes: composeScenes(facts, ctx, gaps, carry),
    emotional_beat: composeEmotionalBeat(facts),
    obstacle1: composeConflict(facts),
    obstacle2: composeObstacle2(ctx),
    ending: composeHook(facts),
    bargain: composeBargain(facts, plant),
    mustGain: composeMustGain(ctx, gaps, facts, plant),
    pov: ctx.pov || '林守常',
    time: dayOf(ch),
    location: composeLocation(),
    wordTarget: facts.wordTarget || 1500,
    foreshadow: composeForeshadow(gaps, facts, plant),
  };
  // 作者侧结构化笔记：serializer 白名单之外，纯记录；下一章生成器靠它取「承接」
  plan._plan_note = {
    chapterFunction: ctx.chapterFunction,
    nextMilestone: ctx.nextMilestone,
    distanceToMilestone: ctx.distanceToMilestone,
    milestoneMustHave: ctx.milestoneMustHave,
    activeThreads: (ctx.activeThreads || []).map((t) => ({ id: t.threadId, name: t.threadName, event: t.thisChapterEvent })),
    advanceGaps: gaps.advance,
    carriedGaps: gaps.carried,
    protectGaps: gaps.protect,
  };
  return plan;
}

// ---------------------------------------------------------------------------
// 卷基调配置：novel/_system/volume_tones.yaml → costTypePrefix 的卷级默认。
// 换卷只改配置不改代码（卷一压抑/卷二爆发/卷三虚无），与 Studio 向导产物
// wizard_chapter_tones.json 互不干扰（那是逐章 UI 配置，会被向导重写）。
// ---------------------------------------------------------------------------
function loadVolumeTone(dir, ch) {
  // ① 当前卷 = 10_volume_outline 下「含本章」的第一个 vol_NNN.md（按数字排序）
  let vol = 1;
  const outlineDir = path.join(dir, 'novel/10_volume_outline');
  if (fs.existsSync(outlineDir)) {
    const volFiles = fs
      .readdirSync(outlineDir)
      .filter((f) => /^vol_(\d+)\.md$/u.test(f))
      .sort((a, b) => Number(a.match(/\d+/u)[0]) - Number(b.match(/\d+/u)[0]));
    for (const f of volFiles) {
      if (parseVolChapter(fs.readFileSync(path.join(outlineDir, f), 'utf8'), ch)) {
        vol = Number(f.match(/\d+/u)[0]);
        break;
      }
    }
  }
  // ② 读卷配置（缺文件 / 缺该卷 → 空对象，走全局兜底）
  const cfgPath = path.join(dir, 'novel/_system/volume_tones.yaml');
  const cfg = fs.existsSync(cfgPath) ? readYaml(cfgPath) || {} : {};
  return { vol, tone: cfg[`volume_${String(vol).padStart(2, '0')}`] || {} };
}

// ---------------------------------------------------------------------------
// 可复用构建入口（供 pilot / 后续渲染器 import）
// ---------------------------------------------------------------------------
export function buildChapterPlan(ch, { bookDir: override, plant, overrides } = {}) {
  const dir = override || bookDir;
  const volTone = loadVolumeTone(dir, ch); // 卷由 volume_tones.yaml + 大纲归属解析
  const outlineDir = path.join(dir, 'novel/10_volume_outline');
  const volFile = path.join(outlineDir, `vol_${String(volTone.vol).padStart(2, '0')}.md`);
  const volText = fs.readFileSync(fs.existsSync(volFile) ? volFile : path.join(outlineDir, 'vol_01.md'), 'utf8');
  const facts = parseVolChapter(volText, ch);
  if (!facts) throw new Error(`vol_0${volTone.vol}.md 未找到第${ch}章的「前三章基调」行或「### 第${ch}章」小节`);
  const ctx = resolveChapterMapContext(dir, ch);
  if (!ctx) throw new Error('resolveChapterMapContext 返回 null（缺 story-map？）');
  const prevPath = prevPlanPath(ch, dir);
  const prevPlan = prevPath ? readYaml(prevPath) : null;
  const gaps = loadGapDirectives(ch, prevPlan, dir);
  const carry = loadPrevChapterCarry(ch, dir);
  const plan = composePlan(ch, facts, ctx, gaps, carry, { plant, volTone });
  // 作者覆写（预审抽屉「确认执行」回传）：goal / scenes 整段替换，其余字段保持渲染结果。
  // 注意：不用 Studio 的 persistChapterPlan——那是白名单覆写，会丢 foreshadow/_plan_note。
  if (overrides?.goal != null) plan.goal = String(overrides.goal);
  if (Array.isArray(overrides?.scenes)) plan.scenes = overrides.scenes.map(String);
  // 每拍叙事推进 + 环境关键词：随最终 scenes 派生（含作者覆写后的），供 beat-slimmer 读
  plan.beats = deriveBeats(plan.scenes, ch, dir);
  return { plan, facts, ctx, gaps, carry, prevPlan, dir, vol: volTone.vol, volTone };
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------
// --review 的人读预审摘要（供 Studio「预审-确认-执行」）
function auditSummary(ch, built, povCheck) {
  const { plan, ctx, gaps, outPath } = built;
  const L = [];
  const pad = (k, v) => `  ${String(k).padEnd(6)}${v}`;
  L.push(`[P1] 预审摘要 · 第${ch}章 · fn=${ctx.chapterFunction} · Δms=${ctx.distanceToMilestone}`);
  if (ctx.nextMilestone) L.push(pad('里程碑', ctx.nextMilestone));
  L.push(pad('POV', `${plan.pov} ✓（entrance=${povCheck.entrance_chapter}）`));
  L.push(pad('卷', `vol_${String(built.vol).padStart(2, '0')} · 代价默认「${built.volTone?.tone?.cost_prefix || '咽回的话（全局兜底）'}」`));
  const gapLine = (label, arr) =>
    arr.length
      ? arr.map((g) => {
          const t = String(g.title || g.id).replace(/[「」]/gu, '');
          return `${g.id}「${t.slice(0, 10)}${t.length > 10 ? '…' : ''}」${g.ref ? `(${g.ref})` : ''}`;
        }).join(' · ')
      : '无';
  L.push(pad('推进', gapLine('推进', gaps.advance)));
  L.push(pad('承接', gapLine('承接', gaps.carried)));
  L.push(pad('保护', gapLine('保护', gaps.protect)));
  L.push(pad('埋物证', `${extractPlant(built.facts, plantArg) || '（启发式未命中，可 --plant 覆盖）'}`));
  const threads = plan._plan_note?.activeThreads || [];
  L.push(pad('支线', threads.length ? threads.map((t) => t.id || t.name).join(', ') : '无'));
  for (const s of plan.scenes || []) {
    const text = String(s).replace(/【[^】]+】/gu, (m) => `[${m.slice(1, -1)}]`);
    L.push(`  beat · ${text.slice(0, 52)}${text.length > 52 ? '…' : ''}`);
  }
  const required = ['goal', 'conflict', 'climax', 'cost', 'hook', 'ending', 'scenes', 'pov', 'wordTarget'];
  const missing = required.filter((k) => plan[k] === undefined || plan[k] === '' || (Array.isArray(plan[k]) && plan[k].length === 0));
  L.push(pad('覆盖', missing.length ? `⚠ 缺：${missing.join('/')}（serializer 将回退默认）` : 'goal/scenes/cost/hook/foreshadow ✓'));
  L.push(pad('输出', `${path.relative(repoRoot, outPath)}${fs.existsSync(outPath) ? '（已存在，需 --force 覆盖）' : ''}`));
  return L.join('\n');
}

// serializer 白名单必填字段（写前核对用）
const WHITELIST_REQUIRED = ['goal', 'conflict', 'climax', 'cost', 'hook', 'ending', 'scenes', 'pov', 'wordTarget'];
const missingWhitelist = (plan) =>
  WHITELIST_REQUIRED.filter((k) => plan[k] === undefined || plan[k] === '' || (Array.isArray(plan[k]) && plan[k].length === 0));

// --json 模式的机器可读审计（Studio 预览抽屉只读区）
function structuredAudit(built, povCheck, { missing, exists } = {}) {
  const { plan, ctx, gaps, vol, volTone } = built;
  const outPath = built.outPath;
  return {
    pov: plan.pov,
    pov_check: { ok: povCheck.ok, entrance_chapter: povCheck.entrance_chapter },
    chapter_function: ctx.chapterFunction,
    milestone: ctx.nextMilestone || null,
    distance_to_milestone: ctx.distanceToMilestone,
    vol: {
      index: vol,
      cost_prefix: volTone?.tone?.cost_prefix || null,
      emotion_baseline: volTone?.tone?.emotion_baseline || null,
    },
    gaps: {
      advance: gaps.advance.map((g) => ({ id: g.id, ref: g.ref || null, title: g.title || null })),
      carried: gaps.carried.map((g) => ({ id: g.id, ref: g.ref || null, title: g.title || null })),
      protect: gaps.protect.map((g) => ({ id: g.id, ref: g.ref || null, title: g.title || null })),
    },
    active_threads: (plan._plan_note?.activeThreads || []).map((t) => t.id || t.name),
    plant_heuristic: extractPlant(built.facts, plantArg) || null,
    whitelist_coverage: { ok: !missing?.length, missing: missing || [] },
    out_path: path.relative(repoRoot, outPath),
    overwrite: exists ?? fs.existsSync(outPath),
  };
}

function main() {
  const ch = targetChapter || 2;
  let built;
  try {
    built = buildChapterPlan(ch, { plant: plantArg || undefined, overrides: hasOverrides ? overrides : undefined });
  } catch (err) {
    console.error(`[P1] ${err.message}`);
    process.exit(1);
  }
  const { plan, ctx, gaps } = built;

  // POV 合法性校验：渲染层内做，Orchestrator 永远只收到合法 plan
  const povCheck = validatePov(ch, plan.pov, built.dir);
  if (!povCheck.ok) {
    console.error(`[P1] POV 校验拒绝：${povCheck.reason}`);
    process.exit(1);
  }

  // 章内核对：prose 字段必须覆盖 serializer 白名单（缺失仅警告，与既有写盘行为一致）
  const missing = missingWhitelist(plan);
  for (const k of missing) {
    console.warn(`[P1] 警告：字段 ${k} 为空，serializer 会回退默认值`);
  }

  const outPath = outArg || path.join(PLANS, `chapter_${String(ch).padStart(4, '0')}.yaml`);
  built.outPath = outPath;
  const exists = fs.existsSync(outPath);

  // --json 机器模式（Studio 预览抽屉）：隐含 dry（不写）；--force = 写盘后仍输出 JSON。
  // POV 失败已在上方 exit 1（stderr 供 server 转 4xx）；白名单缺失进 validation 上报（不阻断）。
  if (jsonMode) {
    if (force) {
      writeYaml(outPath, plan);
    }
    const audit = structuredAudit(built, povCheck, { missing, exists });
    process.stdout.write(
      JSON.stringify({ ok: true, plan, audit, outPath: audit.out_path, overwrite: audit.overwrite, wrote: force }, null, 2),
    );
    return;
  }

  // 预审：--review 打印人读摘要（供 Studio「预审-确认-执行」）；--review --dry = 只预览不写
  if (review) {
    console.log(auditSummary(ch, built, povCheck));
    if (dry) {
      console.log('[P1] --dry：仅预览，未写入');
      return;
    }
  }

  // 覆盖保护：plan 已存在且非 --force → 拒绝（避免静默覆盖已确认/编辑过的 plan）
  if (exists && !force) {
    console.error(`[P1] 拒绝覆盖：${path.relative(repoRoot, outPath)} 已存在。用 --force 覆盖，或用 --out 指向新路径。`);
    process.exit(1);
  }

  if (dry) {
    console.log(`[P1] DRY-RUN 第${ch}章 plan（${exists ? '已存在，--force 将覆盖' : '新写入'}）:`);
    console.log(JSON.stringify(plan, null, 2));
    return;
  }

  writeYaml(outPath, plan);
  console.log(`[P1] 已写入 ${path.relative(repoRoot, outPath)}`);
  console.log(`     derived: fn=${ctx.chapterFunction} · Δms=${ctx.distanceToMilestone} · ${ctx.nextMilestone || '无里程碑'}`);
  console.log(`     揭示缺口: ${gaps.advance.map((g) => g.id).join(', ') || '无'}`);
  console.log(`     承接推进: ${gaps.carried.map((g) => g.id).join(', ') || '无'}`);
  console.log(`     POV 校验: ${plan.pov} ✓（entrance=${povCheck.entrance_chapter}）`);
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) main();
