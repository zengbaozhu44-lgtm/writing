import type { ReactNode } from 'react';

export function Field({
  label,
  value,
  onChange,
  onBlur,
  multiline = false,
  readOnly = false,
  placeholder,
}: {
  label: string;
  value: string;
  onChange?: (v: string) => void;
  onBlur?: (v: string) => void;
  multiline?: boolean;
  readOnly?: boolean;
  placeholder?: string;
}) {
  return (
    <label className="form-field">
      <span className="form-label">{label}</span>
      {multiline ? (
        <textarea
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange?.(e.target.value)}
          onBlur={(e) => onBlur?.(e.target.value)}
          readOnly={readOnly}
          rows={4}
        />
      ) : (
        <input
          type="text"
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange?.(e.target.value)}
          onBlur={(e) => onBlur?.(e.target.value)}
          readOnly={readOnly}
        />
      )}
    </label>
  );
}

export function PageHeader({ title, subtitle, actions }: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="page-header">
      <div>
        <h1>{title}</h1>
        {subtitle && <p className="page-sub">{subtitle}</p>}
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </header>
  );
}

export function SaveButton({ onClick, saving, saved }: {
  onClick: () => void;
  saving?: boolean;
  saved?: boolean;
}) {
  return (
    <button type="button" className="btn btn-primary" onClick={onClick} disabled={saving}>
      {saving ? '保存中…' : saved ? '已保存 ✓' : '保存'}
    </button>
  );
}
