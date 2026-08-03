"use client";

export function OkunLogo({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const scales = { sm: 0.72, md: 1, lg: 1.4 };
  const s = scales[size];

  const W = Math.round(204 * s);
  const H = Math.round(52 * s);

  const gid = `og-${size}`;
  const fid = `ogf-${size}`;

  return (
    <svg
      width={W}
      height={H}
      viewBox="0 0 204 52"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="ÖKUN Systems"
    >
      <defs>
        {/*
          Gradient matches reference: deep blue top-left → bright cyan bottom-right.
          gradientUnits="userSpaceOnUse" so it spans the icon area consistently.
        */}
        <linearGradient id={gid} x1="4" y1="6" x2="46" y2="46" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#1040b8" />
          <stop offset="55%" stopColor="#0090d8" />
          <stop offset="100%" stopColor="#00c8ff" />
        </linearGradient>

        {/* Glow: blur layer merged behind sharp layer */}
        <filter id={fid} x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* ── Icon mark ── */}
      {/*
        Circle center (26, 26) radius 20.
        Gap ~40° wide on left (160° to 200°):
          160°: x=26+20·cos(160°)=26-18.79=7.21, y=26+20·sin(160°)=26+6.84=32.84
          200°: x=7.21,                            y=26-6.84=19.16
        Arc from 200° to 160° clockwise (320° arc):
          large-arc=1, sweep=1
          M 7.21 19.16 A 20 20 0 1 1 7.21 32.84
        Arm: horizontal from x=1 through gap to circle centre (26,26), dot at centre.
      */}
      <g filter={`url(#${fid})`}>
        <path
          d="M 7.21 19.16 A 20 20 0 1 1 7.21 32.84"
          stroke={`url(#${gid})`}
          strokeWidth="2.6"
          strokeLinecap="round"
          fill="none"
        />
        <line
          x1="1"
          y1="26"
          x2="26"
          y2="26"
          stroke={`url(#${gid})`}
          strokeWidth="2.3"
          strokeLinecap="round"
        />
        <circle cx="26" cy="26" r="3" fill="#00c8ff" />
      </g>

      {/* ── Wordmark ── */}
      {/* "ÖKUN" — white, bold. The Ö is the correct brand name. */}
      <text
        x="58"
        y="33"
        fontFamily="'Space Grotesk', system-ui, sans-serif"
        fontSize="26"
        fontWeight="700"
        fill="#ffffff"
        letterSpacing="1"
      >
        ÖKUN
      </text>

      {/* Thin blue separator */}
      <line x1="58" y1="38" x2="202" y2="38" stroke="#1e3a8a" strokeWidth="0.7" />

      {/* "SYSTEMS" — electric blue, spaced */}
      <text
        x="59"
        y="49"
        fontFamily="'Space Grotesk', system-ui, sans-serif"
        fontSize="9"
        fontWeight="500"
        fill="#00b8ff"
        letterSpacing="6"
      >
        SYSTEMS
      </text>
    </svg>
  );
}
