import { useId } from 'react';

interface Props {
  size?: number;
  animate?: boolean;
  /** Мягкое свечение вокруг звезды (для плотных кнопок лучше выключить) */
  glow?: boolean;
}

/**
 * Silhouette matches the ⭐ emoji (Twemoji 2b50 path, CC-BY 4.0) — the same family of shape
 * Telegram uses next to Star balances in the ecosystem.
 */
const STAR_PATH =
  'M27.287 34.627c-.404 0-.806-.124-1.152-.371L18 28.422l-8.135 5.834c-.693.496-1.623.496-2.312-.008-.689-.499-.979-1.385-.721-2.194l3.034-9.792-8.062-5.681c-.685-.505-.97-1.393-.708-2.203.264-.808 1.016-1.357 1.866-1.363L12.947 13l3.179-9.549c.268-.809 1.023-1.353 1.874-1.353.851 0 1.606.545 1.875 1.353L23 13l10.036.015c.853.006 1.606.556 1.867 1.363.263.81-.022 1.698-.708 2.203l-8.062 5.681 3.034 9.792c.26.809-.033 1.695-.72 2.194-.347.254-.753.379-1.16.379z';

const VB = 36;
const CX = 18;
const CY = 18;
const S = 100 / VB;

export function StarIcon({ size = 20, animate = true, glow = true }: Props) {
  const uid = useId().replace(/:/g, '');
  const id = `sg_${uid}`;
  const g = `translate(${50} ${50}) scale(${S}) translate(${-CX} ${-CY})`;

  return (
    <span className={`tg-star-wrap${animate ? ' tg-star-animated' : ''}`}
      style={{ width: size, height: size }}>

      {glow ? (
        <span className="tg-star-glow" style={{
          width: size * 1.55, height: size * 1.55,
          top: -(size * 0.28), left: -(size * 0.28),
        }} />
      ) : null}

      <svg className="tg-star-svg" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"
        style={{ width: size, height: size }}>
        <defs>
          <radialGradient id={`${id}_fill`} cx="38%" cy="32%" r="78%" gradientUnits="objectBoundingBox">
            <stop offset="0%"   stopColor="#FFE082" />
            <stop offset="35%"  stopColor="#FFCA28" />
            <stop offset="72%"  stopColor="#FFA000" />
            <stop offset="100%" stopColor="#E65100" />
          </radialGradient>
          <radialGradient id={`${id}_shine`} cx="32%" cy="28%" r="38%">
            <stop offset="0%"   stopColor="#FFFFFF" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
          </radialGradient>
          <clipPath id={`${id}_clip`} clipPathUnits="userSpaceOnUse">
            <g transform={g}>
              <path d={STAR_PATH} />
            </g>
          </clipPath>
        </defs>

        <g transform={g}>
          <path d={STAR_PATH} fill={`url(#${id}_fill)`} />
          <path d={STAR_PATH} fill={`url(#${id}_shine)`} />
        </g>

        {animate && (
          <g transform="rotate(-20 50 50)">
            <rect
              y="-18"
              width="26"
              height="136"
              rx="13"
              fill="rgba(255,255,255,0.24)"
              clipPath={`url(#${id}_clip)`}
            >
              <animate attributeName="x" values="-48;92;92;-48" keyTimes="0;0.42;0.58;1" dur="3.4s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0;0.95;0.95;0;0" keyTimes="0;0.06;0.44;0.52;1" dur="3.4s" repeatCount="indefinite" />
            </rect>
          </g>
        )}
      </svg>
    </span>
  );
}
