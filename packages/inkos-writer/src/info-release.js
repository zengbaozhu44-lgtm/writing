/**
 * Info Release Model — 控制伏笔/揭示节奏
 */
export function buildInfoReleaseBlock(scene, ctx) {
  const phase = scene.beat;
  const hooks = (ctx.foreshadow || []).slice(-3).map((h) => h.hook || h).filter(Boolean);

  const rules = {
    situation: '只呈现表层信息，不揭示伏笔答案。',
    complication: '可暗示矛盾，不一次性说清。',
    turn: '允许局部揭示，保留更大悬念。',
    hook: '释放一个关键信息，同时埋下新疑问。',
  };

  const lines = [
    '## 信息释放',
    rules[phase] || '渐进揭秘，禁止上帝视角汇总。',
  ];
  if (hooks.length && (phase === 'turn' || phase === 'hook')) {
    lines.push(`活跃伏笔: ${hooks.join('；')}`);
  }
  return lines.join('\n');
}
