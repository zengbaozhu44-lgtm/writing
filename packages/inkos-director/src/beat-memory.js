/**
 * Beat Memory Context — beatStateDelta + 状态变化验证
 */
import {
  detectStateChanges,
  validateBeatStateChange,
  STATE_CHANGE_DIMENSIONS,
} from './beat-state.js';

const FACT_RE = /发现|原来|意识到|注意到|辨认|确认|知道|是.{1,8}的|意味着|表明|证明/u;
const CHAR_CHANGE_RE = /决定|不再|开始|放弃|转向|信任|怀疑|答应|拒绝|妥协|翻脸|让步|选择|只能|必须/u;
const UNRESOLVED_RE = /[？?]|吗|呢|能否|会不会|到底|为何|如何|谁|什么|难道|究竟|未|还没|无法|不知道/u;

const EMOTION_PATTERNS = {
  fear: /害怕|恐惧|紧张|不安|颤抖|冷汗|心跳|僵|屏息/u,
  hope: /希望|期待|也许|可能|终于|还好|松了|庆幸/u,
  anger: /愤怒|怒|火|咬牙|攥拳|骂|恨|暴/u,
  surprise: /惊讶|震惊|愣|意外|竟然|居然|没想到/u,
  relief: /松气|放松|如释|缓|安心|还好/u,
};

function extractSentences(text, max = 4) {
  return String(text || '')
    .split(/[。！？!?…\n]+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 6)
    .slice(0, max);
}

function matchPatterns(text, re, max = 3) {
  const sentences = extractSentences(text, 8);
  return sentences.filter((s) => re.test(s)).slice(0, max);
}

function inferAfterState(text, beatPlan = {}, validation = {}) {
  const tail = extractSentences(text, 2).slice(-1)[0];
  if (tail && validation.stateChange) return tail;
  return beatPlan.afterState || tail || '局面已改变';
}

/**
 * 从 Beat 正文提取结构化状态增量
 */
export function extractBeatStateDelta(beat = {}, text = '', priorText = '') {
  const t = String(text || '').trim();
  const beatPlan = beat.beatPlan || {
    beforeState: beat.beforeState,
    afterState: beat.afterState,
    requiredDimension: beat.requiredDimension,
  };
  const validation = validateBeatStateChange(t, beatPlan, priorText);
  const changedDimensions = detectStateChanges(t);

  const newFacts = matchPatterns(t, FACT_RE, 3);
  const characterStateChanges = matchPatterns(t, CHAR_CHANGE_RE, 3);
  const emotionChanges = Object.entries(EMOTION_PATTERNS)
    .filter(([, re]) => re.test(t))
    .map(([name]) => name);
  const unresolvedIssues = matchPatterns(t, UNRESOLVED_RE, 3);

  if (beat.structuralBeat === 'hook' && unresolvedIssues.length === 0 && t.length >= 20) {
    const tail = t.slice(-80).trim();
    if (tail) unresolvedIssues.push(tail);
  }

  const afterState = inferAfterState(t, beatPlan, validation);

  return {
    beatOrder: beat.order ?? null,
    structuralBeat: beat.structuralBeat ?? null,
    libraryBeat: beat.libraryBeat ?? null,
    beforeState: beatPlan.beforeState || beat.beforeState || null,
    action: beatPlan.action || beat.action || null,
    choice: beatPlan.choice || beat.choice || null,
    consequence: beatPlan.consequence || beat.consequence || null,
    afterState,
    stateChange: validation.valid,
    stateChangeValid: validation.valid,
    changedDimensions,
    repetitive: validation.repetitive,
    newFacts,
    characterStateChanges,
    emotionChanges,
    unresolvedIssues,
    extractedAt: new Date().toISOString(),
  };
}

export function mergeBeatMemory(deltas = []) {
  const merged = {
    newFacts: [],
    characterStateChanges: [],
    emotionChanges: [],
    unresolvedIssues: [],
    changedDimensions: [],
    beatHistory: [],
    lastAfterState: null,
    stateChangeCount: 0,
  };

  for (const delta of deltas) {
    if (!delta) continue;
    merged.newFacts.push(...(delta.newFacts || []));
    merged.characterStateChanges.push(...(delta.characterStateChanges || []));
    merged.emotionChanges.push(...(delta.emotionChanges || []));
    merged.unresolvedIssues.push(...(delta.unresolvedIssues || []));
    merged.changedDimensions.push(...(delta.changedDimensions || []));
    if (delta.stateChange) merged.stateChangeCount += 1;
    if (delta.afterState) merged.lastAfterState = delta.afterState;
    merged.beatHistory.push({
      order: delta.beatOrder,
      structuralBeat: delta.structuralBeat,
      libraryBeat: delta.libraryBeat,
      stateChange: delta.stateChange,
      afterState: delta.afterState,
    });
  }

  merged.newFacts = [...new Set(merged.newFacts)].slice(-8);
  merged.characterStateChanges = [...new Set(merged.characterStateChanges)].slice(-6);
  merged.emotionChanges = [...new Set(merged.emotionChanges)];
  merged.unresolvedIssues = [...new Set(merged.unresolvedIssues)].slice(-6);
  merged.changedDimensions = [...new Set(merged.changedDimensions)];

  return merged;
}

export function formatBeatMemoryBlock(memory = {}) {
  const lines = ['### Beat Memory Context（必须继承，禁止矛盾或遗忘）'];
  const hasContent = (memory.newFacts?.length || memory.characterStateChanges?.length
    || memory.emotionChanges?.length || memory.unresolvedIssues?.length
    || memory.lastAfterState);

  if (!hasContent) {
    lines.push('- （尚无已完成 Beat 状态，本 Beat 为 Scene 首段）');
    return lines.join('\n');
  }

  if (memory.lastAfterState) {
    lines.push(`**当前 After State（本 Beat 的 Before State 须从此接续）**：${memory.lastAfterState}`);
  }
  if (memory.changedDimensions?.length) {
    const labels = memory.changedDimensions
      .map((id) => STATE_CHANGE_DIMENSIONS.find((d) => d.id === id)?.label || id);
    lines.push(`**已改变的状态维度**：${labels.join('、')}`);
  }
  if (memory.newFacts?.length) {
    lines.push('**已确立事实**（禁止推翻或重复陈述）：');
    memory.newFacts.forEach((f) => lines.push(`- ${f}`));
  }
  if (memory.characterStateChanges?.length) {
    lines.push('**人物状态变化**（须延续）：');
    memory.characterStateChanges.forEach((c) => lines.push(`- ${c}`));
  }
  if (memory.emotionChanges?.length) {
    lines.push(`**当前情绪基调**：${memory.emotionChanges.join('、')}`);
  }
  if (memory.unresolvedIssues?.length) {
    lines.push('**未解决问题**（后续 Beat 须推进或加深，禁止忽略）：');
    memory.unresolvedIssues.forEach((u) => lines.push(`- ${u}`));
  }

  return lines.join('\n');
}
