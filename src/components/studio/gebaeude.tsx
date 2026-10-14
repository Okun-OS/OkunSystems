"use client";

import { useMemo } from "react";
import type { Fahrzeug } from "@/lib/strategie/haus";

/**
 * Das Haus von außen.
 *
 * Gezeichnet, nicht gerendert — und zwar bewusst in **Ebenen**: Himmel,
 * Stadt, Boden, Haus, Vordergrund. Jede Ebene ist austauschbar. Wenn später
 * echte Renderings kommen, tritt ein Bild an die Stelle einer Zeichnung,
 * ohne dass die Szene, die Hotspots oder die Kamerafahrt sich ändern.
 *
 * Deshalb steht der Firmenname auch **nicht im Bild**, sondern als eigene
 * Schicht darüber: Sonst bräuchte jeder Kunde sein eigenes Rendering.
 *
 * Alles hier ist Dekoration. Keine Aussage über den Betrieb hängt daran —
 * das Haus ist der Rahmen, die Zahlen stehen in den Räumen.
 */

export function Gebaeude({
  schild,
  untertitel,
  stockwerke,
  fahrzeug,
  onTuer,
  erleuchtet = false,
}: {
  /** Der kurze Name auf dem Leuchtschild. */
  schild: string;
  /** Die Zeile darüber — meist die Branche. */
  untertitel?: string | null;
  stockwerke: number;
  fahrzeug: Fahrzeug;
  onTuer: () => void;
  /**
   * Am Ende des Rundgangs brennt im ganzen Haus Licht.
   *
   * Dasselbe Haus, dieselben Fenster an denselben Stellen — nur sind die
   * dunklen jetzt auch an. Dass es derselbe Baukörper ist, macht den
   * Unterschied sichtbar; ein zweites Haus würde ihn verstecken.
   */
  erleuchtet?: boolean;
}) {
  // Die Fenster werden einmal gewürfelt und bleiben dann stehen. Ein Haus,
  // dessen Fenster bei jedem Zeichnen woanders brennen, flackert.
  const fenster = useMemo(() => {
    const reihen = Math.max(1, stockwerke - 1);
    const zufall = mischer(schild.length * 7 + stockwerke * 13);
    const liste: Array<{ r: number; c: number; warm: boolean; an: boolean }> = [];
    for (let r = 0; r < reihen; r++) {
      for (let c = 0; c < 9; c++) {
        liste.push({ r, c, warm: zufall() > 0.62, an: zufall() > 0.26 });
      }
    }
    return { reihen, liste };
  }, [schild, stockwerke]);

  const hoehe = 150 + fenster.reihen * 62;
  const dach = 470 - hoehe;

  return (
    <svg viewBox="0 0 980 620" className="w-full h-auto block overflow-visible">
      <defs>
        <linearGradient id="fas" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#16293f" />
          <stop offset=".55" stopColor="#101f31" />
          <stop offset="1" stopColor="#0a1626" />
        </linearGradient>
        <linearGradient id="seite" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#0a1626" />
          <stop offset="1" stopColor="#060e1a" />
        </linearGradient>
        <linearGradient id="glasfront" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#7fd9ff" stopOpacity=".30" />
          <stop offset="1" stopColor="#1a6c99" stopOpacity=".12" />
        </linearGradient>
        <linearGradient id="kegelG" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#9fe4ff" stopOpacity=".5" />
          <stop offset="1" stopColor="#9fe4ff" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="spiegel" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#12304a" stopOpacity=".55" />
          <stop offset="1" stopColor="#12304a" stopOpacity="0" />
        </linearGradient>
        <filter id="weich" x="-55%" y="-55%" width="210%" height="210%">
          <feGaussianBlur stdDeviation="16" />
        </filter>
      </defs>

      {/* Spiegelung im nassen Asphalt */}
      <rect x="150" y="470" width="680" height="150" fill="url(#spiegel)" opacity=".5" />

      {/* Baukörper */}
      <path d={`M150,470 L150,${dach + 100} L265,${dach + 65} L265,470 Z`} fill="url(#seite)" />
      <rect x="265" y={dach} width="450" height={hoehe} fill="url(#fas)" />
      <path d={`M715,470 L715,${dach} L830,${dach + 46} L830,470 Z`} fill="url(#seite)" />
      <rect x="258" y={dach - 6} width="464" height="7" fill="#1d3d5c" />
      <rect x="262" y={dach - 4} width="456" height="2" fill="#4fb4e6" opacity=".65" />

      {/* Fensterraster */}
      <g className="studio-fenster">
        {fenster.liste.map(({ r, c, warm, an: nachts }) => {
          const an = erleuchtet || nachts;
          return (
            <rect
              key={`${r}-${c}`}
              x={288 + c * 47}
              y={dach + 32 + r * 62}
              width="33"
              height="44"
              rx="2"
              fill={an ? (warm ? "#d9a44e" : "#6fc4ef") : "#0d1c2d"}
              opacity={
                an
                  ? (warm ? 0.5 : 0.38) + (erleuchtet ? 0.16 : 0)
                  : 0.85
              }
              style={
                // Die zuletzt angegangenen Fenster kommen gestaffelt dazu.
                erleuchtet && !nachts
                  ? { animation: `studio-fenster-an .9s ease-out ${0.5 + (r * 9 + c) * 0.045}s both` }
                  : undefined
              }
            />
          );
        })}
      </g>

      {/* Seitenflügel */}
      {[0, 1, 2, 3].map((r) => (
        <g key={r}>
          <rect x="176" y={dach + 88 + r * 58} width="26" height="38" rx="2" fill="#5fb0d8" opacity=".2" />
          <rect x="218" y={dach + 88 + r * 58} width="26" height="38" rx="2" fill="#d9a44e" opacity=".22" />
        </g>
      ))}

      {/* Erdgeschoss */}
      <rect x="265" y="380" width="450" height="90" fill="url(#glasfront)" />
      {Array.from({ length: 8 }, (_, i) => (
        <line key={i} x1={265 + i * 56.25} y1="380" x2={265 + i * 56.25} y2="470"
          stroke="#2b5f85" strokeWidth="1" opacity=".5" />
      ))}

      {/* Vordach */}
      <path d="M400,372 L580,372 L596,356 L384,356 Z" fill="#15293e" />
      <rect x="398" y="370" width="184" height="3" fill="#53bde8" opacity=".75" />

      {/* Lichtkegel vor der Tür */}
      <path className="studio-kegel" d="M448,374 L532,374 L596,560 L384,560 Z"
        fill="url(#kegelG)" filter="url(#weich)" />

      {/* Die Tür — der einzige anklickbare Teil des Bildes */}
      <g
        className="studio-tuer cursor-pointer"
        onClick={onTuer}
        role="button"
        tabIndex={0}
        aria-label="Studio betreten"
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onTuer();
          }
        }}
      >
        <rect x="448" y="386" width="84" height="84" rx="3" fill="#081624" stroke="#2d6a93" strokeWidth="1.5" />
        <rect className="studio-tuerlicht" x="450" y="388" width="80" height="80" rx="2" fill="#9fe4ff" opacity=".12" />
        <line x1="490" y1="390" x2="490" y2="468" stroke="#3f87b4" strokeWidth="1" />
        <circle cx="481" cy="430" r="2.6" fill="#7fd9ff" />
        <circle cx="499" cy="430" r="2.6" fill="#7fd9ff" />
      </g>

      {/* Das Schild — eigene Schicht, damit der Name austauschbar bleibt */}
      <g className="studio-schild">
        <rect x="300" y={dach - 54} width="380" height="40" rx="7" fill="#050f1c" stroke="#1d4e74" strokeWidth="1" />
        <text x="490" y={dach - 26} textAnchor="middle" fontSize="26" fontWeight="700"
          letterSpacing=".07em" fill="#eaf6ff" fontFamily="var(--font-space-grotesk)">
          {schild}
        </text>
        {untertitel && (
          <text x="490" y={dach - 62} textAnchor="middle" fontSize="9.5" fill="#4d93ba"
            letterSpacing="5" fontFamily="var(--font-geist-mono)">
            {untertitel.toUpperCase()}
          </text>
        )}
      </g>

      {fahrzeug !== "kein" && <Firmenwagen art={fahrzeug} schild={schild} />}
    </svg>
  );
}

