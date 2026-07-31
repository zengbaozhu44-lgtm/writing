/**
 * Climax Engine — 章级高潮规划
 * 每章高潮：最大冲突 · 最大选择 · 最大代价 · 最大信息释放
 * 避免「一直发现秘密」— 须真正改变整个故事
 */

function norm(v = '') {
  return String(v || '').trim();
}

/**
 * Chapter Climax Plan — Chapter Director 输出
 */
export function buildChapterClimaxPlan({
  intent = {},
  chapter = 1,
  sceneCount = 4,
  scenes = [],
  storyDna = {},
  hookLadder = null,
  chapterQuestion = '',
} = {}) {
  const climaxSceneIndex = sceneCount;
  const lastScene = scenes.find((s) => (s.index ?? sceneCount) === climaxSceneIndex) || scenes[scenes.length - 1] || {};
  const lastPlan = lastScene.scenePlan || lastScene;
  const pov = intent.pov || '主角';

  const maxConflict = norm(lastPlan.obstacle || lastScene.conflict || intent.obstacles?.[0])
    || `第 ${chapter} 章终极对抗 — ${storyDna.main_conflict?.slice(0, 40) || '核心阻力总爆发'}`;

  const maxChoice = norm(lastPlan.choice || lastScene.choice)
    || `POV 必须在「保全自己」与「改变世界/救人在意者」之间二选一 — 无第三条路`;

  const maxCost = norm(lastPlan.consequence || lastScene.consequence)
    || `无论选哪边，${pov}都须付出本章最高代价 — 关系/信用/生命至少一项不可逆`;

  const maxInfoRelease = norm(lastPlan.newInformation || lastScene.newInformation)
    || `释放改变全书认知的信息 — 不是「又发现一个线索」，而是「规则/身份/真相被改写」`;

  const hookEntry = hookLadder?.find((h) => h.sceneIndex === climaxSceneIndex);
  const storyShift = inferStoryShift(maxInfoRelease, maxCost, storyDna, chapterQuestion);

  const sceneRoles = [];
  for (let i = 1; i <= sceneCount; i += 1) {
    if (i === climaxSceneIndex) {
      sceneRoles.push({ sceneIndex: i, role: 'climax', escalate: 'peak' });
    } else if (i === climaxSceneIndex - 1) {
      sceneRoles.push({ sceneIndex: i, role: 'pre_climax', escalate: 'maximum_tension' });
    } else if (i === 1) {
      sceneRoles.push({ sceneIndex: i, role: 'opening', escalate: 'hook' });
    } else {
      sceneRoles.push({ sceneIndex: i, role: 'escalation', escalate: 'rising' });
    }
  }

  return {
    version: 'climax-engine-1',
    chapter,
    climaxSceneIndex,
    maxConflict,
    maxChoice,
    maxCost,
    maxInfoRelease,
    storyShift,
    hookType: hookEntry?.type || hookEntry?.name || 'PointOfNoReturn',
    mustChangeStory: true,
    antiPattern: '禁止整章只有「发现秘密」— 高潮须改变世界状态/角色立场/关系格局',
    sceneRoles,
    rule: '末 Scene = 章内峰值：最大冲突+选择+代价+信息释放',
  };
}

function inferStoryShift(info = '', cost = '', storyDna = {}, chapterQ = '') {
  if (/重置|规则|身份|背叛|同盟|不可逆|无法回头/u.test(`${info}${cost}`)) {
    return `故事格局改变 — ${info.slice(0, 45) || chapterQ.slice(0, 45)}`;
  }
  if (/世界|系统|真相/u.test(storyDna.core_hook || storyDna.main_question || '')) {
    return 'POV 对世界的认知被永久改写，不是多一条线索';
  }
  return '章末局面须与章初不可同日而语 — 世界/人物/关系至少两项跃迁';
}

/**
 * Scene 在章高潮中的角色
 */
export function buildSceneClimaxRole({
  sceneIndex = 1,
  sceneCount = 4,
  climaxPlan = null,
} = {}) {
  if (!climaxPlan) {
    return {
      sceneIndex,
      role: sceneIndex >= sceneCount ? 'climax' : 'escalation',
      isClimax: sceneIndex >= sceneCount,
    };
  }

  const roleEntry = climaxPlan.sceneRoles?.find((r) => r.sceneIndex === sceneIndex);
  const isClimax = sceneIndex === climaxPlan.climaxSceneIndex;

  return {
    sceneIndex,
    role: roleEntry?.role || (isClimax ? 'climax' : 'escalation'),
    isClimax,
    isPreClimax: sceneIndex === climaxPlan.climaxSceneIndex - 1,
    climaxPlan: isClimax || sceneIndex === climaxPlan.climaxSceneIndex - 1 ? climaxPlan : null,
    writerMust: isClimax
      ? `章高潮：${climaxPlan.maxConflict?.slice(0, 30)} · 选择 ${climaxPlan.maxChoice?.slice(0, 30)}`
      : (sceneIndex === climaxPlan.climaxSceneIndex - 1
        ? '推向章高潮 — 收紧选择，抬高代价'
        : null),
  };
}

export function formatChapterClimaxBlock(plan = {}) {
  if (!plan?.maxConflict) return '';

  return [
    '### Chapter Climax Plan · 章高潮（Director → Writer）',
    `**高潮 Scene**：S${plan.climaxSceneIndex}`,
    '',
    `- **最大冲突**：${plan.maxConflict}`,
    `- **最大选择**：${plan.maxChoice}`,
    `- **最大代价**：${plan.maxCost}`,
    `- **最大信息释放**：${plan.maxInfoRelease}`,
    `- **故事位移**：${plan.storyShift}`,
    '',
    `**禁止**：${plan.antiPattern}`,
    '**末 Scene 须**：改变世界格局，不是又发现一个秘密',
  ].join('\n');
}

export function formatClimaxSceneBlock(role = {}, climaxPlan = {}) {
  if (!role?.isClimax && !role?.isPreClimax) return '';
  const plan = climaxPlan || role.climaxPlan;
  if (!plan) return '';

  if (role.isClimax) {
    return [
      '### Climax Scene · 章内高潮（P1 强化）',
      `- **最大冲突**：${plan.maxConflict}`,
      `- **最大选择**：${plan.maxChoice}`,
      `- **最大代价**：${plan.maxCost}`,
      `- **最大信息释放**：${plan.maxInfoRelease}`,
      `- **故事位移**：${plan.storyShift}`,
      '- 本 Scene 写完，读者须感到「故事已经不一样了」',
    ].join('\n');
  }

  return [
    '### Pre-Climax · 推向高潮',
    '- 收紧选择空间，让代价可见',
    `- **推向**：${plan.maxConflict?.slice(0, 50)}`,
  ].join('\n');
}

export function formatClimaxBrief(plan = {}) {
  if (!plan?.climaxSceneIndex) return '';
  return [
    '### Chapter Climax',
    `- **高潮 Scene**：S${plan.climaxSceneIndex}`,
    `- **最大代价**：${plan.maxCost?.slice(0, 45)}`,
    `- **故事位移**：${plan.storyShift?.slice(0, 45)}`,
  ].join('\n');
}
