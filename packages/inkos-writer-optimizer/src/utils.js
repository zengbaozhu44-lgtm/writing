/** @param {string} text */
export function charCount(text) {
  return String(text || '').replace(/\s/g, '').length;
}

/** @param {string} text */
export function stripWhitespace(text) {
  return String(text || '').replace(/\s/g, '');
}

export function hasDialogue(text) {
  return /[「""『].+?[」""』]/.test(text) || /[^\n]{1,40}[：:][^\n]{1,80}/.test(text);
}

export function hasAction(text) {
  return /[走跑推拉拿转看听敲按握选拒躲冲站坐蹲抬低抬头转身打开关闭]/u.test(text);
}

export function hasEvent(text) {
  return hasDialogue(text)
    || hasAction(text)
    || /突然|忽然|猛地|一声|发现|出现|传来|响起|打断|冲突|对抗|阻止|失败|代价|必须|不得不/.test(text);
}

export function hasConflictMarker(text) {
  return /但是|然而|却|尽管|虽然|不得不|必须|威胁|冲突|对抗|阻止|失败|代价|争|抢|逼|拒|怒|怕/.test(text);
}

const ENV_MARKERS = /风|雨|光|色|空气|味道|建筑|天空|阳光|夜色|街道|房间|墙|窗|树|云|雾|温度|湿度|气味|轮廓|景象|环境|周围|远处|近处|静静|缓缓|慢慢/u;

export function isEnvironmentSentence(sentence) {
  const t = stripWhitespace(sentence);
  if (!t.length) return false;
  if (hasDialogue(sentence) || hasAction(sentence) || hasConflictMarker(sentence)) return false;
  return ENV_MARKERS.test(sentence) || /^[他她它我你][的]?[眼神目光视线]/u.test(sentence);
}

const LORE_MARKERS = /设定|世界观|系统|规则|意味着|因此|所以|协议|算法|机制|背景|历史|意味着|本质上|换句话说|所谓|指的是/u;

export function isLoreSentence(sentence) {
  const t = stripWhitespace(sentence);
  if (!t.length) return false;
  if (hasDialogue(sentence)) return false;
  return LORE_MARKERS.test(sentence);
}

export function isExpositionSentence(sentence) {
  const t = stripWhitespace(sentence);
  if (!t.length) return false;
  if (hasDialogue(sentence) || hasAction(sentence) || hasEvent(sentence) || hasConflictMarker(sentence)) {
    return false;
  }
  return true;
}

/** Split Chinese prose into sentence-like chunks */
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
