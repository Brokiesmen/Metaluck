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
      {/* Profile header */}
      <div className="proto-card proto-profile-header">
        <div className="proto-avatar">{protoProfile.avatar}</div>
        <div className="proto-profile-info">
          <div className="proto-profile-name">{protoProfile.name}</div>
          <div className="proto-profile-handle">{protoProfile.handle}</div>
          <div className="proto-profile-meta">
            Уровень {protoProfile.level} · {protoProfile.joined}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="proto-section-header">
        <h2 className="proto-section-title">Статистика</h2>
      </div>

      <div className="proto-stats-grid">
        <div className="proto-card proto-stat-card">
          <div className="proto-stat-label">Баланс</div>
          <div className="proto-stat-value">
            {protoStats.totalBalance.toLocaleString('ru-RU')} <span className="star">★</span>
          </div>
        </div>
        <div className="proto-card proto-stat-card">
          <div className="proto-stat-label">Игр</div>
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
          <div className="proto-stat-value">{protoStats.dailyStreak} 🔥</div>
        </div>
      </div>

      {/* Activity */}
      <div className="proto-section-header">
        <h2 className="proto-section-title">Активность</h2>
        <span className="proto-section-link">Все →</span>
      </div>

      <div className="proto-list">
        {protoActivity.map((a) => (
          <div key={a.id} className="proto-list-item">
            <div className="proto-list-icon">{a.icon}</div>
            <div className="proto-list-body">
              <div className="proto-list-title">{a.game}</div>
              <div className="proto-list-sub">{a.time}</div>
            </div>
            <div className="proto-list-end">
              <div
                className={`proto-list-value ${
                  a.win ? 'proto-list-value--win' : 'proto-list-value--loss'
                }`}
              >
                {a.win ? '+' : '-'}
                {a.amount} ★
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Settings */}
      <div className="proto-section-header">
        <h2 className="proto-section-title">Настройки</h2>
      </div>

      <div className="proto-settings-list">
        <div className="proto-setting-row proto-setting-row--interactive">
          <div>
            <div className="proto-setting-label">Уведомления</div>
            <div className="proto-setting-hint">Выигрыши, бонусы, события</div>
          </div>
          <span className="proto-setting-chevron">›</span>
        </div>
        <div className="proto-setting-row">
          <div className="proto-setting-label">Звуковые эффекты</div>
          <div className="proto-toggle on">
            <div className="proto-toggle-knob" />
          </div>
        </div>
        <div className="proto-setting-row proto-setting-row--interactive">
          <div>
            <div className="proto-setting-label">Язык</div>
            <div className="proto-setting-hint">Русский</div>
          </div>
          <span className="proto-setting-chevron">›</span>
        </div>
        <div className="proto-setting-row proto-setting-row--interactive">
          <div>
            <div className="proto-setting-label">Тема</div>
            <div className="proto-setting-hint">Тёмная</div>
          </div>
          <span className="proto-setting-chevron">›</span>
        </div>
        <div className="proto-setting-row proto-setting-row--interactive">
          <div className="proto-setting-label">О Metaluck</div>
          <span className="proto-setting-chevron">›</span>
        </div>
      </div>

      {/* Sign out */}
      <button
        type="button"
        className="proto-btn proto-btn--full mt-auto"
        style={{ color: '#e74c3c', borderColor: 'rgba(231, 76, 60, 0.3)' }}
      >
        Выйти
      </button>
    </div>
  );
}

function WalletView() {
  return (
    <div className="proto-page">
      {/* Balance hero */}
      <div className="proto-card proto-wallet-hero">
        <div className="proto-wallet-label">Баланс</div>
        <div className="proto-wallet-amount">
          1 240 <span className="star">★</span>
        </div>
        <div className="proto-wallet-fiat">≈ $18.60</div>
        <div className="proto-wallet-actions">
          <button type="button" className="proto-btn proto-btn--gold">
            Пополнить
          </button>
          <button type="button" className="proto-btn">
            Вывести
          </button>
        </div>
      </div>

      {/* Balances */}
      <div className="proto-section-header">
        <h2 className="proto-section-title">Балансы</h2>
      </div>

      <div className="proto-list">
        {protoWallets.map((wallet) => (
          <div key={wallet.code} className="proto-list-item">
            <div
              className={`proto-list-icon${
                wallet.code === 'STARS' ? ' proto-list-icon--gold' : ''
              }`}
            >
              {wallet.icon}
            </div>
            <div className="proto-list-body">
              <div className="proto-list-title">{wallet.name}</div>
              <div className="proto-list-sub">{wallet.code}</div>
            </div>
            <div className="proto-list-end">
              <div className="proto-list-value">{wallet.amount}</div>
              <div className="proto-list-hint">{wallet.fiat}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Linked wallets */}
      <div className="proto-section-header">
        <h2 className="proto-section-title">Кошельки</h2>
        <span className="proto-section-link">Добавить</span>
      </div>

      <div className="proto-settings-list">
        <div className="proto-setting-row proto-setting-row--interactive">
          <div>
            <div className="proto-setting-label">TON Wallet</div>
            <div className="proto-setting-hint">UQAB...3mKf</div>
          </div>
          <span className="proto-setting-chevron">›</span>
        </div>
        <div className="proto-setting-row proto-setting-row--interactive">
          <div>
            <div className="proto-setting-label">WalletConnect</div>
            <div className="proto-setting-hint">Не подключён</div>
          </div>
          <span className="proto-setting-chevron">›</span>
        </div>
      </div>

      {/* Transactions */}
      <div className="proto-section-header">
        <h2 className="proto-section-title">Транзакции</h2>
        <span className="proto-section-link">Все →</span>
      </div>

      <div className="proto-list">
        <div className="proto-list-item">
          <div className="proto-list-icon">📥</div>
          <div className="proto-list-body">
            <div className="proto-list-title">Пополнение</div>
            <div className="proto-list-sub">вчера</div>
          </div>
          <div className="proto-list-end">
            <div className="proto-list-value proto-list-value--win">+500 ★</div>
          </div>
        </div>
        <div className="proto-list-item">
          <div className="proto-list-icon">📤</div>
          <div className="proto-list-body">
            <div className="proto-list-title">Вывод</div>
            <div className="proto-list-sub">3 дня назад</div>
          </div>
          <div className="proto-list-end">
            <div className="proto-list-value proto-list-value--loss">-200 ★</div>
          </div>
        </div>
        <div className="proto-list-item">
          <div className="proto-list-icon">🎁</div>
          <div className="proto-list-body">
            <div className="proto-list-title">Бонус</div>
            <div className="proto-list-sub">неделю назад</div>
          </div>
          <div className="proto-list-end">
            <div className="proto-list-value proto-list-value--win">+100 ★</div>
          </div>
        </div>
      </div>
    </div>
  );
}
