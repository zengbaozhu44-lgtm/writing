/**
 * Decision Engine — 角色行动前六维校验 + 分级内容审核
 */
import { checkSceneContentPolicy } from './content-policy.js';
import { suggestSafeObstacle } from '../planner/conflict-suggester.js';

const CHECKS = ['content', 'interest', 'resources', 'knowledge', 'relationship', 'risk'];

export function evaluateDecisions(ctx, intent) {
  const { pov, characters, knowledge, relationships, resources } = ctx;
  const char = characters[pov];
  const results = [];
  const chapterWarnings = [];

  for (const scene of intent.scenes) {
    const decision = {
      sceneId: scene.id,
      actor: pov,
      action: scene.goal,
      checks: {},
      pass: true,
      failures: [],
      warnings: [],
    };

    decision.checks.content = checkValues(scene, intent);
    decision.checks.interest = checkInterest(char, intent);
    decision.checks.resources = checkResources(pov, resources, scene);
    decision.checks.knowledge = checkKnowledge(pov, knowledge, scene, ctx);
    decision.checks.relationship = checkRelationship(pov, relationships, scene, intent.present);
    decision.checks.risk = checkRisk(intent, scene);

    for (const [key, r] of Object.entries(decision.checks)) {
      if (r.warnings?.length) {
        decision.warnings.push(...r.warnings);
        chapterWarnings.push(...r.warnings.map((w) => ({ sceneId: scene.id, ...w })));
      }
      if (!r.pass) {
        decision.pass = false;
        decision.failures.push({
          dimension: key,
          reason: r.reason,
          level: r.level || null,
          matched: r.matched || null,
          suggestObstacle: r.suggestObstacle || suggestSafeObstacle(key),
        });
      }
    }
    results.push(decision);
  }

  const allPass = results.every((d) => d.pass);
  return {
    pass: allPass,
    decisions: results,
    checks: CHECKS,
    warnings: chapterWarnings.length ? chapterWarnings : undefined,
  };
}

/**
 * values/content：分级审核（剧情词放行 · 政治敏感硬拦 · 血腥软提示）
 * 不再用角色「底线」字段做剧情词汇拦截。
 */
export function checkValues(scene = {}, intent = {}) {
  const result = checkSceneContentPolicy(scene, intent);
  if (!result.pass) {
    return {
      pass: false,
      level: result.level || 'HARD_BLOCK',
      reason: result.reason,
      matched: result.matched,
      suggestObstacle: result.suggestObstacle || suggestSafeObstacle('content'),
      warnings: result.warnings,
    };
  }
  return {
    pass: true,
    level: result.level || 'PASS',
    warnings: result.warnings,
  };
}

function checkInterest(char, intent) {
  const real = char?.realGoal || char?.publicGoal || '';
  if (!real) return { pass: true };
  const aligned = intent.mainGoal.includes(real.slice(0, 4)) || real.length < 4;
  if (!aligned && !intent.mainGoal) {
    return {
      pass: false,
      reason: '行动与角色长期目标脱节',
      suggestObstacle: suggestSafeObstacle('interest'),
    };
  }
  return { pass: true };
}

function checkResources(pov, resources, scene) {
  const byChar = resources.by_character?.[pov] || {};
  const depleted = Object.entries(byChar).some(([k, v]) => typeof v === 'number' && v <= 0 && /cash|钱|资金|体力/.test(k));
  if (depleted && /购买|交易|贿赂/.test(scene.goal + scene.conflict)) {
    return {
      pass: false,
      reason: '资源不足无法完成计划行动',
      suggestObstacle: suggestSafeObstacle('resources'),
    };
  }
  return { pass: true };
}

function checkKnowledge(pov, knowledge, scene, ctx) {
  const matrix = knowledge.matrix || [];
  const text = `${scene.goal} ${scene.conflict}`;
  for (const row of matrix) {
    const level = row[pov];
    if (level === 'unknown' && row.info && text.includes(row.info.slice(0, 4))) {
      return {
        pass: false,
        reason: `POV 不应知晓：${row.info}`,
        suggestObstacle: suggestSafeObstacle('knowledge'),
      };
    }
  }
  const recentFacts = ctx.facts.slice(-5).map((f) => f.fact);
  if (recentFacts.some((f) => f.includes('不知道') && text.includes(f.replace(/不知道|未知/g, '').slice(0, 6)))) {
    return {
      pass: false,
      reason: '行动依赖尚未获知的信息',
      suggestObstacle: suggestSafeObstacle('knowledge'),
    };
  }
  return { pass: true };
}

function checkRelationship(pov, relationships, scene, present) {
  for (const other of present || []) {
    if (other === pov) continue;
    const edge = relationships.find((e) => (e.from === pov && e.to === other) || (e.from === other && e.to === pov));
    if (edge && edge.hostility >= 4 && /合作|信任|请求/.test(scene.goal)) {
      return {
        pass: false,
        reason: `与 ${other} 敌意过高（${edge.hostility}）`,
        suggestObstacle: suggestSafeObstacle('relationship'),
      };
    }
  }
  return { pass: true };
}

function checkRisk(intent, scene) {
  if (scene.beat === 'turn' && !intent.mustLose) {
    return {
      pass: false,
      reason: '转折场景缺少明确代价',
      suggestObstacle: suggestSafeObstacle('risk'),
    };
  }
  return { pass: true };
}
