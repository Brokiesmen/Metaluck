import { RARITY, GIFT_IMAGES } from '../data';
import type { Prize } from '../types';

interface Props { prizes: Prize[] }

const ORDER = { gray: 0, blue: 1, purple: 2, gold: 3 } as const;

export function PrizesGrid({ prizes }: Props) {
  const sorted = [...prizes].sort((a, b) => ORDER[a.rarity] - ORDER[b.rarity]);
  return (
    <div className="prizes-section">
      <div className="tg-section-title">Возможные призы</div>
      <div className="prizes-grid">
        {sorted.map(p => {
          const r   = RARITY[p.rarity];
          const img = GIFT_IMAGES[p.id];
          return (
            <div key={p.id} className="prize-card"
              style={{ borderColor: r.border, color: r.border }}>
              <div className="prize-img-wrap">
                {img
                  ? <img src={img.image} alt={p.name} className="prize-img" />
                  : <span className="prize-icon">{p.icon}</span>}
              </div>
              <div className="prize-card-overlay">
                <div className="prize-name">{p.name}</div>
                <div className="prize-rarity">{r.label}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
