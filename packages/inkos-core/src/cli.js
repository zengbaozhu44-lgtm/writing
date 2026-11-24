#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, readJson, writeText } from './lib/paths.js';
import { detectBookVersion } from './lib/book.js';
import { initBookV4 } from './workflows/init.js';
import { buildWriteContext, formatContextMarkdown } from './workflows/before-write.js';
import { applyPostChapter, loadDelta, writeDeltaTemplate } from './workflows/post-chapter.js';
import { stampOperatorCliPost } from './lib/operator-proxy.js';
import { partitionOperatorRawDelta } from './lib/tr01-operator-delta.js';
import { runChapterReview, reviewFromDelta } from './workflows/chapter-review.js';
import { runNpcSimulation } from './workflows/npc-simulation.js';
import { runBrainChapter, isBrainEnabled } from './workflows/brain-chapter.js';
import { runBrainPipeline, getScenePrompt, loadBrainRun } from '../../inkos-brain/src/runtime/brain-runtime.js';
import {
  startDaemon,
  RuntimeDaemon,
  runFullPipeline,
  createRuntime,
  createExecutionGuard,
  formatDebugReport,
} from '../../inkos-runtime/src/index.js';
import {
  createSnapshot,
  rollback,
  createBranch,
  listSnapshots,
  diffSnapshots,
  computeCurrentHealth,
  isLlmConfigured,
} from '../../inkos-brain/src/index.js';
import { loadInkOsConfig } from './lib/config.js';

const HELP = `
InkOS Novel OS V4 + Brain + Runtime 2.0

用法:
  inkos init <book-id> "<书名>" [题材] [目标目录相对路径]
  inkos context <book-dir> [--pov 角色] [--scene N] [--out 文件.md]
  inkos delta <book-dir> <chapter>          生成章后 delta 模板
  inkos post <book-dir> <chapter> <delta.json>   Operator Executor write-after (≠ Authority Subject / Act)
  inkos review <book-dir> <chapter> [delta.json] Workflow 3: 章后评审
  inkos npc <book-dir> <day> [角色1,角色2]     NPC 模拟
  inkos version <book-dir>                  检测书籍 schema 版本

Brain (Novel OS Brain 1.0):
  inkos brain run <book-dir> [--chapter N] [--scenes scenes.json] [--text 正文.md] [--force] [--legacy]
  inkos brain plan <book-dir> [--chapter N] [--out plan.json]
  inkos brain scene <book-dir> <chapter> <sceneIndex> [--out prompt.md]
  inkos brain status <book-dir> <chapter>

Runtime 2.0 (Event Driven — 默认 brain run 已走此管线):
  inkos runtime run <book-dir> [--chapter N] [--scenes scenes.json] [--text 正文.md] [--force] [--resume]
  inkos runtime daemon <book-dir> [--chapter N]   监听文件变化，全自动 Pipeline 闭环
  inkos runtime resume <book-dir> <chapter>       从 Scene 断点继续
  inkos runtime status <book-dir>                 Daemon / 运行状态
  inkos runtime debug <book-dir>                  Execution Guard 调试（锁 / task / 最近事件）
  inkos runtime events <book-dir> [--since N]     事件日志
  inkos runtime health <book-dir>                 Story Health Dashboard

Git Memory:
  inkos memory snapshot <book-dir> [--chapter N] [--label 标签]
  inkos memory list <book-dir>
  inkos memory diff <book-dir> <fromId> <toId>
  inkos memory rollback <book-dir> <snapshotId>
  inkos memory branch <book-dir> <branchName> [fromSnapshotId]

诊断:
  inkos doctor <book-dir> [--chapter N] [--json] [--out file.json]
                              诊断 anchor/lore/prompt/repetition/tension/cost

Story Route V1 (Possibility layer — non-canon sidecar):
  inkos route generate <book-dir> [--chapter N] [--mock] [--json]

示例:
  inkos init 暗流 "暗流" "都市奇幻"
  inkos doctor books/我的小说/books/暗流 --chapter 2
  inkos brain run books/我的小说/books/暗流 --chapter 1
  inkos brain scene books/我的小说/books/暗流 1 2 --out /tmp/scene2.md
`;

