import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api, resolveWsUrl } from '../api';
import type { AviatorPlayerView, AviatorRoundView } from '../types';
import { useSettings } from '../settings/SettingsContext';
import { useTelegram } from '../hooks/useTelegram';
import { isDemoMode } from '../demo';
import { tf } from '../i18n/tf';
import { StarIcon } from './StarIcon';
import { Toast, type ToastTone } from './Toast';
import { BetCurrencyPicker } from './BetCurrencyPicker';
import { useWagerCurrency } from '../hooks/useWagerCurrency';
import { hapticImpact, hapticSuccess, hapticWarning } from '../lib/haptics';
import {
  MIN_CASHOUT,
  formatMult,
  historyTone,
  multiplierAt,
  payoutForCashout,
} from '../lib/aviatorOdds';

interface Props {
  onBack: () => void;
  onBalanceUpdate: (balance: number) => void;
}

const BETS = [1, 5, 10, 25, 50, 100] as const;
type BetAmount = (typeof BETS)[number];

/** REST-поллинг: основной канал в демо и fallback, если WebSocket недоступен. */
const POLL_MS = 1000;
/** Геометрия SVG-графика. */
const GW = 320;
const GH = 176;
/** Точек сэмплирования кривой (компромисс плавность / нагрузка на старые WebView). */
const CURVE_POINTS = 34;
/** Минимальные окна автомасштабирования осей. */
const MIN_SPAN_MS = 7_000;
const MIN_SPAN_MULT = 2;

/** Множитель, на котором забрана моя ставка, либо null. */
function mineCashedOut(round: AviatorRoundView | null, myId: number): number | null {
  if (!round) return null;
  const mine = round.players.find((p) => p.userId === myId && !p.isBot);
  return mine?.cashedOutMult ?? null;
}

/** Конфетти — тот же приём и те же keyframes, что в Coinflip / Arena. */
function Confetti() {
  const pieces = Array.from({ length: 16 }, (_, i) => ({
    id: i,
    left: `${(i * 61) % 100}%`,
    delay: `${(i % 5) * 0.06}s`,
    hue: 120 + (i % 5) * 24,
  }));
  return (
    <div className="cf-confetti" aria-hidden>
      {pieces.map((p) => (
        <span
          key={p.id}
          className="cf-confetti-piece"
          style={{ left: p.left, animationDelay: p.delay, background: `hsl(${p.hue} 85% 55%)` }}
        />
      ))}
    </div>
  );
}

