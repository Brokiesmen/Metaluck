import { useState } from 'react';
import { protoGames } from '../data';

const categories = ['Лобби', 'Оригиналы', 'Слоты', 'Live', 'Столы'];

export function GamesPage() {
  const [category, setCategory] = useState('Лобби');

  return (
    <div className="proto-page">
      {/* Hero banner */}
      <section className="proto-hero">
        <span className="proto-hero-kicker">Мини-игры</span>
        <h1 className="proto-hero-title">Играй и выигрывай</h1>
        <p className="proto-hero-sub">Оригинальные игры с честным шансом на победу.</p>
        <span className="proto-hero-art" aria-hidden>🎮</span>
      </section>

      {/* Page header */}
      <header className="proto-page-header">
        <h2 className="proto-page-title">Игры</h2>
        <p className="proto-page-sub">Выберите игру и сделайте ставку</p>
      </header>

      {/* Category chips */}
      <div className="proto-chips">
        {categories.map((c) => (
          <button
            key={c}
            type="button"
            className={`proto-chip${category === c ? ' proto-chip--active' : ''}`}
            onClick={() => setCategory(c)}
          >
            {c}
          </button>
        ))}
      </div>

      {/* Trending section */}
      <div className="proto-section">
        <h3 className="proto-section-title">Популярные</h3>
        <span className="proto-section-link">Все игры</span>
      </div>

      {/* Games grid */}
      <div className="proto-games-grid">
        {protoGames.map((game) => (
          <div key={game.id} className="proto-game-card">
            {game.hot && <span className="proto-game-badge">HOT</span>}
            <span className="proto-game-icon">{game.icon}</span>
            <span className="proto-game-name">{game.name}</span>
            <span className="proto-game-players">{game.players}</span>
          </div>
        ))}
      </div>

      {/* Stats section */}
      <div className="proto-section">
        <h3 className="proto-section-title">Статистика</h3>
      </div>

      <div className="proto-stats-grid">
        <div className="proto-card proto-stat-card">
          <div className="proto-stat-label">Всего ставок</div>
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
          <div className="proto-stat-label">Лучший выигрыш</div>
          <div className="proto-stat-value">
            5 000 <span className="proto-star">★</span>
          </div>
        </div>
        <div className="proto-card proto-stat-card">
          <div className="proto-stat-label">Серия побед</div>
          <div className="proto-stat-value">
            6 🔥
          </div>
        </div>
      </div>
    </div>
  );
}
