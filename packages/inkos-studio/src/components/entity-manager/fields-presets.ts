/**
 * Entity field presets — 按 entityType / genre 组装字段定义
 * 保持 EntityManager 通用：只消费 EntityField[]，不感知题材业务
 */
import type { EntityField, EntityType } from './types';

export function abilityLabelForGenre(genre = ''): string {
  const g = String(genre || '');
  if (/修仙|诡异/.test(g)) return '功法/能力';
  if (/年代/.test(g)) return '核心技能/资源';
  if (/神豪/.test(g)) return '金手指/资产';
  return '核心能力';
}

/** 将「1」「第1章」「chap 1」等规范为「第N章」 */
export function formatEntryChapter(raw: string): string {
  const s = String(raw || '').trim();
  if (!s) return '';
  const m = s.match(/(\d+)/);
  if (!m) return s;
  return `第${Number(m[1])}章`;
}

export function validateCharacterDraft(fields: Record<string, string>): string[] {
  const missing: string[] = [];
  if (!String(fields.name || '').trim()) missing.push('姓名');
  if (!String(fields.ability || '').trim()) missing.push('核心能力');
  if (!String(fields.goal || '').trim()) missing.push('目标');
  return missing;
}

export function characterFieldsForGenre(genre = ''): EntityField[] {
  return [
    { key: 'name', label: '姓名', required: true, placeholder: '角色名' },
    { key: 'identity', label: '身份', required: true },
    { key: 'ability', label: abilityLabelForGenre(genre), required: true, placeholder: '角色最核心的能力/资源' },
    { key: 'goal', label: '目标', required: true, multiline: true },
    { key: 'tag', label: '读者记忆标签', placeholder: '如：冷面毒舌、疯批美人' },
    { key: 'voice', label: '对白风格', placeholder: '如：短句带刺、文言腔' },
    { key: 'innerConflict', label: '核心内心矛盾', placeholder: '如：想信任人但怕背叛', multiline: true },
    { key: 'entryChapter', label: '预计出场章节', placeholder: '如：第1章' },
    { key: 'personality', label: '性格' },
    { key: 'values', label: '价值观' },
    { key: 'bottomLine', label: '底线' },
    { key: 'secret', label: '秘密', multiline: true },
    { key: 'catchphrase', label: '口头禅' },
    { key: 'growth', label: '成长方向' },
    { key: 'role', label: '角色定位', placeholder: '主角 / 反派 / NPC' },
    { key: 'cultivationRealm', label: '境界/等级', placeholder: '修仙题材用；换题材可清空' },
  ];
}

/** 默认（无 genre）角色字段 — 兼容旧导入 */
export const CHARACTER_FIELDS: EntityField[] = characterFieldsForGenre('');

export const FACTION_FIELDS: EntityField[] = [
  { key: 'name', label: '名称', required: true },
  { key: 'intro', label: '简介', multiline: true },
  { key: 'leader', label: '领导者' },
  { key: 'members', label: '成员' },
  { key: 'resources', label: '资源' },
  { key: 'hostile', label: '敌对' },
  { key: 'friendly', label: '友好' },
  { key: 'region', label: '控制区域' },
];

export const ORGANIZATION_FIELDS: EntityField[] = [
  { key: 'name', label: '组织名', required: true },
  { key: 'intro', label: '简介', multiline: true },
  { key: 'leader', label: '负责人' },
  { key: 'members', label: '成员构成' },
  { key: 'resources', label: '资源' },
  { key: 'hostile', label: '对立' },
  { key: 'friendly', label: '盟友' },
  { key: 'region', label: '活动范围' },
  { key: 'kind', label: '类型', placeholder: '组织' },
];

export const LOCATION_FIELDS: EntityField[] = [
  { key: 'name', label: '地点名', required: true },
  { key: 'intro', label: '简介', multiline: true },
  { key: 'atmosphere', label: '氛围' },
  { key: 'danger', label: '危险等级' },
  { key: 'faction', label: '所属势力' },
  { key: 'secrets', label: '隐藏信息', multiline: true },
];

export function fieldsForType(type: EntityType, genre = ''): EntityField[] {
  switch (type) {
    case 'character': return characterFieldsForGenre(genre);
    case 'faction': return FACTION_FIELDS;
    case 'organization': return ORGANIZATION_FIELDS;
    case 'location': return LOCATION_FIELDS;
    default: return characterFieldsForGenre(genre);
  }
}
