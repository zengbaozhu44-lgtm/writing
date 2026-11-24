import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE_ROOT = path.join(__dirname, '..');

const CATEGORIES = [
  'action',
  'consequence',
  'dialogue',
  'belief',
  'rumor',
  'negation',
  'temporal',
  'conflict',
  'coreference',
  'plan-boundary',
];

/**
 * Load all fixtures from golden/reality/{category}/fixtures.json
 * @returns {object[]}
 */
export function loadAllFixtures() {
  const out = [];
  for (const category of CATEGORIES) {
    const file = path.join(FIXTURE_ROOT, category, 'fixtures.json');
    if (!fs.existsSync(file)) continue;
    const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
    const list = Array.isArray(raw) ? raw : raw.fixtures || [];
    for (const f of list) {
      out.push({ ...f, category: f.category || category });
    }
  }
  return out;
}

export function loadFixturesByCategory(category) {
  const file = path.join(FIXTURE_ROOT, category, 'fixtures.json');
  if (!fs.existsSync(file)) return [];
  const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
  const list = Array.isArray(raw) ? raw : raw.fixtures || [];
  return list.map((f) => ({ ...f, category: f.category || category }));
}

export { CATEGORIES, FIXTURE_ROOT };
