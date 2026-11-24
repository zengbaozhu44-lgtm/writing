import fs from 'node:fs';
import path from 'node:path';

/**
 * 原子写 — 写同目录临时文件后 rename，避免并发读方读到半截 JSON。
 * hash-dependency 的 state/dependency_tree/dependency_graph/canon_state
 * 会被 ch7 生成流程与 canon 后台同步并发读写，非原子写会间歇性
 * 抛「Unexpected end of JSON input」→ 被包装成「系统内部错误」。
 */
export function atomicWriteJson(filePath, data) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const tmp = `${filePath}.tmp-${process.pid}-${Date.now()}`;
  try {
    fs.writeFileSync(tmp, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
    fs.renameSync(tmp, filePath);
  } catch (err) {
    try { fs.unlinkSync(tmp); } catch { /* ignore */ }
    throw err;
  }
}
