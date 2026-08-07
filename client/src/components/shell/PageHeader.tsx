import type { ReactNode } from 'react';

interface Props {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}

export function PageHeader({ title, subtitle, action }: Props) {
  return (
    <header className="sh-page-header">
      <div className="sh-page-header-text">
        <h1 className="sh-page-title">{title}</h1>
        {subtitle && <p className="sh-page-subtitle">{subtitle}</p>}
      </div>
      {action && <div className="sh-page-header-action">{action}</div>}
    </header>
  );
}
