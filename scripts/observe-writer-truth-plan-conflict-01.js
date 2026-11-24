#!/usr/bin/env node
/**
 * OBSERVATION ONLY — Truth vs conflicting Plan in Writer Context
 *
 * 不修改任何 Story Truth ontology / 生产代码。
 * 复用生产组装链：compileScenePrompt + createLlmWriter（含 optimize + 续写锁）。
 *
 * Case A: Actual(苏晚走出房间) + 冲突 Plan(苏晚在房间内翻找抽屉)
 * Case B: Actual only（中性 goal）
 * Case C: 冲突 Plan only（无上一场 Actual）
 *
 * O3/O4 为 prompt 级确定性校验；O1/O2/O5 为真实 LLM 输出观测（N 次）。
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { compileScenePrompt } from '../packages/inkos-prompt/src/compiler.js';
import { createLlmWriter, isLlmConfigured } from '../packages/inkos-brain/src/writer/llm-writer.js';
import { ensureActualEvents } from '../packages/inkos-brain/src/events/event-extractor.js';

const N = Number(process.env.OBS_N || 5);
const CASES = process.env.OBS_CASES ? process.env.OBS_CASES.split(',') : ['A', 'B', 'C'];

/**
 * Provider 解析：默认走全局 config；OBS_PROVIDER=deepseek 时用本地
 * .inkos/secrets.json 的 stashed key（同一生产 chatCompletion 路径；
 * 全局 solar-pro 401 时的备用观察通道，报告中如实记录模型替换）。
 */
async function resolveWriterOptions() {
  if (!process.env.OBS_PROVIDER) return { options: {}, modelLabel: 'config-default (solar-pro4)' };
  const fsMod = await import('node:fs');
  const secrets = JSON.parse(fsMod.readFileSync('/Users/zora/Desktop/ai/InkOS/books/我的小说/.inkos/secrets.json', 'utf8'));
  const key = secrets.services?.[process.env.OBS_PROVIDER]?.apiKey;
  if (!key) throw new Error(`OBS_PROVIDER=${process.env.OBS_PROVIDER} 无可用 key`);
  const providers = {
    deepseek: { baseUrl: 'https://api.deepseek.com', model: 'deepseek-chat' },
    moonshot: { baseUrl: 'https://api.moonshot.cn/v1', model: 'moonshot-v1-8k' },
  };
  const p = providers[process.env.OBS_PROVIDER];
  return { options: { ...p, apiKey: key }, modelLabel: `${process.env.OBS_PROVIDER}/${p.model}` };
}

const PREV_TEXT = '苏晚推开房门，头也不回地走出房间。';
const CONFLICT_GOAL = '苏晚仍然在房间内翻找抽屉，寻找那封失踪的信。';
const NEUTRAL_GOAL = '苏晚在楼下的人行道上停下来，回想刚才房间里的对话。';

function buildFixture(caseId, bookDir) {
  const prevScene = {
    id: 'ch1_s1',
    index: 1,
    text: PREV_TEXT,
  };
  ensureActualEvents(prevScene, { stripPlan: true });

  const withPrev = caseId !== 'C';
  const goal = caseId === 'B' ? NEUTRAL_GOAL : CONFLICT_GOAL;

  const intent = {
    pov: '苏晚',
    mainGoal: caseId === 'B' ? '苏晚在夜色中消化刚才的对话' : '找回失踪的信',
    scenes: withPrev ? [prevScene] : [],
  };
  const ctx = {
    bookDir,
    chapter: 1,
    pov: '苏晚',
    present: ['苏晚'],
    facts: [],
    intent,
  };
  const scene2 = {
    id: 'ch1_s2',
    index: 2,
    goal,
    conflict: caseId === 'B' ? '夜风与回忆的拉扯' : '抽屉锁死，时间紧迫',
    beat: 'complication',
    wordTarget: 300,
  };
  return { ctx, intent, scene: scene2, prevScene: withPrev ? prevScene : null };
}

/**
 * 透明的关键词规则分类（R1–R4 仅观测分类，非评分）；全文落盘供人工复核。
 * 人工复核发现初版正则误判（"走廊"出现在室内描写中）→ 收紧：
 *  - R4s = 静默空间重置：执行抽屉动作且在室内，且无任何折返/回房叙述
 *  - R4b = 折返桥接：执行抽屉动作，但 prose 显式叙述了"折回/退回/回到房间"（承认 Actual 的离开）
 *  - R3 = 混合：抽屉动作 + 室外标记并存（位置矛盾）
 *  - R1 = 室外延续，无抽屉动作；R2 = 双无
 */
