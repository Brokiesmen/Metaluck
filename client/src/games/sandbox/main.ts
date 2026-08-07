import { GameManager } from '../core/GameManager';

/**
 * Standalone bootstrap for the Phaser sandbox.
 * Open via Vite: /src/games/sandbox/index.html
 */
const root = document.getElementById('game-root');
if (!root) {
  throw new Error('[games/sandbox] #game-root not found');
}

const manager = GameManager.getInstance();

void manager.load('sandbox', {
  parent: root,
  bet: 25,
  balance: 1000,
  width: 390,
  height: 700,
  callbacks: {
    onReady: () => console.info('[game/sandbox] ready'),
    onWin: (o) => console.info('[game/sandbox] win', o),
    onLose: (o) => console.info('[game/sandbox] lose', o),
    onError: (e) => console.error('[game/sandbox] error', e),
  },
});

const teardown = () => manager.destroy();
window.addEventListener('pagehide', teardown);
window.addEventListener('beforeunload', teardown);
