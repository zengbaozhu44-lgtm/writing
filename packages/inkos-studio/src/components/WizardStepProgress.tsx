export interface WizardSubStep {
  label: string;
  status: 'pending' | 'running' | 'done' | 'failed';
}

interface Props {
  title: string;
  steps: WizardSubStep[];
}

export function WizardStepProgress({ title, steps }: Props) {
  if (!steps.length) return null;
  return (
    <div className="wizard-sub-progress">
      <div className="wizard-sub-title">{title}</div>
      {steps.map((s) => (
        <div key={s.label} className={`wizard-sub-step ${s.status}`}>
          <span className="wizard-sub-icon">
            {s.status === 'done' ? '✓' : s.status === 'running' ? '…' : s.status === 'failed' ? '✗' : '○'}
          </span>
          <span>{s.label}{s.status === 'running' ? '…' : ''}</span>
        </div>
      ))}
    </div>
  );
}
