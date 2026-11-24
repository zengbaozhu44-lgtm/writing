/**
 * Studio Runtime Orchestrator — 非阻塞 Scene Pipeline 包装层
 * 不修改 inkos-runtime 核心；替换 Scene 内 Decision/Consistency 重试循环
 */
import path from 'node:path';
import fs from 'node:fs';
import { writeText } from '../../inkos-core/src/lib/paths.js';
import { loadBrainContext, brainSystemDir } from '../../inkos-brain/src/loader.js';
import { buildSceneWritePrompt, assembleChapter } from '../../inkos-brain/src/scene/scene.js';
import { buildDynamicPrompt } from '../../inkos-brain/src/prompt/dynamic-prompt.js';
import { persistScenes } from '../../inkos-runtime/src/pipeline/scene-pipeline.js';
import { runChapterPipeline } from '../../inkos-runtime/src/pipeline/chapter-pipeline.js';
import { RuntimeOrchestrator } from '../../inkos-runtime/src/pipeline/orchestrator.js';
import { ensureChapterCausalChain } from '../../inkos-brain/src/causal/causal-reasoner.js';
import { runNonBlockingScenePipeline } from './non-blocking-scene-pipeline.js';
import { resolveChapterSuspenseTitle, sanitizeChapterFilename } from './writer-optimization/chapter-title.js';
import { readStoryDna } from './system-store.js';
import { getBookExecutionGuard } from './execution-guard-store.js';
import { ensurePlanValidity } from '../../inkos-prompt/src/plan-validity.js';
import { attachActionIntentTruthFromCADE } from '../../inkos-brain/src/causality/index.js';

/** 场景硬失败（防复读/身体禁令）最多整体重规划次数，超过即整章失败 */
const MAX_SCENE_HARD_FAIL_REPLAN = Number(process.env.INKOS_MAX_SCENE_HARD_FAIL_REPLAN || 2);

/**
 * T4 硬失败重规划自修正：把失败原因翻译成重写 prompt 的【修正指令】。
 * 硬失败消息形如（beat-execution.js 的 hardFailReason）：
 *   「Scene 3 硬失败：跨 Scene 复读未通过：与上文相似度 50%（「脑袋，胡须沾着灰。他…」）；幕内开场复读未通过：开场句原样复读 9 字「裂开，汁水溅到指缝…」」
 *   「…：CONSISTENCY: 左臂已损毁…」
 * 重写时把修正指令附加到失败场景的 prompt（经 basePrompt → beat prompt 逐拍生效），
 * 让模型第一版就避开雷，而不是同一份 prompt 原样硬碰第二次。
 */
/**
 * EO-FIX-RETRY-01：从硬失败错误消息中提取被判定为复读的短语（「…」内的段）。
 * 只提取硬门 findOpeningPhraseRecycle/findRepeatedSegment 已判定的段，
 * 不做任何自行检测或推断。
 */
export function extractRepeatPhrases(errorMessage = '') {
  const msg = String(errorMessage || '');
  if (!/复读|重复|相似/u.test(msg)) return [];
  return [...msg.matchAll(/「([^」]{2,24})」/gu)]
    .map((m) => m[1].trim())
    .filter(Boolean);
}

export function buildHardFailCorrection(hardErr) {
  const msg = String(hardErr?.message || '');
  const anchor = String(hardErr?.hardFailAnchor || '').trim().replace(/\s+/g, ' ');
  const parts = [];
  if (/复读|重复|重演|开场|相似|高度相似/u.test(msg)) {
    const quotes = [...msg.matchAll(/「([^」]{2,24})」/gu)].map((m) => m[1]).filter(Boolean);
    const block = quotes.length
      ? `已判定这些句段与本章前文/本场开场重复：${quotes.map((q) => `「${q}」`).join('、')}`
      : '本场开头已有复读句段';
    parts.push(`【修正指令：复读】${block}——本次重写禁止原样或近义复写上述句段，禁止回到场景开头重开。`);
    // 机械硬闸：把 Validator 的硬失败判据（开场 ≥7 字原样复读即拒稿）前置成下一轮生成约束，
    // 并从错误里点名续写锚句——否则修正只报「禁止复读」而无具体续写起点，模型仍会去复读更早句子。
    // 历史根因：ch1/ch2 幕内开场复读 4 次重规划（3 次/章）全败，靠点名短语打地鼠追不上换句重开。
    parts.push(`【禁止复读硬闸】本拍/本场任何一句的开头与上文已写正文（含本场景前几拍）出现 ≥6 字连续重叠（原样或近义改写）即判复读，必被拒稿；重开时开场句必须是全新内容。${anchor ? `上一拍结尾停在：「${anchor.slice(0, 60)}」。从这里之后续写，不得回到任何更早的句子重开。` : '必须从上一拍结尾的最后一句话之后续写，不得回到任何更早的句子重开。'}`);
  }
  if (/CONSISTENCY|左臂|右臂|焦毁|已损毁|身体/u.test(msg)) {
    parts.push('【修正指令：身体禁令】受限肢体（如左臂焦毁/右臂损毁）已在本章确立——本拍禁止写其主动作与大动作（抬手/提物/按压等），转向心理活动、环境细节、对白推进，或由未受损一侧完成轻动作。');
  }
  return parts.join('\n');
}

