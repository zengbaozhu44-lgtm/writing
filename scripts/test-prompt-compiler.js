/**
 * Unified PromptCompiler — priority stack + token clip + seal
 */
import {
  compile,
  clipPriorityStack,
  isSealedCompiledPrompt,
  PROMPT_STACK,
} from '../packages/inkos-runtime/src/compiler/prompt-compiler.js';

const hugeP3 = '记忆片段。'.repeat(800);
const hugeP2 = '世界设定。'.repeat(600);

const clipped = clipPriorityStack({
  p0: 'P0 craft rules short',
  p1: 'P1 beat plan short',
  p2: hugeP2,
  p3: hugeP3,
}, { total: 400 });

if (clipped.tokens.p0 !== clipped.tokens.p0) process.exit(1);
if (clipped.budget.clipped.length === 0) {
  console.error('FAIL expected clip', clipped);
  process.exit(1);
}
if (!clipped.budget.clipped.includes('P3') && !clipped.budget.clipped.includes('P2')) {
  console.error('FAIL clip order', clipped.budget);
  process.exit(1);
}
// P0/P1 unchanged
if (!clipped.layers.p0.includes('P0 craft') || !clipped.layers.p1.includes('P1 beat')) {
  console.error('FAIL protected layers mutated', clipped.layers);
  process.exit(1);
}

const compiled = compile({
  scene: { index: 1, goal: '进入机房', conflict: '门锁', wordTarget: 400 },
  chapter: 2,
  intent: { pov: '林夜', mainGoal: '救出名单' },
  executionPlan: {
    sceneType: 'opening',
    wordTarget: 400,
    beats: [
      { order: 1, label: 'Goal', libraryBeat: 'Discovery', content: '推门', wordBudget: 80 },
      { order: 2, label: 'Hook', libraryBeat: 'Danger', content: '倒计时', wordBudget: 80 },
    ],
    writerRuntime: { writerIntent: '直接进入事件' },
    humanWritingPolicy: { order: '事件→反应→留白' },
  },
  storyDna: { core_hook: '四点重置', protagonist: '林夜' },
  loreText: '服务器风扇一直转。',
  storyMemoryBlock: '上章留下未解倒计时。',
  adaptiveBlock: '下一章加强对白信息。',
  priorExcerpt: '门外有人呼吸。',
  wordBudget: 400,
  tokenBudget: { total: 5000 },
});

if (!isSealedCompiledPrompt(compiled)) {
  console.error('FAIL not sealed');
  process.exit(1);
}
if (!compiled.text.includes(PROMPT_STACK.P0.label) || !compiled.text.includes('Beat Plan')) {
  console.error('FAIL missing stack', compiled.text.slice(0, 400));
  process.exit(1);
}

let threw = false;
try {
  compiled.append('hack');
} catch {
  threw = true;
}
if (!threw) {
  console.error('FAIL append should throw');
  process.exit(1);
}

console.log('OK prompt-compiler', {
  tokens: compiled.tokens.total,
  clipped: compiled.budget.clipped,
  sealed: true,
});
