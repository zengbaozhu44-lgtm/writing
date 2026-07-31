/**
 * Book Wizard — 一键创建小说
 */
import path from 'node:path';
import fs from 'node:fs';
import { ROOT } from '../../inkos-core/src/lib/paths.js';
import { initBookV4 } from '../../inkos-core/src/workflows/init.js';
import { generateWizardContent } from './ai-service.js';
import { writeModule } from './module-service.js';
import { getBookPaths } from '../../inkos-core/src/lib/book.js';
import { writeText } from '../../inkos-core/src/lib/paths.js';
import { writeStoryDna, ensureLivingNovelDirs } from './system-store.js';
import { initWorldStateIfNeeded } from './living-novel-engine.js';
import { saveWizardChapterTones } from './chapter-audit.js';
import { saveStyleSample } from './writer-optimization/sample-driven-writer.js';
import { bindVolumeFingerprint, computeUpstreamFingerprint, saveConflictCalibration } from './volume-plan.js';

const DEFAULT_BOOK_ROOT = path.join(ROOT, 'books', '我的小说', 'books');

export function slugify(title) {
  return String(title)
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[^\w\u4e00-\u9fff_-]/g, '')
    .slice(0, 40) || `book_${Date.now()}`;
}

export async function createBookFromWizard({
  title, pitch, preset, bookId: customId, content, storyDna, chapterTones, volumeChapterCount, styleSample, styleGenePack,
  storyMap, primaryPov, secondaryPov, openingHook, coreMystery, conflictCalibration,
}) {
  const bookId = customId || slugify(title);
  const targetDir = path.join(DEFAULT_BOOK_ROOT, bookId);
  if (fs.existsSync(targetDir)) {
    throw new Error(`书籍已存在: ${bookId}`);
  }

  initBookV4({ bookId, title, genre: preset || '都市异能', targetDir });

  if (storyDna) {
    writeStoryDna(targetDir, { ...storyDna, title: storyDna.title || title, pitch });
  }
  ensureLivingNovelDirs(targetDir);
  initWorldStateIfNeeded(targetDir);

  const generated = content || await generateWizardContent({ title, pitch, preset: preset || '都市异能' });

  if (generated.world?.markdown) writeModule(targetDir, 'world', { content: generated.world.markdown });
  if (generated.writing?.markdown) writeModule(targetDir, 'writing', { content: generated.writing.markdown });
  if (generated.chapterTask?.markdown) writeModule(targetDir, 'chapter-task', { content: generated.chapterTask.markdown });

  for (const c of generated.characters?.characters || []) {
    const name = c.fields?.name || '主角';
    writeModule(targetDir, 'characters', { content: c.markdown }, `${name}.md`);
  }

  for (const f of generated.factions?.factions || []) {
    writeModule(targetDir, 'factions', { content: f.markdown }, `${f.name}.md`);
  }

  // 冲突校准持久化（建书时写入；可在大纲/首页轻量编辑，或直接改 YAML）
  const chars = generated.characters?.characters || [];
  const protagonist = chars.find((c) => /主角|protagonist/i.test(c.fields?.role || '')) || chars[0];
  saveConflictCalibration(targetDir, conflictCalibration || {
    core_conflict: storyDna?.main_conflict || openingHook || '',
    stakes: protagonist?.fields?.goal || coreMystery || storyDna?.main_question || '',
    escalation_phases: (chapterTones || []).map((t) => ({
      chapter: t.chapterIndex,
      tone: t.tone,
      event: t.coreEvent,
      ending: t.endingDirection,
    })),
  });

  if (generated.volume?.markdown) {
    const bp = getBookPaths(targetDir);
    writeText(path.join(bp.modules.volume_outline, 'vol_01.md'), generated.volume.markdown);
    // 必须用落盘后的 Canon 指纹，避免 wizard 内存 hash 与磁盘 hash 形状不一致 → 建书即 stale
    bindVolumeFingerprint(targetDir, 1, {
      fingerprint: computeUpstreamFingerprint(targetDir),
      editedBy: 'wizard',
    });
  }

  if (generated.chapterTask?.markdown) {
    writeModule(targetDir, 'chapter-task', { content: generated.chapterTask.markdown });
  }

  if (chapterTones?.length) {
    saveWizardChapterTones(targetDir, chapterTones);
  }

  const sample = styleSample
    || content?.writing?.fields?.styleSample
    || content?.writing?.fields?.goldenSample
    || '';
  if (sample) saveStyleSample(targetDir, sample);

  const genePack = styleGenePack
    || content?.writing?.fields?.styleGenePack
    || '';
  if (genePack) {
    const { saveBookStyleGene } = await import('./style-genebank/index.js');
    saveBookStyleGene(targetDir, genePack, { sceneType: 'opening' });
    if (sample && sample.length >= 80) saveStyleSample(targetDir, sample);
  }

  // 故事地图：优先用户传入；否则从向导字段脚手架
  try {
    const { saveStoryMap, scaffoldStoryMap } = await import('./story-map/store.js');
    if (storyMap?.story_arc || storyMap?.mainArc) {
      saveStoryMap(targetDir, storyMap);
    } else {
      const chars = generated.characters?.characters || [];
      const names = chars.map((c) => c.fields?.name).filter(Boolean);
      const draft = scaffoldStoryMap({
        title,
        totalChapters: volumeChapterCount || 30,
        primaryPov: primaryPov || names[0] || '主角',
        secondaryPov: secondaryPov || names[1] || '',
        openingHook: openingHook || storyDna?.core_hook || pitch?.slice(0, 40) || '',
        coreMystery: coreMystery || storyDna?.core_mystery || '',
        chapterTones: chapterTones || [],
      });
      saveStoryMap(targetDir, draft);
    }
  } catch (err) {
    console.warn('[wizard] story-map scaffold failed:', err?.message || err);
  }

  // 初始化审计：第 1 章可生成
  const { setChapterStatus } = await import('./chapter-audit.js');
  setChapterStatus(targetDir, 1, 'ready_to_generate', { volumeChapterCount: volumeChapterCount || 30 });

  return { bookId, title, targetDir, preset, generated: true };
}
