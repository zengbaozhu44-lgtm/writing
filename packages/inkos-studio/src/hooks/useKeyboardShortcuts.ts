import { useEffect } from 'react';

export type ShortcutHandlers = {
  /** Ctrl/Cmd+Enter — 触发生成 */
  onGenerate?: () => void;
  /** Ctrl/Cmd+Shift+D — 打开诊断 */
  onDiagnostics?: () => void;
  /** Ctrl/Cmd+S — 保存（可选，IdePage 已有） */
  onSave?: () => void;
};

export function useKeyboardShortcuts(handlers: ShortcutHandlers, enabled = true) {
  useEffect(() => {
    if (!enabled) return undefined;
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;
      const key = e.key.toLowerCase();
      if (key === 'enter' && handlers.onGenerate) {
        e.preventDefault();
        handlers.onGenerate();
      } else if (key === 'd' && e.shiftKey && handlers.onDiagnostics) {
        e.preventDefault();
        handlers.onDiagnostics();
      } else if (key === 's' && handlers.onSave) {
        e.preventDefault();
        handlers.onSave();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handlers, enabled]);
}
