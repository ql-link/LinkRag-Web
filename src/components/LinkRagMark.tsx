import type { SVGProps } from 'react';

export function LinkRagMark({ darkMode }: { darkMode?: boolean }) {
  const nodeFill = darkMode ? '#dbeafe' : '#e4c690';
  const stroke = darkMode ? '#5b9cff' : '#c6a36a';

  return (
    <svg
      viewBox="0 0 64 64"
      aria-hidden="true"
      className="h-full w-full overflow-visible"
      fill="none"
      {...({} as SVGProps<SVGSVGElement>)}
    >
      <path
        d="M32 12 16 24 18 43 32 52 48 43 50 24 32 12M16 24 32 32 50 24M18 43 32 32 48 43M32 12v20M32 32v20"
        stroke={stroke}
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M50 24c4.2 2.7 4.2 9.2 0 12"
        stroke={stroke}
        strokeWidth="2.4"
        strokeLinecap="round"
        opacity="0.55"
      />
      {[
        [32, 12, 4.7],
        [16, 24, 5],
        [50, 24, 4.7],
        [18, 43, 4.7],
        [48, 43, 4.7],
        [32, 52, 5],
        [32, 32, 5.9],
      ].map(([cx, cy, r]) => (
        <circle
          key={`${cx}-${cy}`}
          cx={cx}
          cy={cy}
          r={r}
          fill={nodeFill}
          stroke={stroke}
          strokeWidth="1.4"
        />
      ))}
    </svg>
  );
}
