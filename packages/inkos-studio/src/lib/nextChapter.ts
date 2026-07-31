/** 填补从 1 起第一个无正文空洞；当前章为空时优先重写当前章 */
export function resolveNextWritableChapter(
  chapters: { number: number; hasText?: boolean }[],
  viewingChapter = 1,
  viewingHasText = false,
): number {
  const withText = new Set(
    chapters.filter((c) => c.hasText).map((c) => c.number),
  );
  if (!viewingHasText && viewingChapter >= 1 && !withText.has(viewingChapter)) {
    return viewingChapter;
  }
  let n = 1;
  while (withText.has(n)) n += 1;
  return n;
}
