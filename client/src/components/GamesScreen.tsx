interface Props {
  onOpenCases: () => void;
  onOpenBlackjack: () => void;
}

export function GamesScreen({ onOpenCases, onOpenBlackjack }: Props) {
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
