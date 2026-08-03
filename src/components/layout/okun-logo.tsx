"use client";

export function OkunLogo({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const scales = { sm: 0.72, md: 1, lg: 1.4 };
  const s = scales[size];

  const W = Math.round(192 * s);
  const H = Math.round(48 * s);

  // Unique gradient ID per size to avoid SVG ID collisions across instances
  const gid = `okun-g-${size}`;

  return (
    <svg
      width={W}
      height={H}
      viewBox="0 0 192 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="OKUN Systems"
    >
      <defs>
        {/* Vertical gradient top=deep-blue → bottom=electric-cyan, across icon area */}
        <linearGradient id={gid} x1="24" y1="4" x2="24" y2="44" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#1e5dc8" />
          <stop offset="100%" stopColor="#00b8ff" />
        </linearGradient>
      </defs>

      {/* ── Icon mark ── */}
      {/*
        Circle: center (24, 24), radius 18
        Gap on left (9 o'clock), from 205° to 155° — 310° arc clockwise.
        205°: x=24+18·cos(205°)=24-16.31=7.69, y=24+18·sin(205°)=24-7.61=16.39
        155°: x=7.69,            y=24+7.61=31.61
        SVG arc: M start A rx ry 0 large-arc sweep end
        large-arc=1 (310°>180°), sweep=1 (clockwise)
      */}
      <path
        d="M 7.69 16.39 A 18 18 0 1 1 7.69 31.61"
        stroke={`url(#${gid})`}
        strokeWidth="2.4"
        strokeLinecap="round"
        fill="none"
      />

      {/* Arm: horizontal from outside-left → center of circle */}
      <line
        x1="1"
        y1="24"
        x2="24"
        y2="24"
        stroke={`url(#${gid})`}
        strokeWidth="2.2"
        strokeLinecap="round"
      />

      {/* Dot at arm tip (circle centre) */}
      <circle cx="24" cy="24" r="2.6" fill="#00b8ff" />

      {/* ── Wordmark ── */}
      {/* "OKUN" — white, bold */}
      <text
        x="54"
        y="30"
        fontFamily="'Space Grotesk', system-ui, sans-serif"
        fontSize="23"
        fontWeight="700"
        fill="#eef2f7"
        letterSpacing="1.5"
      >
        OKUN
      </text>

      {/* Thin separator line */}
      <line x1="54" y1="35" x2="190" y2="35" stroke="#1e3a8a" strokeWidth="0.75" />

      {/* "SYSTEMS" — electric blue, tracked */}
      <text
        x="55"
        y="45"
        fontFamily="'Space Grotesk', system-ui, sans-serif"
        fontSize="8.5"
        fontWeight="500"
        fill="#00b8ff"
        letterSpacing="5.5"
      >
        SYSTEMS
      </text>
    </svg>
  );
}
