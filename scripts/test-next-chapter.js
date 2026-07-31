/**
 * resolveNextWritableChapter — 填补空洞，不被样本章 10/25/50 带跑
 */
import {
  resolveNextWritableChapter,
  listChapters,
} from '../packages/inkos-studio-server/src/chapter-service.js';

function resolveUi(chapters, viewingChapter = 1, viewingHasText = false) {
  const withText = new Set(chapters.filter((c) => c.hasText).map((c) => c.number));
  if (!viewingHasText && viewingChapter >= 1 && !withText.has(viewingChapter)) {
    return viewingChapter;
  }
  let n = 1;
  while (withText.has(n)) n += 1;
  return n;
}

import path from 'node:path';
import { fileURLToPath } from 'node:url';

const bookDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '../books/我的小说/books/时间重置者');
const next = resolveNextWritableChapter(bookDir);
const { chapters } = listChapters(bookDir);

if (next !== 2) {
  console.error('FAIL: expected next=2 for sample book with ch1+10+…, got', next, chapters.map((c) => c.number));
  process.exit(1);
}

const uiNext = resolveUi(
  [
    { number: 1, hasText: true },
    { number: 10, hasText: true },
    { number: 25, hasText: true },
  ],
  2,
  false,
);
if (uiNext !== 2) {
  console.error('FAIL: empty ch2 should rewrite 2, got', uiNext);
  process.exit(1);
}

const uiJump = resolveUi(
  [{ number: 1, hasText: true }, { number: 10, hasText: true }],
  1,
  true,
);
if (uiJump !== 2) {
  console.error('FAIL: after ch1 should be 2 not 11', uiJump);
  process.exit(1);
}

console.log('OK next-chapter · next=', next, 'ui=', uiNext, uiJump);
