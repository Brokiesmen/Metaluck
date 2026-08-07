import { mockProfile } from './mockData';
import { useAuth } from './auth/AuthProvider';

interface Props {
  title: string;
  showBalance?: boolean;
  /** Компактный вариант для Telegram (скрывает username). */
  compact?: boolean;
  onMenu?: () => void;
}

/** Общий TopBar: аватар, username, баланс, уведомления. Один компонент для обоих shell'ов. */
export function TopBar({ title, showBalance = true, compact = false, onMenu }: Props) {
  const { user } = useAuth();
  const username = user?.username ?? mockProfile.name;
  // Аватар из auth только если это emoji (демо); URL-аватары тут не рендерим.
  const avatar = user?.avatar && user.avatar.length <= 4 ? user.avatar : mockProfile.avatar;

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

        <button type="button" className="sh-topbar-bell" aria-label="Notifications">
          <span aria-hidden>🔔</span>
          <span className="sh-topbar-bell-dot" aria-hidden />
        </button>

        <div className="sh-topbar-user">
          <span className="sh-topbar-avatar" aria-hidden>{avatar}</span>
          <span className="sh-topbar-username">{username}</span>
        </div>
      </div>
    </header>
  );
}
