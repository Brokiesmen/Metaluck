import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../api';
import type { MineRushDifficulty, MineRushGameView } from '../types';
import { useSettings } from '../settings/SettingsContext';
import { tf } from '../i18n/tf';
import { StarIcon } from './StarIcon';

interface Props {
  onBack: () => void;
  onBalanceUpdate: (balance: number) => void;
}

const BETS = [5, 10, 25, 50] as const;
const DIFFICULTIES: { id: MineRushDifficulty; mines: number }[] = [
  { id: 'easy', mines: 10 },
  { id: 'medium', mines: 15 },
  { id: 'hard', mines: 20 },
];

function formatTime(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function calcCashout(
  bet: number,
  score: number,
  mineCount: number,
  difficulty: MineRushDifficulty,
): number {
  const safe = 100 - mineCount;
  if (score <= 0 || safe <= 0) return 0;
  const progress = score / safe;
  const mult = difficulty === 'easy' ? 1.2 : difficulty === 'medium' ? 1.6 : 2.1;
  return Math.floor(bet * (0.5 + progress * mult) * 0.75);
}

function calcWinPayout(bet: number, difficulty: MineRushDifficulty): number {
  const mult = difficulty === 'easy' ? 2.5 : difficulty === 'medium' ? 3.5 : 5;
  return Math.floor(bet * mult * 0.75);
}

function parseKey(key: string): { x: number; y: number } {
  const [xs, ys] = key.split(',');
  return { x: Number(xs), y: Number(ys) };
}

export function MineRushGame({ onBack, onBalanceUpdate }: Props) {
  const { t, locale } = useSettings();
  const [game, setGame] = useState<MineRushGameView | null>(null);
  const [difficulty, setDifficulty] = useState<MineRushDifficulty>('medium');
  const [bet, setBet] = useState<(typeof BETS)[number]>(10);
  const [flagMode, setFlagMode] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [exploded, setExploded] = useState<string | null>(null);
  const [lastPayout, setLastPayout] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());
  const [timerStart, setTimerStart] = useState<number | null>(null);
  const [frozenMs, setFrozenMs] = useState<number | null>(null);

  const active = game?.status === 'active';
  const finished = game && game.status !== 'active';

  const cashoutAmount = useMemo(() => {
    if (!game || !active) return 0;
    return calcCashout(game.bet, game.score, game.mineCount, game.difficulty);
  }, [active, game]);

  const winPayout = useMemo(() => {
    if (!game) return 0;
    return calcWinPayout(game.bet, game.difficulty);
  }, [game]);

  useEffect(() => {
    api.mineRushState()
      .then((res) => {
        if (res.game) {
          setGame(res.game);
          if (res.game.score > 0) setTimerStart(res.game.startedAt);
        }
        onBalanceUpdate(res.balance);
      })
      .catch(() => setErr(t.mr.loadError));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onBalanceUpdate]);

  useEffect(() => {
    if (!active || timerStart == null) return;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [active, timerStart]);

  useEffect(() => {
    if (finished && timerStart != null && frozenMs == null) {
      setFrozenMs(Math.max(0, Date.now() - timerStart));
    }
  }, [finished, timerStart, frozenMs]);

  const elapsed = useMemo(() => {
    if (frozenMs != null) return formatTime(frozenMs);
    if (timerStart == null) return '0:00';
    return formatTime(now - timerStart);
  }, [frozenMs, now, timerStart]);

  const start = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    setErr(null);
    setExploded(null);
    setLastPayout(null);
    setTimerStart(null);
    setFrozenMs(null);
    try {
      const res = await api.mineRushStart(difficulty, bet);
      setGame(res);
      onBalanceUpdate(res.balance);
      setFlagMode(false);
    } catch (e) {
      setErr(e instanceof Error ? e.message : t.mr.startError);
    } finally {
      setBusy(false);
    }
  }, [bet, busy, difficulty, onBalanceUpdate, t.mr.startError]);

  const onCell = useCallback(async (x: number, y: number) => {
    if (!game || busy || game.status !== 'active') return;
    setBusy(true);
    setErr(null);
    try {
      if (flagMode) {
        const res = await api.mineRushFlag(game.gameId, x, y);
        setGame(res);
        onBalanceUpdate(res.balance);
      } else {
        const res = await api.mineRushReveal(game.gameId, x, y);
        let newTimerStart = timerStart;
        if (res.score > 0 && newTimerStart == null) {
          newTimerStart = Date.now();
          setTimerStart(newTimerStart);
        }
        setGame(res);
        onBalanceUpdate(res.balance);
        if (res.exploded) setExploded(res.exploded);
        if (res.status !== 'active') {
          setFrozenMs(newTimerStart ? Math.max(0, Date.now() - newTimerStart) : 0);
        }
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : t.mr.moveError);
    } finally {
      setBusy(false);
    }
  }, [busy, flagMode, game, onBalanceUpdate, timerStart, t.mr.moveError]);

  const cashout = useCallback(async () => {
    if (!game || busy || game.status !== 'active') return;
    setBusy(true);
    setErr(null);
    try {
      const res = await api.mineRushCashout(game.gameId);
      if (timerStart != null) setFrozenMs(Math.max(0, Date.now() - timerStart));
      setGame(res);
      onBalanceUpdate(res.balance);
      setLastPayout(res.payout);
    } catch (e) {
      setErr(e instanceof Error ? e.message : t.mr.cashError);
    } finally {
      setBusy(false);
    }
  }, [busy, game, onBalanceUpdate, timerStart, t.mr.cashError]);

  const reset = useCallback(() => {
    setGame(null);
    setExploded(null);
    setLastPayout(null);
    setTimerStart(null);
    setFrozenMs(null);
    setErr(null);
  }, []);

  const flagSet = useMemo(() => new Set(game?.flags ?? []), [game?.flags]);

  return (
    <div className="mr-root">
      <button type="button" className="mr-back" onClick={onBack} aria-label={t.mr.back}>
        {t.mr.back}
      </button>

      <div className="mr-chest" aria-hidden title="Призовой сундук">
        <span className="mr-chest-icon">🎁</span>
        <span className="mr-chest-glow" />
      </div>

      <header className="mr-status">
        <div className="mr-stat">
          <span className="mr-stat-label">{t.mr.score}</span>
          <span className="mr-stat-value num">{game?.score ?? 0}</span>
        </div>
        <div className="mr-stat mr-stat--timer">
          <span className="mr-stat-label">{t.mr.time}</span>
          <span className="mr-stat-value num">{elapsed}</span>
        </div>
        <div className="mr-stat mr-stat--balance">
          <span className="mr-stat-label">{t.mr.balance}</span>
          <span className="mr-stat-value num">
            {(game?.balance ?? 0).toLocaleString(locale)}
            <StarIcon size={14} />
          </span>
        </div>
      </header>

      <div className="mr-logo">
        <span className="mr-logo-text">MineRush</span>
        <span className="mr-logo-sub">Minesweeper</span>
      </div>

      {err && <div className="mr-error">{err}</div>}

      {game ? (
        <div className={`mr-board-wrap${finished ? ' mr-board-wrap--finished' : ''}`}>
          <div
            className="mr-board"
            style={{ gridTemplateColumns: `repeat(${game.gridSize}, 1fr)` }}
          >
            {game.cells.map((cell) => {
              const { x, y } = parseKey(cell.key);
              const flagged = flagSet.has(cell.key);
              const isExploded = exploded === cell.key;
              const numClass = cell.state === 'number' && cell.value ? `mr-cell--n${Math.min(cell.value, 8)}` : '';

              return (
                <button
                  key={cell.key}
                  type="button"
                  className={[
                    'mr-cell',
                    cell.state === 'hidden' && !flagged ? 'mr-cell--hidden' : '',
                    cell.state === 'number' ? 'mr-cell--revealed' : '',
                    cell.state === 'mine' ? 'mr-cell--mine' : '',
                    flagged && cell.state === 'hidden' ? 'mr-cell--flagged' : '',
                    isExploded ? 'mr-cell--exploded' : '',
                    numClass,
                  ].filter(Boolean).join(' ')}
                  disabled={busy || game.status !== 'active' || (cell.state !== 'hidden' && !flagged)}
                  onClick={() => onCell(x, y)}
                  aria-label={flagged ? t.mr.flag : undefined}
                >
                  {flagged && cell.state === 'hidden' && <span className="mr-flag">🚩</span>}
                  {cell.state === 'number' && cell.value! > 0 && (
                    <span className="mr-num">{cell.value}</span>
                  )}
                  {cell.state === 'mine' && (
                    <span className="mr-mine">
                      <span className="mr-mine-core">💣</span>
                      {isExploded && <span className="mr-blast" />}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="mr-preview">
          <div className="mr-preview-grid" aria-hidden>
            {Array.from({ length: 100 }, (_, i) => (
              <span
                key={i}
                className={[
                  'mr-preview-cell',
                  [12, 23, 34, 45, 56, 67, 78].includes(i) ? 'mr-preview-cell--num' : '',
                  [15, 37, 59].includes(i) ? 'mr-preview-cell--flag' : '',
                  i === 44 ? 'mr-preview-cell--mine' : '',
                ].filter(Boolean).join(' ')}
              />
            ))}
          </div>
        </div>
      )}

      <footer className="mr-panel">
        {finished && game ? (
          <>
            <div className={`mr-result-sheet mr-result-sheet--${game.status}`}>
              <div className="mr-result-sheet-icon" aria-hidden>
                {game.status === 'won' && '🏆'}
                {game.status === 'lost' && '💥'}
                {game.status === 'cashed' && '💰'}
              </div>
              <div className="mr-result-sheet-body">
                <div className="mr-result-sheet-title">
                  {game.status === 'won' && t.mr.win}
                  {game.status === 'lost' && t.mr.mine}
                  {game.status === 'cashed' && t.mr.cashed}
                </div>
                <div className="mr-result-sheet-meta">
                  <span>{tf(t.mr.timeLabel, { t: elapsed })}</span>
                  <span>{tf(t.mr.opened, { n: game.score })}</span>
                </div>
                {(game.status === 'cashed' && lastPayout != null) || game.status === 'won' ? (
                  <div className="mr-result-sheet-payout num">
                    +{(game.status === 'won' ? winPayout : lastPayout ?? 0).toLocaleString(locale)}
                    <StarIcon size={18} />
                  </div>
                ) : (
                  <div className="mr-result-sheet-payout mr-result-sheet-payout--lose">
                    {t.mr.stakeLost}
                  </div>
                )}
              </div>
            </div>
            <button type="button" className="mr-start" onClick={reset} disabled={busy}>
              {t.mr.newGame}
            </button>
          </>
        ) : !game ? (
          <>
            <div className="mr-diff-row">
              {DIFFICULTIES.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  className={`mr-diff${difficulty === d.id ? ' mr-diff--on' : ''}`}
                  onClick={() => setDifficulty(d.id)}
                  disabled={busy}
                >
                  {t.mr[d.id]}
                  <span className="mr-diff-mines">{d.mines}💣</span>
                </button>
              ))}
            </div>
            <div className="mr-bets">
              {BETS.map((b) => (
                <button
                  key={b}
                  type="button"
                  className={`mr-bet${bet === b ? ' mr-bet--on' : ''}`}
                  onClick={() => setBet(b)}
                  disabled={busy}
                >
                  {b}
                </button>
              ))}
            </div>
            <button
              type="button"
              className="mr-start"
              onClick={start}
              disabled={busy}
            >
              {tf(t.mr.play, { bet })}
              <StarIcon size={16} />
            </button>
          </>
        ) : (
          <>
            <div className="mr-cashout-hint">
              <span className="mr-cashout-hint-label">{t.mr.canCash}</span>
              <span className="mr-cashout-hint-value num">
                {cashoutAmount.toLocaleString(locale)}
                <StarIcon size={16} />
              </span>
            </div>
            <div className="mr-actions">
              <button
                type="button"
                className={`mr-flag-btn${flagMode ? ' mr-flag-btn--on' : ''}`}
                onClick={() => setFlagMode((v) => !v)}
                disabled={busy}
              >
                🚩 {flagMode ? t.mr.flagOn : t.mr.flag}
              </button>
              <button
                type="button"
                className="mr-cashout"
                onClick={cashout}
                disabled={busy || game.score <= 0}
              >
                <span>{t.mr.cashout}</span>
                <span className="mr-cashout-amount num">
                  {cashoutAmount.toLocaleString(locale)}
                  <StarIcon size={14} />
                </span>
              </button>
            </div>
            <div className="mr-meta">
              <span>{tf(t.mr.stake, { n: game.bet })} <StarIcon size={12} /></span>
              <span>{tf(t.mr.mines, { n: game.mineCount })}</span>
              <span>{tf(t.mr.max, { n: winPayout })} <StarIcon size={12} /></span>
            </div>
          </>
        )}
      </footer>
    </div>
  );
}
