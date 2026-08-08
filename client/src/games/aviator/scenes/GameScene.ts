import Phaser from 'phaser';
import { AviatorConfig } from '../config/aviatorConfig';
import { Quality } from '../config/quality';
import { generateTextures, TEX } from '../textures';
import { Haptics } from '../../core/Haptics';
import type { GameTransport } from '../transport/GameTransport';
import type { ActiveBet, RoundSnapshot, TransportEvent } from '../transport/types';
import { RoundPhase } from '../transport/types';
import { RoundStateMachine } from '../engine/RoundStateMachine';
import { FlightCurve } from '../engine/FlightCurve';
import { Aircraft } from '../entities/Aircraft';
import { FlightPath } from '../entities/FlightPath';
import { MultiplierDisplay } from '../entities/MultiplierDisplay';
import { BackgroundLayers } from '../effects/BackgroundLayers';
import { CrashEffect, WinEffect, shakeCamera } from '../effects/CrashEffect';
import type { AviatorSound } from '../audio/AviatorSound';
import type { AviatorStrings } from '../strings';

export const AVIATOR_SCENE_KEY = 'AviatorScene';

export interface GameSceneData {
  transport: GameTransport;
  sound: AviatorSound;
  strings: AviatorStrings;
}

export class GameScene extends Phaser.Scene {
  private transport!: GameTransport;
  private soundMgr!: AviatorSound;
  private strings!: AviatorStrings;
  private unsub: (() => void) | null = null;
  private fsm = new RoundStateMachine();

  private curve!: FlightCurve;
  private aircraft!: Aircraft;
  private path!: FlightPath;
  private multiplier!: MultiplierDisplay;
  private background!: BackgroundLayers;
  private crashFx!: CrashEffect;
  private winFx!: WinEffect;

