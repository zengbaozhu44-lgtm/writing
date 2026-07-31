#!/usr/bin/env node
/**
 * verify-field-pipeline.js
 *
 * 验证角色卡增强字段是否贯穿：Canon 序列化 → lore 注入 → 正文约束 / 出场过滤
 *
 * 用法:
 *   node scripts/verify-field-pipeline.js <book-dir> [--chapter N] [--out report.json]
 *
 * 默认检查最新有 prompt-cache 的章节；无 cache 时退化为最新 chapters 文件。
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const FIELD_KEYS = ['ability', 'tag', 'voice', 'innerConflict', 'entryChapter'];

/** Canon MD 中的中文标签（含历史别名） */
const FIELD_LABELS = {
  ability: ['核心能力', '功法/能力', '核心技能/资源', '金手指/资产', '能力'],
  tag: ['读者记忆标签', '标签'],
  voice: ['对白风格'],
  innerConflict: ['核心内心矛盾', '内心矛盾'],
  entryChapter: ['预计出场章节', '出场章节'],
};

function usage() {
  console.error('Usage: node scripts/verify-field-pipeline.js <book-dir> [--chapter N] [--out report.json]');
  process.exit(2);
}

function parseArgs(argv) {
  const args = { bookDir: null, chapter: null, out: null };
  const rest = argv.slice(2);
  for (let i = 0; i < rest.length; i += 1) {
    const a = rest[i];
    if (a === '--chapter') {
      args.chapter = Number(rest[++i]);
    } else if (a === '--out') {
      args.out = rest[++i];
    } else if (!a.startsWith('-') && !args.bookDir) {
      args.bookDir = path.resolve(a);
    } else {
      usage();
    }
  }
  if (!args.bookDir) usage();
  return args;
}

function exists(p) {
  try {
    return fs.existsSync(p);
  } catch {
    return false;
  }
}

function readText(p) {
  return fs.readFileSync(p, 'utf8');
}

function pad(n) {
  return String(n).padStart(4, '0');
}

/** 解析「第N章」/ 纯数字 → number | null */
function parseChapterNum(raw) {
  const s = String(raw || '').trim();
  if (!s) return null;
  const m = s.match(/(\d+)/);
  return m ? Number(m[1]) : null;
}

function getFieldValue(md, labels) {
  for (const label of labels) {
    const re = new RegExp(`\\*\\*${escapeRe(label)}\\*\\*[：:]\\s*(.*)`);
    const m = md.match(re);
    if (m) {
      const v = m[1].trim();
      // 空值不算「已序列化有内容」
      return v;
    }
  }
  return null;
}

