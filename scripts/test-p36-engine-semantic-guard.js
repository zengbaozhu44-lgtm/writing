/**
 * P3.6-1 Fixture Semantic Guard — 钉死「章级 conflict 注入被静默绕过」
 *
 * 背景（P3.6 只读审计结论 C）：
 *   buildSceneEngineBundle 被调两次——
 *   ① attachSceneEngines（scene-director:96，无 chapterClimax）→ ④ scene.scenePlan
 *   ② buildSceneExecutionPlan（scene-execution:658，带 chapterClimax）→ ②/① executionPlan
 *   但 ② 内部 reuse 守卫（scene-execution:185-189 `plan.conflict?.opponent ? plan.conflict : buildSceneConflict({chapterClimax})`）
 *   使 ④ 的 positional conflict 直接复用 → conflict-engine:110-113 的
 *   maxCost / maxConflict 章级注入（climax 场景）在生产主路径被静默绕过。
 *
 * 本 fixture 两方向（用户拍板：先测不改码）：
 *   Case A（scene 无 authored conflict + chapterClimax 存在 + sceneIndex 非末拍）
 *     —— 若候选①（attachSceneEngines 传 chapterClimax，1 行）成立，下列语义断言应转绿：
 *        ① ④.climaxRole chapter-aware（isClimax，非 positional fallback）
 *        ② ④.conflict 出现 maxCost/maxConflict 章级注入
 *        ③ ② executionPlan 不重新产生另一套不同语义（④/②/① climaxRole 同语义 + conflict 同对象）
 *        ④ SD brief 消费到 chapter-aware conflict（不只是内部字段变）
 *   Case B（scene.conflict = authored + chapterClimax 存在）
 *     —— 必须证明 authored 不被章级 engine 覆盖（P3.3 Story Truth 原则不破坏）
 *
 * 设计要点：
 *   buildChapterClimaxPlan 恒把 climax 放末拍（climax-engine.js:23 climaxSceneIndex = sceneCount），
 *   若用真实产物，末拍场景 positional 与 chapter-aware 的 isClimax 无法区分。
 *   因此 chapterClimax 手动构造：climaxSceneIndex=3，sceneCount=5（非末拍、可区分）。
 *
 * 运行：node scripts/test-p36-engine-semantic-guard.js
 */
import { runChapterDirector, runSceneDirector } from '../packages/inkos-director/src/index.js';

const FAILURES = []; // invariant 失败（fixture 自身或修复被破坏）
const SEMANTIC = []; // Case-A 语义断言（当前应为红=钉死绕过；修复后应转绿）

function checkInvariant(name, cond, detail = '') {
  if (cond) {
    console.log(`  ✅ [invariant] ${name}`);
  } else {
    console.log(`  ❌ [invariant] ${name}${detail ? ` — ${detail}` : ''}`);
    FAILURES.push(name);
  }
}
function checkSemantic(name, cond, detail = '') {
  if (cond) {
    console.log(`  ✅ [semantic]  ${name}`);
  } else {
    console.log(`  ❌ [semantic]  ${name}${detail ? ` — ${detail}` : ''}`);
    SEMANTIC.push(name);
  }
}

// ===== 共享 fixture =====
const chapterClimax = {
  climaxSceneIndex: 3, // 非末拍：positional 会判 scene3 为 escalation / isClimax=false
  maxConflict: '她必须亲手背叛师父才换回弟弟的药',
  maxChoice: '救弟弟的命，还是守住师门的秘密',
  maxCost: '左手被废，此生再不能练剑',
  maxInfoRelease: '师父就是当年屠村的人',
  storyShift: '师徒决裂，浪迹江湖',
  sceneRoles: [
    { sceneIndex: 3, role: 'climax' },
    { sceneIndex: 2, role: 'pre-climax' },
  ],
};

const storyDna = { main_question: '她能否在复仇与报恩之间找到第三条路？' };
const intent = {
  pov: '林晚',
  mainGoal: '替被屠村的家人复仇',
  sceneCount: 5,
  storyDna,
  scenes: [
    { index: 1, goal: '入城寻仇家线索', consequence: '暴露行踪' },
    { index: 2, goal: '确认师父是凶手', consequence: '与师父对峙' },
    { index: 3, goal: '逼师父说出当年真相', consequence: '师徒决裂' },
    { index: 4, goal: '夺回弟弟的解药', consequence: '身负重伤' },
    { index: 5, goal: '带弟弟离开', consequence: '放下仇恨' },
  ],
};

