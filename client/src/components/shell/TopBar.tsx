import { mockProfile } from './mockData';
import { useAuth } from './auth/AuthProvider';
import { StarIcon } from '../StarIcon';

interface Props {
  title: string;
  showBalance?: boolean;
  /** Компактный вариант для Telegram (скрывает username). */
  compact?: boolean;
  onMenu?: () => void;
  /** Live mode overrides (skip mock/auth fallbacks). */
  balanceLabel?: string;
  userName?: string;
  userAvatar?: string | null;
  onBalanceClick?: () => void;
  onSettings?: () => void;
}

function isEmojiAvatar(value: string | null | undefined): boolean {
  return Boolean(value && value.length <= 4 && !/^https?:\/\//i.test(value));
}

function TopBarView({
  title,
  showBalance = true,
  compact = false,
  onMenu,
  balanceText,
  username,
  avatar,
  onBalanceClick,
  onSettings,
}: {
  title: string;
  showBalance?: boolean;
  compact?: boolean;
  onMenu?: () => void;
  balanceText: string;
  username: string;
  avatar: string | null | undefined;
  onBalanceClick?: () => void;
  onSettings?: () => void;
}) {
  const emoji = isEmojiAvatar(avatar) ? avatar : null;
  const avatarUrl = avatar && !emoji ? avatar : null;

  return (
    <header className={`sh-topbar${compact ? ' sh-topbar--compact' : ''}`}>
      {onMenu && (
        <button type="button" className="sh-topbar-menu" aria-label="Menu" onClick={onMenu}>
          ☰
        </button>
      )}
      <span className="sh-topbar-title">{title}</span>

      <div className="sh-topbar-right">
        {showBalance && (
          <button
            type="button"
            className="sh-topbar-balance"
            onClick={onBalanceClick}
            disabled={!onBalanceClick}
          >
            <span className="sh-topbar-balance-amt">{balanceText}</span>
            <StarIcon size={14} animate={false} glow={false} />
          </button>
        )}

        {onSettings && (
          <button type="button" className="sh-topbar-bell" aria-label="Settings" onClick={onSettings}>
            <span aria-hidden>⚙️</span>
          </button>
        )}

        <div className="sh-topbar-user">
          {avatarUrl ? (
            <img className="sh-topbar-avatar sh-topbar-avatar--img" src={avatarUrl} alt="" />
          ) : (
            <span className="sh-topbar-avatar" aria-hidden>{emoji || '✦'}</span>
          )}
          {!compact && <span className="sh-topbar-username">{username}</span>}
        </div>
      </div>
    </header>
  );
}

function TopBarPreview(props: Props) {
  const { user } = useAuth();
  const username = user?.username ?? mockProfile.name;
  const avatar =
    user?.avatar && isEmojiAvatar(user.avatar) ? user.avatar : mockProfile.avatar;

  return (
    <TopBarView
      title={props.title}
      showBalance={props.showBalance}
      compact={props.compact}
      onMenu={props.onMenu}
      balanceText="1 240"
      username={username}
      avatar={avatar}
      onBalanceClick={props.onBalanceClick}
      onSettings={props.onSettings}
    />
  );
}

/** Общий TopBar: аватар, username, баланс. Один компонент для обоих shell'ов. */
export function TopBar(props: Props) {
  const live = props.balanceLabel != null || props.userName != null;
  if (live) {
    return (
      <TopBarView
        title={props.title}
        showBalance={props.showBalance}
        compact={props.compact}
        onMenu={props.onMenu}
        balanceText={props.balanceLabel ?? '0'}
        username={props.userName ?? mockProfile.name}
        avatar={props.userAvatar}
        onBalanceClick={props.onBalanceClick}
        onSettings={props.onSettings}
      />
    );
  }
  return <TopBarPreview {...props} />;
}
