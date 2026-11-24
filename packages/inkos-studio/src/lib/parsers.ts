/** 表单 ↔ Markdown 序列化 — 用户永不直接编辑 Markdown */

export interface WorldForm {
  title: string;
  tagline: string;
  era: string;
  powerSystem: string;
  rules: string;
  map: string;
  factions: string;
  places: string;
  history: string;
}

export function parseWorldMd(md: string): WorldForm {
  if (!md?.trim()) {
    return { title: '世界设定', tagline: '', era: '', powerSystem: '', rules: '', map: '', factions: '', places: '', history: '' };
  }
  const sections: Record<string, string> = {};
  const parts = md.split(/^## \d+\.\s*/m).slice(1);
  const keys = ['era', 'powerSystem', 'rules', 'factions', 'rules2', 'resources', 'economy', 'history', 'map', 'taboo'];
  const titleMatch = md.match(/^#\s*(.+)/m);
  parts.forEach((block, i) => {
    const lines = block.split('\n');
    const first = lines[0]?.trim() || '';
    const body = lines.slice(1).join('\n').trim();
    const key = keys[i] || `s${i}`;
    sections[key] = body || first;
    if (i === 0) sections.era = [first, body].filter(Boolean).join('\n').trim();
  });
  const mapBlock = sections.map || '';
  const placesMatch = mapBlock.match(/(?:重要地点|主要城市)[：:]\s*\n?([\s\S]*)/);
  const places = placesMatch?.[1]?.trim() || '';
  const map = places ? mapBlock.replace(/(?:重要地点|主要城市)[：:][\s\S]*/, '').trim() : mapBlock;
  return {
    title: titleMatch?.[1]?.replace(/·.*/, '').trim() || '世界设定',
    tagline: '',
    era: sections.era || '',
    powerSystem: sections.powerSystem || '',
    rules: [sections.rules, sections.rules2, sections.taboo].filter(Boolean).join('\n'),
    map,
    factions: sections.factions || '',
    places,
    history: sections.history || '',
  };
}

export function serializeWorldMd(form: WorldForm): string {
  return [
    `# 01 World Bible · ${form.title}`,
    '',
    '> Studio IDE 自动保存',
    '',
    '## 1. 世界背景',
    form.era,
    '',
    '## 2. 超凡体系',
    form.powerSystem,
    '',
    '## 3. 能力体系',
    form.rules,
    '',
    '## 4. 势力体系（详情见 04_faction_bible/）',
    form.factions,
    '',
    '## 5. 社会规则',
    '',
    '## 6. 资源体系',
    '',
    '## 7. 经济体系',
    '',
    '## 8. 历史',
    form.history,
    '',
    '## 9. 地理',
    form.map,
    form.places ? `\n重要地点：\n${form.places}` : '',
    '',
    '## 10. 禁忌',
    '',
  ].join('\n');
}

export interface WritingForm {
  title: string;
  stylePreset: string;
  narrative: string;
  prose: string;
  taboo: string;
  wordCount: string;
  dialogueRatio: string;
  rhythm: string;
  infoRelease: string;
  pov: string;
}

const STYLE_PRESETS: Record<string, { narrative: string; prose: string }> = {
  '暗夜君王': { narrative: '利益驱动\n权力博弈\n每章不可逆', prose: '冷峻\n短句\n身体先行' },
  '宿命之环': { narrative: '渐进揭秘\n世界不围主角转', prose: '悬疑\n感官优先\n限知第三人称' },
  '诡秘之主': { narrative: '信息收费\n对话是博弈\n异常反噬', prose: '克苏鲁氛围\n细节锚定\n禁止解释设定' },
  custom: { narrative: '', prose: '' },
};

export function parseWritingMd(md: string): WritingForm {
  const titleMatch = md.match(/^#\s*(.+)/m);
  const narrative = md.match(/## 叙事原则\n([\s\S]*?)(?=\n## |$)/)?.[1] || '';
  const prose = md.match(/## 文风原则\n([\s\S]*?)(?=\n## |$)/)?.[1] || '';
  const taboo = md.match(/## 禁止\n([\s\S]*?)(?=\n## |$)/)?.[1] || '';
  const infoRelease = md.match(/## 信息释放\n([\s\S]*?)(?=\n## |$)/)?.[1]?.trim() || '渐进揭秘，禁止一次说完';
  const metaLine = md.match(/^> 文风[：:]\s*([^|]+)\s*\|\s*节奏[：:]\s*([^|]+)\s*\|\s*POV[：:]\s*(.+)$/m);
  const wc = md.match(/单章字数\s*\|\s*([^|]+)/)?.[1]?.trim() || md.match(/(\d{3,5})/)?.[1] || '3000';
  const dr = md.match(/对话占比\s*\|\s*([^|]+)/)?.[1]?.trim() || '30%–60%';
  return {
    title: titleMatch?.[1]?.replace(/·.*/, '').trim() || '写作规则',
    stylePreset: metaLine?.[1]?.trim() || 'custom',
    narrative: narrative.replace(/^\d+\.\s+\*\*/gm, '').replace(/\*\*/g, '').trim(),
    prose: prose.replace(/^\d+\.\s+\*\*/gm, '').replace(/\*\*/g, '').trim(),
    taboo: taboo.replace(/^-\s*/, '').trim(),
    wordCount: wc.replace(/[^\d].*/, '').trim() || wc,
    dialogueRatio: dr,
    rhythm: metaLine?.[2]?.trim() || '铺垫→推进→高潮→缓冲→结尾',
    infoRelease,
    pov: metaLine?.[3]?.trim() || '限知第三人称',
  };
}

export function applyStylePreset(preset: string): Partial<WritingForm> {
  const p = STYLE_PRESETS[preset];
  if (!p) return { stylePreset: preset };
  return { stylePreset: preset, narrative: p.narrative, prose: p.prose };
}

export function serializeWritingMd(form: WritingForm): string {
  const narrLines = form.narrative.split('\n').filter(Boolean).map((l, i) => `${i + 1}. **${l.trim()}**`);
  const proseLines = form.prose.split('\n').filter(Boolean).map((l, i) => `${i + 1}. **${l.trim()}**`);
  return [
    `# 02 Writing Bible · ${form.title}`,
    '',
    '> Studio IDE 自动保存',
    '',
    `> 文风预设: ${form.stylePreset} | 节奏: ${form.rhythm} | POV: ${form.pov}`,
    '',
    '## 叙事原则',
    ...narrLines,
    '',
    '## 文风原则',
    ...proseLines,
    '',
    '## 平台参数',
    '| 参数 | 值 |',
    '|------|-----|',
    `| 单章字数 | ${form.wordCount} |`,
    `| 对话占比 | ${form.dialogueRatio} |`,
    '',
    '## 禁止',
    `- ${form.taboo}`,
    '',
    '## 信息释放',
    form.infoRelease,
    '',
    '## 状态机',
    'Situation → Goal → Conflict → Decision → Action → Consequence → New Situation',
  ].join('\n');
}

export interface ChapterTaskForm {
  pov: string;
  goal: string;
  obstacle1: string;
  obstacle2: string;
  bargain: string;
  climax: string;
  cost: string;
  foreshadow: string;
  ending: string;
}

export function parseChapterTaskMd(md: string): ChapterTaskForm {
  const get = (key: string) => md.match(new RegExp(`\\*\\*${key}\\*\\*[：:]\\s*(.*)`))?.[1]?.trim() || '';
  return {
    pov: get('POV'),
    goal: get('目标'),
    obstacle1: get('第一阻碍'),
    obstacle2: get('第二阻碍'),
    bargain: get('博弈'),
    climax: get('高潮'),
    cost: get('代价'),
    foreshadow: get('新增伏笔'),
    ending: get('结尾'),
  };
}

export function serializeChapterTaskMd(form: ChapterTaskForm): string {
  return [
    '# 09 Current Chapter',
    '',
    '> Studio IDE 自动保存',
    '',
    `- **POV**：${form.pov}`,
    `- **目标**：${form.goal}`,
    `- **第一阻碍**：${form.obstacle1}`,
    `- **第二阻碍**：${form.obstacle2}`,
    `- **博弈**：${form.bargain}`,
    `- **高潮**：${form.climax}`,
    `- **代价**：${form.cost}`,
    `- **新增伏笔**：${form.foreshadow}`,
    `- **结尾**：${form.ending}`,
  ].join('\n');
}

export interface CharacterForm {
  name: string;
  identity: string;
  goal: string;
  values: string;
  bottomLine: string;
  secret: string;
  catchphrase: string;
  growth: string;
  importance: number;
}

export function parseCharacterMd(md: string, name: string): CharacterForm {
  const get = (key: string) => md.match(new RegExp(`\\*\\*${key}\\*\\*[：:]\\s*(.*)`))?.[1]?.trim() || '';
  return {
    name: name || md.match(/^#\s*(.+)/m)?.[1]?.trim() || '',
    identity: get('身份'),
    goal: get('目标') || get('公开目标'),
    values: get('价值观'),
    bottomLine: get('底线'),
    secret: get('秘密'),
    catchphrase: get('口头禅'),
    growth: get('成长方向'),
    importance: 80,
  };
}

export function serializeCharacterMd(form: CharacterForm): string {
  return [
    `# ${form.name}`,
    '',
    '## 恒定属性',
    `- **身份**：${form.identity}`,
    `- **目标**：${form.goal}`,
    `- **价值观**：${form.values}`,
    `- **底线**：${form.bottomLine}`,
    `- **秘密**：${form.secret}`,
    `- **口头禅**：${form.catchphrase}`,
    `- **成长方向**：${form.growth}`,
    `- **重要度**：${form.importance}`,
    '',
    '## 动态指针',
    '| 信息 | 位置 |',
    '|------|------|',
    '| 当前状态 | `08_current_state.md` |',
  ].join('\n');
}

export { STYLE_PRESETS };
