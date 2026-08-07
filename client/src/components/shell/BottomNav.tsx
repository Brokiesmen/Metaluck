import { NavLink } from 'react-router-dom';
import { navItems } from './navItems';
import { haptic } from './telegram';

/** Мобильная навигация. Тот же общий navItems, что и Sidebar. */
export function BottomNav() {
  return (
    <nav className="sh-bottomnav">
      {navItems.map((item) => (
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
      ))}
    </nav>
  );
}
