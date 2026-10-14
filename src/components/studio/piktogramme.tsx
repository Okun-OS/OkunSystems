import type { ReactNode } from "react";

/**
 * Die Zeichen des Studios.
 *
 * Vorher standen hier Emoji. Die sehen auf jedem Rechner anders aus, tragen
 * die Handschrift von Apple oder Google und lassen jede Oberfläche wie eine
 * Chatnachricht wirken — das ist der schnellste Weg, teuer Gebautes billig
 * aussehen zu lassen.
 *
 * Deshalb: eigene Zeichen, alle im selben 24er-Raster, alle mit derselben
 * Strichstärke, alle ohne Füllung. Sie erben Farbe und Strich von der
 * Umgebung, damit ein Zeichen im kalten Flur und im warmen Raum gleich
 * richtig aussieht.
 */

const ZEICHEN: Record<string, ReactNode> = {
  // ── Stationen eines Ablaufs ───────────────────────────────────────────
  st_receive: (
    <>
      <path d="M3 6.5h18v11H3z" />
      <path d="M3 7l9 6.5L21 7" />
    </>
  ),
  st_route: (
    <>
      <path d="M4 6v4a3 3 0 0 0 3 3h10" />
      <path d="M4 18v-2a3 3 0 0 1 3-3" />
      <path d="M14 10l3 3-3 3" />
    </>
  ),
  st_transfer: (
    <>
      <path d="M3 5.5h8v13H3z" />
      <path d="M13 5.5h8v13h-8z" />
      <path d="M11 9.5h2M11 14.5h2" />
      <path d="M6 9h2M6 12h2M16 9h2M16 12h2" />
    </>
  ),
  st_create: (
    <>
      <path d="M6 4h12v16H6z" />
      <path d="M9.5 4V2.6h5V4" />
      <path d="M9 11h6M9 15h4" />
    </>
  ),
  st_document: (
    <>
      <path d="M6 3h8l4 4v14H6z" />
      <path d="M14 3v4h4" />
      <path d="M9 12h6M9 16h6" />
    </>
  ),
  st_reply: (
    <>
      <path d="M9 7L4 12l5 5" />
      <path d="M4 12h9a6 6 0 0 1 6 6v1" />
    </>
  ),
  st_inform: (
    <>
      <path d="M4 10v4h3l6 4V6l-6 4H4z" />
      <path d="M17 9.5a4 4 0 0 1 0 5" />
      <path d="M19.5 7a7 7 0 0 1 0 10" />
    </>
  ),
  st_followup: (
    <>
      <circle cx="12" cy="13" r="8" />
      <path d="M12 9v4l3 2" />
      <path d="M9 2.5h6" />
    </>
  ),
  st_archive: (
    <>
      <path d="M3 5h18v4H3z" />
      <path d="M5 9v11h14V9" />
      <path d="M10 13h4" />
    </>
  ),

  // ── Räume ─────────────────────────────────────────────────────────────
  ablaeufe: (
    <>
      <circle cx="6" cy="6.5" r="2.6" />
      <circle cx="18" cy="17.5" r="2.6" />
      <path d="M8.6 6.5H15a3 3 0 0 1 0 6H9a3 3 0 0 0 0 6h6.4" />
    </>
  ),
  grundlagen: (
    <>
      <path d="M3 4h18v16H3z" />
      <path d="M3 9.3h18M3 14.6h18" />
      <path d="M8 4v5.3M14 9.3v5.3M10 14.6V20" />
    </>
  ),
  automationen: (
    <>
      <path d="M12 2.5l1.9 5.6 5.6 1.9-5.6 1.9-1.9 5.6-1.9-5.6L4.5 10l5.6-1.9z" />
      <path d="M18.5 16.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z" />
    </>
  ),
  workforce: (
    <>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3.5 19.5a5.5 5.5 0 0 1 11 0" />
      <circle cx="17.5" cy="9.5" r="2.4" />
      <path d="M16 15.2a4.6 4.6 0 0 1 4.5 4.3" />
    </>
  ),
  plan: (
    <>
      <path d="M4 4h16v13H4z" />
      <path d="M8 21h8" />
      <path d="M7.5 13l3.5-4 2.5 2.6L17 7" />
    </>
  ),

  // ── Dinge im Raum ─────────────────────────────────────────────────────
  hand: (
    <>
      <path d="M8.5 11V5.2a1.6 1.6 0 0 1 3.2 0V11" />
      <path d="M11.7 10.4V4.4a1.6 1.6 0 0 1 3.2 0v6.6" />
      <path d="M14.9 11V6.6a1.6 1.6 0 0 1 3.2 0v8.2a6 6 0 0 1-6 6h-1a5 5 0 0 1-4.3-2.5L4.6 14a1.7 1.7 0 0 1 2.8-1.9l1.1 1.6" />
    </>
  ),
  uhr: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5.2l3.4 2" />
    </>
  ),
  schloss: (
    <>
      <path d="M5.5 11h13v10h-13z" />
      <path d="M8.5 11V7.8a3.5 3.5 0 0 1 7 0V11" />
    </>
  ),
  pfeil: <path d="M5 12h13M13 7l5 5-5 5" />,
};

/**
 * Ein Zeichen an einer Stelle der Bühne.
 *
 * Zeichnet im Bühnenraster, nicht in CSS-Pixeln: `x`/`y` ist die Mitte,
 * `groesse` die Kantenlänge. So steht ein Zeichen auf einem Tisch, der
 * hinten im Raum kleiner ist, von allein ebenfalls kleiner da.
 */
export function Pikto({
  name,
  x,
  y,
  groesse = 24,
  strich = 1.6,
  farbe = "currentColor",
  deckkraft = 1,
}: {
  name: string;
  x: number;
  y: number;
  groesse?: number;
  strich?: number;
  farbe?: string;
  deckkraft?: number;
}) {
  const zeichen = ZEICHEN[name] ?? ZEICHEN.pfeil;
  const s = groesse / 24;
  return (
    <g
      transform={`translate(${x - groesse / 2} ${y - groesse / 2}) scale(${s})`}
      fill="none"
      stroke={farbe}
      strokeWidth={strich / s}
      strokeLinecap="round"
      strokeLinejoin="round"
      opacity={deckkraft}
    >
      {zeichen}
    </g>
  );
}

export function hatZeichen(name: string): boolean {
  return name in ZEICHEN;
}
