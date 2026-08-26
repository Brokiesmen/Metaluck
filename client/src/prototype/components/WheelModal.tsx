import { useState } from 'react';

interface WheelSegment {
  id: number;
  label: string;
  color: string;
}

interface Props {
  segments: WheelSegment[];
  onClose: () => void;
}

function wheelGradient(segments: WheelSegment[]): string {
  if (segments.length === 0) return '#232e3c';
  const step = 100 / segments.length;
  const parts = segments.map((s, i) => {
    const a = (i * step).toFixed(2);
    const b = ((i + 1) * step).toFixed(2);
    return `${s.color} ${a}% ${b}%`;
  });
  return `conic-gradient(from -90deg, ${parts.join(', ')})`;
}

export function WheelModal({ segments, onClose }: Props) {
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [result, setResult] = useState<WheelSegment | null>(null);

  const handleSpin = () => {
    if (spinning) return;
    
    setSpinning(true);
    setResult(null);
    
    // Pick a random segment
    const targetIndex = Math.floor(Math.random() * segments.length);
    const step = 360 / segments.length;
    const targetAngle = targetIndex * step + step / 2;
    
    // Calculate new rotation (5+ full spins + land on target)
    const extraTurns = 5 + Math.floor(Math.random() * 3);
    const current = ((rotation % 360) + 360) % 360;
    const desired = ((360 - targetAngle) % 360 + 360) % 360;
    let delta = (desired - current + 360) % 360;
    if (delta < 45) delta += 360;
    
    const newRotation = rotation + extraTurns * 360 + delta;
    setRotation(newRotation);
    
    // Show result after animation
    setTimeout(() => {
      setSpinning(false);
      setResult(segments[targetIndex]);
    }, 4500);
  };

  const handleClose = () => {
    if (!spinning) {
      onClose();
    }
  };

  return (
    <div className="proto-modal-overlay" onClick={handleClose}>
      <div className="proto-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '380px' }}>
        <div className="proto-modal-header">
          <h2 className="proto-modal-title">Колесо удачи</h2>
          <p className="proto-modal-sub">
            {result ? 'Поздравляем!' : 'Крутите и выигрывайте призы'}
          </p>
        </div>

        {/* Wheel */}
        <div className="proto-wheel-stage">
          <div className="proto-wheel-pointer" />
          <div 
            className={`proto-wheel-disk${spinning ? ' proto-wheel-disk--spinning' : ''}`}
            style={{
              background: wheelGradient(segments),
              transform: `rotate(${rotation}deg)`,
            }}
          >
            {segments.map((seg, i) => {
              const step = 360 / segments.length;
              const angle = -90 + i * step + step / 2;
              return (
                <span
                  key={seg.id}
                  style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: `rotate(${angle}deg) translateY(-100px)`,
                    transformOrigin: '0 0',
                    fontWeight: 700,
                    fontSize: '13px',
                    color: '#fff',
                    textShadow: '0 1px 3px rgba(0,0,0,0.5)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {seg.label}
                </span>
              );
            })}
          </div>
          <div className="proto-wheel-center">★</div>
        </div>

        {/* Result */}
        {result && (
          <div style={{
            textAlign: 'center',
            padding: '16px',
            background: 'var(--c-surface-2)',
            borderRadius: 'var(--r)',
            marginBottom: '16px',
            animation: 'proto-prize-pop 0.5s ease',
          }}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>
              {result.label.includes('💀') ? '💀' : '🎉'}
            </div>
            <div style={{ 
              fontWeight: 800, 
              fontSize: '20px',
              color: result.label.includes('💀') ? 'var(--c-red)' : 'var(--c-gold)',
            }}>
              {result.label.includes('💀') ? 'Пусто!' : result.label}
            </div>
            {!result.label.includes('💀') && (
              <div style={{ color: 'var(--c-muted)', fontSize: '13px', marginTop: '4px' }}>
                Добавлено к балансу
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        {!result ? (
          <button 
            type="button" 
            className="proto-btn proto-btn--gold proto-btn--full proto-btn--lg"
            onClick={handleSpin}
            disabled={spinning}
          >
            {spinning ? 'Крутится...' : 'Крутить бесплатно'}
          </button>
        ) : (
          <button 
            type="button" 
            className="proto-btn proto-btn--gold proto-btn--full proto-btn--lg"
            onClick={handleClose}
          >
            Забрать
          </button>
        )}
        
        {!result && (
          <button 
            type="button"
            className="proto-btn proto-btn--full"
            style={{ marginTop: '10px' }}
            onClick={handleClose}
            disabled={spinning}
          >
            Закрыть
          </button>
        )}
      </div>
    </div>
  );
}
