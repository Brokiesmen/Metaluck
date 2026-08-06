import { useEffect, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import { api } from '../api';
import { ResultModal } from './ResultModal';
import { ModalShell } from './ModalShell';
import { useSettings } from '../settings/SettingsContext';
import { tf } from '../i18n/tf';
import type { Prize } from '../types';

type WheelSeg = { id: number; label: string; color: string };

function fmtRemainLabel(
  ms: number,
  t: { daysHoursMinutes: string; hoursMinutes: string },
): string {
  const d = Math.floor(ms / 86400000);
  const h = Math.floor((ms % 86400000) / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  if (d > 0) return tf(t.daysHoursMinutes, { d, h, m });
  return tf(t.hoursMinutes, { h, m });
}

function fmtTimer(ms: number) {
  if (ms <= 0) return '00:00:00';
  const d = Math.floor(ms / 86400000);
  const h = Math.floor((ms % 86400000) / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  if (d > 0) {
    return `${d}д ${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function wheelGradient(segments: WheelSeg[]): string {
  if (segments.length === 0) return '#232e3c';
  const step = 100 / segments.length;
  const parts = segments.map((s, i) => {
    const a = (i * step).toFixed(2);
    const b = ((i + 1) * step).toFixed(2);
    return `${s.color} ${a}% ${b}%`;
  });
  return `conic-gradient(from -90deg, ${parts.join(', ')})`;
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

interface Props {
  onBalanceUpdate: (b: number) => void;
  isTelegram?: boolean;
  openInvoice?: (
    url: string,
    callback?: (status: 'paid' | 'cancelled' | 'failed' | 'pending') => void,
  ) => void;
}

export function FortuneWheel({ onBalanceUpdate, isTelegram, openInvoice }: Props) {
  const { t } = useSettings();
  const [available, setAvailable] = useState(false);
  const [nextAt, setNextAt] = useState<number | null>(null);
  const [segments, setSegments] = useState<WheelSeg[]>([]);
  const [premiumSegments, setPremiumSegments] = useState<WheelSeg[]>([]);
  const [premiumXtr, setPremiumXtr] = useState(25);
  const [coupons, setCoupons] = useState(0);
  const [remaining, setRemaining] = useState(0);

  const [openFree, setOpenFree] = useState(false);
  const [openPremium, setOpenPremium] = useState(false);
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [premiumRotation, setPremiumRotation] = useState(0);
  const [activeKind, setActiveKind] = useState<'free' | 'premium'>('free');
  const [result, setResult] = useState<Prize | null>(null);
  const [error, setError] = useState<string | null>(null);
  const spinLock = useRef(false);

  const refresh = () => {
    api
      .getWheelStatus()
      .then((s) => {
        setAvailable(s.available);
        setNextAt(s.nextAt);
        setSegments(s.segments);
        setPremiumSegments(s.premiumSegments ?? []);
        setPremiumXtr(s.premiumXtr ?? 25);
        setCoupons(s.coupons ?? 0);
      })
      .catch(() => {});
  };

  useEffect(() => {
    refresh();
  }, []);

  useEffect(() => {
    if (available || !nextAt) {
      setRemaining(0);
      return;
    }
    const tick = () => {
      const left = Math.max(0, nextAt - Date.now());
      setRemaining(left);
      if (left <= 0) refresh();
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [available, nextAt]);

  const animateTo = (
    segs: WheelSeg[],
    segmentIndex: number,
    currentRot: number,
    setRot: (n: number) => void,
  ) => {
    const n = segs.length || 8;
    const step = 360 / n;
    const targetCenter = segmentIndex * step + step / 2;
    const extraTurns = 5 + Math.floor(Math.random() * 3);
    const current = ((currentRot % 360) + 360) % 360;
    const desired = ((360 - targetCenter) % 360 + 360) % 360;
    let delta = (desired - current + 360) % 360;
    if (delta < 45) delta += 360;
    setRot(currentRot + extraTurns * 360 + delta);
  };

  const finishSpin = (res: {
    prize: Prize;
    newBalance: number;
    coupons: number;
    empty?: boolean;
    nextAt?: number;
  }) => {
    setResult(res.prize);
    setOpenFree(false);
    setOpenPremium(false);
    setSpinning(false);
    spinLock.current = false;
    setCoupons(res.coupons);
    onBalanceUpdate(res.newBalance);
    if (typeof res.nextAt === 'number') {
      setAvailable(false);
      setNextAt(res.nextAt);
    }
    const won =
      !res.empty &&
      ((res.prize.stars ?? 0) > 0 || (res.prize.coupons ?? 0) > 0 || res.prize.icon === '🎁');
    if (won) {
      confetti({ particleCount: 70, spread: 65, origin: { y: 0.55 }, zIndex: 150 });
    }
  };

  const spinFree = async () => {
    if (spinLock.current || spinning || !available) return;
    spinLock.current = true;
    setSpinning(true);
    setActiveKind('free');
    setError(null);
    setResult(null);
    try {
      const res = await api.spinWheel();
      animateTo(segments, res.segmentIndex, rotation, setRotation);
      window.setTimeout(() => finishSpin(res as typeof res & { prize: Prize }), 4200);
    } catch (e) {
      setError(e instanceof Error ? e.message : t.daily.wheelError);
      setSpinning(false);
      spinLock.current = false;
      refresh();
    }
  };

  const spinPremiumWithCoupon = async () => {
    if (spinLock.current || spinning) return;
    if (coupons < 1) {
      setError(t.daily.wheelNoCoupons);
      return;
    }
    spinLock.current = true;
    setSpinning(true);
    setActiveKind('premium');
    setError(null);
    setResult(null);
    try {
      const res = await api.spinPremiumWheel({ method: 'coupon' });
      animateTo(premiumSegments, res.segmentIndex, premiumRotation, setPremiumRotation);
      window.setTimeout(() => finishSpin(res as typeof res & { prize: Prize }), 4200);
    } catch (e) {
      setError(e instanceof Error ? e.message : t.daily.wheelError);
      setSpinning(false);
      spinLock.current = false;
      refresh();
    }
  };

  const spinPremiumWithStars = async () => {
    if (spinLock.current || spinning) return;
    if (!isTelegram || !openInvoice) {
      setError(t.daily.wheelPayTelegramOnly);
      return;
    }
    spinLock.current = true;
    setSpinning(true);
    setActiveKind('premium');
    setError(null);
    setResult(null);
    try {
      const { invoiceLink, payload } = await api.createPremiumWheelInvoice();
      await new Promise<void>((resolve, reject) => {
        openInvoice(invoiceLink, async (status) => {
          try {
            if (status === 'cancelled' || status === 'failed') {
              reject(new Error(t.daily.wheelPayCancelled));
              return;
            }
            let ready = false;
            for (let i = 0; i < 10; i += 1) {
              const st = await api.getPremiumWheelPayStatus(payload);
              if (st.readyToSpin) {
                ready = true;
                break;
              }
              if (st.used) {
                reject(new Error(t.daily.wheelPayUsed));
                return;
              }
              await sleep(800);
            }
            if (!ready) {
              reject(new Error(t.daily.wheelPayPending));
              return;
            }
            resolve();
          } catch (err) {
            reject(err);
          }
        });
      });

      const res = await api.spinPremiumWheel({ method: 'xtr', payload });
      animateTo(premiumSegments, res.segmentIndex, premiumRotation, setPremiumRotation);
      window.setTimeout(() => finishSpin(res as typeof res & { prize: Prize }), 4200);
    } catch (e) {
      setError(e instanceof Error ? e.message : t.daily.wheelError);
      setSpinning(false);
      spinLock.current = false;
      refresh();
    }
  };

  const remainLabel = fmtRemainLabel(remaining, t.daily);

  return (
    <>
      <div className="coupon-bar" aria-live="polite">
        <span className="coupon-bar-icon" aria-hidden>
          🎟️
        </span>
        <span className="coupon-bar-label">{t.daily.couponsLabel}</span>
        <span className="coupon-bar-count num">{coupons}</span>
      </div>

      <div className="wheel-duo">
        <div className={`free-case-banner wheel-banner${available ? ' free-case-banner--ready' : ''}`}>
          <div className="free-case-banner-icon" aria-hidden>
            🎡
          </div>
          <div className="free-case-banner-body">
            <div className="free-case-banner-title">{t.daily.wheelTitle}</div>
            <div className="free-case-banner-sub">
              {available ? t.daily.wheelReady : `${t.daily.againIn} ${remainLabel}`}
            </div>
          </div>
          <button
            type="button"
            className={`free-case-banner-btn${available ? '' : ' free-case-banner-btn--timer'}`}
            onClick={() => {
              setError(null);
              setOpenFree(true);
            }}
          >
            {available ? t.daily.wheelOpen : (
              <span className="free-case-timer-text num">{fmtTimer(remaining)}</span>
            )}
          </button>
        </div>

        <div className="free-case-banner wheel-banner wheel-banner--premium">
          <div className="free-case-banner-icon" aria-hidden>
            💎
          </div>
          <div className="free-case-banner-body">
            <div className="free-case-banner-title">{t.daily.premiumWheelTitle}</div>
            <div className="free-case-banner-sub">{t.daily.premiumWheelHint}</div>
          </div>
          <button
            type="button"
            className="free-case-banner-btn"
            onClick={() => {
              setError(null);
              setOpenPremium(true);
            }}
          >
            {t.daily.wheelOpen}
          </button>
        </div>
      </div>

      {openFree && (
        <ModalShell
          onClose={() => {
            if (spinning) return;
            setOpenFree(false);
            setError(null);
          }}
          sheetClassName="wheel-sheet"
          labelledBy="wheel-title"
        >
          <div className="modal-handle" />
          <div id="wheel-title" className="wheel-modal-title">
            {t.daily.wheelTitle}
          </div>
          <div className="wheel-modal-sub">{t.daily.wheelHint}</div>
          <WheelDisk segments={segments} rotation={activeKind === 'free' ? rotation : 0} spinning={spinning && activeKind === 'free'} />
          {error && openFree && <div className="error-banner" style={{ margin: '8px 0' }}>{error}</div>}
          <button
            type="button"
            className="tg-btn modal-action"
            disabled={spinning || !available}
            onClick={spinFree}
          >
            {spinning && activeKind === 'free'
              ? t.daily.wheelSpinning
              : available
                ? t.daily.wheelSpin
                : t.daily.wheelCooldown}
          </button>
          <button type="button" className="topup-cancel" disabled={spinning} onClick={() => setOpenFree(false)}>
            {t.common.close}
          </button>
        </ModalShell>
      )}

      {openPremium && (
        <ModalShell
          onClose={() => {
            if (spinning) return;
            setOpenPremium(false);
            setError(null);
          }}
          sheetClassName="wheel-sheet"
          labelledBy="premium-wheel-title"
        >
          <div className="modal-handle" />
          <div id="premium-wheel-title" className="wheel-modal-title">
            {t.daily.premiumWheelTitle}
          </div>
          <div className="wheel-modal-sub">{t.daily.premiumWheelHint}</div>
          <WheelDisk
            segments={premiumSegments}
            rotation={activeKind === 'premium' ? premiumRotation : 0}
            spinning={spinning && activeKind === 'premium'}
          />
          {error && openPremium && <div className="error-banner" style={{ margin: '8px 0' }}>{error}</div>}
          <div className="wheel-pay-row">
            <button
              type="button"
              className="tg-btn modal-action"
              disabled={spinning || coupons < 1}
              onClick={spinPremiumWithCoupon}
            >
              {spinning && activeKind === 'premium'
                ? t.daily.wheelSpinning
                : tf(t.daily.premiumSpinCoupon, { n: coupons })}
            </button>
            <button
              type="button"
              className="tg-btn modal-action wheel-pay-stars"
              disabled={spinning}
              onClick={spinPremiumWithStars}
            >
              {tf(t.daily.premiumSpinStars, { n: premiumXtr })}
            </button>
          </div>
          <button
            type="button"
            className="topup-cancel"
            disabled={spinning}
            onClick={() => setOpenPremium(false)}
          >
            {t.common.close}
          </button>
        </ModalShell>
      )}

      <ResultModal
        prize={result}
        onClose={() => {
          setResult(null);
          refresh();
        }}
      />
    </>
  );
}

function WheelDisk({
  segments,
  rotation,
  spinning,
}: {
  segments: WheelSeg[];
  rotation: number;
  spinning: boolean;
}) {
  return (
    <div className="wheel-stage">
      <div className="wheel-pointer" aria-hidden />
      <div
        className={`wheel-disk${spinning ? ' wheel-disk--spinning' : ''}`}
        style={{
          background: wheelGradient(segments),
          transform: `rotate(${rotation}deg)`,
        }}
      >
        {segments.map((s, i) => {
          const step = 360 / Math.max(segments.length, 1);
          const angle = -90 + i * step + step / 2;
          return (
            <span
              key={s.id}
              className="wheel-label"
              style={{ transform: `rotate(${angle}deg) translateY(-78px)` }}
            >
              {s.label}
            </span>
          );
        })}
      </div>
    </div>
  );
}
