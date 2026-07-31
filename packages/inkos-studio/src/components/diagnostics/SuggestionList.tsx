import { ChapterDiagnosisSuggestion } from '../../api/client';

interface Props {
  suggestions: ChapterDiagnosisSuggestion[];
  onAction?: (action: string, suggestion: ChapterDiagnosisSuggestion) => void;
}

export function SuggestionList({ suggestions = [], onAction }: Props) {
  if (!suggestions.length) {
    return (
      <div className="diag-suggestions">
        <div className="panel-title">建议</div>
        <p className="text-dim">暂无修复建议</p>
      </div>
    );
  }
  return (
    <div className="diag-suggestions">
      <div className="panel-title">建议</div>
      <ul className="diag-suggestion-list">
        {suggestions.map((s) => (
          <li key={s.id} className={`sev-${s.severity}`}>
            <span>{s.text}</span>
            {s.action && onAction && (
              <button type="button" className="btn btn-sm" onClick={() => onAction(s.action!, s)}>
                处理
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
