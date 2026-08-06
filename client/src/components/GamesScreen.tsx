import { useSettings } from '../settings/SettingsContext';

interface Props {
  isDemo: boolean;
  onToggleDemo: () => void;
  onOpenCases: () => void;
  onOpenBlackjack: () => void;
  onOpenCoinflip: () => void;
  onOpenMineRush: () => void;
  onOpenArena: () => void;
}

export function GamesScreen({
  isDemo,
  onToggleDemo,
  onOpenCases,
  onOpenBlackjack,
  onOpenCoinflip,
  onOpenMineRush,
  onOpenArena,
}: Props) {
  const { t } = useSettings();

  return (
    <section className="games-lobby">
      <div className="demo-toggle-row">
        <button
          type="button"
          className={`demo-toggle-btn${isDemo ? ' demo-toggle-btn--on' : ''}`}
          onClick={onToggleDemo}
          aria-pressed={isDemo}
        >
          {isDemo ? t.demo.disable : t.demo.enable}
        </button>
        <p className="demo-toggle-hint">{t.demo.hint}</p>
      </div>

      <div className="games-lobby-grid">
        <button type="button" className="game-tile game-tile--cases" onClick={onOpenCases}>
          <div className="game-tile-glow" aria-hidden />
          <div className="game-tile-icon" aria-hidden>
            🎁
          </div>
          <div className="game-tile-body">
            <h2 className="game-tile-title">{t.games.casesTitle}</h2>
            <p className="game-tile-subtitle">{t.games.casesSub}</p>
          </div>
        </button>

        <button type="button" className="game-tile game-tile--bj" onClick={onOpenBlackjack}>
          <div className="game-tile-glow game-tile-glow--bj" aria-hidden />
          <div className="game-tile-icon game-tile-icon--bj" aria-hidden>
            <span className="bj-lobby-joker">🃏</span>
          </div>
          <div className="game-tile-body">
            <h2 className="game-tile-title">{t.games.bjTitle}</h2>
            <p className="game-tile-subtitle">{t.games.bjSub}</p>
          </div>
        </button>

        <button type="button" className="game-tile game-tile--coin" onClick={onOpenCoinflip}>
          <div className="game-tile-glow game-tile-glow--coin" aria-hidden />
          <div className="game-tile-icon game-tile-icon--coin" aria-hidden>
            <span className="coin-lobby-spin">🪙</span>
          </div>
          <div className="game-tile-body">
            <h2 className="game-tile-title">{t.games.coinTitle}</h2>
            <p className="game-tile-subtitle">{t.games.coinSub}</p>
          </div>
        </button>

        <button type="button" className="game-tile game-tile--minerush" onClick={onOpenMineRush}>
          <div className="game-tile-glow game-tile-glow--mr" aria-hidden />
          <div className="game-tile-icon game-tile-icon--mr" aria-hidden>
            💣
          </div>
          <div className="game-tile-body">
            <h2 className="game-tile-title">{t.games.mrTitle}</h2>
            <p className="game-tile-subtitle">{t.games.mrSub}</p>
          </div>
        </button>

        <button type="button" className="game-tile game-tile--arena" onClick={onOpenArena}>
          <div className="game-tile-glow game-tile-glow--arena" aria-hidden />
          <div className="game-tile-icon game-tile-icon--arena" aria-hidden>
            🎯
          </div>
          <div className="game-tile-body">
            <h2 className="game-tile-title">{t.games.arenaTitle}</h2>
            <p className="game-tile-subtitle">{t.games.arenaSub}</p>
          </div>
        </button>

        <div className="game-tile game-tile--soon" aria-disabled="true">
          <div className="game-tile-body">
            <div className="game-tile-soon-title">{t.games.soon}</div>
            <div className="game-tile-soon-subtitle">{t.games.soonPvp}</div>
          </div>
        </div>

        <div className="game-tile game-tile--soon" aria-disabled="true">
          <div className="game-tile-body">
            <div className="game-tile-soon-title">{t.games.soonArcadeTitle}</div>
            <div className="game-tile-soon-subtitle">{t.games.soonArcadeSub}</div>
          </div>
        </div>
      </div>
    </section>
  );
}
