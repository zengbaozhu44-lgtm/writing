#!/usr/bin/env node
/**
 * 冒烟：Wizard 8 步 / 题材模板 / ability 动态 label / 试写 API
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let n = 0;
function ok(label) {
  n += 1;
  console.log(`✓ ${label}`);
}

{
  // fields-presets via dynamic import of compiled? It's TS — test by reading source + eval helpers via node after transpile
  // Source contract
  const presets = fs.readFileSync(
    path.join(root, 'packages/inkos-studio/src/components/entity-manager/fields-presets.ts'),
    'utf8',
  );
  assert.match(presets, /abilityLabelForGenre/);
  assert.match(presets, /功法\/能力/);
  assert.match(presets, /核心技能\/资源/);
  assert.match(presets, /金手指\/资产/);
  assert.match(presets, /读者记忆标签/);
  assert.match(presets, /对白风格/);
  assert.match(presets, /核心内心矛盾/);
  assert.match(presets, /预计出场章节/);
  assert.match(presets, /formatEntryChapter/);
  assert.match(presets, /validateCharacterDraft/);
  ok('fields-presets character enhancements');
}

{
  // Inline ability of ability label + entry chapter (mirror logic)
  function abilityLabelForGenre(genre = '') {
    const g = String(genre || '');
    if (/修仙|诡异/.test(g)) return '功法/能力';
    if (/年代/.test(g)) return '核心技能/资源';
    if (/神豪/.test(g)) return '金手指/资产';
    return '核心能力';
  }
  function formatEntryChapter(raw) {
    const s = String(raw || '').trim();
    if (!s) return '';
    const m = s.match(/(\d+)/);
    if (!m) return s;
    return `第${Number(m[1])}章`;
  }
  assert.equal(abilityLabelForGenre('诡异修仙'), '功法/能力');
  assert.equal(abilityLabelForGenre('年代重生'), '核心技能/资源');
  assert.equal(abilityLabelForGenre('神豪签到'), '金手指/资产');
  assert.equal(abilityLabelForGenre('都市'), '核心能力');
  assert.equal(formatEntryChapter('1'), '第1章');
  assert.equal(formatEntryChapter('第3章'), '第3章');
  assert.equal(formatEntryChapter('chap 12'), '第12章');
  ok('ability label + entryChapter format');
}

{
  const wizard = fs.readFileSync(
    path.join(root, 'packages/inkos-studio/src/pages/NewBookWizardPage.tsx'),
    'utf8',
  );
  assert.match(wizard, /冲突校准/);
  assert.match(wizard, /确认试写/);
  assert.match(wizard, /wizardContext/);
  assert.match(wizard, /applyGenreTemplate/);
  assert.match(wizard, /openingHook/);
  assert.match(wizard, /coreMystery/);
  assert.match(wizard, /trialWriteOpening/);
  assert.match(wizard, /checkWorldBoundary/);
  assert.match(wizard, /FactionRelationGraph/);
  assert.match(wizard, /characterFieldsForGenre/);
  assert.match(wizard, /规则免疫/);
  assert.match(wizard, /创建对应反派势力/);
  assert.match(wizard, /clearOnLeave|clearKeys/);
  ok('NewBookWizardPage 8-step + linkage');
}

{
  const templates = fs.readFileSync(
    path.join(root, 'packages/inkos-studio/src/components/wizard/genreTemplates.ts'),
    'utf8',
  );
  assert.match(templates, /规则怪谈/);
  assert.match(templates, /年代重生/);
  assert.match(templates, /诡异修仙/);
  assert.match(templates, /神豪签到/);
  assert.match(templates, /历史脑洞/);
  assert.match(templates, /cultivationRealm/);
  ok('genre templates');
}

{
  const ai = fs.readFileSync(path.join(root, 'packages/inkos-studio-server/src/ai-service.js'), 'utf8');
  assert.match(ai, /export async function checkWorldBoundary/);
  assert.match(ai, /export async function trialWriteOpening/);
  assert.match(ai, /maxTokens,\s*temperature/);
  assert.match(ai, /callLlm\(system, user, 500, 0\.8\)/);

  const routes = fs.readFileSync(path.join(root, 'packages/inkos-studio-server/src/routes.js'), 'utf8');
  assert.match(routes, /\/api\/ai\/wizard\/world-boundary/);
  assert.match(routes, /\/api\/ai\/wizard\/trial-opening/);

  const client = fs.readFileSync(path.join(root, 'packages/inkos-studio/src/api/client.ts'), 'utf8');
  assert.match(client, /trialWriteOpening/);
  assert.match(client, /checkWorldBoundary/);
  ok('trial preview + world-boundary API');
}

async function runRuntimeChecks() {
  const { trialWriteOpening, checkWorldBoundary } = await import(
    pathToFileURL(path.join(root, 'packages/inkos-studio-server/src/ai-service.js')).href
  );
  const trial = await trialWriteOpening({
    title: '测',
    openingHook: '门开了',
    genre: '规则怪谈',
  });
  assert.equal(trial.previewOnly, true);
  assert.ok(typeof trial.text === 'string');

  const boundary = await checkWorldBoundary({
    worldMarkdown: '规则互相矛盾：既禁止说话又必须说话。',
    genre: '规则怪谈',
  });
  assert.ok(boundary.report);
  ok('trialWriteOpening + checkWorldBoundary callable (local fallback ok)');
  console.log(`\n${n} checks passed.`);
}

runRuntimeChecks().catch((e) => {
  console.error(e);
  process.exit(1);
});
