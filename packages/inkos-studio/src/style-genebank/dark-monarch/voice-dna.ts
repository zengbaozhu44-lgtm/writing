/**
 * 暗夜君王 · Voice DNA
 */
export const darkMonarchVoice = {
  id: 'dark-monarch',
  label: '暗夜君王（痞气异能/都市黑暗）',
  author: '拂晓晨星',
  source: '暗夜君王',

  sentenceStyle: '长短交错，紧张短句3-8字，推进长句20-40字，情绪爆发可达50字',

  dialogueStyle: '粗粝真实，允许脏话作为情绪标点；威胁包装成日常动作；自我介绍用脏话+头衔混搭',

  innerMonologue: '内心算计不解释，用数字量化；目的具体；引号反讽；内心吐槽消解严肃',

  actionStyle: '远景→中景→特写三层；战斗先写结果再写过程；死亡有能量残留/世界观特效',

  emotionDelivery: '身体反应替代心理描写；禁止「意识到/觉得/害怕」；用「别人反应」写「主角气势」',

  worldbuilding: '历史通过角色吵架植入；不是旁白解释；金句收尾；数字具体化',

  signatureMoves: [
    '递烟+毒药（威胁日常化）',
    '「堂堂正正」加引号（反讽）',
    '数字对比（100块一两/5毛一包）',
    '动作定格结尾（脚印/烟灭/血手印）',
    '多线并行（广场+屋顶+主楼同时发生）',
    '温情→动作打断（牵手→推倒）',
    '废墟美学演讲（不说强说曾经强）',
  ],

  banned: [
    '深吸一口气',
    '心跳加速',
    '意识到',
    '心中一紧',
    '他很愤怒/害怕/悲伤（必须写身体反应）',
    '纯风景描写（环境必须服务剧情）',
    '模糊形容词（很大/很强/很古老，必须具体数字）',
  ],

  /** 诊断用：短禁词（精确匹配） */
  bannedPhrases: [
    '深吸一口气',
    '心跳加速',
    '意识到',
    '心中一紧',
    '觉得自己',
    '他很害怕',
    '她很害怕',
    '他很愤怒',
    '她很悲伤',
    '很大',
    '很强',
    '很古老',
  ],

  /** Wizard 默认填充用开场样本 id */
  defaultSampleIds: ['character-entrance', 'battle-opening'] as const,
};

export type DarkMonarchVoice = typeof darkMonarchVoice;
