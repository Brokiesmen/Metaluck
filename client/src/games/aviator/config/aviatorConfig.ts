/**
 * Aviator presentation + demo-economy constants.
 * The live server owns the real curve and crash point — everything here is
 * either purely visual or only used by the offline DemoTransport.
 */
export const AviatorConfig = {
  /** Design resolution — Phaser scales from this. */
  width: 1280,
  height: 720,

  /** Waiting / betting window before each flight (demo default). */
  countdownSeconds: 10,
  resultHoldMs: 2800,
  nextRoundDelayMs: 900,

  /** Multiplier growth rate for the offline demo loop only. */
  growthRate: 0.06,

  /** Tick interval for demo multiplier updates. */
  tickMs: 50,

  /** Demo starting balance. */
  startingBalance: 10_000,

  betPresets: [1, 5, 10, 25, 50, 100],
  minBet: 1,
  maxBet: 100,

  /**
   * Flight path (normalized).
   * Starts on the horizon/ground (~0.76–0.78), then climbs hard early
   * so low multipliers still look like a real takeoff into the sky.
   */
  flight: {
    startX: 0.07,
    startY: 0.76,
    endX: 0.9,
    endY: 0.08,
    control1X: 0.2,
    control1Y: 0.42,
    control2X: 0.52,
    control2Y: 0.16,
  },

  /** Mobile / portrait — same idea: lift off the skyline, climb high fast. */
  flightPortrait: {
    startX: 0.06,
    startY: 0.74,
    endX: 0.88,
    endY: 0.12,
    control1X: 0.24,
    control1Y: 0.4,
    control2X: 0.58,
    control2Y: 0.18,
  },

  camera: {
    followLerp: 0.045,
    shakeIntensity: 0.012,
    crashShakeDuration: 420,
  },
} as const;
