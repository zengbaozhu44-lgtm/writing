/**
 * Character Desire Engine — 角色欲望投影（S8.2 Boundary）
 * 只读取显式 authored / storyDna / intent 字段；禁止 DEFAULT 伪造心理主体。
 * 缺失 = missing，不是「人物没有心理」。
 */

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

function pickExplicitDesireFields(src = {}) {
  return {
    externalGoal: norm(src.externalGoal || src.desire || src.goal || ''),
    internalDesire: norm(src.internalDesire || ''),
    fear: norm(src.fear || ''),
    wound: norm(src.wound || ''),
    belief: norm(src.belief || ''),
    changeArc: norm(src.changeArc || ''),
  };
}

function hasAnyDesireField(fields = {}) {
  return Boolean(
    fields.externalGoal
    || fields.internalDesire
    || fields.fear
    || fields.wound
    || fields.belief
    || fields.changeArc,
  );
}

/**
 * 构建角色欲望档案 — 仅投影显式字段；无依据 → missing
 */
export function buildCharacterDesireProfile({
  character = null,
  storyDna = {},
  intent = {},
  chapter = 1,
} = {}) {
  const pov = character || resolvePovCharacter(storyDna, intent);
  const name = norm(pov.name) || '主角';

  let fields = pickExplicitDesireFields(pov);
  if (!hasAnyDesireField(fields)) {
    const dnaChar = (storyDna.character_desires || storyDna.characterDesires || {})[name];
    if (dnaChar) fields = pickExplicitDesireFields(dnaChar);
  }
  if (!hasAnyDesireField(fields) && intent.characterDesire) {
    fields = pickExplicitDesireFields(intent.characterDesire);
  }

  if (!hasAnyDesireField(fields)) {
    return {
      name,
      missing: true,
      externalGoal: '',
      internalDesire: '',
      fear: '',
      wound: '',
      belief: '',
      changeArc: '',
      chapter,
    };
  }

  return {
    name,
    missing: false,
    ...fields,
    chapter,
  };
}

/**
 * Scene 级角色推进 — 仅投影显式欲望字段；
 * S8.2-R5-B：无 authored transformation evidence 时禁止 before→after 人物变化陈述。
 * Choice / consequence ≠ Character State Change。
 */
export function buildSceneCharacterPush({
  desire = {},
  plan = {},
  scene = {},
  situation = {},
  prevPush = null,
} = {}) {
  void situation;
  void prevPush;
  const name = desire.name || 'POV';

  const tx = scene.characterTransformation;
  const hasAuthoredTx = Boolean(tx && !tx.missing && tx.before && tx.after);
  const authoredBefore = hasAuthoredTx
    ? (typeof tx.before === 'string'
      ? norm(tx.before)
      : norm(tx.before.belief || tx.before.identity || ''))
    : norm(scene.characterStateBefore || plan.characterStateBefore || '');
  const authoredAfter = hasAuthoredTx
    ? (typeof tx.after === 'string'
      ? norm(tx.after)
      : norm(tx.after.belief || tx.after.identity || ''))
    : norm(scene.characterAfter || plan.characterAfter || scene.characterStateAfter || plan.characterStateAfter || '');

  const authoredChange = Boolean(authoredBefore && authoredAfter && authoredBefore !== authoredAfter);

  // desire 仍可 missing；变化轴单独 missing
  if (desire.missing && !authoredChange) {
    return {
      character: name,
      missing: true,
      authoredChange: false,
      before: '',
      after: '',
      externalGoal: '',
      internalDesire: '',
      fear: '',
      scenePush: '',
      mustChange: false,
      valid: false,
    };
  }

  return {
    character: name,
    missing: !authoredChange,
    authoredChange,
    before: authoredChange ? authoredBefore : '',
    after: authoredChange ? authoredAfter : '',
    externalGoal: desire.externalGoal || '',
    internalDesire: desire.internalDesire || '',
    fear: desire.fear || '',
    scenePush: authoredChange
      ? `推动 ${name}${desire.internalDesire ? `：${desire.internalDesire.slice(0, 30)}` : ''}（authored change）`
      : '',
    mustChange: false,
    valid: authoredChange,
  };
}

export function formatCharacterDesireBrief(desire = {}, push = {}) {
  if (!desire?.name) return '';
  if (desire.missing) {
    return [
      '### Character Desire · 角色吸引力',
      `- **POV**：${desire.name}`,
      '- **状态**：desire missing（系统无显式人物欲望依据；禁止编造 fear/wound/belief）',
    ].join('\n');
  }
  return [
    '### Character Desire · 角色吸引力',
    `- **POV**：${desire.name}`,
    desire.externalGoal ? `- **外部目标**：${desire.externalGoal}` : '',
    desire.internalDesire ? `- **内在需求**：${desire.internalDesire}` : '',
    desire.fear ? `- **恐惧**：${desire.fear}` : '',
    desire.wound ? `- **伤口**：${desire.wound}` : '',
    desire.changeArc ? `- **成长弧**：${desire.changeArc}` : '',
    push.authoredChange && push.scenePush ? `- **本 Scene 推进**：${push.scenePush}` : '',
    push.authoredChange && push.before && push.after
      ? `- **角色状态（authored）**：${push.before.slice(0, 35)} → ${push.after.slice(0, 35)}`
      : '',
  ].filter(Boolean).join('\n');
}

/** Priority 1 — Writer 块；缺依据时暴露缺口，不填默认心理 */
export function formatCharacterDesireBlock(desire = {}, push = {}) {
  if (!desire?.name) return '';
  if (desire.missing) {
    return [
      '### Character Goal · 角色必推进（P1）',
      `- **POV**：${desire.name}`,
      '- **缺口**：无 authored desire — 禁止用默认恐惧/信念冒充人物心理',
      '- **铁律**：缺失 > 假完整',
    ].join('\n');
  }
  return [
    '### Character Goal · 角色必推进（P1）',
    desire.externalGoal ? `- **外部目标**：${desire.externalGoal} — 本 Scene 须推进或受挫` : '',
    desire.internalDesire ? `- **内在需求**：${desire.internalDesire} — 用动作/选择体现，禁止心理独白堆砌` : '',
    desire.fear ? `- **恐惧**：${desire.fear} — 可被触发，但须有释放节拍` : '',
    push.authoredChange && push.before && push.after
      ? `- **角色变化（authored）**：${push.before} → ${push.after}`
      : '- **角色变化**：missing（Choice ≠ Character State Change；禁止把选择写成成长）',
    '- **铁律**：只表达已有依据；不得发明隐藏欲望',
  ].filter(Boolean).join('\n');
}
