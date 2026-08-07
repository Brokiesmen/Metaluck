import type Phaser from 'phaser';
import { BaseGame } from '../core/BaseGame';
import type { GameId } from '../core/types';
import { BootScene } from './BootScene';
import { GameScene } from './GameScene';

/**
 * Commercial-grade Aviator (crash) — reference quality for the Phaser games module.
 */
export class AviatorGame extends BaseGame {
  readonly name: GameId = 'aviator';

  protected getSceneClasses(): Phaser.Types.Scenes.SceneType[] {
    return [BootScene, GameScene];
  }
}
