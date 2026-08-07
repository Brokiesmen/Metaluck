import type Phaser from 'phaser';
import { BaseGame } from '../core/BaseGame';
import type { GameId } from '../core/types';
import { SandboxScene } from './SandboxScene';

/** Minimal Phaser game used to validate the module architecture. */
export class SandboxGame extends BaseGame {
  readonly name: GameId = 'sandbox';

  protected getSceneClasses(): Phaser.Types.Scenes.SceneType[] {
    return [SandboxScene];
  }
}
