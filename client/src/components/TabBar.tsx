import { TabGamesIcon } from './tab-icons/TabGamesIcon';
import { TabCabinetIcon } from './tab-icons/TabCabinetIcon';
import { TabLeadersIcon } from './tab-icons/TabLeadersIcon';
import { TabDailyIcon } from './tab-icons/TabDailyIcon';

export type Tab = 'games' | 'cabinet' | 'leaders' | 'daily';

interface Props {
  active: Tab;
  onChange: (t: Tab) => void;
}

export function TabBar({ active, onChange }: Props) {
  return (
    <nav className="tab-bar">
      <button
        type="button"
        className={`tab-item${active === 'games' ? ' active' : ''}`}
        onClick={() => onChange('games')}
      >
        <span className="tab-icon tab-icon--games" aria-hidden>
          <TabGamesIcon />
        </span>
        <span className="tab-label">Игры</span>
      </button>
      <button
        type="button"
        className={`tab-item${active === 'leaders' ? ' active' : ''}`}
        onClick={() => onChange('leaders')}
      >
        <span className="tab-icon tab-icon--leaders" aria-hidden>
          <TabLeadersIcon />
        </span>
        <span className="tab-label">Лидеры</span>
      </button>
      <button
        type="button"
        className={`tab-item${active === 'daily' ? ' active' : ''}`}
        onClick={() => onChange('daily')}
      >
        <span className="tab-icon tab-icon--daily" aria-hidden>
          <TabDailyIcon />
        </span>
        <span className="tab-label">Ежедневно</span>
      </button>
      <button
        type="button"
        className={`tab-item${active === 'cabinet' ? ' active' : ''}`}
        onClick={() => onChange('cabinet')}
      >
        <span className="tab-icon tab-icon--cabinet" aria-hidden>
          <TabCabinetIcon />
        </span>
        <span className="tab-label">Кабинет</span>
      </button>
    </nav>
  );
}
