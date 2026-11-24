/**
 * Character Transformation — 人物变化（仅在有证据时表达）
 *
 * S8.2-R4-A：Actual Change > Planned Change
 * 无 authored transformation / 无实际变化证据 → missing（禁止预写成长）
 */

export const TRANSFORMATION_DIMENSIONS = [
  { id: 'belief', label: 'Belief（信念）' },
  { id: 'fear', label: 'Fear（恐惧）' },
  { id: 'relationship', label: 'Relationship（关系）' },
  { id: 'identity', label: 'Identity（身份）' },
  { id: 'goal', label: 'Goal（目标）' },
  { id: 'value', label: 'Value（价值观）' },
];

function norm(v = '') {
  return String(v || '').trim();
}

function hasAuthoredTransformation(scene = {}) {
  const tx = scene.characterTransformation;
  if (!tx || typeof tx !== 'object') return false;
  const before = tx.before;
  const after = tx.after;
  if (!before || !after || typeof before !== 'object' || typeof after !== 'object') return false;
  // 至少一个维度有显式内容，才算「作者声明了变化」
  return TRANSFORMATION_DIMENSIONS.some((d) => norm(before[d.id]) || norm(after[d.id]));
}

/** changedDimensions：仅 authored 显式列表，或 before/after 字段实差（不读 choice/conflict） */
function dimsFromAuthored(tx = {}) {
  if (Array.isArray(tx.changedDimensions) && tx.changedDimensions.length) {
    return [...new Set(tx.changedDimensions.map((id) => norm(id)).filter(Boolean))];
  }
  const dims = [];
  for (const d of TRANSFORMATION_DIMENSIONS) {
    const b = norm(tx.before?.[d.id]);
    const a = norm(tx.after?.[d.id]);
    if (b && a && b !== a) dims.push(d.id);
  }
  return dims;
}

function missingTransformation(name, choice) {
  return {
    version: 'character-transformation-1',
    character: name,
    missing: true,
    before: null,
    after: null,
    changedDimensions: [],
    choice: choice || '',
    arcStage: null,
    writerMust: 'transformation evidence missing — 避免虚构未发生的人物变化',
    valid: false, // valid = transformation evidence exists
    rule: 'Actual Change > Planned Change；无证据不得预写成长',
  };
}

/**
 * Scene 级角色转变 — 仅投影 authored；禁止从 choice/conflict/goal 推断 After
 */
export function buildSceneCharacterTransformation({
  desire = {},
  plan = {},
  scene = {},
  situation = {}, // 保留签名；R4-A 不据此发明心理 after
  prevTransformation = null, // 保留签名；无 authored 时不链式推断成长
} = {}) {
  void situation;
  void prevTransformation;

  const name = desire.name || scene.pov || 'POV';
  const choice = norm(plan.choice || scene.choice);

  if (!hasAuthoredTransformation(scene)) {
    return missingTransformation(name, choice);
  }

  const raw = scene.characterTransformation;
  const changedDimensions = dimsFromAuthored(raw);
  const writerMust = norm(raw.writerMust)
    || (changedDimensions.length
      ? `仅文学化表达已声明的人物变化（${changedDimensions.join(', ')}），禁止另造 After`
      : '仅表达 authored transformation 已写明的 before→after，禁止另造成长');

  return {
    version: 'character-transformation-1',
    character: norm(raw.character) || name,
    missing: false,
    before: raw.before,
    after: raw.after,
    changedDimensions,
    choice: norm(raw.choice) || choice,
    arcStage: norm(raw.arcStage) || null,
    writerMust,
    valid: true, // evidence exists
    rule: 'Authored transformation — Writer 描写已声明变化，不得替人物完成意义吸收',
  };
}

export function formatCharacterTransformationBlock(tx = {}) {
  if (tx?.missing || !tx?.before || !tx?.after) {
    if (!tx?.missing) return '';
    return [
      '### Character Transformation · 人物成长（P1）',
      '- **状态**：transformation evidence missing',
      `- **Writer**：${tx.writerMust || '避免虚构未发生的人物变化'}`,
    ].join('\n');
  }

  const dims = (tx.changedDimensions || [])
    .map((id) => TRANSFORMATION_DIMENSIONS.find((d) => d.id === id)?.label || id)
    .join(' · ');

  return [
    '### Character Transformation · 人物成长（P1）',
    '**范围**：仅描写已声明的 before→after；禁止系统补未发生的成长。',
    '',
    tx.before.belief ? `- **Before · Belief**：${String(tx.before.belief).slice(0, 55)}` : '',
    `- **Choice**：${tx.choice || '—'}`,
    tx.after.belief ? `- **After · Belief**：${String(tx.after.belief).slice(0, 55)}` : '',
    dims ? `- **改变维度**：${dims}` : '',
    tx.before.relationship && tx.after.relationship
      && tx.before.relationship !== tx.after.relationship
      ? `- **关系**：${String(tx.before.relationship).slice(0, 30)} → ${String(tx.after.relationship).slice(0, 30)}`
      : '',
    tx.arcStage ? `- **成长弧**：${tx.arcStage}` : '',
    '',
    `- **Writer 必做**：${tx.writerMust}`,
  ].filter(Boolean).join('\n');
}

export function formatCharacterTransformationBrief(tx = {}) {
  if (tx?.missing || !tx?.after?.belief) return '';
  return `Character TX：${String(tx.before?.belief || '').slice(0, 20)} → ${String(tx.after.belief).slice(0, 25)}`;
}
