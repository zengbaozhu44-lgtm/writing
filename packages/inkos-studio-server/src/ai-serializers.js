/** AI 序列化 — 与 Studio parsers 对齐的 Markdown 生成 */

export function serializeWorldMd(f) {
  return [
    `# 01 World Bible · ${f.title || '世界设定'}`,
    '', '> Studio AI 自动生成', '',
    '## 1. 世界背景 / 时代', f.era || '', '',
    '## 2. 世界历史', f.history || '', '',
    '## 3. 世界规则', f.rules || '', '',
    '## 4. 超凡体系 / 力量体系', f.powerSystem || '', '',
    '## 5. 社会结构', f.socialStructure || '', '',
    '## 6. 势力体系（详情见 04_faction_bible/）', f.factions || '', '',
    '## 7. 地理 / 地图', f.map || '', '',
    f.cities ? `### 主要城市\n${f.cities}` : '',
    f.dangerZones ? `### 危险区域\n${f.dangerZones}` : '',
    f.places ? `\n### 重要地点\n${f.places}` : '', '',
    '## 8. 禁忌', '',
  ].filter(Boolean).join('\n');
}

export function serializeWritingMd(f) {
  const narr = (f.narrative || '').split('\n').filter(Boolean).map((l, i) => `${i + 1}. **${l.trim()}**`);
  const prose = (f.prose || '').split('\n').filter(Boolean).map((l, i) => `${i + 1}. **${l.trim()}**`);
  return [
    `# 02 Writing Bible · ${f.title || f.stylePreset || '写作规则'}`,
    '', '> Studio AI 自动生成', '',
    `> 文风: ${f.stylePreset || '自定义'} | 节奏: ${f.rhythm || ''} | POV: ${f.pov || ''}`,
    '', '## 叙事原则 / 叙事节奏', ...narr, '', '## 文风原则 / 语言风格', ...prose, '',
    '## 章节结构', f.chapterStructure || '起承转合，每章一个核心冲突', '',
    '## 冲突规则', f.conflictRules || '每章至少一次决策点', '',
    '## 悬念规则', f.suspenseRules || '章末留钩子', '',
    '## 爽点规则', f.hookRules || '小胜+大钩子交替', '',
    '## 平台参数', '| 参数 | 值 |', '|------|-----|',
    `| 单章字数 | ${f.wordCount || 3000} |`, `| 对话占比 | ${f.dialogueRatio || '30%–60%'} |`,
    '', '## 禁止', `- ${f.taboo || '解释设定'}`, '', '## 信息释放', f.infoRelease || '',
    '', '## 状态机', 'Situation → Goal → Conflict → Decision → Action → Consequence → New Situation',
  ].join('\n');
}

export function serializeChapterTaskMd(f) {
  return [
    '# 09 Current Chapter', '', '> Studio AI 自动生成', '',
    `- **POV**：${f.pov || '主角'}`, `- **目标**：${f.goal || ''}`,
    `- **第一阻碍**：${f.obstacle1 || ''}`, `- **第二阻碍**：${f.obstacle2 || ''}`,
    `- **博弈**：${f.bargain || ''}`, `- **高潮**：${f.climax || ''}`,
    `- **代价**：${f.cost || ''}`, `- **新增伏笔**：${f.foreshadow || ''}`,
    `- **结尾**：${f.ending || ''}`,
  ].join('\n');
}

export function serializeCharacterMd(f) {
  return [
    `# ${f.name}`, '', '## 恒定属性',
    `- **身份**：${f.identity || ''}`, `- **目标**：${f.goal || ''}`,
    `- **性格**：${f.personality || ''}`,
    `- **价值观**：${f.values || ''}`, `- **底线**：${f.bottomLine || ''}`,
    `- **秘密**：${f.secret || ''}`, `- **口头禅**：${f.catchphrase || ''}`,
    `- **成长方向**：${f.growth || ''}`, `- **重要度**：${f.importance ?? 80}`,
    '', '## 动态指针', '| 信息 | 位置 |', '|------|------|',
    '| 当前状态 | `08_current_state.md` |', '| 谁知道什么 | `06_knowledge_matrix.yaml` |',
    '| 关系 | `05_relationship_graph.yaml` |',
  ].join('\n');
}
