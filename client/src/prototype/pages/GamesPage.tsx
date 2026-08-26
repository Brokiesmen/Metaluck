import { useState } from 'react';
import { protoGames } from '../data';

const categories = ['Лобби', 'Оригиналы', 'Слоты', 'Live', 'Столы'];

export function GamesPage() {
  const [category, setCategory] = useState('Лобби');

  return (
    <div className="proto-page">
      {/* Hero */}
      <section className="proto-hero">
        <div className="proto-hero-body">
          <span className="proto-hero-tag">Мини-игры</span>
          <h1 className="proto-hero-title">Играй и выигрывай</h1>
          <p className="proto-hero-desc">Оригинальные игры с честным шансом</p>
        </div>
        <span className="proto-hero-icon">🎮</span>
      </section>

      {/* Category chips */}
      <div className="proto-chips">
        {categories.map((c) => (
          <button
            key={c}
            type="button"
            className={`proto-chip${category === c ? ' active' : ''}`}
            onClick={() => setCategory(c)}
          >
            {c}
          </button>
        ))}
      </div>

      {/* Section header */}
      <div className="proto-section-header">
        <h2 className="proto-section-title">Популярные</h2>
        <span className="proto-section-link">Все →</span>
      </div>

      {/* Games grid */}
      <div className="proto-games-grid">
        {protoGames.map((game) => (
          <div key={game.id} className="proto-game-card">
            {game.hot && <span className="proto-game-badge">HOT</span>}
            <span className="proto-game-icon">{game.icon}</span>
            <span className="proto-game-name">{game.name}</span>
            <span className="proto-game-meta">{game.players}</span>
          </div>
        ))}
      </div>

      {/* Stats section */}
      <div className="proto-section-header">
        <h2 className="proto-section-title">Статистика</h2>
      </div>

      <div className="proto-stats-grid">
        <div className="proto-card proto-stat-card">
          <div className="proto-stat-label">Ставок</div>
          <div className="proto-stat-value">
            312
            <span className="proto-stat-delta">+14</span>
          </div>
        </div>
        <div className="proto-card proto-stat-card">
          <div className="proto-stat-label">Винрейт</div>
          <div className="proto-stat-value">
            57%
            <span className="proto-stat-delta">+3%</span>
          </div>
        </div>
        <div className="proto-card proto-stat-card">
          <div className="proto-stat-label">Лучший</div>
          <div className="proto-stat-value">
            5 000 <span className="star">★</span>
          </div>
        </div>
        <div className="proto-card proto-stat-card">
          <div className="proto-stat-label">Серия</div>
          <div className="proto-stat-value">6 🔥</div>
        </div>
      </div>
    </div>
  );
}
