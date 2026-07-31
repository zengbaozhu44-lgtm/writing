/**
 * 简易文本 Diff — 供 Studio Draft / Polished 对比
 */
export function buildLineDiff(before = '', after = '') {
  const aLines = String(before).split('\n');
  const bLines = String(after).split('\n');
  const max = Math.max(aLines.length, bLines.length);
  const lines = [];

  for (let i = 0; i < max; i += 1) {
    const a = aLines[i] ?? '';
    const b = bLines[i] ?? '';
    if (a === b) {
      lines.push({ type: 'same', before: a, after: b, index: i });
    } else if (!a) {
      lines.push({ type: 'add', before: '', after: b, index: i });
    } else if (!b) {
      lines.push({ type: 'remove', before: a, after: '', index: i });
    } else {
      lines.push({ type: 'change', before: a, after: b, index: i });
    }
  }

  const changed = lines.filter((l) => l.type !== 'same').length;
  return { lines, changed, same: lines.length - changed };
}

export function summarizeDiff(before = '', after = '') {
  const { prefix, tailStart } = (() => {
    const b = String(before);
    const a = String(after);
    let i = 0;
    while (i < b.length && i < a.length && b[i] === a[i]) i += 1;
    return { prefix: b.slice(0, i), tailStart: i };
  })();

  return {
    prefixUnchanged: tailStart,
    draftChars: String(before).replace(/\s/g, '').length,
    polishedChars: String(after).replace(/\s/g, '').length,
    changed: before !== after,
  };
}
