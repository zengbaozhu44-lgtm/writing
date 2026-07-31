/**
 * 向导跨步状态 — 联动提示与校验
 */
import type { EntityRecord } from '../entity-manager';
import type { GenreTemplateId } from './genreTemplates';
import { ChapterTone, defaultChapterTones } from './chapterTones';

export interface WorldRuleItem {
  id: string;
  text: string;
}

export interface WizardContext {
  genreTemplate: GenreTemplateId;
  openingHook: string;
  coreMystery: string;
  sentenceStyle: '短句为主' | '长短交错' | '长句铺陈' | '';
  dialogueRatio: number;
  sensoryPriority: string[];
  /** 理想风格样本（黄金样本，P0 永不裁剪） */
  styleSample: string;
  /** 风格基因包 id：dark-monarch | '' */
  styleGenePack: string;
  worldRules: WorldRuleItem[];
  ruleSystem: string;
  /** 前三章基调（替代 beatPlan） */
  chapterTones: ChapterTone[];
  /** 第一卷预估章数 */
  volumeChapterCount: number;
  worldBoundaryReport: string;
  trialPreview: string;
  /** 步骤间联动提示（可 dismiss） */
  linkageHints: string[];
  /** 冲突校准草稿（建书时写入 conflict-calibration.yaml） */
  conflictCore: string;
  conflictStakes: string;
}

export function createDefaultWizardContext(): WizardContext {
  return {
    genreTemplate: '',
    openingHook: '',
    coreMystery: '',
    sentenceStyle: '',
    dialogueRatio: 30,
    sensoryPriority: ['视觉', '听觉', '触觉', '嗅觉'],
    styleSample: '',
    styleGenePack: '',
    worldRules: [],
    ruleSystem: '',
    chapterTones: defaultChapterTones(),
    volumeChapterCount: 30,
    worldBoundaryReport: '',
    trialPreview: '',
    linkageHints: [],
    conflictCore: '',
    conflictStakes: '',
  };
}

export function analyzeCharacterHints(records: EntityRecord[]): string[] {
  const hints: string[] = [];
  if (!records.length) return ['尚未添加角色'];
  const hasVillain = records.some((r) =>
    /反派|villain|对手/i.test(`${r.fields.role || ''} ${r.fields.tag || ''} ${r.fields.identity || ''}`),
  );
  if (!hasVillain) hints.push('主角没有对手/反派，建议添加');

  const noSecret = records.filter((r) => !String(r.fields.secret || '').trim());
  if (noSecret.length) hints.push(`${noSecret.length} 个角色没有秘密，建议补充`);

  const entries = records
    .map((r) => String(r.fields.entryChapter || ''))
    .filter(Boolean);
  if (entries.length >= 2 && entries.every((e) => /第\s*1\s*章|第1章|^1$/.test(e))) {
    hints.push('所有角色出场都在第1章，建议分散到不同章节');
  }
  return hints;
}

export function findIsolatedFactions(records: EntityRecord[]): string[] {
  return records
    .filter((r) => {
      const links = `${r.fields.hostile || ''} ${r.fields.friendly || ''}`.trim();
      return !links;
    })
    .map((r) => r.fields.name || r.id);
}

export interface ConflictCheckItem {
  id: string;
  label: string;
  ok: boolean;
  detail: string;
  fixSuggestion?: string;
}

export function buildConflictChecks(opts: {
  protagonistGoal: string;
  worldMd: string;
  factions: EntityRecord[];
  characters: EntityRecord[];
}): ConflictCheckItem[] {
  const { protagonistGoal, worldMd, factions, characters } = opts;
  const worldHasConstraint = /规则|禁止|代价|边界|限制/.test(worldMd || '');
  const goalVsWorld = Boolean(protagonistGoal?.trim()) && worldHasConstraint;

  const hasFactionConflict = factions.some((f) =>
    Boolean(String(f.fields.hostile || '').trim()),
  );

  const hasCharEntangle = characters.length >= 2 && characters.some((c) =>
    Boolean(String(c.fields.secret || c.fields.innerConflict || c.fields.goal || '').trim()),
  );

  return [
    {
      id: 'goal-vs-world',
      label: '主角目标 vs 世界规则',
      ok: goalVsWorld,
      detail: goalVsWorld
        ? '世界规则可对主角目标形成阻碍'
        : '世界设定缺少明确约束，或主角目标为空',
      fixSuggestion: '建议在世界设定中增加与主角目标直接冲突的规则/代价',
    },
    {
      id: 'faction-conflict',
      label: '势力间利益冲突',
      ok: hasFactionConflict,
      detail: hasFactionConflict ? '至少存在一组敌对关系' : '势力之间缺少敌对/利益冲突',
      fixSuggestion: '建议添加一个与主角目标冲突的敌对势力',
    },
    {
      id: 'char-entangle',
      label: '角色间情感/利益纠葛',
      ok: hasCharEntangle,
      detail: hasCharEntangle ? '角色具备秘密/矛盾/目标，可形成纠葛' : '角色信息过薄，缺少纠葛抓手',
      fixSuggestion: '建议为至少两名角色补充秘密或内心矛盾',
    },
  ];
}

export function pushHint(hints: string[], text: string): string[] {
  if (hints.includes(text)) return hints;
  return [...hints, text];
}
