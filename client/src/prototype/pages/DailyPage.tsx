import { useState } from 'react';
import { protoRewards, protoWheelSegments } from '../data';
import { WheelModal } from '../components/WheelModal';

export function DailyPage() {
  const [showWheel, setShowWheel] = useState(false);

  return (
    <div className="proto-page">
      {/* Hero */}
      <section className="proto-hero">
        <div className="proto-hero-body">
          <span className="proto-hero-tag">Ежедневно</span>
          <h1 className="proto-hero-title">
            Собери 50 <span className="star">★</span>
          </h1>
          <p className="proto-hero-desc">Заходи каждый день за наградами</p>
        </div>
        <span className="proto-hero-icon">🎁</span>
      </section>

      {/* Wheel card */}
      <div
        className="proto-list-item proto-list-item--interactive"
        onClick={() => setShowWheel(true)}
      >
        <div className="proto-list-icon proto-list-icon--gold">🎡</div>
        <div className="proto-list-body">
          <div className="proto-list-title">Колесо удачи</div>
          <div className="proto-list-sub">Крутите бесплатно раз в день</div>
        </div>
        <button
          type="button"
          className="proto-reward-btn"
          onClick={(e) => {
            e.stopPropagation();
            setShowWheel(true);
          }}
        >
          Крутить
        </button>
      </div>

      {/* Streak */}
      <div className="proto-section-header">
        <h2 className="proto-section-title">Серия входов</h2>
        <span className="proto-section-link">6 дней 🔥</span>
      </div>

      <div className="proto-card proto-streak">
        <div className="proto-streak-days">
          {[1, 2, 3, 4, 5, 6, 7].map((day) => (
            <div
              key={day}
              className={`proto-streak-day${
                day <= 6 ? ' proto-streak-day--done' : ''
              }${day === 7 ? ' proto-streak-day--next' : ''}`}
            >
              {day <= 6 ? '✓' : day}
            </div>
          ))}
        </div>
        <div className="proto-streak-hint">
          Ещё 1 день до награды: <strong>200 ★</strong>
        </div>
      </div>

      {/* Available rewards */}
      <div className="proto-section-header">
        <h2 className="proto-section-title">Доступно</h2>
      </div>

      <div className="proto-list">
        {protoRewards
          .filter((r) => r.status === 'available')
          .map((reward) => (
            <div key={reward.id} className="proto-list-item">
              <div className="proto-list-icon">{reward.icon}</div>
              <div className="proto-list-body">
                <div className="proto-list-title">{reward.title}</div>
                <div className="proto-list-sub">{reward.hint}</div>
              </div>
              <button type="button" className="proto-reward-btn">
                Забрать
              </button>
            </div>
          ))}
      </div>

      {/* Locked rewards */}
      <div className="proto-section-header">
        <h2 className="proto-section-title">Заблокировано</h2>
      </div>

      <div className="proto-list">
        {protoRewards
          .filter((r) => r.status === 'locked')
          .map((reward) => (
            <div key={reward.id} className="proto-list-item" style={{ opacity: 0.5 }}>
              <div className="proto-list-icon">{reward.icon}</div>
              <div className="proto-list-body">
                <div className="proto-list-title">{reward.title}</div>
                <div className="proto-list-sub">{reward.hint}</div>
              </div>
              <button type="button" className="proto-reward-btn" disabled>
                🔒
              </button>
            </div>
          ))}
      </div>

      {/* Claimed */}
      <div className="proto-section-header">
        <h2 className="proto-section-title">Получено</h2>
      </div>

      <div className="proto-list">
        {protoRewards
          .filter((r) => r.status === 'claimed')
          .map((reward) => (
            <div key={reward.id} className="proto-list-item" style={{ opacity: 0.4 }}>
              <div className="proto-list-icon">{reward.icon}</div>
              <div className="proto-list-body">
                <div className="proto-list-title">{reward.title}</div>
                <div className="proto-list-sub">{reward.hint}</div>
              </div>
              <span className="text-dim" style={{ fontSize: '13px', fontWeight: 500 }}>
                ✓
              </span>
            </div>
          ))}
      </div>

      {/* Wheel modal */}
      {showWheel && (
        <WheelModal segments={protoWheelSegments} onClose={() => setShowWheel(false)} />
      )}
    </div>
  );
}
