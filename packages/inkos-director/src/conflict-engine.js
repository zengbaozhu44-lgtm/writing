/**
 * Conflict Engine — 局势压力（Conflict Situation）
 *
 * S8.2-R4-B：Conflict Situation ≠ Choice Consequence
 * Potential Risk ≠ Authored Consequence
 * 保留 Opponent/Opposition/Risk/Cost/Loss 槽；禁止替 Choice 声明后果。
 */

const TRIVIAL_OBSTACLE = /门打不开|路被堵|找不到钥匙|信号不好|天气恶劣/u;
const STAKE_MARKERS = /妹妹|家人|信用|档案|生命|死|背叛|信任|身份|倒计时|今晚|天亮/u;
const TEMPLATE_CONSEQUENCE = /选择产生可见代价|局面因此改变|no_causal_basis/u;

function norm(v = '') {
  return String(v || '').trim();
}

function isAuthoredConsequenceText(text = '') {
  const t = norm(text);
  return Boolean(t) && !TEMPLATE_CONSEQUENCE.test(t);
}

function inferOpponent({
  plan = {},
  scene = {},
  intent = {},
  storyDna = {},
  characterDesire = null,
} = {}) {
  void characterDesire;
  if (scene.conflict?.opponent || plan.conflict?.opponent) {
    return {
      value: norm(scene.conflict?.opponent || plan.conflict?.opponent),
      authored: true,
    };
  }
  const key = norm(scene.keyCharacter || intent.keyCharacter || intent.supportingCharacter);
  if (key && /系统|规则|秩序|组织|公司/u.test(`${plan.obstacle}${plan.newInformation}`)) {
    return { value: `${key}代表的立场 vs ${intent.pov || 'POV'}`, authored: false };
  }
  if (/系统|算法|规则|秩序/u.test(`${storyDna.main_conflict || ''}${plan.obstacle}`)) {
    return { value: '系统 / 规则本身', authored: false };
  }
  if (key) return { value: key, authored: false };
  const fallback = storyDna.antagonist || storyDna.main_conflict?.slice(0, 20) || '局面本身';
  return { value: fallback, authored: false };
}

/**
 * 无 authored/obstacle basis → 空（禁止「每条路都有代价」「任何选择都会伤及」）
 */
function inferOpposition(plan = {}, scene = {}, opponent = '') {
  const raw = norm(plan.obstacle || scene.obstacle || (typeof scene.conflict === 'string' ? scene.conflict : ''));
  if (raw && !TRIVIAL_OBSTACLE.test(raw)) {
    // 中性局势描述；不追加「选择必伤」话术
    return { value: raw, authored: Boolean(plan.obstacle || scene.obstacle || scene.conflict) };
  }
  void opponent;
  return { value: '', authored: false };
}

/**
 * 无 cliff/RQ 等依据 → 空（禁止「拖延或选错将使局势不可逆恶化」）
 */
function inferRisk(plan = {}, scene = {}, characterDesire = null, questions = {}) {
  void characterDesire;
  if (scene.conflict?.risk || plan.conflict?.risk) {
    return {
      value: norm(scene.conflict?.risk || plan.conflict?.risk),
      authored: true,
    };
  }
  const cliff = norm(plan.cliffhanger || scene.cliffhanger);
  const rq = questions.readerQuestion?.readerQuestion || '';
  if (cliff) return { value: cliff, authored: false };
  if (rq) return { value: rq, authored: false };
  return { value: '', authored: false };
}

/**
 * 仅显式 conflict.cost 或 authored consequence 文案；标记来源
 */
function inferCost(plan = {}, scene = {}) {
  const explicit = norm(scene.conflict?.cost || plan.conflict?.cost);
  if (explicit && !TRIVIAL_OBSTACLE.test(explicit)) {
    return { value: explicit, authored: true, source: 'authored_conflict_cost' };
  }
  const consequence = norm(plan.consequence || scene.consequence);
  if (isAuthoredConsequenceText(consequence)) {
    return { value: consequence, authored: true, source: 'authored_consequence' };
  }
  return { value: '', authored: false, source: null };
}

/** 仅显式 loss；禁止从 cost 推断「必失」 */
function inferLoss(plan = {}, scene = {}) {
  const explicit = norm(scene.conflict?.loss || plan.conflict?.loss);
  if (explicit) return { value: explicit, authored: true };
  return { value: '', authored: false };
}

