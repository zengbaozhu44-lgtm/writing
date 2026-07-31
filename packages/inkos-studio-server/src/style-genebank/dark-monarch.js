/**
 * Style Genebank · dark-monarch — runtime mirror of studio/src/style-genebank
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
  bannedPhrases: [
    '深吸一口气', '心跳加速', '意识到', '心中一紧', '觉得自己',
    '他很害怕', '她很害怕', '他很愤怒', '她很悲伤', '很大', '很强', '很古老',
  ],
  defaultSampleIds: ['character-entrance', 'battle-opening'],
};

export const darkMonarchSceneTemplates = {
  emotional: ['intimacy-worldbuilding', 'emotional-twist'],
  action: ['battle-opening', 'combat-strategy'],
  climax: ['battle-opening', 'combat-strategy'],
  dialogue: ['dialogue-threat', 'history-argument'],
  reveal: ['betrayal-reveal', 'power-test'],
  opening: ['character-entrance', 'environment-setup'],
  ending: ['emotional-twist', 'speech-rally'],
  exposition: ['history-argument', 'environment-setup'],
  standard: ['character-entrance', 'dialogue-threat'],
  faction: ['faction-standoff', 'power-test'],
  speech: ['speech-rally', 'history-argument'],
};

export const darkMonarchSamples = [
  {
    id: 'intimacy-worldbuilding',
    name: '私密情感+世界观揭露',
    sample: '夏雨轩的身体慢慢开始移动，指腹停在那枚牙印边缘，像在确认一块领地的边界。\n热度刚要越过临界点，她忽然开口，声音很低：\n“血仆的规矩，你们血族从来不教吗？道歉换不来赦免——只有占有。”\n他动作顿住。她却笑了一下，把那只手按回去，力道不轻不重，刚好让他听见自己的心跳被压住。\n“听清楚。在永夜法里，拒绝也是契约的一部分。”',
    genes: ['情欲是权力谈判', '对话打断动作', '世界观藏枕边话', '身体反应即性格'],
  },
  {
    id: 'battle-opening',
    name: '战斗开场',
    sample: '炽热的子弹洞穿金属的盔甲，闷响滚过广场，像有人把整座钟楼塞进铁桶里砸碎。\n那具躯壳还没倒下，胸口先爆开一圈苍白火焰——能量反噬把骨骼扯成细线，再一根根崩断。\n灰烬落下来。远景里，监察军的阵列还保持着进攻姿态；特写里，面甲裂开一道缝，露出里面已经空了的眼眶。\n陈烨吐掉嘴里的血沫，枪管还烫。\n“下一个。”',
    genes: ['第一句必须是结果', '死亡有能量残留', '远景切特写'],
  },
  {
    id: 'faction-standoff',
    name: '势力对峙',
    sample: '黑暗中，十数名监察军的身影贴着廊柱站着，猩红斗篷一动不动，像被人用钉子钉在夜色里。\n他们对面，黑色角翼张开又合拢，空气里全是铁锈味。两边都不上前。\n真正让广场发冷的，是第三排那排银色面具——仲裁团。他们不站任何一边，只站在能看见双方咽喉的位置。\n没有人喊口号。风吹过旌旗，赤红十字轻轻一颤。\n然后更静了。',
    genes: ['第三方视角', '颜色即立场', '沉默比呐喊有压迫感'],
  },
  {
    id: 'character-entrance',
    name: '角色高光亮相',
    sample: '眼前的陈烨就像是从上古壁画中走出的恶魔——满身血污，踩过红毯，每一步都留下湿黏的脚印。\n华服被撕开半边，露出底下缠着纱布的肩膀；纱布也是脏的，但那双眼睛干净得吓人，像刀尖对着你。\n侍从们下意识后退半步。谁都没敢先说话。\n他抹了一把脸上的血，露出一个不规矩的笑：\n“老子是永夜第七席执行官陈烨，也是你们口中那个该死的‘小陈大人’。谁刚才点我名？”',
    genes: ['外貌不写帅写脏', '目光即武器', '脏话+头衔混搭', '动作定格'],
  },
  {
    id: 'dialogue-threat',
    name: '对话交锋（威胁日常化）',
    sample: '“卑鄙，竟然下毒！”对方的声音发颤，像被掐住了喉咙。\n陈烨从烟盒里抽出一根，递过去，动作慢得近乎体贴。\n“别误会。这烟五毛一包，毒是一百块一两——我分得清账。”\n对方骂了句娘。他听完，只是暗笑，把烟自己点上，火星在指间跳了一下。\n“三代长老的命，也就这个价。你觉得贵，还是觉得便宜？”',
    genes: ['递烟=递死刑', '数字具体化', '脏话是节奏点'],
  },
  {
    id: 'betrayal-reveal',
    name: '阴谋揭露（暗杀中的背叛）',
    sample: '刀先入肉。温热顺着后心往下淌，他甚至还没来得及转身。\n“吩咐我的不是陈奕星大人。”身后那人贴着他耳廓笑，笑声轻得像分享秘密。\n刀刃横拉。血雾喷在廊柱上，他跪下去时，终于听清了最后一句——\n“萧晨曦让我带句话：议会从不养闲人。”\n名字落下，人已经冷了。',
    genes: ['身份揭露在死亡前', '声音先于动作', '最后一句话是名字'],
  },
  {
    id: 'history-argument',
    name: '历史/世界观植入（角色吵架）',
    sample: '“狼人的名字前面加上卑贱两字，是你们血族写进旧盟约的——你不知道？”夏雨轩嗓门不大，却字字砸地。\n“那是战争时期的条款！”\n“条款会过期，偏见不会。”她冷笑，“史书真是个好东西，真的会变成假的，假的会变成规矩。”\n对方张了张嘴，最终一声不吭。\n她大笑出声，像把整段历史都吐回他脸上。',
    genes: ['历史通过反驳植入', '金句收尾', '情绪即立场'],
  },
  {
    id: 'speech-rally',
    name: '演讲/煽动',
    sample: '“支撑着天空的黑耀石塔已经倒塌了数千年，无晓之城埋在灰里，连老鼠都嫌弃那地方没油水。”\n陈烨站在废墟最高处，声音不高，却让底下上千人仰起头。\n“别跟我说我们弱。我们曾经把永夜魔殿的门踹开过两次——你们忘了，史官没忘。”\n风灌进破旗的破洞，猎猎作响。\n“为了血之荣耀。”他只留这一句，“站起来。”',
    genes: ['废墟美学', '具体名词', '口号即高潮'],
  },
  {
    id: 'power-test',
    name: '权力试探（下跪与测试）',
    sample: '魁梧的老者只是微微地点了点头。空气忽然变重，像有一只无形的手按上后颈。\n陈烨的膝盖撞上地毯。他心里骂了一句：这老东西跟块冻了三百年的石头似的，连呼吸都省。\n额头被压到贴地。地毯毛扎进眉心，他听见自己的骨缝轻轻响了一下。\n一根黑线从老者指尖垂下，贴着他的后脊往下滑，冷得像刀背。\n“过了。”老者说。两个字，仪式结束。',
    genes: ['身体角度=权力', '内心吐槽消解严肃', '测试即仪式'],
  },
  {
    id: 'environment-setup',
    name: '环境描写（服务剧情）',
    sample: '原本在夜色中一直是漆黑无光的大宅，此时亮如白昼——数百根白色旌旗沿墙展开，每面旗上都钉着赤红十字。\n两人合抱粗的门柱被铁链缠死，链环还在滴水，像刚从河里捞上来。\n旌旗与铁链本身就是宣告：有人要在这里行刑，也有人要在这里闯进来。\n屋顶先响了一声。主楼灯火未动，广场却已经站满了影。',
    genes: ['对比开场', '数字具体', '颜色即阵营', '禁止纯风景'],
  },
  {
    id: 'combat-strategy',
    name: '内心独白（战斗算计）',
    sample: '心中暗笑的胖子眼神一阵闪动：对面那柄血矛，最多还能捅六次——第七次必裂。\n他自己的护盾撑得住三次「堂堂正正」的对轰，第四次就得装死。\n组合打法他数过，不少于两百种；能活着离开的，大概十七种；其中三种要踩着对方尸体跑。\n他摸了摸袖里的银粉，决定先走最脏的那条。',
    genes: ['战斗前先算账', '引号反讽', '内心独白即策略'],
  },
  {
    id: 'emotional-twist',
    name: '情感转折（带刀子的温情）',
    sample: '那只纤细的小手虽然是如此的冰冷，握进掌心时却像一簇不肯灭的火。\n陈烨难得没说话。走廊尽头，有人投来惊异的目光——那目光比任何告白都响。\n下一秒，她用力一推。他后背撞上墙砖，牙关发麻。\n“别用这种眼神看我。”她甩开手，声音平得像刀背，“我只是手冷。”',
    genes: ['触感即情感', '温情后接动作', '旁观者视角'],
  },
];

export function getSampleById(id) {
  return darkMonarchSamples.find((s) => s.id === id) || null;
}

export function pickDarkMonarchSampleForSceneType(sceneType = 'standard') {
  const key = String(sceneType || 'standard').toLowerCase();
  const ids = darkMonarchSceneTemplates[key] || darkMonarchSceneTemplates.standard;
  for (const id of ids) {
    const hit = getSampleById(id);
    if (hit) return hit;
  }
  return darkMonarchSamples[0];
}

export function resolveStyleGenePack(packId) {
  if (packId === 'dark-monarch' || packId === '暗夜君王') {
    return {
      id: 'dark-monarch',
      voice: darkMonarchVoice,
      samples: darkMonarchSamples,
      templates: darkMonarchSceneTemplates,
      pickSample: pickDarkMonarchSampleForSceneType,
    };
  }
  return null;
}

/**
 * System 附录：只留极短技法提示（≤80 字）
 * 黄金样本由 resolveGoldenSample 单独注入 System（≤400），此处不再二次贴样本
 */