  private round: RoundSnapshot | null = null;
  private activeBet: ActiveBet | null = null;
  private lastCountdownSec = -1;
  private ambientDust: Phaser.GameObjects.Particles.ParticleEmitter | null = null;
  private resizeTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    super(AVIATOR_SCENE_KEY);
  }

  init(data: GameSceneData): void {
    this.transport = data.transport;
    this.soundMgr = data.sound;
    this.strings = data.strings;
  }

  create(): void {
    generateTextures(this);

    const w = this.scale.width;
    const h = this.scale.height;

    this.background = new BackgroundLayers(this);
    this.curve = new FlightCurve(w, h);
    this.path = new FlightPath(this, this.curve);
    this.aircraft = new Aircraft(this, this.curve);
    this.multiplier = new MultiplierDisplay(this, this.strings);
    this.crashFx = new CrashEffect(this);
    this.winFx = new WinEffect(this);

    if (Quality.ambientDust) {
      this.ambientDust = this.add.particles(0, 0, TEX.soft, {
        x: { min: 0, max: w },
        y: { min: 0, max: h },
        speedX: { min: -6, max: 6 },
        speedY: { min: -10, max: -2 },
        scale: { start: 0.3, end: 0 },
        alpha: { start: 0.18, end: 0 },
        lifespan: 2800,
        frequency: 520,
        quantity: 1,
        maxParticles: 12,
        tint: [0x2ef5d0, 0x8eb4e8],
        blendMode: Quality.useAddBlend ? 'ADD' : 'NORMAL',
      });
      this.ambientDust.setDepth(5);
    }

    this.multiplier.setIdle();

    this.unsub = this.transport.subscribe((e) => this.onTransport(e));
    this.activeBet = this.transport.getActiveBet();
    this.round = this.transport.getRound();
    this.applyRound(this.round, true);

    this.scale.on('resize', this.onResize, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.cleanup());
    this.events.once(Phaser.Scenes.Events.DESTROY, () => this.cleanup());
  }

  update(_time: number, delta: number): void {
    // Cap delta spikes after a tab resume
    const dt = Math.min(delta, 50);
    const mult = this.round?.multiplier ?? 1;
    const flying = this.round?.phase === RoundPhase.FLIGHT;
    const altitude = flying ? this.curve.progressFromMultiplier(mult) : 0;

    this.background.update(dt, altitude);
    this.aircraft.update(dt, flying ? mult : 1);
    this.multiplier.update(dt);

    if (flying) {
      this.path.setProgress(altitude);
      this.path.tick(dt);
      this.soundMgr.onMultiplier(mult);

      if (Quality.cameraDrift) {
        const cam = this.cameras.main;
        const targetScrollX = (this.aircraft.container.x - this.scale.width * 0.5) * 0.06;
        const targetScrollY = (this.aircraft.container.y - this.scale.height * 0.45) * 0.04;
        cam.scrollX = Phaser.Math.Linear(cam.scrollX, targetScrollX, AviatorConfig.camera.followLerp);
        cam.scrollY = Phaser.Math.Linear(cam.scrollY, targetScrollY, AviatorConfig.camera.followLerp);
      }
    } else if (Quality.cameraDrift) {
      const cam = this.cameras.main;
      cam.scrollX = Phaser.Math.Linear(cam.scrollX, 0, 0.08);
      cam.scrollY = Phaser.Math.Linear(cam.scrollY, 0, 0.08);
    }
  }

  private onTransport(event: TransportEvent): void {
    switch (event.type) {
      case 'round_update':
        this.applyRound(event.round, false);
        break;
      case 'cashout_result':
        this.activeBet = event.bet;
        if (event.bet.status === 'cashed_out' && event.bet.payout) {
          this.soundMgr.play('win');
          const payout = event.bet.payout.toLocaleString(undefined, { maximumFractionDigits: 2 });
          this.winFx.celebrate(
            this.scale.width * 0.5,
            this.scale.height * (Quality.isMobile ? 0.28 : 0.32),
            `${this.strings.win}  ${payout}`,
          );
        }
        break;
      case 'bet_accepted':
        this.activeBet = event.bet;
        break;
      default:
        break;
    }
  }

  private applyRound(round: RoundSnapshot, initial: boolean): void {
    const prev = this.round?.phase;
    this.round = round;
    this.fsm.setPhase(round.phase);

    switch (round.phase) {
      case RoundPhase.IDLE:
      case RoundPhase.NEXT_ROUND:
        this.multiplier.setIdle();
        this.path.clear();
        this.aircraft.hide();
        this.background.resetAltitude();
        this.soundMgr.stopFlight();
        break;

      case RoundPhase.COUNTDOWN: {
        this.multiplier.setCountdown(round.countdown);
        const sec = Math.ceil(round.countdown);
        if (sec !== this.lastCountdownSec && sec > 0) {
          this.lastCountdownSec = sec;
          this.multiplier.pulseCountdown();
          this.soundMgr.play('countdown');
        }
        if (prev !== RoundPhase.COUNTDOWN || initial) {
          this.aircraft.showReady();
          this.path.clear();
          this.background.resetAltitude();
        }
        break;
      }

      case RoundPhase.FLIGHT:
        if (prev !== RoundPhase.FLIGHT) {
          this.aircraft.startFlight();
          this.soundMgr.startFlight();
          this.lastCountdownSec = -1;
        }
        this.multiplier.setFlight(round.multiplier);
        break;

      case RoundPhase.CRASH:
        if (prev !== RoundPhase.CRASH) {
          this.soundMgr.stopFlight();
          this.soundMgr.play('crash');
          this.aircraft.playCrash();
          this.crashFx.burst(this.aircraft.container.x, this.aircraft.container.y);
          this.background.setCrashFlash();
          shakeCamera(
            this,
            AviatorConfig.camera.crashShakeDuration,
            AviatorConfig.camera.shakeIntensity,
          );
          // Only buzz the player who actually had money in the air.
          if (this.activeBet && !this.activeBet.cashedOut) Haptics.notify('error');
        }
        this.multiplier.setCrash(round.multiplier);
        break;

      case RoundPhase.RESULT: {
        const won = this.activeBet?.status === 'cashed_out';
        this.multiplier.setResult(won, round.multiplier);
        break;
      }
    }
  }

  private onResize(gameSize: Phaser.Structs.Size): void {
    // Debounce resize storms (mobile address bar / orientation)
    if (this.resizeTimer) clearTimeout(this.resizeTimer);
    const w = gameSize.width;
    const h = gameSize.height;
    this.resizeTimer = setTimeout(
      () => {
        this.resizeTimer = null;
        if (!this.scene.isActive()) return;
        this.curve.resize(w, h);
        this.path.resize();
        this.background.resize(w, h);
        this.multiplier.resize(w, h);
        this.aircraft.syncStartIfWaiting();
      },
      Quality.isMobile ? 80 : 40,
    );
  }

  private cleanup(): void {
    this.unsub?.();
    this.unsub = null;
    if (this.resizeTimer) {
      clearTimeout(this.resizeTimer);
      this.resizeTimer = null;
    }
    this.scale.off('resize', this.onResize, this);
    this.soundMgr.stopFlight();
    this.ambientDust?.destroy();
    this.ambientDust = null;
    this.crashFx?.destroy();
    this.background?.destroy();
  }
}
