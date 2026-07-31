/**
 * Critic Engine — 责任编辑视角
 */
export function runCritic(chapterText, intent, metrics, readerResult) {
  const text = chapterText || '';
  const issues = [];
  const scores = {};

  scores.commercialRhythm = scoreRhythm(text, metrics, readerResult);
  scores.sellingPoint = scoreSellingPoint(intent, text);
  scores.payoff = scorePayoff(text, intent);
  scores.patternRepeat = scorePatternRepeat(text);
  scores.chapterValue = scoreChapterValue(intent, metrics);
  scores.retention = scoreRetention(text, readerResult);

  const overall = Math.round(
    scores.commercialRhythm * 0.2 +
    scores.sellingPoint * 0.15 +
    scores.payoff * 0.2 +
    scores.patternRepeat * 0.15 +
    scores.chapterValue * 0.15 +
    scores.retention * 0.15
  );

  if (scores.commercialRhythm < 60) issues.push({ level: 'warning', msg: '商业节奏偏弱，中段需加压' });
  if (scores.sellingPoint < 55) issues.push({ level: 'warning', msg: '卖点不够鲜明' });
  if (scores.payoff < 55) issues.push({ level: 'critical', msg: '爽点/兑现不足' });
  if (scores.patternRepeat < 50) issues.push({ level: 'warning', msg: '套路重复度高' });
  if (scores.chapterValue < 55) issues.push({ level: 'critical', msg: '本章对主线贡献不足' });
  if (scores.retention < 60) issues.push({ level: 'critical', msg: '留存风险高' });

  const pass = overall >= 62 && !issues.some((i) => i.level === 'critical');
  const plannerHints = buildPlannerHints(scores, issues, metrics);

  return {
    pass,
    overall,
    scores,
    issues,
    plannerHints,
    comment: pass ? '可上架连载' : '需回炉规划',
  };
}

function scoreRhythm(text, metrics, reader) {
  let s = reader?.readingDrive ?? 65;
  if (metrics?.dialogueRatio >= 0.25 && metrics?.dialogueRatio <= 0.6) s += 8;
  if (metrics?.wordCount < 2000) s -= 15;
  if (/然后|接着|突然/.test(text)) s -= 10;
  return clamp(s);
}

function scoreSellingPoint(intent, text) {
  let s = 60;
  if (intent.mainGoal && text.length > 200) s += 10;
  if (intent.mustGain) s += 12;
  if (/发现|线索|异常|秘密/.test(text)) s += 8;
  return clamp(s);
}

function scorePayoff(text, intent) {
  let s = 55;
  if (intent.turningPoint && text.includes(intent.turningPoint.slice(0, 4))) s += 20;
  if (/代价|失去|选择|却|但是/.test(text)) s += 15;
  if (intent.mustLose && /痛|失|代价/.test(text)) s += 10;
  return clamp(s);
}

function scorePatternRepeat(text) {
  const patterns = [/像.+一样/g, /仿佛/g, /不禁/g, /他想起/g];
  let hits = 0;
  for (const p of patterns) hits += (text.match(p) || []).length;
  return clamp(85 - hits * 8);
}

function scoreChapterValue(intent, metrics) {
  let s = 50;
  if (metrics?.worldProgress) s += 15;
  if (metrics?.characterGrowth) s += 15;
  if (metrics?.foreshadowRate) s += 10;
  if (intent.obstacles?.length >= 2) s += 10;
  return clamp(s);
}

function scoreRetention(text, reader) {
  const last = text.split('\n').slice(-5).join(' ');
  let s = reader?.readingDrive ?? 60;
  if (/[？?！!…]/.test(last)) s += 12;
  if (/门|电话|短信|脚步|监视/.test(last)) s += 8;
  return clamp(s);
}

function buildPlannerHints(scores, issues, metrics) {
  const hints = [];
  if (scores.commercialRhythm < 65) hints.push({ type: 'actionSceneWeight', delta: 0.1, reason: '节奏偏慢' });
  if (scores.payoff < 60) hints.push({ type: 'conflictPriority', delta: 0.15, reason: '高潮不足' });
  if (metrics?.conflictDensity < 2) hints.push({ type: 'conflictPriority', delta: 0.1, reason: '冲突密度低' });
  if (scores.patternRepeat < 55) hints.push({ type: 'styleStrictness', delta: 0.1, reason: '套路重复' });
  return hints;
}

function clamp(n) {
  return Math.max(0, Math.min(100, Math.round(n)));
}
