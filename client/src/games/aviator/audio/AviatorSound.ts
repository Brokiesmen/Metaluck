import { SoundManager } from '../../core/SoundManager';

export type AviatorSfx =
  | 'click'
  | 'bet'
  | 'cashout'
  | 'countdown'
  | 'milestone'
  | 'crash'
  | 'win';

/** Aviator cues → the shared procedural WebAudio bank. */
const SFX_MAP: Record<AviatorSfx, Parameters<SoundManager['play']>[0]> = {
  click: 'click',
  bet: 'whoosh',
  cashout: 'cashout',
  countdown: 'tick',
  milestone: 'tick',
  crash: 'crash',
  win: 'win',
};

const MILESTONES = [2, 3, 5, 10, 20, 50];

/**
 * Aviator's audio vocabulary on top of the module-wide SoundManager.
 * No extra dependency and one shared mute state across every minigame.
 */
export class AviatorSound {
  private manager = SoundManager.getInstance();
  private lastMilestone = 1;
  private flying = false;

  unlock(): void {
    this.manager.unlock();
  }

  isEnabled(): boolean {
    return !this.manager.isMuted();
  }

  setEnabled(enabled: boolean): void {
    this.manager.setMuted(!enabled);
    if (!enabled) this.stopFlight();
    else if (this.flying) this.manager.startEngine();
  }

  play(key: AviatorSfx): void {
    this.manager.play(SFX_MAP[key]);
  }

  startFlight(): void {
    this.flying = true;
    this.lastMilestone = 1;
    this.manager.startEngine();
  }

  stopFlight(): void {
    this.flying = false;
    this.manager.stopEngine();
  }

  /** Chime once per multiplier milestone crossed during a flight. */
  onMultiplier(mult: number): void {
    for (const m of MILESTONES) {
      if (this.lastMilestone < m && mult >= m) {
        this.play('milestone');
        this.lastMilestone = m;
      }
    }
  }

  destroy(): void {
    this.stopFlight();
  }
}