/** Das Fahrzeug vor der Tür — die Form kommt aus der Branche. */
function Firmenwagen({ art, schild }: { art: Fahrzeug; schild: string }) {
  const form =
    art === "lkw"
      ? "M86,470 L86,420 L128,420 L146,404 L246,404 L252,420 L286,420 L286,470 Z"
      : art === "kleinwagen"
        ? "M132,470 L132,440 L156,440 L174,424 L224,424 L236,440 L258,440 L258,470 Z"
        : "M120,470 L120,432 L150,432 L168,412 L232,412 L240,432 L268,432 L268,470 Z";
  const raeder = art === "lkw" ? [112, 180, 258] : art === "kleinwagen" ? [156, 236] : [150, 242];

  return (
    <g opacity=".92">
      <path d={form} fill="#0c1b2c" />
      <rect x={art === "kleinwagen" ? 178 : 172} y={art === "lkw" ? 408 : 416}
        width="52" height="18" rx="2" fill="#17384f" opacity=".8" />
      <text x={art === "lkw" ? 186 : 194} y={art === "lkw" ? 450 : 456} textAnchor="middle"
        fontSize="11" fill="#3f87b4" fontWeight="700" letterSpacing="1"
        fontFamily="var(--font-space-grotesk)">
        {schild}
      </text>
      {raeder.map((cx) => (
        <circle key={cx} cx={cx} cy="470" r="13" fill="#060e1a" />
      ))}
    </g>
  );
}

/**
 * Ein kleiner, wiederholbarer Zufall.
 *
 * Damit dasselbe Haus bei jedem Aufruf dieselben erleuchteten Fenster hat —
 * und zwei verschiedene Betriebe trotzdem verschieden aussehen.
 */
function mischer(saat: number) {
  let s = saat % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}
