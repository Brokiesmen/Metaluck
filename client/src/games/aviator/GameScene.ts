import Phaser from 'phaser';
import { SoundManager } from '../core/SoundManager';
import { Haptics } from '../core/Haptics';
import { getDeviceProfile } from '../core/DeviceProfile';
import { REGISTRY_KEYS, type GameCallbacks } from '../core/types';
import {
  AnimationManager,
  BalancePanel,
  BetPanel,
  CountdownTimer,
  GameButton,
  GameTheme,
  HistoryStrip,
  MultiplierDisplay,
  ResultOverlay,
  formatAmount,
} from '../shared';
import { ALLOWED_BETS, formatMult, historyTone } from './odds';
import { LocalRoundSource } from './LocalRoundSource';
import type { RoundSnapshot, RoundSource } from './RoundSource';
import { CurveRenderer } from './CurveRenderer';
import { PlaneActor } from './PlaneActor';
import { CashoutFx } from './CashoutFx';
import { defaultFlightLayout, poseAt, progressFromMultiplier, type FlightLayout } from './FlightPath';

/**
 * Main Aviator playfield — commercial crash experience on Phaser.
 * Round transport is RoundSource (LocalRoundSource today; LiveRoundSource later).
 */
export class GameScene extends Phaser.Scene {
  private source!: RoundSource;
  private unsub?: () => void;
  private anim!: AnimationManager;
  private sfx!: SoundManager;

  private bg!: Phaser.GameObjects.Rectangle;
  private skyWash!: Phaser.GameObjects.Graphics;
  private grid!: Phaser.GameObjects.Graphics;
  private curve!: CurveRenderer;
  private plane!: PlaneActor;
  private cashoutFx!: CashoutFx;
  private layout!: FlightLayout;

  private mult!: MultiplierDisplay;
  private phaseLabel!: Phaser.GameObjects.Text;
  private waitHint!: Phaser.GameObjects.Text;
  private history!: HistoryStrip;
  private balancePanel!: BalancePanel;
  private betPanel!: BetPanel;
  private actionBtn!: GameButton;
  private muteBtn!: GameButton;
  private timer!: CountdownTimer;
  private result!: ResultOverlay;
  private flash!: Phaser.GameObjects.Rectangle;

  private lastPhase: RoundSnapshot['phase'] | null = null;
  private lastHistoryLen = 0;
  private lastEmittedBalance = -1;
  private flyingOff = false;
  private statusCashed = false;
  private cashoutPulsing = false;
  private lowPower = false;
  private tornDown = false;

  constructor() {
    super('GameScene');
  }

  create(): void {
    try {
      this.bootGame();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[Aviator GameScene]', err);
      this.add
        .text(this.scale.width / 2, this.scale.height / 2, `Aviator error:\n${msg}`, {
          fontFamily: 'monospace',
          fontSize: '14px',
          color: '#ff5c7a',
          align: 'center',
          wordWrap: { width: this.scale.width - 40 },
        })
        .setOrigin(0.5);
    }
  }

  private bootGame(): void {
    const bet = Number(this.registry.get(REGISTRY_KEYS.bet) ?? 10);
    const balance = Number(this.registry.get(REGISTRY_KEYS.balance) ?? 1000);
    this.lowPower = getDeviceProfile().lowPower;
    this.sfx = SoundManager.getInstance();
    this.anim = AnimationManager.forScene(this);

    // Demo economy — swap to createLiveRoundSource(...) for production API/WS.
    this.source = new LocalRoundSource(balance, bet);
    this.buildWorld();
    this.buildHud();
    this.layoutAll();

    this.unsub = this.source.subscribe((snap) => this.onSnapshot(snap));
    this.source.start();

    this.scale.on(Phaser.Scale.Events.RESIZE, this.onResize, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.teardown());
    this.events.once(Phaser.Scenes.Events.DESTROY, () => this.teardown());
  }

  update(_t: number, _dt: number): void {
    if (!this.source || this.tornDown) return;
    const snap = this.source.tick(Date.now());
    this.renderFlight(snap);
  }

  private buildWorld(): void {
    const { width, height } = this.scale;
    this.bg = this.add.rectangle(width / 2, height / 2, width, height, 0x070b12).setDepth(0);
    this.skyWash = this.add.graphics().setDepth(1);
    this.paintSky(width, height);
    this.grid = this.add.graphics().setDepth(5).setAlpha(this.lowPower ? 0.14 : 0.26);
    if (!getDeviceProfile().veryLow) this.drawGrid();
    this.layout = defaultFlightLayout(width, height);
    this.curve = new CurveRenderer(this);
    this.curve.setLayout(this.layout);
    this.plane = new PlaneActor(this);
    this.plane.resetAt(this.layout.originX, this.layout.originY);
    this.cashoutFx = new CashoutFx(this);
    this.flash = this.add
      .rectangle(width / 2, height / 2, width, height, 0xff5c7a, 0)
      .setDepth(90)
      .setScrollFactor(0);
  }

