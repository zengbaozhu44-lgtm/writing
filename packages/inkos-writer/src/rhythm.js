/**
 * Rhythm Model — Scene 节奏阶段判断
 */
const PHASE_MAP = {
  situation: '铺垫',
  complication: '推进',
  turn: '高潮',
  hook: '结尾',
};

export function detectRhythmPhase(scene) {
  return PHASE_MAP[scene.beat] || '缓冲';
}

export function buildRhythmBlock(scene) {
  const phase = detectRhythmPhase(scene);
  const hints = {
    铺垫: '建立局面，信息克制，动作具体。',
    推进: '冲突升级，对话博弈，节奏加快。',
    高潮: '代价落地，不可逆变化，情绪峰值。',
    缓冲: '喘息片刻，细节锚定，不泄底。',
    结尾: '钩子留悬，禁止收束全章。',
  };
  return `## 节奏 · ${phase}\n${hints[phase] || hints.缓冲}`;
}
