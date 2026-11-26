/**
 * Golden Sample Loader — CLI Runtime 可用的共享加载器
 *
 * 回退链（高 → 低）：
 *   1. style genebank（书籍语境包）
 *   2. style_dna.json / .yaml（goldenSample / sampleText / sampleLines）
 *   3. novel/_system/style_sample.md
 *   4. 提取的 0001 叙事效率范例（golden/narrative-efficiency-0001.md）
 *   5. DEFAULT_GOLDEN_SAMPLE（内置网文质感样本）
 *
 * 关键约束：**任何一层都不能返回空**。此前 CLI 路径 style_dna 为模板空值
 * 时 Voice DNA 块直接返回空串 → testbook3 全程无 golden sample、无文风约束。
 *
 * 原则文本（principles）单独加载：golden/principles.md；同样保证非空回退。
 */
import fs from 'node:fs';
import path from 'node:path';
import { readYaml } from '../../inkos-core/src/lib/yaml-store.js';

const ROOT = path.resolve(import.meta.dirname, '../../../');
const GOLDEN_SAMPLE_FILE = path.join(ROOT, 'golden', 'narrative-efficiency-0001.md');
const GOLDEN_PRINCIPLES_FILE = path.join(ROOT, 'golden', 'principles.md');

/** 内置兜底样本（网文质感：画面 + 身体细节 + 信息藏动作）与 studio DEFAULT_GOLDEN_SAMPLE 同源 */
export const DEFAULT_GOLDEN_SAMPLE = [
  '雨滴砸在滑轨上，溅开成暗红色的水花。林异的手套已经磨破了三道口子，第四道正在渗血。',
  '他把尸体拖上推车，编号栏写着“数据溢出——认知污染”。第九区的夜雨裹着机油味，打在防护服的帽檐上，噼啪作响。',
  '',
  '“快点。”对讲机里传来调度员的声音，“天眼三分钟后过境。”',
  '',
  '林异没答话。他拽着滑轨往焚化区走，推车的轮子卡在裂缝里，尸体晃了一下，一只手从白布下滑出来——指甲全没了。',
  '',
  '他停了两秒。然后继续拖。',
].join('\n');

/** 内置兜底原则（与 golden/principles.md 同口径，文件缺失时用） */
export const DEFAULT_PRINCIPLES = [
  '1. 每句都改变局面（新信息 / 关闭选项的选择 / 物理/关系改变）；删除后影响后续逻辑',
  '2. 感官与环境描写只在动作/对白需要时出现，且必须承担叙事功能',
  '3. 主角是行动发起者：动词链推进，不等待世界发生',
  '4. 对白短促、每句带博弈（威胁/拒绝/承诺），无寒暄',
  '5. 认知句（他知道/明白）必须紧跟决策或行动，不单独悬浮',
].join('\n');

function clipChars(text, max = 700) {
  const s = String(text || '').trim();
  if (s.length <= max) return s;
  return `${s.slice(0, max)}\n…[sample-clipped]`;
}

function readText(file) {
  try {
    if (!fs.existsSync(file)) return '';
    return String(fs.readFileSync(file, 'utf8') || '').trim();
  } catch {
    return '';
  }
}

/** 0001 效率范例正文：去掉标题与引言注释（> 开头行） */
function readExtractedGolden() {
  const raw = readText(GOLDEN_SAMPLE_FILE);
  if (!raw || raw.length < 80) return '';
  const body = raw
    .split('\n')
    .filter((l) => !l.startsWith('#') && !l.startsWith('>'))
    .join('\n')
    .trim();
  return body.length >= 80 ? body : '';
}

/**
 * 解析 golden sample（统一入口）。
 * @returns {{ sample: string, source: 'genebank'|'style_dna'|'style_sample'|'extracted_0001'|'builtin' }}
 */
export function resolveGoldenSampleCLI({ bookDir = null, styleDna = null } = {}) {
  const dna = styleDna && typeof styleDna === 'object' ? styleDna : {};

  // 2) style_dna.json / .yaml
  if (bookDir) {
    const sys = path.join(bookDir, 'novel', '_system');
    for (const file of [path.join(sys, 'style_dna.json'), path.join(sys, 'style_dna.yaml')]) {
      try {
        if (!fs.existsSync(file)) continue;
        const j = file.endsWith('.json') ? JSON.parse(fs.readFileSync(file, 'utf8')) : readYaml(file);
        const s = [
          j?.goldenSample, j?.sampleText, j?.voice?.sampleText,
          ...(Array.isArray(j?.sampleLines) ? [j.sampleLines.join('\n')] : []),
        ].map((x) => String(x || '').trim()).find((x) => x.length >= 80);
        if (s) return { sample: clipChars(s), source: 'style_dna' };
      } catch { /* 下一层 */ }
    }
    // 3) style_sample.md
    const styleSample = readText(path.join(bookDir, 'novel', '_system', 'style_sample.md'));
    if (styleSample.length >= 80) return { sample: clipChars(styleSample), source: 'style_sample' };
  }

  // 4) 提取的 0001 效率范例（dna 传入值优先于文件）
  const fromDna = [dna.goldenSample, dna.sampleText]
    .map((x) => String(x || '').trim()).find((x) => x.length >= 80);
  if (fromDna) return { sample: clipChars(fromDna), source: 'style_dna' };

  const extracted = readExtractedGolden();
  if (extracted) return { sample: clipChars(extracted, 400), source: 'extracted_0001' };

  // 5) 内置
  return { sample: DEFAULT_GOLDEN_SAMPLE, source: 'builtin' };
}

/**
 * 叙事效率原则（prompt 注入用）。style_dna 的 notes 有具体内容时优先，
 * 否则用 golden/principles.md，最终回退内置。
 */
export function resolveNarrativePrinciples({ bookDir = null } = {}) {
  if (bookDir) {
    try {
      const sys = path.join(bookDir, 'novel', '_system');
      for (const file of [path.join(sys, 'style_dna.json'), path.join(sys, 'style_dna.yaml')]) {
        if (!fs.existsSync(file)) continue;
        const j = file.endsWith('.json') ? JSON.parse(fs.readFileSync(file, 'utf8')) : readYaml(file);
        const notes = String(j?.notes || '').trim();
        if (notes.length >= 40) return { principles: notes, source: 'style_dna' };
      }
    } catch { /* 下一层 */ }
  }
  const file = readText(GOLDEN_PRINCIPLES_FILE);
  if (file.length >= 80) {
    // 取「## 原则」段的条目
    const m = file.match(/## 原则[^\n]*\n([\s\S]*?)(?=\n##|$)/);
    if (m && m[1].trim().length >= 40) return { principles: m[1].trim(), source: 'golden_file' };
  }
  return { principles: DEFAULT_PRINCIPLES, source: 'builtin' };
}