// 真实 runChapterDirector 保证章上下文真实，仅覆盖 chapterClimax 为非末拍
const chapterDir = {
  ...runChapterDirector({ intent, chapter: 1, storyDna }),
  chapter: 1,
  chapterClimax,
};

console.log('\n=== P3.6-1 Fixture Semantic Guard ===');

// ===== Case A：climax 场景（scene 3 / 5），无 authored conflict =====
console.log('\n[Case A] scene3（climaxSceneIndex=3 / sceneCount=5）无 authored conflict');
const sceneA = {
  index: 3,
  goal: '逼师父说出当年真相',
  obstacle: '师父绝不松口',
  choice: '动手还是不动手',
  consequence: '师徒决裂',
  newInformation: '师父就是屠村的人',
  cliffhanger: '门外响起了镖局的脚步声',
  openingWorldState: '师徒对峙',
  closingWorldState: '师徒决裂',
};
const dirA = runSceneDirector({ scene: sceneA, intent, chapterDir });
const planA = dirA.scenePlan;    // ④
const epA = dirA.executionPlan;  // ②/①
const briefA = dirA.brief || '';

// ① ④.climaxRole 应 chapter-aware（scene3 → isClimax），非 positional（positional 判 3>=5=false）
checkSemantic(
  '① ④.climaxRole.isClimax === true（非 positional fallback）',
  planA.climaxRole?.isClimax === true,
  `实际 isClimax=${planA.climaxRole?.isClimax} role=${planA.climaxRole?.role}`,
);
checkSemantic(
  '① ④.climaxRole.climaxPlan 存在（chapter-aware 才带）',
  Boolean(planA.climaxRole?.climaxPlan),
  `climaxPlan=${planA.climaxRole?.climaxPlan ? '有' : '无'}`,
);

// ② ④.conflict 应出现 maxCost / maxConflict 章级注入
checkSemantic(
  '② ④.conflict.cost === chapterClimax.maxCost（注入生效）',
  planA.conflict?.cost === chapterClimax.maxCost,
  `实际 cost=${JSON.stringify(planA.conflict?.cost)}`,
);
checkSemantic(
  '② ④.conflict.opposition === chapterClimax.maxConflict（注入生效）',
  planA.conflict?.opposition === chapterClimax.maxConflict,
  `实际 opposition=${JSON.stringify(planA.conflict?.opposition)}`,
);

// ③ ② executionPlan 不应重新产生另一套不同语义
checkInvariant(
  '③ ②/① 不重算：executionPlan.conflict === ④.conflict（同一对象）',
  epA.conflict === planA.conflict,
  `epA.conflict===planA.conflict : ${epA.conflict === planA.conflict}`,
);
checkInvariant(
  '③ ②/① 不分裂：executionPlan.scenePlan.climaxRole === executionPlan.climaxRole（同一对象）',
  epA.scenePlan?.climaxRole === epA.climaxRole,
  '②.scenePlan.climaxRole 与 ①.climaxRole 非同一引用',
);
checkSemantic(
  '③ ④/① climaxRole 同语义：executionPlan.climaxRole.isClimax === ④.climaxRole.isClimax',
  epA.climaxRole?.isClimax === planA.climaxRole?.isClimax,
  `①.isClimax=${epA.climaxRole?.isClimax} vs ④.isClimax=${planA.climaxRole?.isClimax}`,
);
checkSemantic(
  '③ ①.conflict 也应注入：executionPlan.conflict.cost === maxCost（reuse 传播）',
  epA.conflict?.cost === chapterClimax.maxCost,
  `实际 ①.cost=${JSON.stringify(epA.conflict?.cost)}`,
);