function parseArgs(argv) {
  const args = [...argv];
  const flags = {};
  const positional = [];
  while (args.length) {
    const a = args.shift();
    if (a === '--pov') flags.pov = args.shift();
    else if (a === '--out') flags.out = args.shift();
    else if (a === '--chapter') flags.chapter = Number(args.shift());
    else if (a === '--scene') flags.sceneIndex = Number(args.shift());
    else if (a === '--scenes') flags.scenes = JSON.parse(fs.readFileSync(args.shift(), 'utf8'));
    else if (a === '--text') flags.chapterText = fs.readFileSync(args.shift(), 'utf8');
    else if (a === '--legacy') flags.legacy = true;
    else if (a === '--force') flags.force = true;
    else if (a === '--resume') flags.resume = true;
    else if (a === '--json') flags.json = true;
    else if (a === '--mock') flags.mock = true;
    else if (a === '--since') flags.since = Number(args.shift());
    else if (a === '--label') flags.label = args.shift();
    else if (a === '--present') flags.present = args.shift()?.split(',') ?? [];
    else positional.push(a);
  }
  return { positional, flags };
}

function resolveBookDir(p) {
  return path.isAbsolute(p) ? p : path.join(ROOT, p);
}

async function main() {
  const { positional, flags } = parseArgs(process.argv.slice(2));
  const cmd = positional[0];

  if (!cmd || cmd === '--help' || cmd === '-h') {
    console.log(HELP);
    return;
  }

  switch (cmd) {
    case 'init': {
      const bookId = positional[1];
      const title = positional[2];
      const genre = positional[3] ?? '未分类';
      const base = positional[4] ?? 'books/我的小说/books';
      if (!bookId || !title) throw new Error('用法: inkos init <book-id> "<书名>" [题材]');
      const targetDir = path.join(ROOT, base, bookId);
      const result = initBookV4({ bookId, title, genre, targetDir });
      console.log(JSON.stringify(result, null, 2));
      break;
    }

    case 'context': {
      const bookDir = resolveBookDir(positional[1]);
      const ctx = buildWriteContext(bookDir, {
        pov: flags.pov,
        present: flags.present ?? [],
        sceneIndex: flags.sceneIndex,
        chapter: flags.chapter,
      });
      const md = formatContextMarkdown(ctx);
      if (flags.out) {
        writeText(flags.out, md);
        console.log(`✓ 上下文已写入 ${flags.out} (${ctx.totalChars} chars, mode=${ctx.mode})`);
      } else {
        console.log(md);
      }
      console.error(`\n[meta] totalChars=${ctx.totalChars} mode=${ctx.mode} brain=${ctx.brainEnabled}`);
      break;
    }

    case 'delta': {
      const bookDir = resolveBookDir(positional[1]);
      const chapter = Number(positional[2]);
      const out = writeDeltaTemplate(bookDir, chapter);
      console.log(`✓ Delta 模板: ${out}`);
      break;
    }

    case 'post': {
      // EO-P3 W-10: CLI caller is Executor=Operator, never Authority Subject.
      // post alone ≠ Act; Author delegation is not assumed (recording NOT IMPLEMENTED).
      // EO-TR-01: Operator raw delta ↛ 11/13 (W-10 residue). Foreshadow/NPC left untouched.
      const bookDir = resolveBookDir(positional[1]);
      const chapter = Number(positional[2]);
      const deltaPath = path.isAbsolute(positional[3]) ? positional[3] : path.join(process.cwd(), positional[3]);
      const delta = loadDelta(deltaPath);
      const { operationalDelta, skippedRealityLike } = partitionOperatorRawDelta(delta);
      const result = stampOperatorCliPost({
        ...applyPostChapter(bookDir, chapter, operationalDelta),
        d1Tr01: {
          eo: 'EO-TR-01',
          skippedRealityLike,
          producesObtains: false,
          note: 'Operator raw delta ↛ 11/13; post still ≠ Authority Act',
        },
      });
      if (delta.review) reviewFromDelta(bookDir, chapter, delta);
      console.log(JSON.stringify(result, null, 2));
      break;
    }

    case 'review': {
      const bookDir = resolveBookDir(positional[1]);
      const chapter = Number(positional[2]);
      let scores = {};
      if (positional[3]) {
        const delta = loadDelta(path.isAbsolute(positional[3]) ? positional[3] : path.join(process.cwd(), positional[3]));
        scores = delta.review || delta;
      }
      const result = runChapterReview(bookDir, chapter, scores);
      console.log(JSON.stringify(result, null, 2));
      if (!result.pass) process.exitCode = 1;
      break;
    }

    case 'npc': {
      const bookDir = resolveBookDir(positional[1]);
      const day = Number(positional[2]);
      const names = positional[3] ? positional[3].split(',') : [];
      const result = runNpcSimulation(bookDir, day, names);
      console.log(JSON.stringify(result, null, 2));
      break;
    }

    case 'version': {
      const bookDir = resolveBookDir(positional[1]);
      const v = detectBookVersion(bookDir);
      const book = readJson(path.join(bookDir, 'book.json'));
      console.log(JSON.stringify({
        bookDir,
        schemaVersion: v,
        brainEnabled: isBrainEnabled(bookDir),
        bookBrainFlag: book.brainEnabled,
      }, null, 2));
      break;
    }

    case 'brain': {
      const sub = positional[1];
      const bookDir = resolveBookDir(positional[2]);
      if (!isBrainEnabled(bookDir) && sub !== 'status') {
        console.error('此书未启用 Brain（book.json brainEnabled=false 或非 V4）');
        process.exitCode = 1;
        break;
      }
      switch (sub) {
        case 'run': {
          const result = await runBrainPipeline(bookDir, {
            chapter: flags.chapter,
            pov: flags.pov,
            present: flags.present,
            scenes: flags.scenes,
            chapterText: flags.chapterText,
            force: flags.force,
            legacy: flags.legacy,
          });
          console.log(JSON.stringify(result, null, 2));
          if (!result.pass && !result.awaiting) process.exitCode = 1;
          break;
        }
        case 'plan': {
          const pipeline = await runBrainPipeline(bookDir, { chapter: flags.chapter, pov: flags.pov });
          const out = flags.out;
          if (out) writeText(out, JSON.stringify(pipeline, null, 2));
          else console.log(JSON.stringify(pipeline, null, 2));
          break;
        }
        case 'scene': {
          const chapter = Number(positional[3]);
          const sceneIndex = Number(positional[4]);
          const result = getScenePrompt(bookDir, chapter, sceneIndex, { pov: flags.pov });
          if (flags.out) {
            writeText(flags.out, result.prompt);
            console.log(`✓ Scene prompt → ${flags.out}`);
          } else console.log(result.prompt);
          break;
        }
        case 'status': {
          const chapter = Number(positional[3]);
          const run = loadBrainRun(bookDir, chapter);
          console.log(JSON.stringify(run || { message: '无 Brain run 记录' }, null, 2));
          break;
        }
        default:
          console.error(`未知 brain 子命令: ${sub}`);
          process.exitCode = 1;
      }
      break;
    }

    case 'runtime': {
      const sub = positional[1];
      const bookDir = resolveBookDir(positional[2]);
      if (!isBrainEnabled(bookDir)) {
        console.error('Runtime 需要 V4 + brainEnabled');
        process.exitCode = 1;
        break;
      }
      switch (sub) {
        case 'run': {
          const result = await runFullPipeline(bookDir, {
            chapter: flags.chapter,
            pov: flags.pov,
            present: flags.present,
            scenes: flags.scenes,
            chapterText: flags.chapterText,
            force: flags.force,
            resume: flags.resume,
          });
          console.log(JSON.stringify(result, null, 2));
          if (!result.pass && !result.awaiting) process.exitCode = 1;
          break;
        }
        case 'daemon': {
          const daemon = startDaemon(bookDir, {
            autoStartChapter: flags.chapter,
          });
          const cfg = loadInkOsConfig();
          console.log(JSON.stringify({
            status: 'running',
            bookDir,
            pid: process.pid,
            llmConfigured: isLlmConfigured(),
            autoNextChapter: cfg.runtime?.autoNextChapter !== false,
          }, null, 2));
          process.on('SIGINT', () => { daemon.stop(); process.exit(0); });
          await new Promise(() => {});
          break;
        }
        case 'resume': {
          const chapter = Number(positional[3]);
          const runtime = createRuntime(bookDir);
          const result = await runtime.resumeChapter(chapter, { force: flags.force });
          console.log(JSON.stringify(result, null, 2));
          if (!result.pass && !result.awaiting) process.exitCode = 1;
          break;
        }
        case 'status': {
          const daemon = new RuntimeDaemon(bookDir);
          console.log(JSON.stringify(daemon.getStatus(), null, 2));
          break;
        }
        case 'debug': {
          const guard = createExecutionGuard(bookDir);
          const report = guard.getDebugReport();
          console.log(formatDebugReport(report));
          break;
        }
        case 'events': {
          const daemon = new RuntimeDaemon(bookDir);
          console.log(JSON.stringify(daemon.getEventLog(flags.since ?? 0), null, 2));
          break;
        }
        case 'health': {
          try {
            const health = computeCurrentHealth(bookDir);
            console.log(JSON.stringify(health || { message: '尚无 Story Health 数据' }, null, 2));
          } catch {
            console.log(JSON.stringify({ message: '尚无 Story Health 数据（无运行产物）' }, null, 2));
          }
          break;
        }
        default:
          console.error(`未知 runtime 子命令: ${sub}`);
          process.exitCode = 1;
      }
      break;
    }

    case 'memory': {
      const sub = positional[1];
      const bookDir = resolveBookDir(positional[2]);
      switch (sub) {
        case 'snapshot': {
          const snap = createSnapshot(bookDir, {
            chapter: flags.chapter,
            label: flags.label || `manual ${new Date().toISOString()}`,
          });
          console.log(JSON.stringify(snap, null, 2));
          break;
        }
        case 'list': {
          console.log(JSON.stringify(listSnapshots(bookDir), null, 2));
          break;
        }
        case 'diff': {
          const diff = diffSnapshots(bookDir, positional[3], positional[4]);
          console.log(JSON.stringify(diff, null, 2));
          break;
        }
        case 'rollback': {
          const result = rollback(bookDir, positional[3]);
          console.log(JSON.stringify(result, null, 2));
          break;
        }
        case 'branch': {
          const result = createBranch(bookDir, positional[3], positional[4] || null);
          console.log(JSON.stringify(result, null, 2));
          break;
        }
        default:
          console.error(`未知 memory 子命令: ${sub}`);
          process.exitCode = 1;
      }
      break;
    }

    case 'route': {
      const sub = positional[1];
      if (sub === 'generate') {
        const bookDir = resolveBookDir(positional[2]);
        const { runStoryRouteGenerate } = await import('../../inkos-route/src/index.js');
        const result = await runStoryRouteGenerate(bookDir, {
          chapter: flags.chapter,
          pov: flags.pov,
          present: flags.present,
          mock: flags.mock || process.env.INKOS_ROUTE_MOCK === '1',
        });
        if (flags.json) {
          console.log(JSON.stringify(result, null, 2));
        } else {
          const sel = result.selection;
          console.log(`Story Route V1 · ch${result.chapter} · ${sel.selected_route_id}`);
          console.log(`  标题: ${sel.selected_route?.title}`);
          console.log(`  方向: ${sel.selected_route?.direction?.slice(0, 120)}…`);
          console.log(`  候选: ${result.generator.candidates.length} → 合法 ${result.filter.valid.length} → 选中 ${sel.selected_route_id}`);
          console.log(`  理由:`);
          for (const r of sel.reasons || []) console.log(`    - ${r}`);
          console.log(`  sidecar: ${result.paths.selected_route}`);
        }
      } else {
        console.error('用法: inkos route generate <book-dir> [--chapter N] [--mock] [--json]');
        process.exitCode = 1;
      }
      break;
    }

    case 'doctor': {
      const bookDir = resolveBookDir(positional[1]);
      const { runDoctor } = await import('../../inkos-runtime/src/pipeline/doctor.js');
      const report = runDoctor(bookDir, { chapter: flags.chapter || null });
      if (flags.json) {
        const text = JSON.stringify(report, null, 2);
        if (flags.out) {
          writeText(path.resolve(flags.out), text);
          console.log(`已写入 ${flags.out}`);
        } else {
          console.log(text);
        }
      } else {
        console.log(`InkOS Doctor · score=${report.score} · ${report.ok ? 'PASS' : 'NEEDS FIX'} · ch=${report.chapter}`);
        for (const c of report.checks) {
          console.log(`  ${c.pass ? '✓' : '✗'} [${c.id}] ${c.detail}`);
        }
        if (report.fixes.length) {
          console.log('\n修复建议:');
          for (const f of report.fixes) console.log(`  → ${f}`);
        }
        if (flags.out) {
          writeText(path.resolve(flags.out), JSON.stringify(report, null, 2));
          console.log(`\n完整报告已写入 ${flags.out}`);
        }
      }
      if (!report.ok) process.exitCode = 2;
      break;
    }

    default:
      console.error(`未知命令: ${cmd}`);
      console.log(HELP);
      process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err.message || err);
  process.exitCode = 1;
});
