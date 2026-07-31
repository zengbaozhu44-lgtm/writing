import { ReactNode, useEffect } from 'react';

interface Props {
  title: string;
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  width?: 'md' | 'lg' | 'xl';
  /** 低分强制审计时禁止关闭 */
  forceOpen?: boolean;
}

export function IdeDrawer({ title, open, onClose, children, width = 'lg', forceOpen = false }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !forceOpen) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose, forceOpen]);

  if (!open) return null;

  return (
    <div
      className="ide-drawer-overlay"
      onClick={() => { if (!forceOpen) onClose(); }}
    >
      <div
        className={`ide-drawer ide-drawer-${width}`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <header className="ide-drawer-header">
          <h2>{title}{forceOpen ? ' · 请先审计' : ''}</h2>
          {!forceOpen && (
            <button type="button" className="btn-ghost ide-drawer-close" onClick={onClose}>✕</button>
          )}
        </header>
        <div className="ide-drawer-body">{children}</div>
      </div>
    </div>
  );
}
