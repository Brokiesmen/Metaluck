import { useEffect, useState } from 'react';
import { api } from '../api';
import { RARITY, GIFT_IMAGES } from '../data';
import { RulesModal } from './RulesModal';
import { ReferralCard } from './ReferralCard';
import { ModalShell } from './ModalShell';
import { useSettings } from '../settings/SettingsContext';
import { tf } from '../i18n/tf';
import type { TelegramUser, HistoryEntry, Rarity, ProgressView } from '../types';

interface Props {
  user: TelegramUser;
  balance: number;
  isDev: boolean;
  isAdmin?: boolean;
  onOpenAdmin?: () => void;
  onOpenSettings?: () => void;
  onBalanceUpdate: (b: number) => void;
  openInvoice?: (url: string, cb?: (status: 'paid' | 'cancelled' | 'failed' | 'pending') => void) => void;
  isTelegram: boolean;
  tg?: any;
}

function Avatar({ user }: { user: TelegramUser }) {
  if (user.photo_url) {
    return <img className="avatar" src={user.photo_url} alt="" />;
  }
  const initials = [user.first_name[0], user.last_name?.[0]]
    .filter(Boolean).join('').toUpperCase();
  return <div className="avatar avatar-placeholder">{initials}</div>;
}

interface GiftDetailProps {
  entry: HistoryEntry;
  onClose: () => void;
  locale: string;
  rarityLabel: (r: Rarity) => string;
  labels: { rarity: string; from: string; date: string; close: string };
}

function GiftDetail({ entry, onClose, locale, rarityLabel, labels }: GiftDetailProps) {
  const r   = RARITY[entry.prize.rarity];
  const img = GIFT_IMAGES[entry.prize.id];

  const rarityStars: Record<string, number> = { gray: 1, blue: 2, purple: 3, gold: 4 };
  const stars = rarityStars[entry.prize.rarity] ?? 1;

  const formatDate = (ts: number) =>
    new Date(ts).toLocaleString(locale, {
      day: '2-digit', month: '2-digit',
      hour: '2-digit', minute: '2-digit',
    });

  return (
    <ModalShell onClose={onClose} sheetClassName="gift-detail-sheet">
      <div className="modal-handle" />

      <div className="modal-icon-wrap"
        style={{ borderColor: r.border, color: r.border }}>
        {img?.animated
          ? <img src={img.animated} alt={entry.prize.name} className="modal-anim" loading="lazy" />
          : img
            ? <img src={img.image} alt={entry.prize.name} className="modal-anim" loading="lazy" />
            : <span className="modal-icon">{entry.prize.icon}</span>}
      </div>

      <div className="modal-rarity" style={{ color: r.text }}>{rarityLabel(entry.prize.rarity)}</div>
      <div className="modal-name">{entry.prize.name}</div>

      <div className="gift-detail-stats">
        <div className="gift-stat-row">
          <span className="gift-stat-label">{labels.rarity}</span>
          <span className="gift-stat-value num">
            {Array.from({ length: 4 }).map((_, i) => (
              <span key={i} style={{ opacity: i < stars ? 1 : 0.2 }}>●</span>
            ))}
          </span>
        </div>
        <div className="gift-stat-row">
          <span className="gift-stat-label">{labels.from}</span>
          <span className="gift-stat-value">{entry.caseName}</span>
        </div>
        <div className="gift-stat-row">
          <span className="gift-stat-label">{labels.date}</span>
          <span className="gift-stat-value num">{formatDate(entry.timestamp)}</span>
        </div>
      </div>

      <button type="button" className="tg-btn modal-action" onClick={onClose}>{labels.close}</button>
    </ModalShell>
  );
}

const CACHE_KEY = 'metaluck_history_v1';
const PAGE_SIZE = 20;

function readCache(): HistoryEntry[] {
  try { return JSON.parse(localStorage.getItem(CACHE_KEY) ?? '[]'); } catch { return []; }
}
function writeCache(items: HistoryEntry[]) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(items.slice(0, 60))); } catch {}
}

