/**
 * Beat Compliance Analysis — 六结构 Beat 状态变化合规度
 * 只生成报告，不阻塞 Pipeline
 */
import { computeHookLevel } from '@inkos/director';

const GOAL_RE = /目标|要|必须|得|想要|打算|决定|需要/u;
const OBSTACLE_RE = /阻|挡|拒|无法|不能|失败|错|不对|矛盾|威胁|危险|逼近/u;
const CHOICE_RE = /选择|只能|要不要|必须|赌|信|不信|进|退|答应|拒绝/u;
const CONSEQUENCE_RE = /代价|失去|受损|暴露|来不及|清零|后果|落地|不得不/u;
const INFO_RE = /发现|原来|知道|意识到|意味着|表明|线索|真相|规则|身份/u;

function scoreBeatFragment(text, patterns, base = 30) {
  const t = String(text || '').trim();
  if (!t.length) return 0;
  let score = base + Math.min(30, Math.round(t.replace(/\s/g, '').length / 15));
  for (const re of patterns) {
    if (re.test(t)) score += 15;
  }
  return Math.max(0, Math.min(100, score));
}

function normalizeSegmentKey(key) {
  if (key === 'escalation') return 'choice';
  return key;
}

function splitByParts(text, parts = []) {
  if (!parts?.length) return { full: text };
  const segments = {};
  let cursor = 0;
  const full = String(text || '');

  for (const part of parts) {
    const key = normalizeSegmentKey(part.beat?.structuralBeat || part.structuralBeat);
    const fragment = part.text || '';
    if (fragment && full.includes(fragment.slice(0, 20))) {
      segments[key] = fragment;
    } else {
      const share = Math.floor(full.length / parts.length);
      const slice = full.slice(cursor, cursor + share);
      cursor += share;
      segments[key] = slice;
    }
  }
  return segments;
}

function scoreStateChangeRate(parts = []) {
  if (!parts.length) return null;
  const valid = parts.filter((p) => p.beatStateDelta?.stateChange || p.beatStateDelta?.stateChangeValid).length;
  return Math.round((valid / parts.length) * 100);
}

/**
 * 分析 Scene 正文对六结构 Beat 的合规度
 */
export function analyzeBeatCompliance({
  text = '',
  executionPlan = null,
  beatParts = null,
} = {}) {
  const parts = beatParts || executionPlan?.beats?.map((b) => ({ beat: b, text: '' })) || [];
  const segments = splitByParts(text, parts.length ? parts : null);
  const n = parts.length || 6;

  const goalText = segments.goal || text.slice(0, Math.floor(text.length / n));
  const obstacleText = segments.obstacle || text.slice(
    Math.floor(text.length * 0.12),
    Math.floor(text.length * 0.28),
  );
  const choiceText = segments.choice || segments.escalation || text.slice(
    Math.floor(text.length * 0.28),
    Math.floor(text.length * 0.45),
  );
  const consequenceText = segments.consequence || text.slice(
    Math.floor(text.length * 0.45),
    Math.floor(text.length * 0.58),
  );
  const infoText = segments.newInformation || text.slice(
    Math.floor(text.length * 0.58),
    Math.floor(text.length * 0.78),
  );
  const hookText = segments.hook || text.slice(-Math.min(300, Math.floor(text.length * 0.22)));

  const goalCompletion = scoreBeatFragment(goalText, [GOAL_RE], 35);
  const obstacleStrength = scoreBeatFragment(obstacleText, [OBSTACLE_RE], 30);
  const choiceLevel = scoreBeatFragment(choiceText, [CHOICE_RE], 28);
  const consequenceLevel = scoreBeatFragment(consequenceText, [CONSEQUENCE_RE], 28);
  const informationValue = scoreBeatFragment(infoText, [INFO_RE], 32);
  const escalationLevel = choiceLevel;

  const hookEntry = executionPlan?.hookLadderEntry
    || parts.find((p) => p.beat?.structuralBeat === 'hook')?.beat?.hookLadder;
  const hookScores = computeHookLevel(hookText, hookEntry || {});
  const hookImpact = hookScores.hookLevel;
  const hookBreakdown = {
    hookLevel: hookScores.hookLevel,
    hookOutput: hookScores.hookOutput,
    stageMatch: hookScores.stageMatch,
    cognitiveUpgrade: hookScores.cognitiveUpgrade,
    emotionalImpact: hookScores.emotionalImpact,
    characterCost: hookScores.characterCost,
    targetType: hookEntry?.type ?? null,
    targetLevel: hookEntry?.level ?? null,
  };

  const stateChangeRate = scoreStateChangeRate(parts);

  const scores = {
    goalCompletion,
    obstacleStrength,
    choiceLevel,
    consequenceLevel,
    escalationLevel,
    informationValue,
    hookImpact,
    stateChangeRate,
  };

  const scoreValues = [
    goalCompletion, obstacleStrength, choiceLevel, consequenceLevel, informationValue, hookImpact,
  ];
  const avg = Math.round(scoreValues.reduce((a, b) => a + b, 0) / scoreValues.length);

  const weakest = Object.entries({
    goalCompletion, obstacleStrength, choiceLevel, consequenceLevel, informationValue, hookImpact,
  }).sort((a, b) => a[1] - b[1])[0]?.[0] || null;

  return {
    ...scores,
    hookBreakdown,
    average: avg,
    weakest,
    pass: avg >= 50 && (stateChangeRate == null || stateChangeRate >= 50),
    blocking: false,
    analyzedAt: new Date().toISOString(),
  };
}
