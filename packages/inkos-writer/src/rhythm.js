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
  // 1b-4: 「不可逆变化」从高潮拍专属提示提升为所有拍通用硬规则（前缀注入），
  // 各拍原提示跟在后面。
  const universalRule = '每拍至少一个不可逆变化（新信息/关闭选项/局面改变）；删除后不影响后续逻辑的描写不得存在。';
  const hints = {
    铺垫: '建立局面，信息克制，动作具体。',
    推进: '冲突升级，对话博弈，节奏加快。',
    高潮: '代价落地，情绪峰值。',
    缓冲: '喘息片刻，细节锚定，不泄底。',
    结尾: '钩子留悬，禁止收束全章。',
  };
  return `## 节奏 · ${phase}\n${universalRule}\n${hints[phase] || hints.缓冲}`;
}
