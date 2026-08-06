import type { SVGProps } from 'react';

/** Кошелёк — outline; цвет/свечение через `.tab-wallet-icon`. */
export function TabWalletIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      className="tab-wallet-icon"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      {...props}
    >
      <path
        d="M4.5 7.75C4.5 6.23 5.73 5 7.25 5h10.5c.41 0 .75.34.75.75V8.5h1.25A1.75 1.75 0 0 1 21.5 10.25v7C21.5 18.77 20.27 20 18.75 20H7.25A2.75 2.75 0 0 1 4.5 17.25V7.75Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <path
        d="M4.5 9h13"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <circle cx="17.25" cy="13.75" r="1.15" fill="currentColor" />
    </svg>
  );
}
