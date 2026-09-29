/**
 * Die Bildmarke aus dem Logo, als SVG nachgebaut.
 *
 * Alle Maße stammen aus `public/okun-icon.png` und wurden dort ausgemessen:
 * Mittelpunkt (642|611,5), Radius 218, Strichstärke 23, die Lücke von 138°
 * bis 212°, der Punkt bei (658,5|611,5) mit Radius 26,5, der Balken auf
 * derselben Höhe ab x = 320. Das Koordinatensystem ist deshalb bewusst das
 * der Vorlage — so bleibt jede Zahl hier nachprüfbar.
 *
 * Als SVG und nicht als Bilddatei, weil die Vorlage einen schwarzen Grund
 * trägt, der über dem Kopffoto als Kasten stünde. Außerdem bleibt sie in
 * jeder Größe scharf und trägt die Markenfarbe, statt sie zu treffen.
 */
export function OkunRing({
  className = "",
  animated = true,
}: {
  className?: string;
  /** Der Lichtpunkt, der auf dem Ring umläuft. */
  animated?: boolean;
}) {
  return (
    <svg
      viewBox="290 350 610 525"
      className={className}
      fill="none"
      aria-hidden
      focusable="false"
    >
      <defs>
        {/* Von links tiefblau nach rechts hell — wie in der Vorlage. */}
        <linearGradient
          id="okun-ring-stroke"
          gradientUnits="userSpaceOnUse"
          x1="412"
          y1="0"
          x2="872"
          y2="0"
        >
          <stop offset="0%" stopColor="#1c79ff" />
          <stop offset="18%" stopColor="#3c97ff" />
          <stop offset="40%" stopColor="#a5e4fd" />
          <stop offset="62%" stopColor="#bcf7fe" />
          <stop offset="100%" stopColor="#c9fcfe" />
        </linearGradient>

        {/* Der Balken läuft links aus, statt hart abzubrechen. */}
        <linearGradient
          id="okun-ring-bar"
          gradientUnits="userSpaceOnUse"
          x1="300"
          y1="0"
          x2="660"
          y2="0"
        >
          <stop offset="0%" stopColor="#1c79ff" stopOpacity="0" />
          <stop offset="12%" stopColor="#2483ff" />
          <stop offset="45%" stopColor="#4ea4fe" />
          <stop offset="65%" stopColor="#a8e7fd" />
          <stop offset="100%" stopColor="#c4fafe" />
        </linearGradient>

        <filter id="okun-ring-glow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="7" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        <filter id="okun-ring-spark" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="9" />
        </filter>
      </defs>

      <g filter="url(#okun-ring-glow)">
        {/* Der Ring ist links offen, dort wo der Balken hineinläuft. */}
        <path
          d="M 457.13 495.98 A 218 218 0 1 1 479.99 757.37"
          stroke="url(#okun-ring-stroke)"
          strokeWidth="23"
          strokeLinecap="round"
        />
        <path
          d="M 320 611.5 H 658.5"
          stroke="url(#okun-ring-bar)"
          strokeWidth="23"
        />
        <circle cx="658.5" cy="611.5" r="26.5" fill="#c9fcfe" />
      </g>

      {/*
       * Der Lichtpunkt läuft auf derselben Bahn wie der Ring, oben also nach
       * rechts. `pathLength` normiert die Bahn auf 100 Einheiten, damit der
       * Strich im Stylesheet ohne die echte Bogenlänge auskommt.
       */}
      {animated && (
        <path
          className="okun-ring-lauf"
          d="M 457.13 495.98 A 218 218 0 1 1 479.99 757.37"
          stroke="#eafdff"
          strokeWidth="23"
          strokeLinecap="round"
          filter="url(#okun-ring-spark)"
          pathLength={100}
          strokeDasharray="7 93"
        />
      )}
    </svg>
  );
}
