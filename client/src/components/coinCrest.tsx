/**
 * Гербы монеты в стиле Telegram Stars:
 * мягкий «пластиковый» 3D-золото, звезда = тот же силуэт, что у TG Stars.
 */

type Pt = { x: number; y: number };

function polar(cx: number, cy: number, r: number, deg: number): Pt {
  const rad = (deg * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function fmt(pts: Pt[]): string {
  return pts.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ');
}

function starPoints(cx: number, cy: number, outerR: number, innerR: number, count = 5, startDeg = -90): Pt[] {
  const pts: Pt[] = [];
  const step = 360 / (count * 2);
  for (let i = 0; i < count * 2; i++) {
    pts.push(polar(cx, cy, i % 2 === 0 ? outerR : innerR, startDeg + i * step));
  }
  return pts;
}

/** Twemoji ⭐ / Telegram Stars silhouette (viewBox 0..36 → scale to 100). */
const TG_STAR_PATH =
  'M27.287 34.627c-.404 0-.806-.124-1.152-.371L18 28.422l-8.135 5.834c-.693.496-1.623.496-2.312-.008-.689-.499-.979-1.385-.721-2.194l3.034-9.792-8.062-5.681c-.685-.505-.97-1.393-.708-2.203.264-.808 1.016-1.357 1.866-1.363L12.947 13l3.179-9.549c.268-.809 1.023-1.353 1.874-1.353.851 0 1.606.545 1.875 1.353L23 13l10.036.015c.853.006 1.606.556 1.867 1.363.263.81-.022 1.698-.708 2.203l-8.062 5.681 3.034 9.792c.26.809-.033 1.695-.72 2.194-.347.254-.753.379-1.16.379z';

const TG_STAR_TRANSFORM = 'translate(50 50) scale(2.35) translate(-18 -18)';

let uid = 0;
function nextId(prefix: string): string {
  uid += 1;
  return `cf_${prefix}_${uid}`;
}

/** Орёл — только голова (профиль) в мягком TG-стиле. */
export function EagleCrest() {
  const id = nextId('eagle');
  return (
    <svg viewBox="0 0 100 100" className="cf-crest cf-crest--eagle" aria-hidden focusable="false">
      <defs>
        <linearGradient id={`${id}_body`} x1="15%" y1="10%" x2="85%" y2="90%">
          <stop offset="0%" stopColor="#FFF8E1" />
          <stop offset="45%" stopColor="#FFE082" />
          <stop offset="100%" stopColor="#FFB300" />
        </linearGradient>
        <linearGradient id={`${id}_beak`} x1="0%" y1="30%" x2="100%" y2="70%">
          <stop offset="0%" stopColor="#FFECB3" />
          <stop offset="100%" stopColor="#EF6C00" />
        </linearGradient>
        <filter id={`${id}_soft`} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="1.2" stdDeviation="1.1" floodColor="#BF360C" floodOpacity="0.35" />
        </filter>
      </defs>
      <g filter={`url(#${id}_soft)`}>
        {/* затылок / хохолок */}
        <path
          fill={`url(#${id}_body)`}
          d="M38 28
             C34 18, 40 10, 48 12
             C52 8, 60 10, 62 18
             C68 16, 74 22, 72 30
             C78 34, 78 46, 72 52
             C76 60, 70 70, 60 72
             C52 78, 40 74, 36 64
             C28 60, 28 46, 34 38
             C32 34, 34 30, 38 28 Z"
        />
        {/* клюв */}
        <path
          fill={`url(#${id}_beak)`}
          d="M70 42 C78 40, 90 44, 92 48 C90 52, 78 54, 70 52 C72 48, 72 46, 70 42 Z"
        />
        {/* глаз */}
        <circle cx="58" cy="40" r="4.2" fill="#5D2C04" />
        <circle cx="59.2" cy="38.8" r="1.5" fill="#FFF8E1" opacity="0.85" />
        {/* бровь */}
        <path
          d="M50 34 C54 32, 62 32, 66 36"
          fill="none"
          stroke="#EF6C00"
          strokeWidth="2.2"
          strokeLinecap="round"
          opacity="0.7"
        />
      </g>
    </svg>
  );
}

/** Звезда Telegram Stars — тот же силуэт и палитра, что в StarIcon. */
export function StarCrest() {
  const id = nextId('star');
  return (
    <svg viewBox="0 0 100 100" className="cf-crest cf-crest--star" aria-hidden focusable="false">
      <defs>
        <radialGradient id={`${id}_fill`} cx="38%" cy="32%" r="78%" gradientUnits="objectBoundingBox">
          <stop offset="0%" stopColor="#FFE082" />
          <stop offset="35%" stopColor="#FFCA28" />
          <stop offset="72%" stopColor="#FFA000" />
          <stop offset="100%" stopColor="#E65100" />
        </radialGradient>
        <radialGradient id={`${id}_shine`} cx="32%" cy="28%" r="42%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
        </radialGradient>
        <filter id={`${id}_soft`} x="-25%" y="-25%" width="150%" height="150%">
          <feDropShadow dx="0" dy="1.5" stdDeviation="1.4" floodColor="#E65100" floodOpacity="0.4" />
        </filter>
      </defs>
      <g transform={TG_STAR_TRANSFORM} filter={`url(#${id}_soft)`}>
        <path d={TG_STAR_PATH} fill={`url(#${id}_fill)`} />
        <path d={TG_STAR_PATH} fill={`url(#${id}_shine)`} />
      </g>
    </svg>
  );
}

export function EagleBadge() {
  return (
    <svg viewBox="0 0 24 24" className="cf-side-icon" aria-hidden focusable="false">
      <defs>
        <linearGradient id="cf_eb_g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FFE082" />
          <stop offset="100%" stopColor="#FFA000" />
        </linearGradient>
      </defs>
      <path
        fill="url(#cf_eb_g)"
        d="M8.5 7.2c-.6-1.6.4-3.2 2-3.4.7-.8 2-.8 2.8.1 1-.2 2 .6 2 1.6.9.5 1.2 1.7.7 2.6.8.7 1 2 .4 3-.3 1.2-1.4 2-2.6 2.1-.8 1-2.2 1.2-3.3.5-1.1-.4-1.8-1.5-1.7-2.7-.8-.8-.8-2.1.1-2.9.1-.3.3-.6.6-.9z"
      />
      <path fill="#EF6C00" d="M15.2 10.2c1.4-.2 3.2.4 3.6 1.1-.4.7-2.2 1.2-3.6 1z" />
      <circle cx="12.2" cy="9.4" r="1.05" fill="#5D2C04" />
    </svg>
  );
}

export function StarBadge() {
  return (
    <svg viewBox="0 0 24 24" className="cf-side-icon" aria-hidden focusable="false">
      <defs>
        <radialGradient id="cf_sb_g" cx="38%" cy="32%" r="78%">
          <stop offset="0%" stopColor="#FFE082" />
          <stop offset="55%" stopColor="#FFCA28" />
          <stop offset="100%" stopColor="#FF8F00" />
        </radialGradient>
      </defs>
      <polygon points={fmt(starPoints(12, 12, 9.2, 4))} fill="url(#cf_sb_g)" />
    </svg>
  );
}
