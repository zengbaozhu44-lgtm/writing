/**
 * Conflict Engine — 商业冲突驱动力
 * 不是制造困难，而是让主角付出代价
 * 每个 Scene：Opponent · Opposition · Risk · Cost · Loss
 */

const TRIVIAL_OBSTACLE = /门打不开|路被堵|找不到钥匙|信号不好|天气恶劣/u;
const STAKE_MARKERS = /妹妹|家人|信用|档案|生命|死|背叛|信任|身份|倒计时|今晚|天亮/u;

function norm(v = '') {
  return String(v || '').trim();
}

function inferOpponent({
  plan = {},
  scene = {},
  intent = {},
  storyDna = {},
  characterDesire = null,
} = {}) {
  if (scene.conflict?.opponent || plan.conflict?.opponent) {
    return norm(scene.conflict?.opponent || plan.conflict?.opponent);
  }
  const key = norm(scene.keyCharacter || intent.keyCharacter || intent.supportingCharacter);
  if (key && /系统|规则|秩序|组织|公司/u.test(`${plan.obstacle}${plan.newInformation}`)) {
    return `${key}代表的立场 vs ${intent.pov || 'POV'}`;
  }
  if (/系统|算法|规则|秩序/u.test(`${storyDna.main_conflict || ''}${plan.obstacle}`)) {
    return '系统 / 规则本身';
  }
  if (key) return key;
  return storyDna.antagonist || storyDna.main_conflict?.slice(0, 20) || '局面本身';
}

function inferOpposition(plan = {}, scene = {}, opponent = '') {
  const raw = norm(plan.obstacle || scene.obstacle || scene.conflict);
  if (raw && !TRIVIAL_OBSTACLE.test(raw)) {
    return raw.includes('但是') ? raw : `${raw} — 且${opponent}不会让步`;
  }
  const choice = norm(plan.choice || scene.choice);
  if (choice) return `可行路径存在，但${choice} — 每条路都有代价`;
  return '表面可达成目标，实则任何选择都会伤及 POV 最在意之物';
}

function inferRisk(plan = {}, scene = {}, characterDesire = null, questions = {}) {
  const cliff = norm(plan.cliffhanger || scene.cliffhanger);
  const rq = questions.readerQuestion?.readerQuestion || '';
  if (STAKE_MARKERS.test(`${cliff}${rq}`)) {
    return cliff || rq || `触发 ${characterDesire?.fear || '最大恐惧'}`;
  }
  if (characterDesire?.fear) return `一旦失手：${characterDesire.fear}`;
  return '拖延或选错将使局势不可逆恶化';
}

function inferCost(plan = {}, scene = {}, characterDesire = null, risk = '') {
  const explicit = norm(scene.conflict?.cost || plan.conflict?.cost);
  if (explicit && !TRIVIAL_OBSTACLE.test(explicit)) return explicit;

  const consequence = norm(plan.consequence || scene.consequence);
  if (consequence && STAKE_MARKERS.test(consequence)) {
    return `达成目标的代价：${consequence}`;
  }

  const choice = norm(plan.choice || scene.choice);
  if (/上报|隐瞒|救|牺牲|背叛|信任/u.test(choice)) {
    return `若选此路：${choice} — 须付出可见代价（信用/关系/时间/生命）`;
  }

  if (/妹妹|家人/u.test(`${risk}${characterDesire?.fear || ''}`)) {
    return '门可以打开，但打开以后妹妹会死 — 成功与救人不可兼得';
  }
  if (/信用|档案/u.test(`${plan.obstacle}${consequence}`)) {
    return '可以推进，但信用档案将亮黄灯甚至清零';
  }

  return `不是「做不到」，而是「做到了也要付 ${characterDesire?.fear?.slice(0, 20) || '惨痛代价'}」`;
}

function inferLoss(plan = {}, cost = '', characterDesire = null) {
  const explicit = norm(plan.conflict?.loss);
  if (explicit) return explicit;
  if (/死|失去|清零|决裂|暴露/u.test(cost)) return cost;
  if (characterDesire?.wound) return `重蹈伤口：${characterDesire.wound}`;
  return '无论选哪边，POV 都须失去一部分安全感或信任';
}

function isTrivialConflict(opposition = '', cost = '') {
  return TRIVIAL_OBSTACLE.test(opposition) && !STAKE_MARKERS.test(cost);
}

/**
 * Scene 级冲突规划 — Writer P1
 */
