/**
 * Procedural UI / feedback sounds for Phaser games.
 * Rate-limited to avoid audio glitches on weak devices / rapid taps.
 */

import { getDeviceProfile } from './DeviceProfile';

export type SoundId =
  | 'click'
  | 'tick'
  | 'win'
  | 'lose'
  | 'whoosh'
  | 'error'
  | 'cashout'
  | 'crash';

const STORAGE_KEY = 'metaluck.games.muted';

interface ToneSpec {
  freq: number;
  dur: number;
  type: OscillatorType;
  gain: number;
  slide?: number;
}

const TONES: Record<SoundId, ToneSpec[]> = {
  click: [{ freq: 620, dur: 0.035, type: 'square', gain: 0.04 }],
  tick: [{ freq: 880, dur: 0.025, type: 'sine', gain: 0.03 }],
  whoosh: [{ freq: 220, dur: 0.1, type: 'triangle', gain: 0.035, slide: 480 }],
  error: [
    { freq: 220, dur: 0.07, type: 'sawtooth', gain: 0.035 },
    { freq: 160, dur: 0.09, type: 'sawtooth', gain: 0.028 },
  ],
  win: [
    { freq: 523, dur: 0.07, type: 'sine', gain: 0.045 },
    { freq: 659, dur: 0.09, type: 'sine', gain: 0.045 },
    { freq: 784, dur: 0.14, type: 'sine', gain: 0.05 },
  ],
  lose: [
    { freq: 320, dur: 0.1, type: 'triangle', gain: 0.04, slide: 140 },
    { freq: 180, dur: 0.16, type: 'triangle', gain: 0.035 },
  ],
  cashout: [
    { freq: 660, dur: 0.05, type: 'sine', gain: 0.045 },
    { freq: 880, dur: 0.07, type: 'sine', gain: 0.05 },
    { freq: 1175, dur: 0.12, type: 'triangle', gain: 0.045 },
  ],
  crash: [
    { freq: 140, dur: 0.16, type: 'sawtooth', gain: 0.06, slide: 60 },
    { freq: 90, dur: 0.22, type: 'square', gain: 0.04 },
  ],
};

/** Min gap between identical one-shots (ms). */
const ID_COOLDOWN_MS: Partial<Record<SoundId, number>> = {
  click: 40,
  tick: 80,
  whoosh: 200,
  error: 120,
  win: 400,
  lose: 400,
  cashout: 300,
  crash: 400,
};

export class SoundManager {
  private static instance: SoundManager | null = null;

  private ctx: AudioContext | null = null;
  private muted: boolean;
  private unlocked = false;

  private engineOsc: OscillatorNode | null = null;
  private engineGain: GainNode | null = null;
  private engineLfo: OscillatorNode | null = null;
  private engineRunning = false;

  private lastPlayedAt = new Map<SoundId, number>();
  private voicesThisFrame = 0;
  private frameStamp = 0;
  private readonly maxVoicesPerWindow = 6;

  private constructor() {
    this.muted = this.readMuted();
  }

  static getInstance(): SoundManager {
    if (!SoundManager.instance) {
      SoundManager.instance = new SoundManager();
    }
    return SoundManager.instance;
  }

  static resetInstance(): void {
    SoundManager.instance?.dispose();
    SoundManager.instance = null;
  }

  isMuted(): boolean {
    return this.muted;
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    try {
      localStorage.setItem(STORAGE_KEY, muted ? '1' : '0');
    } catch {
      /* ignore */
    }
    if (muted) this.stopEngine();
  }

  toggleMute(): boolean {
    this.setMuted(!this.muted);
    return this.muted;
  }

  unlock(): void {
    if (this.unlocked) return;
    const ctx = this.ensureCtx();
    if (!ctx) return;
    if (ctx.state === 'suspended') {
      void ctx.resume();
    }
    this.unlocked = true;
  }

