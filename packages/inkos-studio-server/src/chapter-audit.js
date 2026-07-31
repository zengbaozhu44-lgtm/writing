/**
 * Chapter Audit Service — 待审计 / 接受 / 删草稿 / 优化
 */
import fs from 'node:fs';
import path from 'node:path';
import { exists, readJson, writeJson, readText, writeText } from '../../inkos-core/src/lib/paths.js';
import { MemoryUnit, purgeChapterDrafts } from '../../inkos-runtime/src/memory/memory-unit.js';
import { promptCacheDir } from '../../inkos-prompt/src/cache.js';
import { brainSystemDir } from '../../inkos-brain/src/loader.js';
import { getBookExecutionGuard } from './execution-guard-store.js';

function pad(n) {
  return String(n).padStart(4, '0');
}

export function chapterAuditPath(bookDir) {
  return path.join(bookDir, 'novel', '_system', 'chapter_audit.json');
}

export function wizardChapterTonesPath(bookDir) {
  return path.join(bookDir, 'novel', '_system', 'wizard_chapter_tones.json');
}

export function pendingCommitPath(bookDir, chapter) {
  return path.join(bookDir, 'novel', '_system', 'pending_commit', `ch_${pad(chapter)}.json`);
}

export function loadChapterAudit(bookDir) {
  const file = chapterAuditPath(bookDir);
  if (!exists(file)) {
    return { version: 'chapter-audit-1', chapters: {}, unlockedThrough: 1 };
  }
  try {
    return readJson(file);
  } catch {
    return { version: 'chapter-audit-1', chapters: {}, unlockedThrough: 1 };
  }
}

export function saveChapterAudit(bookDir, data) {
  const dir = path.dirname(chapterAuditPath(bookDir));
  fs.mkdirSync(dir, { recursive: true });
  writeJson(chapterAuditPath(bookDir), {
    ...data,
    updatedAt: new Date().toISOString(),
  });
}

export function getChapterStatus(bookDir, chapter) {
  const audit = loadChapterAudit(bookDir);
  const ch = Number(chapter);
  const entry = audit.chapters?.[ch] || audit.chapters?.[String(ch)];
  if (entry?.status) return entry.status;
  // 第 1 章默认可生成；其后需解锁
  if (ch === 1) return 'ready_to_generate';
  const unlocked = Number(audit.unlockedThrough || 1);
  if (ch > unlocked) return 'locked';
  return 'ready_to_generate';
}

export function listChapterAuditStatuses(bookDir, maxChapter = 10) {
  const audit = loadChapterAudit(bookDir);
  const unlocked = Number(audit.unlockedThrough || 1);
  const rows = [];
  for (let i = 1; i <= maxChapter; i += 1) {
    const entry = audit.chapters?.[i] || audit.chapters?.[String(i)];
    let status = entry?.status;
    if (!status) {
      status = i <= unlocked ? 'ready_to_generate' : 'locked';
    }
    rows.push({
      chapter: i,
      status,
      label: statusLabel(status),
      unlocked: i <= unlocked || status === 'accepted' || status === 'pending_audit' || status === 'ready_to_generate',
    });
  }
  return { unlockedThrough: unlocked, chapters: rows, audit };
}

export function statusLabel(status) {
  switch (status) {
    case 'pending_audit': return '待审计';
    case 'accepted': return '已接受';
    case 'deleted': return '已删除';
    case 'locked': return '待解锁';
    case 'ready_to_generate': return '可生成';
    case 'generating': return '生成中';
    default: return status || '未知';
  }
}

export function setChapterStatus(bookDir, chapter, status, extra = {}) {
  const audit = loadChapterAudit(bookDir);
  audit.chapters = audit.chapters || {};
  audit.chapters[chapter] = {
    ...(audit.chapters[chapter] || {}),
    status,
    ...extra,
    updatedAt: new Date().toISOString(),
  };
  if (status === 'accepted') {
    audit.unlockedThrough = Math.max(Number(audit.unlockedThrough || 1), Number(chapter) + 1);
  }
  if (status === 'deleted' || status === 'ready_to_generate') {
    // 不回退 unlockedThrough（已解锁的保持），但本章可重跑
  }
  saveChapterAudit(bookDir, audit);
  return audit.chapters[chapter];
}

export function assertChapterUnlocked(bookDir, chapter) {
  const status = getChapterStatus(bookDir, chapter);
  if (status === 'locked') {
    throw new Error(`第 ${chapter} 章尚未解锁：请先接受第 ${chapter - 1} 章审计`);
  }
  if (status === 'pending_audit') {
    throw new Error(`第 ${chapter} 章处于待审计：请先接受或删除后再操作`);
  }
  return status;
}

