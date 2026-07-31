/**
 * Hook Generator — 每 Scene / 章末钩子指令
 */
export function generateSceneHook(scene, boundaries, intent) {
  const beat = scene?.beat || 'situation';
  const idx = scene?.index ?? 1;
  const total = intent?.scenes?.length ?? 4;

  if (beat === 'hook' || idx === total) {
    const seed = boundaries?.hook || intent?.ending || intent?.newForeshadow || scene?.goal;
    return {
      type: 'chapter-hook',
      instruction: [
        '**章末钩子（必须）**',
        `- 悬念种子：${String(seed).slice(0, 120)}`,
        '- 结尾形式：发现 / 威胁 / 未答问题 / 异常信号（四选一或组合）',
        '- 禁止圆满收束、禁止解释全部设定',
      ].join('\n'),
    };
  }

  return {
    type: 'scene-hook',
    instruction: [
      '**Scene 微钩子（段末）**',
      '- 用半句未说完、突然打断、异常细节、或角色未完成的动作收尾',
      '- 须让读者想翻页：冲突/真相/反转/选择/危机/新规则（任选）',
      '- 禁止圆满收束、禁止心理总结，用动作或对白留悬念',
      '- 不要写下一 Scene 的内容',
    ].join('\n'),
  };
}

export function buildHookBlock(hookSpec) {
  return ['## Hook Generator', hookSpec.instruction].join('\n');
}

export function scoreHookQuality(text, scene) {
  const corpus = String(text || '');
  const tail = corpus.slice(-Math.min(300, corpus.length));
  const signals = {
    suspense: /但是|然而|却|突然|没想到|？|\.\.\.|……/.test(tail),
    discovery: /发现|看到|听见|意识到|不对|异常/.test(tail),
    threat: /危险|威胁|警告|倒计时|逼近|追/.test(tail),
    openQuestion: /[？?]$|谁|什么|为什么|怎么会/.test(tail.trim()),
  };
  const hit = Object.values(signals).filter(Boolean).length;
  const isHookBeat = scene?.beat === 'hook';
  const minHits = isHookBeat ? 2 : 1;
  const score = Math.round((hit / 4) * 100);
  return {
    score,
    signals,
    pass: hit >= minHits,
    isHookBeat,
  };
}