function isTrivialConflict(opposition = '', cost = '') {
  return TRIVIAL_OBSTACLE.test(opposition) && !STAKE_MARKERS.test(cost);
}

/**
 * 仅 authored irreversible / chapter climax 显式位移；禁止默认「无法回到冲突前」
 */
function inferIrreversibleChange({
  plan = {}, scene = {}, chapterClimax = null,
} = {}) {
  const explicit = norm(scene.conflict?.irreversibleChange || plan.irreversibleChange);
  if (explicit) return { value: explicit, authored: true, source: 'authored' };

  if (chapterClimax?.storyShift) {
    return { value: norm(chapterClimax.storyShift), authored: true, source: 'chapter_climax.storyShift' };
  }
  if (chapterClimax?.maxInfoRelease) {
    return { value: norm(chapterClimax.maxInfoRelease), authored: true, source: 'chapter_climax.maxInfoRelease' };
  }

  return { value: null, authored: false, source: null };
}

function attachMeta(base, meta = {}) {
  return {
    ...base,
    costAuthored: Boolean(meta.costAuthored),
    lossAuthored: Boolean(meta.lossAuthored),
    riskAuthored: Boolean(meta.riskAuthored),
    irreversibleAuthored: Boolean(meta.irreversibleAuthored),
    costSource: meta.costSource || null,
    rule: meta.rule || 'Conflict Situation ≠ Choice Consequence；Potential Risk ≠ Authored Consequence',
    writerMust: meta.writerMust || '',
    irreversibleRule: meta.irreversibleRule || null,
  };
}

/**
 * Scene 级冲突规划 — Writer P1（局势压力，非 Choice 后果权威）
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
  storyDna = {},
} = {}) {
  if (scene.conflict?.opponent && scene.conflict?.cost) {
    return normalizeConflict(scene.conflict, { treatAsAuthored: true });
  }

  const opponentR = inferOpponent({ plan, scene, intent, characterDesire, storyDna });
  const oppositionR = inferOpposition(plan, scene, opponentR.value);
  const riskR = inferRisk(plan, scene, characterDesire, questions);
  let costR = inferCost(plan, scene);
  const lossR = inferLoss(plan, scene);

  let opposition = oppositionR.value;
  let cost = costR.value;

  const isClimaxScene = sceneIndex >= sceneCount
    || chapterClimax?.climaxSceneIndex === sceneIndex;
  const isIrreversibleScene = isClimaxScene || climaxRole?.isPreClimax || climaxRole?.isClimax;
  if (isClimaxScene && chapterClimax?.maxCost) {
    cost = norm(chapterClimax.maxCost);
    costR = { value: cost, authored: true, source: 'chapter_climax.maxCost' };
    if (chapterClimax.maxConflict) {
      opposition = norm(chapterClimax.maxConflict);
    }
  }

  const irrevR = isIrreversibleScene
    ? inferIrreversibleChange({ plan, scene, chapterClimax })
    : { value: null, authored: false, source: null };

  const valid = Boolean(costR.authored && cost)
    && !isTrivialConflict(opposition, cost)
    && STAKE_MARKERS.test(`${cost}${lossR.value}${riskR.value}`);

  return attachMeta({
    version: 'conflict-engine-2',
    opponent: opponentR.value,
    opposition,
    risk: riskR.value,
    cost,
    loss: lossR.value,
    irreversibleChange: irrevR.value,
    isIrreversible: Boolean(irrevR.value),
    valid,
  }, {
    costAuthored: costR.authored,
    lossAuthored: lossR.authored,
    riskAuthored: riskR.authored,
    irreversibleAuthored: irrevR.authored,
    costSource: costR.source,
    writerMust: costR.authored
      ? `Obstacle：写清 conflict pressure；authored cost 可展示「${cost.slice(0, 36)}」— 仍 ≠ 自动 Choice consequence`
      : 'Obstacle：写清 conflict pressure / potential risk；代价 basis missing — 禁止编造 Choice consequence',
    irreversibleRule: isIrreversibleScene && !irrevR.value
      ? '高潮 Scene：无 authored irreversible — 勿发明「无法回头」'
      : (irrevR.authored ? 'Authored irreversible：可描写局面位移，仍须标明非自动 Choice consequence' : null),
  });
}

function normalizeConflict(c = {}, { treatAsAuthored = false } = {}) {
  const cost = norm(c.cost);
  const loss = norm(c.loss);
  const risk = norm(c.risk);
  const irrev = norm(c.irreversibleChange) || null;
  const authored = treatAsAuthored || c.costAuthored === true;
  return attachMeta({
    version: 'conflict-engine-2',
    opponent: norm(c.opponent),
    opposition: norm(c.opposition),
    risk,
    cost,
    loss,
    irreversibleChange: irrev,
    isIrreversible: Boolean(irrev),
    valid: c.valid !== false,
  }, {
    costAuthored: authored || Boolean(cost),
    lossAuthored: c.lossAuthored === true || Boolean(loss && treatAsAuthored),
    riskAuthored: c.riskAuthored === true || Boolean(risk && treatAsAuthored),
    irreversibleAuthored: c.irreversibleAuthored === true || Boolean(irrev && treatAsAuthored),
    costSource: c.costSource || (authored ? 'authored_conflict_cost' : null),
    rule: c.rule || 'Conflict Situation ≠ Choice Consequence',
    writerMust: c.writerMust || '',
    irreversibleRule: c.irreversibleRule || null,
  });
}

/**
 * Prompt 表达：非 authored 用 pressure/potential risk；禁「付出代价/做成也要付/必失」
 */