export function Cabinet({ user, isDev, isAdmin, onOpenAdmin, onOpenSettings, tg }: Props) {
  const { t, locale } = useSettings();
  const [history, setHistory]     = useState<HistoryEntry[]>(() => readCache());
  const [historyFresh, setFresh]  = useState(false);
  const [hasMore, setHasMore]     = useState(false);
  const [loadingMore, setLoadMore]= useState(false);
  const [page, setPage]           = useState(0);
  const [selected, setSelected]   = useState<HistoryEntry | null>(null);
  const [showRules, setShowRules] = useState(false);
  const [progress, setProgress] = useState<ProgressView | null>(null);
  const [nowTick, setNowTick] = useState(() => Date.now());

  useEffect(() => {
    api.getHistory(0, PAGE_SIZE).then(res => {
      setHistory(res.history);
      setHasMore(res.pagination.hasMore);
      setPage(0);
      setFresh(true);
      writeCache(res.history);
    }).catch(() => setFresh(true));

    api.getProgress().then(setProgress).catch(() => {});
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => {
      const now = Date.now();
      setNowTick(now);
      if (progress?.tasksResetAt && now >= progress.tasksResetAt) {
        api.getProgress().then(setProgress).catch(() => {});
      }
    }, 30_000);
    return () => window.clearInterval(id);
  }, [progress?.tasksResetAt]);

  const loadMore = async () => {
    if (loadingMore) return;
    setLoadMore(true);
    try {
      const next = page + 1;
      const res = await api.getHistory(next, PAGE_SIZE);
      setHistory(prev => {
        const combined = [...prev, ...res.history];
        writeCache(combined);
        return combined;
      });
      setHasMore(res.pagination.hasMore);
      setPage(next);
    } finally {
      setLoadMore(false);
    }
  };

  const fullName = [user.first_name, user.last_name].filter(Boolean).join(' ');
  const rarityLabel = (r: Rarity) => t.rarity[r];

  const taskLabel = (id: string) => {
    switch (id) {
      case 'daily_login': return t.cabinet.taskDailyLogin;
      case 'open_case': return t.cabinet.taskOpenCase;
      case 'open_paid_case': return t.cabinet.taskOpenPaidCase;
      case 'claim_daily': return t.cabinet.taskClaimDaily;
      case 'play_coinflip': return t.cabinet.taskPlayCoinflip;
      case 'play_blackjack': return t.cabinet.taskPlayBlackjack;
      case 'play_minerush': return t.cabinet.taskPlayMinerush;
      case 'play_arena': return t.cabinet.taskPlayArena;
      case 'play_aviator': return t.cabinet.taskPlayAviator;
      case 'win_game': return t.cabinet.taskWinGame;
      case 'win_coinflip': return t.cabinet.taskWinCoinflip;
      case 'win_blackjack': return t.cabinet.taskWinBlackjack;
      case 'win_minerush': return t.cabinet.taskWinMinerush;
      case 'win_arena': return t.cabinet.taskWinArena;
      case 'win_aviator': return t.cabinet.taskWinAviator;
      default: return id;
    }
  };

  const tasksResetLeft = progress?.tasksResetAt
    ? Math.max(0, progress.tasksResetAt - nowTick)
    : 0;
  const tasksResetText = (() => {
    if (!tasksResetLeft) return '';
    const h = Math.floor(tasksResetLeft / 3600000);
    const m = Math.floor((tasksResetLeft % 3600000) / 60000);
    if (h > 0) return `${h}ч ${m}м`;
    return `${m}м`;
  })();

  const formatDate = (ts: number) =>
    new Date(ts).toLocaleString(locale, {
      day: '2-digit', month: '2-digit',
      hour: '2-digit', minute: '2-digit',
    });

  const stats = {
    total:  history.length,
    gold:   history.filter(e => e.prize.rarity === 'gold').length,
    purple: history.filter(e => e.prize.rarity === 'purple').length,
    blue:   history.filter(e => e.prize.rarity === 'blue').length,
  };

  const xpPct = progress
    ? Math.min(100, Math.round((progress.xp / Math.max(1, progress.xpForNextLevel)) * 100))
    : 0;

  return (
    <div className="cabinet">

      <div className="tg-section">
        <div className="profile-row">
          <Avatar user={user} />
          <div className="profile-info">
            <div className="profile-name-row">
              <div className="profile-name">{fullName}</div>
              {progress && (
                <span className="level-badge">{t.cabinet.level} {progress.level}</span>
              )}
            </div>
            {user.username && <div className="profile-username">@{user.username}</div>}
            {isDev && <div className="dev-badge">{t.cabinet.devMode}</div>}
          </div>
        </div>
      </div>

      {progress && (
        <>
          <div className="tg-section-title">{t.cabinet.xpLabel}</div>
          <div className="tg-section">
            <div className="xp-block">
              <div className="xp-meta">
                <span className="xp-current num">
                  {progress.xp.toLocaleString(locale)} / {progress.xpForNextLevel.toLocaleString(locale)} XP
                </span>
                <span className="xp-hint">
                  {tf(t.cabinet.xpToNext, { n: Math.max(0, progress.xpForNextLevel - progress.xp) })}
                </span>
              </div>
              <div className="xp-bar" role="progressbar" aria-valuenow={xpPct} aria-valuemin={0} aria-valuemax={100}>
                <div className="xp-bar-fill" style={{ width: `${xpPct}%` }} />
              </div>
            </div>
            <div className="xp-tasks">
              <div className="xp-tasks-title">{t.cabinet.tasks}</div>
              {tasksResetText ? (
                <div className="xp-tasks-reset">{tf(t.cabinet.tasksResetIn, { t: tasksResetText })}</div>
              ) : null}
              {progress.tasks.map(task => (
                <div key={task.id} className={`xp-task${task.done ? ' done' : ''}`}>
                  <span className="xp-task-check">{task.done ? '✓' : '○'}</span>
                  <span className="xp-task-label">{taskLabel(task.id)}</span>
                  {task.done && <span className="xp-task-done">{t.cabinet.done}</span>}
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      <div className="tg-section">
        <div className="balance-block">
          <button type="button" className="rules-inline-btn" onClick={() => setShowRules(true)}>
            {t.rules.button}
          </button>
          {onOpenSettings && (
            <button
              type="button"
              className="rules-inline-btn"
              onClick={onOpenSettings}
              aria-label={t.settings.ariaOpen}
            >
              ⚙️ {t.settings.title}
            </button>
          )}
          {isAdmin && onOpenAdmin && (
            <button type="button" className="rules-inline-btn admin-open-btn" onClick={onOpenAdmin}>
              {t.admin.open}
            </button>
          )}
        </div>
      </div>

      {stats.total > 0 && (
        <>
          <div className="tg-section-title">{t.cabinet.stats}</div>
          <div className="tg-section">
            <div className="cabinet-stats-grid">
              <div className="cabinet-stat">
                <div className="cabinet-stat-value num">{stats.total}</div>
                <div className="cabinet-stat-label">{t.cabinet.opened}</div>
              </div>
              <div className="cabinet-stat">
                <div className="cabinet-stat-value num" style={{ color: '#e8c06a' }}>{stats.gold}</div>
                <div className="cabinet-stat-label">{t.cabinet.legendary}</div>
              </div>
              <div className="cabinet-stat">
                <div className="cabinet-stat-value num" style={{ color: '#b0acf5' }}>{stats.purple}</div>
                <div className="cabinet-stat-label">{t.cabinet.epic}</div>
              </div>
              <div className="cabinet-stat">
                <div className="cabinet-stat-value num" style={{ color: '#a8c8f0' }}>{stats.blue}</div>
                <div className="cabinet-stat-label">{t.cabinet.rare}</div>
              </div>
            </div>
          </div>
        </>
      )}

      <div className="tg-section-title">{t.cabinet.invite}</div>
      <ReferralCard tg={tg} />

      <div className="tg-section-title">
        {t.cabinet.history}
        {history.length > 0 && <span className="history-count num">{history.length}</span>}
      </div>

      {history.length === 0 && historyFresh ? (
        <div className="tg-section tg-hint-text">{t.cabinet.emptyHistory}</div>
      ) : history.length === 0 ? (
        <div className="tg-section tg-hint-text" style={{ color: 'var(--tg-hint)' }}>{t.common.loading}</div>
      ) : (
        <div className="tg-section history-list">
          {history.map((entry, i) => {
            const r   = RARITY[entry.prize.rarity];
            const img = GIFT_IMAGES[entry.prize.id];
            return (
              <div
                key={i}
                className={`history-item history-item-btn${i < history.length - 1 ? ' sep' : ''}`}
                onClick={() => setSelected(entry)}
              >
                <div className="history-thumb" style={{ borderColor: r.border, color: r.border }}>
                  {img
                    ? <img src={img.image} alt={entry.prize.name} className="history-thumb-img" loading="lazy" />
                    : <span>{entry.prize.icon}</span>}
                </div>
                <div className="history-info">
                  <div className="history-name">{entry.prize.name}</div>
                  <div className="history-meta">
                    <span style={{ color: r.text }}>{rarityLabel(entry.prize.rarity)}</span>
                    {' · '}
                    <span style={{ color: 'var(--tg-hint)' }}>{entry.caseName}</span>
                  </div>
                </div>
                <div className="history-right">
                  <div className="history-date num">{formatDate(entry.timestamp)}</div>
                  <div className="history-chevron">›</div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {hasMore && (
        <button className="leaders-load-more" onClick={loadMore} disabled={loadingMore}>
          {loadingMore ? t.common.loading : t.common.loadMore}
        </button>
      )}

      {selected && (
        <GiftDetail
          entry={selected}
          onClose={() => setSelected(null)}
          locale={locale}
          rarityLabel={rarityLabel}
          labels={{
            rarity: t.cabinet.rarity,
            from: t.cabinet.from,
            date: t.cabinet.date,
            close: t.common.close,
          }}
        />
      )}

      {showRules && <RulesModal onClose={() => setShowRules(false)} />}
    </div>
  );
}
