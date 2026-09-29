/**
 * Die Bildmarke aus dem Logo.
 *
 * Der Inhalt ist die freigestellte Vorlage `public/marketing/okun-bildmarke.svg`
 * — unverändert übernommen, nur der Ausschnitt ist enger gefasst und der
 * umlaufende Lichtpunkt kommt hinzu. Eingebettet statt über `<img>` geladen,
 * weil der Lichtpunkt sonst nicht auf dieselbe Bahn gelegt werden kann.
 *
 * Die Bezeichner tragen ein Präfix: eine zweite Marke auf derselben Seite
 * würde sonst dieselben Verläufe ansprechen wie die erste.
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
      viewBox="250 355 650 515"
      className={className}
      fill="none"
      aria-hidden
      focusable="false"
    >
      <defs>
        <linearGradient
          id="okun-mark-ring"
          gradientUnits="userSpaceOnUse"
          x1="415"
          y1="612"
          x2="875"
          y2="612"
        >
          <stop offset="0%" stopColor="#0B67FF" />
          <stop offset="38%" stopColor="#4AAEFF" />
          <stop offset="70%" stopColor="#A9F2FF" />
          <stop offset="100%" stopColor="#C8FCFF" />
        </linearGradient>

        {/* Der Balken läuft links aus — wie in der Vorlage. */}
        <linearGradient
          id="okun-mark-line"
          gradientUnits="userSpaceOnUse"
          x1="275"
          y1="612"
          x2="665"
          y2="612"
        >
          <stop offset="0%" stopColor="#061833" stopOpacity="0" />
          <stop offset="14%" stopColor="#096CFF" stopOpacity="0.92" />
          <stop offset="38%" stopColor="#20A0FF" />
          <stop offset="68%" stopColor="#A7F2FF" />
          <stop offset="100%" stopColor="#C8FCFF" />
        </linearGradient>

        <radialGradient id="okun-mark-node" cx="35%" cy="35%" r="75%">
          <stop offset="0%" stopColor="#D7FFFF" />
          <stop offset="100%" stopColor="#A9F4FF" />
        </radialGradient>

        <filter
          id="okun-mark-glow"
          x="-35%"
          y="-35%"
          width="170%"
          height="170%"
          colorInterpolationFilters="sRGB"
        >
          <feGaussianBlur stdDeviation="9" />
        </filter>

        <filter
          id="okun-mark-spark"
          x="-40%"
          y="-40%"
          width="180%"
          height="180%"
          colorInterpolationFilters="sRGB"
        >
          <feGaussianBlur stdDeviation="11" />
        </filter>
      </defs>

      {/* Schein */}
      <g opacity="0.38" filter="url(#okun-mark-glow)" fill="none" strokeLinecap="butt">
        <path
          d="M 425.34 650.20 A 220 220 0 0 0 642 832 A 220 220 0 0 0 862 612 A 220 220 0 0 0 642 392 A 220 220 0 0 0 425.34 573.80"
          stroke="url(#okun-mark-ring)"
          strokeWidth="24"
        />
        <path d="M 275 612 L 652 612" stroke="url(#okun-mark-line)" strokeWidth="25" />
        <circle cx="652" cy="612" r="31" fill="#B8F8FF" stroke="none" />
      </g>

      {/* Marke */}
      <g fill="none" strokeLinecap="butt">
        <path
          d="M 425.34 650.20 A 220 220 0 0 0 642 832 A 220 220 0 0 0 862 612 A 220 220 0 0 0 642 392 A 220 220 0 0 0 425.34 573.80"
          stroke="url(#okun-mark-ring)"
          strokeWidth="22.5"
        />
        <path d="M 275 612 L 652 612" stroke="url(#okun-mark-line)" strokeWidth="23" />
        <circle cx="652" cy="612" r="30.5" fill="url(#okun-mark-node)" />
      </g>

      {/*
       * Der Lichtpunkt läuft auf der Bahn des Rings. `pathLength` normiert sie
       * auf 100 Einheiten, damit das Stylesheet ohne die echte Bogenlänge
       * auskommt.
       */}
      {animated && (
        <path
          className="okun-ring-lauf"
          d="M 425.34 650.20 A 220 220 0 0 0 642 832 A 220 220 0 0 0 862 612 A 220 220 0 0 0 642 392 A 220 220 0 0 0 425.34 573.80"
          stroke="#EAFDFF"
          strokeWidth="22.5"
          strokeLinecap="round"
          filter="url(#okun-mark-spark)"
          pathLength={100}
          strokeDasharray="6 94"
        />
      )}
    </svg>
  );
}
