import { useEffect, useRef } from 'react';
import { GameManager } from '../core/GameManager';
import type { GameId } from '../core/types';
import { DEFAULT_GAME_HEIGHT, DEFAULT_GAME_WIDTH } from '../core/GameConfig';
import './phaser-host.css';

export interface PhaserGameHostProps {
  gameId: GameId;
  balance: number;
  bet?: number;
  onBack: () => void;
  onBalanceUpdate: (balance: number) => void;
  backLabel?: string;
}

/**
 * React bridge: mounts a Phaser game via GameManager into a full-bleed container.
 * Destroys the engine on unmount / gameId change.
 */
export function PhaserGameHost({
  gameId,
  balance,
  bet = 10,
  onBack,
  onBalanceUpdate,
  backLabel = '← Games',
}: PhaserGameHostProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const balanceRef = useRef(balance);
  const onBalanceRef = useRef(onBalanceUpdate);
  balanceRef.current = balance;
  onBalanceRef.current = onBalanceUpdate;

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;

    const manager = GameManager.getInstance();
    let cancelled = false;

    void manager
      .load(gameId, {
        parent: el,
        bet,
        balance: balanceRef.current,
        width: DEFAULT_GAME_WIDTH,
        height: DEFAULT_GAME_HEIGHT,
        callbacks: {
          onBalance: (next) => {
            if (!cancelled) onBalanceRef.current(next);
          },
          onWin: (outcome) => {
            // Prefer absolute balance from onBalance; fallback arithmetic.
            if (!cancelled && outcome.payout > 0) {
              /* balance already pushed via onBalance when RoundSource settles */
            }
          },
          onLose: () => {
            /* balance already pushed via onBalance */
          },
          onError: (err) => {
            console.error(`[PhaserGameHost:${gameId}]`, err);
          },
        },
      })
      .catch((err) => {
        if (!cancelled) console.error(`[PhaserGameHost:${gameId}] load failed`, err);
      });

    return () => {
      cancelled = true;
      manager.destroy();
    };
    // Reload only when switching game — not on every TopBar balance tick.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameId, bet]);

  return (
    <div className="phaser-game-host">
      <button type="button" className="phaser-game-back" onClick={onBack}>
        {backLabel}
      </button>
      <div ref={rootRef} className="phaser-game-canvas" />
    </div>
  );
}