export function saveWizardChapterTones(bookDir, tones = []) {
  const file = wizardChapterTonesPath(bookDir);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const payload = {
    version: 'wizard-chapter-tones-1',
    tones: (tones || []).map((t) => ({
      chapterIndex: Number(t.chapterIndex),
      tone: String(t.tone || ''),
      coreEvent: String(t.coreEvent || ''),
      endingDirection: String(t.endingDirection || ''),
      wordTarget: Number(t.wordTarget) || 2500,
    })),
    savedAt: new Date().toISOString(),
  };
  writeJson(file, payload);
  return payload;
}

export function loadWizardChapterTones(bookDir) {
  const file = wizardChapterTonesPath(bookDir);
  if (!exists(file)) return null;
  try {
    return readJson(file);
  } catch {
    return null;
  }
}

export function loadWizardChapterTone(bookDir, chapterIdx) {
  const data = loadWizardChapterTones(bookDir);
  if (!data?.tones?.length) return null;
  const n = Number(chapterIdx);
  return data.tones.find((t) => Number(t.chapterIndex) === n) || null;
}

/** 生成完成后：标记待审计（正文已由 pipeline 写出时可直接用） */
export function markPendingAudit(bookDir, chapter, meta = {}) {
  return setChapterStatus(bookDir, chapter, 'pending_audit', meta);
}

/** Pipeline deferCommit：暂存 stateDiff，待 accept 再 MemoryUnit.commit */
export function savePendingCommit(bookDir, chapter, stateDiff = {}) {
  const file = pendingCommitPath(bookDir, chapter);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  writeJson(file, {
    ...stateDiff,
    deferredAt: new Date().toISOString(),
    skipGitCli: true,
  });
  markPendingAudit(bookDir, chapter, {
    deferredCommit: true,
    pendingFile: file,
  });
  return file;
}

/**
 * 接受本章 → 确保 MemoryUnit.commit（若有 pending）→ 解锁下一章
 */
export function acceptChapter(bookDir, chapter, { title } = {}) {
  const ch = Number(chapter);
  const pendingFile = pendingCommitPath(bookDir, ch);
  let memoryCommit = null;

  if (exists(pendingFile)) {
    const pending = readJson(pendingFile);
    memoryCommit = MemoryUnit.commit(bookDir, ch, {
      ...pending,
      force: true,
      skipGitCli: pending.skipGitCli !== false,
    });
    try { fs.unlinkSync(pendingFile); } catch { /* */ }
  } else {
    // 已有正文：补写/刷新 anchor（用现有正文再 commit）
    const text = loadChapterTextFile(bookDir, ch);
    if (!text?.trim()) {
      throw new Error(`第 ${ch} 章无正文，无法接受`);
    }
    memoryCommit = MemoryUnit.commit(bookDir, ch, {
      chapterText: text,
      chapterTitle: title || undefined,
      intent: { pov: '主角' },
      scenes: [],
      force: true,
      skipGitCli: true,
    });
  }

  setChapterStatus(bookDir, ch, 'accepted', {
    acceptedAt: new Date().toISOString(),
    anchorFile: memoryCommit?.anchorFile || null,
  });

  return {
    ok: true,
    chapter: ch,
    nextChapterUnlocked: true,
    nextChapter: ch + 1,
    memoryCommit,
  };
}

export function loadChapterTextFile(bookDir, chapter) {
  const chDir = path.join(bookDir, 'chapters');
  if (!exists(chDir)) return '';
  const padN = pad(chapter);
  const hit = fs.readdirSync(chDir).find((f) => f.startsWith(`${padN}_`) && f.endsWith('.md'));
  if (!hit) return '';
  return readText(path.join(chDir, hit));
}

/** 删除草稿并允许重跑 */
export function deleteChapterDraft(bookDir, chapter) {
  const ch = Number(chapter);
  const purged = purgeChapterDrafts(bookDir, ch);

  // prompt-cache
  try {
    const cacheDir = promptCacheDir(bookDir, ch);
    if (exists(cacheDir)) {
      fs.rmSync(cacheDir, { recursive: true, force: true });
      purged.purged.push(`prompt-cache/ch_${pad(ch)}`);
    }
  } catch { /* */ }

  // pending commit
  const pending = pendingCommitPath(bookDir, ch);
  if (exists(pending)) {
    fs.unlinkSync(pending);
    purged.purged.push(`pending_commit/ch_${pad(ch)}.json`);
  }

  // draft md 兼容
  const draft = path.join(bookDir, 'chapters', `${pad(ch)}_draft.md`);
  if (exists(draft)) {
    fs.unlinkSync(draft);
    purged.purged.push(`chapters/${pad(ch)}_draft.md`);
  }

  // Beat 连续性状态（重新生成须从空状态开始）
  try {
    const cont = path.join(
      bookDir,
      'novel',
      '_system',
      'studio',
      'writer-optimization',
      `ch_${pad(ch)}`,
      'continuity.json',
    );
    if (exists(cont)) {
      fs.unlinkSync(cont);
      purged.purged.push(`writer-optimization/ch_${pad(ch)}/continuity.json`);
    }
  } catch { /* */ }

  setChapterStatus(bookDir, ch, 'ready_to_generate', {
    deletedAt: new Date().toISOString(),
  });

  // 清 Runtime 锁 / 进度，避免「重新生成」撞上旧 Scene 进度与并行任务
  try {
    getBookExecutionGuard(bookDir).resetChapterForRerun(ch, '删除草稿并重新生成');
  } catch (err) {
    console.warn('[chapter-audit] resetChapterForRerun failed:', err?.message || err);
  }

  return { ok: true, chapter: ch, status: 'ready_to_generate', ...purged };
}

