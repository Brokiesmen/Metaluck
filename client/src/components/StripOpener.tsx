import { useRef, useEffect, useCallback, useMemo, useState } from 'react';
import { RARITY } from '../data';
import { StarIcon } from './StarIcon';
import { stripConfig } from '../lib/stripPerf';
import { useSettings } from '../settings/SettingsContext';
import { tf } from '../i18n/tf';
import type { Prize, Case } from '../types';

const CARD_WIDTH = 130;
const CARD_GAP   = 8;
const CARD_SLOT  = CARD_WIDTH + CARD_GAP; // 138

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
  const div = document.createElement('div');
  div.className = 'strip-card strip-card--mystery';
  div.style.cssText = `border-color:${r.border}; color:${r.border};`;
  div.innerHTML = `<div class="card-icon card-icon--mystery" aria-hidden="true">?</div>`;
  return div;
}

function pickAny(prizes: Prize[]): Prize {
  return prizes[Math.floor(Math.random() * prizes.length)];
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return '00:00:00';
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function StripOpener({
  selectedCase, prizes, winner, previewKey, isAnimating, onOpen, onDone,
}: Props) {
  const { t } = useSettings();
  const stripRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const spinTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [isSpinning, setIsSpinning] = useState(false);

  const buildStrip = useCallback((w: Prize) => {
    const strip = stripRef.current;
    const track = trackRef.current;
    if (!strip || !track) return;

    const { total: totalCards, winnerIdx } = stripConfig();
    const LEFT_CARDS = 4;
    const trackW = track.offsetWidth || 480;
    const startX = trackW / 2 - CARD_WIDTH / 2 - LEFT_CARDS * CARD_SLOT;

    strip.style.transition = 'none';
    strip.style.transform  = `translate3d(${startX}px,0,0)`;
    strip.replaceChildren();
    const frag = document.createDocumentFragment();
    for (let i = 0; i < totalCards; i++) {
      frag.appendChild(makeCard(i === winnerIdx ? w : pickAny(prizes)));
    }
    strip.appendChild(frag);
  }, [prizes]);

  const animateStrip = useCallback((onComplete: () => void) => {
    const strip = stripRef.current;
    const track = trackRef.current;
    if (!strip || !track) return;

    const { winnerIdx, durationMs: ms } = stripConfig();
    const finalX = track.offsetWidth / 2 - (winnerIdx * CARD_SLOT + CARD_WIDTH / 2);
    const seconds = (ms / 1000).toFixed(2);

    if (spinTimerRef.current) clearTimeout(spinTimerRef.current);
    setIsSpinning(true);
    strip.classList.add('strip--spinning');

    const finish = () => {
      strip.removeEventListener('transitionend', onEnd);
      if (spinTimerRef.current) {
        clearTimeout(spinTimerRef.current);
        spinTimerRef.current = null;
      }
      strip.classList.remove('strip--spinning');
      strip.style.willChange = '';
      setIsSpinning(false);
      onComplete();
    };

    const onEnd = (e: TransitionEvent) => {
      if (e.target !== strip || e.propertyName !== 'transform') return;
      finish();
    };

    strip.addEventListener('transitionend', onEnd);
    spinTimerRef.current = setTimeout(finish, ms + 250);

    void strip.offsetWidth;
    strip.style.willChange = 'transform';
    strip.style.transition = `transform ${seconds}s cubic-bezier(0.12, 0.75, 0.18, 1)`;
    strip.style.transform  = `translate3d(${finalX}px,0,0)`;
  }, []);

  useEffect(() => () => {
    if (spinTimerRef.current) clearTimeout(spinTimerRef.current);
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

  const isFreeCaseLocked = useMemo(() => {
    if (!selectedCase?.isFree) return false;
    if (selectedCase.freeAvailable === true) return false;
    if (!selectedCase.nextFreeAt) return false;
    return selectedCase.nextFreeAt > nowMs;
  }, [selectedCase, nowMs]);

  useEffect(() => {
    if (!isFreeCaseLocked) return;
    const id = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(id);
  }, [isFreeCaseLocked]);

  const countdownText = useMemo(() => {
    if (!selectedCase?.nextFreeAt) return '00:00:00';
    return formatCountdown(selectedCase.nextFreeAt - nowMs);
  }, [selectedCase, nowMs]);

  return (
    <div className="strip-section">
      {/* Tape */}
      <div className={`strip-wrapper${isSpinning ? ' strip-wrapper--spinning' : ''}`}>
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
        disabled={!selectedCase || isAnimating || isFreeCaseLocked}
      >
        {isAnimating ? (
          t.cases.opening
        ) : !selectedCase ? (
          t.cases.selectCase
        ) : isFreeCaseLocked ? (
          tf(t.cases.spinFreeTimer, { t: countdownText })
        ) : selectedCase.price === 0 ? (
          t.cases.spinFree
        ) : (
          <>
            <span className="open-btn-text num">
              {tf(t.cases.openPrice, { price: selectedCase.price })}
            </span>
            <span className="open-btn-star" aria-hidden>
              <StarIcon size={21} animate={false} glow={false} />
            </span>
          </>
        )}
      </button>
    </div>
  );
}
