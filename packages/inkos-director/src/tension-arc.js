/**
 * Tension Arc — 按 genre 选择张力 profile，下沉到每个 Beat 的 tensionLevel + craftMode
 */
import { resolveGenreProfile } from './genre-weights.js';

/** @typedef {'commercial'|'literary'|'suspense'|'romance'|'default'} GenreProfile */

/**
 * 张力曲线：0–10，按 Beat 序（goal→escalation→newInformation→choice→consequence→hook）
 * 末拍 hook 通常抬升以促追读
 */
export const TENSION_PROFILES = Object.freeze({
  suspense: {
    id: 'suspense',
    label: '悬疑递进',
    levels: [4, 6, 7, 8, 9, 10],
    craftBias: 'short-sensory',
  },
  commercial: {
    id: 'commercial',
    label: '爽感起伏',
    levels: [5, 6, 5, 8, 7, 9],
    craftBias: 'punchy',
  },
  literary: {
    id: 'literary',
    label: '文学缓升',
    levels: [3, 4, 5, 6, 7, 8],
    craftBias: 'sensory-linger',
  },
  romance: {
    id: 'romance',
    label: '情感张力',
    levels: [3, 5, 4, 7, 6, 8],
    craftBias: 'dialogue-heat',
  },
  default: {
    id: 'default',
    label: '标准弧',
    levels: [4, 5, 6, 7, 8, 9],
    craftBias: 'balanced',
  },
});

const STRUCTURAL_ORDER = [
  'goal',
  'escalation',
  'newInformation',
  'choice',
  'consequence',
  'hook',
];

/**
 * 根据 genre / storyDna 选择 tension profile
 */
export function resolveTensionProfile(storyDna = {}, genreHint = '') {
  const profileId = resolveGenreProfile(
    { ...storyDna, genre: genreHint || storyDna.genre },
    '',
  );
  return TENSION_PROFILES[profileId] || TENSION_PROFILES.default;
}

/**
 * 构建章/场张力弧
 * @returns {{ version, profile, genreProfile, beatLevels: number[], craftBias }}
 */
export function buildTensionArc({
  storyDna = {},
  genre = '',
  beatCount = 6,
  chapterDir = null,
  intent = null,
} = {}) {
  const fromDir = chapterDir?.tensionArc || intent?._chapterDirector?.tensionArc || null;
  if (fromDir?.profile?.levels?.length) {
    return {
      version: 'tension-arc-1',
      ...fromDir,
      inherited: true,
    };
  }

  const profile = resolveTensionProfile(storyDna, genre || intent?.genre);
  const levels = resizeLevels(profile.levels, beatCount);
  return {
    version: 'tension-arc-1',
    genreProfile: profile.id,
    profile,
    beatLevels: levels,
    craftBias: profile.craftBias,
    inherited: false,
  };
}

function resizeLevels(levels = [], beatCount = 6) {
  if (!levels.length) return Array.from({ length: beatCount }, (_, i) => 4 + i);
  if (levels.length === beatCount) return levels.map((n) => clampTension(n));
  const out = [];
  for (let i = 0; i < beatCount; i += 1) {
    const t = beatCount === 1 ? 0 : i / (beatCount - 1);
    const idx = t * (levels.length - 1);
    const lo = Math.floor(idx);
    const hi = Math.min(levels.length - 1, lo + 1);
    const frac = idx - lo;
    out.push(clampTension(levels[lo] * (1 - frac) + levels[hi] * frac));
  }
  return out;
}

export function clampTension(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return 5;
  return Math.max(0, Math.min(10, Math.round(x)));
}

/**
 * 将 tensionLevel / craftMode 写入 beats
 */
export function applyTensionArcToBeats(beats = [], tensionArc = null) {
  if (!tensionArc || !beats.length) return beats;
  const levels = tensionArc.beatLevels || tensionArc.profile?.levels || [];
  return beats.map((beat, i) => {
    const structuralIdx = STRUCTURAL_ORDER.indexOf(beat.structuralBeat);
    const level = clampTension(
      levels[structuralIdx >= 0 ? structuralIdx : i]
      ?? levels[i]
      ?? 5,
    );
    const craft = resolveCraftFromTension(level, tensionArc.craftBias, beat);
    return {
      ...beat,
      tensionLevel: level,
      craftMode: craft.craftMode,
      craftDirectives: craft.directives,
    };
  });
}

/**
 * tensionLevel → craftMode（句长 / 感官 / 转场）
 */
export function resolveCraftFromTension(tensionLevel = 5, craftBias = 'balanced', beat = {}) {
  const level = clampTension(tensionLevel);
  let craftMode = 'action';
  if (level >= 9 || beat.structuralBeat === 'consequence') craftMode = 'climax';
  else if (level <= 3 || beat.structuralBeat === 'newInformation') craftMode = 'reveal';
  else if (beat.structuralBeat === 'choice' || craftBias === 'dialogue-heat') craftMode = 'emotion';

  const sentenceLength = level >= 8
    ? 'short'
    : level <= 4
      ? 'medium-long'
      : 'mixed';

  const sensory = level >= 7
    ? '高密度：声音/触感/气味至少一处'
    : level <= 4
      ? '克制感官，留白'
      : '中等感官锚点';

  const transition = level >= 8
    ? '硬切：动作→对白→结果，禁止缓冲描写'
    : level <= 4
      ? '软转：画面过渡后再推冲突'
      : '半硬切：一句环境后立刻动作';

  if (craftBias === 'short-sensory' && level >= 6) {
    return {
      craftMode: level >= 8 ? 'climax' : craftMode,
      directives: {
        sentenceLength: 'short',
        sensory: '尖锐感官（金属/冷汗/耳鸣）',
        transition: '硬切',
        tensionLevel: level,
      },
    };
  }

  return {
    craftMode,
    directives: {
      sentenceLength,
      sensory,
      transition,
      tensionLevel: level,
      craftBias,
    },
  };
}

export function formatTensionCraftBlock(beat = {}) {
  const level = beat.tensionLevel ?? beat.craftDirectives?.tensionLevel;
  const d = beat.craftDirectives || {};
  if (level == null && !d.sentenceLength) return '';
  return [
    '### Tension Craft（本 Beat）',
    `- **tensionLevel**：${level ?? '—'} / 10`,
    d.sentenceLength ? `- **句长**：${d.sentenceLength}` : '',
    d.sensory ? `- **感官**：${d.sensory}` : '',
    d.transition ? `- **转场**：${d.transition}` : '',
  ].filter(Boolean).join('\n');
}

export default {
  TENSION_PROFILES,
  resolveTensionProfile,
  buildTensionArc,
  applyTensionArcToBeats,
  resolveCraftFromTension,
  formatTensionCraftBlock,
  clampTension,
};
