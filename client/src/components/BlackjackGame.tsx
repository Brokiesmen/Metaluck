import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../api';
import type { BlackjackRound } from '../types';
import { StarIcon } from './StarIcon';

interface Props {
  onBack: () => void;
  onBalanceUpdate: (balance: number) => void;
}

const BETS = [5, 10, 25, 50, 100] as const;
type BetAmount = (typeof BETS)[number];

/** Задержка между картами при раздаче (мс) */
const DEAL_STEP_MS = 320;

/* ── Card helpers ──────────────────────────────────────────────── */
const SUIT_SYM: Record<string, string> = { S: '♠', H: '♥', D: '♦', C: '♣' };
const SUIT_RED: Record<string, boolean> = { H: true, D: true, S: false, C: false };

function parseCard(code: string) {
  if (!code || code === 'HIDDEN') return null;
  const suit = code.slice(-1);
  const rank = code.slice(0, -1);
  return { rank, suit, sym: SUIT_SYM[suit] ?? suit, red: SUIT_RED[suit] ?? false };
}

/* ── Playing card ──────────────────────────────────────────────── */
function Card({ code, faceDown }: { code: string; faceDown?: boolean }) {
  const parsed = faceDown ? null : parseCard(code);

  if (!parsed) {
    return <div className="bj2-card bj2-card--back" aria-hidden />;
  }

  return (
    <div
      className={`bj2-card bj2-card--front${parsed.red ? ' bj2-card--red' : ''}`}
      aria-label={`${parsed.rank}${parsed.sym}`}
    >
      <div className="bj2-card__corner bj2-card__corner--tl">
        <span className="bj2-card__rank">{parsed.rank}</span>
        <span className="bj2-card__suit-sm">{parsed.sym}</span>
      </div>
      <div className="bj2-card__mid">{parsed.sym}</div>
      <div className="bj2-card__corner bj2-card__corner--br">
        <span className="bj2-card__rank">{parsed.rank}</span>
        <span className="bj2-card__suit-sm">{parsed.sym}</span>
      </div>
    </div>
  );
}

/* ── Score badge ───────────────────────────────────────────────── */
function Score({ v, bust }: { v: number | null; bust?: boolean }) {
  if (v === null) return <span className="bj2-score">—</span>;
  return (
    <span className={`bj2-score num${bust ? ' bj2-score--bust' : v === 21 ? ' bj2-score--bj' : ''}`}>
      {v}
    </span>
  );
}

/* ── Result info ───────────────────────────────────────────────── */
function resultInfo(r: BlackjackRound['result']): { label: string; tone: 'win' | 'push' | 'lose' } {
  switch (r) {
    case 'blackjack': return { label: '🃏 БЛЭКДЖЕК!', tone: 'win' };
    case 'win':       return { label: '🏆 ПОБЕДА!',   tone: 'win' };
    case 'push':      return { label: '🤝 НИЧЬЯ',     tone: 'push' };
    case 'bust':      return { label: '💥 ПЕРЕБОР',   tone: 'lose' };
    case 'lose':      return { label: '😞 ПОРАЖЕНИЕ', tone: 'lose' };
    default:          return { label: '',             tone: 'push' };
  }
}

