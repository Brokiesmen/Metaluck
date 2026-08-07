import { GameManager } from '../core/GameManager';

/**
 * Standalone Aviator launch (does not touch the React shell).
 * Open: /src/games/aviator/index.html
 */
const root = document.getElementById('game-root');
if (!root) {
  throw new Error('[games/aviator] #game-root not found');
}

const manager = GameManager.getInstance();

void manager.load('aviator', {
  parent: root,
  bet: 10,
  balance: 1000,
  width: 390,
  height: 700,
  callbacks: {
    onReady: () => console.info('[aviator] ready'),
    onWin: (o) => console.info('[aviator] win', o),
    onLose: (o) => console.info('[aviator] lose', o),
    onError: (e) => console.error('[aviator] error', e),
  },
});

const teardown = () => manager.destroy();
window.addEventListener('pagehide', teardown);
window.addEventListener('beforeunload', teardown);
