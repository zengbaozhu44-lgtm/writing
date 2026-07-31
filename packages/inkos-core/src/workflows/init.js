import fs from 'node:fs';
import path from 'node:path';
import { copyDir, exists, readText, v4TemplateDir, writeText } from '../lib/paths.js';

export function initBookV4({ bookId, title, genre, targetDir }) {
  const template = v4TemplateDir();
  if (!exists(template)) throw new Error(`V4 模板不存在: ${template}`);
  if (exists(targetDir)) throw new Error(`目录已存在: ${targetDir}`);

  copyDir(template, targetDir);
  const createdAt = new Date().toISOString();
  const replacements = { '{{BOOK_ID}}': bookId, '{{BOOK_TITLE}}': title, '{{GENRE}}': genre, '{{CREATED_AT}}': createdAt };

  const walk = (dir) => {
    for (const name of fs.readdirSync(dir)) {
      const p = path.join(dir, name);
      if (fs.statSync(p).isDirectory()) walk(p);
      else if (/\.(json|md|yaml|yml)$/.test(name)) {
        let text = readText(p);
        for (const [k, v] of Object.entries(replacements)) text = text.split(k).join(v);
        writeText(p, text);
      }
    }
  };
  walk(targetDir);

  return { bookId, title, genre, targetDir, schemaVersion: 4, brainEnabled: true };
}
