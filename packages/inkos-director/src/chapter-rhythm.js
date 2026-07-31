/**
 * Chapter Rhythm — 章节节奏模型
 * Fast → Slow → Fast → Explosion → Release
 * 避免整章一直紧张或一直解释
 */

export const RHYTHM_PHASES = {
  fast: { id: 'fast', label: 'Fast', pace: '快', writerHint: '短句、动作连打、少解释' },
  slow: { id: 'slow', label: 'Slow', pace: '慢', writerHint: '略放缓、对白与细节、释放张力' },
  explosion: { id: 'explosion', label: 'Explosion', pace: '爆发', writerHint: '高潮爆发、最大冲突与代价' },
  release: { id: 'release', label: 'Release', pace: '释放', writerHint: '情绪释放后立刻推入新危机' },
};

/** 默认四 Scene 章节奏 */
const DEFAULT_RHYTHM_MAP = {
  1: 'fast',
  2: 'slow',
  3: 'fast',
  4: 'explosion',
};

function rhythmForScene(sceneIndex = 1, sceneCount = 4) {
  if (sceneCount <= 1) return 'explosion';
  if (sceneIndex === sceneCount) return 'explosion';
  if (sceneIndex === sceneCount - 1 && sceneCount >= 3) return 'fast';
  if (sceneIndex === 2 && sceneCount >= 4) return 'slow';
  return sceneIndex === 1 ? 'fast' : (sceneIndex % 2 === 0 ? 'slow' : 'fast');
}

/**
 * Chapter 级节奏规划 — Chapter Director 输出
 */
export function buildChapterRhythmPlan({
  chapter = 1,
  sceneCount = 4,
  intent = {},
} = {}) {
  const sceneRhythms = [];
  for (let i = 1; i <= sceneCount; i += 1) {
    const phase = rhythmForScene(i, sceneCount);
    sceneRhythms.push({
      sceneIndex: i,
      phase,
      ...RHYTHM_PHASES[phase],
      releaseAfter: i === sceneCount ? '章尾 Hook 前可短暂释放，随即新威胁' : null,
    });
  }

  return {
    version: 'chapter-rhythm-1',
    chapter,
    sceneCount,
    sequence: ['fast', 'slow', 'fast', 'explosion', 'release'],
    sceneRhythms,
    rule: '张弛有度 — 禁止整章一直紧张或一直解释',
    climaxSceneIndex: sceneCount,
    releaseSceneIndex: sceneCount,
  };
}

/**
 * Scene 节奏角色 — Writer 与 Voice DNA 引用
 */
export function getSceneRhythmRole({
  sceneIndex = 1,
  chapterRhythm = null,
  sceneCount = 4,
} = {}) {
  const entry = chapterRhythm?.sceneRhythms?.find((r) => r.sceneIndex === sceneIndex);
  const phase = entry?.phase || rhythmForScene(sceneIndex, sceneCount);
  const meta = RHYTHM_PHASES[phase] || RHYTHM_PHASES.fast;

  const needsRelease = phase === 'explosion' || sceneIndex >= sceneCount;

  return {
    sceneIndex,
    phase,
    label: meta.label,
    pace: meta.pace,
    writerHint: meta.writerHint,
    needsRelease,
    isExplosion: phase === 'explosion',
    isSlow: phase === 'slow',
    valid: true,
  };
}

export function formatChapterRhythmBlock(plan = {}) {
  if (!plan?.sceneRhythms?.length) return '';

  const lines = [
    '### Chapter Rhythm · 章节节奏',
    '**序列**：Fast → Slow → Fast → Explosion → Release',
    '',
    ...plan.sceneRhythms.map((r) =>
      `- **S${r.sceneIndex} · ${r.label}**：${r.writerHint}`),
    '',
    '- **铁律**：高潮须真正释放情绪，再推入更大危机；禁止整章同一节奏',
  ];
  return lines.join('\n');
}

export function formatSceneRhythmBlock(role = {}) {
  if (!role?.phase) return '';

  return [
    '### Scene Rhythm · 本段节奏（P3 辅助 / P1 高潮段强化）',
    `- **阶段**：${role.label}（${role.pace}）`,
    `- **写法**：${role.writerHint}`,
    role.needsRelease ? '- **释放**：高潮/章尾前须有情绪释放节拍，禁止全程加压' : '',
    role.isExplosion ? '- **爆发 Scene**：最大冲突、最大代价、不可逆改变' : '',
  ].filter(Boolean).join('\n');
}
