import { applyPostChapter } from './post-chapter.js';
import { runChapterReview } from './chapter-review.js';
import { runBrainPipeline } from '../../../inkos-brain/src/runtime/brain-runtime.js';
import { isBrainEnabled } from '../../../inkos-brain/src/loader.js';

/**
 * Brain 章后：先跑 Brain 校验链，再执行 V4 post workflow
 */
export function runBrainChapter(bookDir, options = {}) {
  const chapter = options.chapter;
  const pipeline = runBrainPipeline(bookDir, {
    chapter,
    pov: options.pov,
    present: options.present,
    scenes: options.scenes,
    chapterText: options.chapterText,
    force: options.force,
  });

  let postResult = null;
  let reviewResult = null;

  if (pipeline.pass && options.delta) {
    postResult = applyPostChapter(bookDir, chapter, options.delta);
    reviewResult = runChapterReview(bookDir, chapter, options.delta.review || pipeline.reader?.personas?.[0]?.scores || {});
  }

  return { pipeline, postResult, reviewResult };
}

export { isBrainEnabled };
