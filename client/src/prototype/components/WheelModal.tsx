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
  if (segments.length === 0) return '#1a1a1a';
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

    const targetIndex = Math.floor(Math.random() * segments.length);
    const step = 360 / segments.length;
    const targetAngle = targetIndex * step + step / 2;

    const extraTurns = 5 + Math.floor(Math.random() * 3);
    const current = ((rotation % 360) + 360) % 360;
    const desired = (((360 - targetAngle) % 360) + 360) % 360;
    let delta = ((desired - current + 360) % 360);
    if (delta < 45) delta += 360;

    const newRotation = rotation + extraTurns * 360 + delta;
    setRotation(newRotation);

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

  const isLoss = result?.label.includes('💀');

  return (
    <div className="proto-modal-backdrop" onClick={handleClose}>
      <div className="proto-modal" onClick={(e) => e.stopPropagation()}>
        <div className="proto-modal-header">
          <h2 className="proto-modal-title">Колесо удачи</h2>
          <p className="proto-modal-desc">
            {result ? 'Результат' : 'Крутите и выигрывайте'}
          </p>
        </div>

        <div className="proto-modal-body">
          <div className="proto-wheel-container">
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
                      className="proto-wheel-label"
                      style={{
                        transform: `rotate(${angle}deg) translateY(-85px)`,
                        transformOrigin: '0 0',
                      }}
                    >
                      {seg.label}
                    </span>
                  );
                })}
              </div>
              <div className="proto-wheel-center">★</div>
            </div>

            {result && (
              <div className="proto-wheel-result">
                <div className="proto-wheel-result-icon">{isLoss ? '💀' : '🎉'}</div>
                <div
                  className={`proto-wheel-result-text ${
                    isLoss ? 'proto-wheel-result-text--lose' : 'proto-wheel-result-text--win'
                  }`}
                >
                  {isLoss ? 'Пусто!' : result.label}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="proto-modal-actions">
          {!result ? (
            <>
              <button
                type="button"
                className="proto-btn proto-btn--gold proto-btn--full"
                onClick={handleSpin}
                disabled={spinning}
              >
                {spinning ? 'Крутится...' : 'Крутить бесплатно'}
              </button>
              <button
                type="button"
                className="proto-btn proto-btn--full"
                onClick={handleClose}
                disabled={spinning}
              >
                Закрыть
              </button>
            </>
          ) : (
            <button
              type="button"
              className="proto-btn proto-btn--gold proto-btn--full"
              onClick={handleClose}
            >
              Забрать
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
