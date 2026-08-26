import { useState } from 'react';
import { protoRewards, protoWheelSegments } from '../data';
import { WheelModal } from '../components/WheelModal';

export function DailyPage() {
  const [showWheel, setShowWheel] = useState(false);

  return (
    <div className="proto-page">
      {/* Hero banner */}
      <section className="proto-hero">
        <span className="proto-hero-kicker">Ежедневные бонусы</span>
        <h1 className="proto-hero-title">
          Собери 50 <span className="proto-star">★</span> сегодня
        </h1>
        <p className="proto-hero-sub">Заходи каждый день и получай награды.</p>
        <span className="proto-hero-art" aria-hidden>🎁</span>
      </section>

      {/* Page header */}
      <header className="proto-page-header">
        <h2 className="proto-page-title">Ежедневки</h2>
        <p className="proto-page-sub">Бонусы, вращения и квесты</p>
      </header>

      {/* Wheel banner */}
      <div 
        className="proto-card" 
        style={{ 
          padding: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          cursor: 'pointer',
          background: 'linear-gradient(135deg, rgba(255, 215, 0, 0.08) 0%, rgba(16, 16, 20, 1) 100%)',
          borderColor: 'rgba(255, 215, 0, 0.2)',
        }}
        onClick={() => setShowWheel(true)}
      >
        <span style={{ fontSize: '48px' }}>🎡</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: '16px', marginBottom: '4px' }}>
            Колесо удачи
          </div>
          <div style={{ color: 'var(--c-muted)', fontSize: '13px' }}>
            Крутите бесплатно раз в день
          </div>
        </div>
        <button 
          type="button" 
          className="proto-btn proto-btn--gold"
          onClick={(e) => {
            e.stopPropagation();
            setShowWheel(true);
          }}
        >
          Крутить
        </button>
      </div>

      {/* Streak progress */}
      <div className="proto-section">
        <h3 className="proto-section-title">Серия входов</h3>
        <span className="proto-section-link">6 дней 🔥</span>
      </div>

      <div className="proto-card" style={{ padding: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
          {[1, 2, 3, 4, 5, 6, 7].map((day) => (
            <div
              key={day}
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                display: 'grid',
                placeItems: 'center',
                fontSize: '14px',
                fontWeight: 700,
                background: day <= 6 ? 'var(--c-gold)' : 'var(--c-surface-2)',
                color: day <= 6 ? '#000' : 'var(--c-muted)',
                border: day === 7 ? '2px dashed var(--c-gold)' : 'none',
              }}
            >
              {day <= 6 ? '✓' : day}
            </div>
          ))}
        </div>
        <div style={{ color: 'var(--c-muted)', fontSize: '13px', textAlign: 'center' }}>
          Ещё 1 день до награды за неделю: <strong style={{ color: 'var(--c-gold)' }}>200 ★</strong>
        </div>
      </div>

      {/* Available rewards */}
      <div className="proto-section">
        <h3 className="proto-section-title">Доступно</h3>
      </div>

      <div className="proto-rewards-list">
        {protoRewards.filter(r => r.status === 'available').map((reward) => (
          <div key={reward.id} className="proto-reward-card proto-reward-card--available">
            <div className="proto-reward-icon">{reward.icon}</div>
            <div className="proto-reward-meta">
              <div className="proto-reward-title">{reward.title}</div>
              <div className="proto-reward-hint">{reward.hint}</div>
            </div>
            <button type="button" className="proto-reward-btn">
              Забрать
            </button>
          </div>
        ))}
      </div>

      {/* Locked rewards */}
      <div className="proto-section">
        <h3 className="proto-section-title">Заблокировано</h3>
      </div>

      <div className="proto-rewards-list">
        {protoRewards.filter(r => r.status === 'locked').map((reward) => (
          <div key={reward.id} className="proto-reward-card" style={{ opacity: 0.6 }}>
            <div className="proto-reward-icon">{reward.icon}</div>
            <div className="proto-reward-meta">
              <div className="proto-reward-title">{reward.title}</div>
              <div className="proto-reward-hint">{reward.hint}</div>
            </div>
            <button type="button" className="proto-reward-btn" disabled>
              🔒
            </button>
          </div>
        ))}
      </div>

      {/* Claimed rewards */}
      <div className="proto-section">
        <h3 className="proto-section-title">Получено</h3>
      </div>

      <div className="proto-rewards-list">
        {protoRewards.filter(r => r.status === 'claimed').map((reward) => (
          <div key={reward.id} className="proto-reward-card" style={{ opacity: 0.5 }}>
            <div className="proto-reward-icon">{reward.icon}</div>
            <div className="proto-reward-meta">
              <div className="proto-reward-title">{reward.title}</div>
              <div className="proto-reward-hint">{reward.hint}</div>
            </div>
            <span style={{ color: 'var(--c-green)', fontWeight: 700, fontSize: '13px' }}>
              ✓ Получено
            </span>
          </div>
        ))}
      </div>

      {/* Wheel modal */}
      {showWheel && (
        <WheelModal 
          segments={protoWheelSegments} 
          onClose={() => setShowWheel(false)} 
        />
      )}
    </div>
  );
}
