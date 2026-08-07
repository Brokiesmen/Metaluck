interface Props {
  label: string;
  hint?: string;
  kind: 'toggle' | 'link';
  value?: boolean;
  onToggle?: (next: boolean) => void;
  onClick?: () => void;
}

export function SettingRow({ label, hint, kind, value, onToggle, onClick }: Props) {
  const clickable = kind === 'link';
  return (
    <div
      className="sh-setting"
      role={clickable ? 'button' : undefined}
      onClick={clickable ? onClick : undefined}
    >
      <div className="sh-setting-meta">
        <span className="sh-setting-label">{label}</span>
        {hint && <span className="sh-setting-hint">{hint}</span>}
      </div>
      {kind === 'toggle' ? (
        <button
          type="button"
          className={`sh-toggle${value ? ' sh-toggle--on' : ''}`}
          role="switch"
          aria-checked={Boolean(value)}
          onClick={() => onToggle?.(!value)}
        >
          <span className="sh-toggle-knob" />
        </button>
      ) : (
        <span className="sh-setting-chevron" aria-hidden>›</span>
      )}
    </div>
  );
}
