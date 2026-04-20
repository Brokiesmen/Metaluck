import { useState, useEffect } from 'react';
import type { Case } from '../types';
import { StarIcon } from './StarIcon';

interface Props {
  cases: Case[];
  selected: Case | null;
  onSelect: (c: Case) => void;
  disabled: boolean;
}

function formatTimer(ms: number): string {
  if (ms <= 0) return '00:00:00';
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function FreeBadge({ nextFreeAt }: { nextFreeAt: number }) {
  const [remaining, setRemaining] = useState(() => Math.max(0, nextFreeAt - Date.now()));

  useEffect(() => {
    const id = setInterval(() => {
      const r = Math.max(0, nextFreeAt - Date.now());
      setRemaining(r);
    }, 1000);
    return () => clearInterval(id);
  }, [nextFreeAt]);

  return (
    <span className="case-free-timer">
      <span className="case-timer-icon">⏳</span>
      {formatTimer(remaining)}
    </span>
  );
}

const CASE_GRADIENTS: Record<number, { bg: string; glow: string; badge: string }> = {
  1: { bg: 'linear-gradient(145deg, rgba(74,158,218,0.18) 0%, rgba(30,70,110,0.25) 100%)', glow: 'rgba(74,158,218,0.35)', badge: '#4a9eda' },
  2: { bg: 'linear-gradient(145deg, rgba(155,89,182,0.22) 0%, rgba(60,20,90,0.30) 100%)', glow: 'rgba(155,89,182,0.40)', badge: '#9b59b6' },
  3: { bg: 'linear-gradient(145deg, rgba(232,163,25,0.22) 0%, rgba(90,50,5,0.30)  100%)', glow: 'rgba(232,163,25,0.45)', badge: '#e8a319' },
};

export function CaseGrid({ cases, selected, onSelect, disabled }: Props) {
  return (
    <div className="cases-section">
      <div className="tg-section-title">Выберите кейс</div>
      <div className="cases-row">
        {cases.map(c => {
          const g = CASE_GRADIENTS[c.id] ?? CASE_GRADIENTS[1];
          const isActive = selected?.id === c.id;
          const isFreeNow = c.isFree && c.freeAvailable;
          const isTimerActive = c.isFree && !c.freeAvailable && c.nextFreeAt;

          return (
            <button
              key={c.id}
              className={`case-card${isActive ? ' case-card--active' : ''}`}
              style={{
                '--case-bg': g.bg,
                '--case-glow': g.glow,
                '--case-color': c.color,
              } as React.CSSProperties}
              onClick={() => !disabled && onSelect(c)}
              disabled={disabled}
            >
              {/* Top accent bar */}
              <div className="case-card-accent" />

              {/* Badge: FREE or tier number */}
              {isFreeNow ? (
                <span className="case-badge case-badge--free">БЕСПЛАТНО</span>
              ) : c.isFree ? (
                <span className="case-badge case-badge--paid">ЕЖЕДНЕВНО</span>
              ) : null}

              {/* Icon */}
              <span className="case-card-icon">{c.icon}</span>

              {/* Name */}
              <span className="case-card-name">{c.name}</span>

              {/* Price or timer */}
              {isFreeNow ? (
                <span className="case-card-price case-card-price--free">Бесплатно</span>
              ) : isTimerActive ? (
                <FreeBadge nextFreeAt={c.nextFreeAt!} />
              ) : (
                <span className="case-card-price num">
                  {c.price.toLocaleString('ru-RU')}
                  <StarIcon size={13} animate={false} />
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
