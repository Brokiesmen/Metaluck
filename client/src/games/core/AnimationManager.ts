import Phaser from 'phaser';

/**
 * Lightweight tween helpers shared across minigames.
 * Bound to a Phaser.Scene — auto-cleans on scene shutdown.
 */
export class AnimationManager {
  private scene: Phaser.Scene;
  private alive = true;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.destroy());
    scene.events.once(Phaser.Scenes.Events.DESTROY, () => this.destroy());
  }

  static forScene(scene: Phaser.Scene): AnimationManager {
    const key = 'metaluck.AnimationManager';
    const existing = scene.data.get(key) as AnimationManager | undefined;
    if (existing) return existing;
    const created = new AnimationManager(scene);
    scene.data.set(key, created);
    return created;
  }

  destroy(): void {
    if (!this.alive) return;
    this.alive = false;
  }

  fadeIn(
    target: Phaser.GameObjects.GameObject & { setAlpha: (v: number) => unknown },
    duration = 220,
    from = 0,
  ): Phaser.Tweens.Tween {
    target.setAlpha(from);
    return this.scene.tweens.add({
      targets: target,
      alpha: 1,
      duration,
      ease: 'Cubic.Out',
    });
  }

  fadeOut(
    target: Phaser.GameObjects.GameObject & { setAlpha: (v: number) => unknown },
    duration = 180,
    to = 0,
  ): Phaser.Tweens.Tween {
    return this.scene.tweens.add({
      targets: target,
      alpha: to,
      duration,
      ease: 'Cubic.In',
    });
  }

  punchScale(
    target: Phaser.GameObjects.GameObject & { setScale: (x: number, y?: number) => unknown },
    peak = 1.08,
    duration = 180,
  ): Phaser.Tweens.Tween {
    return this.scene.tweens.add({
      targets: target,
      scaleX: peak,
      scaleY: peak,
      duration: duration / 2,
      yoyo: true,
      ease: 'Back.Out',
    });
  }

  shake(
    target: Phaser.GameObjects.GameObject & { x: number; y: number },
    intensity = 6,
    duration = 220,
  ): Phaser.Tweens.Tween {
    const ox = target.x;
    const oy = target.y;
    return this.scene.tweens.add({
      targets: target,
      x: { from: ox - intensity, to: ox + intensity },
      duration: duration / 6,
      yoyo: true,
      repeat: 5,
      ease: 'Sine.InOut',
      onComplete: () => {
        target.x = ox;
        target.y = oy;
      },
    });
  }

  /** Animates a numeric readout on a Text object. */
  countText(
    text: Phaser.GameObjects.Text,
    from: number,
    to: number,
    duration: number,
    format: (n: number) => string = (n) => n.toFixed(2),
  ): Phaser.Tweens.Tween {
    const state = { value: from };
    text.setText(format(from));
    return this.scene.tweens.add({
      targets: state,
      value: to,
      duration,
      ease: 'Cubic.Out',
      onUpdate: () => {
        text.setText(format(state.value));
      },
    });
  }

  floatIn(
    target: Phaser.GameObjects.GameObject & { y: number; setAlpha: (v: number) => unknown },
    fromYOffset = 18,
    duration = 280,
  ): Phaser.Tweens.Tween {
    const endY = target.y;
    target.y = endY + fromYOffset;
    target.setAlpha(0);
    return this.scene.tweens.add({
      targets: target,
      y: endY,
      alpha: 1,
      duration,
      ease: 'Cubic.Out',
    });
  }

  pulse(
    target: Phaser.GameObjects.GameObject & { setScale: (x: number, y?: number) => unknown },
    scale = 1.04,
    duration = 900,
  ): Phaser.Tweens.Tween {
    return this.scene.tweens.add({
      targets: target,
      scaleX: scale,
      scaleY: scale,
      duration,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.InOut',
    });
  }
}
