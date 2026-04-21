import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../api';
import type { Case, Prize } from '../types';
import { StripOpener } from './StripOpener';
import { CaseGrid } from './CaseGrid';
import { PrizesGrid } from './PrizesGrid';
import { ResultModal } from './ResultModal';

interface Props {
  cases: Case[];
  prizes: Prize[];
  onBack: () => void;
  onBalanceUpdate: (balance: number) => void;
  onCasesReload: () => void;
  forceSelectFreeSignal: number;
}

/** Оценка приза — чем выше, тем круче. */
function prizeScore(p: Prize): number {
  if (p.isPremium) {
    if (p.name.includes('год'))    return 100_000;
    if (p.name.includes('3'))      return  50_000;
    return 10_000;
  }
  if (p.stars) return p.stars; // 25 / 50 / 100 / 500 / 1000
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
}: Props) {
  const [selectedCase, setSelectedCase] = useState<Case | null>(null);
  const [winner, setWinner] = useState<Prize | null>(null);
  const [resultPrize, setResultPrize] = useState<Prize | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [previewKey, setPreviewKey] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const freeCase = useMemo(() => cases.find(c => c.isFree) ?? null, [cases]);

  /** Топ-3 приза по ценности — только они крутятся в рулетке и показываются в витрине */
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

  const handleOpen = useCallback(async () => {
    if (!selectedCase || isAnimating) return;
    setError(null);
    setIsAnimating(true);
    setWinner(null);

    try {
      const { prize, newBalance } = await api.openCase(selectedCase.id);
      onBalanceUpdate(newBalance);
      setWinner(prize);
      onCasesReload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка сервера');
      setIsAnimating(false);
    }
  }, [isAnimating, onBalanceUpdate, onCasesReload, selectedCase]);

  const handleDone = useCallback((prize: Prize) => {
    setIsAnimating(false);
    setWinner(null);
    setResultPrize(prize);
  }, []);

  const handleCloseResult = useCallback(() => {
    setResultPrize(null);
    setPreviewKey(v => v + 1);
  }, []);

  return (
    <div className="case-game">
      <button type="button" className="case-game-back" onClick={onBack}>
        ← Назад к играм
      </button>

      {error && <div className="error-banner">{error}</div>}

      <StripOpener
        selectedCase={selectedCase}
        prizes={prizes}
        winner={winner}
        previewKey={previewKey}
        isAnimating={isAnimating}
        onOpen={handleOpen}
        onDone={handleDone}
      />
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
