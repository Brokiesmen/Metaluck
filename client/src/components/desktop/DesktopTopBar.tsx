import { useEffect, useRef, useState } from 'react';
import type { TelegramUser } from '../../types';
import { useSettings } from '../../settings/SettingsContext';
import { StarIcon } from '../StarIcon';
import { IconBell } from './desktopIcons';

interface Props {
  user: TelegramUser;
  balance: number;
  title: string;
}

export function DesktopTopBar({ user, balance, title }: Props) {
  const { t, locale } = useSettings();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const displayName = user.username
    ? `@${user.username}`
    : [user.first_name, user.last_name].filter(Boolean).join(' ') || `user${user.id}`;
  const initials = (user.first_name?.[0] || user.username?.[0] || 'M').toUpperCase();

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!panelRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  return (
    <header className="desk-topbar">
      <div className="desk-topbar-title">{title}</div>

      <div className="desk-topbar-right">
        <div className="desk-balance num" title={t.desktop.balance}>
          {balance.toLocaleString(locale)}
          <StarIcon size={16} />
        </div>

        <div className="desk-notify" ref={panelRef}>
          <button
            type="button"
            className={`desk-icon-btn${open ? ' is-open' : ''}`}
            aria-label={t.desktop.notifications}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            <IconBell />
          </button>
          {open && (
            <div className="desk-notify-panel" role="dialog" aria-label={t.desktop.notifications}>
              <div className="desk-notify-head">{t.desktop.notifications}</div>
              <p className="desk-notify-empty">{t.desktop.noNotifications}</p>
            </div>
          )}
        </div>

        <div className="desk-user">
          {user.photo_url ? (
            <img className="desk-avatar" src={user.photo_url} alt="" width={36} height={36} />
          ) : (
            <span className="desk-avatar desk-avatar--fallback">{initials}</span>
          )}
          <span className="desk-username">{displayName}</span>
        </div>
      </div>
    </header>
  );
}
