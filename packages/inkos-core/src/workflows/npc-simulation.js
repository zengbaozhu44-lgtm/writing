import fs from 'node:fs';
import { readJson, writeJson } from '../lib/paths.js';
import { getBookPaths } from '../lib/book.js';
import { readYaml, writeYaml } from '../lib/yaml-store.js';

/**
 * Workflow: NPC Simulation — 非 POV 角色每日行动规划
 */
export function runNpcSimulation(bookDir, day, npcNames = []) {
  const bp = getBookPaths(bookDir);
  if (bp.version !== 4) throw new Error('仅支持 V4');

  const charDir = bp.modules.character_bible;
  const stateBoard = fs.existsSync(bp.modules.state_board)
    ? fs.readFileSync(bp.modules.state_board, 'utf8')
    : '';

  const names = npcNames.length
    ? npcNames
    : fs.readdirSync(charDir).filter((f) => f.endsWith('.md') && !f.startsWith('_')).map((f) => f.replace('.md', ''));

  const entries = names.map((name) => ({
    name,
    day,
    today_goal: `（填写：${name} 今日现实目标）`,
    plan_location: '',
    may_meet: [],
    plan_changed: false,
    world_impact: '',
    _hints: {
      state_board_excerpt: stateBoard.slice(0, 500),
      instruction: '即使主角不出场，NPC 也须推进自己的目标。完成后更新 07_state_board。',
    },
  }));

  const sim = readYaml(bp.modules.npc_simulation) || { meta: {}, npcs: [] };
  sim.meta.last_simulated_day = day;
  sim.npcs.push(...entries.map(({ _hints, ...e }) => e));
  writeYaml(bp.modules.npc_simulation, sim);

  const manifest = readJson(bp.manifest);
  manifest.lastNpcSimulationDay = day;
  writeJson(bp.manifest, manifest);

  return { day, planned: entries.length, path: bp.modules.npc_simulation, template: entries };
}
