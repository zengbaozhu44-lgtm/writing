import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const NEGATIVE_ROOT = path.join(__dirname, '..', 'negative');

export function loadWitnessManifest() {
  const file = path.join(NEGATIVE_ROOT, 'witnesses.json');
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

export function loadGuardManifest() {
  const file = path.join(NEGATIVE_ROOT, 'guards.json');
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}
