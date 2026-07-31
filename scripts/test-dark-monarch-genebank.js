#!/usr/bin/env node
/**
 * 冒烟：暗夜君王风格基因库
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const toUrl = (p) => pathToFileURL(p).href;
let n = 0;
function ok(label) {
  n += 1;
  console.log(`✓ ${label}`);
}

{
  const samplesTs = fs.readFileSync(
    path.join(root, 'packages/inkos-studio/src/style-genebank/dark-monarch/golden-samples.ts'),
    'utf8',
  );
  assert.match(samplesTs, /intimacy-worldbuilding/);
  assert.match(samplesTs, /battle-opening/);
  assert.match(samplesTs, /emotional-twist/);
  const ids = (samplesTs.match(/id: '[a-z-]+'/g) || []).length;
  assert.ok(ids >= 12, `expected >=12 micro scenes, got ${ids}`);
  ok('studio golden-samples: 12 micro scenes');
}

{
  const wizard = fs.readFileSync(
    path.join(root, 'packages/inkos-studio/src/pages/NewBookWizardPage.tsx'),
    'utf8',
  );
  assert.match(wizard, /STYLE_GENE_PACKS/);
  assert.match(wizard, /styleGenePack/);
  assert.match(wizard, /暗夜君王|dark-monarch/);
  ok('wizard Step2 style gene pack UI');
}

{
  const drawer = fs.readFileSync(
    path.join(root, 'packages/inkos-studio/src/components/drawers/DiagnosticsDrawer.tsx'),
    'utf8',
  );
  assert.match(drawer, /styleFit/);
  assert.match(drawer, /风格符合度/);
  assert.match(drawer, /banned-chip/);
  ok('DiagnosticsDrawer styleFit panel');
}

const {
  darkMonarchSamples,
  pickDarkMonarchSampleForSceneType,
  scoreStyleFit,
  buildDarkMonarchSystemAppendix,
} = await import(toUrl(path.join(root, 'packages/inkos-studio-server/src/style-genebank/dark-monarch.js')));

const {
  saveBookStyleGene,
  diagnoseStyleFit,
  resolveGeneSampleForScene,
  buildGeneSystemAppendix,
} = await import(toUrl(path.join(root, 'packages/inkos-studio-server/src/style-genebank/index.js')));

const {
  resolveGoldenSample,
  compileSingleScenePrompt,
} = await import(toUrl(path.join(root, 'packages/inkos-studio-server/src/writer-optimization/sample-driven-writer.js')));

{
  assert.equal(darkMonarchSamples.length, 12);
  const emo = pickDarkMonarchSampleForSceneType('emotional');
  assert.equal(emo.id, 'intimacy-worldbuilding');
  const act = pickDarkMonarchSampleForSceneType('action');
  assert.equal(act.id, 'battle-opening');
  const dlg = pickDarkMonarchSampleForSceneType('dialogue');
  assert.equal(dlg.id, 'dialogue-threat');
  const rev = pickDarkMonarchSampleForSceneType('reveal');
  assert.equal(rev.id, 'betrayal-reveal');
  ok('sceneType → micro-scene mapping');
}

{
  const appendix = buildDarkMonarchSystemAppendix('emotional');
  assert.match(appendix, /风格基因/);
  assert.match(appendix, /招牌技法/);
  assert.match(appendix, /私密情感/);
  assert.match(appendix, /模仿以下风格样本/);
  ok('system appendix for emotional scene');
}

{
  const good = [
    '那只纤细的小手虽然冰冷，握进掌心时却像不肯灭的火。',
    '下一秒，她用力一推。他后背撞上墙砖，牙关发麻。',
    '“这烟五毛一包，毒是一百块一两——我分得清账。”他暗笑。',
    '侍从们后退半步。红毯上留下湿黏的脚印。',
  ].join('\n');
  const fit = scoreStyleFit(good, 'dark-monarch');
  assert.ok(fit.hits.includes('数字具体化'));
  assert.ok(fit.hits.includes('身体反应') || fit.hits.includes('温情后接动作'));
  assert.equal(fit.bannedHits.length, 0);
  assert.ok(fit.score >= 55, `expected score>=55, got ${fit.score}`);
  ok('style fit hits signature moves on good emotional text');
}

{
  const bad = '他深吸一口气。他意识到自己很害怕。空气很大，力量很强，城池很古老。';
  const fit = scoreStyleFit(bad, 'dark-monarch');
  assert.ok(fit.bannedHits.includes('深吸一口气'));
  assert.ok(fit.bannedHits.includes('意识到'));
  assert.ok(fit.bannedHits.some((b) => /很大|很强|很古老/.test(b)));
  assert.ok(fit.score < 55, `expected low score, got ${fit.score}`);
  ok('style fit flags banned phrases');
}

{
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'inkos-gene-'));
  fs.mkdirSync(path.join(dir, 'novel', '_system'), { recursive: true });
  saveBookStyleGene(dir, 'dark-monarch', { sceneType: 'opening' });
  assert.ok(fs.existsSync(path.join(dir, 'novel', '_system', 'style_gene.json')));
  assert.ok(fs.existsSync(path.join(dir, 'novel', '_system', 'style_sample.md')));

  const micro = resolveGeneSampleForScene(dir, 'emotional');
  assert.equal(micro.id, 'intimacy-worldbuilding');

  const sample = resolveGoldenSample({ bookDir: dir, sceneType: 'emotional' });
  assert.match(sample, /夏雨轩|牙印|血仆/);

  const prompt = compileSingleScenePrompt({
    basePrompt: '## P1\nScene 目标：枕边谈判',
    executionPlan: {
      sceneType: 'emotional',
      scenePlan: { goal: '揭露契约', conflict: '拒绝也是契约' },
      beats: [{ label: 'Hook' }],
      chapterAuthorGoal: {
        mainFeeling: '熟悉的恐惧',
        readerEmotionStart: '不安',
        readerEmotionEnd: '更深的怀疑',
        mustRemember: '牙印',
        writerMust: '不得不靠近',
      },
    },
    scene: { index: 1, wordTarget: 900, sceneType: 'emotional' },
    intent: { pov: '夏雨轩', _bookDir: dir },
    bookDir: dir,
  });
  assert.match(prompt, /风格基因|风格样本/);
  assert.match(prompt, /夏雨轩|牙印/);
  assert.match(buildGeneSystemAppendix(dir, 'emotional'), /招牌技法/);

  const diag = diagnoseStyleFit(dir, '他深吸一口气。意识到危险。');
  assert.equal(diag.enabled, true);
  assert.ok(diag.bannedHits.length >= 1);

  fs.rmSync(dir, { recursive: true, force: true });
  ok('persist gene + emotional scene prompt + diagnose');
}

console.log(`\nAll ${n} checks passed.`);
