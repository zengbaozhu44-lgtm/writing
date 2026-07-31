/**
 * 《时间重置者》抽样开跑 — 第 1 / 10 / 25 / 40 / 50 章
 * 链路：Chapter Director → Scene Execution → Writer Runtime → Beat Execution（LLM）→ 正文
 * 不新增 Analyzer；抽样验证 Professional Writer Quality
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildChapterDirectorBrief,
  buildSceneExecutionPlan,
  compileLayeredStudioBlock,
  buildWriterExecutionChecklist,
  formatWriterExecutionChecklist,
  formatWriterFirstPolicyBlock,
} from '../packages/inkos-director/src/index.js';
import { executeBeatSequence } from '../packages/inkos-studio-server/src/writer-optimization/beat-execution.js';
import { persistBeatExecutionLog } from '../packages/inkos-studio-server/src/writer-optimization/compile-writer-prompt.js';
import { isLlmConfigured } from '../packages/inkos-brain/src/writer/llm-writer.js';
import { loadInkOsConfig } from '../packages/inkos-core/src/lib/config.js';

async function chatCompletionCompat({ baseUrl, apiKey, model, messages, maxTokens, temperature }) {
  const root = String(baseUrl || '').replace(/\/$/, '').replace(/\/v1$/, '');
  // 智谱 BigModel：https://open.bigmodel.cn/api/paas/v4/chat/completions
  // OpenAI / DeepSeek：{base}/v1/chat/completions
  const url = /\/paas\/v4$/u.test(root) || /bigmodel\.cn/u.test(root)
    ? `${root}/chat/completions`
    : `${root}/v1/chat/completions`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: maxTokens,
      temperature,
      stream: false,
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`LLM 请求失败 ${res.status}: ${err.slice(0, 300)}`);
  }
  const data = await res.json();
  return {
    content: data.choices?.[0]?.message?.content || '',
    usage: data.usage,
  };
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const BOOK_DIR = path.join(ROOT, 'books/我的小说/books/时间重置者');
const OUT_CHAPTERS = path.join(BOOK_DIR, 'novel/chapters');
const OUT_META = path.join(BOOK_DIR, 'novel/_system/sample-run');
const SAMPLE_CHAPTERS = [1, 10, 25, 40, 50];
const SCENE_COUNT = 3;
const WORD_TARGET = 420;

const STORY_DNA = {
  title: '时间重置者',
  genre: '科幻悬疑',
  protagonist: '林夜',
  core_hook: '世界每天凌晨四点重置，只有少数人保留记忆',
  main_question: '谁在重置世界？林夜为什么记得？',
  theme: '记忆、牺牲与自由意志',
  pov: '林夜',
};

const CHAPTER_BLUEPRINTS = {
  1: {
    mainGoal: '确认「世界会重置」不是幻觉',
    choice: '隐瞒自己记得重置',
    consequence: '苏晚开始用异样眼光看他',
    newInformation: '配送网日志在 04:00 有不可读批处理',
    cliffhanger: '镜子反光里多出一个影子',
    obstacles: ['自我怀疑', '监控', '时间逼近四点'],
  },
  10: {
    mainGoal: '读到重置名单并确认妹妹曾被写入',
    choice: '为了妹妹进入封禁机房',
    consequence: '系统标记林夜异常不可撤回',
    newInformation: '重置名单上不只有他——苏晚的名字闪了一下',
    cliffhanger: '系统低语：欢迎回来，第38次',
    obstacles: ['门禁', '信用风险', '苏晚立场不明'],
  },
  25: {
    mainGoal: '阻止一次针对妹妹房间的局部重置',
    choice: '牺牲信用档案换破坏节点的权限',
    consequence: '退路被切断，世界记住了他的破坏',
    newInformation: '重置可以针对单人',
    cliffhanger: '妹妹的房间被清空——像从未住过人',
    obstacles: ['时间窗口', '系统反制', '同盟破裂风险'],
  },
  40: {
    mainGoal: '锁定重置者曾是第一批清醒者',
    choice: '用自己的记忆当诱饵',
    consequence: '被正式列为清除目标',
    newInformation: '重置者的面容像极了林夜',
    cliffhanger: '规则书缺了最后一页',
    obstacles: ['身份迷雾', '清除协议', '信任崩塌'],
  },
  50: {
    mainGoal: '拒绝成为新的重置者，守住一次不可逆选择',
    choice: '拒绝接管重置权限',
    consequence: '世界进入不稳定态',
    newInformation: '集体记忆投票仍想让循环继续',
    cliffhanger: '四点钟声响起，房间里人数不对',
    obstacles: ['权力诱惑', '集体压力', '倒计时'],
  },
};

function ensureDirs() {
  fs.mkdirSync(OUT_CHAPTERS, { recursive: true });
  fs.mkdirSync(OUT_META, { recursive: true });
}

function buildIntent(chapter) {
  const bp = CHAPTER_BLUEPRINTS[chapter];
  const scenes = Array.from({ length: SCENE_COUNT }, (_, i) => ({
    index: i + 1,
    id: `ch${chapter}_s${i + 1}`,
    wordTarget: WORD_TARGET,
    goal: i === 0 ? bp.mainGoal : `${bp.mainGoal}·推进${i + 1}`,
    choice: bp.choice,
    consequence: bp.consequence,
    newInformation: bp.newInformation,
    cliffhanger: i === SCENE_COUNT - 1 ? bp.cliffhanger : `${bp.cliffhanger}·逼近`,
    obstacle: bp.obstacles[i % bp.obstacles.length],
  }));
  return {
    pov: '林夜',
    mainGoal: bp.mainGoal,
    chapterIntent: bp.mainGoal,
    sceneCount: SCENE_COUNT,
    obstacles: bp.obstacles,
    scenes,
  };
}

function makeLlmFn(cfg) {
  return async ({ system, userPrompt }) => {
    const result = await chatCompletionCompat({
      baseUrl: cfg.llm.baseUrl,
      apiKey: cfg.llm.apiKey,
      model: cfg.llm.model,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: userPrompt },
      ],
      maxTokens: Math.min(cfg.llm.maxTokens || 2048, 1200),
      temperature: cfg.llm.temperature ?? 0.85,
    });
    return String(result.content || '')
      .replace(/^```[\w]*\n?/m, '')
      .replace(/\n?```$/m, '')
      .trim();
  };
}

async function runChapter(chapter, llmFn, priorAuthorGoal = null) {
  const intent = buildIntent(chapter);
  intent._priorChapterAuthorGoal = priorAuthorGoal;
  intent._storyDna = STORY_DNA;

  const chapterDir = buildChapterDirectorBrief(intent, chapter, {
    bookDir: BOOK_DIR,
    storyDna: STORY_DNA,
  });

  const sceneTexts = [];
  const sceneMetas = [];

  for (const scene of intent.scenes) {
    const executionPlan = buildSceneExecutionPlan({
      scene: { ...scene, scenePlan: scene },
      intent: {
        ...intent,
        _chapterDirector: chapterDir,
        scenes: intent.scenes.map((s) => {
          const written = sceneTexts.find((x) => x.index === s.index);
          return written ? { ...s, text: written.text } : s;
        }),
      },
      chapter,
      storyDna: STORY_DNA,
      chapterDir,
    });

    // attach chapterAuthorGoal for layered/beat prompts
    executionPlan.chapterAuthorGoal = chapterDir.chapterAuthorGoal;

    const checklist = formatWriterExecutionChecklist(
      buildWriterExecutionChecklist({
        executionPlan,
        intent: { ...intent, _chapterDirector: chapterDir },
        chapter,
        sceneIndex: scene.index,
      }),
    );

    const basePrompt = compileLayeredStudioBlock({
      executionPlan,
      policyBlock: formatWriterFirstPolicyBlock(),
      writerChecklist: checklist,
      voiceDna: null,
    });

    console.log(`  → Scene ${scene.index}/${SCENE_COUNT} Beat Execution…`);
    const t0 = Date.now();
    const result = await executeBeatSequence({
      executionPlan,
      basePrompt,
      llmFn,
      onBeatStart: (beat) => {
        process.stdout.write(`    beat ${beat.order} ${beat.writerIntent || beat.structuralBeat}… `);
      },
      onBeatComplete: (beat, text) => {
        console.log(`${text.replace(/\s/g, '').length}字`);
      },
    });
    console.log(`    done ${Date.now() - t0}ms · ${result.text.replace(/\s/g, '').length}字`);

    scene.text = result.text;
    scene.executionPlan = executionPlan;
    sceneTexts.push({ index: scene.index, text: result.text });
    sceneMetas.push({
      index: scene.index,
      chars: result.text.replace(/\s/g, '').length,
      writerIntents: executionPlan.beats.map((b) => b.writerIntent),
      authorMode: executionPlan.writerRuntime?.authorMode?.id,
      entertainment: executionPlan.sceneEntertainment?.entertainment,
      behavior: executionPlan.characterBehavior?.behaviorLogic,
      ending: executionPlan.sceneEnding?.type,
    });

    persistBeatExecutionLog(BOOK_DIR, chapter, scene, result);

    const sceneFile = path.join(OUT_META, `ch_${String(chapter).padStart(4, '0')}_s${String(scene.index).padStart(2, '0')}.md`);
    fs.writeFileSync(sceneFile, result.text, 'utf8');
  }

  const chapterBody = [
    `# 第${chapter}章`,
    '',
    `> Author Goal：${chapterDir.chapterAuthorGoal?.readerEmotionStart} → ${chapterDir.chapterAuthorGoal?.readerEmotionEnd}`,
    `> ${chapterDir.chapterAuthorGoal?.mainFeeling}`,
    `> 必记：${chapterDir.chapterAuthorGoal?.mustRemember}`,
    '',
    ...sceneTexts.flatMap((s, i) => [
      i === 0 ? '' : '',
      s.text,
      '',
    ]),
  ].join('\n');

  const chapterFile = path.join(OUT_CHAPTERS, `${String(chapter).padStart(4, '0')}.md`);
  fs.writeFileSync(chapterFile, chapterBody, 'utf8');

  const meta = {
    chapter,
    authorGoal: chapterDir.chapterAuthorGoal,
    climax: chapterDir.chapterClimax?.storyShift || null,
    scenes: sceneMetas,
    savedAt: new Date().toISOString(),
    file: chapterFile,
  };
  fs.writeFileSync(
    path.join(OUT_META, `ch_${String(chapter).padStart(4, '0')}_meta.json`),
    JSON.stringify(meta, null, 2),
  );

  return meta;
}

async function main() {
  ensureDirs();
  if (!isLlmConfigured()) {
    console.error('FAIL: LLM 未配置（需要 INKOS_LLM_API_KEY）');
    process.exit(1);
  }

  const cfg = loadInkOsConfig();
  console.log('book', BOOK_DIR);
  console.log('llm', cfg.llm.model, cfg.llm.baseUrl);
  console.log('chapters', SAMPLE_CHAPTERS.join(', '));

  const only = process.argv.slice(2).map(Number).filter(Boolean);
  const targets = only.length ? only : SAMPLE_CHAPTERS;

  const llmFn = makeLlmFn(cfg);
  const summary = [];
  let priorGoal = null;

  // 若只跑非首章，尝试加载上一份抽样 meta 的 authorGoal（粗衔接）
  for (const ch of targets) {
    const idx = SAMPLE_CHAPTERS.indexOf(ch);
    if (idx > 0 && !priorGoal) {
      const prevCh = SAMPLE_CHAPTERS[idx - 1];
      const prevMetaPath = path.join(OUT_META, `ch_${String(prevCh).padStart(4, '0')}_meta.json`);
      if (fs.existsSync(prevMetaPath)) {
        priorGoal = JSON.parse(fs.readFileSync(prevMetaPath, 'utf8')).authorGoal;
      }
    }

    console.log(`\n=== 第 ${ch} 章 ===`);
    try {
      const meta = await runChapter(ch, llmFn, priorGoal);
      priorGoal = meta.authorGoal;
      summary.push({ chapter: ch, ok: true, chars: meta.scenes.reduce((a, s) => a + s.chars, 0), mustRemember: meta.authorGoal?.mustRemember });
      console.log(`✓ 第${ch}章完成 · ${summary.at(-1).chars}字 → novel/chapters/${String(ch).padStart(4, '0')}.md`);
    } catch (err) {
      console.error(`✗ 第${ch}章失败:`, err.message);
      summary.push({ chapter: ch, ok: false, error: err.message });
      fs.writeFileSync(path.join(OUT_META, 'run-summary.json'), JSON.stringify({ summary, stoppedAt: new Date().toISOString() }, null, 2));
      process.exitCode = 1;
      break;
    }
  }

  // 更新 chapters/index.json
  const index = targets.map((ch) => {
    const file = `${String(ch).padStart(4, '0')}.md`;
    const full = path.join(OUT_CHAPTERS, file);
    return {
      chapter: ch,
      title: `第${ch}章`,
      file: `novel/chapters/${file}`,
      exists: fs.existsSync(full),
      sample: true,
    };
  });
  fs.writeFileSync(path.join(BOOK_DIR, 'chapters/index.json'), JSON.stringify(index, null, 2));
  fs.writeFileSync(path.join(OUT_META, 'run-summary.json'), JSON.stringify({
    book: '时间重置者',
    sampleChapters: targets,
    summary,
    finishedAt: new Date().toISOString(),
  }, null, 2));

  console.log('\n=== SUMMARY ===');
  for (const s of summary) {
    console.log(s.ok ? `ch${s.chapter} OK ${s.chars}字 · ${s.mustRemember}` : `ch${s.chapter} FAIL ${s.error}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
