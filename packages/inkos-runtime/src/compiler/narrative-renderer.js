/**
 * Narrative Renderer — 把 Director/Planner 语清洗成 Writer 可写的人物视角指令
 * 不新建 Runtime；仅供 Prompt 编译 / Beat 拼装调用。
 */

const DIRECTOR_SPEAK_PATTERNS = [
  /建立\s*POV[（(][^）)]*[）)]\s*当下目标[：:]/giu,
  /建立\s*POV[^：:\n]{0,40}[：:]/giu,
  /建立\s*POV/giu,
  /POV[（(][^）)]*[）)]\s*当下目标[：:]/giu,
  /当下目标[：:]\s*/giu,
  /为后续的探索与反抗奠定基础[。．.]?/gu,
  /导演口吻[：:].*$/gmu,
  /章目标[：:]\s*/giu,
];

/**
 * 清洗导演语：「建立POV」「让主角」等 → 人物可执行动作描述
 * @param {string} text
 * @returns {string}
 */
export function scrubDirectorSpeak(text = '') {
  let s = String(text || '').trim();
  if (!s) return '';

  for (const re of DIRECTOR_SPEAK_PATTERNS) {
    s = s.replace(re, '');
  }

  // 「让主角林夜经历…」→「林夜经历…」；「让主角经历」→「经历」
  s = s.replace(/让主角(?=[\u4e00-\u9fffA-Za-z0-9「『])/gu, '');
  s = s.replace(/让主角/gu, '');

  // 残留套话
  s = s.replace(/确认其真实性，并让他意识到/gu, '确认刷新为真，并意识到');
  s = s.replace(/并让他意识到/gu, '并意识到');
  s = s.replace(/\s{2,}/g, ' ');
  s = s.replace(/^[，、；：:\s]+/u, '').trim();

  return s || String(text || '').trim();
}

/**
 * 从 intent / scene / 显式 anchor 解析时空锚定
 */
export function resolveNarrativeAnchor({
  intent = {},
  scene = {},
  anchor = null,
} = {}) {
  const a = anchor && typeof anchor === 'object' ? anchor : {};
  return {
    currentDate: String(
      a.currentDate
      || intent.currentDate
      || intent.time
      || scene.time
      || '此刻',
    ).trim(),
    pov: String(
      a.pov
      || intent.pov
      || scene.pov
      || 'POV',
    ).trim(),
    location: String(
      a.location
      || intent.location
      || scene.location
      || '现场',
    ).trim(),
  };
}

/**
 * 将 Beat 规划渲染为 Writer 友好指令
 * @returns {object} 清洗后的 beat 字段 + writerBlock + anchor
 */
export function renderBeatForWriter({
  beat = {},
  intent = {},
  scene = {},
  anchor = null,
} = {}) {
  const resolved = resolveNarrativeAnchor({ intent, scene, anchor });
  const rawContent = beat.content || beat.action || beat.beatPlan?.action || '';
  const rawBefore = beat.beforeState || beat.beatPlan?.beforeState || '';
  const rawAfter = beat.afterState || beat.beatPlan?.afterState || '';

  const content = scrubDirectorSpeak(rawContent);
  const beforeState = scrubDirectorSpeak(rawBefore);
  const afterState = scrubDirectorSpeak(rawAfter);

  const writerBlock = [
    '### 时空锚定',
    `- 时间：${resolved.currentDate}`,
    `- POV：${resolved.pov}`,
    `- 地点：${resolved.location}`,
    '',
    `**必须落地（人物视角 · 已去导演语）**：${content || '推进当前局面'}`,
    beforeState ? `- Before：${beforeState.slice(0, 80)}` : '',
    afterState ? `- After（须不同）：${afterState.slice(0, 80)}` : '',
  ].filter(Boolean).join('\n');

  return {
    ...beat,
    content,
    action: content,
    beforeState: beforeState || beat.beforeState,
    afterState: afterState || beat.afterState,
    beatPlan: beat.beatPlan
      ? {
        ...beat.beatPlan,
        action: scrubDirectorSpeak(beat.beatPlan.action || rawContent),
        beforeState: beforeState || beat.beatPlan.beforeState,
        afterState: afterState || beat.beatPlan.afterState,
      }
      : beat.beatPlan,
    anchor: resolved,
    writerBlock,
    scrubbed: true,
  };
}

export default {
  scrubDirectorSpeak,
  resolveNarrativeAnchor,
  renderBeatForWriter,
};
