import { AviatorConfig } from '../config/aviatorConfig';
import { Quality } from '../config/quality';
import { clamp, easeOutCubic } from './Easing';

export interface Point {
  x: number;
  y: number;
}

/**
 * Cubic Bezier flight path — takeoff from the horizon, then a hard early climb
 * so even a small multiplier still reads as a natural ascent.
 */
export class FlightCurve {
  private p0: Point = { x: 0, y: 0 };
  private p1: Point = { x: 0, y: 0 };
  private p2: Point = { x: 0, y: 0 };
  private p3: Point = { x: 0, y: 0 };
  private portrait = false;

  constructor(width: number, height: number) {
    this.resize(width, height);
  }

  resize(width: number, height: number): void {
    this.portrait = height > width * 1.05 || Quality.isMobile;
    const f = this.portrait ? AviatorConfig.flightPortrait : AviatorConfig.flight;
    this.p0 = { x: f.startX * width, y: f.startY * height };
    this.p1 = { x: f.control1X * width, y: f.control1Y * height };
    this.p2 = { x: f.control2X * width, y: f.control2Y * height };
    this.p3 = { x: f.endX * width, y: f.endY * height };
  }

  /**
   * Multiplier → path progress.
   * Front-loaded & monotonic: small multipliers already climb hard off the
   * ground; ~1.1× is a clear takeoff, ~1.5× mid-sky, then it keeps rising.
   */
  progressFromMultiplier(mult: number): number {
    const m = Math.max(1, mult);
    const logBase = this.portrait ? 8 : 7;
    const t = clamp(Math.log(m) / Math.log(logBase), 0, 1);
    const biased = Math.pow(t, 0.62);
    return clamp(easeOutCubic(biased) * 0.95, 0, 0.96);
  }

  pointAt(t: number): Point {
    const u = clamp(t, 0, 1);
    const mt = 1 - u;
    const mt2 = mt * mt;
    const mt3 = mt2 * mt;
    const u2 = u * u;
    const u3 = u2 * u;

    return {
      x: mt3 * this.p0.x + 3 * mt2 * u * this.p1.x + 3 * mt * u2 * this.p2.x + u3 * this.p3.x,
      y: mt3 * this.p0.y + 3 * mt2 * u * this.p1.y + 3 * mt * u2 * this.p2.y + u3 * this.p3.y,
    };
  }

  tangentAt(t: number): Point {
    const u = clamp(t, 0, 1);
    const mt = 1 - u;
    return {
      x:
        3 * mt * mt * (this.p1.x - this.p0.x) +
        6 * mt * u * (this.p2.x - this.p1.x) +
        3 * u * u * (this.p3.x - this.p2.x),
      y:
        3 * mt * mt * (this.p1.y - this.p0.y) +
        6 * mt * u * (this.p2.y - this.p1.y) +
        3 * u * u * (this.p3.y - this.p2.y),
    };
  }

  curvatureAt(t: number): number {
    const a = this.angleAt(Math.max(0, t - 0.025));
    const b = this.angleAt(Math.min(1, t + 0.025));
    let d = b - a;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    return d;
  }

  angleAt(t: number): number {
    const tan = this.tangentAt(t);
    return Math.atan2(tan.y, tan.x);
  }

  get isPortrait(): boolean {
    return this.portrait;
  }
}
