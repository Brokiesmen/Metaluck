/**
 * Процедурная геометрия гербов монеты (орёл / венок со звездой).
 * Координаты считаются один раз на этапе загрузки модуля — SVG статичен
 * и просто крутится вместе с монетой, не добавляя нагрузки на анимацию.
 */

type Pt = { x: number; y: number };

function polar(cx: number, cy: number, r: number, deg: number): Pt {
  const rad = (deg * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function mirrorX(pts: Pt[], axis = 50): Pt[] {
  return pts.map((p) => ({ x: axis * 2 - p.x, y: p.y }));
}

function fmt(pts: Pt[]): string {
  return pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
}

/** Узкое остроконечное перо от точки "плеча" наружу под углом deg на длину len. */
function featherPoints(shoulder: Pt, deg: number, len: number, half: number): Pt[] {
  const dir = polar(0, 0, 1, deg);
  const perp = { x: -dir.y, y: dir.x };
  const tip = { x: shoulder.x + dir.x * len, y: shoulder.y + dir.y * len };
  return [
    { x: shoulder.x + perp.x * half, y: shoulder.y + perp.y * half },
    tip,
    { x: shoulder.x - perp.x * half, y: shoulder.y - perp.y * half },
  ];
}

function starPoints(cx: number, cy: number, outerR: number, innerR: number, count = 5, startDeg = -90): Pt[] {
  const pts: Pt[] = [];
  const step = 360 / (count * 2);
  for (let i = 0; i < count * 2; i++) {
    pts.push(polar(cx, cy, i % 2 === 0 ? outerR : innerR, startDeg + i * step));
  }
  return pts;
}

/* ── Орёл (герб «Орла») ───────────────────────────────────────── */
const WING_FEATHERS = [
  { deg: 143, len: 25 },
  { deg: 160, len: 30 },
  { deg: 177, len: 33 },
  { deg: 194, len: 31 },
  { deg: 211, len: 27 },
  { deg: 227, len: 22 },
];
const WING_SHOULDER: Pt = { x: 33, y: 44 };
const EAGLE_LEFT_WING = WING_FEATHERS.map((f) => fmt(featherPoints(WING_SHOULDER, f.deg, f.len, 3.3)));
const EAGLE_RIGHT_WING = WING_FEATHERS.map((f) => fmt(mirrorX(featherPoints(WING_SHOULDER, f.deg, f.len, 3.3))));

const TAIL_FEATHERS = [
  { deg: 62, len: 15 },
  { deg: 81, len: 17 },
  { deg: 99, len: 17 },
  { deg: 118, len: 15 },
];
const TAIL_SHOULDER: Pt = { x: 50, y: 75 };
const EAGLE_TAIL = TAIL_FEATHERS.map((f) => fmt(featherPoints(TAIL_SHOULDER, f.deg, f.len, 3)));

export function EagleCrest() {
  return (
    <svg viewBox="0 0 100 100" className="cf-crest" aria-hidden focusable="false">
      {EAGLE_TAIL.map((p, i) => (
        <polygon key={`t${i}`} points={p} />
      ))}
      {EAGLE_LEFT_WING.map((p, i) => (
        <polygon key={`l${i}`} points={p} />
      ))}
      {EAGLE_RIGHT_WING.map((p, i) => (
        <polygon key={`r${i}`} points={p} />
      ))}
      <path d="M50,34 C64,40 64,64 50,80 C36,64 36,40 50,34 Z" />
      <circle cx="50" cy="27" r="6.5" />
      <polygon points="55.5,24 67,27 55.5,30" />
    </svg>
  );
}

/* ── Венок со звездой (герб «Решки») ─────────────────────────── */
const N_LEAVES = 11;
const LEAF_START = 100;
const LEAF_END = 258;
const leftLeaves = Array.from({ length: N_LEAVES }, (_, i) => {
  const angle = LEAF_START + (i * (LEAF_END - LEAF_START)) / (N_LEAVES - 1);
  const p = polar(50, 50, 40, angle);
  return { x: p.x, y: p.y, rot: angle + 90 };
});
const rightLeaves = leftLeaves.map((l) => ({ x: 100 - l.x, y: l.y, rot: 180 - l.rot }));
const STAR = fmt(starPoints(50, 50, 21, 8.5));

export function WreathCrest() {
  return (
    <svg viewBox="0 0 100 100" className="cf-crest" aria-hidden focusable="false">
      {[...leftLeaves, ...rightLeaves].map((l, i) => (
        <ellipse key={i} cx={l.x} cy={l.y} rx="3.1" ry="7.2" transform={`rotate(${l.rot} ${l.x} ${l.y})`} />
      ))}
      <polygon points="46,89 50,83 54,89 50,95" />
      <polygon points={STAR} />
    </svg>
  );
}
