import { NavLink } from 'react-router-dom';
import { navItems, type NavId } from './navItems';
import { haptic } from './telegram';

interface Props {
  /** Controlled mode: highlight + callbacks instead of react-router. */
  activeNav?: NavId;
  onNavigate?: (id: NavId) => void;
}

/** Мобильная навигация. Тот же общий navItems, что и Sidebar. */
export function BottomNav({ activeNav, onNavigate }: Props = {}) {
  const controlled = typeof onNavigate === 'function';

  return (
    <nav className="sh-bottomnav">
      {navItems.map((item) => {
        if (controlled) {
          const on = activeNav === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                haptic.selection();
                onNavigate!(item.id);
              }}
              className={`sh-bottomnav-item${on ? ' sh-bottomnav-item--on' : ''}`}
            >
              <span className="sh-bottomnav-icon" aria-hidden>{item.icon}</span>
              <span className="sh-bottomnav-label">{item.label}</span>
            </button>
          );
        }

        return (
          <NavLink
            key={item.id}
            to={item.path}
            end={item.path === '/'}
            onClick={() => haptic.selection()}
            className={({ isActive }) =>
              `sh-bottomnav-item${isActive ? ' sh-bottomnav-item--on' : ''}`
            }
          >
            <span className="sh-bottomnav-icon" aria-hidden>{item.icon}</span>
            <span className="sh-bottomnav-label">{item.label}</span>
          </NavLink>
        );
      })}
    </nav>
  );
}
