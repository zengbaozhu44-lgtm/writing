/**
 * Scene Entertainment Layer — 场景必须好看
 * 结构已强；商业网文还要视觉/情绪/对白/反转瞬间
 * 只驱动 Writer Prompt，不新增 Analyzer
 */

function norm(v = '') {
  return String(v || '').trim();
}

function nameOf(storyDna = {}, plan = {}, intent = {}) {
  return norm(intent.pov || storyDna.protagonist || plan.pov || '他');
}

/**
 * 每 Scene 四个娱乐瞬间 — Writer 须落地，不是堆事件说明
 */
export function buildSceneEntertainment({
  plan = {},
  scene = {},
  storyDna = {},
  intent = {},
  climaxRole = null,
  sceneEnding = null,
  characterBehavior = null,
  conflict = null,
  sceneIndex = 1,
  chapter = 1,
} = {}) {
  if (scene.entertainment?.visualMoment && scene.entertainment?.surpriseMoment) {
    return normalizeEntertainment(scene.entertainment);
  }
  if (plan.entertainment?.visualMoment && plan.entertainment?.surpriseMoment) {
    return normalizeEntertainment(plan.entertainment);
  }

  const name = nameOf(storyDna, plan, intent);
  const goal = norm(plan.goal || scene.goal);
  const choice = norm(plan.choice || scene.choice);
  const info = norm(plan.newInformation || scene.newInformation);
  const cliff = norm(plan.cliffhanger || scene.cliffhanger);
  const consequence = norm(plan.consequence || scene.consequence);
  const blob = `${goal} ${choice} ${info} ${cliff} ${storyDna.core_hook || ''}`;

  const visualMoment = inferVisualMoment(name, blob, goal, climaxRole, sceneIndex, chapter);
  const emotionalMoment = inferEmotionalMoment(name, characterBehavior, consequence, choice);
  const dialogueMoment = inferDialogueMoment(name, info, cliff, sceneEnding, sceneIndex);
  const surpriseMoment = inferSurpriseMoment(name, info, consequence, conflict, cliff, sceneIndex);

  return {
    version: 'scene-entertainment-1',
    entertainment: {
      visualMoment,
      emotionalMoment,
      dialogueMoment,
      surpriseMoment,
    },
    writerMust: '本 Scene 须至少落地 2 个娱乐瞬间（视觉/对白/反转优先）；禁止只有「发现数据异常」式说明',
    exampleWrong: `${name}进入系统空间，发现数据异常。`,
    exampleRight: [
      `视觉：${visualMoment}`,
      `对白：${dialogueMoment}`,
      `反转：${surpriseMoment}`,
    ].join('\n'),
    valid: Boolean(visualMoment && surpriseMoment),
    rule: '场景必须好看 — 结构正确不够，读者要记得画面',
  };
}

function normalizeEntertainment(ent = {}) {
  const e = ent.entertainment || ent;
  return {
    version: 'scene-entertainment-1',
    entertainment: {
      visualMoment: norm(e.visualMoment),
      emotionalMoment: norm(e.emotionalMoment),
      dialogueMoment: norm(e.dialogueMoment),
      surpriseMoment: norm(e.surpriseMoment),
    },
    writerMust: ent.writerMust
      || '本 Scene 须落地视觉/情绪/对白/反转中至少两项好看瞬间',
    exampleWrong: ent.exampleWrong || '发现数据异常。',
    exampleRight: ent.exampleRight || '',
    valid: true,
    rule: '场景必须好看',
  };
}

function inferVisualMoment(name, blob, goal, climaxRole, sceneIndex = 1, chapter = 1) {
  const visuals = [
    `所有人的时间停止，只有${name}的影子还在移动`,
    `灯光一格格暗下去，墙角表针自己跳了一格`,
    `门缝外走廊里的人影像被按了暂停，尘埃在光柱里抖`,
    `${name}抬眼时整间房的声音被抽空，只剩呼吸`,
    `监控屏定格，唯独他像素还在抖动`,
    `雨停在半空，一滴水悬在他睫毛前`,
    `电梯楼层停在「04:00」，门却还没开`,
    `所有人的嘴张着，却听不见下一句话`,
  ];
  // 优先关键词，否则按章/场轮换，避免全年「时间停止」一张图
  if (/影子|镜像|镜子/u.test(blob)) return visuals[0];
  if (/倒计时|秒|分钟|四点/u.test(blob) || climaxRole?.isClimax) return visuals[1];
  if (/门|进入|潜入/u.test(`${blob}${goal}`)) return visuals[2];
  if (/雨|窗外/u.test(blob)) return visuals[5];
  if (/监控|屏幕|数据/u.test(blob)) return visuals[4];
  return visuals[(chapter * 3 + sceneIndex) % visuals.length];
}