  play(id: SoundId): void {
    if (this.muted) return;
    const now = performance.now();
    const cool = ID_COOLDOWN_MS[id] ?? 50;
    const last = this.lastPlayedAt.get(id) ?? 0;
    if (now - last < cool) return;

    // Cap concurrent scheduling to avoid AudioContext overload on weak phones.
    if (now - this.frameStamp > 50) {
      this.frameStamp = now;
      this.voicesThisFrame = 0;
    }
    if (this.voicesThisFrame >= this.maxVoicesPerWindow) return;
    this.voicesThisFrame += 1;
    this.lastPlayedAt.set(id, now);

    const tones = TONES[id];
    if (!tones?.length) return;
    const ctx = this.ensureCtx();
    if (!ctx) return;
    if (ctx.state === 'suspended') void ctx.resume();

    const gainScale = getDeviceProfile().lowPower ? 0.85 : 1;
    let t = ctx.currentTime + 0.001;
    for (const tone of tones) {
      this.scheduleTone(ctx, t, { ...tone, gain: tone.gain * gainScale });
      t += tone.dur * 0.85;
    }
  }

  startEngine(): void {
    if (this.muted || this.engineRunning) return;
    const ctx = this.ensureCtx();
    if (!ctx) return;
    if (ctx.state === 'suspended') void ctx.resume();

    const profile = getDeviceProfile();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.value = 78;
    gain.gain.value = 0.0001;

    lfo.frequency.value = profile.lowPower ? 6 : 8;
    lfoGain.gain.value = profile.lowPower ? 0.008 : 0.012;
    lfo.connect(lfoGain);
    lfoGain.connect(gain.gain);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    lfo.start();
    const target = profile.lowPower ? 0.018 : 0.026;
    gain.gain.exponentialRampToValueAtTime(target, ctx.currentTime + 0.2);

    this.engineOsc = osc;
    this.engineGain = gain;
    this.engineLfo = lfo;
    this.engineRunning = true;
  }

  stopEngine(fadeMs = 160): void {
    if (!this.engineRunning) return;
    const ctx = this.ctx;
    const gain = this.engineGain;
    const osc = this.engineOsc;
    const lfo = this.engineLfo;
    this.engineRunning = false;
    this.engineOsc = null;
    this.engineGain = null;
    this.engineLfo = null;

    if (!ctx || !gain || !osc) return;
    const t = ctx.currentTime;
    try {
      gain.gain.cancelScheduledValues(t);
      gain.gain.setValueAtTime(Math.max(0.0001, gain.gain.value), t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(0.02, fadeMs / 1000));
      osc.stop(t + fadeMs / 1000 + 0.03);
      lfo?.stop(t + fadeMs / 1000 + 0.03);
    } catch {
      try {
        osc.stop();
        lfo?.stop();
      } catch {
        /* already stopped */
      }
    }
  }

  /**
   * Called when a Phaser game exits. Stops loops but keeps AudioContext
   * warm so the next game does not hitch on unlock/create.
   */
  onGameExit(): void {
    this.stopEngine(0);
    this.lastPlayedAt.clear();
    this.voicesThisFrame = 0;
  }

  dispose(): void {
    this.onGameExit();
    if (this.ctx) {
      void this.ctx.close();
      this.ctx = null;
    }
    this.unlocked = false;
  }

  private ensureCtx(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    if (!this.ctx || this.ctx.state === 'closed') {
      this.ctx = new AC();
    }
    return this.ctx;
  }

  private scheduleTone(ctx: AudioContext, when: number, tone: ToneSpec): void {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = tone.type;
    osc.frequency.setValueAtTime(tone.freq, when);
    if (tone.slide != null) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(40, tone.slide), when + tone.dur);
    }
    gain.gain.setValueAtTime(0.0001, when);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, tone.gain), when + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, when + tone.dur);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(when);
    osc.stop(when + tone.dur + 0.02);
  }

  private readMuted(): boolean {
    try {
      return localStorage.getItem(STORAGE_KEY) === '1';
    } catch {
      return false;
    }
  }
}
