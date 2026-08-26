import { protoCases, type ProtoCase } from '../data';

interface Props {
  onOpenCase: (c: ProtoCase) => void;
}

export function CasesPage({ onOpenCase }: Props) {
  return (
    <div className="proto-page">
      {/* Hero banner */}
      <section className="proto-hero">
        <span className="proto-hero-kicker">Эксклюзив</span>
        <h1 className="proto-hero-title">
          Получи 200% до 500 <span className="proto-star">★</span>
        </h1>
        <p className="proto-hero-sub">Открой первый кейс и удвой выигрыш.</p>
        <button type="button" className="proto-btn proto-btn--gold">
          Забрать бонус
        </button>
        <span className="proto-hero-art" aria-hidden>🎰</span>
      </section>

      {/* Page header */}
      <header className="proto-page-header">
        <h2 className="proto-page-title">Кейсы</h2>
        <p className="proto-page-sub">Открывай и выигрывай звёзды</p>
      </header>

      {/* Case categories */}
      <div className="proto-chips">
        <button type="button" className="proto-chip proto-chip--active">Все</button>
        <button type="button" className="proto-chip">Бесплатные</button>
        <button type="button" className="proto-chip">Популярные</button>
        <button type="button" className="proto-chip">Новые</button>
      </div>

      {/* Cases grid */}
      <div className="proto-cases-grid">
        {protoCases.map((c) => (
          <button
            key={c.id}
            type="button"
            className="proto-case-card"
            style={{ '--case-accent': c.accent } as React.CSSProperties}
            onClick={() => onOpenCase(c)}
          >
            {c.badge && (
              <span className={`proto-case-badge proto-case-badge--${c.badge}`}>
                {c.badge === 'free' ? 'FREE' : c.badge === 'hot' ? 'HOT' : 'NEW'}
              </span>
            )}
            <span className="proto-case-icon">{c.icon}</span>
            <span className="proto-case-name">{c.name}</span>
            <span className="proto-case-price">
              {c.price === 0 ? (
                'Бесплатно'
              ) : (
                <>
                  {c.price.toLocaleString('ru-RU')} <span className="proto-star">★</span>
                </>
              )}
            </span>
          </button>
        ))}
      </div>

      {/* Section: Recent wins */}
      <div className="proto-section">
        <h3 className="proto-section-title">Недавние выигрыши</h3>
        <span className="proto-section-link">Все</span>
      </div>

      <div className="proto-activity-list">
        <div className="proto-activity-item">
          <span className="proto-activity-icon">🎁</span>
          <div className="proto-activity-meta">
            <span className="proto-activity-game">Базовый кейс</span>
            <span className="proto-activity-time">только что</span>
          </div>
          <span className="proto-activity-amount proto-activity-amount--win">
            +250 ★
          </span>
        </div>
        <div className="proto-activity-item">
          <span className="proto-activity-icon">💎</span>
          <div className="proto-activity-meta">
            <span className="proto-activity-game">Премиум кейс</span>
            <span className="proto-activity-time">2 мин назад</span>
          </div>
          <span className="proto-activity-amount proto-activity-amount--win">
            +1000 ★
          </span>
        </div>
        <div className="proto-activity-item">
          <span className="proto-activity-icon">👑</span>
          <div className="proto-activity-meta">
            <span className="proto-activity-game">Золотой кейс</span>
            <span className="proto-activity-time">5 мин назад</span>
          </div>
          <span className="proto-activity-amount proto-activity-amount--win">
            +5000 ★
          </span>
        </div>
      </div>
    </div>
  );
}
