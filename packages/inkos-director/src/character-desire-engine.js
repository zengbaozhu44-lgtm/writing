/**
 * Character Desire Engine — 角色吸引力
 * 爆款核心：读者想知道这个人最后会变成什么样
 * Writer 每 Scene 须推动角色目标或角色内在变化
 */

const DEFAULT_DESIRE = {
  externalGoal: '弄清真相并阻止局势恶化',
  internalDesire: '证明自己不是疯子、值得被信任',
  fear: '再次失去重要的人',
  wound: '曾经没能保护好最重要的人',
  belief: '只要够努力就能改变命运',
  changeArc: '从逃避真相到主动改变世界',
};

function norm(v = '') {
  return String(v || '').trim();
}

/**
 * 从 Story DNA / Intent 解析角色列表
 */
export function resolveCharactersFromDna(storyDna = {}, intent = {}) {
  const raw = intent.characters
    || storyDna.characters
    || storyDna.cast
    || [];
  if (Array.isArray(raw) && raw.length) {
    return raw.map((c) => (typeof c === 'string' ? { name: c } : c));
  }
  const pov = intent.pov || storyDna.protagonist || storyDna.pov || '主角';
  return [{ name: pov, role: 'protagonist' }];
}

/**
 * 解析 POV 角色
 */
export function resolvePovCharacter(storyDna = {}, intent = {}) {
  const povName = norm(intent.pov || storyDna.protagonist || storyDna.pov);
  const chars = resolveCharactersFromDna(storyDna, intent);
  const found = chars.find((c) => norm(c.name) === povName);
  if (found) return found;
  return { name: povName || '主角', role: 'protagonist' };
}

/**
 * 构建角色欲望档案
 */
export function buildCharacterDesireProfile({
  character = null,
  storyDna = {},
  intent = {},
  chapter = 1,
} = {}) {
  const pov = character || resolvePovCharacter(storyDna, intent);
  const name = norm(pov.name) || '主角';

  if (pov.desire || pov.externalGoal) {
    return normalizeDesire({ ...pov, name });
  }

  const dnaChar = (storyDna.character_desires || storyDna.characterDesires || {})[name];
  if (dnaChar) {
    return normalizeDesire({ name, ...dnaChar });
  }

  const mainGoal = norm(intent.mainGoal || storyDna.main_goal);
  const theme = norm(storyDna.theme);
  const inferred = { ...DEFAULT_DESIRE, name };

  if (mainGoal) inferred.externalGoal = mainGoal;
  if (/重置|循环|刷新/u.test(storyDna.core_hook || storyDna.main_question || '')) {
    inferred.externalGoal = inferred.externalGoal || '阻止世界重置并弄清真相';
    inferred.internalDesire = '证明自己不是疯子';
    inferred.fear = '再次失去妹妹或重要的人';
    inferred.wound = '过去救不了妹妹';
    inferred.changeArc = '从逃避真相到主动改变世界';
  }
  if (theme) {
    inferred.belief = `${name}相信：${theme.slice(0, 40)}`;
  }
  if (chapter > 5) {
    inferred.changeArc = `第 ${chapter} 章阶段：${inferred.changeArc} — 须可见推进`;
  }

  return normalizeDesire(inferred);
}

function normalizeDesire(d = {}) {
  return {
    name: norm(d.name) || '主角',
    externalGoal: norm(d.externalGoal) || DEFAULT_DESIRE.externalGoal,
    internalDesire: norm(d.internalDesire) || DEFAULT_DESIRE.internalDesire,
    fear: norm(d.fear) || DEFAULT_DESIRE.fear,
    wound: norm(d.wound) || DEFAULT_DESIRE.wound,
    belief: norm(d.belief) || DEFAULT_DESIRE.belief,
    changeArc: norm(d.changeArc) || DEFAULT_DESIRE.changeArc,
  };
}

/**
 * Scene 级角色推进 — Writer 必须落地
 */
export function buildSceneCharacterPush({
  desire = {},
  plan = {},
  scene = {},
  situation = {},
  prevPush = null,
} = {}) {
  const name = desire.name || 'POV';
  const before = prevPush?.after
    || situation.characterState?.before
    || `${name}坚持：${desire.belief?.slice(0, 30) || '我能控制局面'}`;

  const consequence = norm(plan.consequence || scene.consequence);
  const choice = norm(plan.choice || scene.choice);
  const info = norm(plan.newInformation || scene.newInformation);

  let after = norm(scene.characterAfter);
  if (!after) {
    if (consequence && /动摇|怀疑|恐惧|愧疚|决心|信任|决裂/u.test(consequence)) {
      after = `${name}内心/立场变化 — ${consequence.slice(0, 50)}`;
    } else if (info && !/调查|发现异常/u.test(info)) {
      after = `${name}对自我的认知改变 — ${info.slice(0, 45)}`;
    } else if (choice) {
      after = `${name}做出选择后无法回到从前 — ${choice.slice(0, 40)}`;
    } else {
      after = `${name}向「${desire.changeArc?.slice(0, 25) || '成长'}」推进一步`;
    }
  }

  const pushed = before !== after
    && (consequence || choice || info || scene.characterAfter);

  return {
    character: name,
    before,
    after,
    externalGoal: desire.externalGoal,
    internalDesire: desire.internalDesire,
    fear: desire.fear,
    scenePush: pushed
      ? `推动 ${name}：${desire.internalDesire?.slice(0, 30)} — 本 Scene 须可见变化`
      : `本 Scene 须推动 ${name} 的外部目标或内在欲望`,
    mustChange: true,
    valid: pushed || Boolean(consequence || choice),
  };
}

export function formatCharacterDesireBrief(desire = {}, push = {}) {
  if (!desire?.name) return '';
  return [
    '### Character Desire · 角色吸引力',
    `- **POV**：${desire.name}`,
    `- **外部目标**：${desire.externalGoal}`,
    `- **内在需求**：${desire.internalDesire}`,
    `- **恐惧**：${desire.fear}`,
    `- **伤口**：${desire.wound}`,
    `- **成长弧**：${desire.changeArc}`,
    push.scenePush ? `- **本 Scene 推进**：${push.scenePush}` : '',
    push.before && push.after ? `- **角色状态**：${push.before.slice(0, 35)} → ${push.after.slice(0, 35)}` : '',
  ].filter(Boolean).join('\n');
}

/** Priority 1 — Writer 强制执行块 */
export function formatCharacterDesireBlock(desire = {}, push = {}) {
  if (!desire?.name) return '';
  return [
    '### Character Goal · 角色必推进（P1）',
    `- **外部目标**：${desire.externalGoal} — 本 Scene 须推进或受挫`,
    `- **内在需求**：${desire.internalDesire} — 用动作/选择体现，禁止心理独白堆砌`,
    `- **恐惧**：${desire.fear} — 可被触发，但须有释放节拍`,
    push.before && push.after
      ? `- **角色变化**：${push.before} → ${push.after}`
      : `- **角色变化**：须从「${push.before?.slice(0, 30) || desire.belief?.slice(0, 30)}」变为不同状态`,
    '- **铁律**：读者须更想知道这个人最后会变成什么样',
  ].filter(Boolean).join('\n');
}
