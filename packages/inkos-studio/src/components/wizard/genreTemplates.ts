/**
 * 题材模板 — 选择后预填文风 / 世界部分字段
 */
import type { WritingDimensions } from '../../api/client';

export type GenreTemplateId =
  | '规则怪谈'
  | '年代重生'
  | '诡异修仙'
  | '神豪签到'
  | '历史脑洞'
  | '';

export interface GenreTemplate {
  id: GenreTemplateId;
  label: string;
  genre: string;
  presetHint: string;
  openingHookHint: string;
  coreMysteryHint: string;
  writing: {
    sentenceStyle: '短句为主' | '长短交错' | '长句铺陈';
    dialogueRatio: number;
    sensoryPriority: string[];
    dimensions?: WritingDimensions;
  };
  worldSeed: string;
  showRulesForm: boolean;
  clearOnLeave: string[]; // 切走时清空的角色字段
}

export const GENRE_TEMPLATES: GenreTemplate[] = [
  {
    id: '规则怪谈',
    label: '规则怪谈',
    genre: '规则怪谈',
    presetHint: '诡秘之主',
    openingHookHint: '主角误入一处贴满「规则」的空间，第一眼就看到违规者的下场。',
    coreMysteryHint: '这些规则是谁写的？违背规则后真正的代价是什么？',
    writing: {
      sentenceStyle: '短句为主',
      dialogueRatio: 25,
      sensoryPriority: ['视觉', '听觉', '触觉', '嗅觉'],
      dimensions: { suspense: '90', pace: '75', atmosphere: '85' },
    },
    worldSeed: '## 规则体系\n本世界以「可见规则」约束生存；违规必有反馈。\n\n## 边界\n规则可被利用，但不可被彻底废除。\n',
    showRulesForm: true,
    clearOnLeave: ['cultivationRealm'],
  },
  {
    id: '年代重生',
    label: '年代重生',
    genre: '年代重生',
    presetHint: '暗夜君王',
    openingHookHint: '睁眼发现自己回到了关键年份的清晨，手里还攥着上一世的遗憾。',
    coreMysteryHint: '重生是偶然，还是有人在布局改写命运？',
    writing: {
      sentenceStyle: '长短交错',
      dialogueRatio: 40,
      sensoryPriority: ['视觉', '触觉', '嗅觉', '听觉'],
      dimensions: { emotion: '80', pace: '70', realism: '85' },
    },
    worldSeed: '## 时代背景\n改革开放前后的资源与信息差。\n\n## 资源逻辑\n人脉、物资、信息是核心竞争力。\n',
    showRulesForm: false,
    clearOnLeave: ['cultivationRealm'],
  },
  {
    id: '诡异修仙',
    label: '诡异修仙',
    genre: '诡异修仙',
    presetHint: '诡秘之主',
    openingHookHint: '入门仪式上，宗门长老递来的不是功法，而是一枚会眨眼的玉简。',
    coreMysteryHint: '修仙界的「天道」究竟是法则，还是某种更大的诡异？',
    writing: {
      sentenceStyle: '长短交错',
      dialogueRatio: 30,
      sensoryPriority: ['视觉', '触觉', '听觉', '嗅觉'],
      dimensions: { atmosphere: '90', conflict: '80', mystery: '85' },
    },
    worldSeed: '## 力量体系\n修为境界分明；越界必遭反噬。\n\n## 诡异\n部分功法以理智为代价。\n',
    showRulesForm: false,
    // 离开修仙题材时清空境界字段
    clearOnLeave: ['cultivationRealm'],
  },
  {
    id: '神豪签到',
    label: '神豪签到',
    genre: '神豪签到',
    presetHint: '暗夜君王',
    openingHookHint: '系统弹出第一条提示：今日签到成功，到账一笔足以改变人生的资产。',
    coreMysteryHint: '系统的真正主人是谁？签到奖励有没有隐藏代价？',
    writing: {
      sentenceStyle: '短句为主',
      dialogueRatio: 35,
      sensoryPriority: ['视觉', '触觉', '听觉', '嗅觉'],
      dimensions: { pace: '90', powerFantasy: '95', humor: '60' },
    },
    worldSeed: '## 金手指规则\n签到/任务发放资产与权限，存在冷却与隐藏条款。\n',
    showRulesForm: false,
    clearOnLeave: ['cultivationRealm'],
  },
  {
    id: '历史脑洞',
    label: '历史脑洞',
    genre: '历史脑洞',
    presetHint: '暗夜君王',
    openingHookHint: '史书记载的那场政变前夜，主角发现自己成了关键人物的影子。',
    coreMysteryHint: '被改写的历史节点背后，是谁在推动？',
    writing: {
      sentenceStyle: '长句铺陈',
      dialogueRatio: 30,
      sensoryPriority: ['视觉', '听觉', '嗅觉', '触觉'],
      dimensions: { atmosphere: '80', politics: '85', pace: '65' },
    },
    worldSeed: '## 历史坐标\n以真实朝代为底，允许关键脑洞改写。\n\n## 边界\n重大史实不可无因翻转。\n',
    showRulesForm: false,
    clearOnLeave: ['cultivationRealm'],
  },
];

export function getGenreTemplate(id: string): GenreTemplate | undefined {
  return GENRE_TEMPLATES.find((t) => t.id === id);
}
