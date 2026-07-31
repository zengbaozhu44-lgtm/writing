import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useBookPath } from '../hooks/useBookPath';

export function ModuleBackBar({ label = '创作中心' }: { label?: string }) {
  const { to: bookTo } = useBookPath();
  return (
    <div className="module-back-bar">
      <Link to={bookTo('create')} className="btn-ghost module-back-link">← {label}</Link>
    </div>
  );
}

export function ModuleEmptyPanel({ title, hint, action }: { title: string; hint: string; action?: ReactNode }) {
  return (
    <div className="module-empty-panel">
      <h3>{title}</h3>
      <p>{hint}</p>
      {action}
    </div>
  );
}
