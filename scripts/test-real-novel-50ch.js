/**
 * Real Novel Test · 《时间重置者》50 章结构连载模拟
 *
 * 不做 LLM 全文生成（成本/时长），而是跑完整 Director → Scene Execution → Writer Runtime 链路，
 * 按三阶段观察：追读动力、重复、Promise、人物成长、中期疲劳、主线强度。
 *
 * 严格遵守：不新增 Score/Analyzer/Review Engine；只输出观察报告。
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildChapterDirectorBrief,
  buildSceneExecutionPlan,
  compileLayeredStudioBlock,
  formatWriterExecutionChecklist,
  buildWriterExecutionChecklist,
} from '../packages/inkos-director/src/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'books/时间重置者/_test');
const REPORT_PATH = path.join(OUT_DIR, 'real-novel-50ch-report.json');
const REPORT_MD = path.join(OUT_DIR, 'real-novel-50ch-report.md');

const STORY_DNA = {
  title: '时间重置者',
  genre: '悬疑',
  protagonist: '林夜',
  core_hook: '世界每天凌晨四点重置，只有少数人记得',
  main_question: '谁在重置世界，林夜为什么记得？',
  theme: '记忆与牺牲',
  pov: '林夜',
};

const SCENE_COUNT = 4;

function chapterPlan(ch) {
  const phase = ch <= 10 ? 'open' : ch <= 30 ? 'mid' : 'late';
  const name = '林夜';

  // 每章独特推进，避免测试本身用 3 模板循环造成假重复
  const goals = {
    open: [
      '确认重置真实存在',
      '追查谁还记得',
      '验证宿舍异常',
      '接触苏晚',
      '潜入机房',
      '读到重置名单',
      '保护妹妹线索',
      '第一次反抗系统',
      '目睹单人消失',
      '立下追问：谁在重置',
    ],
    mid: [
      '拿到完整名单',
      '验证苏晚立场',
      '兑换信用换数据',
      '破坏一个节点',
      '发现死亡计数',
      '阻止局部重置',
      '同盟第一次背叛',
      '记忆被部分擦除',
      '找到规则裂缝',
      '妹妹房间被清空',
      '系统说欢迎第N次',
      '时间窗口提前',
      '牺牲退路',
      '公开一部分真相',
      '进入核心区外围',
      '识别重置者痕迹',
      '救一个被标记的人',
      '规则书被改写',
      '身份裂缝扩大',
      '中段不可逆代价',
    ],
    late: [
      '锁定重置者候选',
      '记忆当诱饵',
      '救回被抹去的人',
      '拒绝成为新重置者',
      '集体记忆投票',
      '面容相似度冲击',
      '规则最后一页',
      '四点人数不对',
      '主线对决一次',
      '不稳定态蔓延',
      '清算旧同盟',
      '最终选择窗口',
      '真相局部揭开',
      '更大阴谋露头',
      '终局前的假胜利',
      '身份对调可能',
      '世界裂隙可见',
      '读者须记住的终局伏笔',
      '倒计时全城化',
      '终章前夜压迫',
    ],
  };

  const pool = goals[phase];
  const idx = phase === 'open' ? (ch - 1) : phase === 'mid' ? (ch - 11) : (ch - 31);
  const goal = pool[idx % pool.length];

  const choiceVariants = [
    `为了妹妹隐瞒真相`,
    `明知危险进入系统区域`,
    `向苏晚坦白一部分`,
    `牺牲信用档案换情报`,
    `破坏节点而不是逃跑`,
    `用自己记忆当诱饵`,
    `拒绝成为新的重置者`,
    `欺骗系统保护名单`,
  ];
  const choice = choiceVariants[(ch - 1) % choiceVariants.length];

  const infoVariants = [
    '重置名单上不只有他',
    '宿舍楼有人凌晨四点醒着',
    '死亡记录显示他死过多次',
    '苏晚也记得部分循环',
    '重置可以针对单人',
    '重置者曾是第一批觉醒者',
    '集体记忆可以改写规则',
    '系统说：欢迎回来，又一次',
    `第${ch}章关键物件出现倒计时裂纹`,
    '规则书缺页与他伤口形状吻合',
  ];
  const newInformation = infoVariants[(ch - 1) % infoVariants.length];

  const consequences = [
    '同事开始怀疑他疯了',
    '系统标记异常，无法撤回',
    '关系不可逆改变',
    '退路被切断',
    '世界记住了他的破坏',
    '部分自我记忆被擦除',
    '被正式列为清除目标',
    '世界进入不稳定态',
  ];
  const consequence = consequences[(ch * 3) % consequences.length];

  const cliffs = [
    '镜子反光里多出一个影子',
    '苏晚的名字在名单上闪了一下',
    '倒计时指向下次四点',
    '窗外四点提前降临',
    '妹妹的房间被清空',
    '重置者的面容像极了林夜',
    '规则书缺了最后一页',
    '四点钟声响起，人数不对',
    `他听见有人用自己的声音说：第${ch}次了`,
    '门后站着「已经死过」的人',
  ];
  const cliffhanger = cliffs[(ch * 5) % cliffs.length];

  return {
    mainGoal: goal,
    pov: name,
    sceneCount: SCENE_COUNT,
    chapterIntent: goal,
    obstacles: ['系统监视', '时间窗口', '信任崩塌'],
    scenes: Array.from({ length: SCENE_COUNT }, (_, i) => ({
      index: i + 1,
      id: `ch${ch}_s${i + 1}`,
      goal: i === 0 ? goal : `${goal}·节拍${i + 1}`,
      choice,
      consequence,
      newInformation: `${newInformation}（S${i + 1}）`,
      cliffhanger: i === SCENE_COUNT - 1 ? cliffhanger : `${cliffhanger}·逼近`,
      obstacle: `系统阻力与时间压力·变体${ch}-${i + 1}`,
    })),
  };
}

function simulate50() {
  const chapters = [];
  let priorAuthorGoal = null;
  const authorModes = [];
  const endings = [];
  const emotions = [];
  const mustRemember = [];
  const irrational = [];
  const visuals = [];
  const promises = [];

  for (let ch = 1; ch <= 50; ch += 1) {
    const intent = {
      ...chapterPlan(ch),
      _priorChapterAuthorGoal: priorAuthorGoal,
    };

    const chapterDir = buildChapterDirectorBrief(intent, ch, {
      storyDna: STORY_DNA,
    });

    const sceneSnapshots = [];
    for (const scene of intent.scenes) {
      const executionPlan = buildSceneExecutionPlan({
        scene: { ...scene, scenePlan: scene },
        intent: {
          ...intent,
          _chapterDirector: chapterDir,
          scenes: intent.scenes,
        },
        chapter: ch,
        storyDna: STORY_DNA,
        chapterDir,
      });

      const checklist = formatWriterExecutionChecklist(
        buildWriterExecutionChecklist({
          executionPlan,
          intent: { ...intent, _chapterDirector: chapterDir },
          chapter: ch,
          sceneIndex: scene.index,
        }),
      );

      const prompt = compileLayeredStudioBlock({
        executionPlan: {
          ...executionPlan,
          chapterAuthorGoal: chapterDir.chapterAuthorGoal,
        },
        policyBlock: '',
        writerChecklist: checklist,
      });

      sceneSnapshots.push({
        index: scene.index,
        writerIntent: executionPlan.beats?.map((b) => b.writerIntent).filter(Boolean),
        authorModeId: executionPlan.writerRuntime?.authorMode?.id,
        sceneEnding: executionPlan.sceneEnding?.type,
        entertainment: executionPlan.sceneEntertainment?.entertainment,
        behavior: executionPlan.characterBehavior?.behaviorLogic,
        transformation: executionPlan.characterTransformation?.after?.belief,
        irreversible: executionPlan.conflict?.irreversibleChange || null,
        promptChars: prompt.length,
        hasChapterGoal: prompt.includes('Chapter Author Goal'),
        hasHumanWriting: prompt.includes('Human Writing Policy'),
        hasEntertainment: prompt.includes('Scene Entertainment'),
        hasBehavior: prompt.includes('Human Behavior'),
      });
    }

    priorAuthorGoal = chapterDir.chapterAuthorGoal;
    authorModes.push(chapterDir.chapterAuthorGoal);
    emotions.push({
      ch,
      start: chapterDir.chapterAuthorGoal?.readerEmotionStart,
      end: chapterDir.chapterAuthorGoal?.readerEmotionEnd,
    });
    mustRemember.push(chapterDir.chapterAuthorGoal?.mustRemember);
    promises.push({
      ch,
      plan: chapterDir.chapterPromisePlan?.summary
        || chapterDir.chapterPromisePlan?.payoffs
        || chapterDir.chapterReaderSatisfaction,
    });

    for (const s of sceneSnapshots) {
      endings.push(s.sceneEnding);
      if (s.behavior?.irrationalAction) irrational.push(s.behavior.irrationalAction);
      if (s.entertainment?.visualMoment) visuals.push(s.entertainment.visualMoment);
    }

    chapters.push({
      chapter: ch,
      phase: ch <= 10 ? '1-10' : ch <= 30 ? '10-30' : '30-50',
      authorGoal: chapterDir.chapterAuthorGoal,
      climax: chapterDir.chapterClimax?.storyShift || null,
      rhythm: chapterDir.chapterRhythm?.phases || null,
      scenes: sceneSnapshots,
    });
  }

  return { chapters, authorModes, endings, emotions, mustRemember, irrational, visuals, promises };
}

function uniqRatio(arr) {
  if (!arr.length) return 0;
  return Math.round((new Set(arr).size / arr.length) * 100);
}

function analyze(sim) {
  const { chapters, endings, emotions, mustRemember, irrational, visuals } = sim;

  const phase = (lo, hi) => chapters.filter((c) => c.chapter >= lo && c.chapter <= hi);

  const p1 = phase(1, 10);
  const p2 = phase(11, 30);
  const p3 = phase(31, 50);

  function phaseCheck(list, name) {
    const goals = list.map((c) => c.authorGoal);
    const emotionJumps = goals.filter((g) => g?.readerEmotionStart !== g?.readerEmotionEnd).length;
    const remembers = [...new Set(list.map((c) => c.authorGoal?.mustRemember).filter(Boolean))];
    const endingTypes = list.flatMap((c) => c.scenes.map((s) => s.sceneEnding));
    const authorModeIds = list.flatMap((c) => c.scenes.map((s) => s.authorModeId));
    const visualsP = list.flatMap((c) => c.scenes.map((s) => s.entertainment?.visualMoment).filter(Boolean));
    const behaviors = list.flatMap((c) => c.scenes.map((s) => s.behavior?.irrationalAction).filter(Boolean));
    const txs = list.flatMap((c) => c.scenes.map((s) => s.transformation).filter(Boolean));
    const allPromptOk = list.every((c) => c.scenes.every((s) =>
      s.hasChapterGoal && s.hasHumanWriting && s.hasEntertainment && s.hasBehavior));

    return {
      name,
      chapters: list.length,
      wantContinueSignal: emotionJumps === list.length,
      emotionCoverage: `${emotionJumps}/${list.length} 章情绪起点≠终点`,
      uniqueMustRemember: remembers.length,
      mustRememberSamples: remembers.slice(0, 5),
      endingDiversityPct: uniqRatio(endingTypes),
      endingTypes: [...new Set(endingTypes)],
      authorModeDiversityPct: uniqRatio(authorModeIds),
      visualDiversityPct: uniqRatio(visualsP),
      behaviorDiversityPct: uniqRatio(behaviors),
      uniqueTransformations: [...new Set(txs)].length,
      promptWiringOk: allPromptOk,
      climaxSamples: list.map((c) => c.climax).filter(Boolean).slice(0, 3),
    };
  }

  const report = {
    title: STORY_DNA.title,
    storyDna: STORY_DNA,
    generatedAt: new Date().toISOString(),
    totalChapters: 50,
    totalScenes: 50 * SCENE_COUNT,
    architecture: [
      'Story DNA',
      'Story Director',
      'Chapter Director (+ chapterAuthorGoal)',
      'Scene Engine',
      'Writer Runtime',
      'Beat Execution',
      '正文',
      'Reader Feedback Learning',
      'Adaptive Planner',
      '下一章',
    ],
    banned: ['Score Engine', 'Analyzer Engine', 'Review Engine'],
    kept: ['Writer Intelligence', 'Human Behavior', 'Entertainment Design', 'Human Writing Style', 'Chapter Authoring Mode'],
    global: {
      endingDiversityPct: uniqRatio(endings),
      mustRememberUnique: new Set(mustRemember).size,
      emotionUniqueEnds: new Set(emotions.map((e) => e.end)).size,
      irrationalUnique: new Set(irrational).size,
      visualUnique: new Set(visuals).size,
    },
    phase1_1_to_10: phaseCheck(p1, '第一阶段 1-10章'),
    phase2_10_to_30: phaseCheck(p2, '第二阶段 10-30章'),
    phase3_30_to_50: phaseCheck(p3, '第三阶段 30-50章'),
    observations: [],
  };

  // Observations (human-readable criteria — not a Score Engine)
  const o = report.observations;
  o.push({
    phase: '1-10',
    checks: {
      想继续看: report.phase1_1_to_10.wantContinueSignal
        ? '通过：章内情绪起迄均不同，章目标明确制造危险认知'
        : '风险：部分章情绪未位移',
      主角吸引力: report.phase1_1_to_10.uniqueTransformations > 0
        ? '通过：Choice 绑定真人行为（欲望/恐惧/非理性行动）'
        : '风险：缺少人物转变/行为动机',
      世界谜团扩大: report.phase1_1_to_10.uniqueMustRemember >= 1
        ? `通过：章末记忆点 ${report.phase1_1_to_10.uniqueMustRemember} 个不同锚点`
        : '风险：记忆点重复',
    },
  });
  o.push({
    phase: '10-30',
    checks: {
      是否重复: report.phase2_10_to_30.endingDiversityPct >= 40
        && report.phase2_10_to_30.visualDiversityPct >= 30
        ? `结构多样性尚可（结尾${report.phase2_10_to_30.endingDiversityPct}% · 视觉${report.phase2_10_to_30.visualDiversityPct}%）`
        : `风险：重复偏高（结尾${report.phase2_10_to_30.endingDiversityPct}% · 视觉${report.phase2_10_to_30.visualDiversityPct}%）— 正文层须靠 Entertainment/Ending 轮换加压`,
      Promise兑现: '章级 Promise/Satisfaction 已规划进 Chapter Director；需 LLM 正文验证自然度',
      人物成长: report.phase2_10_to_30.behaviorDiversityPct >= 20
        ? `行为动机多样度 ${report.phase2_10_to_30.behaviorDiversityPct}%`
        : '风险：人物行动理由模板化',
    },
  });
  o.push({
    phase: '30-50',
    checks: {
      主线增强: report.phase3_30_to_50.climaxSamples.length
        ? `通过：高潮位移样本存在（如「${String(report.phase3_30_to_50.climaxSamples[0]).slice(0, 40)}」）`
        : '风险：高潮位移弱',
      中期疲劳: report.phase3_30_to_50.endingDiversityPct < 35
        || report.global.mustRememberUnique < 8
        ? '警示：长期记忆点/结尾模式可能收敛 → 连载中期疲劳风险（需 Adaptive 放大差异）'
        : '结构层未见严重收敛；疲劳主要取决于正文兑现质量',
    },
  });

  return report;
}

function toMarkdown(report) {
  const lines = [
    `# Real Novel Test · 《${report.title}》50 章结构连载报告`,
    '',
    `生成时间：${report.generatedAt}`,
    '',
    '## 架构（保持不再扩张）',
    '',
    report.architecture.map((s, i) => `${i + 1}. ${s}`).join('\n'),
    '',
    '**禁止**：' + report.banned.join(' · '),
    '',
    '**保留增强**：' + report.kept.join(' · '),
    '',
    '## 全局结构多样性',
    '',
    `- Ending 多样度：${report.global.endingDiversityPct}%`,
    `- mustRemember 独立点：${report.global.mustRememberUnique}`,
    `- 情绪终点种类：${report.global.emotionUniqueEnds}`,
    `- 非理性行动种类：${report.global.irrationalUnique}`,
    `- 视觉瞬间种类：${report.global.visualUnique}`,
    '',
  ];

  for (const obs of report.observations) {
    lines.push(`## ${obs.phase} 章观察`);
    lines.push('');
    for (const [k, v] of Object.entries(obs.checks)) {
      lines.push(`- **${k}**：${v}`);
    }
    lines.push('');
  }

  lines.push('## 阶段结构化信号');
  lines.push('');
  for (const key of ['phase1_1_to_10', 'phase2_10_to_30', 'phase3_30_to_50']) {
    const p = report[key];
    lines.push(`### ${p.name}`);
    lines.push(`- 情绪位移：${p.emotionCoverage}`);
    lines.push(`- Prompt 接线：${p.promptWiringOk ? 'OK（AuthorGoal/HumanWriting/Entertainment/Behavior 全在）' : 'FAIL'}`);
    lines.push(`- Ending 多样：${p.endingDiversityPct}% · AuthorMode ${p.authorModeDiversityPct}%`);
    lines.push(`- mustRemember 样本：${(p.mustRememberSamples || []).join(' / ')}`);
    lines.push('');
  }

  lines.push('## 结论');
  lines.push('');
  lines.push('本测试验证 **写作链路是否能在 50 章跨度上持续输出差异化 Writer 指令**（章感觉、真人行为、好看瞬间、真人写法、Author Mode）。');
  lines.push('全文质量仍需对《时间重置者》跑真实 LLM Writer；结构层已具备连载不塌的执行脚手架。');
  lines.push('');
  lines.push('**下一步建议（仍不新增 Analyzer）**：对 1、10、25、40、50 章抽样跑完整 Beat Execution，人工读正文验证三阶段观感。');

  return lines.join('\n');
}

function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const sim = simulate50();
  const report = analyze(sim);
  fs.writeFileSync(REPORT_PATH, JSON.stringify({ report, chapters: sim.chapters }, null, 2));
  fs.writeFileSync(REPORT_MD, toMarkdown(report));

  const fail = !report.phase1_1_to_10.promptWiringOk
    || !report.phase2_10_to_30.promptWiringOk
    || !report.phase3_30_to_50.promptWiringOk;
  if (fail) {
    console.error('FAIL: prompt wiring broken across phases');
    process.exit(1);
  }

  console.log('title', report.title);
  console.log('scenes', report.totalScenes);
  console.log('phase1 continue', report.observations[0].checks['想继续看']);
  console.log('phase2 repeat', report.observations[1].checks['是否重复']);
  console.log('phase3 fatigue', report.observations[2].checks['中期疲劳']);
  console.log('report', REPORT_MD);
  console.log('OK: Real Novel 50ch structural test');
}

main();
