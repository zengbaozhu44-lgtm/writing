/**
 * Canon 完成度分析 — 供创作中心 AI 协作卡（只读）
 */
import { readModule } from './module-service.js';

const WORLD_CHECKS = [
  { key: 'era', label: '时代背景', patterns: [/世界背景/, /时代/] },
  { key: 'power', label: '力量体系', patterns: [/超凡体系/, /力量体系/, /能力体系/] },
  { key: 'rules', label: '世界规则', patterns: [/社会规则/, /禁忌/, /规则/] },
  { key: 'history', label: '世界历史', patterns: [/历史/] },
  { key: 'map', label: '地图', patterns: [/地理/, /地图/, /城市/] },
  { key: 'social', label: '社会结构', patterns: [/社会/, /经济/] },
];

function hasSection(content, patterns) {
  return patterns.some((p) => p.test(content || ''));
}

export function analyzeWorld(content = '') {
  const done = [];
  const missing = [];
  for (const c of WORLD_CHECKS) {
    if (hasSection(content, c.patterns)) done.push(c.label);
    else missing.push(c.label);
  }
  const completeness = Math.round((done.length / WORLD_CHECKS.length) * 100);
  let suggestion = '补充世界观细节';
  if (missing.includes('地图')) suggestion = '生成三大城市与危险区域';
  else if (missing.includes('力量体系')) suggestion = '完善力量体系与等级划分';
  else if (missing.includes('社会结构')) suggestion = '补充社会阶层与权力结构';
  return { completeness, done, missing, suggestion };
}

export function analyzeWriting(content = '') {
  const checks = ['叙事', '文风', '节奏', '悬念', '爽点', '冲突'];
  const done = checks.filter((c) => content.includes(c));
  const missing = checks.filter((c) => !content.includes(c));
  return {
    completeness: Math.round((done.length / checks.length) * 100),
    done,
    missing,
    suggestion: missing.length ? `补充${missing[0]}规则` : '规则已较完整，可 AI 优化节奏',
  };
}

function parseMdField(md, field) {
  const re = new RegExp(`\\*\\*${field}\\*\\*[：:]\\s*(.*)`);
  return md.match(re)?.[1]?.trim() || '';
}

export function parseCharacterCard(md = '', filename = '') {
  const name = md.match(/^#\s+(.+)/m)?.[1] || filename.replace(/\.md$/, '');
  const importance = parseMdField(md, '重要度');
  const identity = parseMdField(md, '身份');
  return {
    name,
    identity,
    goal: parseMdField(md, '目标'),
    secret: parseMdField(md, '秘密'),
    growth: parseMdField(md, '成长方向'),
    importance,
    role: Number(importance) >= 90 ? '主角'
      : identity.includes('反派') ? '反派' : '配角',
  };
}

export function parseFactionCard(md = '', name = '') {
  return {
    name: name || md.match(/^#\s+(.+)/m)?.[1] || '未知势力',
    intro: parseMdField(md, '简介'),
    leader: parseMdField(md, '领导者'),
    resources: parseMdField(md, '资源'),
    hostile: parseMdField(md, '敌对'),
    friendly: parseMdField(md, '友好'),
    region: parseMdField(md, '控制区域'),
  };
}

export async function getCreationInsights(bookDir) {
  let worldContent = '';
  let writingContent = '';
  const characters = [];
  const factions = [];

  try {
    worldContent = readModule(bookDir, 'world').content || '';
  } catch { /* skip */ }
  try {
    writingContent = readModule(bookDir, 'writing').content || '';
  } catch { /* skip */ }

  try {
    const mod = readModule(bookDir, 'characters');
    if (mod.files?.length) {
      for (const f of mod.files) {
        const file = readModule(bookDir, 'characters', f.name);
        characters.push(parseCharacterCard(file.content, f.name));
      }
    } else if (mod.content) {
      characters.push(parseCharacterCard(mod.content));
    }
  } catch { /* skip */ }

  try {
    const mod = readModule(bookDir, 'factions');
    if (mod.files?.length) {
      for (const f of mod.files) {
        const file = readModule(bookDir, 'factions', f.name);
        factions.push(parseFactionCard(file.content, f.name));
      }
    }
  } catch { /* skip */ }

  const relations = [];
  for (const f of factions) {
    if (f.hostile) {
      for (const h of f.hostile.split(/[,，、]/).map((s) => s.trim()).filter(Boolean)) {
        relations.push({ from: f.name, to: h, type: '敌对' });
      }
    }
    if (f.friendly) {
      for (const fr of f.friendly.split(/[,，、]/).map((s) => s.trim()).filter(Boolean)) {
        relations.push({ from: f.name, to: fr, type: '合作' });
      }
    }
  }

  const protagonist = characters.find((c) => c.role === '主角') || characters[0];
  let charSuggestion = '生成核心角色';
  if (protagonist) {
    charSuggestion = protagonist.secret ? '增加宿敌关系' : '扩写角色背景与秘密';
  }

  return {
    world: analyzeWorld(worldContent),
    writing: analyzeWriting(writingContent),
    characters: {
      list: characters,
      protagonist,
      suggestion: charSuggestion,
      completeness: characters.length ? Math.min(100, characters.length * 25) : 0,
    },
    factions: {
      list: factions,
      relations,
      completeness: factions.length ? Math.min(100, factions.length * 30) : 0,
      suggestion: factions.length < 2 ? '生成对立势力' : '完善势力关系网',
    },
  };
}
