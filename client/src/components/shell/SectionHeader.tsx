import type { ReactNode } from 'react';

interface Props {
  title: string;
  action?: ReactNode;
}

export function SectionHeader({ title, action }: Props) {
  return (
    <div className="sh-section-header">
      <h2 className="sh-section-title">{title}</h2>
      {action && <div className="sh-section-action">{action}</div>}
    </div>
  );
}
