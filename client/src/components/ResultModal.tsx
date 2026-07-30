import { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { RARITY, GIFT_IMAGES } from '../data';
import { useSettings } from '../settings/SettingsContext';
import type { Prize } from '../types';

interface Props {
  prize: Prize | null;
  onClose: () => void;
}

export function ResultModal({ prize, onClose }: Props) {
  const { t } = useSettings();

  useEffect(() => {
    if (prize) {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        zIndex: 9999,
      });
    }
  }, [prize]);

  if (!prize) return null;
  const r = RARITY[prize.rarity];
  const img = GIFT_IMAGES[prize.id];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="modal-handle" />
        <div className="modal-icon-wrap" style={{ borderColor: r.border, color: r.border }}>
          {img?.animated ? (
            <img src={img.animated} alt={prize.name} className="modal-anim" />
          ) : img ? (
            <img src={img.image} alt={prize.name} className="modal-anim" />
          ) : (
            <span className="modal-icon">{prize.icon}</span>
          )}
        </div>
        <div className="modal-rarity" style={{ color: r.text }}>
          {t.rarity[prize.rarity]}
        </div>
        <div className="modal-name">{prize.name}</div>
        <button className="tg-btn" onClick={onClose}>
          {t.cases.take}
        </button>
      </div>
    </div>
  );
}
