import { useId } from 'react';
import type { SVGProps } from 'react';

/** Сквиркл с вырезом силуэта; фиолетовое неоновое свечение задаётся в CSS (`.tab-cabinet-icon`). */
export function TabCabinetIcon(props: SVGProps<SVGSVGElement>) {
  const uid = useId().replace(/:/g, '');

  return (
    <svg
      className="tab-cabinet-icon"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      {...props}
    >
      <defs>
        <mask id={`tc_mask_${uid}`} maskUnits="userSpaceOnUse">
          <rect x="2.5" y="2.5" width="19" height="19" rx="6.5" fill="white" />
          <circle cx="12" cy="10" r="3.25" fill="black" />
          <path
            d="M7.5 20.5h9c0-2.35-2.02-4.25-4.5-4.25S7.5 18.15 7.5 20.5z"
            fill="black"
          />
        </mask>
      </defs>
      <rect
        x="2.5"
        y="2.5"
        width="19"
        height="19"
        rx="6.5"
        fill="currentColor"
        mask={`url(#tc_mask_${uid})`}
      />
    </svg>
  );
}
