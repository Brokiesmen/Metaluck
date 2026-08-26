import { useState } from 'react';
import { protoCases, type ProtoCase } from '../data';

interface Props {
  onOpenCase: (c: ProtoCase) => void;
}

const filters = ['Все', 'Бесплатные', 'Популярные', 'Новые'];

export function CasesPage({ onOpenCase }: Props) {
  const [filter, setFilter] = useState('Все');

  return (
    <div className="proto-page">
      {/* Hero */}
      <section className="proto-hero">
        <div className="proto-hero-body">
          <span className="proto-hero-tag">Бонус</span>
          <h1 className="proto-hero-title">
            200% до 500 <span className="star">★</span>
          </h1>
          <p className="proto-hero-desc">Открой первый кейс и удвой выигрыш</p>
        </div>
        <span className="proto-hero-icon">🎰</span>
      </section>

      {/* Filter chips */}
      <div className="proto-chips">
        {filters.map((f) => (
          <button
            key={f}
            type="button"
            className={`proto-chip${filter === f ? ' active' : ''}`}
            onClick={() => setFilter(f)}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Section header */}
      <div className="proto-section-header">
        <h2 className="proto-section-title">Кейсы</h2>
        <span className="proto-section-link">Все →</span>
      </div>

      {/* Cases grid */}
      <div className="proto-cases-grid">
        {protoCases.map((c) => (
          <button
            key={c.id}
            type="button"
            className="proto-case-card"
            onClick={() => onOpenCase(c)}
          >
            {c.badge && (
              <span className={`proto-case-badge proto-case-badge--${c.badge}`}>
                {c.badge === 'free' ? 'FREE' : c.badge === 'hot' ? 'HOT' : 'NEW'}
              </span>
            )}
            <span className="proto-case-icon">{c.icon}</span>
            <span className="proto-case-name">{c.name}</span>
            <span className={`proto-case-price${c.price === 0 ? ' proto-case-price--free' : ''}`}>
              {c.price === 0 ? (
                'Бесплатно'
              ) : (
                <>
                  {c.price.toLocaleString('ru-RU')} <span className="star">★</span>
                </>
              )}
            </span>
          </button>
        ))}
      </div>

      {/* Recent wins */}
      <div className="proto-section-header">
        <h2 className="proto-section-title">Недавние выигрыши</h2>
        <span className="proto-section-link">Все →</span>
      </div>

      <div className="proto-list">
        <div className="proto-list-item">
          <div className="proto-list-icon">🎁</div>
          <div className="proto-list-body">
            <div className="proto-list-title">Базовый кейс</div>
            <div className="proto-list-sub">только что</div>
          </div>
          <div className="proto-list-end">
            <div className="proto-list-value proto-list-value--win">+250 ★</div>
          </div>
        </div>
        <div className="proto-list-item">
          <div className="proto-list-icon">💎</div>
          <div className="proto-list-body">
            <div className="proto-list-title">Премиум кейс</div>
            <div className="proto-list-sub">2 мин назад</div>
          </div>
          <div className="proto-list-end">
            <div className="proto-list-value proto-list-value--win">+1000 ★</div>
          </div>
        </div>
        <div className="proto-list-item">
          <div className="proto-list-icon">👑</div>
          <div className="proto-list-body">
            <div className="proto-list-title">Золотой кейс</div>
            <div className="proto-list-sub">5 мин назад</div>
          </div>
          <div className="proto-list-end">
            <div className="proto-list-value proto-list-value--win">+5000 ★</div>
          </div>
        </div>
      </div>
    </div>
  );
}
