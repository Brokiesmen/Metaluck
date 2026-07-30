import { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { api } from '../api';
import { GIFT_IMAGES, RARITY } from '../data';
import { ResultModal } from './ResultModal';
import { useSettings } from '../settings/SettingsContext';
import type { Case, Prize } from '../types';

// Must mirror server DAILY_REWARDS
const DAILY_REWARDS = [
  { day: 1, type: 'stars',  stars: 1, label: '1★',     color: '#e8c06a' },
  { day: 2, type: 'stars',  stars: 1, label: '1★',     color: '#e8c06a' },
  { day: 3, type: 'stars',  stars: 1, label: '1★',     color: '#e8c06a' },
  { day: 4, type: 'stars',  stars: 1, label: '1★',     color: '#e8c06a' },
  { day: 5, type: 'gift',   rarity: 'blue',   label: 'Подарок', color: '#a8c8f0' },
  { day: 6, type: 'stars',  stars: 1, label: '1★',     color: '#e8c06a' },
  { day: 7, type: 'gift',   rarity: 'purple', label: 'Подарок', color: '#b0acf5' },
] as const;

function fmtTimer(ms: number) {
  if (ms <= 0) return '00:00:00';
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}

function fmtCountdown(ms: number) {
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return `${h}ч ${m}м`;
}

interface Props {
  prizes: Prize[];
  cases: Case[];
  onBalanceUpdate: (b: number) => void;
  onGoToFreeCase: () => void;
}

// ── Prizes showcase (only gift items 1-100, sorted by rarity desc) ─────────────
const ORDER = { gold: 0, purple: 1, blue: 2, gray: 3 } as const;

function PrizesShowcase({ prizes }: { prizes: Prize[] }) {
  const { t } = useSettings();
  const gifts = prizes
    .filter(p => p.id >= 1 && p.id <= 100)
    .sort((a, b) => ORDER[a.rarity] - ORDER[b.rarity]);

  return (
    <div className="daily-prizes-section">
      <div className="daily-section-header">
        <span className="daily-section-title">{t.daily.canWin}</span>
        <span className="daily-section-count">{gifts.length} {t.daily.items}</span>
      </div>
      <div className="daily-prizes-grid">
        {gifts.map(p => {
          const r = RARITY[p.rarity];
          const img = GIFT_IMAGES[p.id];
          return (
            <div key={p.id} className="daily-prize-card"
              style={{ borderColor: r.border, color: r.border }}>
              <div className="daily-prize-img-wrap">
                {img
                  ? <img src={img.image} alt={p.name} className="daily-prize-img" loading="lazy" />
                  : <span className="daily-prize-icon">{p.icon}</span>}
              </div>
              <div className="daily-prize-overlay">
                <div className="daily-prize-name">{p.name}</div>
                <div className="daily-prize-rarity" style={{ color: r.border }}>{t.rarity[p.rarity]}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Free case banner ────────────────────────────────────────────────────────────
function FreeCaseBanner({ freeCase, onOpen }: { freeCase: Case | undefined; onOpen: () => void }) {
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    if (!freeCase?.nextFreeAt) return;
    const tick = () => setRemaining(Math.max(0, freeCase.nextFreeAt! - Date.now()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [freeCase?.nextFreeAt]);

  const available = freeCase?.freeAvailable ?? true;

  return (
    <div className={`free-case-banner${available ? ' free-case-banner--ready' : ''}`}>
      <div className="free-case-banner-icon">📦</div>
      <div className="free-case-banner-body">
        <div className="free-case-banner-title">Бесплатный кейс</div>
        <div className="free-case-banner-sub">
          {available
            ? 'Готов к открытию прямо сейчас!'
            : `Снова через ${fmtCountdown(remaining)}`}
        </div>
      </div>
      <button
        className={`free-case-banner-btn${available ? '' : ' free-case-banner-btn--timer'}`}
        onClick={onOpen}
      >
        {available
          ? 'Открыть'
          : <span className="free-case-timer-text num">{fmtTimer(remaining)}</span>}
      </button>
    </div>
  );
}

// ── Daily calendar section ──────────────────────────────────────────────────────
function DailyCalendar({ onBalanceUpdate }: { onBalanceUpdate: (b: number) => void }) {
  const [status, setStatus]     = useState<{ currentDay: number; canClaim: boolean; nextClaimAt: number; claimedDays: boolean[] } | null>(null);
  const [claiming, setClaiming] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [result, setResult]     = useState<{ prize: Prize; newBalance: number; day: number } | null>(null);

  useEffect(() => {
    api.getDailyStatus().then(setStatus).catch(() => {});
  }, []);

  useEffect(() => {
    if (!status || status.canClaim || !status.nextClaimAt) return;
    const tick = () => setTimeLeft(Math.max(0, status.nextClaimAt - Date.now()));
    tick();
    const id = setInterval(tick, 10000);
    return () => clearInterval(id);
  }, [status]);

  const handleClaim = async () => {
    if (claiming) return;
    setClaiming(true);
    try {
      const res = await api.claimDaily();
      setResult(res as { prize: Prize; newBalance: number; day: number });
      onBalanceUpdate(res.newBalance);
      if (res.prize.rarity === 'gold') {
        confetti({ particleCount: 150, spread: 100, origin: { y: 0.5 }, colors: ['#ffd700','#ffaa00','#ff8800','#e8c06a'], zIndex: 9999 });
        setTimeout(() => confetti({ particleCount: 80, spread: 70, origin: { y: 0.4 }, colors: ['#ffd700','#fff'], zIndex: 9999 }), 400);
      } else {
        confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 }, zIndex: 9999 });
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Ошибка');
    } finally {
      setClaiming(false);
    }
  };

  return (
    <>
      <div className="daily-section-header" style={{ marginTop: 4 }}>
        <span className="daily-section-title">Ежедневная награда</span>
      </div>
      <div className="daily-cal-grid">
        {DAILY_REWARDS.map(reward => {
          const claimed = status ? status.claimedDays[reward.day - 1] : false;
          const current = status ? status.currentDay === reward.day : false;
          let cls = 'daily-cal-day';
          if (claimed) cls += ' daily-cal-day--claimed';
          else if (current) cls += ' daily-cal-day--current';

          return (
            <div key={reward.day} className={cls}>
              <div className="daily-cal-num">День {reward.day}</div>
              {claimed
                ? <div className="daily-cal-check">✓</div>
                : <div className="daily-cal-icon" style={{ color: reward.color }}>
                    {reward.type === 'gift' ? '🎁' : '⭐'}
                  </div>}
              <div className="daily-cal-label">{reward.label}</div>
            </div>
          );
        })}
      </div>

      {status?.canClaim ? (
        <button className="tg-btn daily-claim-btn" onClick={handleClaim} disabled={claiming}>
          {claiming ? 'Забираем…' : '🎁 Забрать подарок дня'}
        </button>
      ) : timeLeft > 0 ? (
        <div className="daily-countdown-row">
          <span className="daily-countdown-label">Следующий подарок через</span>
          <span className="daily-countdown-time num">{fmtCountdown(timeLeft)}</span>
        </div>
      ) : (
        <div className="daily-countdown-row">Загрузка…</div>
      )}

      {/* Claim result modal */}
      <ResultModal prize={result?.prize ?? null} onClose={() => setResult(null)} />
    </>
  );
}

// ── Main tab ────────────────────────────────────────────────────────────────────
export function DailyTab({ prizes, cases, onBalanceUpdate, onGoToFreeCase }: Props) {
  const freeCase = cases.find(c => c.isFree);

  return (
    <div className="daily-tab">
      {/* 1. Free case banner */}
      <FreeCaseBanner freeCase={freeCase} onOpen={onGoToFreeCase} />

      {/* 2. Daily calendar */}
      <DailyCalendar onBalanceUpdate={onBalanceUpdate} />

      {/* 3. Prizes showcase */}
      <PrizesShowcase prizes={prizes} />
    </div>
  );
}