function escapeRe(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function hasSerializedField(md, key) {
  const labels = FIELD_LABELS[key] || [key];
  // 行存在即算序列化进文件（即使值为空也说明 schema 已写入）
  for (const label of labels) {
    const re = new RegExp(`\\*\\*${escapeRe(label)}\\*\\*[：:]`);
    if (re.test(md)) return true;
  }
  // 英文 key 兜底
  if (new RegExp(`\\*\\*${escapeRe(key)}\\*\\*[：:]`, 'i').test(md)) return true;
  return false;
}

function resolveCharacterDir(bookDir) {
  const candidates = [
    path.join(bookDir, 'novel', '03_character_bible'),
    path.join(bookDir, 'novel', 'characters'),
    path.join(bookDir, 'characters'),
    path.join(bookDir, 'canon', 'characters'),
  ];
  for (const d of candidates) {
    if (exists(d) && fs.statSync(d).isDirectory()) return d;
  }
  return null;
}

function listCharacterFiles(charDir) {
  return fs.readdirSync(charDir)
    .filter((f) => f.endsWith('.md') && !f.startsWith('_') && f !== 'README.md')
    .map((f) => ({
      file: f,
      name: f.replace(/\.md$/i, ''),
      path: path.join(charDir, f),
    }));
}

function loadCharacters(bookDir) {
  const charDir = resolveCharacterDir(bookDir);
  if (!charDir) {
    return { charDir: null, characters: [] };
  }
  const characters = listCharacterFiles(charDir).map((c) => {
    const md = readText(c.path);
    const fields = {};
    const present = {};
    for (const key of FIELD_KEYS) {
      present[key] = hasSerializedField(md, key);
      fields[key] = getFieldValue(md, FIELD_LABELS[key]) || '';
    }
    // 也解析身份等便于对白归属（可选）
    fields.name = md.match(/^#\s*(.+)/m)?.[1]?.trim() || c.name;
    return { ...c, md, fields, present };
  });
  return { charDir, characters };
}

function promptCacheRoot(bookDir) {
  const candidates = [
    path.join(bookDir, 'novel', '_system', 'brain', 'prompt-cache'),
    path.join(bookDir, 'novel', '_system', 'prompt-cache'),
    path.join(bookDir, '_system', 'brain', 'prompt-cache'),
  ];
  for (const d of candidates) {
    if (exists(d)) return d;
  }
  return null;
}

function listCachedChapters(cacheRoot) {
  if (!cacheRoot) return [];
  return fs.readdirSync(cacheRoot)
    .filter((n) => /^ch_\d{4}$/.test(n))
    .map((n) => Number(n.replace('ch_', '')))
    .filter((n) => Number.isFinite(n))
    .sort((a, b) => a - b);
}

function loadPromptBundle(cacheRoot, chapter) {
  const dir = path.join(cacheRoot, `ch_${pad(chapter)}`, 'prompts');
  if (!exists(dir)) return { chapter, promptsDir: dir, texts: [], joined: '' };
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.txt'));
  const texts = files.map((f) => ({
    file: f,
    text: readText(path.join(dir, f)),
  }));
  return {
    chapter,
    promptsDir: dir,
    texts,
    joined: texts.map((t) => t.text).join('\n\n'),
  };
}

function chaptersDir(bookDir) {
  const candidates = [
    path.join(bookDir, 'chapters'),
    path.join(bookDir, 'novel', 'chapters'),
  ];
  for (const d of candidates) {
    if (exists(d)) return d;
  }
  return null;
}

function listChapterFiles(chDir) {
  if (!chDir) return [];
  return fs.readdirSync(chDir)
    .filter((f) => /^\d{4}_.*\.md$/i.test(f))
    .map((f) => ({
      file: f,
      number: Number(f.slice(0, 4)),
      path: path.join(chDir, f),
    }))
    .filter((c) => Number.isFinite(c.number))
    .sort((a, b) => a.number - b.number);
}

function loadChapterText(bookDir, chapter) {
  const chDir = chaptersDir(bookDir);
  const files = listChapterFiles(chDir);
  const hit = files.find((f) => f.number === chapter) || files[files.length - 1] || null;
  if (!hit) return { chapter, path: null, text: '' };
  return { chapter: hit.number, path: hit.path, text: readText(hit.path), file: hit.file };
}

/**
 * lore 注入检测：字段值或标签是否出现在 prompt-cache 文本中
 * 对有内容的字段：优先匹配值片段；对仅有标签行：匹配「**标签**：」
 */
function checkLoreInjection(characters, loreText) {
  const out = {};
  const lore = loreText || '';
  for (const c of characters) {
    const name = c.fields.name || c.name;
    for (const key of FIELD_KEYS) {
      const reportKey = `${name}_${key}`;
      if (!c.present[key]) {
        out[reportKey] = false;
        continue;
      }
      const val = String(c.fields[key] || '').trim();
      const labels = FIELD_LABELS[key];
      let hit = false;
      if (val) {
        // 取前 12 字防超长噪声；短值全量匹配
        const needle = val.length > 12 ? val.slice(0, 12) : val;
        if (lore.includes(needle)) hit = true;
      }
      if (!hit) {
        for (const label of labels) {
          if (lore.includes(`**${label}**`) && lore.includes(name)) {
            // 角色块内出现该标签行
            hit = characterBlockHasLabel(lore, name, label);
            if (hit) break;
          }
        }
      }
      // 人物整块被注入也算字段通路的弱信号（仅当字段值空）
      if (!hit && !val && lore.includes(`### 人物:${name}`)) {
        hit = characterBlockHasLabel(lore, name, labels[0]);
      }
      out[reportKey] = hit;
    }
  }
  return out;
}

function characterBlockHasLabel(lore, name, label) {
  const markers = [`### 人物:${name}`, `### 人物：${name}`, `# ${name}`];
  let start = -1;
  for (const m of markers) {
    const i = lore.indexOf(m);
    if (i >= 0) {
      start = i;
      break;
    }
  }
  if (start < 0) return false;
  const slice = lore.slice(start, start + 4000);
  return slice.includes(`**${label}**`);
}

/** 是否像「短句」类 voice */
function isShortVoice(voice) {
  return /短句|短促|简洁|干脆|带刺/.test(String(voice || ''));
}

/**
 * 粗提取角色对白：
 * - 「……」前/后邻近出现角色名
 * - “……”同上
 * - 角色名[说道问]：「……」
 */
function extractCharacterDialogue(text, name) {
  const lines = [];
  if (!text || !name) return lines;
  const nameRe = escapeRe(name);

  // 名+说/道/问：「」
  const re1 = new RegExp(`${nameRe}[^「"\n]{0,12}[说道问回喊喊道][道过]?[：:]?[「"]([^」"]+)[」"]`, 'g');
  let m;
  while ((m = re1.exec(text))) lines.push(m[1]);

  // 「」后紧跟名
  const re2 = new RegExp(`[「"]([^」"]{1,80})[」"][^\\n]{0,8}${nameRe}`, 'g');
  while ((m = re2.exec(text))) lines.push(m[1]);

  // 段落内：名 出现且同段有引号对白
  const paras = text.split(/\n{2,}/);
  for (const p of paras) {
    if (!p.includes(name)) continue;
    const quoted = [...p.matchAll(/[「"]([^」"]{2,120})[」"]/g)].map((x) => x[1]);
    for (const q of quoted) {
      if (!lines.includes(q)) lines.push(q);
    }
  }
  return lines;
}

function avgSentenceLength(dialogues) {
  if (!dialogues.length) return null;
  let total = 0;
  let count = 0;
  for (const d of dialogues) {
    // 按。！？；拆句；无标点则整段算一句
    const parts = String(d).split(/[。！？!?；;]+/).map((s) => s.trim()).filter(Boolean);
    if (!parts.length) {
      total += d.replace(/\s/g, '').length;
      count += 1;
    } else {
      for (const p of parts) {
        total += p.replace(/\s/g, '').length;
        count += 1;
      }
    }
  }
  return count ? Math.round((total / count) * 10) / 10 : null;
}

function checkTextOutput(characters, chapterText) {
  const out = {};
  let anyVoiceConstraint = false;
  let allCompliant = true;

  for (const c of characters) {
    const name = c.fields.name || c.name;
    const dialogues = extractCharacterDialogue(chapterText, name);
    const avg = avgSentenceLength(dialogues);
    out[`${name}_avgDialogueLength`] = avg;
    out[`${name}_dialogueCount`] = dialogues.length;

    if (isShortVoice(c.fields.voice)) {
      anyVoiceConstraint = true;
      const ok = avg == null ? null : avg < 20;
      out[`${name}_voiceShortExpected`] = true;
      out[`${name}_voiceCompliant`] = ok;
      if (ok === false) allCompliant = false;
      if (ok === null) {
        // 无对白样本 → 无法判定，不拖垮总开关
      }
    }
  }

  out.voiceCompliance = anyVoiceConstraint
    ? allCompliant && Object.keys(out).some((k) => k.endsWith('_voiceCompliant') && out[k] === true)
      || !Object.keys(out).some((k) => k.endsWith('_voiceCompliant') && out[k] === false)
    : null; // 无短句 voice 约束可验

  // 简化：若存在明确违规则为 false；全无样本则为 null；否则 true
  const verdicts = Object.entries(out)
    .filter(([k]) => k.endsWith('_voiceCompliant'))
    .map(([, v]) => v);
  if (!verdicts.length) out.voiceCompliance = null;
  else if (verdicts.some((v) => v === false)) out.voiceCompliance = false;
  else if (verdicts.every((v) => v == null)) out.voiceCompliance = null;
  else out.voiceCompliance = true;

  return out;
}

/**
 * entryChapter 过滤：
 * - 若角色 entryChapter > 当前章，lore 中不应出现该角色名（人物块）
 * - 报告值 true = 过滤生效（未出现）；false = 未生效（仍出现）
 * - 若 entryChapter <= 当前章或未填，标记为 null（不适用）
 */
function checkEntryChapterFilter(characters, loreText, chapter) {
  const out = {};
  const lore = loreText || '';
  for (const c of characters) {
    const name = c.fields.name || c.name;
    const key = `${name}_chapter${chapter}`;
    const entryN = parseChapterNum(c.fields.entryChapter);
    if (entryN == null) {
      out[key] = null;
      continue;
    }
    if (entryN <= chapter) {
      // 已到出场章：期望可出现；记录是否出现（true=出现）
      out[key] = lore.includes(name) ? true : false;
      out[`${key}_expected`] = 'present_ok';
      continue;
    }
    // 未到出场章：不应出现在人物 lore 块
    const inCharacterBlock = lore.includes(`### 人物:${name}`)
      || lore.includes(`### 人物：${name}`)
      || new RegExp(`### 人物\\s*[:：]\\s*${escapeRe(name)}`).test(lore);
    // 过滤生效 = 未注入人物块
    out[key] = !inCharacterBlock;
    out[`${key}_expected`] = 'absent';
    out[`${key}_leaked`] = inCharacterBlock;
  }
  return out;
}

function buildReport(bookDir, chapter, opts = {}) {
  const { charDir, characters } = loadCharacters(bookDir);
  const cacheRoot = promptCacheRoot(bookDir);
  const cachedChapters = listCachedChapters(cacheRoot);
  const chFiles = listChapterFiles(chaptersDir(bookDir));

  let targetChapter = chapter;
  if (!Number.isFinite(targetChapter)) {
    targetChapter = cachedChapters.length
      ? cachedChapters[cachedChapters.length - 1]
      : (chFiles.length ? chFiles[chFiles.length - 1].number : 1);
  }

  const prompts = cacheRoot
    ? loadPromptBundle(cacheRoot, targetChapter)
    : { chapter: targetChapter, texts: [], joined: '', promptsDir: null };
  const chapterDoc = loadChapterText(bookDir, targetChapter);

  const characterFiles = {};
  for (const c of characters) {
    characterFiles[c.fields.name || c.name] = { ...c.present };
  }

  const loreInjection = checkLoreInjection(characters, prompts.joined);
  const textOutput = checkTextOutput(characters, chapterDoc.text);
  const entryChapterFilter = checkEntryChapterFilter(characters, prompts.joined, targetChapter);

  return {
    meta: {
      bookDir,
      characterDir: charDir,
      chapter: targetChapter,
      promptCacheDir: prompts.promptsDir,
      promptFileCount: prompts.texts.length,
      chapterFile: chapterDoc.file || null,
      characterCount: characters.length,
      fieldsChecked: FIELD_KEYS,
      generatedAt: new Date().toISOString(),
    },
    characterFiles,
    loreInjection,
    textOutput,
    entryChapterFilter,
  };
}

function main() {
  const args = parseArgs(process.argv);
  if (!exists(args.bookDir)) {
    console.error(`Book dir not found: ${args.bookDir}`);
    process.exit(1);
  }

  const report = buildReport(args.bookDir, args.chapter);
  const json = JSON.stringify(report, null, 2);
  if (args.out) {
    fs.mkdirSync(path.dirname(path.resolve(args.out)), { recursive: true });
    fs.writeFileSync(args.out, `${json}\n`);
    console.error(`Wrote ${args.out}`);
  }
  console.log(json);

  // 非 0 退出：有「应过滤却泄漏」或 voice 明确违规
  let failed = false;
  for (const [k, v] of Object.entries(report.entryChapterFilter)) {
    if (k.endsWith('_leaked') && v === true) failed = true;
    if (k.endsWith('_expected') && report.entryChapterFilter[k.replace(/_expected$/, '')] === false
      && report.entryChapterFilter[k] === 'absent') {
      failed = true;
    }
  }
  if (report.textOutput.voiceCompliance === false) failed = true;

  // 作为验证工具：默认打印 JSON 且 exit 0（便于管道）；加 --strict 才失败退出
  if (process.argv.includes('--strict') && failed) process.exit(1);
}

// 可被单测 import
export {
  buildReport,
  parseChapterNum,
  hasSerializedField,
  checkLoreInjection,
  checkTextOutput,
  checkEntryChapterFilter,
  FIELD_KEYS,
  FIELD_LABELS,
};

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) main();