  private buildHud(): void {
    const { width, height } = this.scale;
    const device = getDeviceProfile();
    const fontMult = device.coarsePointer ? 48 : 56;

    this.history = new HistoryStrip({
      scene: this,
      x: width / 2,
      y: 28,
      width: Math.min(width - 24, 360),
      maxItems: 10,
    });

    this.balancePanel = new BalancePanel({
      scene: this,
      x: width - 86,
      y: 72,
      width: 140,
      balance: this.source.getBalance(),
      suffix: '★',
    });

    this.mult = new MultiplierDisplay({
      scene: this,
      x: width / 2,
      y: height * 0.36,
      value: 1,
      fontSize: fontMult,
    });
    this.mult.setVisible(false);

    this.phaseLabel = this.add
      .text(width / 2, height * 0.34, 'WAITING FOR NEXT ROUND', {
        fontFamily: GameTheme.font.ui,
        fontSize: '15px',
        color: GameTheme.colors.textMutedHex,
        fontStyle: '800',
      })
      .setOrigin(0.5)
      .setDepth(GameTheme.depth.hud);

    this.waitHint = this.add
      .text(width / 2, height * 0.34 + 22, 'Place a bet before takeoff', {
        fontFamily: GameTheme.font.ui,
        fontSize: '12px',
        color: GameTheme.colors.textDimHex,
      })
      .setOrigin(0.5)
      .setDepth(GameTheme.depth.hud)
      .setAlpha(0.85);

    this.timer = new CountdownTimer({
      scene: this,
      x: width / 2,
      y: height * 0.34 + 72,
      radius: 30,
      fontSize: 18,
    });

    this.betPanel = new BetPanel({
      scene: this,
      x: width / 2,
      y: height - 196,
      width: Math.min(width - 28, 340),
      bet: Number(this.registry.get(REGISTRY_KEYS.bet) ?? 10),
      balance: this.source.getBalance(),
      min: ALLOWED_BETS[0],
      max: ALLOWED_BETS[ALLOWED_BETS.length - 1],
      chips: [...ALLOWED_BETS],
      onChange: (b) => this.source.setSelectedBet(b),
    });

    this.actionBtn = new GameButton({
      scene: this,
      x: width / 2,
      y: height - 62,
      width: Math.min(width - 32, 320),
      height: 56,
      label: 'Place bet',
      variant: 'primary',
      fontSize: 18,
      onClick: () => this.onAction(),
    });

    this.muteBtn = new GameButton({
      scene: this,
      x: width - 48,
      y: 118,
      width: 56,
      height: 36,
      label: this.sfx.isMuted() ? 'MUTE' : 'SFX',
      variant: 'ghost',
      fontSize: 12,
      onClick: () => {
        this.sfx.toggleMute();
        this.muteBtn.setLabel(this.sfx.isMuted() ? 'MUTE' : 'SFX');
      },
    });

    this.result = new ResultOverlay({ scene: this, continueLabel: 'OK' });
  }

  private layoutAll(): void {
    const { width, height } = this.scale;
    this.bg.setPosition(width / 2, height / 2).setSize(width, height);
    this.paintSky(width, height);
    this.flash.setPosition(width / 2, height / 2).setSize(width, height);
    this.layout = defaultFlightLayout(width, height);
    this.curve.setLayout(this.layout);
    this.grid.clear();
    if (!getDeviceProfile().veryLow) this.drawGrid();

    this.history.setPosition(width / 2, 28);
    this.balancePanel.setPosition(width - 86, 72);
    this.muteBtn.setPosition(width - 48, 118);
    this.mult.setPosition(width / 2, height * 0.34);
    this.phaseLabel.setPosition(width / 2, height * 0.32);
    this.waitHint.setPosition(width / 2, height * 0.32 + 22);
    this.timer.setPosition(width / 2, height * 0.32 + 72);
    this.betPanel.setPosition(width / 2, height - 196);
    this.actionBtn.setPosition(width / 2, height - 62);
    this.actionBtn.setSizePx(Math.min(width - 32, 320), 56);
  }

  private onResize(): void {
    this.layoutAll();
  }

