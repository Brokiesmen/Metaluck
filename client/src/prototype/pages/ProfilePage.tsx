import { protoProfile, protoStats, protoActivity, protoWallets } from '../data';

interface Props {
  view: 'cabinet' | 'wallet';
}

export function ProfilePage({ view }: Props) {
  if (view === 'wallet') {
    return <WalletView />;
  }
  return <CabinetView />;
}

function CabinetView() {
  return (
    <div className="proto-page">
      {/* Page header */}
      <header className="proto-page-header">
        <h2 className="proto-page-title">Кабинет</h2>
        <p className="proto-page-sub">Ваш профиль и статистика</p>
      </header>

      {/* Profile card */}
      <div className="proto-card proto-profile-card">
        <div className="proto-avatar">{protoProfile.avatar}</div>
        <div className="proto-profile-info">
          <div className="proto-profile-name">{protoProfile.name}</div>
          <div className="proto-profile-handle">{protoProfile.handle}</div>
          <div className="proto-profile-level">
            Уровень {protoProfile.level} · {protoProfile.joined}
          </div>
        </div>
        <button type="button" className="proto-btn">Изменить</button>
      </div>

      {/* Stats */}
      <div className="proto-section">
        <h3 className="proto-section-title">Статистика</h3>
      </div>

      <div className="proto-stats-grid">
        <div className="proto-card proto-stat-card">
          <div className="proto-stat-label">Баланс</div>
          <div className="proto-stat-value">
            {protoStats.totalBalance.toLocaleString('ru-RU')} <span className="proto-star">★</span>
          </div>
        </div>
        <div className="proto-card proto-stat-card">
          <div className="proto-stat-label">Игр сыграно</div>
          <div className="proto-stat-value">
            {protoStats.gamesPlayed}
            <span className="proto-stat-delta">+14</span>
          </div>
        </div>
        <div className="proto-card proto-stat-card">
          <div className="proto-stat-label">Винрейт</div>
          <div className="proto-stat-value">
            {protoStats.winRate}
            <span className="proto-stat-delta">+3%</span>
          </div>
        </div>
        <div className="proto-card proto-stat-card">
          <div className="proto-stat-label">Серия</div>
          <div className="proto-stat-value">
            {protoStats.dailyStreak} дней 🔥
          </div>
        </div>
      </div>

      {/* Recent activity */}
      <div className="proto-section">
        <h3 className="proto-section-title">Недавняя активность</h3>
        <span className="proto-section-link">История</span>
      </div>

      <div className="proto-activity-list">
        {protoActivity.map((a) => (
          <div key={a.id} className="proto-activity-item">
            <span className="proto-activity-icon">{a.icon}</span>
            <div className="proto-activity-meta">
              <span className="proto-activity-game">{a.game}</span>
              <span className="proto-activity-time">{a.time}</span>
            </div>
            <span className={`proto-activity-amount ${a.win ? 'proto-activity-amount--win' : 'proto-activity-amount--loss'}`}>
              {a.win ? '+' : '-'}{a.amount} ★
            </span>
          </div>
        ))}
      </div>

      {/* Settings links */}
      <div className="proto-section">
        <h3 className="proto-section-title">Настройки</h3>
      </div>

      <div className="proto-card" style={{ padding: 0, overflow: 'hidden' }}>
        <SettingRow label="Уведомления" hint="Выигрыши, бонусы, события" chevron />
        <SettingRow label="Звуковые эффекты" toggle />
        <SettingRow label="Язык" hint="Русский" chevron />
        <SettingRow label="Тема" hint="Тёмная" chevron />
        <SettingRow label="О Metaluck" chevron />
      </div>

      {/* Sign out */}
      <button 
        type="button" 
        className="proto-btn proto-btn--full" 
        style={{ 
          marginTop: '20px',
          color: 'var(--c-red)',
          borderColor: 'rgba(239, 68, 68, 0.3)',
        }}
      >
        Выйти
      </button>
    </div>
  );
}

