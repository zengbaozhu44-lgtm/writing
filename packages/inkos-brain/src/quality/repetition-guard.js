/**
 * L2 场景内复读护栏 — 拦「同一 Scene 内整句/整段逐字复读」。
 * 不做 validation 词表；只做逐字重复计数（薄、可单测）。
 *
 * 挂点：Writer 产出 scene.text 之后、拼接/Metrics 之前。
 * 行为：hit → 附加禁复述指令重写该 Scene（限次）；超次软记录放行
 * （INKOS_REPETITION_STRICT=1 时按场景失败处理，由调用方决定）。
 */

/**
 * 场景内复读检测
 * @param {string} text 场景正文
 * @param {{ minLen?: number, maxTimes?: number }} [options]
 * @returns {{ hit: boolean, examples: string[], score: number }}
 */
export function detectIntraSceneRepetition(text, options = {}) {
  const minLen = options.minLen ?? 12;   // 最短句长（滤掉「他点了点头」「先这样吧」）
  const maxTimes = options.maxTimes ?? 3; // ≥3 次算 hit

  const norm = (s) => String(s).replace(/\s+/g, '').trim();
  const sentences = String(text || '')
    .split(/[。！？!?\n]+/)
    .map((s) => s.trim())
    .filter((s) => norm(s).length >= minLen);

  const counts = new Map();
  for (const s of sentences) {
    const k = norm(s);
    counts.set(k, (counts.get(k) || 0) + 1);
  }

  const examples = [];
  let score = 0;
  for (const [k, n] of counts) {
    if (n >= maxTimes) {
      examples.push(`${k.slice(0, 40)}… ×${n}`);
      score += n;
    }
  }

  // 长片段（≥40 字）两两相同也算（防整段粘贴；句读拆不开的长段）
  const long = sentences.filter((s) => norm(s).length >= 40);
  const longSeen = new Set();
  for (let i = 0; i < long.length; i++) {
    const ki = norm(long[i]);
    if (longSeen.has(ki)) continue;
    for (let j = i + 1; j < long.length; j++) {
      if (ki === norm(long[j])) {
        examples.push(`长段重复: ${ki.slice(0, 40)}…`);
        score += 2;
        longSeen.add(ki);
        break;
      }
    }
  }

  return {
    hit: examples.length > 0,
    examples: examples.slice(0, 5),
    score,
  };
}

/**
 * 重写时的 Prompt 附加指令：明确列出禁复述句。
 */
export function formatNoRepeatAddendum(examples = []) {
  const list = (examples || []).slice(0, 5).map((e) => `- ${e}`).join('\n');
  return [
    '### 复读护栏（本场景上一稿出现逐字重复，重写时必须消除）',
    '禁止重复以下句子/段落（可换角度、换措辞推进同一情节，或替换为新的行动）：',
    list,
  ].join('\n');
}