export function AviatorGame({ onBack, onBalanceUpdate }: Props) {
  const { t, locale } = useSettings();
  const { user } = useTelegram();
  const { currency } = useWagerCurrency();
  const myId = user?.id ?? 0;

  const [round, setRound] = useState<AviatorRoundView | null>(null);
  const [bet, setBet] = useState<BetAmount>(10);
  const [autoOn, setAutoOn] = useState(false);
  const [autoValue, setAutoValue] = useState(2);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [synced, setSynced] = useState(false);
  const [toast, setToast] = useState<{ text: string; tone: ToastTone; key: number } | null>(null);

  /** serverNow − Date.now(): компенсация расхождения часов (как в ArenaGame). */
  const clockOffsetRef = useRef(0);
  /** Зеркало round для rAF-цикла — без ререндеров на кадр. */
  const roundRef = useRef<AviatorRoundView | null>(null);
  const aliveRef = useRef(true);
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rafRef = useRef<number | null>(null);

  // DOM-узлы, в которые пишем напрямую из rAF
  const multRef = useRef<HTMLDivElement>(null);
  const curveRef = useRef<SVGPathElement>(null);
  const fillRef = useRef<SVGPathElement>(null);
  const planeRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<HTMLSpanElement>(null);
  const cashLabelRef = useRef<HTMLSpanElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  /** Размер сцены в px — кэшируем, чтобы не читать layout в каждом кадре. */
  const stageSizeRef = useRef({ w: 0, h: 0 });
  /** Последние записанные строки: не трогаем DOM, если значение не изменилось. */
  const lastTextRef = useRef({ timer: '', mult: '', cash: '' });
  /** Метка последней перестройки кривой (троттлинг до ~30 к/с). */
  const lastCurveAtRef = useRef(0);

  const measureStage = useCallback(() => {
    const el = svgRef.current;
    if (el) stageSizeRef.current = { w: el.clientWidth, h: el.clientHeight };
  }, []);

  useEffect(() => {
    measureStage();
    window.addEventListener('resize', measureStage);
    return () => window.removeEventListener('resize', measureStage);
  }, [measureStage]);

  const serverNow = useCallback(() => Date.now() + clockOffsetRef.current, []);

  const applyRound = useCallback(
    (next: AviatorRoundView | null, serverTs?: number) => {
      if (typeof serverTs === 'number') clockOffsetRef.current = serverTs - Date.now();
      roundRef.current = next;
      setRound(next);
      setSynced(true);
    },
    [],
  );

  /* ── Первичная загрузка (REST): баланс + снимок раунда ─────────────── */
  const loadState = useCallback(async () => {
    const data = await api.aviatorState();
    if (!aliveRef.current) return;
    onBalanceUpdate(data.balance);
    applyRound(data.round, data.now);
    setErr(null);
  }, [applyRound, onBalanceUpdate]);

  /* ── REST-поллинг (демо + fallback без сокета) ─────────────────────── */
  const startPolling = useCallback(() => {
    if (pollTimerRef.current) return;
    const loop = async () => {
      pollTimerRef.current = null;
      try {
        await loadState();
      } catch (e) {
        if (aliveRef.current && !roundRef.current) {
          setErr(e instanceof Error ? e.message : t.av.loadError);
        }
      }
      if (aliveRef.current) pollTimerRef.current = setTimeout(loop, POLL_MS);
    };
    void loop();
  }, [loadState, t.av.loadError]);

  const stopPolling = useCallback(() => {
    if (pollTimerRef.current) {
      clearTimeout(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  /** Обновить баланс после серверного авто-кэшаута / конца раунда. */
  const refreshBalance = useCallback(() => {
    api.getBalance().then(onBalanceUpdate).catch(() => {});
  }, [onBalanceUpdate]);

  /* ── WebSocket-лента (мгновенный crash без задержки поллинга) ──────── */
  useEffect(() => {
    aliveRef.current = true;

    // Демо-режим живёт локально — сокет не нужен.
    if (isDemoMode()) {
      startPolling();
      return () => {
        aliveRef.current = false;
        stopPolling();
      };
    }

    void loadState().catch(() => {});

    /* Разрыв сокета не должен навсегда сажать клиента на REST-поллинг: каждый
       опрос — это чтение баланса из Supabase. Поллинг включаем как страховку,
       но параллельно переподключаемся с нарастающей паузой. */
    let retryMs = 2000;
    const openSocket = () => {
      if (!aliveRef.current) return;

      let ws: WebSocket | null = null;
      try {
        ws = new WebSocket(resolveWsUrl('/api/aviator/ws'));
      } catch {
        startPolling();
        scheduleReconnect();
        return;
      }
      wsRef.current = ws;

      ws.onopen = () => {
        if (!aliveRef.current) return;
        retryMs = 2000; // связь есть — сбрасываем задержку
        stopPolling(); // сокет живой — поллинг не нужен
      };

      ws.onmessage = (ev) => {
        if (!aliveRef.current) return;
        let msg: { type?: string; data?: unknown; now?: number };
        try {
          msg = JSON.parse(String(ev.data));
        } catch {
          return;
        }
        if (typeof msg.now === 'number') clockOffsetRef.current = msg.now - Date.now();

        const cur = roundRef.current;
        switch (msg.type) {
          case 'aviator:round': {
            const data = msg.data as AviatorRoundView & { round?: null };
            // Сервер отдаёт { round: null, ... } когда раунда нет.
            if (!data || (data as { round?: null }).round === null || !data.roundId) {
              applyRound(null, msg.now);
            } else {
              const prevPhase = cur?.phase;
              applyRound(data, msg.now);
              if (prevPhase === 'flying' && data.phase === 'crashed') refreshBalance();
            }
            break;
          }
          case 'aviator:bet': {
            const d = msg.data as { roundId: string; userId: number; name: string; bet: number; color: string; autoCashout: number | null };
            if (!cur || cur.roundId !== d.roundId) break;
            const players = [...cur.players];
            const i = players.findIndex((p) => p.userId === d.userId && !p.isBot);
            if (i >= 0) players[i] = { ...players[i], bet: d.bet, autoCashout: d.autoCashout };
            else {
              players.push({
                userId: d.userId, name: d.name, bet: d.bet, color: d.color,
                isBot: false, autoCashout: d.autoCashout, cashedOutMult: null,
                payout: 0, isMe: d.userId === myId,
              });
            }
            applyRound({ ...cur, players });
            break;
          }
          case 'aviator:cashout': {
            const d = msg.data as { roundId: string; userId: number; mult: number; payout: number };
            if (!cur || cur.roundId !== d.roundId) break;
            const players = cur.players.map((p) =>
              p.userId === d.userId ? { ...p, cashedOutMult: d.mult, payout: d.payout } : p,
            );
            applyRound({ ...cur, players });
            if (d.userId === myId) refreshBalance();
            break;
          }
          case 'aviator:crash': {
            const d = msg.data as { roundId: string; crashMult: number };
            if (!cur || cur.roundId !== d.roundId) break;
            applyRound({
              ...cur,
              phase: 'crashed',
              crashMultiplier: d.crashMult,
              multiplier: d.crashMult,
              history: [...cur.history.slice(-19), d.crashMult],
            });
            refreshBalance();
            break;
          }
          default:
            break;
        }
      };

      const fallback = () => {
        if (wsRef.current === ws) wsRef.current = null;
        if (!aliveRef.current) return;
        startPolling(); // страховка на время переподключения
        scheduleReconnect();
      };
      ws.onerror = fallback;
      ws.onclose = fallback;
    };

    function scheduleReconnect() {
      if (!aliveRef.current || reconnectTimerRef.current) return;
      reconnectTimerRef.current = setTimeout(() => {
        reconnectTimerRef.current = null;
        openSocket();
      }, retryMs);
      retryMs = Math.min(15000, retryMs * 2);
    }

    openSocket();

    return () => {
      aliveRef.current = false;
      stopPolling();
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      const sock = wsRef.current;
      wsRef.current = null;
      if (sock) {
        sock.onopen = null;
        sock.onmessage = null;
        sock.onerror = null;
        sock.onclose = null;
        try {
          sock.close();
        } catch {
          /* ignore */
        }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- один канал на монтирование
  }, []);

  /* ── rAF: множитель, кривая, самолёт, таймер — мимо React ──────────── */
  useEffect(() => {
    const draw = (frameTs: number) => {
      rafRef.current = requestAnimationFrame(draw);
      const r = roundRef.current;
      if (!r) return;
      const now = serverNow();
      const texts = lastTextRef.current;

      // — Таймер: пишем в DOM только при смене строки (десятые доли секунды) —
      if (timerRef.current) {
        const until =
          r.phase === 'betting' ? r.bettingEndsAt : r.phase === 'crashed' ? r.nextRoundAt : null;
        if (until) {
          const next = (Math.max(0, until - now) / 1000).toFixed(1);
          if (next !== texts.timer) {
            texts.timer = next;
            timerRef.current.textContent = next;
          }
        }
      }

      if (r.phase !== 'flying') return; // вне полёта анимировать нечего

      const elapsed = r.startedAt ? Math.max(0, now - r.startedAt) : 0;
      let mult = multiplierAt(elapsed);
      // Не даём клиенту «перелететь» краш до прихода события; после своего
      // кэшаута замораживаем счётчик на фактическом множителе забора.
      if (r.crashMultiplier != null) mult = Math.min(mult, r.crashMultiplier);
      const mineLive = r.players.find((p) => p.userId === myId && !p.isBot);
      if (mineLive?.cashedOutMult != null) {
        mult = Math.min(mult, mineLive.cashedOutMult);
      }

      // — Множитель —
      if (multRef.current) {
        const next = formatMult(mult);
        if (next !== texts.mult) {
          texts.mult = next;
          multRef.current.textContent = next;
        }
      }

      // — Живая подпись на кнопке «Забрать» —
      if (cashLabelRef.current) {
        const mine = r.players.find((p) => p.userId === myId && !p.isBot);
        if (mine && mine.cashedOutMult === null && mine.bet > 0) {
          const next = String(payoutForCashout(mine.bet, mult));
          if (next !== texts.cash) {
            texts.cash = next;
            cashLabelRef.current.textContent = next;
          }
        }
      }

      const spanT = Math.max(MIN_SPAN_MS, elapsed * 1.12);
      const spanM = Math.max(MIN_SPAN_MULT, mult * 1.12);
      const tipX = (elapsed / spanT) * GW;
      const tipY = GH - ((mult - 1) / (spanM - 1)) * GH;

      // — Самолёт: только transform (композитор), без чтения/записи layout —
      if (planeRef.current) {
        const { w, h } = stageSizeRef.current;
        planeRef.current.style.transform =
          `translate3d(${((tipX / GW) * w).toFixed(1)}px, ${((tipY / GH) * h).toFixed(1)}px, 0)`;
      }

      // — Кривая: тяжёлая перестройка пути троттлится до ~30 к/с —
      if (curveRef.current && fillRef.current && frameTs - lastCurveAtRef.current >= 33) {
        lastCurveAtRef.current = frameTs;
        let d = '';
        for (let i = 0; i <= CURVE_POINTS; i++) {
          const tt = (elapsed * i) / CURVE_POINTS;
          const mm = multiplierAt(tt);
          const x = (tt / spanT) * GW;
          const y = GH - ((mm - 1) / (spanM - 1)) * GH;
          d += `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`;
        }
        curveRef.current.setAttribute('d', d);
        fillRef.current.setAttribute('d', `${d}L${tipX.toFixed(1)} ${GH}L0 ${GH}Z`);
      }
    };
    rafRef.current = requestAnimationFrame(draw);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [myId, serverNow]);

  /* ── Сброс кривой при старте нового раунда ────────────────────────── */
  const phase = round?.phase ?? null;
  const roundId = round?.roundId ?? null;
  useEffect(() => {
    // Размер сцены мог измениться (поворот, клавиатура, Telegram-viewport),
    // пока раунд шёл — пересчитываем на каждой смене фазы, а не в каждом кадре.
    measureStage();
    if (phase !== 'betting') return;

    curveRef.current?.setAttribute('d', '');
    fillRef.current?.setAttribute('d', '');
    lastTextRef.current = { timer: '', mult: '', cash: '' };
    if (multRef.current) multRef.current.textContent = formatMult(1);
    if (planeRef.current) {
      // Стартовая точка — левый нижний угол сцены.
      planeRef.current.style.transform = `translate3d(0px, ${stageSizeRef.current.h}px, 0)`;
    }
  }, [phase, roundId, measureStage]);

  /* ── Уведомления: кэшаут (ручной и авто) и проигрыш ────────────────
     Один источник правды — переходы состояния моей ставки. Поэтому авто-кэшаут
     с сервера уведомляет так же, как нажатие кнопки. */
  const notify = useCallback((text: string, tone: ToastTone) => {
    setToast({ text, tone, key: Date.now() });
  }, []);

  const prevCashedRef = useRef<number | null>(null);
  const notifiedRoundRef = useRef<string | null>(null);

  const myCashed = mineCashedOut(round, myId);
  useEffect(() => {
    const r = roundRef.current;
    const prevCashed = prevCashedRef.current;

    // null → число: ставка забрана (кнопкой или авто-кэшаутом на сервере)
    if (prevCashed === null && myCashed != null && r) {
      const payout = r.players.find((p) => p.userId === myId && !p.isBot)?.payout ?? 0;
      hapticSuccess();
      notify(tf(t.av.toastWin, { mult: formatMult(myCashed), amount: payout }), 'win');
    }

    // Раунд разбился, а ставка осталась незабранной — проигрыш.
    // Намеренно НЕ требуем увидеть переход flying → crashed: при лаге сети или
    // свёрнутом приложении фаза полёта может быть пропущена целиком, а
    // уведомление всё равно должно прийти. Ключ roundId гарантирует один раз.
    if (phase === 'crashed' && r && notifiedRoundRef.current !== r.roundId) {
      const mineNow = r.players.find((p) => p.userId === myId && !p.isBot);
      if (mineNow && mineNow.bet > 0 && mineNow.cashedOutMult == null) {
        notifiedRoundRef.current = r.roundId;
        hapticWarning();
        notify(
          tf(t.av.toastLost, { mult: formatMult(r.crashMultiplier ?? r.multiplier) }),
          'lose',
        );
      }
    }

    prevCashedRef.current = myCashed ?? null;
  }, [myCashed, phase, myId, notify, t.av.toastWin, t.av.toastLost]);

  /* ── Действия ─────────────────────────────────────────────────────── */
  const placeBet = useCallback(() => {
    if (busy) return;
    setBusy(true);
    setErr(null);
    api
      .aviatorBet(bet, autoOn ? autoValue : null, currency)
      .then((res) => {
        onBalanceUpdate(res.balance);
        applyRound(res.round, res.now);
        hapticImpact('light');
      })
      .catch((e) => setErr(e instanceof Error ? e.message : t.av.betError))
      .finally(() => setBusy(false));
  }, [applyRound, autoOn, autoValue, bet, busy, currency, onBalanceUpdate, t.av.betError]);

  const cashOut = useCallback(() => {
    const r = roundRef.current;
    if (busy || !r) return;
    setBusy(true);
    setErr(null);
    api
      .aviatorCashout(r.roundId)
      .then((res) => {
        onBalanceUpdate(res.balance);
        applyRound(res.round, res.now);
      })
      .catch((e) => setErr(e instanceof Error ? e.message : t.av.cashError))
      .finally(() => setBusy(false));
  }, [applyRound, busy, onBalanceUpdate, t.av.cashError]);

  /* ── Производные для рендера ──────────────────────────────────────── */
  const players: AviatorPlayerView[] = round?.players ?? [];
  const mine = useMemo(
    () => players.find((p) => p.userId === myId && !p.isBot) ?? null,
    [players, myId],
  );
  const pot = useMemo(() => players.reduce((s, p) => s + p.bet, 0), [players]);
  /** Свежие краши слева — разворачиваем один раз на смену истории, не в рендере. */
  const history = useMemo(() => [...(round?.history ?? [])].reverse(), [round?.history]);

  const isBetting = phase === 'betting';
  const isFlying = phase === 'flying';
  const isCrashed = phase === 'crashed';
  const hasBet = (mine?.bet ?? 0) > 0;
  const cashedOut = mine?.cashedOutMult != null;
  const canBet = synced && !busy && isBetting;
  const canCash = synced && !busy && isFlying && hasBet && !cashedOut;
  const iWonThisRound = isCrashed && cashedOut;

  const clampAuto = (v: number) => Math.max(MIN_CASHOUT, Math.round(v * 100) / 100);

  return (
    <div className="av">
      <button className="av-back" onClick={onBack} aria-label={t.common.backGames}>
        {t.av.back}
      </button>

      {/* ── История последних множителей ───────────────────────────── */}
      <div className="av-history" role="list" aria-label={t.av.history}>
        {history.length === 0 ? (
          <span className="av-history-empty">{t.av.historyEmpty}</span>
        ) : (
          history.map((m, i) => (
            <span
              key={`${m}-${i}`}
              role="listitem"
              className={`av-history-chip num av-history-chip--${historyTone(m)}`}
            >
              {formatMult(m)}
            </span>
          ))
        )}
      </div>

      {/* ── Сцена: график + самолёт + множитель ────────────────────── */}
      <div className={`av-stage${isCrashed ? ' av-stage--crashed' : ''}`}>
        <svg
          ref={svgRef}
          className="av-graph"
          viewBox={`0 0 ${GW} ${GH}`}
          preserveAspectRatio="none"
          aria-hidden
        >
          <defs>
            <linearGradient id="av-fill-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(233, 80, 80, 0.34)" />
              <stop offset="100%" stopColor="rgba(233, 80, 80, 0)" />
            </linearGradient>
          </defs>
          {[0.25, 0.5, 0.75].map((f) => (
            <line
              key={f}
              x1="0" y1={GH * f} x2={GW} y2={GH * f}
              stroke="rgba(255,255,255,0.06)" strokeWidth="1"
            />
          ))}
          <path ref={fillRef} className="av-curve-fill" d="" fill="url(#av-fill-grad)" />
          <path ref={curveRef} className="av-curve" d="" fill="none" />
        </svg>

        {/* Внешний слой двигаем из rAF одним transform (композитор),
            внутренний несёт CSS-анимации покачивания/улёта — они не конфликтуют. */}
        <div ref={planeRef} className="av-plane" aria-hidden>
          <span
            className={`av-plane-icon${isFlying ? ' av-plane-icon--flying' : ''}${
              isCrashed ? ' av-plane-icon--gone' : ''
            }`}
          >
            ✈️
          </span>
        </div>

        <div className="av-readout">
          {isCrashed ? (
            <>
              <div className="av-crash-label">{t.av.flewAway}</div>
              <div className="av-mult av-mult--crashed num">
                {formatMult(round?.crashMultiplier ?? round?.multiplier ?? 1)}
              </div>
            </>
          ) : (
            <>
              <div ref={multRef} className={`av-mult num${isFlying ? ' av-mult--flying' : ''}`}>
                {formatMult(1)}
              </div>
              {isBetting && (
                <div className="av-phase">
                  {t.av.startsIn} <span ref={timerRef} className="num">—</span>{t.av.secShort}
                </div>
              )}
              {!isBetting && !isFlying && <div className="av-phase">{t.av.waiting}</div>}
            </>
          )}
          {isCrashed && (
            <div className="av-phase av-phase--next">
              {t.av.nextIn} <span ref={timerRef} className="num">—</span>{t.av.secShort}
            </div>
          )}
        </div>

        {iWonThisRound && <Confetti />}
      </div>

      {/* ── Сумма ставок и число игроков ───────────────────────────── */}
      <div className="av-summary">
        <div className="av-summary-item">
          <span className="av-summary-label">{t.av.pot}</span>
          <span className="av-summary-value num">
            {pot.toLocaleString(locale)}
            <StarIcon size={13} animate={false} />
          </span>
        </div>
        <div className="av-summary-item">
          <span className="av-summary-label">{t.av.playersCount}</span>
          <span className="av-summary-value num">{players.length}</span>
        </div>
        {cashedOut && (
          <div className="av-summary-item av-summary-item--win">
            <span className="av-summary-label">{t.av.yourWin}</span>
            <span className="av-summary-value num">
              +{(mine?.payout ?? 0).toLocaleString(locale)}
              <StarIcon size={13} animate={false} />
            </span>
          </div>
        )}
      </div>

      {/* ── Список игроков ─────────────────────────────────────────── */}
      <div className="av-players">
        {players.length === 0 ? (
          <div className="av-empty">{t.av.empty}</div>
        ) : (
          players.map((p) => (
            <div
              key={p.userId}
              className={`av-player${p.userId === myId && !p.isBot ? ' av-player--me' : ''}${
                p.cashedOutMult != null ? ' av-player--cashed' : ''
              }`}
            >
              <span className="av-player-dot" style={{ background: p.color }} />
              <span className="av-player-name">
                {p.userId === myId && !p.isBot ? t.av.you : p.name}
              </span>
              {p.autoCashout != null && p.cashedOutMult == null && (
                <span className="av-player-auto num">{t.av.autoShort} {formatMult(p.autoCashout)}</span>
              )}
              {p.cashedOutMult != null && (
                <span className="av-player-mult num">{formatMult(p.cashedOutMult)}</span>
              )}
              <span className="av-player-bet num">
                {p.cashedOutMult != null ? `+${p.payout}` : p.bet}
                <StarIcon size={11} animate={false} />
              </span>
            </div>
          ))
        )}
      </div>

      {err && <div className="av-error" role="alert">{err}</div>}

      {/* ── Панель управления ──────────────────────────────────────── */}
      <div className="av-controls">
        <div className="av-chips" role="group" aria-label={t.av.betSize}>
          {BETS.map((b) => (
            <button
              key={b}
              className={`av-chip num${bet === b ? ' av-chip--on' : ''}`}
              disabled={!canBet}
              onClick={() => setBet(b)}
              aria-pressed={bet === b}
            >
              {b}
            </button>
          ))}
        </div>

        <BetCurrencyPicker disabled={!canBet} />

        {/* Auto Cashout */}
        <div className="av-auto">
          <button
            type="button"
            className={`av-auto-toggle${autoOn ? ' av-auto-toggle--on' : ''}`}
            onClick={() => setAutoOn((v) => !v)}
            aria-pressed={autoOn}
            disabled={busy}
          >
            {t.av.autoCashout}
          </button>
          <div className={`av-auto-value${autoOn ? '' : ' av-auto-value--off'}`}>
            <button
              type="button"
              className="av-auto-step"
              onClick={() => setAutoValue((v) => clampAuto(v - 0.1))}
              disabled={!autoOn || busy}
              aria-label={t.av.autoDown}
            >
              −
            </button>
            <span className="av-auto-num num">{autoOn ? formatMult(autoValue) : t.av.autoOff}</span>
            <button
              type="button"
              className="av-auto-step"
              onClick={() => setAutoValue((v) => clampAuto(v + 0.1))}
              disabled={!autoOn || busy}
              aria-label={t.av.autoUp}
            >
              +
            </button>
          </div>
        </div>

        {canCash ? (
          <button className="av-action av-action--cash" onClick={cashOut} disabled={busy}>
            {t.av.cashOut}
            <span className="av-action-sub num">
              <span ref={cashLabelRef}>{payoutForCashout(mine?.bet ?? 0, round?.multiplier ?? 1)}</span>
              <StarIcon size={14} animate={false} />
            </span>
          </button>
        ) : (
          <button className="av-action" onClick={placeBet} disabled={!canBet}>
            {!synced
              ? t.av.loading
              : busy
                ? '…'
                : isFlying
                  ? cashedOut
                    ? tf(t.av.cashedOut, { mult: formatMult(mine?.cashedOutMult ?? 1) })
                    : t.av.roundRunning
                  : isCrashed
                    ? t.av.nextRound
                    : hasBet
                      ? tf(t.av.addBet, { bet })
                      : tf(t.av.placeBet, { bet })}
          </button>
        )}
      </div>

      {toast && (
        <Toast
          key={toast.key}
          message={toast.text}
          tone={toast.tone}
          onDone={() => setToast(null)}
        />
      )}
    </div>
  );
}
