/**
 * 分级内容审核冒烟：剧情词放行 · 政治敏感硬拦 · 血腥软提示
 */
import { checkValues } from '../packages/inkos-brain/src/decision/decision.js';
import { evaluateDecisions } from '../packages/inkos-brain/src/decision/decision.js';
import { sanitizeObstacleSuggestion } from '../packages/inkos-brain/src/decision/content-policy.js';
import { suggestSafeObstacle, SAFE_RETRY_SUGGESTIONS } from '../packages/inkos-brain/src/planner/conflict-suggester.js';
import { ChapterPipelineError } from '../packages/inkos-runtime/src/pipeline/chapter-pipeline-error.js';

const testCases = [
  // 剧情词汇 —— 必须放行
  { input: { goal: '主角换来背叛惨死', conflict: '底线被突破' }, expect: 'PASS' },
  { input: { goal: '复仇之路', conflict: '信任崩塌' }, expect: 'PASS' },
  { input: { goal: '他妈的，这局我接了', conflict: '去死吧' }, expect: 'PASS' },
  { input: { goal: '主动献祭无辜换取力量', conflict: '触犯底线以求生' }, expect: 'PASS' },

  // 政治敏感 —— 必须拦截
  { input: { goal: '反党行动', conflict: '颠覆政权' }, expect: 'HARD_BLOCK' },

  // 血腥 —— 软提示，不阻断
  { input: { goal: '虐杀现场', conflict: '分尸细节' }, expect: 'PASS_WITH_WARN' },
];

let passed = 0;
for (const tc of testCases) {
  const result = checkValues(tc.input);
  const ok = tc.expect === 'PASS' ? result.pass === true && !result.warnings?.length
    : tc.expect === 'HARD_BLOCK' ? result.pass === false && result.level === 'HARD_BLOCK'
      : tc.expect === 'PASS_WITH_WARN' ? result.pass === true && result.warnings?.length > 0
        : false;

  console.log(`${ok ? 'OK' : 'FAIL'} ${tc.expect}: "${tc.input.goal}"`);
  if (!ok) console.log('   实际结果:', result);
  if (ok) passed += 1;
}

// Decision 引擎集成：剧情词不得挡章
const ctx = {
  pov: '林砚',
  characters: { 林砚: { bottomLine: '绝不献祭无辜' } },
  knowledge: { matrix: [] },
  relationships: [],
  resources: {},
  facts: [],
};
const plotOk = evaluateDecisions(ctx, {
  mainGoal: '重生逆转',
  scenes: [
    { id: 's1', goal: '换来背叛惨死', conflict: '底线受阻需换路径', beat: 'hook' },
  ],
  present: ['林砚'],
  mustLose: '时间',
});
if (!plotOk.pass) {
  console.log('FAIL Decision plot pass', plotOk);
} else {
  passed += 1;
  console.log('OK Decision 剧情词放行');
}

const hard = evaluateDecisions(ctx, {
  mainGoal: '暴乱',
  scenes: [{ id: 's1', goal: '颜色革命', conflict: '暴乱', beat: 'turn' }],
  present: ['林砚'],
  mustLose: 'x',
});
if (hard.pass || hard.decisions[0]?.failures?.[0]?.level !== 'HARD_BLOCK') {
  console.log('FAIL Decision hard block', hard);
} else {
  passed += 1;
  console.log('OK Decision 政治敏感硬拦');
}

// 毒建议消毒
if (sanitizeObstacleSuggestion('底线受阻需换路径') !== '信息不完整') {
  console.log('FAIL sanitize toxic obstacle');
} else {
  passed += 1;
  console.log('OK 毒障碍消毒');
}

if (/底线受阻|背叛/.test(suggestSafeObstacle('values') + SAFE_RETRY_SUGGESTIONS.join(''))) {
  console.log('FAIL safe suggestions still toxic');
} else {
  passed += 1;
  console.log('OK 安全重试建议');
}

const err = new ChapterPipelineError({
  stage: 'decision',
  message: '内容包含政治敏感表述，请修改后重试',
  recoverable: true,
});
if (!/decision/i.test(err.userMessage) || err.toPipelineResult().pass !== false) {
  console.log('FAIL ChapterPipelineError shape', err.userMessage, err.toPipelineResult());
} else {
  passed += 1;
  console.log('OK ChapterPipelineError');
}

const total = testCases.length + 5;
console.log(`\n${passed}/${total} passed`);
if (passed !== total) process.exit(1);
