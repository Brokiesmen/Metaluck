import { useState, useEffect } from 'react';
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
    
    // Simulate opening animation
    setTimeout(() => {
      // Pick a random prize (weighted towards lower tiers for demo)
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
      
      const possiblePrizes = caseData.prizes.filter(p => p.rarity === selectedRarity);
      const selectedPrize = possiblePrizes[Math.floor(Math.random() * possiblePrizes.length)] 
        || caseData.prizes[0];
      
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
    <div className="proto-modal-overlay" onClick={phase === 'preview' ? handleClose : undefined}>
      <div className="proto-modal" onClick={(e) => e.stopPropagation()}>
        {phase === 'preview' && (
          <PreviewPhase caseData={caseData} onOpen={handleOpen} onClose={handleClose} />
        )}
        {phase === 'opening' && (
          <OpeningPhase caseData={caseData} />
        )}
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
  onClose 
}: { 
  caseData: ProtoCase; 
  onOpen: () => void; 
  onClose: () => void;
}) {
  return (
    <>
      <div className="proto-modal-header">
        <h2 className="proto-modal-title">{caseData.name} кейс</h2>
        <p className="proto-modal-sub">Возможные призы</p>
      </div>

      {/* Case preview */}
      <div className="proto-case-reveal">
        <div className="proto-case-box">
          <div className="proto-case-box-glow" style={{ '--c-glow': caseData.accent } as React.CSSProperties} />
          <span className="proto-case-box-icon">{caseData.icon}</span>
        </div>
      </div>

      {/* Possible prizes */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(2, 1fr)', 
          gap: '8px',
          marginBottom: '16px',
        }}>
          {caseData.prizes.map((prize) => (
            <div 
              key={prize.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 12px',
                background: 'var(--c-surface-2)',
                borderRadius: '8px',
                borderLeft: `3px solid ${getRarityColor(prize.rarity)}`,
              }}
            >
              <span style={{ fontSize: '18px' }}>{prize.icon}</span>
              <div>
                <div style={{ fontWeight: 700, fontSize: '14px' }}>
                  {prize.value.toLocaleString('ru-RU')} ★
                </div>
                <div style={{ 
                  fontSize: '10px', 
                  color: getRarityColor(prize.rarity),
                  textTransform: 'uppercase',
                  fontWeight: 600,
                }}>
                  {getRarityLabel(prize.rarity)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <button 
        type="button" 
        className="proto-btn proto-btn--gold proto-btn--full proto-btn--lg"
        onClick={onOpen}
      >
        {caseData.price === 0 ? (
          'Открыть бесплатно'
        ) : (
          <>Открыть за {caseData.price.toLocaleString('ru-RU')} ★</>
        )}
      </button>
      <button 
        type="button"
        className="proto-btn proto-btn--full"
        style={{ marginTop: '10px' }}
        onClick={onClose}
      >
        Отмена
      </button>
    </>
  );
}

function OpeningPhase({ caseData }: { caseData: ProtoCase }) {
  return (
    <>
      <div className="proto-modal-header">
        <h2 className="proto-modal-title">Открываем...</h2>
        <p className="proto-modal-sub">Удачи!</p>
      </div>

      <div className="proto-case-reveal">
        <div className="proto-case-box proto-case-box--opening">
          <div className="proto-case-box-glow" style={{ '--c-glow': caseData.accent } as React.CSSProperties} />
          <span className="proto-case-box-icon">{caseData.icon}</span>
        </div>
      </div>

      <div style={{ textAlign: 'center', color: 'var(--c-muted)', fontSize: '14px' }}>
        Подождите...
      </div>
    </>
  );
}

function RevealPhase({ 
  prize, 
  onClose, 
  onTryAgain 
}: { 
  prize: ProtoPrize; 
  onClose: () => void; 
  onTryAgain: () => void;
}) {
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    setShowConfetti(true);
    const timer = setTimeout(() => setShowConfetti(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      <div className="proto-modal-header">
        <h2 className="proto-modal-title" style={{ color: getRarityColor(prize.rarity) }}>
          {getRarityLabel(prize.rarity).toUpperCase()}!
        </h2>
        <p className="proto-modal-sub">Вы выиграли</p>
      </div>

      <div className="proto-prize-reveal">
        <div className="proto-prize-icon">{prize.icon}</div>
        <div className="proto-prize-name">{prize.name}</div>
        <div className="proto-prize-value">
          +{prize.value.toLocaleString('ru-RU')} <span className="proto-star">★</span>
        </div>
      </div>

      {/* Confetti effect (simple CSS version) */}
      {showConfetti && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          pointerEvents: 'none',
          overflow: 'hidden',
        }}>
          {Array.from({ length: 20 }).map((_, i) => (
            <div
              key={i}
              style={{
                position: 'absolute',
                top: '-10%',
                left: `${Math.random() * 100}%`,
                width: '8px',
                height: '8px',
                background: ['#ffd700', '#ff6b35', '#8b5cf6', '#22c55e'][i % 4],
                borderRadius: '2px',
                animation: `confetti-fall ${1.5 + Math.random() * 1}s ease-out forwards`,
                animationDelay: `${Math.random() * 0.5}s`,
              }}
            />
          ))}
        </div>
      )}

      <style>{`
        @keyframes confetti-fall {
          to {
            transform: translateY(400px) rotate(720deg);
            opacity: 0;
          }
        }
      `}</style>

      {/* Actions */}
      <button 
        type="button" 
        className="proto-btn proto-btn--gold proto-btn--full proto-btn--lg"
        onClick={onTryAgain}
        style={{ marginTop: '24px' }}
      >
        Открыть ещё
      </button>
      <button 
        type="button"
        className="proto-btn proto-btn--full"
        style={{ marginTop: '10px' }}
        onClick={onClose}
      >
        Забрать
      </button>
    </>
  );
}

function getRarityColor(rarity: ProtoPrize['rarity']): string {
  switch (rarity) {
    case 'common': return '#9ca3af';
    case 'rare': return '#3b82f6';
    case 'epic': return '#a855f7';
    case 'legendary': return '#ffd700';
    default: return '#9ca3af';
  }
}

function getRarityLabel(rarity: ProtoPrize['rarity']): string {
  switch (rarity) {
    case 'common': return 'Обычный';
    case 'rare': return 'Редкий';
    case 'epic': return 'Эпический';
    case 'legendary': return 'Легендарный';
    default: return 'Обычный';
  }
}
