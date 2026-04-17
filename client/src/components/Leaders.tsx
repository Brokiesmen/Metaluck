import { useState, useEffect } from 'react';
import { api } from '../api';
import type { Leader } from '../types';

function getInitials(name: string) {
  const parts = name.trim().split(' ').filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  if (parts.length === 1) return name.slice(0, 2).toUpperCase();
  return '?';
}

function getAvatarColor(name: string) {
  const colors = ['#f6a454', '#818e9a', '#64b6e5', '#7dc462', '#b388d7', '#ed777b'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

export function Leaders() {
  const [leaders, setLeaders] = useState<Leader[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    api.getLeaders()
      .then(data => {
        if (active) setLeaders(data);
      })
      .catch(err => {
        if (active) setError(err.message || 'Error fetching leaders');
      });
    return () => { active = false; };
  }, []);

  return (
    <div className="leaders-page">
      <div className="leaders-header">
        <h1 className="leaders-title">Таблица лидеров</h1>
        <p className="leaders-subtitle">Список лидеров, набравших наибольшее количество очков</p>
        <div className="leaders-trophy">
          🏆
        </div>
      </div>
      
      {error && <div className="error-banner">{error}</div>}
      {!leaders && !error && <div className="loading">Загрузка...</div>}
      
      {leaders && (
        <div className="leaders-list">
          {leaders.map((leader, index) => (
            <div key={leader.userId} className="leader-item">
              <div className="leader-avatar">
                {leader.photoUrl ? (
                  <img src={leader.photoUrl} alt={leader.name} />
                ) : (
                  <div className="leader-initials" style={{ backgroundColor: getAvatarColor(leader.name) }}>
                    {getInitials(leader.name)}
                  </div>
                )}
              </div>
              <div className="leader-info">
                <div className="leader-name">{leader.name}</div>
                <div className="leader-balance num">{leader.balance.toLocaleString('ru-RU')} coins</div>
              </div>
              <div className="leader-rank"># {index + 1}</div>
            </div>
          ))}
          {leaders.length === 0 && <div className="empty">Список пуст</div>}
        </div>
      )}
    </div>
  );
}
