#!/usr/bin/env node
/**
 * Runtime Regression — 确保 Studio/API 变更不影响 Runtime 产出
 *
 * 对比 golden snapshot 与当前 Runtime 产出文件 hash。
 * 不调用 LLM，只验证文件一致性。
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');
const BOOK_DIR = path.join(ROOT, 'books/我的小说/books/_runtime-test');
const GOLDEN_DIR = path.join(__dirname, 'golden');
const BRAIN = path.join(BOOK_DIR, 'novel/_system/brain');

const TRACKED = [
  'ch_0001_plan.json',
  'ch_0001_scenes.json',
  'ch_0001_run.json',
  'story_health.json',
  'adaptive_state.json',
  'metrics_dashboard.json',
  'decision_history.yaml',
  'conflict_history.yaml',
];

function hashFile(p) {
  return crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex').slice(0, 16);
}

function assert(cond, msg) {
  if (!cond) throw new Error(`REGRESSION FAIL: ${msg}`);
}

function captureGolden() {
  fs.mkdirSync(GOLDEN_DIR, { recursive: true });
  const manifest = {};
  for (const name of TRACKED) {
    const src = path.join(BRAIN, name);
    if (!fs.existsSync(src)) continue;
    const hash = hashFile(src);
    manifest[name] = hash;
    fs.copyFileSync(src, path.join(GOLDEN_DIR, name));
  }
  fs.writeFileSync(path.join(GOLDEN_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2));
  console.log('✓ Golden snapshot captured:', Object.keys(manifest).length, 'files');
}

function runRegression() {
  const manifestPath = path.join(GOLDEN_DIR, 'manifest.json');
  assert(fs.existsSync(manifestPath), 'Golden manifest missing — run: node tests/runtime-regression/regression.js capture');

  const golden = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const failures = [];

  for (const [name, expectedHash] of Object.entries(golden)) {
    const src = path.join(BRAIN, name);
    if (!fs.existsSync(src)) {
      failures.push(`${name}: file missing`);
      continue;
    }
    const currentHash = hashFile(src);
    if (currentHash !== expectedHash) {
      failures.push(`${name}: hash ${currentHash} !== golden ${expectedHash}`);
    }
  }

  if (failures.length) {
    console.error('REGRESSION FAILURES:');
    failures.forEach((f) => console.error('  -', f));
    process.exit(1);
  }

  console.log(`✓ Runtime regression passed (${Object.keys(golden).length} files)`);
}

function testApiGateway() {
  // Verify forbidden routes are registered
  const gatewayPath = path.join(ROOT, 'packages/inkos-studio-server/src/api-gateway.js');
  const src = fs.readFileSync(gatewayPath, 'utf8');
  assert(src.includes('FORBIDDEN'), 'api-gateway must define FORBIDDEN routes');
  assert(src.includes('sceneText') || src.includes('/scenes'), 'sceneText must be forbidden');
  assert(!src.includes('saveSceneText'), 'api-gateway must not reference saveSceneText');
  console.log('✓ API gateway boundary check passed');
}

function testRuntimeLocked() {
  const archPath = path.join(ROOT, 'packages/inkos-runtime/RUNTIME_ARCHITECTURE.md');
  assert(fs.existsSync(archPath), 'RUNTIME_ARCHITECTURE.md must exist');
  const content = fs.readFileSync(archPath, 'utf8');
  assert(content.includes('LOCKED'), 'Runtime must be marked LOCKED');
  console.log('✓ Runtime architecture freeze doc exists');
}

function testSchemas() {
  const schemaDir = path.join(ROOT, '.inkos/schemas/api');
  const required = ['dashboard', 'scene', 'planner', 'health', 'events', 'memory'];
  for (const name of required) {
    assert(fs.existsSync(path.join(schemaDir, `${name}.schema.json`)), `Missing schema: ${name}`);
  }
  console.log('✓ API schemas present');
}

const cmd = process.argv[2] || 'test';

try {
  if (cmd === 'capture') captureGolden();
  else {
    testRuntimeLocked();
    testApiGateway();
    testSchemas();
    runRegression();
  }
} catch (err) {
  console.error(err.message);
  process.exit(1);
}
