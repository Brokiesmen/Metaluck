import { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { RARITY, GIFT_IMAGES } from '../data';
import { useSettings } from '../settings/SettingsContext';
import { isDemoMode } from '../demo';
import { isCoarsePointer, prefersReducedMotion } from '../lib/stripPerf';
import { ModalShell } from './ModalShell';
import type { Prize } from '../types';

interface Props {
  prize: Prize | null;
  onClose: () => void;
}

function isHqGraphics(): boolean {
  if (typeof document === 'undefined') return false;
  const d = document.documentElement.dataset;
  return d.hq === '1' || d.device === 'desktop';
}

export function ResultModal({ prize, onClose }: Props) {
  const { t } = useSettings();
  const demo = isDemoMode();
  const hq = isHqGraphics();

  useEffect(() => {
    if (!prize) return;
    // Empty wheel result — no celebration
    if (prize.stars === 0 && prize.icon === '❌') return;
    if ((prize.coupons ?? 0) > 0 || (prize.stars ?? 0) > 0 || prize.icon === '🎁' || prize.icon === '🎟️') {
      const mobile = isCoarsePointer();
      confetti({
        particleCount: mobile ? 40 : hq ? 110 : 70,
        spread: hq ? 72 : 60,
        origin: { y: 0.65 },
        zIndex: 150,
        disableForReducedMotion: true,
      });
    }
  }, [prize, hq]);

  if (!prize) return null;
  const r = RARITY[prize.rarity];
  const img = GIFT_IMAGES[prize.id];
  const useAnimated = Boolean(hq && img?.animated && !prefersReducedMotion());

  return (
    <ModalShell onClose={onClose}>
      <div className="modal-handle" />
      {demo && <div className="demo-result-badge">{t.demo.resultNote}</div>}
      <div className="modal-icon-wrap" style={{ borderColor: r.border, color: r.border }}>
        {img ? (
          <img
            src={useAnimated ? img.animated! : img.image}
            alt={prize.name}
            className="modal-anim"
            decoding="async"
          />
        ) : (
          <span className="modal-icon">{prize.icon}</span>
        )}
      </div>
      <div className="modal-rarity" style={{ color: r.text }}>
        {t.rarity[prize.rarity]}
      </div>
      <div className="modal-name">{prize.name}</div>
      <button type="button" className="tg-btn modal-action" onClick={onClose}>
        {demo ? t.demo.close : t.cases.take}
      </button>
    </ModalShell>
  );
}
