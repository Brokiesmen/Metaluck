interface Props {
  title: string;
  icon: string;
  subtitle?: string;
  hot?: boolean;
  onPlay?: () => void;
}

export function GameCard({ title, icon, subtitle, hot, onPlay }: Props) {
  return (
    <button type="button" className="sh-card sh-game" onClick={onPlay}>
      {hot && <span className="sh-game-badge">HOT</span>}
      <span className="sh-game-icon" aria-hidden>{icon}</span>
      <span className="sh-game-title">{title}</span>
      {subtitle && <span className="sh-game-sub">{subtitle}</span>}
    </button>
  );
}
