/**
 * Style Genebank — Studio Server runtime
 */
export {
  darkMonarchVoice,
  darkMonarchSamples,
  darkMonarchSceneTemplates,
  getSampleById,
  pickDarkMonarchSampleForSceneType,
  resolveStyleGenePack,
  buildDarkMonarchSystemAppendix,
  scoreStyleFit,
} from './dark-monarch.js';

import fs from 'node:fs';
import path from 'node:path';
import { exists, readJson, writeJson, writeText } from '../../../inkos-core/src/lib/paths.js';
import {
  pickDarkMonarchSampleForSceneType,
  resolveStyleGenePack,
  scoreStyleFit,
  buildDarkMonarchSystemAppendix,
} from './dark-monarch.js';

export function styleGenePath(bookDir) {
  return path.join(bookDir, 'novel', '_system', 'style_gene.json');
}

export function loadBookStyleGene(bookDir) {
  const file = styleGenePath(bookDir);
  if (!exists(file)) return null;
  try {
    return readJson(file);
  } catch {
    return null;
  }
}

/**
 * 持久化风格基因选择 + 写入默认黄金样本
 */
export function saveBookStyleGene(bookDir, packId, { sceneType = 'opening' } = {}) {
  const pack = resolveStyleGenePack(packId);
  if (!pack || !bookDir) return null;

  const sample = pickDarkMonarchSampleForSceneType(sceneType);
  const defaultIds = pack.voice.defaultSampleIds || [];
  const defaultSample = pack.samples.find((s) => defaultIds.includes(s.id)) || sample;

  const payload = {
    version: 'style-gene-1',
    packId: pack.id,
    label: pack.voice.label,
    author: pack.voice.author,
    source: pack.voice.source,
    signatureMoves: pack.voice.signatureMoves,
    banned: pack.voice.banned,
    bannedPhrases: pack.voice.bannedPhrases,
    defaultSampleId: defaultSample.id,
    savedAt: new Date().toISOString(),
  };

  fs.mkdirSync(path.dirname(styleGenePath(bookDir)), { recursive: true });
  writeJson(styleGenePath(bookDir), payload);

  const md = path.join(bookDir, 'novel', '_system', 'style_sample.md');
  writeText(md, defaultSample.sample);

  const dnaPath = path.join(bookDir, 'novel', '_system', 'style_dna.json');
  const prev = exists(dnaPath) ? readJson(dnaPath) : {};
  writeJson(dnaPath, {
    ...prev,
    genePackId: pack.id,
    goldenSample: defaultSample.sample,
    sampleLines: defaultSample.sample.split(/\n+/).filter(Boolean).slice(0, 12),
    voiceNotes: [
      pack.voice.sentenceStyle,
      pack.voice.dialogueStyle,
      ...pack.voice.signatureMoves.slice(0, 4),
    ].join('\n'),
    bannedPhrases: pack.voice.bannedPhrases,
    updatedAt: new Date().toISOString(),
  });

  return payload;
}

export function resolveGeneSampleForScene(bookDir, sceneType = 'standard') {
  const gene = loadBookStyleGene(bookDir);
  if (!gene?.packId) return null;
  const pack = resolveStyleGenePack(gene.packId);
  if (!pack) return null;
  return pack.pickSample(sceneType);
}

export function buildGeneSystemAppendix(bookDir, sceneType = 'standard') {
  const gene = loadBookStyleGene(bookDir);
  if (!gene?.packId) return '';
  if (gene.packId === 'dark-monarch') {
    return buildDarkMonarchSystemAppendix(sceneType);
  }
  const pack = resolveStyleGenePack(gene.packId);
  if (!pack) return '';
  const sample = pack.pickSample(sceneType);
  const voice = pack.voice;
  const tip = `技法：${(voice.signatureMoves || []).slice(0, 2).join('；')}${sample?.name ? ` ·「${sample.name}」` : ''}`;
  return tip.length > 80 ? `${tip.slice(0, 79)}…` : tip;
}

export function diagnoseStyleFit(bookDir, chapterText) {
  const gene = loadBookStyleGene(bookDir);
  if (!gene?.packId) {
    return {
      score: null,
      hits: [],
      bannedHits: [],
      reasons: ['本书未绑定风格基因包'],
      enabled: false,
    };
  }
  return { ...scoreStyleFit(chapterText, gene.packId), enabled: true };
}
