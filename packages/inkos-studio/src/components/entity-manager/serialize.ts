/**
 * 实体 ↔ Canon Markdown 序列化
 */
import { EntityRecord, EntityType } from './types';

function getField(md: string, key: string): string {
  return md.match(new RegExp(`\\*\\*${key}\\*\\*[：:]\\s*(.*)`))?.[1]?.trim() || '';
}

export function parseEntityMarkdown(type: EntityType, md: string, fallbackId = ''): EntityRecord {
  const name = md.match(/^#\s*(.+)/m)?.[1]?.trim() || fallbackId;
  if (type === 'character') {
    return {
      id: fallbackId || name,
      fields: {
        name,
        identity: getField(md, '身份'),
        ability: getField(md, '核心能力') || getField(md, '功法/能力') || getField(md, '核心技能/资源') || getField(md, '金手指/资产') || getField(md, '能力'),
        goal: getField(md, '目标') || getField(md, '公开目标'),
        tag: getField(md, '读者记忆标签') || getField(md, '标签'),
        voice: getField(md, '对白风格'),
        innerConflict: getField(md, '核心内心矛盾') || getField(md, '内心矛盾'),
        entryChapter: getField(md, '预计出场章节') || getField(md, '出场章节'),
        personality: getField(md, '性格'),
        values: getField(md, '价值观'),
        bottomLine: getField(md, '底线'),
        secret: getField(md, '秘密'),
        catchphrase: getField(md, '口头禅'),
        growth: getField(md, '成长方向'),
        role: getField(md, '角色定位') || getField(md, '定位'),
        cultivationRealm: getField(md, '境界/等级') || getField(md, '境界'),
      },
      markdown: md,
    };
  }
  if (type === 'location') {
    return {
      id: fallbackId || name,
      fields: {
        name,
        intro: getField(md, '简介'),
        atmosphere: getField(md, '氛围'),
        danger: getField(md, '危险等级'),
        faction: getField(md, '所属势力'),
        secrets: getField(md, '隐藏信息'),
      },
      markdown: md,
    };
  }
  // faction / organization
  return {
    id: fallbackId || name,
    fields: {
      name,
      intro: getField(md, '简介'),
      leader: getField(md, '领导者') || getField(md, '负责人'),
      members: getField(md, '成员') || getField(md, '成员构成'),
      resources: getField(md, '资源'),
      hostile: getField(md, '敌对') || getField(md, '对立'),
      friendly: getField(md, '友好') || getField(md, '盟友'),
      region: getField(md, '控制区域') || getField(md, '活动范围'),
      kind: getField(md, '类型') || (type === 'organization' ? '组织' : '势力'),
    },
    markdown: md,
  };
}

export function serializeEntityMarkdown(type: EntityType, fields: Record<string, string>, genre = ''): string {
  const name = fields.name || '未命名';
  if (type === 'character') {
    // 存储统一用「核心能力」键；UI label 按 genre 动态显示
    void genre;
    return [
      `# ${name}`,
      '',
      '## 恒定属性',
      `- **身份**：${fields.identity || ''}`,
      `- **核心能力**：${fields.ability || ''}`,
      `- **目标**：${fields.goal || ''}`,
      `- **读者记忆标签**：${fields.tag || ''}`,
      `- **对白风格**：${fields.voice || ''}`,
      `- **核心内心矛盾**：${fields.innerConflict || ''}`,
      `- **预计出场章节**：${fields.entryChapter || ''}`,
      `- **性格**：${fields.personality || ''}`,
      `- **价值观**：${fields.values || ''}`,
      `- **底线**：${fields.bottomLine || ''}`,
      `- **秘密**：${fields.secret || ''}`,
      `- **口头禅**：${fields.catchphrase || ''}`,
      `- **成长方向**：${fields.growth || ''}`,
      `- **角色定位**：${fields.role || ''}`,
      `- **境界/等级**：${fields.cultivationRealm || ''}`,
      '',
      '## 动态指针',
      '| 信息 | 位置 |',
      '|------|------|',
      '| 当前状态 | `08_current_state.md` |',
      '| 谁知道什么 | `06_knowledge_matrix.yaml` |',
      '| 关系 | `05_relationship_graph.yaml` |',
    ].join('\n');
  }
  if (type === 'location') {
    return [
      `# ${name}`,
      '',
      `- **简介**：${fields.intro || ''}`,
      `- **氛围**：${fields.atmosphere || ''}`,
      `- **危险等级**：${fields.danger || ''}`,
      `- **所属势力**：${fields.faction || ''}`,
      `- **隐藏信息**：${fields.secrets || ''}`,
    ].join('\n');
  }
  const leaderLabel = type === 'organization' ? '负责人' : '领导者';
  const membersLabel = type === 'organization' ? '成员构成' : '成员';
  const hostileLabel = type === 'organization' ? '对立' : '敌对';
  const friendlyLabel = type === 'organization' ? '盟友' : '友好';
  const regionLabel = type === 'organization' ? '活动范围' : '控制区域';
  return [
    `# ${name}`,
    '',
    `- **简介**：${fields.intro || ''}`,
    `- **${leaderLabel}**：${fields.leader || ''}`,
    `- **${membersLabel}**：${fields.members || ''}`,
    `- **资源**：${fields.resources || ''}`,
    `- **${hostileLabel}**：${fields.hostile || ''}`,
    `- **${friendlyLabel}**：${fields.friendly || ''}`,
    `- **${regionLabel}**：${fields.region || ''}`,
    `- **类型**：${fields.kind || (type === 'organization' ? '组织' : '势力')}`,
  ].join('\n');
}

/** Wizard AI 结果 → EntityRecord */
export function wizardCharacterToRecord(c: {
  fields?: Record<string, string>;
  markdown?: string;
}): EntityRecord {
  if (c.markdown) {
    const parsed = parseEntityMarkdown('character', c.markdown, c.fields?.name || '');
    return { ...parsed, fields: { ...parsed.fields, ...c.fields } };
  }
  const f = c.fields || {};
  return {
    id: f.name || `char_${Date.now()}`,
    fields: { ...f },
    markdown: serializeEntityMarkdown('character', f),
  };
}

export function wizardFactionToRecord(f: { name: string; markdown?: string }, type: 'faction' | 'organization' = 'faction'): EntityRecord {
  if (f.markdown) {
    return parseEntityMarkdown(type, f.markdown, f.name);
  }
  return {
    id: f.name,
    fields: { name: f.name, kind: type === 'organization' ? '组织' : '势力' },
    markdown: serializeEntityMarkdown(type, { name: f.name }),
  };
}

export function recordsToWizardCharacters(records: EntityRecord[]) {
  return {
    characters: records.map((r) => ({
      fields: r.fields,
      markdown: serializeEntityMarkdown('character', r.fields),
    })),
  };
}

export function recordsToWizardFactions(records: EntityRecord[]) {
  return {
    factions: records.map((r) => ({
      name: r.fields.name || r.id,
      markdown: serializeEntityMarkdown('faction', r.fields),
    })),
  };
}
