/**
 * 通用实体字段定义 — 角色 / 势力 / 组织 / 地点共用
 */
import {
  CHARACTER_FIELDS,
  FACTION_FIELDS,
  ORGANIZATION_FIELDS,
  LOCATION_FIELDS,
  fieldsForType as fieldsForTypeWithGenre,
} from './fields-presets';

export type EntityType = 'character' | 'faction' | 'organization' | 'location';

export interface EntityField {
  key: string;
  label: string;
  multiline?: boolean;
  required?: boolean;
  placeholder?: string;
}

export interface EntityRecord {
  /** 文件 id（通常等于 name） */
  id: string;
  fields: Record<string, string>;
  markdown?: string;
}

/** Canon module alias → EntityType */
export const ENTITY_MODULE_KEY: Record<EntityType, string> = {
  character: 'characters',
  faction: 'factions',
  organization: 'factions',
  location: 'locations',
};

export { CHARACTER_FIELDS, FACTION_FIELDS, ORGANIZATION_FIELDS, LOCATION_FIELDS };

export function fieldsForType(type: EntityType, genre = ''): EntityField[] {
  return fieldsForTypeWithGenre(type, genre);
}

export function emptyRecord(type: EntityType, name = '', genre = ''): EntityRecord {
  const fields = fieldsForType(type, genre);
  const rec: Record<string, string> = {};
  for (const f of fields) rec[f.key] = f.key === 'name' ? name : (f.key === 'kind' ? '组织' : '');
  return { id: name || `new_${Date.now()}`, fields: rec };
}
