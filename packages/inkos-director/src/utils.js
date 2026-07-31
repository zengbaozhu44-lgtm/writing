export const CHECKPOINT_CHARS = 500;

export function charCount(text) {
  return String(text || '').replace(/\s/g, '').length;
}

export function hasDialogue(text) {
  if (/[「""『].+?[」""』]/s.test(text)) return true;
  return /[\u4e00-\u9fa5]{2,4}(?:说|问|道|喊|叫|低声|沉声|开口)[：:]/u.test(text);
}

export function hasAction(text) {
  return /[走跑推拉拿转看听敲按握选拒躲冲站坐蹲抬低抬头转身打开关闭]/u.test(text);
}

export function hasEvent(text) {
  return hasDialogue(text) || hasAction(text)
    || /突然|忽然|猛地|一声|发现|出现|传来|响起|打断|必须|不得不|冲突|对抗/u.test(text);
}

export function hasConflictMarker(text) {
  return /但是|然而|却|尽管|虽然|不得不|必须|威胁|冲突|对抗|阻止|失败|代价|升级|加剧|更|只能|被迫/u.test(text);
}

export function hasEscalation(text) {
  return /更|越来越|再度|加剧|升级|恶化|紧迫|来不及|最后|只能|被迫|加倍|危险|加剧/u.test(text);
}

export function isEnvironmentSentence(sentence) {
  if (hasDialogue(sentence) || hasAction(sentence) || hasConflictMarker(sentence)) return false;
  return /风|雨|光|色|空气|味道|建筑|天空|阳光|夜色|街道|房间|墙|窗|树|云|雾|静静|缓缓|慢慢|景象|环境/u.test(sentence);
}

export function isLoreSentence(sentence) {
  if (hasDialogue(sentence)) return false;
  return /设定|世界观|系统|规则|意味着|因此|所以|协议|算法|机制|背景|历史上|本质上|换句话说|所谓/u.test(sentence);
}

export function isExpositionSentence(sentence) {
  if (hasDialogue(sentence) || hasAction(sentence) || hasEvent(sentence)) return false;
  return true;
}

export function splitSentences(text) {
  return String(text || '')
    .split(/(?<=[。！？!?…])\s*|\n+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function longestRun(sentences, predicate) {
  let best = 0;
  let cur = 0;
  for (const s of sentences) {
    if (predicate(s)) {
      cur += charCount(s);
      best = Math.max(best, cur);
    } else {
      cur = 0;
    }
  }
  return best;
}

/** 按 500 字（去空白）切分检测窗口，保留原文切片 */
export function splitCheckpoints(text, size = CHECKPOINT_CHARS) {
  const src = String(text || '');
  const windows = [];
  let charSeen = 0;
  let winStart = 0;

  for (let i = 0; i < src.length; i++) {
    if (/\s/.test(src[i])) continue;
    charSeen += 1;
    if (charSeen >= size) {
      windows.push({
        index: windows.length,
        text: src.slice(winStart, i + 1),
        charCount: charCount(src.slice(winStart, i + 1)),
      });
      winStart = i + 1;
      charSeen = 0;
    }
  }

  if (winStart < src.length) {
    const tail = src.slice(winStart);
    if (charCount(tail) > 0) {
      windows.push({ index: windows.length, text: tail, charCount: charCount(tail) });
    }
  }

  if (!windows.length && charCount(src) > 0) {
    windows.push({ index: 0, text: src, charCount: charCount(src) });
  }

  return windows;
}
