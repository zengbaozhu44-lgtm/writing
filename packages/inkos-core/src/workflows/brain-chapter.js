import { applyPostChapter } from './post-chapter.js';
import { partitionOperatorRawDelta } from '../lib/tr01-operator-delta.js';
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
    // EO-TR-01: same raw-delta applicator as inkos post — 11/13 stripped; 12/15 not in this EO.
    const { operationalDelta, skippedRealityLike } = partitionOperatorRawDelta(options.delta);
    postResult = {
      ...applyPostChapter(bookDir, chapter, operationalDelta),
      d1Tr01: { eo: 'EO-TR-01', skippedRealityLike, producesObtains: false },
    };
    reviewResult = runChapterReview(bookDir, chapter, options.delta.review || pipeline.reader?.personas?.[0]?.scores || {});
  }

  return { pipeline, postResult, reviewResult };
}

export { isBrainEnabled };
