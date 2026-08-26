import { useState } from 'react';
import { protoProfile, protoStats, protoActivity } from '../data';
import type { VerificationStatus, Wallets } from '../ProtoApp';
import { VerificationModal } from '../components/VerificationModal';

interface Props {
  view: 'cabinet' | 'wallet';
  verificationStatus: VerificationStatus;
  onVerificationChange: (status: VerificationStatus) => void;
  wallets: Wallets;
}

export function ProfilePage({ view, verificationStatus, onVerificationChange, wallets }: Props) {
  if (view === 'wallet') {
    return <WalletView wallets={wallets} />;
  }
  return (
    <CabinetView 
      verificationStatus={verificationStatus} 
      onVerificationChange={onVerificationChange} 
    />
  );
}

interface CabinetProps {
  verificationStatus: VerificationStatus;
  onVerificationChange: (status: VerificationStatus) => void;
}

function CabinetView({ verificationStatus, onVerificationChange }: CabinetProps) {
  const [showVerification, setShowVerification] = useState(false);

  const getVerificationBadge = () => {
    switch (verificationStatus) {
      case 'verified':
        return (
          <span className="proto-verification-badge proto-verification-badge--verified">
            ✓ Верифицирован
          </span>
        );
      case 'pending':
        return (
          <span className="proto-verification-badge proto-verification-badge--pending">
            ⏳ На проверке
          </span>
        );
      default:
        return (
          <span className="proto-verification-badge proto-verification-badge--unverified">
            ○ Не верифицирован
          </span>
        );
    }
  };

  const getVerificationHint = () => {
    switch (verificationStatus) {
      case 'verified':
        return 'Аккаунт подтверждён';
      case 'pending':
        return 'Проверка документов...';
      default:
        return 'Требуется верификация';
    }
  };

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
          {getVerificationBadge()}
        </div>
      </div>

      {/* Verification card - prominent when unverified */}
      {verificationStatus !== 'verified' && (
        <div 
          className="proto-list-item proto-list-item--interactive"
          onClick={() => setShowVerification(true)}
          style={{
            borderColor: verificationStatus === 'unverified' 
              ? 'rgba(231, 76, 60, 0.3)' 
              : 'rgba(243, 156, 18, 0.3)'
          }}
        >
          <div 
            className="proto-list-icon"
            style={{ 
              color: verificationStatus === 'unverified' ? '#e74c3c' : '#f39c12',
              background: verificationStatus === 'unverified' 
                ? 'rgba(231, 76, 60, 0.15)' 
                : 'rgba(243, 156, 18, 0.15)'
            }}
          >
            {verificationStatus === 'pending' ? '⏳' : '🛡️'}
          </div>
          <div className="proto-list-body">
            <div className="proto-list-title">Верификация</div>
            <div className="proto-list-sub">{getVerificationHint()}</div>
          </div>
          <span style={{ color: 'var(--text-tertiary)', fontSize: '16px' }}>›</span>
        </div>
      )}

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
        <div 
          className="proto-setting-row proto-setting-row--interactive"
          onClick={() => setShowVerification(true)}
        >
          <div>
            <div className="proto-setting-label">Верификация</div>
            <div className="proto-setting-hint">{getVerificationHint()}</div>
          </div>
          <span className="proto-setting-chevron">›</span>
        </div>
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

      {/* Verification modal */}
      {showVerification && (
        <VerificationModal 
          status={verificationStatus}
          onClose={() => setShowVerification(false)}
          onStatusChange={onVerificationChange}
        />
      )}
    </div>
  );
}

function WalletView({ wallets }: { wallets: Wallets }) {
  const totalUsd = (wallets.stars * 0.015) + (wallets.ton * 5.5) + wallets.usdt;
  
  return (
    <div className="proto-page">
      {/* Balance hero */}
      <div className="proto-card proto-wallet-hero">
        <div className="proto-wallet-label">Общий баланс</div>
        <div className="proto-wallet-amount">
          ≈ ${totalUsd.toFixed(2)}
        </div>
        <div className="proto-wallet-fiat">во всех валютах</div>
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
        <div className="proto-list-item">
          <div className="proto-list-icon proto-list-icon--gold">★</div>
          <div className="proto-list-body">
            <div className="proto-list-title">Stars</div>
            <div className="proto-list-sub">STARS</div>
          </div>
          <div className="proto-list-end">
            <div className="proto-list-value">{wallets.stars.toLocaleString('ru-RU')}</div>
            <div className="proto-list-hint">≈ ${(wallets.stars * 0.015).toFixed(2)}</div>
          </div>
        </div>
        <div className="proto-list-item">
          <div className="proto-list-icon">💎</div>
          <div className="proto-list-body">
            <div className="proto-list-title">Toncoin</div>
            <div className="proto-list-sub">TON</div>
          </div>
          <div className="proto-list-end">
            <div className="proto-list-value">{wallets.ton.toFixed(2)}</div>
            <div className="proto-list-hint">≈ ${(wallets.ton * 5.5).toFixed(2)}</div>
          </div>
        </div>
        <div className="proto-list-item">
          <div className="proto-list-icon">$</div>
          <div className="proto-list-body">
            <div className="proto-list-title">Tether</div>
            <div className="proto-list-sub">USDT</div>
          </div>
          <div className="proto-list-end">
            <div className="proto-list-value">{wallets.usdt.toFixed(2)}</div>
            <div className="proto-list-hint">≈ ${wallets.usdt.toFixed(2)}</div>
          </div>
        </div>
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