function inferEmotionalMoment(name, behavior, consequence, choice) {
  const fear = behavior?.behaviorLogic?.fear;
  const desire = behavior?.behaviorLogic?.desire;
  if (fear && desire) {
    return `${name}明知道会触发「${fear.slice(0, 12)}」，仍为「${desire.slice(0, 12)}」迈出一步 — 用停顿与手部动作，不写「他很担心」`;
  }
  if (consequence) {
    return `代价落地的瞬间，${name}没有哭/喊，只是把某种东西握紧又松开 — ${consequence.slice(0, 24)}`;
  }
  if (choice) {
    return `做出「${choice.slice(0, 20)}」时，${name}的声音比动作更慢半拍`;
  }
  return `${name}想退一步，脚却没动 — 情绪只写身体，不写形容词`;
}

function inferDialogueMoment(name, info, cliff, sceneEnding, sceneIndex = 1) {
  const lines = [
    `「你终于发现自己不是第一次来到这里。」`,
    `「别抬头。你一抬头，它就知道你还记得。」`,
    `「如果你是对的，那我们活到现在算什么？」`,
    `「${name}，你听到刚才那声响了吗？——没有？那就糟了。」`,
    `「名单上有你。也有我。别装不认识。」`,
    `「四点会重置世界。五点会重置你。」`,
  ];
  if (/记忆|死亡|第.*次|不是第一次/u.test(info)) return lines[0];
  if (sceneEnding?.type === 'question' || /谁|什么|为什么/u.test(cliff)) {
    return cliff
      ? `「${cliff.replace(/[？?。！!]/gu, '').slice(0, 28)}？」`
      : lines[2];
  }
  if (/系统|上报|档案|名单/u.test(`${info}${cliff}`)) return lines[1];
  return lines[(sceneIndex + (info?.length || 0)) % lines.length];
}

function inferSurpriseMoment(name, info, consequence, conflict, cliff, sceneIndex = 1) {
  if (/死亡|死了|次/u.test(info) || /记忆/u.test(info)) {
    const n = 30 + ((sceneIndex * 7) % 20);
    return `系统记录显示：${name}已经死亡${n}次`;
  }
  if (conflict?.irreversibleChange) {
    return `${conflict.irreversibleChange.slice(0, 42)} — 这一句落地后世界回不去`;
  }
  if (consequence && /知道|发现|暴露/u.test(consequence)) {
    return `${consequence.slice(0, 40)} — 读者以为还隐藏着的，已经泄漏`;
  }
  if (info) {
    return `${info.slice(0, 42)} — 用物件/屏幕/一声提示落地，禁止「他突然明白」`;
  }
  if (cliff) {
    return `反转未说完：${cliff.slice(0, 36)}`;
  }
  return `屏幕最底下一行不是警告，是他的名字，后面跟着「已归档」`;
}

export function formatSceneEntertainmentBlock(ent = {}) {
  if (!ent?.entertainment?.visualMoment) return '';

  const e = ent.entertainment;
  return [
    '### Scene Entertainment · 场景必须好看（P2）',
    '',
    '**结构正确不够。本 Scene 须有可被读者记住的瞬间。**',
    '',
    '```',
    'entertainment:',
    `  visualMoment: ${e.visualMoment}`,
    `  emotionalMoment: ${e.emotionalMoment}`,
    `  dialogueMoment: ${e.dialogueMoment}`,
    `  surpriseMoment: ${e.surpriseMoment}`,
    '```',
    '',
    `- **Writer 必做**：${ent.writerMust}`,
    '',
    `❌ ${ent.exampleWrong}`,
    '',
    '✅',
    ent.exampleRight || [
      `视觉：${e.visualMoment}`,
      `对白：${e.dialogueMoment}`,
      `反转：${e.surpriseMoment}`,
    ].join('\n'),
    '',
    '- 禁止：只有「发现异常/查看数据」式说明腔',
    '- 四个瞬间可分散在不同 Beat，但视觉 + 反转至少各落地一次',
  ].join('\n');
}

export function formatSceneEntertainmentBrief(ent = {}) {
  if (!ent?.entertainment?.visualMoment) return '';
  return `Entertainment：视觉「${ent.entertainment.visualMoment.slice(0, 24)}」· 反转「${ent.entertainment.surpriseMoment?.slice(0, 24) || ''}」`;
}
