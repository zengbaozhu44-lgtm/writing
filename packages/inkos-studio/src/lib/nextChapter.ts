/** 填补从 1 起第一个「可写」章节；当前章为空时优先重写当前章 */
export interface WritableChapterInput {
  number: number;
  hasText?: boolean;
  status?: string;
}

export function isLockedChapter(status?: string): boolean {
  return status === 'locked' || status === 'pending_audit';
}

/** 填补从 1 起第一个无正文空洞；当前章为空时优先重写当前章 */
export function resolveNextWritableChapter(
  chapters: WritableChapterInput[],
  viewingChapter = 1,
  viewingHasText = false,
): number {
  const withText = new Set(
    chapters.filter((c) => c.hasText).map((c) => c.number),
  );
  const statusByCh = new Map(chapters.map((c) => [c.number, c.status]));
  const maxCh = Math.max(1, ...chapters.map((c) => c.number));

  const canWrite = (n: number) => (
    !withText.has(n) && !isLockedChapter(statusByCh.get(n))
  );

  if (!viewingHasText && viewingChapter >= 1 && !withText.has(viewingChapter)) {
    // 当前章无正文：除非它被审计锁定（locked / pending_audit），否则重写它
    if (!isLockedChapter(statusByCh.get(viewingChapter))) return viewingChapter;
  }
  for (let n = 1; n <= maxCh; n += 1) {
    if (canWrite(n)) return n;
  }
  // 全部被占：优先提示「待审计」（接受后即解锁），其次最靠前的锁定章
  for (let n = 1; n <= maxCh; n += 1) {
    if (!withText.has(n) && statusByCh.get(n) === 'pending_audit') return n;
  }
  for (let n = 1; n <= maxCh; n += 1) {
    if (!withText.has(n) && statusByCh.get(n) === 'locked') return n;
  }
  return maxCh + 1;
}
