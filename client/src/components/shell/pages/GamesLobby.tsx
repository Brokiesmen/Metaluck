import { useState } from 'react';
import { PageHeader } from '../PageHeader';
import { SectionHeader } from '../SectionHeader';
import { GameCard } from '../GameCard';
import { StatCard } from '../StatCard';
import { mockGames, mockStats, mockCategories } from '../mockData';

export function GamesLobby() {
  const [category, setCategory] = useState('Lobby');

  return (
    <div className="sh-page">
      <PageHeader title="Games Lobby" subtitle="Play originals, slots and live tables" />

      <section className="sh-hero">
        <div className="sh-hero-text">
          <span className="sh-hero-kicker">Welcome bonus</span>
          <h2 className="sh-hero-title">Get 200% up to 500 ★</h2>
          <p className="sh-hero-sub">Deposit today and double your first play.</p>
          <button type="button" className="sh-btn sh-btn--primary">Claim bonus</button>
        </div>
        <span className="sh-hero-art" aria-hidden>🎰</span>
      </section>

      <div className="sh-chips">
        {mockCategories.map((c) => (
          <button
            key={c}
            type="button"
            className={`sh-chip${category === c ? ' sh-chip--on' : ''}`}
            onClick={() => setCategory(c)}
          >
            {c}
          </button>
        ))}
      </div>

      <SectionHeader title="Trending games" action={<span className="sh-link">See all</span>} />
      <div className="sh-grid sh-grid--games">
        {mockGames.map((g) => (
          <GameCard key={g.id} title={g.title} icon={g.icon} subtitle={g.subtitle} hot={g.hot} />
        ))}
      </div>

      <SectionHeader title="Live stats" />
      <div className="sh-grid sh-grid--stats">
        {mockStats.map((s) => (
          <StatCard key={s.id} label={s.label} value={s.value} delta={s.delta} icon={s.icon} />
        ))}
      </div>
    </div>
  );
}
