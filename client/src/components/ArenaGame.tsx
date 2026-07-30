import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../api';
import type { ArenaRoundView } from '../types';
import { StarIcon } from './StarIcon';

interface Props {
  onBack: () => void;
  onBalanceUpdate: (balance: number) => void;
}

const BETS = [5, 10, 25, 50, 100] as const;
type BetAmount = (typeof BETS)[number];

const POLL_MS = 900;

/* ── SVG-геометрия секторов ──────────────────────────────────────
   Углы — градусы по часовой от «12 часов», как отдаёт сервер. */
const C = 100;
const R = 74;
const STROKE = 30;

function polarXY(deg: number, r = R) {
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: C + r * Math.cos(rad), y: C + r * Math.sin(rad) };
}

function arcPath(startDeg: number, endDeg: number): string {
  const s = polarXY(startDeg);
  const e = polarXY(endDeg);
  const large = endDeg - startDeg > 180 ? 1 : 0;
  return `M ${s.x.toFixed(2)} ${s.y.toFixed(2)} A ${R} ${R} 0 ${large} 1 ${e.x.toFixed(2)} ${e.y.toFixed(2)}`;
}

function fmtSeconds(ms: number): string {
  return `${Math.max(0, Math.ceil(ms / 1000))}с`;
}

/* ── Confetti (как в coinflip — переиспользует keyframes bj2) ── */
function Confetti() {
  const pieces = Array.from({ length: 16 }, (_, i) => ({
    id: i,
    left: `${(i * 61) % 100}%`,
    delay: `${(i % 5) * 0.06}s`,
    hue: 30 + (i % 6) * 30,
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

export function ArenaGame({ onBack, onBalanceUpdate }: Props) {
  const [round, setRound] = useState<ArenaRoundView | null>(null);
  const [bet, setBet] = useState<BetAmount>(25);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [synced, setSynced] = useState(false);
  /** Тик для обратного отсчёта (перерисовывает только цифры) */
  const [, setNowTick] = useState(0);

  /** serverNow - Date.now(): компенсация расхождения часов клиента */
  const clockOffsetRef = useRef(0);
  const ballRef = useRef<HTMLDivElement>(null);
  /** roundId, для которого уже запущена анимация шарика */
  const animatedRoundRef = useRef<string | null>(null);
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const aliveRef = useRef(true);

  const serverNow = useCallback(() => Date.now() + clockOffsetRef.current, []);

  /** Запуск/позиционирование шарика по фазе раунда. Прямой DOM (как StripOpener):
   *  одна GPU-анимация transform, без перерисовок React на каждый кадр. */
  const syncBall = useCallback((r: ArenaRoundView | null) => {
    const ball = ballRef.current;
    if (!ball) return;

    if (!r || r.phase === 'betting' || r.winnerAngleDeg === null) {
      animatedRoundRef.current = null;
      ball.style.transition = 'none';
      ball.style.transform = 'rotate(0deg)';
      return;
    }

    if (animatedRoundRef.current === r.roundId) return; // анимация уже идёт/закончена

    if (r.phase === 'spinning') {
      const remaining = r.spinEndsAt - (Date.now() + clockOffsetRef.current);
      if (remaining > 400) {
        const turns = Math.max(1, Math.floor(remaining / 1100));
        const finalDeg = turns * 360 + r.winnerAngleDeg;
        animatedRoundRef.current = r.roundId;
        ball.style.transition = 'none';
        ball.style.transform = 'rotate(0deg)';
        void ball.offsetWidth;
        ball.style.transition = `transform ${remaining}ms cubic-bezier(0.15, 0.72, 0.18, 1)`;
        ball.style.transform = `rotate(${finalDeg}deg)`;
        return;
      }
    }

    // finished или прокрут почти закончился — ставим шарик сразу на место
    animatedRoundRef.current = r.roundId;
    ball.style.transition = 'none';
    ball.style.transform = `rotate(${r.winnerAngleDeg}deg)`;
  }, []);

  const applyState = useCallback(
    (data: { round: ArenaRoundView | null; balance: number; now: number }) => {
      clockOffsetRef.current = data.now - Date.now();
      onBalanceUpdate(data.balance);
      setRound(data.round);
      syncBall(data.round);
      setSynced(true);
    },
    [onBalanceUpdate, syncBall],
  );

  /* ── Поллинг состояния ─────────────────────────────────────── */
  useEffect(() => {
    aliveRef.current = true;
    const loop = async () => {
      try {
        const data = await api.arenaState();
        if (!aliveRef.current) return;
        applyState(data);
        setErr(null);
      } catch (e) {
        if (aliveRef.current && !synced) {
          setErr(e instanceof Error ? e.message : 'Ошибка загрузки');
        }
      }
      if (aliveRef.current) {
        pollTimerRef.current = setTimeout(loop, POLL_MS);
      }
    };
    loop();
    return () => {
      aliveRef.current = false;
      if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Тик отсчёта (250мс) — только пока есть таймер на экране ── */
  const phase = round?.phase ?? null;
  useEffect(() => {
    if (phase !== 'betting') return;
    const id = setInterval(() => setNowTick((v) => v + 1), 250);
    return () => clearInterval(id);
  }, [phase]);

  const placeBet = useCallback(() => {
    if (busy) return;
    setBusy(true);
    setErr(null);
    api
      .arenaBet(bet)
      .then(applyState)
      .catch((e) => setErr(e instanceof Error ? e.message : 'Ошибка ставки'))
      .finally(() => setBusy(false));
  }, [bet, busy, applyState]);

  /* ── Производные ───────────────────────────────────────────── */
  const players = round?.players ?? [];
  const canBet = synced && !busy && (!round || round.phase === 'betting');
  const bettingLeftMs = round && round.phase === 'betting' && players.length > 0
    ? round.bettingEndsAt - serverNow()
    : 0;
  const winner = round?.winner ?? null;
  const iWon = Boolean(winner?.isMe);

  return (
    <div className="ar">
      <button className="ar-back" onClick={onBack} aria-label="Назад к играм">
        ‹ Игры
      </button>

      {/* ── Арена ──────────────────────────────────────────── */}
      <div className="ar-stage">
        <div className="ar-wheel-wrap">
          <svg viewBox="0 0 200 200" className="ar-wheel" aria-hidden>
            {/* Подложка кольца */}
            <circle cx={C} cy={C} r={R} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={STROKE} />
            {players.map((p) =>
              p.endDeg - p.startDeg >= 359.9 ? (
                <circle
                  key={p.userId}
                  cx={C} cy={C} r={R}
                  fill="none" stroke={p.color} strokeWidth={STROKE}
                />
              ) : (
                <path
                  key={p.userId}
                  d={arcPath(p.startDeg, p.endDeg)}
                  fill="none"
                  stroke={p.color}
                  strokeWidth={STROKE}
                />
              ),
            )}
          </svg>

          {/* Шарик — вращается вокруг центра одной transform-анимацией */}
          <div className="ar-ball-rotator" ref={ballRef} aria-hidden>
            <span className="ar-ball" />
          </div>

          {/* Центр: банк / статус */}
          <div className="ar-center">
            {round && round.phase === 'finished' && winner ? (
              <>
                <span className="ar-center-label">Победитель</span>
                <span className="ar-center-value" style={{ color: winner.color }}>
                  {winner.isMe ? 'Вы!' : winner.name}
                </span>
                {round.payout > 0 && (
                  <span className="ar-center-payout num">
                    +{round.payout.toLocaleString('ru-RU')}
                    <StarIcon size={13} animate={false} />
                  </span>
                )}
              </>
            ) : (
              <>
                <span className="ar-center-label">Банк</span>
                <span className="ar-center-value num">
                  {(round?.pot ?? 0).toLocaleString('ru-RU')}
                  <StarIcon size={15} animate={false} />
                </span>
                {round && round.phase === 'betting' && players.length > 0 && (
                  <span className="ar-center-timer num">{fmtSeconds(bettingLeftMs)}</span>
                )}
                {round?.phase === 'spinning' && <span className="ar-center-timer">Шарик запущен…</span>}
              </>
            )}
          </div>

          {iWon && round?.phase === 'finished' && <Confetti />}
        </div>

        {/* ── Участники ────────────────────────────────────── */}
        <div className="ar-players">
          {players.length === 0 ? (
            <div className="ar-empty">
              Сделайте ставку — раунд начнётся, и другие игроки смогут присоединиться
            </div>
          ) : (
            players.map((p) => (
              <div key={p.userId} className={`ar-player${p.isMe ? ' ar-player--me' : ''}`}>
                <span className="ar-player-dot" style={{ background: p.color }} />
                <span className="ar-player-name">{p.isMe ? 'Вы' : p.name}</span>
                <span className="ar-player-share num">{Math.round(p.share * 100)}%</span>
                <span className="ar-player-bet num">
                  {p.bet}
                  <StarIcon size={11} animate={false} />
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {err && <div className="ar-error" role="alert">{err}</div>}

      {/* ── Панель ставок ───────────────────────────────────── */}
      <div className="ar-controls">
        <div className="ar-chips" role="group" aria-label="Размер ставки">
          {BETS.map((b) => (
            <button
              key={b}
              className={`ar-chip num${bet === b ? ' ar-chip--on' : ''}`}
              disabled={!canBet}
              onClick={() => setBet(b)}
              aria-pressed={bet === b}
            >
              {b}
            </button>
          ))}
        </div>
        <button className="ar-bet-btn" disabled={!canBet} onClick={placeBet}>
          {!synced
            ? 'Загрузка…'
            : busy
              ? '…'
              : round && round.phase !== 'betting'
                ? 'Раунд идёт…'
                : round && round.myBet > 0
                  ? `ДОБАВИТЬ  •  ${bet} ★`
                  : `ПОСТАВИТЬ  •  ${bet} ★`}
        </button>
      </div>
    </div>
  );
}
