#!/usr/bin/env node
/**
 * 冒烟：通用实体 CRUD（EntityManager / modules DELETE / locations）
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let n = 0;
function ok(label) {
  n += 1;
  console.log(`✓ ${label}`);
}

{
  const { writeModule, readModule, deleteModuleFile, resolveModuleKey } = await import(
    pathToFileURL(path.join(root, 'packages/inkos-studio-server/src/module-service.js')).href
  );
  const { getBookPaths } = await import(
    pathToFileURL(path.join(root, 'packages/inkos-core/src/lib/book.js')).href
  );

  assert.equal(resolveModuleKey('locations'), 'location_bible');
  assert.equal(resolveModuleKey('organizations'), 'faction_bible');

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'inkos-entity-'));
  const bookDir = path.join(tmp, 'book');
  fs.mkdirSync(path.join(bookDir, 'novel', '03_character_bible'), { recursive: true });
  fs.mkdirSync(path.join(bookDir, 'novel', '04_faction_bible'), { recursive: true });
  fs.writeFileSync(path.join(bookDir, 'book.json'), JSON.stringify({ schemaVersion: 4, title: 'e' }));

  const bp = getBookPaths(bookDir);
  assert.ok(bp.modules.location_bible);

  writeModule(bookDir, 'characters', { content: '# 甲\n\n- **身份**：侦探\n' }, '甲.md');
  writeModule(bookDir, 'factions', { content: '# 乙帮\n\n- **简介**：地下\n- **类型**：组织\n' }, '乙帮.md');
  writeModule(bookDir, 'locations', { content: '# 旧码头\n\n- **简介**：雾\n' }, '旧码头.md');

  const chars = readModule(bookDir, 'characters');
  assert.ok(chars.files.some((f) => f.id === '甲'));
  const locs = readModule(bookDir, 'locations');
  assert.ok(locs.files.some((f) => f.id === '旧码头'));

  deleteModuleFile(bookDir, 'characters', '甲.md');
  const after = readModule(bookDir, 'characters');
  assert.equal(after.files.length, 0);
  ok('module CRUD characters/factions/locations + delete');
}

{
  const client = fs.readFileSync(path.join(root, 'packages/inkos-studio/src/api/client.ts'), 'utf8');
  assert.match(client, /deleteModuleFile/);

  const em = fs.readFileSync(
    path.join(root, 'packages/inkos-studio/src/components/entity-manager/EntityManager.tsx'),
    'utf8',
  );
  assert.match(em, /entityType/);
  assert.match(em, /maxCount/);
  assert.match(em, /deleteModuleFile/);

  const wizard = fs.readFileSync(
    path.join(root, 'packages/inkos-studio/src/pages/NewBookWizardPage.tsx'),
    'utf8',
  );
  assert.match(wizard, /EntityManager/);
  assert.match(wizard, /CHARACTER_FIELDS/);
  assert.match(wizard, /FACTION_FIELDS/);

  const ide = fs.readFileSync(path.join(root, 'packages/inkos-studio/src/pages/IdePage.tsx'), 'utf8');
  assert.match(ide, /CharactersDrawer/);
  assert.match(ide, /FactionsDrawer/);
  assert.match(ide, /WorldDrawer/);
  assert.match(ide, /LocationsDrawer/);

  for (const rel of [
    'components/entity-manager/EntityManager.tsx',
    'components/entity-manager/types.ts',
    'components/entity-manager/serialize.ts',
    'components/drawers/CharactersDrawer.tsx',
    'components/drawers/FactionsDrawer.tsx',
    'components/drawers/WorldDrawer.tsx',
    'components/drawers/LocationsDrawer.tsx',
  ]) {
    assert.ok(fs.existsSync(path.join(root, 'packages/inkos-studio/src', rel)), rel);
  }

  const ai = fs.readFileSync(path.join(root, 'packages/inkos-studio-server/src/ai-service.js'), 'utf8');
  assert.match(ai, /2～6/);
  assert.doesNotMatch(ai, /生成3个核心人物/);
  ok('frontend EntityManager contracts + AI unbounded count');
}

console.log(`\n${n} checks passed.`);
