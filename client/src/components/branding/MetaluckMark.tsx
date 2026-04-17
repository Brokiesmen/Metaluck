import { useId } from 'react';

interface Props {
  size?: number;
  className?: string;
  title?: string;
}

/**
 * Знак METALUCK — два скруглённых луча (X/M), бирюзовый градиент.
 */
export function MetaluckMark({ size = 32, className, title }: Props) {
  const uid = useId().replace(/:/g, '');
  const gid = `mlg_${uid}`;

  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
    >
      {title ? <title>{title}</title> : null}
      <defs>
        <linearGradient id={gid} x1="4" y1="6" x2="46" y2="44" gradientUnits="userSpaceOnUse">
          <stop stopColor="#3FF5E8" />
          <stop offset="0.4" stopColor="#14D9C4" />
          <stop offset="1" stopColor="#0A7B70" />
        </linearGradient>
      </defs>
      <g transform="translate(24 24)">
        <rect x="-4.5" y="-17" width="9" height="34" rx="4.5" fill={`url(#${gid})`} transform="rotate(45)" />
        <rect x="-4.5" y="-17" width="9" height="34" rx="4.5" fill={`url(#${gid})`} transform="rotate(-45)" />
      </g>
    </svg>
  );
}
