/**
 * Writer Craft Runtime — Show Don't Tell · Visualization · Rhythm · Density · Variation · Dialogue · Purpose
 */
import {
  WRITER_CRAFT_POLICY,
  evaluateShowDontTell,
  evaluateSceneVisualization,
  evaluateSentenceRhythm,
  evaluateInformationDensity,
  evaluateLanguageVariation,
  evaluateProfessionalDialogue,
  evaluateParagraphPurpose,
  resolveCraftMode,
  validateWriterCraft,
  formatWriterCraftPromptBlock,
  validateWriterRuntimeV2,
  formatLayeredWriterPrompt,
  buildWriterPromptLayers,
  buildSceneExecutionPlan,
  buildChapterDirectorBrief,
} from '../packages/inkos-director/src/index.js';
import { compileSingleBeatPrompt } from '../packages/inkos-studio-server/src/writer-optimization/beat-execution.js';

function assert(cond, msg, detail) {
  if (!cond) {
    console.error('FAIL:', msg, detail || '');
    process.exit(1);
  }
}

assert(WRITER_CRAFT_POLICY.priority.includes('阅读体验'), 'policy');

// ① Show Don't Tell — 解释心理必须失败
const tell = evaluateShowDontTell('林夜很紧张。他意识到危险。他知道事情严重了。');
assert(!tell.pass, 'show-dont-tell should fail', tell);

const show = evaluateShowDontTell('钥匙插了三次。才插进去。耳机里传来一声：「别回头。」');
assert(show.pass, 'show action/dialogue should pass', show);

// ② Scene Visualization
const noViz = evaluateSceneVisualization('他十分紧张。事情很严重。');
assert(!noViz.pass, 'viz explain-only', noViz);

const withViz = evaluateSceneVisualization('门滑开。冷风扑在脸上。服务器风扇一起转动。没人。');
assert(withViz.pass && withViz.hasVisual, 'viz scene', withViz);

// ③ Sentence Rhythm — climax short
const longClimax = evaluateSentenceRhythm(
  '他缓缓推开那扇厚重的合金门然后走到闪烁的红色权限栏前开始漫长地思考接下来该如何应对这前所未有的局面。',
  { craftMode: 'climax' },
);
assert(!longClimax.pass, 'climax long sentence', longClimax);

const shortClimax = evaluateSentenceRhythm('门开了。没人。脚步声。就在身后。', { craftMode: 'climax' });
assert(shortClimax.pass, 'climax short', shortClimax);

assert(resolveCraftMode({ climaxRole: { isClimax: true } }) === 'climax', 'craft mode climax');

// ④ Information Density
const emptyPad = evaluateInformationDensity(
  '风吹过走廊。光轻轻闪了一下。他又往前走了几步。走廊还是空的。空气很安静。灯也不亮得更快。他只是继续向前。再向前。再停一下。再等一会儿。没有人回答。',
);
assert(!emptyPad.pass, 'empty density', emptyPad);

const dense = evaluateInformationDensity(
  '权限栏变红。名单第二行不是空的。「苏晚也被标进清除队列。」倒计时二十九。门禁锁死。',
);
assert(dense.pass && dense.signals.count >= 1, 'dense info', dense);

// ⑤ Language Variation
const aiVar = evaluateLanguageVariation('他深吸一口气。心跳加速。他意识到危险。');
assert(!aiVar.pass, 'ai phrases', aiVar);

const sameSubject = evaluateLanguageVariation('林夜推门。林夜看屏。林夜后退。');
assert(!sameSubject.pass, 'same subject streak', sameSubject);

// ⑥ Professional Dialogue
const narrateWarn = evaluateProfessionalDialogue('林夜意识到系统正在监视自己。危险已经很严重。');
assert(!narrateWarn.pass, 'critical info in narration', narrateWarn);

