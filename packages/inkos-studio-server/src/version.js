import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Studio API 版本 — Compatibility Layer */
export const API_VERSION = '1.0.0';

/** 从 @inkos/runtime package.json 读取，不硬编码 */
export function getRuntimeVersion() {
  const pkgPath = path.resolve(__dirname, '../../inkos-runtime/package.json');
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
  return pkg.version;
}

export function envelope(data) {
  return {
    apiVersion: API_VERSION,
    runtimeVersion: getRuntimeVersion(),
    ...data,
  };
}
