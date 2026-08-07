import { NavLink } from 'react-router-dom';
import { navItems, type NavId } from './navItems';

interface Props {
  activeNav?: NavId;
  onNavigate?: (id: NavId) => void;
  onDeposit?: () => void;
}

/** Desktop-навигация. Использует общий navItems (+ роутер или controlled). */
export function Sidebar({ activeNav, onNavigate, onDeposit }: Props = {}) {
  const controlled = typeof onNavigate === 'function';

  return (
    <aside className="sh-sidebar">
      <div className="sh-sidebar-brand">
        <span className="sh-sidebar-mark" aria-hidden>✦</span>
        <span className="sh-sidebar-name">Metaluck</span>
      </div>
      <nav className="sh-sidebar-nav">
        {navItems.map((item) => {
          if (controlled) {
            const on = activeNav === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onNavigate!(item.id)}
                className={`sh-sidebar-item${on ? ' sh-sidebar-item--on' : ''}`}
              >
                <span className="sh-sidebar-icon" aria-hidden>{item.icon}</span>
                <span className="sh-sidebar-label">{item.label}</span>
              </button>
            );
          }

          return (
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
          );
        })}
      </nav>
      <div className="sh-sidebar-foot">
        <button
          type="button"
          className="sh-btn sh-btn--primary sh-sidebar-cta"
          onClick={onDeposit}
        >
          Deposit
        </button>
      </div>
    </aside>
  );
}
