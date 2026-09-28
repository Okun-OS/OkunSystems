/**
 * Der leuchtende Ring aus dem Logo, als Bildmotiv.
 *
 * Bewusst als SVG und nicht als Bilddatei: Er bleibt bei jeder Größe scharf,
 * lädt ohne zweite Anfrage und trägt die Markenfarbe, statt sie zu treffen.
 */
export function OkunRing({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 320 320"
      className={className}
      fill="none"
      aria-hidden
      focusable="false"
    >
      <defs>
        <linearGradient id="okun-ring-stroke" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0%" stopColor="#0b4a8f" />
          <stop offset="45%" stopColor="#1d8ee0" />
          <stop offset="100%" stopColor="#bfe6ff" />
        </linearGradient>
        <linearGradient id="okun-ring-bar" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#0d3f77" stopOpacity="0" />
          <stop offset="60%" stopColor="#2a93e6" />
          <stop offset="100%" stopColor="#dff2ff" />
        </linearGradient>
        <filter id="okun-ring-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="10" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <g filter="url(#okun-ring-glow)">
        {/* Der Ring ist oben offen — wie im Logo. */}
        <path
          d="M 160 28 A 132 132 0 1 1 159 28"
          stroke="url(#okun-ring-stroke)"
          strokeWidth="13"
          strokeLinecap="round"
          pathLength={100}
          strokeDasharray="94 6"
          transform="rotate(166 160 160)"
        />
        <rect x="18" y="153" width="146" height="13" rx="6.5" fill="url(#okun-ring-bar)" />
        <circle cx="168" cy="159.5" r="17" fill="#eaf7ff" />
      </g>
    </svg>
  );
}
