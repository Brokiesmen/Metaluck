/** Map flight progress → screen coordinates and tangent angle (Spribe-like climb). */

export interface FlightPose {
  x: number;
  y: number;
  angle: number;
  progress: number;
}

export interface FlightLayout {
  originX: number;
  originY: number;
  endX: number;
  endY: number;
}

export function defaultFlightLayout(width: number, height: number): FlightLayout {
  const padL = Math.max(32, width * 0.07);
  const padR = Math.max(40, width * 0.1);
  const padB = Math.max(130, height * 0.24);
  const padT = Math.max(110, height * 0.18);
  return {
    originX: padL,
    originY: height - padB,
    endX: width - padR,
    endY: padT,
  };
}

/** Accelerating climb (flat takeoff → steep rise), but rising early enough that
 *  typical low-multiplier rounds still visibly leave the corner. */
function easeInClimb(t: number): number {
  const u = Math.min(1, Math.max(0, t));
  return Math.pow(u, 1.7);
}

/** Soft horizontal advance. */
function easeOutQuad(t: number): number {
  const u = Math.min(1, Math.max(0, t));
  return u * (2 - u);
}

/**
 * Open-ended progress from live multiplier (does not require knowing crash point).
 * Base 25 keeps the plane moving on the common low-multiplier rounds instead of
 * hugging the corner until 100×.
 * 1.00→0 · 2×≈0.22 · 5×≈0.50 · 10×≈0.72 · 25×→1.0 (top of screen)
 */
export function progressFromMultiplier(mult: number): number {
  const m = Math.max(1, mult);
  return Math.min(0.97, Math.log(m) / Math.log(25));
}

/**
 * Progress 0..1 along a rising Spribe-style curve.
 * Overhang >1 used for crash fly-off exaggeration.
 */
export function poseAt(progress: number, layout: FlightLayout): FlightPose {
  const p = Math.max(0, progress);
  const t = Math.min(1.25, p);

  const xT = easeOutQuad(Math.min(1, t));
  const yT = easeInClimb(Math.min(1, t));

  // Slight S-curve on X for organic path (not a straight diagonal).
  const sway = Math.sin(Math.min(1, t) * Math.PI) * 0.04;
  const x =
    layout.originX +
    (layout.endX - layout.originX) * (xT + sway);
  const y = layout.originY + (layout.endY - layout.originY) * yT;

  const d = 0.012;
  const t2 = Math.min(1.25, t + d);
  const x2 =
    layout.originX +
    (layout.endX - layout.originX) * (easeOutQuad(Math.min(1, t2)) + Math.sin(Math.min(1, t2) * Math.PI) * 0.04);
  const y2 = layout.originY + (layout.endY - layout.originY) * easeInClimb(Math.min(1, t2));
  const angle = (Math.atan2(y2 - y, x2 - x) * 180) / Math.PI;

  return { x, y, angle, progress: t };
}

export function sampleCurve(
  progress: number,
  layout: FlightLayout,
  points = 32,
): Array<{ x: number; y: number }> {
  const out: Array<{ x: number; y: number }> = [];
  const p = Math.max(0, Math.min(1.2, progress));
  const n = Math.max(10, points);
  for (let i = 0; i <= n; i++) {
    out.push(poseAt((i / n) * p, layout));
  }
  return out;
}
