import type { SVGProps } from 'react';

export function TabDailyIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      {...props}
    >
      {/* Calendar body */}
      <rect x="3" y="6" width="18" height="15" rx="2"/>
      {/* Calendar top bar */}
      <rect x="3" y="4" width="18" height="4" rx="2"/>
      {/* White cutout top bar */}
      <rect x="4" y="8" width="16" height="1.5" fill="var(--tg-bg, #17212b)"/>
      {/* Left pin */}
      <rect x="7" y="2" width="2.5" height="5" rx="1.25" fill="var(--tg-bg, #17212b)"/>
      {/* Right pin */}
      <rect x="14.5" y="2" width="2.5" height="5" rx="1.25" fill="var(--tg-bg, #17212b)"/>
      {/* Star */}
      <path d="M12 10.5l1.2 2.4 2.7.4-2 1.9.5 2.7L12 16.6l-2.4 1.3.5-2.7-2-1.9 2.7-.4z" fill="var(--tg-bg, #17212b)"/>
    </svg>
  );
}
