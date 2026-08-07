interface Props {
  title: string;
  hint: string;
  icon: string;
  status: 'available' | 'claimed' | 'locked';
  onClaim?: () => void;
}

const CTA: Record<Props['status'], string> = {
  available: 'Claim',
  claimed: 'Claimed',
  locked: 'Locked',
};

export function RewardCard({ title, hint, icon, status, onClaim }: Props) {
  return (
    <div className={`sh-card sh-reward sh-reward--${status}`}>
      <span className="sh-reward-icon" aria-hidden>{icon}</span>
      <div className="sh-reward-meta">
        <span className="sh-reward-title">{title}</span>
        <span className="sh-reward-hint">{hint}</span>
      </div>
      <button
        type="button"
        className="sh-reward-btn"
        disabled={status !== 'available'}
        onClick={onClaim}
      >
        {CTA[status]}
      </button>
    </div>
  );
}
