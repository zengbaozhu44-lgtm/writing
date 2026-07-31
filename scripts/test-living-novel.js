/**
 * Living Novel Engine V3.7 — Studio Server 单元测试
 * 不触碰 Runtime / Brain / Prompt Compiler
 */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { initBookV4 } from '../packages/inkos-core/src/workflows/init.js';
import {
  writeStoryDna, writeChapterPlan, writeWorldState, writeCharacterBrain,
  readChapterPlan, readWorldState, ensureLivingNovelDirs,
} from '../packages/inkos-studio-server/src/system-store.js';
import { buildNovelIntelligenceContext, syncContextToCanon } from '../packages/inkos-studio-server/src/story-context-provider.js';
import {
  persistChapterPlan, prepareChapterRun, runPostChapterEvolution,
  getLivingNovelStatus, initWorldStateIfNeeded,
} from '../packages/inkos-studio-server/src/living-novel-engine.js';
import { writeModule } from '../packages/inkos-studio-server/src/module-service.js';

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'inkos-living-'));
let passed = 0;
let failed = 0;

function ok(name, cond) {
  if (cond) { passed++; console.log(`✓ ${name}`); }
  else { failed++; console.error(`✗ ${name}`); }
}

async function main() {
  const bookDir = path.join(tmp, 'test_book');
  initBookV4({ bookId: 'test_book', title: 'Living测试', targetDir: bookDir });
  ensureLivingNovelDirs(bookDir);

  writeStoryDna(bookDir, {
    core_hook: '每天消失一个人',
    main_conflict: '人类与AI的对抗',
    theme: '记忆与身份',
    genre: '科幻悬疑',
  });
  writeWorldState(bookDir, { year: 2052, ai_control: 93, social_stability: 87, rebellion_level: 20 });
  writeCharacterBrain(bookDir, '林深', {
    character: '林深',
    current_state: { trust_protagonist: 80, suspicion: 20, betrayal_probability: 10 },
  });

  const plan = {
    chapter: 1,
    goal: '调查第一起消失事件',
    conflict: '档案局阻止调查',
    climax: '发现不存在档案',
    cost: '暴露异常身份',
    hook: '收到不存在号码的信息',
  };
  const persisted = persistChapterPlan(bookDir, 1, plan);
  ok('Chapter Plan 持久化', persisted.plan?.goal === plan.goal);

  const planFile = readChapterPlan(bookDir, 1);
  ok('Chapter Plan 文件 chapter_0001.yaml', !!planFile?.goal);

  const ctx = buildNovelIntelligenceContext(bookDir, 1);
  ok('Story Context 含 Story DNA', ctx.storyDna?.core_hook === '每天消失一个人');
  ok('Story Context 含 World State', ctx.worldState?.ai_control === 93);
  ok('Story Context 含 Character Brain', !!ctx.characterStates['林深']);
  ok('Story Context promptBlock 非空', ctx.promptBlock.length > 50);

  const { md } = syncContextToCanon(bookDir, 1, plan);
  ok('Canon 注入含 Living Context', md.includes('Living Novel Intelligence Context'));
  ok('Canon 注入含 Story DNA', md.includes('Story DNA'));
  ok('Canon 注入含 Chapter Plan', md.includes('调查第一起消失事件'));

  writeModule(bookDir, 'characters', { content: '# 林深\n\n- **身份**：调查员\n' }, '林深.md');

  const prepared = await prepareChapterRun(bookDir, 2, {
    chapter: 2,
    goal: '追踪线索',
    conflict: '被监视',
    climax: '闯入禁区',
    cost: '失去盟友',
    hook: '发现自己在删除名单',
  });
  ok('prepareChapterRun 写入 chapter-task', prepared.chapterTaskMd?.includes('Living Novel'));

  initWorldStateIfNeeded(bookDir);
  const status = getLivingNovelStatus(bookDir);
  ok('Living Status 有指标', status.storyHealth > 0 && status.worldStability > 0);

  // 模拟章节正文（不跑 Runtime）— 章节文件格式 0001_title.md
  const chaptersDir = path.join(bookDir, 'chapters');
  fs.mkdirSync(chaptersDir, { recursive: true });
  const ch1Text = '林深欺骗了好友，隐瞒了关键真相。AI设施被摧毁，反抗组织蠢蠢欲动。';
  fs.writeFileSync(path.join(chaptersDir, '0001_第一章.md'), `# 第一章\n\n${ch1Text}`);
  fs.writeFileSync(path.join(chaptersDir, 'index.json'), JSON.stringify({ chapters: [{ number: 1, title: '第一章', file: '0001_第一章.md' }] }));

  try {
    const evolution = await runPostChapterEvolution(bookDir, 1);
    ok('Post-chapter Editor Feedback', !!evolution.editorFeedback?.commercial_score);
    ok('Post-chapter World State', !!evolution.worldState?.ai_control);
    ok('Post-chapter Character Evolution', (evolution.characterEvolutions?.length || 0) > 0);
    const brain = evolution.characterEvolutions?.find((c) => c.name === '林深')?.brain;
    if (brain?.current_state?.trust_protagonist != null) {
      ok('Character trust 下降（欺骗剧情）', brain.current_state.trust_protagonist < 80);
    }
    const ws = readWorldState(bookDir);
    ok('World rebellion 上升（摧毁设施）', (ws?.rebellion_level ?? 0) > 20);
  } catch (e) {
    failed++;
    console.error('✗ Post-chapter evolution', e.message);
  }

  fs.rmSync(tmp, { recursive: true, force: true });
  console.log(`\n${passed}/${passed + failed} passed`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