  private paintSky(width: number, height: number): void {
    this.skyWash.clear();
    this.skyWash.fillGradientStyle(0x12243c, 0x12243c, 0x070b12, 0x070b12, 1);
    this.skyWash.fillRect(0, 0, width, height * 0.58);
    // Soft horizon blush
    this.skyWash.fillStyle(0xff4d6d, 0.06);
    this.skyWash.fillEllipse(width * 0.55, height * 0.42, width * 0.9, height * 0.28);
  }

  private drawGrid(): void {
    const { width, height } = this.scale;
    this.grid.clear();
    this.grid.lineStyle(1, GameTheme.colors.border, 0.32);
    const step = 36;
    for (let x = 0; x < width; x += step) {
      this.grid.lineBetween(x, 0, x, height);
    }
    for (let y = 0; y < height; y += step) {
      this.grid.lineBetween(0, y, width, y);
    }
  }

  private onAction(): void {
    this.sfx.unlock();
    const snap = this.source.snapshot();
    if (snap.canBet) {
      const res = this.source.placeBet();
      if (!res.ok) {
        this.sfx.play('error');
        this.anim.shake(this.betPanel, 5, 160);
        return;
      }
      this.sfx.play('click');
      Haptics.impact('medium');
      this.balancePanel.setBalance(this.source.getBalance());
      this.emitBalance(this.source.getBalance());
      return;
    }
    if (snap.canCashout) {
      const res = this.source.cashout();
      if (!res.ok) {
        this.sfx.play('error');
        Haptics.notify('warning');
        return;
      }
      this.sfx.play('cashout');
      this.sfx.play('win');
      this.statusCashed = true;
      this.setCashoutPulse(false);
      this.balancePanel.setBalance(this.source.getBalance(), true);
      this.emitBalance(this.source.getBalance());
      this.mult.flash();
      const pose = poseAt(progressFromMultiplier(res.mult), this.layout);
      this.cashoutFx.play(pose.x, pose.y - 12, res.payout);
      this.result.show({
        kind: 'win',
        title: 'CASHED OUT',
        amount: res.payout,
        subtitle: `at ${formatMult(res.mult)}`,
        autoHideMs: 2200,
      });
      this.getCallbacks()?.onWin?.({
        gameId: 'aviator',
        bet: snap.stake,
        payout: res.payout,
        meta: { mult: res.mult },
      });
    }
  }

  private onSnapshot(snap: RoundSnapshot): void {
    if (snap.phase !== this.lastPhase) {
      this.onPhaseChange(snap);
      this.lastPhase = snap.phase;
    }

    if (snap.history.length !== this.lastHistoryLen) {
      this.lastHistoryLen = snap.history.length;
      this.history.setItems(
        snap.history.map((m, i) => ({
          id: `${i}-${m}`,
          label: formatMult(m),
          tone: historyTone(m),
        })),
      );
    }

    this.balancePanel.setBalance(snap.balance, false);
    this.betPanel.setBalance(snap.balance);
    this.betPanel.setEnabled(snap.phase === 'waiting' && !snap.hasBet);
    this.emitBalance(snap.balance);

    if (snap.canCashout) {
      this.actionBtn.setDisabled(false);
      this.actionBtn.setVariant('accent');
      this.actionBtn.setLabel(`CASH OUT  ${formatAmount(Math.floor(snap.stake * snap.multiplier))}★`);
      this.setCashoutPulse(true);
    } else if (snap.canBet) {
      this.setCashoutPulse(false);
      this.actionBtn.setDisabled(false);
      this.actionBtn.setVariant('primary');
      this.actionBtn.setLabel('Place bet');
    } else if (snap.phase === 'waiting' && snap.hasBet) {
      this.setCashoutPulse(false);
      this.actionBtn.setDisabled(true);
      this.actionBtn.setVariant('secondary');
      this.actionBtn.setLabel('Bet placed — waiting…');
    } else if (snap.cashedOut) {
      this.setCashoutPulse(false);
      this.actionBtn.setDisabled(true);
      this.actionBtn.setVariant('accent');
      this.actionBtn.setLabel(`Won ${formatAmount(snap.payout)}★`);
    } else {
      this.setCashoutPulse(false);
      this.actionBtn.setDisabled(true);
      this.actionBtn.setVariant('secondary');
      this.actionBtn.setLabel(snap.phase === 'flying' ? 'Flying…' : 'Wait…');
    }
  }

  private setCashoutPulse(on: boolean): void {
    if (on === this.cashoutPulsing) return;
    this.cashoutPulsing = on;
    this.actionBtn.setPulse(on, 1.05, 640);
  }

