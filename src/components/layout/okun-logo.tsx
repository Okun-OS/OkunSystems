"use client";

export function OkunLogo({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const scales = { sm: 0.7, md: 1, lg: 1.4 };
  const s = scales[size];

  return (
    <svg
      width={Math.round(100 * s)}
      height={Math.round(44 * s)}
      viewBox="0 0 100 44"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id={`metal-${size}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#e0e0e0" />
          <stop offset="50%" stopColor="#f0f0f0" />
          <stop offset="100%" stopColor="#b0b0b0" />
        </linearGradient>
        <linearGradient id={`green-line-${size}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="transparent" />
          <stop offset="40%" stopColor="#22c55e" />
          <stop offset="60%" stopColor="#4ade80" />
          <stop offset="100%" stopColor="transparent" />
        </linearGradient>
      </defs>
      <text
        x="0"
        y="30"
        fontFamily="Arial, sans-serif"
        fontSize="32"
        fontWeight="800"
        letterSpacing="2"
        fill={`url(#metal-${size})`}
      >
        OKUN
      </text>
      <line x1="0" y1="34" x2="98" y2="34" stroke={`url(#green-line-${size})`} strokeWidth="1" />
      <text
        x="1"
        y="43"
        fontFamily="Arial, sans-serif"
        fontSize="9"
        fontWeight="400"
        letterSpacing="7"
        fill="#666"
      >
        SYSTEMS
      </text>
    </svg>
  );
}
