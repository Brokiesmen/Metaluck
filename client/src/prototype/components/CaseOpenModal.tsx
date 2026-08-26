import { useState } from 'react';
import type { ProtoCase, ProtoPrize } from '../data';

interface Props {
  caseData: ProtoCase;
  onClose: () => void;
}

type Phase = 'preview' | 'opening' | 'reveal';

export function CaseOpenModal({ caseData, onClose }: Props) {
  const [phase, setPhase] = useState<Phase>('preview');
  const [prize, setPrize] = useState<ProtoPrize | null>(null);

  const handleOpen = () => {
    setPhase('opening');

    setTimeout(() => {
      const weights = { common: 50, rare: 30, epic: 15, legendary: 5 };
      const roll = Math.random() * 100;
      let cumulative = 0;
      let selectedRarity: ProtoPrize['rarity'] = 'common';

      for (const [rarity, weight] of Object.entries(weights)) {
        cumulative += weight;
        if (roll < cumulative) {
          selectedRarity = rarity as ProtoPrize['rarity'];
          break;
        }
      }

      const possiblePrizes = caseData.prizes.filter((p) => p.rarity === selectedRarity);
      const selectedPrize =
        possiblePrizes[Math.floor(Math.random() * possiblePrizes.length)] ||
        caseData.prizes[0];

      setPrize(selectedPrize);
      setPhase('reveal');
    }, 2000);
  };

  const handleClose = () => {
    setPhase('preview');
    setPrize(null);
    onClose();
  };

  const handleTryAgain = () => {
    setPhase('preview');
    setPrize(null);
  };

  return (
    <div
      className="proto-modal-backdrop"
      onClick={phase === 'preview' ? handleClose : undefined}
    >
      <div className="proto-modal" onClick={(e) => e.stopPropagation()}>
        {phase === 'preview' && (
          <PreviewPhase caseData={caseData} onOpen={handleOpen} onClose={handleClose} />
        )}
        {phase === 'opening' && <OpeningPhase caseData={caseData} />}
        {phase === 'reveal' && prize && (
          <RevealPhase prize={prize} onClose={handleClose} onTryAgain={handleTryAgain} />
        )}
      </div>
    </div>
  );
}

function PreviewPhase({
  caseData,
  onOpen,
  onClose,
}: {
  caseData: ProtoCase;
  onOpen: () => void;
  onClose: () => void;
}) {
  return (
    <>
      <div className="proto-modal-header">
        <h2 className="proto-modal-title">{caseData.name}</h2>
        <p className="proto-modal-desc">Возможные призы</p>
      </div>

      <div className="proto-modal-body">
        <div className="proto-case-preview">
          <span className="proto-case-preview-icon">{caseData.icon}</span>
        </div>

        <div className="proto-prizes-grid">
          {caseData.prizes.map((prize) => (
            <div key={prize.id} className="proto-prize-item">
              <span className="proto-prize-item-icon">{prize.icon}</span>
              <span className="proto-prize-item-value">
                {prize.value.toLocaleString('ru-RU')} ★
              </span>
              <span
                className={`proto-prize-item-rarity proto-prize-item-rarity--${prize.rarity}`}
              >
                {getRarityLabel(prize.rarity)}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="proto-modal-actions">
        <button type="button" className="proto-btn proto-btn--gold proto-btn--full" onClick={onOpen}>
          {caseData.price === 0
            ? 'Открыть бесплатно'
            : `Открыть за ${caseData.price.toLocaleString('ru-RU')} ★`}
        </button>
        <button type="button" className="proto-btn proto-btn--full" onClick={onClose}>
          Отмена
        </button>
      </div>
    </>
  );
}

function OpeningPhase({ caseData }: { caseData: ProtoCase }) {
  return (
    <>
      <div className="proto-modal-header">
        <h2 className="proto-modal-title">Открываем...</h2>
        <p className="proto-modal-desc">Удачи!</p>
      </div>

      <div className="proto-modal-body">
        <div className="proto-case-preview proto-case-preview--opening">
          <span className="proto-case-preview-icon">{caseData.icon}</span>
        </div>
      </div>
    </>
  );
}

function RevealPhase({
  prize,
  onClose,
  onTryAgain,
}: {
  prize: ProtoPrize;
  onClose: () => void;
  onTryAgain: () => void;
}) {
  return (
    <>
      <div className="proto-modal-header">
        <h2 className="proto-modal-title">Выигрыш!</h2>
        <p className="proto-modal-desc">Вы получили</p>
      </div>

      <div className="proto-modal-body">
        <div className="proto-prize-reveal">
          <span className="proto-prize-reveal-icon">{prize.icon}</span>
          <div className="proto-prize-reveal-label">{prize.name}</div>
          <div className="proto-prize-reveal-value">
            +{prize.value.toLocaleString('ru-RU')} <span className="star">★</span>
          </div>
          <div
            className="proto-prize-reveal-rarity"
            style={{ color: getRarityColor(prize.rarity) }}
          >
            {getRarityLabel(prize.rarity)}
          </div>
        </div>
      </div>

      <div className="proto-modal-actions">
        <button
          type="button"
          className="proto-btn proto-btn--gold proto-btn--full"
          onClick={onTryAgain}
        >
          Открыть ещё
        </button>
        <button type="button" className="proto-btn proto-btn--full" onClick={onClose}>
          Забрать
        </button>
      </div>
    </>
  );
}

function getRarityColor(rarity: ProtoPrize['rarity']): string {
  switch (rarity) {
    case 'common':
      return '#888888';
    case 'rare':
      return '#3498db';
    case 'epic':
      return '#9b59b6';
    case 'legendary':
      return '#d4af37';
    default:
      return '#888888';
  }
}

function getRarityLabel(rarity: ProtoPrize['rarity']): string {
  switch (rarity) {
    case 'common':
      return 'Обычный';
    case 'rare':
      return 'Редкий';
    case 'epic':
      return 'Эпический';
    case 'legendary':
      return 'Легендарный';
    default:
      return 'Обычный';
  }
}
