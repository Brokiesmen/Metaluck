interface Props {
  icon?: string;
  title: string;
  hint?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ icon = '🗂️', title, hint, actionLabel, onAction }: Props) {
  return (
    <div className="sh-empty">
      <span className="sh-empty-icon" aria-hidden>{icon}</span>
      <div className="sh-empty-title">{title}</div>
      {hint && <div className="sh-empty-hint">{hint}</div>}
      {actionLabel && (
        <button type="button" className="sh-empty-btn" onClick={onAction}>
          {actionLabel}
        </button>
      )}
    </div>
  );
}
