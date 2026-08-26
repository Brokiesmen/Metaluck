import { useState } from 'react';
import type { VerificationStatus } from '../ProtoApp';

interface Props {
  status: VerificationStatus;
  onClose: () => void;
  onStatusChange: (status: VerificationStatus) => void;
}

type Step = 'intro' | 'email' | 'phone' | 'documents' | 'pending' | 'success';

export function VerificationModal({ status, onClose, onStatusChange }: Props) {
  const [step, setStep] = useState<Step>(
    status === 'verified' ? 'success' : 
    status === 'pending' ? 'pending' : 
    'intro'
  );
  const [email, setEmail] = useState('mark@example.com');
  const [phone, setPhone] = useState('+7 999 123 45 67');

  const handleSubmitEmail = () => {
    setStep('phone');
  };

  const handleSubmitPhone = () => {
    setStep('documents');
  };

  const handleSubmitDocuments = () => {
    setStep('pending');
    onStatusChange('pending');
  };

  const handleComplete = () => {
    setStep('success');
    onStatusChange('verified');
  };

  const renderContent = () => {
    switch (step) {
      case 'intro':
        return (
          <>
            <div className="proto-modal-header">
              <h2 className="proto-modal-title">Верификация</h2>
              <p className="proto-modal-desc">
                Подтвердите аккаунт для вывода средств
              </p>
            </div>

            <div className="proto-modal-body">
              <div className="proto-verify-steps">
                <div className="proto-verify-step">
                  <div className="proto-verify-step-num">1</div>
                  <div className="proto-verify-step-body">
                    <div className="proto-verify-step-title">Email</div>
                    <div className="proto-verify-step-desc">
                      Подтвердите электронную почту
                    </div>
                  </div>
                </div>
                <div className="proto-verify-step">
                  <div className="proto-verify-step-num">2</div>
                  <div className="proto-verify-step-body">
                    <div className="proto-verify-step-title">Телефон</div>
                    <div className="proto-verify-step-desc">
                      Подтвердите номер телефона
                    </div>
                  </div>
                </div>
                <div className="proto-verify-step">
                  <div className="proto-verify-step-num">3</div>
                  <div className="proto-verify-step-body">
                    <div className="proto-verify-step-title">Документы</div>
                    <div className="proto-verify-step-desc">
                      Загрузите фото документа
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="proto-modal-actions">
              <button 
                type="button" 
                className="proto-btn proto-btn--gold proto-btn--full"
                onClick={() => setStep('email')}
              >
                Начать верификацию
              </button>
              <button 
                type="button" 
                className="proto-btn proto-btn--full"
                onClick={onClose}
              >
                Позже
              </button>
            </div>
          </>
        );

      case 'email':
        return (
          <>
            <div className="proto-modal-header">
              <h2 className="proto-modal-title">Шаг 1: Email</h2>
              <p className="proto-modal-desc">
                Введите и подтвердите email
              </p>
            </div>

            <div className="proto-modal-body">
              <div className="proto-verify-steps">
                <div className="proto-verify-step proto-verify-step--active">
                  <div className="proto-verify-step-num">1</div>
                  <div className="proto-verify-step-body">
                    <div className="proto-verify-step-title">Email</div>
                    <input
                      type="email"
                      className="proto-input"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="email@example.com"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="proto-modal-actions">
              <button 
                type="button" 
                className="proto-btn proto-btn--gold proto-btn--full"
                onClick={handleSubmitEmail}
              >
                Подтвердить email
              </button>
              <button 
                type="button" 
                className="proto-btn proto-btn--full"
                onClick={() => setStep('intro')}
              >
                Назад
              </button>
            </div>
          </>
        );

      case 'phone':
        return (
          <>
            <div className="proto-modal-header">
              <h2 className="proto-modal-title">Шаг 2: Телефон</h2>
              <p className="proto-modal-desc">
                Введите и подтвердите номер
              </p>
            </div>

            <div className="proto-modal-body">
              <div className="proto-verify-steps">
                <div className="proto-verify-step proto-verify-step--done">
                  <div className="proto-verify-step-num">✓</div>
                  <div className="proto-verify-step-body">
                    <div className="proto-verify-step-title">Email</div>
                    <div className="proto-verify-step-desc">{email}</div>
                  </div>
                </div>
                <div className="proto-verify-step proto-verify-step--active">
                  <div className="proto-verify-step-num">2</div>
                  <div className="proto-verify-step-body">
                    <div className="proto-verify-step-title">Телефон</div>
                    <input
                      type="tel"
                      className="proto-input"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+7 999 123 45 67"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="proto-modal-actions">
              <button 
                type="button" 
                className="proto-btn proto-btn--gold proto-btn--full"
                onClick={handleSubmitPhone}
              >
                Подтвердить телефон
              </button>
              <button 
                type="button" 
                className="proto-btn proto-btn--full"
                onClick={() => setStep('email')}
              >
                Назад
              </button>
            </div>
          </>
        );

      case 'documents':
        return (
          <>
            <div className="proto-modal-header">
              <h2 className="proto-modal-title">Шаг 3: Документы</h2>
              <p className="proto-modal-desc">
                Загрузите фото документа
              </p>
            </div>

            <div className="proto-modal-body">
              <div className="proto-verify-steps">
                <div className="proto-verify-step proto-verify-step--done">
                  <div className="proto-verify-step-num">✓</div>
                  <div className="proto-verify-step-body">
                    <div className="proto-verify-step-title">Email</div>
                    <div className="proto-verify-step-desc">{email}</div>
                  </div>
                </div>
                <div className="proto-verify-step proto-verify-step--done">
                  <div className="proto-verify-step-num">✓</div>
                  <div className="proto-verify-step-body">
                    <div className="proto-verify-step-title">Телефон</div>
                    <div className="proto-verify-step-desc">{phone}</div>
                  </div>
                </div>
                <div className="proto-verify-step proto-verify-step--active">
                  <div className="proto-verify-step-num">3</div>
                  <div className="proto-verify-step-body">
                    <div className="proto-verify-step-title">Документы</div>
                    <div className="proto-verify-step-desc">
                      Паспорт или водительские права
                    </div>
                    <button
                      type="button"
                      className="proto-btn proto-btn--full"
                      style={{ marginTop: '12px' }}
                    >
                      📷 Загрузить фото
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="proto-modal-actions">
              <button 
                type="button" 
                className="proto-btn proto-btn--gold proto-btn--full"
                onClick={handleSubmitDocuments}
              >
                Отправить на проверку
              </button>
              <button 
                type="button" 
                className="proto-btn proto-btn--full"
                onClick={() => setStep('phone')}
              >
                Назад
              </button>
            </div>
          </>
        );

      case 'pending':
        return (
          <>
            <div className="proto-modal-header">
              <h2 className="proto-modal-title">На проверке</h2>
              <p className="proto-modal-desc">
                Документы отправлены на верификацию
              </p>
            </div>

            <div className="proto-modal-body">
              <div style={{ 
                textAlign: 'center', 
                padding: '32px 16px' 
              }}>
                <div style={{ fontSize: '64px', marginBottom: '16px' }}>⏳</div>
                <div style={{ 
                  fontSize: '15px', 
                  fontWeight: 600,
                  marginBottom: '8px'
                }}>
                  Проверка обычно занимает 1-2 часа
                </div>
                <div style={{ 
                  fontSize: '13px', 
                  color: 'var(--text-tertiary)' 
                }}>
                  Мы уведомим вас о результате
                </div>
              </div>

              <div className="proto-verify-steps">
                <div className="proto-verify-step proto-verify-step--done">
                  <div className="proto-verify-step-num">✓</div>
                  <div className="proto-verify-step-body">
                    <div className="proto-verify-step-title">Email подтверждён</div>
                  </div>
                </div>
                <div className="proto-verify-step proto-verify-step--done">
                  <div className="proto-verify-step-num">✓</div>
                  <div className="proto-verify-step-body">
                    <div className="proto-verify-step-title">Телефон подтверждён</div>
                  </div>
                </div>
                <div className="proto-verify-step proto-verify-step--active">
                  <div className="proto-verify-step-num">⏳</div>
                  <div className="proto-verify-step-body">
                    <div className="proto-verify-step-title">Проверка документов</div>
                    <div className="proto-verify-step-desc">В процессе...</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="proto-modal-actions">
              <button 
                type="button" 
                className="proto-btn proto-btn--gold proto-btn--full"
                onClick={handleComplete}
              >
                (Демо) Завершить проверку
              </button>
              <button 
                type="button" 
                className="proto-btn proto-btn--full"
                onClick={onClose}
              >
                Закрыть
              </button>
            </div>
          </>
        );

      case 'success':
        return (
          <>
            <div className="proto-modal-header">
              <h2 className="proto-modal-title">Верифицирован</h2>
              <p className="proto-modal-desc">
                Ваш аккаунт успешно подтверждён
              </p>
            </div>

            <div className="proto-modal-body">
              <div style={{ 
                textAlign: 'center', 
                padding: '32px 16px' 
              }}>
                <div style={{ 
                  fontSize: '64px', 
                  marginBottom: '16px',
                  filter: 'drop-shadow(0 0 20px rgba(46, 204, 113, 0.4))'
                }}>
                  ✅
                </div>
                <div style={{ 
                  fontSize: '15px', 
                  fontWeight: 600,
                  marginBottom: '8px',
                  color: 'var(--success)'
                }}>
                  Верификация пройдена
                </div>
                <div style={{ 
                  fontSize: '13px', 
                  color: 'var(--text-tertiary)' 
                }}>
                  Теперь вы можете выводить средства без ограничений
                </div>
              </div>

              <div className="proto-verify-steps">
                <div className="proto-verify-step proto-verify-step--done">
                  <div className="proto-verify-step-num">✓</div>
                  <div className="proto-verify-step-body">
                    <div className="proto-verify-step-title">Email подтверждён</div>
                  </div>
                </div>
                <div className="proto-verify-step proto-verify-step--done">
                  <div className="proto-verify-step-num">✓</div>
                  <div className="proto-verify-step-body">
                    <div className="proto-verify-step-title">Телефон подтверждён</div>
                  </div>
                </div>
                <div className="proto-verify-step proto-verify-step--done">
                  <div className="proto-verify-step-num">✓</div>
                  <div className="proto-verify-step-body">
                    <div className="proto-verify-step-title">Документы проверены</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="proto-modal-actions">
              <button 
                type="button" 
                className="proto-btn proto-btn--gold proto-btn--full"
                onClick={onClose}
              >
                Готово
              </button>
            </div>
          </>
        );
    }
  };

  return (
    <div className="proto-modal-backdrop" onClick={onClose}>
      <div className="proto-modal" onClick={(e) => e.stopPropagation()}>
        {renderContent()}
      </div>
    </div>
  );
}