export function buildSceneConflict({
  scene = {},
  intent = {},
  plan = {},
  characterDesire = null,
  questions = {},
  chapterClimax = null,
  climaxRole = null,
  sceneIndex = 1,
  sceneCount = 4,
} = {}) {
  if (scene.conflict?.opponent && scene.conflict?.cost) {
    return normalizeConflict(scene.conflict);
  }

  const opponent = inferOpponent({ plan, scene, intent, characterDesire });
  let opposition = inferOpposition(plan, scene, opponent);
  const risk = inferRisk(plan, scene, characterDesire, questions);
  let cost = inferCost(plan, scene, characterDesire, risk);
  const loss = inferLoss(plan, cost, characterDesire);

  if (isTrivialConflict(opposition, cost)) {
    opposition = `表面障碍可克服，真正难点是代价 — ${cost.slice(0, 50)}`;
  }

  const isClimaxScene = sceneIndex >= sceneCount
    || chapterClimax?.climaxSceneIndex === sceneIndex;
  const isIrreversibleScene = isClimaxScene || climaxRole?.isPreClimax || climaxRole?.isClimax;
  if (isClimaxScene && chapterClimax?.maxCost) {
    cost = chapterClimax.maxCost;
    opposition = chapterClimax.maxConflict || opposition;
  }

  const irreversibleChange = isIrreversibleScene
    ? inferIrreversibleChange({ plan, scene, intent, chapterClimax, situation: plan.situation })
    : null;

  const valid = !isTrivialConflict(opposition, cost) && STAKE_MARKERS.test(`${cost}${loss}${risk}`);

  return {
    version: 'conflict-engine-2',
    opponent,
    opposition,
    risk,
    cost,
    loss,
    irreversibleChange,
    isIrreversible: Boolean(irreversibleChange),
    valid,
    rule: '冲突不是「门打不开」，而是「做到了也要付出代价」',
    writerMust: `Obstacle Beat 须写清：${opposition.slice(0, 40)} → 代价 ${cost.slice(0, 40)}`,
    irreversibleRule: isIrreversibleScene
      ? '高潮/不可逆 Scene 须产生永久改变 — 禁止冲突结束后世界恢复原状'
      : null,
  };
}

function inferIrreversibleChange({
  plan = {}, scene = {}, intent = {}, chapterClimax = null, situation = {},
} = {}) {
  const explicit = norm(scene.conflict?.irreversibleChange || plan.irreversibleChange);
  if (explicit) return explicit;

  const info = norm(plan.newInformation || scene.newInformation);
  const cons = norm(plan.consequence || scene.consequence);
  const key = norm(intent.keyCharacter || '苏晚');

  if (/知道|知情|发现|重置|记忆/u.test(`${info}${cons}`)) {
    if (/妹妹|家人/u.test(info + cons)) return '妹妹知道世界重置 — 无法回到「不知情」状态';
    if (/系统|记忆|标记/u.test(info + cons)) return '系统发现 POV 拥有跨循环记忆 — 无法回头';
    if (key) return `${key}成为系统目标/知情者 — 关系与身份永久改变`;
  }

  if (chapterClimax?.storyShift) return chapterClimax.storyShift;
  if (chapterClimax?.maxInfoRelease) return chapterClimax.maxInfoRelease;

  return situation.closingWorldState
    ? `局面永久改变 — ${situation.closingWorldState.slice(0, 55)}`
    : '本 Scene 结束后，故事无法回到冲突前状态';
}

function normalizeConflict(c = {}) {
  return {
    version: 'conflict-engine-2',
    opponent: norm(c.opponent),
    opposition: norm(c.opposition),
    risk: norm(c.risk),
    cost: norm(c.cost),
    loss: norm(c.loss),
    irreversibleChange: norm(c.irreversibleChange) || null,
    isIrreversible: Boolean(c.irreversibleChange),
    valid: c.valid !== false,
    rule: c.rule || '冲突须让主角付出代价',
    writerMust: c.writerMust || '',
    irreversibleRule: c.irreversibleRule || null,
  };
}

export function formatConflictBlock(conflict = {}) {
  if (!conflict?.opponent) return '';

  return [
    '### Conflict Engine · 代价型冲突（P1）',
    '**铁律**：不是制造困难，是让主角**付出代价**。',
    '',
    `- **Opponent（对手/阻力源）**：${conflict.opponent}`,
    `- **Opposition（为何难）**：${conflict.opposition}`,
    `- **Risk（失手后果）**：${conflict.risk}`,
    `- **Cost（做成也要付的代价）**：${conflict.cost}`,
    `- **Loss（必失之物）**：${conflict.loss}`,
    '',
    '❌ 禁止：门打不开、路被堵等无代价障碍',
    '✅ 必须：可行路径存在，但成功/失败都要伤及 POV 最在意之物',
    conflict.valid ? '' : '- ⚠️ **Director 警告**：当前冲突代价不足，Writer 须补足 Cost/Loss',
    conflict.irreversibleChange
      ? `- **🔒 不可逆改变**：${conflict.irreversibleChange}`
      : '',
    conflict.isIrreversible
      ? '- **禁止**：冲突结束后世界/关系恢复原状 — 从此无法回头'
      : '',
  ].filter(Boolean).join('\n');
}

export function formatConflictBrief(conflict = {}) {
  if (!conflict?.opponent) return '';
  return [
    '### Conflict · 代价型',
    `- **对手**：${conflict.opponent}`,
    `- **代价**：${conflict.cost?.slice(0, 50)}`,
    `- **失手**：${conflict.risk?.slice(0, 40)}`,
  ].join('\n');
}
