import { NavLink } from 'react-router-dom';
import { navItems } from './navItems';

/** Desktop-навигация. Использует общий navItems + роутер. */
export function Sidebar() {
  return (
    <aside className="sh-sidebar">
      <div className="sh-sidebar-brand">
        <span className="sh-sidebar-mark" aria-hidden>✦</span>
        <span className="sh-sidebar-name">Metaluck</span>
      </div>
      <nav className="sh-sidebar-nav">
        {navItems.map((item) => (
          <NavLink
            key={item.id}
            to={item.path}
            end={item.path === '/'}
            className={({ isActive }) =>
              `sh-sidebar-item${isActive ? ' sh-sidebar-item--on' : ''}`
            }
          >
            <span className="sh-sidebar-icon" aria-hidden>{item.icon}</span>
            <span className="sh-sidebar-label">{item.label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="sh-sidebar-foot">
        <button type="button" className="sh-btn sh-btn--primary sh-sidebar-cta">Deposit</button>
      </div>
    </aside>
  );
}
