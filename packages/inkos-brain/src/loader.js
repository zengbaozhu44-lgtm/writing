import fs from 'node:fs';
import path from 'node:path';
import { getBookPaths } from '../../inkos-core/src/lib/book.js';
import { exists, readJson, readText } from '../../inkos-core/src/lib/paths.js';
import { readYaml } from '../../inkos-core/src/lib/yaml-store.js';
import { stampRegisteredLegacy } from '../../inkos-core/src/lib/legacy-read-preference.js';
import { resolveCharacter } from '../../inkos-core/src/lib/entity-identity.js';
import { collectAuthoredNpcActivity } from './npc/npc-activity.js';
import { assembleMinimalSR } from '../../inkos-core/src/lib/minimal-sr.js';

function parseChapterTask(md) {
  const fields = {};
  for (const line of md.split('\n')) {
    const m = line.match(/^-\s+\*\*(.+?)\*\*[：:]\s*(.*)$/);
    if (m) fields[m[1].trim()] = m[2].trim();
  }
  return fields;
}

function parseStateTable(md) {
  const fields = {};
  for (const line of md.split('\n')) {
    const m = line.match(/^\|\s*(.+?)\s*\|\s*(.+?)\s*\|$/);
    if (m && m[1] !== '字段' && !m[1].includes('---')) fields[m[1].trim()] = m[2].trim();
  }
  return fields;
}

