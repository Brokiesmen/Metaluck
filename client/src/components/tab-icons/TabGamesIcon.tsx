import type { SVGProps } from 'react';

export function TabGamesIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      className="tab-games-icon"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      {...props}
    >
      <path
        d="M7.2 8.4h9.6c2.4 0 4.2 2.1 3.8 4.5l-.7 4.2c-.3 1.7-1.8 2.9-3.5 2.9h-1.9c-.9 0-1.7-.4-2.3-1l-.2-.2c-.6-.7-1.7-.7-2.3 0l-.2.2c-.6.6-1.4 1-2.3 1H5.6c-1.7 0-3.2-1.2-3.5-2.9l-.7-4.2c-.4-2.4 1.4-4.5 3.8-4.5Z"
        fill="currentColor"
        fillOpacity="0.2"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path d="M7 13h4M9 11v4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <circle cx="15.2" cy="12" r="1.1" fill="currentColor" />
      <circle cx="17.8" cy="14.3" r="1.1" fill="currentColor" />
    </svg>
  );
}