function writeScenePromptFile(bookDir, chapter, scene) {
  const dir = path.join(brainSystemDir(bookDir), 'prompts');
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `ch_${String(chapter).padStart(4, '0')}_${scene.id}.md`);
  writeText(file, scene.prompt);
  return file;
}

function saveChapterFile(bookDir, chapter, text, intent) {
  const dir = path.join(bookDir, 'chapters');
  fs.mkdirSync(dir, { recursive: true });
  const storyDna = readStoryDna(bookDir) || {};
  const title = resolveChapterSuspenseTitle(intent, chapter, storyDna);
  const slug = sanitizeChapterFilename(title);
  const file = path.join(dir, `${String(chapter).padStart(4, '0')}_${slug}.md`);
  const body = text.trim().startsWith('#')
    ? text
    : `# ${title}\n\n${text}`;
  writeText(file, body);
  return file;
}

/** Pipeline 通过后兜底落盘：scenes 有正文但 chapters/*.md 缺失时补写 */
export function ensureChapterMarkdownSaved(bookDir, chapter, {
  chapterText = '',
  intent = null,
  scenes = null,
} = {}) {
  const pad = String(chapter).padStart(4, '0');
  const chaptersDir = path.join(bookDir, 'chapters');
  if (fs.existsSync(chaptersDir)) {
    const existing = fs.readdirSync(chaptersDir).find((f) => f.startsWith(`${pad}_`) && f.endsWith('.md'));
    if (existing) {
      const abs = path.join(chaptersDir, existing);
      if (fs.readFileSync(abs, 'utf8').trim()) return abs;
    }
  }

  let text = String(chapterText || '').trim();
  if (!text && Array.isArray(scenes)) {
    text = scenes.filter((s) => s?.text?.trim()).map((s) => s.text.trim()).join('\n\n');
  }
  if (!text) {
    try {
      text = assembleChapter(scenes || []) || '';
    } catch { /* ignore */ }
  }
  if (!text.trim()) return null;
  return saveChapterFile(bookDir, chapter, text, intent || {});
}

function splitChapterToScenes(text, count) {
  const paras = text.split(/\n\n+/).filter(Boolean);
  if (!paras.length) return Array(count).fill(text);
  if (paras.length >= count) {
    const per = Math.ceil(paras.length / count);
    const parts = [];
    for (let i = 0; i < count; i++) {
      parts.push(paras.slice(i * per, (i + 1) * per).join('\n\n') || paras[paras.length - 1] || text);
    }
    return parts;
  }
  const parts = [...paras];
  while (parts.length < count) parts.push(paras[paras.length - 1]);
  return parts.slice(0, count);
}

