import { useState, useEffect, useCallback } from 'react';
import { api } from '../api';
import { StarIcon } from './StarIcon';
import type { Leader } from '../types';

const LIMIT = 50;

function getInitials(name: string) {
  const parts = name.trim().split(' ').filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function getAvatarColor(name: string) {
  const colors = ['#f6a454', '#818e9a', '#64b6e5', '#7dc462', '#b388d7', '#ed777b'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

function rankLabel(i: number) {
  if (i === 0) return '🥇';
  if (i === 1) return '🥈';
  if (i === 2) return '🥉';
  return `#${i + 1}`;
}

export function Leaders() {
  const [leaders, setLeaders]   = useState<Leader[]>([]);
  const [page, setPage]         = useState(0);
  const [hasMore, setHasMore]   = useState(true);
  const [total, setTotal]       = useState<number | null>(null);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);

  const load = useCallback(async (nextPage: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getLeaders(nextPage, LIMIT);
      setLeaders(prev => nextPage === 0 ? res.leaders : [...prev, ...res.leaders]);
      setHasMore(res.pagination.hasMore);
      setTotal(res.pagination.total);
      setPage(nextPage);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(0); }, [load]);

  return (
    <div className="leaders-page">

      <div className="leaders-hero">
        <div className="leaders-badge" aria-hidden>🏆</div>
        <h1 className="leaders-title">Лидеры</h1>
        <p className="leaders-subtitle">Игроки с самым большим балансом звёзд</p>
        {total !== null && (
          <div className="leaders-total num">{total.toLocaleString('ru-RU')} игроков</div>
        )}
      </div>

      {error && <div className="error-banner">{error}</div>}

      {leaders.length === 0 && !loading && !error && (
        <div className="tg-section tg-hint-text">Список пуст</div>
      )}

      {leaders.length > 0 && (
        <div className="leaders-list tg-section">
          {leaders.map((leader, i) => (
            <div key={leader.userId} className="leader-item">
              <div className="leader-avatar">
                {leader.photoUrl
                  ? <img src={leader.photoUrl} alt={leader.name} />
                  : <div className="leader-initials" style={{ backgroundColor: getAvatarColor(leader.name) }}>
                      {getInitials(leader.name)}
                    </div>
                }
              </div>
              <div className="leader-info">
                <div className="leader-name">{leader.name}</div>
                <div className="leader-balance num">
                  {leader.balance.toLocaleString('ru-RU')}
                  <StarIcon size={14} animate={false} glow={false} />
                </div>
              </div>
              <div className={`leader-rank leader-rank--${i < 3 ? i + 1 : 'default'}`}>
                {rankLabel(i)}
              </div>
            </div>
          ))}
        </div>
      )}

      {loading && <div className="loading">Загрузка...</div>}

      {hasMore && !loading && leaders.length > 0 && (
        <button className="leaders-load-more" onClick={() => load(page + 1)}>
          Загрузить ещё
        </button>
      )}
    </div>
  );
}