// ④ SD brief 消费到 chapter-aware conflict（formatConflictBrief 渲染 ④.conflict）
// 注意：必须断言 Conflict 段内部，而非整个 brief——Climax 段（formatClimaxSceneBlock）本就
// chapter-aware 直读 chapterClimax，会含 maxCost 文本，不能当作 conflict 注入的证据。
checkInvariant(
  '④ SD brief 含 Conflict 段（结构存在）',
  briefA.includes('### Conflict · 代价型'),
  'brief 无 Conflict 段',
);
const conflictSectionA = (briefA.match(/### Conflict · 代价型[\s\S]*?(?=\n###|$)/) || [''])[0];
checkSemantic(
  '④ SD brief Conflict 段消费注入的 maxCost（formatConflictBrief 的「代价」行）',
  conflictSectionA.includes(`- **代价**：${chapterClimax.maxCost}`),
  `Conflict 段实际代价行=${(conflictSectionA.match(/- \*\*代价\*\*：[^\n]*/) || ['无'])[0]}`,
);

// ===== Case A 附加：pre-climax 场景（scene 2 / 5）isPreClimax =====
console.log('\n[Case A 附加] scene2（climax 前一拍）无 authored conflict');
const scenePre = {
  index: 2,
  goal: '确认师父是凶手',
  obstacle: '师父矢口否认',
  consequence: '与师父对峙',
  cliffhanger: '师父桌下露出一截染血刀柄',
  openingWorldState: '林晚起疑',
  closingWorldState: '师徒对峙',
};
const dirPre = runSceneDirector({ scene: scenePre, intent, chapterDir });
checkSemantic(
  '①④ ④.climaxRole.isPreClimax === true（非 positional，positional 无此键）',
  dirPre.scenePlan?.climaxRole?.isPreClimax === true,
  `实际 isPreClimax=${dirPre.scenePlan?.climaxRole?.isPreClimax}`,
);

// ===== Case B：authored conflict，必须保留（P3.3 Story Truth）=====
// 注意：sceneB 需给足 plan 标量（obstacle 等）——buildScenePlan 的 obstacle 回退会把 authored
// conflict 整对象塞进 plan.obstacle，sparse scene 会让 formatWriterSceneArcBlock 对非字符串
// content 调 .slice 崩溃（前置脆弱性，与 P3.6-1 无关，另记）。
console.log('\n[Case B] scene3 带 authored scene.conflict + chapterClimax 存在');
const sceneB = {
  index: 3,
  goal: '逼师父说出当年真相',
  obstacle: '师父以师妹性命相胁，逼林晚离开',
  choice: '当场翻脸还是虚与委蛇',
  consequence: '师徒彻底决裂',
  newInformation: '赵岩背后还站着宗门长老',
  cliffhanger: '长老的声音从走廊尽头传来',
  openingWorldState: '师徒对峙',
  closingWorldState: '师徒决裂',
  conflict: { opponent: '守门大弟子赵岩', cost: '赵岩以师妹性命要挟' },
};
const dirB = runSceneDirector({ scene: sceneB, intent, chapterDir });
const planB = dirB.scenePlan;
checkInvariant(
  '⑤ ④.conflict.opponent 保留 authored（不被章级 engine 覆盖）',
  planB.conflict?.opponent === '守门大弟子赵岩',
  `实际 opponent=${JSON.stringify(planB.conflict?.opponent)}`,
);
checkInvariant(
  '⑤ ④.conflict.cost 保留 authored（不被 maxCost 覆盖）',
  planB.conflict?.cost === '赵岩以师妹性命要挟',
  `实际 cost=${JSON.stringify(planB.conflict?.cost)}`,
);

// ===== 汇总 =====
console.log('\n=== 汇总 ===');
if (SEMANTIC.length) {
  console.log(`[Case A 语义断言] ${SEMANTIC.length} 项红 —— ${SEMANTIC.join('、')}`);
  console.log('   → 当前代码下 = 静默绕过已被钉死（④ 产出 positional，章级注入未生效）');
} else {
  console.log('[Case A 语义断言] 全绿 —— ④ 已产出 chapter-aware（候选① 已兑现）');
}
if (FAILURES.length) {
  console.log(`[invariant] ${FAILURES.length} 项失败 —— ${FAILURES.join('、')}`);
  console.log('   → fixture 自身或修复破坏了不变量，必须停');
  process.exit(1);
}
console.log('[invariant + Case B] 全绿 —— ②/① 不分裂、authored 优先（P3.3 Story Truth 未破坏）');
process.exit(0);
