import { mockProfile } from './mockData';

interface Props {
  title: string;
  showBalance?: boolean;
  compact?: boolean;
  onMenu?: () => void;
}

export function TopBar({ title, showBalance = true, compact = false, onMenu }: Props) {
  return (
    <header className={`sh-topbar${compact ? ' sh-topbar--compact' : ''}`}>
      {onMenu && (
        <button type="button" className="sh-topbar-menu" aria-label="Menu" onClick={onMenu}>
          ☰
        </button>
      )}
      <span className="sh-topbar-title">{title}</span>
      <div className="sh-topbar-right">
        {showBalance && <span className="sh-topbar-balance">1 240 ★</span>}
        <span className="sh-topbar-avatar" aria-hidden>{mockProfile.avatar}</span>
      </div>
    </header>
  );
}
