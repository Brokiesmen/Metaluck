import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement>;

function base(props: IconProps) {
  return {
    width: 20,
    height: 20,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.75,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true as const,
    ...props,
  };
}

export function IconDashboard(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect x="3" y="3" width="8" height="8" rx="1.5" />
      <rect x="13" y="3" width="8" height="5" rx="1.5" />
      <rect x="13" y="10" width="8" height="11" rx="1.5" />
      <rect x="3" y="13" width="8" height="8" rx="1.5" />
    </svg>
  );
}

export function IconProfile(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 19.5c1.8-3.2 4.2-4.8 7-4.8s5.2 1.6 7 4.8" />
    </svg>
  );
}

export function IconWallet(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M3 8.5A2.5 2.5 0 0 1 5.5 6h13A2.5 2.5 0 0 1 21 8.5v9A2.5 2.5 0 0 1 18.5 20h-13A2.5 2.5 0 0 1 3 17.5v-9Z" />
      <path d="M3 10h18" />
      <circle cx="17" cy="15" r="1.2" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function IconGames(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect x="3" y="7" width="18" height="11" rx="3" />
      <path d="M8 12.5h3M9.5 11v3" />
      <circle cx="15.5" cy="11.5" r="1" fill="currentColor" stroke="none" />
      <circle cx="18" cy="14" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function IconRewards(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M12 4v16" />
      <path d="M7 8h10l-1.2 3.5a4.5 4.5 0 0 1-8.6 0L7 8Z" />
      <path d="M8.5 4.5h7" />
    </svg>
  );
}

export function IconSettings(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3.5v2.2M12 18.3v2.2M4.9 7.5l1.9 1.1M17.2 15.4l1.9 1.1M3.5 12h2.2M18.3 12h2.2M4.9 16.5l1.9-1.1M17.2 8.6l1.9-1.1" />
    </svg>
  );
}

export function IconLogout(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M10 5H6.5A2.5 2.5 0 0 0 4 7.5v9A2.5 2.5 0 0 0 6.5 19H10" />
      <path d="M14 8l4 4-4 4M9 12h9" />
    </svg>
  );
}

export function IconLeaders(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M8 20V11M12 20V6M16 20v-5" />
      <path d="M5.5 20h13" />
    </svg>
  );
}

export function IconBell(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M6.5 16.5h11l-1.2-1.8V10a4.3 4.3 0 1 0-8.6 0v4.7L6.5 16.5Z" />
      <path d="M10 18.5a2 2 0 0 0 4 0" />
    </svg>
  );
}
