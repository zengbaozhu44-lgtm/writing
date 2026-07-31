const GOAL_MARKERS = /目标|想要|必须|需要|打算|决定|要|得|求|赶|找|完成|达成|建立|展现/u;
const OBSTACLE_MARKERS = /但是|然而|却|尽管|虽然|阻碍|阻止|无法|不能|困难|问题|障碍|卡住|失败|拒绝|无效/u;
const ESCALATION_MARKERS = /更|越来越|再度|加剧|升级|恶化|紧迫|来不及|最后|只能|被迫|加倍|再度/u;
const COST_MARKERS = /代价|失去|牺牲|付出|损失|受伤|标记|信用|扣分|暴露|泄露|永久|后果|代价是/u;

function levelHit(text, scene, markers, sceneField) {
  const corpus = `${text} ${scene?.[sceneField] || ''}`;
  return markers.test(corpus);
}

export function analyzeConflictChain(text, scene = {}, intent = {}) {
  const corpus = `${text} ${scene.goal || ''} ${scene.conflict || ''} ${intent.mainGoal || ''}`;
  const levels = {
    goal: levelHit(text, scene, GOAL_MARKERS, 'goal') || Boolean(scene.goal || intent.mainGoal),
    obstacle: levelHit(text, scene, OBSTACLE_MARKERS, 'conflict') || Boolean(scene.conflict || intent.obstacles?.[0]),
    escalation: ESCALATION_MARKERS.test(corpus),
    cost: COST_MARKERS.test(corpus) || /mustLose|代价/.test(JSON.stringify(intent)),
  };

  const failures = [];
  const labels = { goal: '目标', obstacle: '阻碍', escalation: '升级', cost: '代价' };
  for (const [key, ok] of Object.entries(levels)) {
    if (!ok) failures.push(`Conflict：缺少「${labels[key]}」层级`);
  }

  const present = Object.values(levels).filter(Boolean).length;
  const score = Math.round((present / 4) * 100);

  return {
    id: 'conflict',
    pass: failures.length === 0,
    failures,
    score,
    metrics: { levels, present },
  };
}
