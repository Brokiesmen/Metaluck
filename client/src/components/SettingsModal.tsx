import { LANG_OPTIONS, type AppLanguage, type AppTheme } from '../settings/types';
import { useSettings } from '../settings/SettingsContext';
import { ModalShell } from './ModalShell';
import { WalletLinkPanel } from './WalletLinkPanel';

interface Props {
  onClose: () => void;
}

export function SettingsModal({ onClose }: Props) {
  const { language, theme, t, setLanguage, setTheme } = useSettings();

  return (
    <ModalShell
      onClose={onClose}
      overlayClassName="settings-overlay"
      sheetClassName="settings-sheet"
      labelledBy="settings-title"
    >
      <div className="modal-handle" />
      <h2 id="settings-title" className="settings-title">
        ⚙️ {t.settings.title}
      </h2>

      <section className="settings-section" aria-labelledby="settings-lang">
        <h3 id="settings-lang" className="settings-section-title">
          {t.settings.language}
        </h3>
        <div className="settings-options" role="radiogroup" aria-labelledby="settings-lang">
          {LANG_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              role="radio"
              aria-checked={language === opt.id}
              className={`settings-option${language === opt.id ? ' settings-option--on' : ''}`}
              onClick={() => setLanguage(opt.id as AppLanguage)}
            >
              <span className="settings-option-flag" aria-hidden>
                {opt.flag}
              </span>
              <span className="settings-option-label">{opt.nativeName}</span>
              {language === opt.id && <span className="settings-option-check" aria-hidden>✓</span>}
            </button>
          ))}
        </div>
      </section>

      <section className="settings-section" aria-labelledby="settings-theme">
        <h3 id="settings-theme" className="settings-section-title">
          {t.settings.theme}
        </h3>
        <div className="settings-theme-row" role="radiogroup" aria-labelledby="settings-theme">
          <button
            type="button"
            role="radio"
            aria-checked={theme === 'light'}
            className={`settings-theme-btn${theme === 'light' ? ' settings-theme-btn--on' : ''}`}
            onClick={() => setTheme('light' as AppTheme)}
          >
            <span aria-hidden>☀️</span>
            {t.settings.light}
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={theme === 'dark'}
            className={`settings-theme-btn${theme === 'dark' ? ' settings-theme-btn--on' : ''}`}
            onClick={() => setTheme('dark' as AppTheme)}
          >
            <span aria-hidden>🌙</span>
            {t.settings.dark}
          </button>
        </div>
      </section>

      <section className="settings-section">
        <WalletLinkPanel />
      </section>

      <button type="button" className="tg-btn settings-close modal-action" onClick={onClose}>
        {t.common.close}
      </button>
    </ModalShell>
  );
}
