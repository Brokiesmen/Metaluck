import { useSettings } from '../settings/SettingsContext';
import { DemoModeSwitch } from './DemoModeSwitch';

interface Props {
  isDemo: boolean;
  onToggleDemo: (on: boolean) => void;
  onOpenCases: () => void;
  onOpenBlackjack: () => void;
  onOpenCoinflip: () => void;
  onOpenMineRush: () => void;
  onOpenArena: () => void;
  onOpenAviator: () => void;
}

export function GamesScreen({
  isDemo,
  onToggleDemo,
  onOpenCases,
  onOpenBlackjack,
  onOpenCoinflip,
  onOpenMineRush,
  onOpenArena,
  onOpenAviator,
}: Props) {
  const { t } = useSettings();

  return (
    <section className="games-lobby">
      <DemoModeSwitch isDemo={isDemo} onChange={onToggleDemo} />

      <div className="games-lobby-grid">
        <button type="button" className="game-tile game-tile--cases" onClick={onOpenCases}>
          <div className="game-tile-glow" aria-hidden />
          <div className="game-tile-icon" aria-hidden>
            <span className="cases-lobby-gift">🎁</span>
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
            <span className="mr-lobby-bomb">💣</span>
          </div>
          <div className="game-tile-body">
            <h2 className="game-tile-title">{t.games.mrTitle}</h2>
            <p className="game-tile-subtitle">{t.games.mrSub}</p>
          </div>
        </button>

        <button type="button" className="game-tile game-tile--arena" onClick={onOpenArena}>
          <div className="game-tile-glow game-tile-glow--arena" aria-hidden />
          <div className="game-tile-icon game-tile-icon--arena" aria-hidden>
            <span className="ar-lobby-target">🎯</span>
          </div>
          <div className="game-tile-body">
            <h2 className="game-tile-title">{t.games.arenaTitle}</h2>
            <p className="game-tile-subtitle">{t.games.arenaSub}</p>
          </div>
        </button>

        <button type="button" className="game-tile game-tile--aviator" onClick={onOpenAviator}>
          <div className="game-tile-glow game-tile-glow--aviator" aria-hidden />
          <div className="game-tile-icon game-tile-icon--aviator" aria-hidden>
            <span className="av-lobby-plane">✈️</span>
          </div>
          <div className="game-tile-body">
            <h2 className="game-tile-title">{t.games.avTitle}</h2>
            <p className="game-tile-subtitle">{t.games.avSub}</p>
          </div>
        </button>
      </div>
    </section>
  );
}
