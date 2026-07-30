interface Props {
  onOpenCases: () => void;
  onOpenBlackjack: () => void;
  onOpenCoinflip: () => void;
  onOpenMineRush: () => void;
  onOpenArena: () => void;
}

export function GamesScreen({ onOpenCases, onOpenBlackjack, onOpenCoinflip, onOpenMineRush, onOpenArena }: Props) {
  return (
    <section className="games-lobby">
      <div className="games-lobby-grid">
        <button type="button" className="game-tile game-tile--cases" onClick={onOpenCases}>
          <div className="game-tile-glow" aria-hidden />
          <div className="game-tile-icon" aria-hidden>
            🎁
          </div>
          <div className="game-tile-body">
            <h2 className="game-tile-title">Кейсы</h2>
            <p className="game-tile-subtitle">Испытай удачу и выиграй призы Fragment</p>
          </div>
        </button>

        <button type="button" className="game-tile game-tile--bj" onClick={onOpenBlackjack}>
          <div className="game-tile-glow game-tile-glow--bj" aria-hidden />
          <div className="game-tile-icon game-tile-icon--bj" aria-hidden>
            <span className="bj-lobby-joker">🃏</span>
          </div>
          <div className="game-tile-body">
            <h2 className="game-tile-title">Блэкджек</h2>
            <p className="game-tile-subtitle">Классическая игра против дилера. Удвой свои звёзды!</p>
          </div>
        </button>

        <button type="button" className="game-tile game-tile--coin" onClick={onOpenCoinflip}>
          <div className="game-tile-glow game-tile-glow--coin" aria-hidden />
          <div className="game-tile-icon game-tile-icon--coin" aria-hidden>
            <span className="coin-lobby-spin">🪙</span>
          </div>
          <div className="game-tile-body">
            <h2 className="game-tile-title">Орёл или решка</h2>
            <p className="game-tile-subtitle">Угадай сторону монеты и удвой ставку!</p>
          </div>
        </button>

        <button type="button" className="game-tile game-tile--minerush" onClick={onOpenMineRush}>
          <div className="game-tile-glow game-tile-glow--mr" aria-hidden />
          <div className="game-tile-icon game-tile-icon--mr" aria-hidden>
            💣
          </div>
          <div className="game-tile-body">
            <h2 className="game-tile-title">MineRush</h2>
            <p className="game-tile-subtitle">Сапёр на звёзды — открой поле и забери выигрыш!</p>
          </div>
        </button>

        <button type="button" className="game-tile game-tile--arena" onClick={onOpenArena}>
          <div className="game-tile-glow game-tile-glow--arena" aria-hidden />
          <div className="game-tile-icon game-tile-icon--arena" aria-hidden>
            🎯
          </div>
          <div className="game-tile-body">
            <h2 className="game-tile-title">Арена</h2>
            <p className="game-tile-subtitle">Общий банк: чем больше ставка — тем больше шанс забрать всё!</p>
          </div>
        </button>
      </div>

      <div className="game-tile game-tile--soon" aria-disabled="true">
        <div className="game-tile-soon-title">Скоро...</div>
        <div className="game-tile-soon-subtitle">PvP турнир и командные челленджи</div>
      </div>

      <div className="game-tile game-tile--soon" aria-disabled="true">
        <div className="game-tile-soon-title">Coming Soon</div>
        <div className="game-tile-soon-subtitle">Аркада и быстрые мини-игры</div>
      </div>
    </section>
  );
}
