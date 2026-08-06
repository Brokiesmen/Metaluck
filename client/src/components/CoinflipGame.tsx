import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../api';
import type { CoinSide } from '../types';
import { useSettings } from '../settings/SettingsContext';
import { tf } from '../i18n/tf';
import { StarIcon } from './StarIcon';
import { EagleBadge, EagleCrest, StarBadge, StarCrest } from './coinCrest';

interface Props {
  onBack: () => void;
  onBalanceUpdate: (balance: number) => void;
}

const BETS = [5, 10, 25, 50, 100] as const;
type BetAmount = (typeof BETS)[number];

/** Длительность вращения — синхрон с @keyframes cf-spin */
const FLIP_DURATION_MS = 1200;
/** Полных оборотов до остановки */
const FLIP_TURNS = 5;

const EDGE_LAYERS = 9;
const EDGE_STEP_PX = 1.2;
const EDGE_OFFSETS = Array.from(
  { length: EDGE_LAYERS },
  (_, i) => (i - (EDGE_LAYERS - 1) / 2) * EDGE_STEP_PX,
);
const FACE_Z_PX = ((EDGE_LAYERS - 1) / 2) * EDGE_STEP_PX + 0.4;

function Confetti() {
  const pieces = Array.from({ length: 14 }, (_, i) => ({
    id: i,
    left: `${(i * 71) % 100}%`,
    delay: `${(i % 5) * 0.06}s`,
    hue: 42 + (i % 4) * 22,
  }));
  return (
    <div className="cf-confetti" aria-hidden>
      {pieces.map((p) => (
        <span
          key={p.id}
          className="cf-confetti-piece"
          style={{ left: p.left, animationDelay: p.delay, background: `hsl(${p.hue} 90% 58%)` }}
        />
      ))}
    </div>
  );
}

export function CoinflipGame({ onBack, onBalanceUpdate }: Props) {
  const { t, locale } = useSettings();
  const [bet, setBet] = useState<BetAmount>(25);
  const [choice, setChoice] = useState<CoinSide>('heads');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [endRotDeg, setEndRotDeg] = useState(0);
  const [spinId, setSpinId] = useState(0);
  const [flipping, setFlipping] = useState(false);
  const [lastResult, setLastResult] = useState<{ result: CoinSide; win: boolean; payout: number; bet: number } | null>(null);
  const [showRes, setShowRes] = useState(false);

  const resultTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (resultTimer.current) clearTimeout(resultTimer.current);
  }, []);

  const play = useCallback(() => {
    if (busy) return;
    setBusy(true);
    setFlipping(true);
    setShowRes(false);
    setErr(null);
    if (resultTimer.current) clearTimeout(resultTimer.current);

    (async () => {
      try {
        const res = await api.coinflipPlay(bet, choice);
        onBalanceUpdate(res.newBalance);

        const extraHalfTurn = res.result === 'tails' ? 180 : 0;
        setEndRotDeg(FLIP_TURNS * 360 + extraHalfTurn);
        setSpinId((n) => n + 1);

        resultTimer.current = setTimeout(() => {
          setLastResult({ result: res.result, win: res.win, payout: res.payout, bet: res.bet });
          setShowRes(true);
          setFlipping(false);
          setBusy(false);
        }, FLIP_DURATION_MS);
      } catch (e) {
        setErr(e instanceof Error ? e.message : t.coin.error);
        setFlipping(false);
        setBusy(false);
      }
    })();
  }, [bet, choice, busy, onBalanceUpdate, t.coin.error]);

  const canPlay = !busy;
  const showingTails = !flipping && lastResult?.result === 'tails';

  return (
    <div className="cf">
      <button className="cf-back" onClick={onBack} aria-label={t.common.backGames}>
        {t.coin.back}
      </button>

      <div className="cf-stage">
        <div className="cf-coin-wrap">
          <div
            key={spinId}
            className={`cf-coin${flipping ? ' cf-coin--flipping' : ''}`}
            style={{
              ['--end-rot' as string]: `${endRotDeg}deg`,
              ['--flip-duration' as string]: `${FLIP_DURATION_MS}ms`,
              transform: !flipping && showingTails ? 'rotateY(180deg)' : undefined,
            }}
          >
            {EDGE_OFFSETS.map((z) => (
              <div key={`e${z}`} className="cf-coin-edge" style={{ transform: `translateZ(${z}px)` }} aria-hidden />
            ))}
            <div className="cf-coin-face cf-coin-face--heads" style={{ transform: `translateZ(${FACE_Z_PX}px)` }}>
              <span className="cf-coin-ring" aria-hidden />
              <EagleCrest />
            </div>
            <div className="cf-coin-face cf-coin-face--tails" style={{ transform: `rotateY(180deg) translateZ(${FACE_Z_PX}px)` }}>
              <span className="cf-coin-ring" aria-hidden />
              <StarCrest />
            </div>
          </div>
          <div
            key={`shadow${spinId}`}
            className={`cf-coin-shadow${flipping ? ' cf-coin-shadow--flipping' : ''}`}
            style={{ ['--flip-duration' as string]: `${FLIP_DURATION_MS}ms` }}
            aria-hidden
          />
        </div>

        {showRes && lastResult && (
          <div className={`cf-result cf-result--${lastResult.win ? 'win' : 'lose'}`} role="status">
            {lastResult.win && <Confetti />}
            <span className="cf-result__label">
              {lastResult.result === 'heads' ? t.coin.heads : t.coin.tails}
              {' — '}
              {lastResult.win ? t.coin.win : t.coin.lose}
            </span>
            {lastResult.payout > 0 && (
              <span className="cf-result__payout num">
                +{lastResult.payout.toLocaleString(locale)}
                <StarIcon size={14} animate={false} />
              </span>
            )}
          </div>
        )}
      </div>

      {err && <div className="cf-error" role="alert">{err}</div>}

      <div className="cf-controls">
        <div className="cf-sides" role="group" aria-label={t.coin.pickSide}>
          <button
            type="button"
            className={`cf-side${choice === 'heads' ? ' cf-side--on' : ''}`}
            disabled={!canPlay}
            onClick={() => setChoice('heads')}
            aria-pressed={choice === 'heads'}
          >
            <span className="cf-side-badge" aria-hidden><EagleBadge /></span>
            {t.coin.heads}
          </button>
          <button
            type="button"
            className={`cf-side${choice === 'tails' ? ' cf-side--on' : ''}`}
            disabled={!canPlay}
            onClick={() => setChoice('tails')}
            aria-pressed={choice === 'tails'}
          >
            <span className="cf-side-badge" aria-hidden><StarBadge /></span>
            {t.coin.tails}
          </button>
        </div>

        <div className="cf-chips" role="group" aria-label={t.coin.betSize}>
          {BETS.map((b) => (
            <button
              key={b}
              className={`cf-chip num${bet === b ? ' cf-chip--on' : ''}`}
              disabled={!canPlay}
              onClick={() => setBet(b)}
              aria-pressed={bet === b}
            >
              {b}
            </button>
          ))}
        </div>

        <button className="cf-play" disabled={!canPlay} onClick={play}>
          {busy ? '…' : tf(t.coin.flip, { bet })}
        </button>
      </div>
    </div>
  );
}
