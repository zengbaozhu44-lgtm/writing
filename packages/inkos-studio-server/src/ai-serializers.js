/** AI 序列化 — 与 Studio parsers 对齐的 Markdown 生成 */

/**
 * EO-FIX-SERIALIZE-01：World Bible 字段类型归一
 *
 * LLM 返回的 JSON 字段类型不可预测（string / number / boolean / null / undefined /
 * object / array / 嵌套混合），而 serializeWorldMd 的模板插值依赖 JS 默认 toString()，
 * 导致 object → "[object Object]"。
 *
 * 归一规则（确定、可预测、无副作用）：
 *   string   → 原样保留（零变换，不重复 JSON.stringify）
 *   number   → String(n)，保留 0
 *   boolean  → String(b)，保留 false
 *   null/undefined → ''（由外层 || '' 或本函数返回 ''）
 *   object   → JSON.stringify（保留完整结构）
 *   array    → 逐元素递归归一，用 '；' 连接 string 项；object 项保留 JSON 边界；
 *              输出为 Markdown 可读形式，元素间用 '；' 分隔（不用逗号避免与 JSON 语法混淆）
 *
 * 不推断、不补写、不创造世界设定内容——仅保留和表达输入数据。
 */

function normalizeFieldValue(value) {
  // 明确区分 null/undefined 与 falsy 原始值（0、false、'' 不被清空）
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  if (typeof value === 'boolean') return String(value);

  if (Array.isArray(value)) {
    if (value.length === 0) return '';
    const items = value.map((item) => {
      if (item === null || item === undefined) return '';
      if (typeof item === 'string') return item;
      if (typeof item === 'number' || typeof item === 'boolean') return String(item);
      // object 或嵌套 array：递归归一（JSON.stringify 保留完整结构与边界）
      return normalizeFieldValue(item);
    }).filter((s) => s !== '');
    return items.join('；');
  }

  if (typeof value === 'object') {
    try {
      return JSON.stringify(value, null, 0);
    } catch {
      // 循环引用等不可序列化对象：返回空串而非 [object Object]
      return '';
    }
  }

  // symbol / bigint / function 等罕见类型：安全回退
  return String(value);
}

export function serializeWorldMd(f) {
  return [
    `# 01 World Bible · ${f.title || '世界设定'}`,
    '', '> Studio AI 自动生成', '',
    '## 1. 世界背景 / 时代', normalizeFieldValue(f.era), '',
    '## 2. 世界历史', normalizeFieldValue(f.history), '',
    '## 3. 世界规则', normalizeFieldValue(f.rules), '',
    '## 4. 超凡体系 / 力量体系', normalizeFieldValue(f.powerSystem), '',
    '## 5. 社会结构', normalizeFieldValue(f.socialStructure), '',
    '## 6. 势力体系（详情见 04_faction_bible/）', normalizeFieldValue(f.factions), '',
    '## 7. 地理 / 地图', normalizeFieldValue(f.map), '',
    f.cities ? `### 主要城市\n${normalizeFieldValue(f.cities)}` : '',
    f.dangerZones ? `### 危险区域\n${normalizeFieldValue(f.dangerZones)}` : '',
    f.places ? `\n### 重要地点\n${normalizeFieldValue(f.places)}` : '', '',
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
    '| 当前状态 | `08_current_state.md` |',
  ].join('\n');
}