  private onPhaseChange(snap: RoundSnapshot): void {
    this.flyingOff = false;
    this.statusCashed = snap.cashedOut;

    if (snap.phase === 'waiting') {
      this.sfx.stopEngine();
      this.cameras.main.resetFX();
      this.curve.clear();
      this.plane.resetAt(this.layout.originX, this.layout.originY);
      this.mult.setLive(false);
      this.mult.setVisible(false);
      this.mult.setValue(1, false);
      this.phaseLabel
        .setVisible(true)
        .setText('WAITING FOR NEXT ROUND')
        .setColor(GameTheme.colors.textMutedHex);
      this.waitHint.setVisible(true).setText('Place a bet before takeoff');
      this.timer.setVisible(true);
      const left = Math.max(0, snap.bettingEndsAt - Date.now());
      this.timer.start(left);
      this.anim.floatIn(this.phaseLabel, 10, 220);
      this.anim.fadeIn(this.waitHint, 260, 0);
    }

    if (snap.phase === 'flying') {
      this.timer.stop();
      this.timer.setVisible(false);
      this.phaseLabel.setVisible(false);
      this.waitHint.setVisible(false);
      this.mult.setVisible(true);
      this.mult.setValue(1, false);
      this.mult.setLive(true);
      this.plane.resetAt(this.layout.originX, this.layout.originY);
      this.plane.setFlying(true);
      this.sfx.startEngine();
      this.sfx.play('whoosh');
      this.anim.punchScale(this.mult, 1.1, 220);
    }

    if (snap.phase === 'crashed') {
      this.sfx.stopEngine(120);
      this.sfx.play('crash');
      Haptics.impact('heavy');
      this.setCashoutPulse(false);
      this.mult.setLive(false);
      this.mult.setVisible(true);
      this.mult.setValue(snap.crashMult, true);
      this.mult.flash();
      this.phaseLabel
        .setVisible(true)
        .setText(`CRASHED AT ${formatMult(snap.crashMult)}`)
        .setColor(GameTheme.colors.dangerHex);
      this.waitHint.setVisible(false);
      this.flashCrash();
      this.flyPlaneAway();

      if (snap.hasBet && !snap.cashedOut && !this.statusCashed) {
        this.result.show({
          kind: 'lose',
          title: 'CRASHED',
          amount: -snap.stake,
          subtitle: formatMult(snap.crashMult),
          autoHideMs: 2400,
        });
        this.emitBalance(snap.balance);
        this.getCallbacks()?.onLose?.({
          gameId: 'aviator',
          bet: snap.stake,
          payout: 0,
          meta: { crashMult: snap.crashMult },
        });
      }

      this.time.delayedCall(450, () => {
        if (this.tornDown) return;
        this.phaseLabel.setColor(GameTheme.colors.textMutedHex);
      });
    }
  }

  private renderFlight(snap: RoundSnapshot): void {
    if (snap.phase !== 'flying' || this.flyingOff) return;

    // Multiplier-driven progress — organic climb without knowing crash point ahead of time.
    const progress = progressFromMultiplier(snap.multiplier);
    this.curve.draw(progress);
    const pose = poseAt(progress, this.layout);
    this.plane.applyPose(pose);
    this.mult.setValue(snap.multiplier, true);
  }

  private flyPlaneAway(): void {
    if (this.flyingOff) return;
    this.flyingOff = true;
    const { width } = this.scale;
    this.curve.draw(progressFromMultiplier(this.source.snapshot().crashMult) || 1, true);
    this.plane.flyOff(width + 110, -70, this.lowPower ? 520 : 780);
  }

  private flashCrash(): void {
    this.flash.setAlpha(0.62);
    this.tweens.add({
      targets: this.flash,
      alpha: 0,
      duration: this.lowPower ? 320 : 480,
      ease: 'Cubic.Out',
    });
    if (!getDeviceProfile().reducedMotion) {
      this.cameras.main.shake(this.lowPower ? 160 : 280, this.lowPower ? 0.006 : 0.012);
      this.anim.shake(this.mult, 7, 240);
    }
  }

  private getCallbacks(): GameCallbacks | undefined {
    return this.registry.get(REGISTRY_KEYS.callbacks) as GameCallbacks | undefined;
  }

  private emitBalance(balance: number): void {
    if (balance === this.lastEmittedBalance) return;
    this.lastEmittedBalance = balance;
    this.getCallbacks()?.onBalance?.(balance);
  }

  private teardown(): void {
    if (this.tornDown) return;
    this.tornDown = true;
    this.unsub?.();
    this.unsub = undefined;
    this.source?.destroy?.();
    this.setCashoutPulse(false);
    this.sfx?.stopEngine(0);
    this.scale.off(Phaser.Scale.Events.RESIZE, this.onResize, this);
    this.cameras?.main?.resetFX();
    this.plane?.destroy();
    this.curve?.destroy();
  }
}
