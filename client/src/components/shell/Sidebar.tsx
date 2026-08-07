import { navItems, type NavId } from './navItems';

interface Props {
  active: NavId;
  onNavigate: (id: NavId) => void;
}

/** Desktop-навигация. Использует общий navItems. */
export function Sidebar({ active, onNavigate }: Props) {
  return (
    <aside className="sh-sidebar">
      <div className="sh-sidebar-brand">
        <span className="sh-sidebar-mark" aria-hidden>✦</span>
        <span className="sh-sidebar-name">Metaluck</span>
      </div>
      <nav className="sh-sidebar-nav">
        {navItems.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`sh-sidebar-item${active === item.id ? ' sh-sidebar-item--on' : ''}`}
            aria-current={active === item.id ? 'page' : undefined}
            onClick={() => onNavigate(item.id)}
          >
            <span className="sh-sidebar-icon" aria-hidden>{item.icon}</span>
            <span className="sh-sidebar-label">{item.label}</span>
          </button>
        ))}
      </nav>
    </aside>
  );
}
