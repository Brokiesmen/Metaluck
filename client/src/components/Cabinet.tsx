import { useEffect, useState } from 'react';
import { api } from '../api';
import { RARITY, GIFT_IMAGES } from '../data';
import { StarIcon } from './StarIcon';
import { TopUpModal } from './TopUpModal';
import { ReferralCard } from './ReferralCard';
import type { TelegramUser, HistoryEntry } from '../types';

interface Props {
  user: TelegramUser;
  balance: number;
  isDev: boolean;
  onBalanceUpdate: (b: number) => void;
  openInvoice?: (url: string, cb?: (status: 'paid' | 'cancelled' | 'failed' | 'pending') => void) => void;
  isTelegram: boolean;
  tg?: any;
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleString('ru-RU', {
    day: '2-digit', month: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
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
}

function GiftDetail({ entry, onClose }: GiftDetailProps) {
  const r   = RARITY[entry.prize.rarity];
  const img = GIFT_IMAGES[entry.prize.id];

  const rarityStars: Record<string, number> = { gray: 1, blue: 2, purple: 3, gold: 4 };
  const stars = rarityStars[entry.prize.rarity] ?? 1;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet gift-detail-sheet" onClick={e => e.stopPropagation()}>
        <div className="modal-handle" />

        <div className="modal-icon-wrap"
          style={{ borderColor: r.border, color: r.border }}>
          {img?.animated
            ? <img src={img.animated} alt={entry.prize.name} className="modal-anim" loading="lazy" />
            : img
              ? <img src={img.image} alt={entry.prize.name} className="modal-anim" loading="lazy" />
              : <span className="modal-icon">{entry.prize.icon}</span>}
        </div>

        <div className="modal-rarity" style={{ color: r.text }}>{r.label}</div>
        <div className="modal-name">{entry.prize.name}</div>

        <div className="gift-detail-stats">
          <div className="gift-stat-row">
            <span className="gift-stat-label">Редкость</span>
            <span className="gift-stat-value num">
              {Array.from({ length: 4 }).map((_, i) => (
                <span key={i} style={{ opacity: i < stars ? 1 : 0.2 }}>★</span>
              ))}
            </span>
          </div>
          <div className="gift-stat-row">
            <span className="gift-stat-label">Получен из</span>
            <span className="gift-stat-value">{entry.caseName}</span>
          </div>
          <div className="gift-stat-row">
            <span className="gift-stat-label">Дата</span>
            <span className="gift-stat-value num">{formatDate(entry.timestamp)}</span>
          </div>
        </div>

        <button className="tg-btn" onClick={onClose}>Закрыть</button>
      </div>
    </div>
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

export function Cabinet({ user, balance, isDev, onBalanceUpdate, openInvoice, isTelegram, tg }: Props) {
  const [history, setHistory]     = useState<HistoryEntry[]>(() => readCache());
  const [historyFresh, setFresh]  = useState(false);
  const [hasMore, setHasMore]     = useState(false);
  const [loadingMore, setLoadMore]= useState(false);
  const [page, setPage]           = useState(0);
  const [selected, setSelected]   = useState<HistoryEntry | null>(null);
  const [showTopUp, setShowTopUp] = useState(false);

  // SWR: show cache instantly, refresh in background
  useEffect(() => {
    api.getHistory(0, PAGE_SIZE).then(res => {
      setHistory(res.history);
      setHasMore(res.pagination.hasMore);
      setPage(0);
      setFresh(true);
      writeCache(res.history);
    }).catch(() => setFresh(true));
  }, []);

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

  const stats = {
    total:  history.length,
    gold:   history.filter(e => e.prize.rarity === 'gold').length,
    purple: history.filter(e => e.prize.rarity === 'purple').length,
    blue:   history.filter(e => e.prize.rarity === 'blue').length,
  };

  return (
    <div className="cabinet">

      {/* ── Profile ─────────────────────────────────────────────── */}
      <div className="tg-section">
        <div className="profile-row">
          <Avatar user={user} />
          <div className="profile-info">
            <div className="profile-name">{fullName}</div>
            {user.username && <div className="profile-username">@{user.username}</div>}
            {isDev && <div className="dev-badge">dev режим</div>}
          </div>
        </div>
      </div>

      {/* ── Balance ─────────────────────────────────────────────── */}
      <div className="tg-section-title">Баланс</div>
      <div className="tg-section">
        <div className="balance-row">
          <StarIcon size={32} />
          <span className="balance-big num" style={{ marginLeft: 8 }}>
            {balance.toLocaleString('ru-RU')}
          </span>
          <span className="balance-unit">звёзд</span>
          <button className="topup-inline-btn" onClick={() => setShowTopUp(true)}>
            Пополнить
          </button>
        </div>
      </div>

      {/* ── Stats ───────────────────────────────────────────────── */}
      {stats.total > 0 && (
        <>
          <div className="tg-section-title">Статистика</div>
          <div className="tg-section">
            <div className="cabinet-stats-grid">
              <div className="cabinet-stat">
                <div className="cabinet-stat-value num">{stats.total}</div>
                <div className="cabinet-stat-label">Открыто</div>
              </div>
              <div className="cabinet-stat">
                <div className="cabinet-stat-value num" style={{ color: '#e8c06a' }}>{stats.gold}</div>
                <div className="cabinet-stat-label">Легендарных</div>
              </div>
              <div className="cabinet-stat">
                <div className="cabinet-stat-value num" style={{ color: '#b0acf5' }}>{stats.purple}</div>
                <div className="cabinet-stat-label">Эпических</div>
              </div>
              <div className="cabinet-stat">
                <div className="cabinet-stat-value num" style={{ color: '#a8c8f0' }}>{stats.blue}</div>
                <div className="cabinet-stat-label">Редких</div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── Referral ────────────────────────────────────────────── */}
      <div className="tg-section-title">Пригласить друга</div>
      <ReferralCard tg={tg} />

      {/* ── History ─────────────────────────────────────────────── */}
      <div className="tg-section-title">
        История открытий
        {history.length > 0 && <span className="history-count num">{history.length}</span>}
      </div>

      {history.length === 0 && historyFresh ? (
        <div className="tg-section tg-hint-text">Откройте первый кейс!</div>
      ) : history.length === 0 ? (
        <div className="tg-section tg-hint-text" style={{ color: 'var(--tg-hint)' }}>Загрузка…</div>
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
                    <span style={{ color: r.text }}>{r.label}</span>
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
          {loadingMore ? 'Загрузка…' : 'Загрузить ещё'}
        </button>
      )}

      {selected && <GiftDetail entry={selected} onClose={() => setSelected(null)} />}

      {showTopUp && (
        <TopUpModal
          onClose={() => setShowTopUp(false)}
          onBalanceUpdate={onBalanceUpdate}
          openInvoice={openInvoice}
          isTelegram={isTelegram}
        />
      )}
    </div>
  );
}
