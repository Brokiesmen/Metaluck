import type { SVGProps } from 'react';

/** Solid gift box icon matching reference image. */
export function TabCasesIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      className="tab-cases-icon"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      {...props}
    >
      {/* Left bow loop */}
      <path d="M12 9C9 9 6.5 8.5 5 6.5C3.5 4.5 4.5 2 7 2C9.5 2 12 5.5 12 9Z"/>
      {/* Right bow loop */}
      <path d="M12 9C15 9 17.5 8.5 19 6.5C20.5 4.5 19.5 2 17 2C14.5 2 12 5.5 12 9Z"/>
      {/* Lid */}
      <rect x="2" y="9" width="20" height="3.5" rx="1.5"/>
      {/* Box left half */}
      <rect x="2" y="13.5" width="9" height="9" rx="1.5"/>
      {/* Box right half */}
      <rect x="13" y="13.5" width="9" height="9" rx="1.5"/>
    </svg>
  );
}