const dialoguePush = evaluateProfessionalDialogue('耳机里传来声音。「别回头。」「它就在你后面。」');
assert(dialoguePush.pass, 'dialogue push', dialoguePush);

// ⑦ Paragraph Purpose
const noPurpose = evaluateParagraphPurpose(
  '天很蓝。风很轻。远处有鸟叫。云慢慢飘过屋顶。树叶轻轻抖动。他站在原地看风景看了很久。空气也很温。',
);
assert(!noPurpose.pass, 'no purpose', noPurpose);

const hasPurpose = evaluateParagraphPurpose('他按下清除。退路没了。门外倒计时开始。');
assert(hasPurpose.pass, 'has purpose', hasPurpose);

// 总闸：坏文失败、好文通过
const craftBad = validateWriterCraft({
  text: '他意识到危险。他很害怕。十分震惊。',
  beat: { structuralBeat: 'goal' },
});
assert(!craftBad.pass && craftBad.rewriteHint.includes('Writer Craft'), 'craft bad', craftBad.failReasons);

const craftGood = validateWriterCraft({
  text: [
    '门滑开。冷风扑脸。',
    '他按下确认，权限栏变红。',
    '「名单上有第二个人。」苏晚的声音发紧。',
    '电子锁咬死。倒计时跳到二十九。',
  ].join(''),
  beat: { structuralBeat: 'newInformation' },
});
assert(craftGood.pass, 'craft good', craftGood.failReasons);

// V2 合并 Craft 为最高层
const v2 = validateWriterRuntimeV2({
  text: '他意识到危险。继续调查。',
  beat: {
    order: 1,
    structuralBeat: 'goal',
    beforeState: '安全',
    afterState: '安全',
  },
  beforeState: '安全',
});
assert(!v2.pass && v2.craft && !v2.craft.pass, 'v2 embeds craft', v2.failReasons);

// Prompt P0
const block = formatWriterCraftPromptBlock({ craftMode: 'climax' });
assert(block.includes('Priority 0') && block.includes('Show') && block.includes('一句一画面'), 'craft prompt');

const storyDna = { protagonist: '林夜', core_hook: '世界四点重置', genre: '悬疑' };
const plan = {
  goal: '读取名单',
  choice: '明知危险进入系统区域',
  consequence: '系统锁门',
  newInformation: '名单有第二个人',
  cliffhanger: '倒计时二十九秒',
  obstacle: '权限墙',
};
const scene = { index: 1, ...plan, wordTarget: 400 };
const chapterDir = buildChapterDirectorBrief(
  { pov: '林夜', mainGoal: plan.goal, scenes: [scene], sceneCount: 1 },
  1,
  { storyDna },
);
const executionPlan = buildSceneExecutionPlan({
  scene: { ...scene, scenePlan: plan },
  intent: { pov: '林夜', scenes: [scene], sceneCount: 1, _chapterDirector: chapterDir },
  chapter: 1,
  storyDna,
  chapterDir,
});
const layers = buildWriterPromptLayers({
  executionPlan,
  storyMemoryBlock: '',
  adaptiveBlock: '',
  voiceDna: null,
  commercialRules: '',
  chapterTitleBlock: '',
  promptRulesBlock: '',
  continuationBlock: '',
  boundaryBlock: '',
  revealBlock: '',
  hookBlock: '',
});
const layered = formatLayeredWriterPrompt(layers);
assert(
  layered.includes('writer-prompt-priority-v2-craft')
    && layered.includes('Professional Writer Craft')
    && layered.includes('阅读体验'),
  'layered P0',
);

const beatPrompt = compileSingleBeatPrompt({
  beat: executionPlan.beats[0],
  executionPlan,
  basePrompt: 'base',
  totalBeats: executionPlan.beats.length,
});
assert(
  beatPrompt.includes('writer-craft-p0') || beatPrompt.includes('Professional Writer Craft'),
  'beat prompt craft',
);

console.log('OK writer-craft · all checks passed');
