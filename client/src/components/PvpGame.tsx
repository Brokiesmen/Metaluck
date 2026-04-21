import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../api';
import type { PvpMatchView } from '../api';

// ── Types ─────────────────────────────────────────────────────────────────────

type CardType = 'attack' | 'defense' | 'speed';
type Screen   = 'idle' | 'queuing' | 'battle' | 'finished';

interface PvpStats {
  level: number;
  xp: number;
  xpForNextLevel: number;
  rating: number;
  wins: number;
  losses: number;
  draws: number;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const CARDS: CardType[] = ['attack', 'defense', 'speed'];

const CARD_LABEL: Record<CardType, string> = {
  attack:  'Атака',
  defense: 'Защита',
  speed:   'Скорость',
};

const CARD_EMOJI: Record<CardType, string> = {
  attack:  '⚔️',
  defense: '🛡️',
  speed:   '⚡',
};

const ROUND_MS  = 5_000;
const POLL_MS   = 2_000;
const ROUNDS_TOTAL = 3;

// ── Timer SVG ─────────────────────────────────────────────────────────────────

const RADIUS       = 28;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function TimerRing({ timeLeft }: { timeLeft: number }) {
  const pct    = Math.max(0, Math.min(1, timeLeft / ROUND_MS));
  const offset = CIRCUMFERENCE * (1 - pct);
  const red    = timeLeft < 2000;
  return (
    <div className="pvp-timer-wrap">
      <svg className="pvp-timer-svg" viewBox="0 0 64 64" aria-hidden>
        <circle cx="32" cy="32" r={RADIUS} className="pvp-timer-track" />
        <circle
          cx="32" cy="32" r={RADIUS}
          className={`pvp-timer-bar${red ? ' pvp-timer-bar--red' : ''}`}
          style={{ strokeDasharray: CIRCUMFERENCE, strokeDashoffset: offset }}
        />
      </svg>
      <span className={`pvp-timer-num${red ? ' pvp-timer-num--red' : ''}`}>
        {Math.ceil(timeLeft / 1000)}
      </span>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface Props { onBack: () => void; }

export function PvpGame({ onBack }: Props) {
  const [screen,   setScreen]   = useState<Screen>('idle');
  const [stats,    setStats]    = useState<PvpStats | null>(null);
  const [match,    setMatch]    = useState<PvpMatchView | null>(null);
  const [busy,     setBusy]     = useState(false);
  const [err,      setErr]      = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(ROUND_MS);

  const pollRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPoll  = useCallback(() => {
    if (pollRef.current)  { clearInterval(pollRef.current);  pollRef.current  = null; }
  }, []);
  const stopTimer = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }, []);

  // Load stats on mount
  useEffect(() => {
    api.pvpStats().then(setStats).catch(() => {});
  }, []);

  // Countdown timer — restarts whenever roundEndsAt changes
  useEffect(() => {
    stopTimer();
    if (screen !== 'battle' || !match || match.phase === 'finished') return;
    const tick = () => setTimeLeft(Math.max(0, match.roundEndsAt - Date.now()));
    tick();
    timerRef.current = setInterval(tick, 100);
    return stopTimer;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen, match?.currentRound, match?.roundEndsAt]);

  // Cleanup on unmount
  useEffect(() => () => { stopPoll(); stopTimer(); }, [stopPoll, stopTimer]);

  // ── Poll helpers ───────────────────────────────────────────────────────────

  const applyFinished = useCallback((m: PvpMatchView) => {
    stopPoll();
    stopTimer();
    setMatch(m);
    setScreen('finished');
    api.pvpStats().then(setStats).catch(() => {});
  }, [stopPoll, stopTimer]);

  const startMatchPoll = useCallback((matchId: string) => {
    stopPoll();
    pollRef.current = setInterval(async () => {
      try {
        const m = await api.pvpGetMatch(matchId);
        setMatch(m);
        if (m.phase === 'finished' && m.matchResult !== null) {
          applyFinished(m);
        }
      } catch { /* keep trying */ }
    }, POLL_MS);
  }, [stopPoll, applyFinished]);

  const startQueuePoll = useCallback(() => {
    stopPoll();
    pollRef.current = setInterval(async () => {
      try {
        const res = await api.pvpFind();
        if (res.status === 'matched' && res.matchId) {
          stopPoll();
          const m = await api.pvpGetMatch(res.matchId);
          setMatch(m);
          if (m.phase === 'finished' && m.matchResult !== null) {
            applyFinished(m);
          } else {
            setScreen('battle');
            startMatchPoll(res.matchId);
          }
        }
      } catch { /* keep trying */ }
    }, POLL_MS);
  }, [stopPoll, applyFinished, startMatchPoll]);

  // ── Actions ────────────────────────────────────────────────────────────────

  const handleFind = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await api.pvpFind();
      if (res.status === 'matched' && res.matchId) {
        const m = await api.pvpGetMatch(res.matchId);
        setMatch(m);
        if (m.phase === 'finished' && m.matchResult !== null) {
          applyFinished(m);
        } else {
          setScreen('battle');
          startMatchPoll(res.matchId);
        }
      } else {
        setScreen('queuing');
        startQueuePoll();
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Ошибка соединения');
    } finally {
      setBusy(false);
    }
  }, [busy, applyFinished, startMatchPoll, startQueuePoll]);

  const handleCancel = useCallback(async () => {
    stopPoll();
    await api.pvpLeaveQueue().catch(() => {});
    setScreen('idle');
  }, [stopPoll]);

  const handleChoose = useCallback(async (card: CardType) => {
    if (!match || busy) return;
    setBusy(true);
    setErr(null);
    try {
      const m = await api.pvpChoose(match.matchId, card);
      setMatch(m);
      if (m.phase === 'finished' && m.matchResult !== null) {
        applyFinished(m);
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Ошибка');
    } finally {
      setBusy(false);
    }
  }, [match, busy, applyFinished]);

  const handlePlayAgain = useCallback(() => {
    stopPoll();
    stopTimer();
    setMatch(null);
    setErr(null);
    setScreen('idle');
    api.pvpStats().then(setStats).catch(() => {});
  }, [stopPoll, stopTimer]);

  // ── Screens ────────────────────────────────────────────────────────────────

  if (screen === 'idle') {
    return (
      <div className="pvp">
        <button type="button" className="pvp-back" onClick={onBack}>‹ Игры</button>

        <div className="pvp-idle">
          <div className="pvp-idle-hero">
            <div className="pvp-idle-title">⚔️ PvP Дуэль</div>
            <div className="pvp-idle-subtitle">
              3 раунда — выбери карту быстрее соперника
            </div>
          </div>

          {stats && (
            <div className="pvp-stats-panel">
              <div className="pvp-stat">
                <span className="pvp-stat-label">Уровень</span>
                <span className="pvp-stat-value">{stats.level}</span>
              </div>
              <div className="pvp-stat">
                <span className="pvp-stat-label">Рейтинг</span>
                <span className="pvp-stat-value">{stats.rating}</span>
              </div>
              <div className="pvp-stat">
                <span className="pvp-stat-label">Победы</span>
                <span className="pvp-stat-value pvp-stat-win">{stats.wins}</span>
              </div>
              <div className="pvp-stat">
                <span className="pvp-stat-label">Поражения</span>
                <span className="pvp-stat-value pvp-stat-lose">{stats.losses}</span>
              </div>
            </div>
          )}

          {stats && (
            <div className="pvp-xp-wrap">
              <div className="pvp-xp-track">
                <div
                  className="pvp-xp-fill"
                  style={{ width: `${Math.min(100, (stats.xp / stats.xpForNextLevel) * 100)}%` }}
                />
              </div>
              <span className="pvp-xp-label">
                Ур. {stats.level} · {stats.xp} / {stats.xpForNextLevel} XP
              </span>
            </div>
          )}

          {err && <div className="pvp-error">{err}</div>}

          <button
            type="button"
            className="pvp-find-btn"
            onClick={handleFind}
            disabled={busy}
          >
            {busy ? 'Поиск...' : '⚔️ Найти соперника'}
          </button>

          <div className="pvp-rules-box">
            <div className="pvp-rules-title">Правила карт</div>
            <div className="pvp-rules-grid">
              <span>⚔️ Атака</span><span className="pvp-rule-arrow">▶</span><span>⚡ Скорость</span>
              <span>⚡ Скорость</span><span className="pvp-rule-arrow">▶</span><span>🛡️ Защита</span>
              <span>🛡️ Защита</span><span className="pvp-rule-arrow">▶</span><span>⚔️ Атака</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (screen === 'queuing') {
    return (
      <div className="pvp">
        <button type="button" className="pvp-back" onClick={onBack}>‹ Игры</button>
        <div className="pvp-queue">
          <div className="pvp-queue-spinner" aria-hidden />
          <div className="pvp-queue-title">Поиск соперника...</div>
          <div className="pvp-queue-sub">Если нет игроков — сыграешь с ботом</div>
          <button type="button" className="pvp-cancel-btn" onClick={handleCancel}>
            Отмена
          </button>
        </div>
      </div>
    );
  }

  if (screen === 'battle' && match) {
    const lastRound = match.rounds.at(-1) ?? null;
    const chose     = match.myCardThisRound !== null;

    return (
      <div className="pvp pvp--battle">

        {/* ── Header: scores + timer ── */}
        <div className="pvp-battle-header">
          <div className="pvp-player-col">
            <span className="pvp-player-name pvp-player-name--me">Вы</span>
            <span className="pvp-score">{match.scores.me}</span>
          </div>

          <TimerRing timeLeft={timeLeft} />

          <div className="pvp-player-col pvp-player-col--right">
            <span className="pvp-player-name pvp-player-name--opp">{match.opponentName}</span>
            <span className="pvp-score">{match.scores.opponent}</span>
          </div>
        </div>

        {/* ── Round dots ── */}
        <div className="pvp-round-dots">
          {Array.from({ length: ROUNDS_TOTAL }, (_, i) => {
            const r = match.rounds[i];
            return (
              <div
                key={i}
                className={`pvp-dot${r ? ` pvp-dot--${r.result}` : i === match.currentRound ? ' pvp-dot--active' : ''}`}
              >
                {r ? (r.result === 'win' ? '✓' : r.result === 'lose' ? '✗' : '=') : (i + 1)}
              </div>
            );
          })}
        </div>

        {/* ── Last round reveal ── */}
        {lastRound && (
          <div className="pvp-reveal">
            <div className="pvp-reveal-card pvp-reveal-card--me">
              <span className="pvp-reveal-emoji">{CARD_EMOJI[lastRound.myCard]}</span>
              <span className="pvp-reveal-name">{CARD_LABEL[lastRound.myCard]}</span>
            </div>
            <div className={`pvp-reveal-badge pvp-reveal-badge--${lastRound.result}`}>
              {lastRound.result === 'win' ? 'Победа' : lastRound.result === 'lose' ? 'Поражение' : 'Ничья'}
            </div>
            <div className="pvp-reveal-card pvp-reveal-card--opp">
              <span className="pvp-reveal-emoji">{CARD_EMOJI[lastRound.opponentCard]}</span>
              <span className="pvp-reveal-name">{CARD_LABEL[lastRound.opponentCard]}</span>
            </div>
          </div>
        )}

        {/* ── Card choice ── */}
        <div className="pvp-choose-hint">
          {chose
            ? `✅ Выбрано: ${CARD_EMOJI[match.myCardThisRound!]} ${CARD_LABEL[match.myCardThisRound!]}`
            : 'Выбери карту до конца таймера'}
        </div>

        <div className="pvp-cards">
          {CARDS.map(c => (
            <button
              key={c}
              type="button"
              className={`pvp-card pvp-card--${c}${match.myCardThisRound === c ? ' pvp-card--chosen' : ''}`}
              disabled={chose || busy}
              onClick={() => handleChoose(c)}
            >
              <span className="pvp-card-emoji">{CARD_EMOJI[c]}</span>
              <span className="pvp-card-name">{CARD_LABEL[c]}</span>
            </button>
          ))}
        </div>

        {err && <div className="pvp-error pvp-error--bottom">{err}</div>}
      </div>
    );
  }

  if (screen === 'finished' && match) {
    const res   = match.matchResult;
    const tone  = res === 'win' ? 'win' : res === 'lose' ? 'lose' : 'draw';
    const emoji = res === 'win' ? '🏆' : res === 'lose' ? '💀' : '🤝';
    const label = res === 'win' ? 'ПОБЕДА!'    : res === 'lose' ? 'ПОРАЖЕНИЕ' : 'НИЧЬЯ';

    return (
      <div className="pvp pvp--result">
        <div className="pvp-result-box">
          <div className={`pvp-result-title pvp-result-title--${tone}`}>
            <span className="pvp-result-emoji">{emoji}</span>
            {label}
          </div>

          <div className="pvp-result-score">
            <span className="pvp-result-score-me">{match.scores.me}</span>
            <span className="pvp-result-score-sep">:</span>
            <span className="pvp-result-score-opp">{match.scores.opponent}</span>
          </div>

          <div className="pvp-result-meta">
            <div className="pvp-result-row">
              <span>Опыт получен</span>
              <span className="pvp-result-xp">+{match.xpGained} XP</span>
            </div>
            <div className="pvp-result-row">
              <span>Рейтинг</span>
              <span className={match.ratingChange >= 0 ? 'pvp-result-up' : 'pvp-result-down'}>
                {match.ratingChange >= 0 ? '+' : ''}{match.ratingChange}
              </span>
            </div>
          </div>

          <button type="button" className="pvp-find-btn" onClick={handlePlayAgain}>
            ⚔️ Сыграть снова
          </button>
          <button type="button" className="pvp-lobby-btn" onClick={onBack}>
            ← В лобби
          </button>
        </div>
      </div>
    );
  }

  return null;
}
