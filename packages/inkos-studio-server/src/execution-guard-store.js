/**
 * 每本书一个 Execution Guard 实例（Studio 稳定层）
 */
import { createExecutionGuard } from '../../inkos-runtime/src/index.js';

/** @type {Map<string, ReturnType<createExecutionGuard>>} */
const guards = new Map();

export function getBookExecutionGuard(bookDir) {
  if (!guards.has(bookDir)) {
    guards.set(bookDir, createExecutionGuard(bookDir));
  }
  return guards.get(bookDir);
}