function WalletView() {
  return (
    <div className="proto-page">
      {/* Hero */}
      <section className="proto-hero" style={{
        background: 'linear-gradient(135deg, rgba(255, 215, 0, 0.12) 0%, rgba(16, 16, 20, 1) 100%)',
      }}>
        <span className="proto-hero-kicker">Ваш баланс</span>
        <h1 className="proto-hero-title" style={{ fontSize: '32px' }}>
          1 240 <span className="proto-star" style={{ fontSize: '28px' }}>★</span>
        </h1>
        <p className="proto-hero-sub">≈ $18.60</p>
        <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
          <button type="button" className="proto-btn proto-btn--gold">
            Пополнить
          </button>
          <button type="button" className="proto-btn">
            Вывести
          </button>
        </div>
      </section>

      {/* Page header */}
      <header className="proto-page-header">
        <h2 className="proto-page-title">Кошелёк</h2>
        <p className="proto-page-sub">Ваши балансы и транзакции</p>
      </header>

      {/* Wallet balances */}
      <div className="proto-section">
        <h3 className="proto-section-title">Балансы</h3>
      </div>

      <div className="proto-wallet-list">
        {protoWallets.map((wallet) => (
          <div key={wallet.code} className="proto-card proto-wallet-item">
            <div className={`proto-wallet-icon${wallet.code === 'STARS' ? ' proto-wallet-icon--star' : ''}`}>
              {wallet.icon}
            </div>
            <div className="proto-wallet-meta">
              <div className="proto-wallet-name">{wallet.name}</div>
              <div className="proto-wallet-code">{wallet.code}</div>
            </div>
            <div className="proto-wallet-amounts">
              <div className="proto-wallet-amount">{wallet.amount}</div>
              <div className="proto-wallet-fiat">{wallet.fiat}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Linked wallets */}
      <div className="proto-section">
        <h3 className="proto-section-title">Привязанные кошельки</h3>
        <span className="proto-section-link">Добавить</span>
      </div>

      <div className="proto-card" style={{ padding: 0, overflow: 'hidden' }}>
        <SettingRow label="TON Wallet" hint="UQAB...3mKf" chevron />
        <SettingRow label="WalletConnect" hint="Не подключён" chevron />
      </div>

      {/* Transaction history */}
      <div className="proto-section">
        <h3 className="proto-section-title">История транзакций</h3>
        <span className="proto-section-link">Все</span>
      </div>

      <div className="proto-activity-list">
        <div className="proto-activity-item">
          <span className="proto-activity-icon">📥</span>
          <div className="proto-activity-meta">
            <span className="proto-activity-game">Пополнение</span>
            <span className="proto-activity-time">вчера</span>
          </div>
          <span className="proto-activity-amount proto-activity-amount--win">
            +500 ★
          </span>
        </div>
        <div className="proto-activity-item">
          <span className="proto-activity-icon">📤</span>
          <div className="proto-activity-meta">
            <span className="proto-activity-game">Вывод</span>
            <span className="proto-activity-time">3 дня назад</span>
          </div>
          <span className="proto-activity-amount proto-activity-amount--loss">
            -200 ★
          </span>
        </div>
        <div className="proto-activity-item">
          <span className="proto-activity-icon">🎁</span>
          <div className="proto-activity-meta">
            <span className="proto-activity-game">Бонус за регистрацию</span>
            <span className="proto-activity-time">неделю назад</span>
          </div>
          <span className="proto-activity-amount proto-activity-amount--win">
            +100 ★
          </span>
        </div>
      </div>
    </div>
  );
}

interface SettingRowProps {
  label: string;
  hint?: string;
  toggle?: boolean;
  chevron?: boolean;
}

function SettingRow({ label, hint, toggle, chevron }: SettingRowProps) {
  return (
    <div 
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '14px 16px',
        borderBottom: '1px solid var(--c-border-subtle)',
        cursor: chevron ? 'pointer' : 'default',
      }}
    >
      <div>
        <div style={{ fontWeight: 600, fontSize: '14px' }}>{label}</div>
        {hint && <div style={{ color: 'var(--c-muted)', fontSize: '12px', marginTop: '2px' }}>{hint}</div>}
      </div>
      {toggle && (
        <div 
          style={{
            width: '44px',
            height: '26px',
            background: 'var(--c-gold)',
            borderRadius: '999px',
            position: 'relative',
            cursor: 'pointer',
          }}
        >
          <div 
            style={{
              position: 'absolute',
              top: '3px',
              right: '3px',
              width: '20px',
              height: '20px',
              background: '#fff',
              borderRadius: '50%',
            }}
          />
        </div>
      )}
      {chevron && (
        <span style={{ color: 'var(--c-faint)', fontSize: '18px' }}>›</span>
      )}
    </div>
  );
}