export function formatConflictBlock(conflict = {}) {
  if (!conflict?.opponent && !conflict?.opposition) return '';

  const costAuthored = Boolean(conflict.costAuthored && conflict.cost);
  const lossAuthored = Boolean(conflict.lossAuthored && conflict.loss);
  const irrevAuthored = Boolean(conflict.irreversibleAuthored && conflict.irreversibleChange);
  const riskText = norm(conflict.risk);

  const lines = [
    '### Conflict Engine · Conflict Pressure（P1）',
    '**边界**：Conflict Situation ≠ Choice Consequence；Potential Risk ≠ Authored Consequence',
    '',
    conflict.opponent ? `- **Opponent（阻力源）**：${conflict.opponent}` : '',
    conflict.opposition ? `- **Conflict pressure（局势）**：${conflict.opposition}` : '',
    riskText ? `- **Potential risk（未决威胁）**：${riskText}` : '',
  ];

  if (costAuthored) {
    lines.push(`- **Authored cost（显式代价，可展示）**：${conflict.cost}`);
  } else if (conflict.cost) {
    lines.push(`- **Unresolved threat（非 Choice consequence）**：${conflict.cost}`);
  }

  if (lossAuthored) {
    lines.push(`- **Authored loss（显式损失）**：${conflict.loss}`);
  } else if (conflict.loss) {
    lines.push(`- **Unresolved threat（loss，非 Choice consequence）**：${conflict.loss}`);
  }

  lines.push('');
  lines.push('- Writer：只写 conflict pressure / potential risk；无 authored consequence/cost 时，勿写成人物已选定并已承担结果');

  if (!costAuthored) {
    lines.push('- ⚠️ cost basis 非 authored 或缺失 — 勿补 Choice consequence');
  }

  if (irrevAuthored) {
    lines.push(`- **Authored irreversible（局面位移）**：${conflict.irreversibleChange}`);
    lines.push('- 标注：Conflict potential, not Choice consequence');
  } else if (conflict.irreversibleChange) {
    lines.push(`- **Unresolved threat（非 authored irreversible）**：${conflict.irreversibleChange}`);
    lines.push('- 标注：Conflict potential, not Choice consequence');
  }

  return lines.filter(Boolean).join('\n');
}

export function formatConflictBrief(conflict = {}) {
  if (!conflict?.opponent && !conflict?.opposition) return '';
  const costAuthored = Boolean(conflict.costAuthored && conflict.cost);
  return [
    '### Conflict · Pressure',
    conflict.opponent ? `- **阻力源**：${conflict.opponent}` : '',
    conflict.opposition ? `- **局势**：${String(conflict.opposition).slice(0, 50)}` : '',
    costAuthored
      ? `- **Authored cost**：${conflict.cost?.slice(0, 50)}`
      : (conflict.risk ? `- **Potential risk**：${conflict.risk?.slice(0, 40)}` : ''),
    '- 边界：≠ Choice consequence',
  ].filter(Boolean).join('\n');
}