export class StudioRuntimeOrchestrator extends RuntimeOrchestrator {
  async _runScenesAndChapter(chapter, intent, scenes, options = {}) {
    // EO-FIX-RETRY-01：硬失败重试时把已判定复读短语注入 intent.forbiddenOpenings
    // 使 formatSceneOpeningConstraintBlock（beat-execution:92-95）在重试的所有
    // scene/beat 中看到禁令（而非仅 _hardFailCorrection 覆盖的单个 scene prompt）。
    // 保留 intent 既有禁令（不覆盖不清空）；仅当前章当前任务有效（随 options 传递，
    // 不持久化到锚/磁盘/跨章）。
    if (Array.isArray(options._hardFailForbiddenPhrases) && options._hardFailForbiddenPhrases.length) {
      const existing = Array.isArray(intent.forbiddenOpenings) ? intent.forbiddenOpenings : [];
      const merged = [...new Set([...existing, ...options._hardFailForbiddenPhrases])];
      intent = { ...intent, forbiddenOpenings: merged };
      // 同步到 scene 级（beat 首拍 formatSceneOpeningConstraintBlock 优先读 scene.forbiddenOpenings）
      for (const scene of scenes) {
        if (!scene.status || scene.status !== 'done') {
          scene.forbiddenOpenings = merged.slice(0, 4);
        }
      }
    }

    // D3.2：与 Runtime 共用 ensureChapterCausalChain（每章最多一次；不自行 derive 第二份因果）。
    ensureChapterCausalChain(this.bookDir, intent, { chapter });

    const pipeline = options.pipeline || {
      version: 'runtime-2.0-studio',
      bookDir: this.bookDir,
      chapter,
      startedAt: new Date().toISOString(),
      stages: [],
      pass: false,
    };
    const ctx = options.ctx || loadBrainContext(this.bookDir, { chapter, pov: intent?.pov });
    const sceneResults = [];
    const useChapterText = Boolean(options.chapterText?.trim());
    const activeWriter = useChapterText ? null : this.writer;

    // 硬失败重规划重入：把已完成场景带原稿标为 done，循环跳过不重写，只重写失败场景及其后。
    // 若不跳过，重规划重建 scenes 后场景1会被重新写，撞上 guard 单调闸「Scene 状态回退被拒绝：1 < N」。
    if (Array.isArray(options._keptScenes) && options._keptScenes.length) {
      for (const scene of scenes) {
        const kept = options._keptScenes.find((k) => k.index === scene.index);
        if (kept?.text) {
          scene.text = kept.text;
          scene.status = 'done';
        }
      }
    }

    for (const scene of scenes) {
      if (scene.status === 'done' && scene.text?.trim()) {
        sceneResults.push({ pass: true, scene });
        continue;
      }

      // D3.2：挂载同一条章级 causal_chain（禁止 Studio 另推一份）
      scene.causalChain = scene.causalChain || intent.causalChain || null;

      // Phase 1.R2：挂载 intent → compileScenePrompt 用本轮正文，而非未 persist 的磁盘旧稿
      ctx.intent = intent;
      ctx.chapterIntent = intent;

      // F8.3: Actual-aware Plan Validity — before Director locks stale Goal/situation
      // Session/prompt projection only; ≠ Canon / Reality / SR; Repair ≠ Regenerate
      ensurePlanValidity(scene, intent);

      // EO-P4-Causal-Bridge-01: CADE → Action Intent Truth (beside SR; Writer consume-only)
      try {
        attachActionIntentTruthFromCADE(this.bookDir, chapter, scene);
      } catch (cadeErr) {
        console.warn('[studio] Action Intent bridge skipped:', cadeErr?.message || cadeErr);
      }

      const dynamicPrompt = buildDynamicPrompt(ctx, scene);
      scene.prompt = buildSceneWritePrompt(ctx, intent, scene, dynamicPrompt);
      scene.dynamic = dynamicPrompt;

      const planHook = await this._invokeSceneLifecycleHook('plan', {
        chapter,
        scene,
        intent,
        ctx,
      });
      if (planHook?.promptAppend) {
        scene.prompt = [scene.prompt, planHook.promptAppend].join('\n\n');
      }
      if (planHook?.scene?.directorBrief) {
        scene.directorBrief = planHook.scene.directorBrief;
      }
      if (planHook?.scene?.executionPlan) {
        scene.executionPlan = planHook.scene.executionPlan;
        scene.sceneOutcome = planHook.scene.sceneOutcome;
        scene.scenePlan = planHook.scene.scenePlan;
      }
      if (planHook?.directors?.chapter) {
        scene._chapterDirector = planHook.directors.chapter;
        intent._chapterDirector = planHook.directors.chapter;
        intent.hookLadder = planHook.directors.chapter.hookLadder;
      }

      // F8.3: re-evaluate after Director may refresh goal text (still ≠ regenerate)
      ensurePlanValidity(scene, intent);

      // T4 硬失败重规划重入：把【修正指令】附加到失败场景的 prompt（经 basePrompt → beat prompt 生效）。
      // 放在 planHook 之后，确保修正指令是 prompt 最后一段强指令，不被后续改写覆盖。
      // 同时挂到 scene._hardFailCorrection：beat-slimmer 直接从 scene 取显式注入（不依赖 slimLoreForBeat
      // 的按键切片，否则修正指令会被滤掉到不了 beat prompt）。
      if (options._hardFailCorrection && scene.index === options._hardFailScene) {
        scene.prompt = [scene.prompt, options._hardFailCorrection].join('\n\n');
        scene._hardFailCorrection = options._hardFailCorrection;
      }

      const provided = options.scenes?.find((s) => s.id === scene.id || s.index === scene.index);
      if (provided?.text) scene.text = provided.text;

      if (!scene.text?.trim() && options.chapterText) {
        const parts = splitChapterToScenes(options.chapterText, scenes.length);
        scene.text = parts[scene.index - 1] || '';
      }

      if (!scene.text?.trim() && activeWriter) {
        try {
          scene.text = await activeWriter({
            bookDir: this.bookDir,
            chapter,
            scene,
            prompt: scene.prompt,
            ctx,
            intent,
          });
        } catch (writerErr) {
          // A) 防复读/身体禁令硬失败：拒绝坏稿 → 触发章内场景重规划（有上限），
          //    不再让 needsHumanReview 转义舱把复读正文带进 chapters/*.md。
          if (writerErr?.code === 'SCENE_HARD_FAIL') {
            const hardCount = Number(options._hardFailCount || 0) + 1;
            // 镜像进 execCtx（chapter 执行上下文），与章节/场景重规划预算同源可观测
            if (options._execCtx) options._execCtx.sceneHardFailCount = hardCount;
            if (hardCount <= MAX_SCENE_HARD_FAIL_REPLAN) {
              // 不 emit sceneRejected：那是 guard failEvent，会 abortTask 毒化整个 task，
              // 导致本次重规划在 Writer 入口就被 isTaskAborted 拦下。用 pipelineStage 作
              // 可观测通知（不触发 guard abort），让重规划真正重跑 Writer。
              await this.bus.emit('pipelineStage', {
                bookDir: this.bookDir,
                chapter,
                scene: scene.index,
                stage: 'writer-beat',
                status: 'retry',
                detail: `Scene ${scene.index} 硬失败（防复读/身体禁令）→ 重规划 ${hardCount}/${MAX_SCENE_HARD_FAIL_REPLAN}：${writerErr.message}`,
              });
              // 保留已完成场景正文跨重规划带下去：重规划会重进 _runChapter 重建 scenes
              //（status 全空），若不留住，场景1会被重新写 → 撞上 guard 的 scene 单调闸
              //「Scene 状态回退被拒绝：1 < N」而整章失败。带下去后循环按 status==='done' 跳过。
              const keptScenes = scenes
                .filter((s) => s.status === 'done' && s.text?.trim())
                .map((s) => ({ index: s.index, text: s.text }));
              return this._runChapter({
                ...options,
                chapter,
                _replanFromScene: true,
                pov: intent.pov,
                _hardFailCount: hardCount,
                _keptScenes: keptScenes,
                _hardFailScene: scene.index,
                _hardFailCorrection: buildHardFailCorrection(writerErr),
                // EO-FIX-RETRY-01：把硬门判定为复读的短语传递给重试 intent.forbiddenOpenings
                _hardFailForbiddenPhrases: [
                  ...(Array.isArray(options._hardFailForbiddenPhrases) ? options._hardFailForbiddenPhrases : []),
                  ...extractRepeatPhrases(writerErr?.message || ''),
                ],
              });
            }
            return {
              ...pipeline,
              pass: false,
              awaiting: null,
              error: `场景硬失败重规划 ${hardCount} 次仍无法通过：${writerErr.message}`,
              hardFail: true,
              chapter,
            };
          }
          throw writerErr;
        }
      }

      // 场景正文已产出 → 回写 intent.scenes，供下一 Scene 的续写引擎读取（continuation-engine / collectPriorScenesText）
      if (scene.text?.trim()) {
        const target = (intent.scenes || []).find((s) => s.index === scene.index)
          || (intent.scenes || [])[scene.index - 1];
        if (target) {
          target.text = scene.text;
          // Phase 1: mirror Actual / OC so N+1 Beat prompt can collect without re-walk Writer object
          if (scene.observedContinuity) target.observedContinuity = scene.observedContinuity;
          if (scene.actualEvents) target.actualEvents = scene.actualEvents;
          if (scene.characterSRState) target.characterSRState = scene.characterSRState;
        }
      }

      const sceneResult = await runNonBlockingScenePipeline(this.bookDir, {
        chapter,
        scene,
        intent,
        ctx,
        bus: this.bus,
      });

      sceneResults.push(sceneResult);

      if (!sceneResult.pass) {
        if (sceneResult.awaiting === 'writer') {
          persistScenes(this.bookDir, chapter, scenes);
          pipeline.awaiting = 'writer';
          pipeline.scenePrompts = scenes.map((s) => ({
            id: s.id,
            index: s.index,
            chars: s.prompt?.length,
            promptPath: writeScenePromptFile(this.bookDir, chapter, s),
          }));
          pipeline.scenes = scenes;
          pipeline.message = sceneResult.message || 'Scene prompts 已生成，Writer 填入后 Daemon 自动继续';
          return pipeline;
        }

        await this.bus.emit('sceneRejected', { bookDir: this.bookDir, chapter, scene, sceneResult });
        const budget = this._consumeSceneReplanBudget(chapter, scene, sceneResult, options);
        if (!budget.allow) {
          pipeline.pass = false;
          pipeline.awaiting = null;
          pipeline.error = `场景重规划 ${budget.execCtx.sceneReplanCount} 次仍无法通过：${sceneResult.error || sceneResult.message || ''}`;
          return pipeline;
        }
        // 通用场景拒绝重规划：重入会重建全部 scenes（无 _keptScenes），必须先把 ExecutionGuard
        // 的单调序号清零，否则 Scene 1 重写撞「Scene 状态回退被拒绝：1 < N」整章失败。
        this._resetGuardForReplan(chapter, 'scene_replan');
        return this._runChapter({ ...options, chapter, _replanFromScene: true, pov: intent.pov });
      }

      const reviewedHook = await this._invokeSceneLifecycleHook('reviewed', {
        chapter,
        scene,
        intent,
        ctx,
        sceneResult,
      });

      // Analysis Only：绝不因 Review / Story Thread 触发章内 Replan
      if (reviewedHook?.storyThread?.shouldReplan || reviewedHook?.shouldReplan) {
        await this.bus.emit('storyThreadReplan', {
          bookDir: this.bookDir,
          chapter,
          scene,
          reason: reviewedHook.replanReason || reviewedHook.storyThread?.replanReason,
          storyThread: reviewedHook.storyThread,
          blocking: false,
          analysisOnly: true,
          note: 'Adaptive Hint only — no chapter replan',
        });
      }

      Object.assign(scene, sceneResult.scene);

      await this._invokeSceneLifecycleHook('memorized', {
        chapter,
        scene,
        intent,
        ctx,
        sceneResult,
      });
    }

    persistScenes(this.bookDir, chapter, scenes);
    pipeline.stages.push({ stage: 'scenes', count: scenes.length, passed: sceneResults.filter((r) => r.pass).length });

    // 防碎片：干净 scenes 组装优先，外部注入 chapterText（可能含重开草稿堆叠）仅兜底
    const assembledText = assembleChapter(scenes);
    const chapterText = assembledText.trim() ? assembledText : (options.chapterText || '');
    if (!chapterText.trim()) {
      pipeline.awaiting = 'writer';
      pipeline.scenes = scenes;
      return pipeline;
    }

    const chapterResult = await runChapterPipeline(
      this.bookDir,
      {
        chapter,
        chapterText,
        intent,
        scenes,
        conflictResult: options.conflictResult,
        ctx,
        force: options.force ?? false,
        // Studio Living：生成后待审计，不自动 MemoryUnit.commit / planNext
        deferCommit: options.deferCommit !== false,
      },
      this.bus,
    );

    pipeline.stages.push({ stage: 'chapter_pipeline', pass: chapterResult.pass });
    Object.assign(pipeline, chapterResult);
    pipeline.pass = chapterResult.pass;
    pipeline.finishedAt = new Date().toISOString();

    if (chapterResult.pass && options.saveChapter !== false) {
      pipeline.chapterFile = chapterResult.chapterFile
        || chapterResult.memoryCommit?.chapterFile
        || saveChapterFile(this.bookDir, chapter, chapterText, intent);
    }

    if (chapterResult.pass && this.config.runtime?.autoNextChapter && !options.noAutoNext) {
      pipeline.autoNext = { chapter: chapter + 1, ready: true };
    }

    return pipeline;
  }

  /** 章节重规划前复位 ExecutionGuard 场景单调闸：只清 sceneProgress + 场景锁，不动 task 中止态。 */
  _resetGuardForReplan(chapter, reason) {
    try {
      const ok = getBookExecutionGuard(this.bookDir).resetSceneProgressForReplan(chapter, reason);
      return ok ? null : { error: `ExecutionGuard 重置失败（chapter=${chapter}）` };
    } catch (err) {
      return { error: err?.message || String(err) };
    }
  }
}
