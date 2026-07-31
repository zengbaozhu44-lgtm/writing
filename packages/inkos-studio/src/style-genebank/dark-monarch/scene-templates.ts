/**
 * 暗夜君王 · Scene 类型 → 微场景匹配表
 */
import { darkMonarchSamples, MicroScene } from './golden-samples';

/** sceneType → 优先微场景 id（按顺序取第一个） */
export const darkMonarchSceneTemplates: Record<string, string[]> = {
  emotional: ['intimacy-worldbuilding', 'emotional-twist'],
  action: ['battle-opening', 'combat-strategy'],
  climax: ['battle-opening', 'combat-strategy'],
  dialogue: ['dialogue-threat', 'history-argument'],
  reveal: ['betrayal-reveal', 'power-test'],
  opening: ['character-entrance', 'environment-setup'],
  ending: ['emotional-twist', 'speech-rally'],
  exposition: ['history-argument', 'environment-setup'],
  standard: ['character-entrance', 'dialogue-threat'],
  faction: ['faction-standoff', 'power-test'],
  speech: ['speech-rally', 'history-argument'],
};

export function pickDarkMonarchSampleForSceneType(sceneType = 'standard'): MicroScene {
  const key = String(sceneType || 'standard').toLowerCase();
  const ids = darkMonarchSceneTemplates[key]
    || darkMonarchSceneTemplates.standard;
  for (const id of ids) {
    const hit = darkMonarchSamples.find((s) => s.id === id);
    if (hit) return hit;
  }
  return darkMonarchSamples[0];
}

/** 变量替换：把样本里的占位提示展开为可写提示（不改样本正文） */
export function formatVariableHints(scene: MicroScene): string {
  const lines = Object.entries(scene.variables || {}).map(([k, vals]) =>
    `- ${k}：${(vals || []).join(' / ')}`,
  );
  if (!lines.length) return '';
  return ['【可替换变量】', ...lines].join('\n');
}
