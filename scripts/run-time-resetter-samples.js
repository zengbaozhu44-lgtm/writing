/**
 * 《时间重置者》抽样开跑 — 第 1 / 10 / 25 / 40 / 50 章
 * Director → Writer Runtime → Beat Execution → 正文
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildChapterDirectorBrief,
  buildSceneExecutionPlan,
} from '../packages/inkos-director/src/index.js';
import {
  compileStudioWriterPrompt,
  persistWriterOptimizationMeta,
  persistBeatExecutionLog,
} from '../packages/inkos-studio-server/src/writer-optimization/compile-writer-prompt.js';
import { executeBeatSequence } from '../packages/inkos-studio-server/src/writer-optimization/beat-execution.js';
import {
  chatCompletion,
  isLlmConfigured,
} from '../packages/inkos-brain/src/writer/llm-writer.js';
import { loadInkOsConfig } from '../packages/inkos-core/src/lib/config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const BOOK_DIR = path.join(ROOT, 'books/我的小说/books/时间重置者');
const SAMPLE_CHAPTERS = [1, 10, 25, 40, 50];
const SCENES_PER_CHAPTER = Number(process.env.INKOS_SAMPLE_SCENES || 4);
const WORD_TARGET = Number(process.env.INKOS_SAMPLE_WORD_TARGET || 650);

const STORY_DNA = {
  title: '时间重置者',
  genre: '科幻悬疑',
  protagonist: '林夜',
  core_hook: '世界每天凌晨四点重置，只有少数人记得',
  main_question: '谁在重置世界？林夜为什么记得？',
  theme: '当世界可以被重置，人还剩下什么不能被抹去的东西？',
  pov: '林夜',
};

const CHAPTER_SPECS = {
  1: {
    title: '四点之后',
    mainGoal: '确认重置真实存在',
    beats: {
      goal: '确认世界被重置',
      choice: '隐瞒自己记得重置',
      consequence: '同事苏晚开始怀疑他精神失常',
      newInformation: '宿舍楼有人凌晨四点醒着',
      cliffhanger: '镜子反光里多出一个影子',
    },
  },
  10: {
    title: '名单上的第二个人',
    mainGoal: '读到重置名单并确认自己不是唯一',
    beats: {
      goal: '潜入机房读取重置名单',
      choice: '明知危险仍然进入系统区域',
      consequence: '系统标记林夜异常，无法撤回',
      newInformation: '重置名单上不只有他——苏晚的名字闪过',
      cliffhanger: '系统弹出：欢迎回来，第38次',
    },
  },
  25: {
    title: '单人清空',
    mainGoal: '阻止一次针对妹妹房间的局部重置',
    beats: {
      goal: '阻止局部重置节点',
      choice: '牺牲信用档案换破坏权限',
      consequence: '退路被切断，世界记住了他的破坏',
      newInformation: '重置可以针对单人执行',
      cliffhanger: '妹妹的房间已被单人重置清空',
    },
  },
  40: {
    title: '像他的脸',
    mainGoal: '锁定重置者身份候选',
    beats: {
      goal: '用记忆当诱饵引出重置者',
      choice: '用自己记忆当诱饵',
      consequence: '被正式列为清除目标',
      newInformation: '重置者曾是第一批觉醒者',
      cliffhanger: '重置者的面容像极了林夜',
    },
  },
  50: {
    title: '拒绝成为下一个',
    mainGoal: '拒绝成为新的重置者并打开规则裂隙',
    beats: {
      goal: '面对成为重置者的权限诱惑',
      choice: '拒绝成为新的重置者',
      consequence: '世界进入不稳定态',
      newInformation: '集体记忆可以改写规则',
      cliffhanger: '四点钟声响起，人数不对',
    },
  },
};

function buildIntent(ch, spec) {
  const b = spec.beats;
  const scenes = Array.from({ length: SCENES_PER_CHAPTER }, (_, i) => {
    const index = i + 1;
    return {
      index,
      id: `ch${String(ch).padStart(4, '0')}_s${String(index).padStart(2, '0')}`,
      wordTarget: WORD_TARGET,
      goal: index === 1 ? b.goal : `${b.goal}·节拍${index}`,
      obstacle: '系统监视与时间窗口收窄',
      choice: b.choice,
      consequence: b.consequence,
      newInformation: index === SCENES_PER_CHAPTER ? b.newInformation : `${b.newInformation}（逼近）`,
      cliffhanger: index === SCENES_PER_CHAPTER ? b.cliffhanger : `${b.cliffhanger}·压力升级`,
    };
  });
  return {
    pov: '林夜',
    mainGoal: spec.mainGoal,
    chapterIntent: spec.mainGoal,
    chapterTitle: spec.title,
    sceneCount: SCENES_PER_CHAPTER,
    scenes,
    obstacles: ['系统监视', '时间窗口', '信任崩塌'],
    _storyDna: STORY_DNA,
    storyDna: STORY_DNA,
  };
}

function ensureDirs() {
  for (const rel of [
    'chapters',
    'novel/_system/studio/writer-optimization',
    'novel/_system/sample-runs',
    'novel/_system/brain',
  ]) {
    fs.mkdirSync(path.join(BOOK_DIR, rel), { recursive: true });
  }
}

async function writeSceneWithBeats({
  bookDir,
  chapter,
  scene,
  intent,
  chapterDir,
  llm,
}) {
  const { prompt, meta } = compileStudioWriterPrompt({
    basePrompt: [
      `你在写商业网文《时间重置者》第 ${chapter} 章 Scene ${scene.index}。`,
      'POV：林夜。限知。硬切。身体先行。',
      '只输出正文。不要标题，不要 markdown，不要解释。',
    ].join('\n'),
    scene,
    chapter,
    intent,
    ctx: { bookDir, styleDna: {} },
    storyDna: STORY_DNA,
    chapterDir,
  });

  const executionPlan = meta.executionPlan;
  persistWriterOptimizationMeta(bookDir, chapter, scene, meta);

  const llmFn = async ({ system, userPrompt, beat }) => {
    const result = await chatCompletion({
      baseUrl: llm.baseUrl,
      apiKey: llm.apiKey,
      model: llm.model,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: userPrompt },
      ],
      maxTokens: Math.min(llm.maxTokens || 2048, Math.round((beat.wordBudget || 120) * 2.2)),
      temperature: llm.temperature ?? 0.85,
    });
    return String(result.content || '')
      .replace(/^```[\w]*\n?/m, '')
      .replace(/\n?```$/m, '')
      .trim();
  };

  const beatResult = await executeBeatSequence({
    executionPlan,
    basePrompt: prompt,
    llmFn,
  });

  persistBeatExecutionLog(bookDir, chapter, scene, beatResult);
  scene.text = beatResult.text;
  scene.executionPlan = executionPlan;
  return beatResult;
}

async function runChapter(ch, priorAuthorGoal, llm) {
  const spec = CHAPTER_SPECS[ch];
  const intent = buildIntent(ch, spec);
  intent._priorChapterAuthorGoal = priorAuthorGoal;

  const chapterDir = buildChapterDirectorBrief(intent, ch, {
    bookDir: BOOK_DIR,
    storyDna: STORY_DNA,
  });
  intent._chapterDirector = chapterDir;

  // 预热每 Scene 的 executionPlan（写入 intent.scenes）
  for (const scene of intent.scenes) {
    scene.executionPlan = buildSceneExecutionPlan({
      scene: { ...scene, scenePlan: scene },
      intent,
      chapter: ch,
      storyDna: STORY_DNA,
      chapterDir,
    });
  }

  const sceneParts = [];
  for (const scene of intent.scenes) {
    console.log(`  → Ch${ch} Scene ${scene.index}/${SCENES_PER_CHAPTER} Beat Execution...`);
    const t0 = Date.now();
    const result = await writeSceneWithBeats({
      bookDir: BOOK_DIR,
      chapter: ch,
      scene,
      intent,
      chapterDir,
      llm,
    });
    const ms = Date.now() - t0;
    const chars = result.text.replace(/\s/g, '').length;
    console.log(`     done ${chars}字 ${ms}ms · Intent=${scene.executionPlan.beats?.[0]?.writerIntent || '—'}`);
    sceneParts.push({
      index: scene.index,
      chars,
      ms,
      authorMode: scene.executionPlan.writerRuntime?.authorMode?.id,
      entertainment: scene.executionPlan.sceneEntertainment?.entertainment?.visualMoment?.slice(0, 40),
      behavior: scene.executionPlan.characterBehavior?.behaviorLogic?.irrationalAction?.slice(0, 40),
      text: result.text,
    });
  }

  const body = [
    `# 第${ch}章 ${spec.title}`,
    '',
    `> Chapter Author Goal：${chapterDir.chapterAuthorGoal?.readerEmotionStart}` +
      `→${chapterDir.chapterAuthorGoal?.readerEmotionEnd}`,
    `> mainFeeling：${chapterDir.chapterAuthorGoal?.mainFeeling}`,
    `> mustRemember：${chapterDir.chapterAuthorGoal?.mustRemember}`,
    '',
    ...sceneParts.flatMap((p, i) => [
      i === 0 ? '' : '',
      p.text,
      '',
    ]),
  ].join('\n').trim() + '\n';

  const chapterFile = path.join(
    BOOK_DIR,
    'chapters',
    `${String(ch).padStart(4, '0')}_${spec.title}.md`,
  );
  fs.writeFileSync(chapterFile, body, 'utf8');

  const runMeta = {
    chapter: ch,
    title: spec.title,
    authorGoal: chapterDir.chapterAuthorGoal,
    scenes: sceneParts.map(({ text, ...rest }) => rest),
    chapterFile,
    chars: body.replace(/\s/g, '').length,
    updatedAt: new Date().toISOString(),
  };
  fs.writeFileSync(
    path.join(BOOK_DIR, 'novel/_system/sample-runs', `ch_${String(ch).padStart(4, '0')}.json`),
    JSON.stringify(runMeta, null, 2),
  );

  return { chapterDir, runMeta, body, chapterFile };
}

async function main() {
  if (!isLlmConfigured()) {
    console.error('FAIL: LLM 未配置，无法开跑正文');
    process.exit(1);
  }

  ensureDirs();
  const llm = loadInkOsConfig().llm;
  console.log(`Book: ${BOOK_DIR}`);
  console.log(`LLM: ${llm.model} @ ${llm.baseUrl}`);
  console.log(`Sample chapters: ${SAMPLE_CHAPTERS.join(', ')} · scenes=${SCENES_PER_CHAPTER} · wordTarget≈${WORD_TARGET}`);

  const summary = [];
  let priorAuthorGoal = null;

  // 对中间跳跃章节补 priorAuthorGoal（轻量，不写正文）
  for (let ch = 1; ch <= 50; ch += 1) {
    if (!SAMPLE_CHAPTERS.includes(ch) && !priorAuthorGoal) {
      // skip until first sample
    }
    if (!SAMPLE_CHAPTERS.includes(ch)) {
      // 轻量推进章感觉链，避免跳跃后情绪断档
      if (SAMPLE_CHAPTERS.some((s) => s > ch)) {
        const bridgeSpec = CHAPTER_SPECS[SAMPLE_CHAPTERS.find((s) => s >= ch)] || CHAPTER_SPECS[1];
        const bridgeIntent = buildIntent(ch, {
          ...bridgeSpec,
          title: `桥接_${ch}`,
          mainGoal: `推进至抽样节点（第${ch}章）`,
        });
        bridgeIntent._priorChapterAuthorGoal = priorAuthorGoal;
        const brief = buildChapterDirectorBrief(bridgeIntent, ch, {
          bookDir: BOOK_DIR,
          storyDna: STORY_DNA,
        });
        priorAuthorGoal = brief.chapterAuthorGoal;
      }
      continue;
    }

    console.log(`\n=== 第 ${ch} 章 《${CHAPTER_SPECS[ch].title}》===`);
    const result = await runChapter(ch, priorAuthorGoal, llm);
    priorAuthorGoal = result.chapterDir.chapterAuthorGoal;
    summary.push({
      chapter: ch,
      title: CHAPTER_SPECS[ch].title,
      file: result.chapterFile,
      chars: result.runMeta.chars,
      emotion: `${result.chapterDir.chapterAuthorGoal.readerEmotionStart}→${result.chapterDir.chapterAuthorGoal.readerEmotionEnd}`,
      mustRemember: result.chapterDir.chapterAuthorGoal.mustRemember,
    });
  }

  const reportPath = path.join(BOOK_DIR, 'novel/_system/sample-runs/SAMPLE_REPORT.md');
  const report = [
    '# 《时间重置者》抽样开跑报告',
    '',
    `时间：${new Date().toISOString()}`,
    `章节：${SAMPLE_CHAPTERS.join(' / ')}`,
    '',
    '| 章 | 标题 | 字数 | 情绪 | 必记 |',
    '|----|------|------|------|------|',
    ...summary.map((s) =>
      `| ${s.chapter} | ${s.title} | ${s.chars} | ${s.emotion} | ${s.mustRemember?.slice(0, 24) || ''} |`),
    '',
    '正文目录：`chapters/`',
    'Beat 日志：`novel/_system/studio/writer-optimization/ch_XXXX/`',
    '',
  ].join('\n');
  fs.writeFileSync(reportPath, report, 'utf8');

  // 同步指针到 books/时间重置者
  fs.mkdirSync(path.join(ROOT, 'books/时间重置者'), { recursive: true });
  fs.writeFileSync(
    path.join(ROOT, 'books/时间重置者/BOOK_PATH.txt'),
    `canonical=${BOOK_DIR}\n`,
    'utf8',
  );
  fs.copyFileSync(reportPath, path.join(ROOT, 'books/时间重置者/_test/SAMPLE_REPORT.md'));

  console.log('\n=== DONE ===');
  for (const s of summary) {
    console.log(`Ch${s.chapter} ${s.title}: ${s.chars}字 → ${s.file}`);
  }
  console.log('report', reportPath);
}

main().catch((err) => {
  console.error('RUN FAILED', err);
  process.exit(1);
});
