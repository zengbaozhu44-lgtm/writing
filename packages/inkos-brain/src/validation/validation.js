/**
 * Validation — 七项推进校验
 */
export function validateChapter(chapterText, intent, metrics, readerResult) {
  const text = chapterText || '';
  const checks = {
    plot_advanced: checkPlot(intent, text),
    relationship_advanced: checkRelationship(intent, text),
    world_advanced: checkWorld(intent, text, metrics),
    character_advanced: checkCharacter(intent, text, metrics),
    situation_changed: checkSituation(intent, text),
    new_goal: checkNewGoal(intent, text),
    new_problem: checkNewProblem(intent, text),
  };

  const passed = Object.values(checks).filter(Boolean).length;
  const pass = passed === 7;

  return {
    pass,
    passed,
    total: 7,
    checks,
    failures: Object.entries(checks).filter(([, v]) => !v).map(([k]) => k),
    message: pass ? '七项推进全部成立' : `未通过（${7 - passed}/7 失败）— 需重新规划`,
  };
}

function checkPlot(intent, text) {
  return Boolean(intent.mainGoal && (text.length > 100 || intent.scenes?.length));
}

function checkRelationship(intent, text) {
  return intent.present.length > 1 || intent.bargain || /对话|说|问|答/.test(text);
}

function checkWorld(intent, text, metrics) {
  return metrics?.worldProgress > 0 || intent.mustGain || /发现|新|异常|规则/.test(text);
}

function checkCharacter(intent, text, metrics) {
  return metrics?.characterGrowth > 0 || intent.mustLose || /代价|失去|选择/.test(text);
}

function checkSituation(intent, text) {
  return intent.ending || intent.turningPoint || /但是|却|然而/.test(text);
}

function checkNewGoal(intent, text) {
  return intent.ending?.includes('目标') || /下一步|必须|需要|前往/.test(text + intent.ending);
}

function checkNewProblem(intent, text) {
  return intent.newForeshadow || intent.obstacles.length > 0 || /威胁|危险|未知|监视/.test(text);
}
