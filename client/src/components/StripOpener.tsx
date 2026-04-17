import { useRef, useEffect, useCallback } from 'react';
import { RARITY, GIFT_IMAGES } from '../data';
import { StarIcon } from './StarIcon';
import type { Prize, Case } from '../types';

const CARD_WIDTH = 130;
const CARD_GAP   = 8;
const CARD_SLOT  = CARD_WIDTH + CARD_GAP; // 138
const WINNER_IDX = 52;
const TOTAL      = 65;

interface Props {
  selectedCase: Case | null;
  prizes: Prize[];
  winner: Prize | null;
  previewKey: number;
  isAnimating: boolean;
  onOpen: () => void;
  onDone: (prize: Prize) => void;
}

function makeCard(prize: Prize): HTMLDivElement {
  const r   = RARITY[prize.rarity];
  const img = GIFT_IMAGES[prize.id];
  const div = document.createElement('div');
  div.className = 'strip-card';
  div.style.cssText = `border-color:${r.border}; color:${r.border};`;
  const mediaHtml = img
    ? `<img src="${img.image}" alt="${prize.name}" class="card-img" />`
    : `<div class="card-icon">${prize.icon}</div>`;
  div.innerHTML = `
    ${mediaHtml}
    <div class="card-overlay">
      <div class="card-name">${prize.name}</div>
    </div>
  `;
  return div;
}

function pickAny(prizes: Prize[]): Prize {
  return prizes[Math.floor(Math.random() * prizes.length)];
}

export function StripOpener({
  selectedCase, prizes, winner, previewKey, isAnimating, onOpen, onDone,
}: Props) {
  const stripRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  const buildStrip = useCallback((w: Prize) => {
    const strip = stripRef.current;
    const track = trackRef.current;
    if (!strip || !track) return;

    const LEFT_CARDS = 4; // cards visible to the left of the indicator
    const trackW = track.offsetWidth || 480;
    const startX = trackW / 2 - CARD_WIDTH / 2 - LEFT_CARDS * CARD_SLOT;

    strip.style.transition = 'none';
    strip.style.transform  = `translateX(${startX}px)`;
    strip.innerHTML = '';
    for (let i = 0; i < TOTAL; i++) {
      strip.appendChild(makeCard(i === WINNER_IDX ? w : pickAny(prizes)));
    }
  }, [prizes]);

  const animateStrip = useCallback((onComplete: () => void) => {
    const strip = stripRef.current;
    const track = trackRef.current;
    if (!strip || !track) return;
    const finalX = track.offsetWidth / 2 - (WINNER_IDX * CARD_SLOT + CARD_WIDTH / 2);
    void strip.getBoundingClientRect();
    strip.style.transition = 'transform 7s cubic-bezier(0.08, 0.82, 0.17, 1)';
    strip.style.transform  = `translateX(${finalX}px)`;
    setTimeout(onComplete, 7200);
  }, []);

  useEffect(() => {
    if (prizes.length > 0) buildStrip(pickAny(prizes));
  }, [selectedCase, previewKey, prizes, buildStrip]);

  useEffect(() => {
    if (!winner) return;
    buildStrip(winner);
    requestAnimationFrame(() => requestAnimationFrame(() =>
      animateStrip(() => onDone(winner))
    ));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [winner]);

  return (
    <div className="strip-section">
      {/* Tape */}
      <div className="strip-wrapper">
        <div className="fade fade-left"  />
        <div className="fade fade-right" />
        <div className="ind-arrow ind-top" />
        <div className="ind-line" />
        <div className="ind-arrow ind-bot" />
        <div className="strip-track" ref={trackRef}>
          <div className="strip" ref={stripRef} />
        </div>
      </div>

      {/* Open button — Telegram-style, full width */}
      <button
        className={`tg-btn open-btn${isAnimating ? ' loading' : ''}`}
        onClick={onOpen}
        disabled={!selectedCase || isAnimating}
      >
        {isAnimating ? (
          'Открывается…'
        ) : !selectedCase ? (
          'Выберите кейс'
        ) : (
          <>
            <span className="open-btn-text num">Открыть · {selectedCase.price}</span>
            <span className="open-btn-star" aria-hidden>
              <StarIcon size={21} animate={false} glow={false} />
            </span>
          </>
        )}
      </button>
    </div>
  );
}