function classify(text) {
  const t = String(text || '');
  const drawerAction = /(翻找|翻遍|翻着|翻检|搜|拽|拉|打开|拉开|抠|撬)[^。！？\n]{0,15}抽屉|抽屉[^。！？\n]{0,25}(翻找|翻遍|拉开|打开|搜|拽|卡)/.test(t);
  const returnBridge = /(折回|退回|回到房间|回到屋|又回|回到那间|跌进房间|走回书桌|重新回到|again)/.test(t);
  const outsideMarker = /(人行道|楼下|街上|夜风|寒风|出了楼|离开这栋|走远)/.test(t);
  const inRoom = /(屋里|房间|室内|床头柜|书桌|门在(她|他)身后|门外走廊|房门)/.test(t);
  if (drawerAction && returnBridge) return 'R4b';
  if (drawerAction && inRoom && !returnBridge) return 'R4s';
  if (drawerAction && outsideMarker) return 'R3';
  if (drawerAction) return 'R4s';
  if (outsideMarker) return 'R1';
  return 'R2';
}

function promptChecks(caseId, prompt) {
  const hasActual = prompt.includes('Previous Scene Occurrence Events')
    && prompt.includes('推开房门')
    && prompt.includes('走出房间');
  const hasConflictPlan = prompt.includes(CONFLICT_GOAL.slice(0, 12))
    || prompt.includes('苏晚仍然在房间内翻找抽屉');
  const hasContinuationLock = prompt.includes('上一 Scene 结尾') || prompt.includes('紧接上一 Scene');
  const checks = { O3_actualPresent: hasActual, O4_conflictPlanPresent: hasConflictPlan, continuationLock: hasContinuationLock };
  if (caseId === 'A') {
    checks.expect = 'Actual=YES Plan=YES';
    checks.pass = hasActual && hasConflictPlan;
  } else if (caseId === 'B') {
    checks.expect = 'Actual=YES Plan=NO(conflict)';
    checks.pass = hasActual && !hasConflictPlan;
  } else {
    checks.expect = 'Actual=NO Plan=YES';
    checks.pass = !hasActual && hasConflictPlan;
  }
  return checks;
}

async function main() {
  const logDir = path.join(process.cwd(), 'tmp-observer');
  fs.mkdirSync(logDir, { recursive: true });
  const { options: writerOptions, modelLabel } = await resolveWriterOptions();
  const report = { n: N, cases: {}, llm: isLlmConfigured(), model: modelLabel };
  console.log(`model: ${modelLabel}`);

  if (!isLlmConfigured() && !writerOptions.apiKey) {
    console.log('LLM not configured — Writer behavior NOT OBSERVABLE (只做 prompt 级校验)');
  }

  for (const caseId of CASES) {
    const bookDir = fs.mkdtempSync(path.join(os.tmpdir(), `inkos-obs-${caseId}-`));
    const { ctx, intent, scene } = buildFixture(caseId, bookDir);
    const compiled = compileScenePrompt(ctx, scene);
    const prompt = String(compiled?.text || '');
    const checks = promptChecks(caseId, prompt);
    fs.writeFileSync(path.join(logDir, `case${caseId}-prompt.txt`), prompt);

    const samples = [];
    if (isLlmConfigured() || writerOptions.apiKey) {
      const writer = createLlmWriter(writerOptions);
      for (let i = 0; i < N; i += 1) {
        try {
          const out = await writer({ scene, prompt, chapter: 1, bookDir: null, ctx, intent });
          samples.push({ run: i + 1, text: out, cls: classify(out) });
          console.log(`[case${caseId} run${i + 1}] ${classify(out)} · ${String(out).replace(/\s+/g, ' ').slice(0, 80)}…`);
        } catch (err) {
          samples.push({ run: i + 1, error: String(err?.message || err) });
          console.log(`[case${caseId} run${i + 1}] ERROR: ${err?.message || err}`);
        }
      }
    }
    const dist = { R1: 0, R2: 0, R3: 0, R4s: 0, R4b: 0, ERR: 0 };
    for (const s of samples) {
      if (s.error) dist.ERR += 1; else dist[s.cls] += 1;
    }
    report.cases[caseId] = { checks, dist, samples };
    fs.writeFileSync(path.join(logDir, `case${caseId}-samples.json`), JSON.stringify(samples, null, 2));
    console.log(`\n== Case ${caseId} ==`);
    console.log('prompt checks:', JSON.stringify(checks));
    console.log('distribution:', JSON.stringify(dist), `N=${samples.length}`);
  }

  fs.writeFileSync(path.join(logDir, 'report.json'), JSON.stringify(report, null, 2));
  console.log(`\nreport → ${path.join(logDir, 'report.json')}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