export function buildDarkMonarchSystemAppendix(sceneType = 'standard') {
  const sample = pickDarkMonarchSampleForSceneType(sceneType);
  const moves = (darkMonarchVoice.signatureMoves || []).slice(0, 2).join('；');
  const tip = `技法：${moves}${sample?.name ? ` · 微场景「${sample.name}」` : ''}`;
  return tip.length > 80 ? `${tip.slice(0, 79)}…` : tip;
}

/**
 * 风格符合度评分
 * @returns {{ score: number, hits: string[], bannedHits: string[], reasons: string[] }}
 */
export function scoreStyleFit(chapterText = '', packId = 'dark-monarch') {
  const pack = resolveStyleGenePack(packId);
  if (!pack) {
    return { score: null, hits: [], bannedHits: [], reasons: ['未选择风格基因包'] };
  }
  const text = String(chapterText || '');
  const voice = pack.voice;
  const hits = [];
  const reasons = [];

  // signature move heuristics
  const checks = [
    { id: '数字具体化', re: /(\d+\s*(次|种|块|两|包|年|人|根|步|秒|分钟)|[一二三四五六七八九十百千万]+\s*(次|种|块|两|包|年)|五毛|一百块)/ },
    { id: '引号反讽', re: /「[^」]{2,12}」|“[^”]{2,12}”/ },
    { id: '脏话/粗口节奏', re: /老子|他妈|该死|娘的|他妈的|滚/ },
    { id: '身体反应', re: /手心|后颈|牙关|膝盖|指腹|骨缝|冷汗|发麻|后退半步/ },
    { id: '温情后接动作', re: /(握|牵|触).{0,30}(推|甩|踹|撞)/s },
    { id: '威胁日常化', re: /递(烟|水)|披(上)?外套|拍了?拍肩膀/ },
    { id: '动作定格', re: /脚印|烟灭|血手印|火星|面甲/ },
    { id: '结果先行', re: /^(?:[^。]{0,20})(洞穿|爆开|割|捅|跪)/m },
  ];

  for (const c of checks) {
    if (c.re.test(text)) {
      hits.push(c.id);
    }
  }

  const bannedHits = [];
  for (const phrase of voice.bannedPhrases || []) {
    if (phrase && text.includes(phrase)) bannedHits.push(phrase);
  }
  // fuzzy banned
  if (/他很(愤怒|害怕|悲伤)|她很(愤怒|害怕|悲伤)/.test(text)) {
    bannedHits.push('情绪贴标签（他很…）');
  }

  let score = 40 + hits.length * 8;
  score -= bannedHits.length * 12;
  score = Math.max(0, Math.min(100, score));

  if (hits.length) reasons.push(`命中技法：${hits.join('、')}`);
  if (bannedHits.length) reasons.push(`禁词/禁写法：${bannedHits.join('、')}`);
  if (!hits.length && !bannedHits.length) reasons.push('未明显命中招牌技法，也未触碰禁词');

  return {
    score,
    hits,
    bannedHits,
    reasons,
    packId: pack.id,
    label: voice.label,
  };
}
