/**
 * Story Director — 书级 Reader Addiction 规划
 * 最高目标：Reader Addiction，不是 Story Quality
 */
import { buildBookQuestion } from './question-engine.js';
export function buildStoryAddictionArc(storyDna = {}, chapter = 1) {
  const hook = storyDna.core_hook || storyDna.hook || '';
  const conflict = storyDna.main_conflict || storyDna.conflict || '';
  const mainQuestion = storyDna.main_question || storyDna.core_hook || '真相究竟是什么？';

  return {
    longTermSuspense: storyDna.long_term_suspense || storyDna.main_question
      || `全书核心追问：${mainQuestion} — 每章加深一层，禁止过早揭晓`,
    longTermForeshadowing: storyDna.long_term_foreshadowing || storyDna.foreshadowing
      || '每 2～3 章埋设一个可兑现伏笔；前期细节须在后期产生代价或翻盘',
    longTermClimax: storyDna.long_term_climax || storyDna.climax_arc
      || `主线冲突「${conflict || '核心对抗'}」须分阶段升级，局部胜利引出更大深渊`,
    longTermCharacterGrowth: storyDna.long_term_character_growth || storyDna.character_arc
      || 'POV 须每章付出代价或做出不可逆选择；成长体现在抉择而非内心独白',
    readerWhyContinue: storyDna.reader_why_continue
      || `读者追读动力：${hook || mainQuestion} — 每章须制造新追问、新代价、新悬念`,
    currentChapter: chapter,
  };
}

export function buildStoryDirectorBrief(storyDna = {}, chapter = 1) {
  const hook = storyDna.core_hook || storyDna.hook || '';
  const conflict = storyDna.main_conflict || storyDna.conflict || '';
  const genre = storyDna.genre || '';
  const tone = storyDna.tone || storyDna.atmosphere || '';
  const addiction = storyDna.reader_addiction || storyDna.readerAddiction
    || '让读者无法放下 — 每章制造追问、代价与未竟之事';
  const arc = buildStoryAddictionArc(storyDna, chapter);
  const bookQuestion = buildBookQuestion(storyDna);

  const lines = [
    '<!-- inkos-story-director v2-reader-addiction -->',
    '## Story Director · Reader Addiction 导演（书级）',
    '',
    '**最高目标：Reader Addiction（阅读成瘾）— 不是 Story Quality**',
    `- ${addiction}`,
    '',
    '### 导演输出标准',
    '- Director 不只规划剧情，须回答：**读者为什么会继续看**',
    '- 每章规划须服务于长期追读，禁止只写事件清单',
    '',
    '### 长期追读弧线（全书级）',
    `- **长期悬念**：${arc.longTermSuspense}`,
    `- **长期伏笔**：${arc.longTermForeshadowing}`,
    `- **长期高潮**：${arc.longTermClimax}`,
    `- **长期角色成长**：${arc.longTermCharacterGrowth}`,
    `- **追读动力锚点**：${arc.readerWhyContinue}`,
    '',
    genre ? `- **类型**：${genre}` : null,
    hook ? `- **核心 Hook**：${hook}` : null,
    `- **Book Question**：${bookQuestion}`,
    conflict ? `- **主线冲突**：${conflict}` : null,
    tone ? `- **基调**：${tone}` : null,
    '- **导演原则**：悬念 > 说明；代价 > 平叙；追问 > 总结；成瘾 > 完整',
    '- **故事推进**：每 Scene 改变世界状态（Situation）+ 回答1问提出2问（Question）',
    '- **约束**：每章须拉高读者好奇心，章尾留钩，不得用设定堆砌替代戏剧张力',
  ].filter(Boolean);

  return {
    role: 'story-director',
    brief: lines.join('\n'),
    readerAddiction: addiction,
    addictionArc: arc,
    bookQuestion,
    storyDna: { hook, conflict, genre, tone, readerAddiction: addiction, bookQuestion },
  };
}

export function runStoryDirector({ storyDna = {}, chapter = 1 } = {}) {
  return buildStoryDirectorBrief(storyDna, chapter);
}