/**
 * 一键优化策略（轻量本地规则；有 LLM 时可扩展）
 */
export function optimizeChapter(bookDir, chapter, strategy = 'fix-repetition') {
  const ch = Number(chapter);
  const text = loadChapterTextFile(bookDir, ch);
  if (!text?.trim()) throw new Error(`第 ${ch} 章无正文`);

  let next = text;
  let note = '';

  switch (strategy) {
    case 'enhance-ending': {
      const hook = '\n\n他停住脚步。身后的声音没有消失——只是更近了。';
      if (!/更近了|下一秒|倒计时/.test(text.slice(-200))) {
        next = `${text.trimEnd()}${hook}`;
        note = '已在章末补强钩子压迫感';
      } else {
        note = '章末已有压迫感，仅微调节奏';
        next = text.replace(/\n{3,}/g, '\n\n');
      }
      break;
    }
    case 'fix-repetition': {
      next = collapseNearDuplicateSentences(text);
      note = '已压缩近重复句';
      break;
    }
    case 'inject-scenery': {
      const insert = '空气里有一股锈味，灯管嗡嗡响，像有什么东西在隔墙呼吸。';
      if (!text.includes(insert)) {
        const parts = text.split(/\n{2,}/);
        if (parts.length > 2) {
          parts.splice(Math.min(2, parts.length - 1), 0, insert);
          next = parts.join('\n\n');
          note = '已注入场景感官句';
        } else {
          next = `${insert}\n\n${text}`;
          note = '已在开头注入场景感官';
        }
      } else {
        note = '已有类似场景描写';
      }
      break;
    }
    case 'deep-rewrite': {
      next = text
        .replace(/就在这时[，,]/g, '')
        .replace(/突然[，,]/g, '')
        .replace(/\n{3,}/g, '\n\n');
      note = '已清理硬切套话，建议人工复核';
      break;
    }
    default:
      throw new Error(`未知优化策略: ${strategy}`);
  }

  // 写回同名章节文件
  const chDir = path.join(bookDir, 'chapters');
  const padN = pad(ch);
  const hit = exists(chDir)
    ? fs.readdirSync(chDir).find((f) => f.startsWith(`${padN}_`) && f.endsWith('.md'))
    : null;
  const file = hit
    ? path.join(chDir, hit)
    : path.join(chDir, `${padN}_optimized.md`);
  fs.mkdirSync(chDir, { recursive: true });
  writeText(file, next);

  setChapterStatus(bookDir, ch, 'pending_audit', {
    optimizedAt: new Date().toISOString(),
    strategy,
  });

  return {
    ok: true,
    chapter: ch,
    strategy,
    note,
    text: next,
    file,
  };
}

function collapseNearDuplicateSentences(text) {
  const lines = text.split('\n');
  const out = [];
  let prev = '';
  for (const line of lines) {
    const norm = line.replace(/\s+/g, '');
    if (norm && norm === prev) continue;
    if (norm && prev && norm.length > 8 && (norm.includes(prev) || prev.includes(norm))) continue;
    out.push(line);
    if (norm) prev = norm;
  }
  return out.join('\n');
}

/** 基调偏离检测（供诊断 API） */
export function checkToneDeviation(chapterText = '', chapterTone = null) {
  if (!chapterTone?.tone) {
    return { deviation: false, reason: '' };
  }
  const text = String(chapterText || '');
  const tone = String(chapterTone.tone);
  const explainHeavy = (text.match(/因为|所以|意味着|实际上|也就是说/g) || []).length;
  const dialogueMarks = (text.match(/[「」""]/g) || []).length;

  if (/压抑|惊悚|诡异/.test(tone) && explainHeavy >= 8 && dialogueMarks < 4) {
    return {
      deviation: true,
      reason: `设定为「${tone}」，但检测到大量解释性旁白、对白偏少`,
    };
  }
  if (/日常/.test(tone) && /尸潮|血|碎尸/.test(text) && !/异变|异常/.test(text.slice(0, 400))) {
    return {
      deviation: true,
      reason: `设定为「${tone}」，开篇暴力密度偏高，缺少日常铺垫`,
    };
  }
  if (chapterTone.coreEvent && !text.includes(String(chapterTone.coreEvent).slice(0, 6))) {
    // soft signal only
    return {
      deviation: false,
      reason: `核心事件关键词未明显出现（参考：${String(chapterTone.coreEvent).slice(0, 24)}…）`,
      soft: true,
    };
  }
  return { deviation: false, reason: '' };
}
