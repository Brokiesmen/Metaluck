import { useState } from 'react';
import type { User } from '../ProtoApp';

interface Props {
  mode: 'login' | 'register';
  onClose: () => void;
  onLogin: (user: User) => void;
  onSwitchMode: (mode: 'login' | 'register') => void;
}

export function AuthModal({ mode, onClose, onLogin, onSwitchMode }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Заполните все поля');
      return;
    }

    if (mode === 'register' && !name) {
      setError('Введите имя');
      return;
    }

    // Demo: just log in with the provided data
    const avatars = ['🦊', '🐻', '🦁', '🐺', '🦅', '🐲'];
    const randomAvatar = avatars[Math.floor(Math.random() * avatars.length)];

    onLogin({
      name: mode === 'register' ? name : email.split('@')[0],
      email,
      avatar: randomAvatar,
    });
  };

  return (
    <div className="proto-modal-backdrop" onClick={onClose}>
      <div className="proto-modal proto-auth-modal" onClick={(e) => e.stopPropagation()}>
        <div className="proto-modal-header">
          <h2 className="proto-modal-title">
            {mode === 'login' ? 'Вход' : 'Регистрация'}
          </h2>
          <p className="proto-modal-desc">
            {mode === 'login' 
              ? 'Войдите в свой аккаунт' 
              : 'Создайте новый аккаунт'}
          </p>
        </div>

        <form className="proto-auth-form" onSubmit={handleSubmit}>
          {mode === 'register' && (
            <div className="proto-form-field">
              <label className="proto-form-label">Имя</label>
              <input
                type="text"
                className="proto-input"
                placeholder="Марк"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
          )}

          <div className="proto-form-field">
            <label className="proto-form-label">Email или телефон</label>
            <input
              type="text"
              className="proto-input"
              placeholder="email@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="proto-form-field">
            <label className="proto-form-label">Пароль</label>
            <input
              type="password"
              className="proto-input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error && (
            <div className="proto-form-error">{error}</div>
          )}

          <button type="submit" className="proto-btn proto-btn--gold proto-btn--full">
            {mode === 'login' ? 'Войти' : 'Зарегистрироваться'}
          </button>
        </form>

        <div className="proto-auth-divider">
          <span>или</span>
        </div>

        <div className="proto-auth-socials">
          <button type="button" className="proto-social-btn">
            <span>📱</span> Telegram
          </button>
          <button type="button" className="proto-social-btn">
            <span>🌐</span> Google
          </button>
        </div>

        <div className="proto-auth-footer">
          {mode === 'login' ? (
            <p>
              Нет аккаунта?{' '}
              <button 
                type="button" 
                className="proto-link"
                onClick={() => onSwitchMode('register')}
              >
                Зарегистрироваться
              </button>
            </p>
          ) : (
            <p>
              Уже есть аккаунт?{' '}
              <button 
                type="button" 
                className="proto-link"
                onClick={() => onSwitchMode('login')}
              >
                Войти
              </button>
            </p>
          )}
        </div>

        <button 
          type="button" 
          className="proto-modal-close"
          onClick={onClose}
        >
          ✕
        </button>
      </div>
    </div>
  );
}
