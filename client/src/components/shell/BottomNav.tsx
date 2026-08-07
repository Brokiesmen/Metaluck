import { navItems, type NavId } from './navItems';

interface Props {
  active: NavId;
  onNavigate: (id: NavId) => void;
}

/** Telegram/мобильная навигация. Тот же общий navItems, что и Sidebar. */
export function BottomNav({ active, onNavigate }: Props) {
  return (
    <nav className="sh-bottomnav">
      {navItems.map((item) => (
        <button
          key={item.id}
          type="button"
          className={`sh-bottomnav-item${active === item.id ? ' sh-bottomnav-item--on' : ''}`}
          aria-current={active === item.id ? 'page' : undefined}
          onClick={() => onNavigate(item.id)}
        >
          <span className="sh-bottomnav-icon" aria-hidden>{item.icon}</span>
          <span className="sh-bottomnav-label">{item.label}</span>
        </button>
      ))}
    </nav>
  );
}
