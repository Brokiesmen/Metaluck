import type { Case } from '../types';
import { StarIcon } from './StarIcon';

interface Props {
  cases: Case[];
  selected: Case | null;
  onSelect: (c: Case) => void;
  disabled: boolean;
}

export function CaseGrid({ cases, selected, onSelect, disabled }: Props) {
  return (
    <div className="cases-section">
      <div className="tg-section-title">Выберите кейс</div>
      <div className="cases-row">
        {cases.map(c => (
          <button
            key={c.id}
            className={`case-pill${selected?.id === c.id ? ' active' : ''}`}
            style={{ '--case-color': c.color } as React.CSSProperties}
            onClick={() => !disabled && onSelect(c)}
            disabled={disabled}
          >
            <span className="case-pill-icon">{c.icon}</span>
            <span className="case-pill-name">{c.name}</span>
            <span className="case-pill-price num">
              {c.price}
              <StarIcon size={15} animate={false} />
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
