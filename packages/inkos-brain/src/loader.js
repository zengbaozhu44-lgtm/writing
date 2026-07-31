import fs from 'node:fs';
import path from 'node:path';
import { getBookPaths } from '../../inkos-core/src/lib/book.js';
import { exists, readJson, readText } from '../../inkos-core/src/lib/paths.js';
import { readYaml } from '../../inkos-core/src/lib/yaml-store.js';

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
      flushProse();
      flushSeed();
      continue;
    }
    if (/^\s*[-*]\s+/.test(line)) {
      flushProse();
      const bullet = line.replace(/^\s*[-*]\s+/, '').trim();
      if (bullet) authorNoteParts.push(bullet);
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
  const relationships = readYaml(m.relationship_graph)?.edges ?? [];
  const resources = readYaml(m.resource_db) ?? { by_character: {}, resources: {} };
  const foreshadow = readYaml(m.foreshadow_db)?.hooks ?? [];
  const stateBoard = exists(m.state_board) ? readText(m.state_board) : '';

  const volume = loadVolumeGoal(bookDir, m, manifest);
  const characters = {};
  if (pov) characters[pov] = loadCharacter(bookDir, m.character_bible, pov);
  for (const name of present) {
    if (!characters[name]) characters[name] = loadCharacter(bookDir, m.character_bible, name);
  }

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
  };
}

export function brainSystemDir(bookDir) {
  return path.join(bookDir, 'novel', '_system', 'brain');
}
