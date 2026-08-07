import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../api';
import type { Case, Prize } from '../types';
import { useSettings } from '../settings/SettingsContext';
import { isDemoMode } from '../demo';
import { StripOpener } from './StripOpener';
import { CaseGrid } from './CaseGrid';
import { PrizesGrid } from './PrizesGrid';
import { ResultModal } from './ResultModal';
import { BetCurrencyPicker } from './BetCurrencyPicker';
import { DemoModeSwitch } from './DemoModeSwitch';
import { useWagerCurrency } from '../hooks/useWagerCurrency';

interface Props {
  cases: Case[];
  prizes: Prize[];
  onBack: () => void;
  onBalanceUpdate: (balance: number) => void;
  onCasesReload: () => void;
  forceSelectFreeSignal: number;
  isDemo: boolean;
  onToggleDemo: (on: boolean) => void;
}

/** Оценка приза — чем выше, тем круче. */
function prizeScore(p: Prize): number {
  if (p.isPremium) {
    if (p.name.includes('год'))    return 100_000;
    if (p.name.includes('3'))      return  50_000;
    return 10_000;
  }
  if (p.stars) return p.stars;
  const r: Record<string, number> = { gold: 800, purple: 400, blue: 200, gray: 50 };
  return r[p.rarity] ?? 0;
}

export function CaseGame({
  cases,
  prizes,
  onBack,
  onBalanceUpdate,
  onCasesReload,
  forceSelectFreeSignal,
  isDemo,
  onToggleDemo,
}: Props) {
  const { t } = useSettings();
  const { currency } = useWagerCurrency();
  const [selectedCase, setSelectedCase] = useState<Case | null>(null);
  const [winner, setWinner] = useState<Prize | null>(null);
  const [resultPrize, setResultPrize] = useState<Prize | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [previewKey, setPreviewKey] = useState(0);
  const [error, setError] = useState<string | null>(null);
  /** Баланс/кейсы обновляем ПОСЛЕ анимации — иначе App ререндерится в момент старта спина. */
  const pendingBalanceRef = useRef<number | null>(null);

  const freeCase = useMemo(() => cases.find(c => c.isFree) ?? null, [cases]);

  const topPrizes = useMemo(() => {
    if (!prizes.length) return prizes;
    return [...prizes]
      .sort((a, b) => prizeScore(b) - prizeScore(a))
      .slice(0, 3);
  }, [prizes]);

  useEffect(() => {
    if (selectedCase) {
      const stillExists = cases.some(c => c.id === selectedCase.id);
      if (!stillExists) setSelectedCase(freeCase ?? cases[0] ?? null);
      return;
    }
    setSelectedCase(freeCase ?? cases[0] ?? null);
  }, [cases, freeCase, selectedCase]);

  useEffect(() => {
    if (!cases.length) return;
    setSelectedCase(freeCase ?? cases[0] ?? null);
  }, [forceSelectFreeSignal, cases, freeCase]);

  const flushPendingBalance = useCallback(() => {
    if (pendingBalanceRef.current == null) return;
    const bal = pendingBalanceRef.current;
    pendingBalanceRef.current = null;
    onBalanceUpdate(bal);
    onCasesReload();
  }, [onBalanceUpdate, onCasesReload]);

  const handleOpen = useCallback(async () => {
    if (!selectedCase || isAnimating) return;
    setError(null);
    setIsAnimating(true);
    setWinner(null);
    pendingBalanceRef.current = null;

    try {
      const { prize, newBalance } = await api.openCase(selectedCase.id, currency);
      if (!isDemoMode()) pendingBalanceRef.current = newBalance;
      setWinner(prize);
    } catch (err) {
      pendingBalanceRef.current = null;
      setError(err instanceof Error ? err.message : t.cases.serverError);
      setIsAnimating(false);
    }
  }, [currency, isAnimating, selectedCase, t.cases.serverError]);

  const handleDone = useCallback((prize: Prize) => {
    setIsAnimating(false);
    setWinner(null);
    setResultPrize(prize);
    requestAnimationFrame(() => flushPendingBalance());
  }, [flushPendingBalance]);

  const handleCloseResult = useCallback(() => {
    setResultPrize(null);
    setPreviewKey(v => v + 1);
  }, []);

  return (
    <div className={`case-game${isAnimating ? ' case-game--spinning' : ''}`}>
      <button type="button" className="case-game-back" onClick={onBack}>
        {t.cases.backGames}
      </button>

      <DemoModeSwitch
        isDemo={isDemo}
        onChange={onToggleDemo}
        disabled={isAnimating}
      />

      {error && <div className="error-banner">{error}</div>}

      <StripOpener
        selectedCase={selectedCase}
        prizes={topPrizes.length ? topPrizes : prizes}
        winner={winner}
        previewKey={previewKey}
        isAnimating={isAnimating}
        onOpen={handleOpen}
        onDone={handleDone}
      />
      <div className="case-game-currency">
        <BetCurrencyPicker disabled={isAnimating} />
      </div>
      <CaseGrid
        cases={cases}
        selected={selectedCase}
        onSelect={setSelectedCase}
        disabled={isAnimating}
      />
      <PrizesGrid prizes={topPrizes} />

      <ResultModal prize={resultPrize} onClose={handleCloseResult} />
    </div>
  );
}