function parseVolumeOutline(text = '') {
  const goals = [];
  const sceneSeeds = [];
  const authorNoteParts = [];
  const lines = String(text || '').split('\n');
  let pendingProse = [];
  let currentSeed = null;

  const flushProse = () => {
    const prose = pendingProse.join('\n').trim();
    pendingProse = [];
    if (!prose) return;
    if (currentSeed) {
      currentSeed.prose = [currentSeed.prose, prose].filter(Boolean).join('\n');
    } else {
      authorNoteParts.push(prose);
    }
  };

  const flushSeed = () => {
    if (!currentSeed) return;
    const seed = [currentSeed.seed, currentSeed.prose].filter(Boolean).join(' ').trim();
    sceneSeeds.push({
      title: currentSeed.title,
      seed,
      goal: currentSeed.goal,
    });
    currentSeed = null;
  };

  for (const line of lines) {
    const numbered = line.match(/^\s*\d+\.\s+(.+)$/);
    if (numbered) {
      flushProse();
      flushSeed();
      const content = numbered[1].trim();
      goals.push(content);
      const titled = content.match(/^\*\*(.+?)\*\*[：:]\s*(.*)$/)
        || content.match(/^(.+?)[：:]\s*(.+)$/);
      if (titled && titled[2]) {
        currentSeed = {
          title: titled[1].replace(/\*\*/g, '').trim(),
          seed: titled[2].trim(),
          prose: '',
          goal: content,
        };
      } else {
        currentSeed = {
          title: content.replace(/\*\*/g, '').slice(0, 24),
          seed: content,
          prose: '',
          goal: content,
        };
      }
      continue;
    }

    if (/^\s*#{1,3}\s/.test(line)) {
      // 卷纲常见格式：`## 第N章：标题` + 章内子弹（开篇冲突/反转爽点/章末钩子）。
      // 此类标题开启一个新章节 seed，章内子弹并入该 seed，供 planner 取章级目标。
      const chapterHeading = line.match(/^#{1,3}\s*第\s*(\d+)\s*章\s*[：:]\s*(.+)$/);
      flushProse();
      flushSeed();
      if (chapterHeading) {
        const chIdx = Number(chapterHeading[1]);
        const chTitle = chapterHeading[2].trim() || `第${chIdx}章`;
        goals[chIdx - 1] = goals[chIdx - 1] || chTitle;
        currentSeed = {
          chapter: chIdx,
          title: chTitle,
          seed: `第${chIdx}章：${chTitle}`,
          prose: '',
          goal: chTitle,
        };
      }
      continue;
    }
    if (/^\s*[-*]\s+/.test(line)) {
      flushProse();
      const bullet = line.replace(/^\s*[-*]\s+/, '').trim();
      if (bullet) {
        if (currentSeed?.chapter) {
          currentSeed.seed = [currentSeed.seed, bullet].filter(Boolean).join(' ');
        } else {
          authorNoteParts.push(bullet);
        }
      }
      continue;
    }
    if (!line.trim()) {
      flushProse();
      continue;
    }
    pendingProse.push(line.trim());
  }
  flushProse();
  flushSeed();

  return {
    goals,
    sceneSeeds,
    authorNotes: authorNoteParts.filter(Boolean).join('\n').slice(0, 800),
  };
}

function loadVolumeGoal(bookDir, modules, manifest) {
  const vol = manifest.currentVolume ?? 1;
  const volFile = path.join(modules.volume_outline, `vol_${String(vol).padStart(2, '0')}.md`);
  if (!exists(volFile)) return { volume: vol, goals: [], sceneSeeds: [], authorNotes: '', raw: '' };
  const text = readText(volFile);
  const parsed = parseVolumeOutline(text);
  return {
    volume: vol,
    goals: parsed.goals,
    sceneSeeds: parsed.sceneSeeds,
    authorNotes: parsed.authorNotes,
    raw: text,
  };
}

function loadCharacter(bookDir, charDir, name) {
  const f = path.join(charDir, `${name}.md`);
  if (!exists(f)) return null;
  const text = readText(f);
  const get = (key) => {
    const m = text.match(new RegExp(`-\\s+\\*\\*${key}\\*\\*[：:]\\s*(.+)`));
    return m ? m[1].trim() : '';
  };
  return {
    name,
    identity: get('身份'),
    publicGoal: get('公开目标'),
    realGoal: get('真实目标'),
    values: get('价值观'),
    bottomLine: get('底线'),
    fear: get('恐惧'),
    secret: get('秘密'),
    growth: get('成长方向'),
    voice: get('对白风格'),
    catchphrase: get('口头禅'),
    personality: get('性格'),
    raw: text,
  };
}

export function isBrainEnabled(bookDir) {
  const bookJson = path.join(bookDir, 'book.json');
  if (!exists(bookJson)) return false;
  const book = readJson(bookJson);
  if (book.brainEnabled === false) return false;
  if (book.brainEnabled === true) return true;

  const bp = getBookPaths(bookDir);
  if (bp.version !== 4) return false;

  const manifestPath = bp.manifest;
  if (exists(manifestPath)) {
    const m = readJson(manifestPath);
    if (m.brain?.enabled === true) return true;
    if (m.brain?.enabled === false) return false;
  }

  return false;
}

export function loadBrainContext(bookDir, options = {}) {
  const bp = getBookPaths(bookDir);
  if (bp.version !== 4) throw new Error(`Brain 仅支持 V4 书籍，当前: ${bp.version}`);

  const m = bp.modules;
  const manifest = readJson(bp.manifest);
  const chapter = options.chapter ?? (manifest.lastAppliedChapter ?? 0) + 1;

  const currentChapterMd = exists(m.current_chapter) ? readText(m.current_chapter) : '';
  const currentStateMd = exists(m.current_state) ? readText(m.current_state) : '';
  const chapterTask = parseChapterTask(currentChapterMd);
  const state = parseStateTable(currentStateMd);

  const pov = options.pov || chapterTask.POV || chapterTask.pov || state.POV || '';
  const present = options.present?.length
    ? options.present
    : (chapterTask['出场角色'] || '').split(/[,，、]/).map((s) => s.trim()).filter(Boolean);

  const facts = readYaml(m.facts_db)?.facts ?? [];
  const timeline = readYaml(m.timeline)?.days ?? [];
  const knowledge = readYaml(m.knowledge_matrix) ?? { matrix: [], characters: [] };
  let relationships = readYaml(m.relationship_graph)?.edges ?? [];
  // G1-A：Relationship endpoint 必须 resolve 到已录取 Character（authored 05 的加载校验；
  // 任一端 UNRESOLVED → 该边 fail-closed 不入 ctx，不累及他边）
  {
    const before = relationships.length;
    relationships = relationships.filter((e) => {
      const from = resolveCharacter(bookDir, e?.from);
      const to = resolveCharacter(bookDir, e?.to);
      if (from.status !== 'RESOLVED' || to.status !== 'RESOLVED') {
        console.warn(`[g1a] relationship edge rejected: ${e?.from}→${e?.to}（endpoint unresolved）`);
        return false;
      }
      return true;
    });
    if (relationships.length !== before) {
      console.warn(`[g1a] relationship edges: ${before} → ${relationships.length}（endpoint resolution）`);
    }
  }
  const resources = readYaml(m.resource_db) ?? { by_character: {}, resources: {} };
  const foreshadow = readYaml(m.foreshadow_db)?.hooks ?? [];
  const stateBoard = exists(m.state_board) ? readText(m.state_board) : '';

  const volume = loadVolumeGoal(bookDir, m, manifest);
  const characters = {};
  // 角色档缺失时 loadCharacter 返回 null —— 不要塞进 characters，避免下游 .arc 崩溃
  const putCharacter = (name) => {
    if (!name) return;
    if (characters[name]) return;
    const c = loadCharacter(bookDir, m.character_bible, name);
    if (c) characters[name] = c;
  };
  putCharacter(pov);
  for (const name of present) putCharacter(name);

  const factions = {};
  if (exists(m.faction_bible)) {
    for (const f of fs.readdirSync(m.faction_bible).filter((x) => x.endsWith('.md') && !x.startsWith('_'))) {
      const name = f.replace('.md', '');
      factions[name] = { name, raw: readText(path.join(m.faction_bible, f)) };
    }
  }

  const writingBible = exists(m.writing_bible) ? readText(m.writing_bible) : '';
  const worldBible = exists(m.world_bible) ? readText(m.world_bible) : '';
  console.log('[lore] worldBible length:', worldBible?.length || 0, 'path=', m.world_bible);

  const characterFiles = exists(m.character_bible)
    ? fs.readdirSync(m.character_bible).filter((f) => f.endsWith('.md') && !f.startsWith('_'))
    : [];
  console.log('[entity] loaded characters:', characterFiles.length, 'from', m.character_bible);

  // WL-03: authored NPC 场外动向（世界层输入；模板条目/非 roster 名字在 collect 内被过滤）
  const npcActivity = collectAuthoredNpcActivity(m.npc_simulation, { roster: characterFiles });

  // Phase 1: Minimal SR = read-only projection on shared ctx (not Character State authority)
  const ctxBase = {
    bookDir,
    chapter,
    pov,
    present,
    knowledge,
    relationships,
    characters,
    facts,
    timeline,
  };
  const characterSR = assembleMinimalSR({
    ctx: ctxBase,
    names: [pov, ...present].filter(Boolean),
  });

  return {
    bookDir,
    chapter,
    manifest,
    modules: m,
    pov,
    present,
    chapterTask,
    state,
    stateBoard,
    volume,
    facts,
    timeline,
    knowledge,
    relationships,
    resources,
    foreshadow,
    characters,
    factions,
    writingBible,
    worldBible,
    currentChapterMd,
    currentStateMd,
    characterSR,
    npcActivity,
    // EO-P7 R-01/R-08: disk 11/13/08 readable as registered_legacy ≠ obtains
    d1LegacyReadPreference: stampRegisteredLegacy({
      paths: ['11_timeline', '13_facts_db', '08_current_state', '09_current_chapter'],
    }),
  };
}

export function brainSystemDir(bookDir) {
  return path.join(bookDir, 'novel', '_system', 'brain');
}
