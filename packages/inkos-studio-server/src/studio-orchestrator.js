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
import { runNonBlockingScenePipeline } from './non-blocking-scene-pipeline.js';
import { resolveChapterSuspenseTitle, sanitizeChapterFilename } from './writer-optimization/chapter-title.js';
import { readStoryDna } from './system-store.js';

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

    for (const scene of scenes) {
      if (scene.status === 'done' && scene.text?.trim()) {
        sceneResults.push({ pass: true, scene });
        continue;
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

      const provided = options.scenes?.find((s) => s.id === scene.id || s.index === scene.index);
      if (provided?.text) scene.text = provided.text;

      if (!scene.text?.trim() && options.chapterText) {
        const parts = splitChapterToScenes(options.chapterText, scenes.length);
        scene.text = parts[scene.index - 1] || '';
      }

      if (!scene.text?.trim() && activeWriter) {
        scene.text = await activeWriter({
          bookDir: this.bookDir,
          chapter,
          scene,
          prompt: scene.prompt,
          ctx,
          intent,
        });
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

    const chapterText = options.chapterText || assembleChapter(scenes);
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
        force: options.force ?? true,
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
}
