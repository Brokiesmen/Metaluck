import { useSettings } from '../settings/SettingsContext';
import { StarIcon } from '../components/StarIcon';
import type { AppSection } from './types';

interface Props {
  userName: string;
  balance: number;
  onNavigate: (section: AppSection) => void;
}

/** Home / Dashboard — общий экран; Desktop открывает по умолчанию, Telegram может открыть через nav. */
export function HomeDashboard({ userName, balance, onNavigate }: Props) {
  const { t, locale } = useSettings();

  return (
    <section className="desk-dash app-home">
      <div className="desk-dash-hero">
        <p className="desk-dash-kicker">{t.desktop.brand}</p>
        <h1 className="desk-dash-welcome">
          {t.desktop.welcome.replace('{name}', userName)}
        </h1>
        <p className="desk-dash-sub">{t.desktop.dashboardHint}</p>
      </div>

      <div className="desk-dash-grid">
        <button
          type="button"
          className="desk-dash-card desk-dash-card--balance"
          onClick={() => onNavigate('wallet')}
        >
          <span className="desk-dash-card-label">{t.desktop.balance}</span>
          <span className="desk-dash-card-value num">
            {balance.toLocaleString(locale)}
            <StarIcon size={22} />
          </span>
        </button>

        <button type="button" className="desk-dash-card" onClick={() => onNavigate('games')}>
          <span className="desk-dash-card-label">{t.desktop.games}</span>
          <span className="desk-dash-card-cta">{t.desktop.playNow}</span>
        </button>

        <button type="button" className="desk-dash-card" onClick={() => onNavigate('rewards')}>
          <span className="desk-dash-card-label">{t.desktop.rewards}</span>
          <span className="desk-dash-card-cta">{t.desktop.openRewards}</span>
        </button>

        <button type="button" className="desk-dash-card" onClick={() => onNavigate('profile')}>
          <span className="desk-dash-card-label">{t.desktop.profile}</span>
          <span className="desk-dash-card-cta">{t.desktop.openProfile}</span>
        </button>
      </div>
    </section>
  );
}
