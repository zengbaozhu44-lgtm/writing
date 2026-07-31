/**
 * InkOS 风格基因库
 */
export type { MicroScene } from './dark-monarch/golden-samples';
export {
  darkMonarchSamples,
  getSampleById,
  listSampleSummaries,
} from './dark-monarch/golden-samples';
export { darkMonarchVoice } from './dark-monarch/voice-dna';
export type { DarkMonarchVoice } from './dark-monarch/voice-dna';
export {
  darkMonarchSceneTemplates,
  pickDarkMonarchSampleForSceneType,
  formatVariableHints,
} from './dark-monarch/scene-templates';

export interface StyleGenePackMeta {
  id: string;
  label: string;
  author: string;
  source: string;
  blurb: string;
}

export const STYLE_GENE_PACKS: StyleGenePackMeta[] = [
  {
    id: 'dark-monarch',
    label: '暗夜君王（痞气异能/都市黑暗）',
    author: '拂晓晨星',
    source: '暗夜君王',
    blurb: '威胁日常化 · 数字具体 · 身体反应 · 温情带刀 · 废墟美学',
  },
];

export function getStyleGenePack(id: string): StyleGenePackMeta | undefined {
  return STYLE_GENE_PACKS.find((p) => p.id === id);
}