/* ── Confetti ─────────────────────────────────────────────────── */
function Confetti() {
  const pieces = Array.from({ length: 24 }, (_, i) => ({
    id: i,
    left: `${(i * 41) % 100}%`,
    delay: `${(i % 6) * 0.06}s`,
    hue: 35 + (i % 5) * 12,
    drift: `${((i % 7) - 3) * 18}px`,
  }));
  return (
    <div className="bj2-confetti" aria-hidden>
      {pieces.map(p => (
        <span
          key={p.id}
          className="bj2-confetti-piece"
          style={{
            left: p.left,
            animationDelay: p.delay,
            background: `hsl(${p.hue} 92% 58%)`,
            ['--drift' as string]: p.drift,
          }}
        />
      ))}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   Main component
══════════════════════════════════════════════════════════════ */
export function BlackjackGame({ onBack, onBalanceUpdate }: Props) {
  const [round,   setRound]   = useState<BlackjackRound | null>(null);
  const [bet,     setBet]     = useState<BetAmount>(25);
  const [busy,    setBusy]    = useState(false);
  const [err,     setErr]     = useState<string | null>(null);
  const [synced,  setSynced]  = useState(false);
  const [showRes, setShowRes] = useState(false);

  /**
   * shownInDeal — сколько карт показано в последовательности P0→D0→P1→D1.
   *   0–4  = анимация раздачи в процессе
   *   99   = показать все (HIT/STAND/восстановленная игра)
   */
  const [shownInDeal, setShownInDeal] = useState(99);
  const dealTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const busyRef    = useRef(false);

  /* Очистка таймеров */
  const clearTimers = useCallback(() => {
    dealTimers.current.forEach(clearTimeout);
    dealTimers.current = [];
  }, []);

  useEffect(() => clearTimers, [clearTimers]);

  /**
   * Запустить пошаговую анимацию раздачи:
   *   P0 → D0 → P1 → D1 с шагом DEAL_STEP_MS.
   * step — с какого шага начинать (0 = начало).
   */
  const startDealAnim = useCallback((fromStep = 0) => {
    clearTimers();
    setShownInDeal(fromStep);
    for (let n = fromStep + 1; n <= 4; n++) {
      dealTimers.current.push(
        setTimeout(() => setShownInDeal(n), (n - fromStep) * DEAL_STEP_MS),
      );
    }
  }, [clearTimers]);

  /* ── Initial load ─────────────────────────────────────────────── */
  useEffect(() => {
    api.getBlackjackState()
      .then(s => {
        onBalanceUpdate(s.newBalance);
        if (s.round?.phase === 'player') {
          // Незавершённая партия — восстанавливаем все карты сразу
          setRound(s.round);
          setShownInDeal(99);
        }
        // finished / null → чистый стол
        setSynced(true);
      })
      .catch(e => setErr(e instanceof Error ? e.message : 'Ошибка загрузки'));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── РАЗДАТЬ ──────────────────────────────────────────────────── */
  const deal = useCallback(() => {
    if (busyRef.current) return;

    // Сбросить стол
    clearTimers();
    setShowRes(false);
    setRound(null);
    setShownInDeal(0);

    busyRef.current = true;
    setBusy(true);
    setErr(null);

    (async () => {
      try {
        const pre = await api.getBlackjackState();
        if (pre.round?.phase === 'player') {
          throw new Error('Сначала завершите текущую раздачу (Ещё или Хватит).');
        }
        const s = await api.blackjackDeal(bet);
        onBalanceUpdate(s.newBalance);
        setRound(s.round);

        if (s.round?.phase === 'finished') {
          // Блэкджек на раздаче — анимируем карты, потом показываем результат
          const totalCards = (s.round.playerCards.length + s.round.dealerCards.length);
          startDealAnim(0);
          setTimeout(() => setShowRes(true), totalCards * DEAL_STEP_MS + 100);
        } else {
          // Обычная раздача P0→D0→P1→D1
          startDealAnim(0);
        }
      } catch (e) {
        setErr(e instanceof Error ? e.message : 'Ошибка раздачи');
      } finally {
        busyRef.current = false;
        setBusy(false);
      }
    })();
  }, [bet, clearTimers, onBalanceUpdate, startDealAnim]);

  /* ── Вспомогательный wrapper для HIT / STAND / DOUBLE ─────────── */
  const runAction = useCallback(
    async (fn: () => Promise<{ newBalance: number; round: BlackjackRound | null }>) => {
      if (busyRef.current) return;
      clearTimers();
      setShownInDeal(99); // новые карты появятся сразу через CSS-анимацию
      busyRef.current = true;
      setBusy(true);
      setErr(null);
      try {
        const s = await fn();
        onBalanceUpdate(s.newBalance);
        setRound(s.round);
        if (s.round?.phase === 'finished') setShowRes(true);
      } catch (e) {
        setErr(e instanceof Error ? e.message : 'Ошибка');
      } finally {
        busyRef.current = false;
        setBusy(false);
      }
    },
    [clearTimers, onBalanceUpdate],
  );

  const hit    = useCallback(() => runAction(() => api.blackjackHit()),    [runAction]);
  const stand  = useCallback(() => runAction(() => api.blackjackStand()),  [runAction]);
  const double = useCallback(() => runAction(() => api.blackjackDouble()), [runAction]);

  /* ── Вычисляемые флаги ────────────────────────────────────────── */
  const dealAnimPlaying = shownInDeal < 4 && shownInDeal !== 99;
  const inPlay          = round?.phase === 'player';
  const isFinished      = round?.phase === 'finished';
  const canDeal         = synced && !busy && (!round || isFinished) && !dealAnimPlaying;
  const canAct          = inPlay && !busy && !dealAnimPlaying;
  const canDouble       = canAct && (round?.playerCards.length ?? 0) === 2;
  const playerBust      = (round?.playerValue ?? 0) > 21;
  const dealerScore     = round ? (round.dealerValue ?? round.dealerUpcardValue ?? null) : null;

  /* ── Какие карты показывать ───────────────────────────────────── */
  // Порядок раздачи: P0 (step 1) → D0 (step 2) → P1 (step 3) → D1 (step 4)
  // Player[i] показывается когда shownInDeal > i*2  (P0 при ≥1, P1 при ≥3)
  // Dealer[i] показывается когда shownInDeal > i*2+1 (D0 при ≥2, D1 при ≥4)
  const visiblePlayer = shownInDeal >= 99
    ? (round?.playerCards ?? [])
    : (round?.playerCards ?? []).filter((_, i) => shownInDeal > i * 2);

  const visibleDealer = shownInDeal >= 99
    ? (round?.dealerCards ?? [])
    : (round?.dealerCards ?? []).filter((_, i) => shownInDeal > i * 2 + 1);

  const { label: resLabel, tone: resTone } =
    round?.result ? resultInfo(round.result) : { label: '', tone: 'push' as const };
  const isWin = resTone === 'win';

  /* ── Render ────────────────────────────────────────────────────── */
  return (
    <div className="bj2">

      {/* ── Назад ───────────────────────────────────────────── */}
      <button className="bj2-back" onClick={onBack} aria-label="Назад к играм">
        ‹ Игры
      </button>

      {/* ── Дилер ───────────────────────────────────────────── */}
      <section className="bj2-zone bj2-zone--dealer" aria-label="Зона дилера">
        <div className="bj2-zone-label">
          <span>Дилер</span>
          <Score v={dealerScore} />
        </div>
        <div className="bj2-hand">
          {visibleDealer.map((c, i) => (
            <Card key={`d${i}-${c.code}`} code={c.code} faceDown={c.faceDown} />
          ))}
        </div>
      </section>

      {/* ── Фетр (результат) ────────────────────────────────── */}
      <div className="bj2-felt">
        {showRes && round?.result && (
          <div className={`bj2-result bj2-result--${resTone}`} role="status">
            {isWin && <Confetti />}
            <span className="bj2-result__label">{resLabel}</span>
            {round.payout > 0 && (
              <span className="bj2-result__payout num">
                +{round.payout.toLocaleString('ru-RU')}
                <StarIcon size={14} animate={false} />
              </span>
            )}
          </div>
        )}
      </div>

      {/* ── Игрок ───────────────────────────────────────────── */}
      <section className="bj2-zone bj2-zone--player" aria-label="Зона игрока">
        <div className="bj2-hand">
          {visiblePlayer.map((c, i) => (
            <Card key={`p${i}-${c.code}`} code={c.code} />
          ))}
        </div>
        <div className="bj2-zone-label bj2-zone-label--player">
          <span>Вы</span>
          <Score v={round?.playerValue ?? null} bust={playerBust} />
          {round?.bet != null && round.bet > 0 && (
            <span className="bj2-bet-badge num">
              {round.bet}<StarIcon size={11} animate={false} />
            </span>
          )}
        </div>
      </section>

      {/* ── Ошибка ──────────────────────────────────────────── */}
      {err && <div className="bj2-error" role="alert">{err}</div>}

      {/* ── Панель управления ───────────────────────────────── */}
      <div className="bj2-controls">

        {/* Чипы */}
        <div className="bj2-chips" role="group" aria-label="Размер ставки">
          {BETS.map(b => (
            <button
              key={b}
              className={`bj2-chip num${bet === b ? ' bj2-chip--on' : ''}`}
              disabled={!canDeal}
              onClick={() => setBet(b)}
              aria-pressed={bet === b}
            >
              {b}
            </button>
          ))}
        </div>

        {/* Ещё / Хватит / ×2 */}
        <div className="bj2-actions">
          <button className="bj2-action bj2-action--hit"    disabled={!canAct}    onClick={hit}>
            ЕЩЁ
          </button>
          <button className="bj2-action bj2-action--stand"  disabled={!canAct}    onClick={stand}>
            ХВАТИТ
          </button>
          <button className="bj2-action bj2-action--double" disabled={!canDouble} onClick={double}
            title="Удвоить ставку — одна карта, затем дилер">
            ×2
          </button>
        </div>

        {/* Раздать */}
        <button className="bj2-deal" disabled={!canDeal} onClick={deal}>
          {!synced ? 'Загрузка…' : busy ? '…' : `РАЗДАТЬ  •  ${bet} ★`}
        </button>
      </div>
    </div>
  );
}
