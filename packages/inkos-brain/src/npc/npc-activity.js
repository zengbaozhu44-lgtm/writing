/**
 * WL-03: NPC Runtime Integration — authored NPC activity collector
 *
 * Story 边界（宪法级）：
 * - 15_npc_simulation.yaml 是 NPC 场外动向的 authored 载体；只有真实填写条目是 Truth。
 * - runNpcSimulation() 的模板条目（today_goal 以「（填写」开头）是脚手架，不是 Truth，
 *   严禁进入生产上下文（防伪造）。
 * - roster 门控：不在 character_bible 名单中的名字不得注入（防注入不存在的角色）。
 * - 本模块只做「收集 + 过滤」，不生成、不推断、不补全任何 NPC 目标或行为。
 * - NPC 动向 ≠ POV 经验：消费侧（prompt 块）带显式 Access 边界；T2/SR/Actual
 *   提取只读 scene.text，结构性隔离。
 */
import fs from 'node:fs';
import { readYaml } from '../../../inkos-core/src/lib/yaml-store.js';

const TEMPLATE_MARKER_RE = /^（填写/;

/**
 * @param {string} npcSimPath 15_npc_simulation.yaml 路径（bp.modules.npc_simulation）
 * @param {{ roster?: string[] }} [opts]
 * @returns {{ day: number|string|null, entries: Array<{name,day,today_goal,plan_location,may_meet,plan_changed,world_impact}> } | null}
 */
export function collectAuthoredNpcActivity(npcSimPath, opts = {}) {
  if (!npcSimPath || !fs.existsSync(npcSimPath)) return null;
  const sim = readYaml(npcSimPath);
  const all = Array.isArray(sim?.npcs) ? sim.npcs : [];
  const rosterSet = new Set((opts.roster || []).map((s) => String(s).replace(/\.md$/, '')));

  const entries = [];
  for (const e of all) {
    const name = String(e?.name || '').trim();
    if (!name) continue;
    if (rosterSet.size && !rosterSet.has(name)) continue;
    const goal = String(e?.today_goal || '').trim();
    if (!goal || TEMPLATE_MARKER_RE.test(goal)) continue;
    entries.push({
      name,
      day: e?.day ?? null,
      today_goal: goal,
      plan_location: String(e?.plan_location || '').trim(),
      may_meet: Array.isArray(e?.may_meet) ? e.may_meet.map(String).filter(Boolean) : [],
      plan_changed: e?.plan_changed === true,
      world_impact: String(e?.world_impact || '').trim(),
    });
  }

  if (!entries.length) return null;
  return {
    day: sim?.meta?.last_simulated_day ?? entries[0]?.day ?? null,
    entries,
  };
}
