interface Props {
  label: string;
  value: string;
  delta?: string;
  icon?: string;
}

export function StatCard({ label, value, delta, icon }: Props) {
  return (
    <div className="sh-card sh-stat">
      <div className="sh-stat-top">
        <span className="sh-stat-label">{label}</span>
        {icon && <span className="sh-stat-icon" aria-hidden>{icon}</span>}
      </div>
      <div className="sh-stat-value">{value}</div>
      {delta && <div className="sh-stat-delta">{delta}</div>}
    </div>
  );
}
