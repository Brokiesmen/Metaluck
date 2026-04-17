import type { SVGProps } from 'react';

export function TabLeadersIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...props}
    >
      <path d="M8 21h8" />
      <path d="M12 17v4" />
      <path d="M7 4h10v6a5 5 0 0 1-10 0V4z" />
      <path d="M7 5H4v2a4 4 0 0 0 4 4" />
      <path d="M17 5h3v2a4 4 0 0 1-4 4" />
    </svg>
  );
}
