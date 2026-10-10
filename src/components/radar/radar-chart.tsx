"use client";

import { useId } from "react";

import { useEinschlag, useZaehler } from "./einschlag";

import { DIMENSION_MAX } from "@/lib/radar/catalog";
import type { DimensionWert } from "@/lib/radar/live";

/**
 * Das Live-Diagramm.
 *
 * Fünf Achsen, eine Reihe. Bewusst **keine** zweite Reihe: Ein
 * „Branchen-Benchmark“ hätte Daten als Grundlage, die wir nicht haben — und
 * zwei übereinanderliegende Flächen sind ohnehin die häufigste Art, ein
 * Netzdiagramm unlesbar zu machen.
 *
 * Nicht erfasste Dimensionen bekommen **keinen Punkt**. Sie auf die Mitte zu
 * zeichnen hieße „null von fünf“ zu behaupten, und das hat niemand gesagt. Die
 * Fläche wächst stattdessen mit dem Gespräch: ein Punkt, eine Linie, ein
 * Dreieck, am Ende das Fünfeck. Genau das ist der Effekt, um den es geht — man
 * sieht den eigenen Betrieb entstehen.
 *
 * Die Farbe trägt hier keine Bedeutung; sie ist die Markenfarbe und markiert
 * eine einzige Reihe. Die Bedeutung steht in den Beschriftungen.
 */

type Props = {
  dimensionen: DimensionWert[];
  /** Kantenlänge der Zeichenfläche. */
  groesse?: number;
  kompakt?: boolean;
  /** Der umlaufende Strahl. Auf der Ergebnisseite steht er still. */
  sweep?: boolean;
};

const AKZENT = "#00b8ff";
const GITTER = "#17304d";
const SPEICHE = "#12243c";

/** Umfang eines Polygons — Grundlage für die Zeichenbewegung der Kante. */
function umfang(punkte: Array<{ x: number; y: number }>): number {
  let laenge = 0;
  for (let i = 0; i < punkte.length; i++) {
    const a = punkte[i];
    const b = punkte[(i + 1) % punkte.length];
    laenge += Math.hypot(b.x - a.x, b.y - a.y);
  }
  return Math.ceil(laenge);
}

export function RadarChart({ dimensionen, groesse = 300, kompakt, sweep = true }: Props) {
  const { getroffen, marke } = useEinschlag(dimensionen);
  const mitte = groesse / 2;
  const radius = mitte - (kompakt ? 10 : 14);
  const n = dimensionen.length;

  // Erste Achse zeigt nach oben, dann im Uhrzeigersinn.
  const winkel = (i: number) => (i / n) * 2 * Math.PI - Math.PI / 2;
  const punkt = (i: number, anteil: number) => ({
    x: mitte + Math.cos(winkel(i)) * radius * anteil,
    y: mitte + Math.sin(winkel(i)) * radius * anteil,
  });

  /**
   * Der Abstand eines Messpunkts vom Mittelpunkt.
   *
   * Mit einem Sockel: Eine glatte Null säße sonst genau im Zentrum und wäre
   * dort von „noch nicht erfasst“ nicht zu unterscheiden — die Fläche
   * verschwände, obwohl eine Antwort vorliegt. Der Sockel ist reine
   * Darstellung; die Zahl daneben bleibt die gemessene. Deshalb steht neben
   * jedem Punkt der Wert, und zwar ungerundet auf eine Nachkommastelle.
   */
  const SOCKEL = 0.1;
  const abstand = (wert: number) => SOCKEL + (wert / DIMENSION_MAX) * (1 - SOCKEL);

  const ringe = Array.from({ length: DIMENSION_MAX }, (_, r) => (r + 1) / DIMENSION_MAX);
  /*
    Je Instanz eigene Kennungen für Verlauf und Weichzeichner.

    Vorher waren sie aus den Dimensionsnamen gebildet und damit in jedem
    Diagramm gleich. Standen zwei auf einer Seite — im Steuerpult des Closers
    war genau das der Fall —, kollidierten die Kennungen und die Fläche
    verschwand in beiden. `useId` liefert pro Einbindung eine eigene.
  */
  const id = useId().replace(/:/g, "");

  const gemessen = dimensionen
    .map((d, i) => ({ d, i }))
    .filter((x) => x.d.wert !== null)
    .map((x) => ({ ...x, p: punkt(x.i, abstand(x.d.wert as number)) }));

  const flaeche = gemessen.map((x) => `${x.p.x},${x.p.y}`).join(" ");

  return (
    <svg
      width={groesse}
      height={groesse}
      viewBox={`0 0 ${groesse} ${groesse}`}
      role="img"
      aria-label={`Netzdiagramm: ${dimensionen
        .map((d) => `${d.label} ${d.wert === null ? "noch offen" : `${d.wert} von ${DIMENSION_MAX}`}`)
        .join(", ")}`}
      className="overflow-visible"
    >
      <defs>
        {/*
          Die Fläche bekommt einen Verlauf statt einer glatten Deckfarbe: Von
          der Mitte nach außen heller, damit sie nicht wie ein ausgeschnittenes
          Stück Papier auf dem Gitter liegt.
        */}
        <radialGradient id={`${id}-flaeche`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={AKZENT} stopOpacity={0.05} />
          <stop offset="70%" stopColor={AKZENT} stopOpacity={0.2} />
          <stop offset="100%" stopColor="#2ee6c5" stopOpacity={0.26} />
        </radialGradient>
        <linearGradient id={`${id}-kante`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={AKZENT} />
          <stop offset="100%" stopColor="#2ee6c5" />
        </linearGradient>
        {/* Der Strahl: voll an der Kante, durchsichtig zur Mitte hin. */}
        <linearGradient
          id={`${id}-strahl`}
          gradientUnits="userSpaceOnUse"
          x1={mitte}
          y1={mitte}
          x2={mitte + radius}
          y2={mitte}
        >
          <stop offset="0%" stopColor={AKZENT} stopOpacity={0} />
          <stop offset="100%" stopColor={AKZENT} stopOpacity={0.1} />
        </linearGradient>
        <filter id={`${id}-schein`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="4" result="weich" />
          <feMerge>
            <feMergeNode in="weich" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      {/* Gitter — zurückhaltend, es ist Hintergrund und keine Aussage. */}
      {ringe.map((anteil, r) => (
        <polygon
          key={r}
          points={dimensionen
            .map((_, i) => {
              const p = punkt(i, anteil);
              return `${p.x},${p.y}`;
            })
            .join(" ")}
          fill="none"
          stroke={GITTER}
          strokeWidth={r === ringe.length - 1 ? 1 : 0.6}
          opacity={r === ringe.length - 1 ? 0.9 : 0.5}
        />
      ))}

      {/*
        Der umlaufende Strahl.

        Das Ding heißt Radar — ein Strahl, der die Fläche abtastet, ist hier
        kein Effekt, sondern das Bild, das der Name verspricht. Langsam und
        blass, damit er im Gespräch nicht den Blick von der Frage zieht.
      */}
      {sweep && (
        <g className="diagramm-sweep" style={{ transformOrigin: `${mitte}px ${mitte}px` }}>
          <path
            d={`M ${mitte} ${mitte} L ${mitte + radius} ${mitte} A ${radius} ${radius} 0 0 0 ${
              mitte + radius * Math.cos(-Math.PI / 4.5)
            } ${mitte + radius * Math.sin(-Math.PI / 4.5)} Z`}
            fill={`url(#${id}-strahl)`}
          />
        </g>
      )}

      {dimensionen.map((d, i) => {
        const aussen = punkt(i, 1);
        return (
          <line
            key={d.key}
            x1={mitte}
            y1={mitte}
            x2={aussen.x}
            y2={aussen.y}
            stroke={SPEICHE}
            strokeWidth={0.8}
            // Eine Achse ohne Antwort ist gestrichelt — man sieht, dass dort
            // noch nichts steht, statt es raten zu müssen.
            strokeDasharray={d.wert === null ? "3 4" : undefined}
          />
        );
      })}

      {/* Die erfasste Fläche. Wächst mit jeder Antwort. */}
      {gemessen.length >= 3 && (
        <>
          <polygon
            points={flaeche}
            fill={`url(#${id}-flaeche)`}
            className="transition-all duration-700 ease-out"
          />
          {/* Dieselbe Kante zweimal: einmal weichgezeichnet als Schein, einmal scharf. */}
          <polygon
            points={flaeche}
            fill="none"
            stroke={`url(#${id}-kante)`}
            strokeWidth={2.5}
            strokeLinejoin="round"
            opacity={0.5}
            filter={`url(#${id}-schein)`}
            className="transition-all duration-700 ease-out"
          />
          <polygon
            points={flaeche}
            fill="none"
            stroke={`url(#${id}-kante)`}
            strokeWidth={2}
            strokeLinejoin="round"
            className="radar-zeichnen transition-all duration-700 ease-out"
            style={{ ["--umfang" as string]: `${umfang(gemessen.map((x) => x.p))}` }}
            // Der Schlüssel erzwingt einen Neuaufbau, sobald sich die Form
            // ändert — sonst liefe die Zeichenbewegung nur ein einziges Mal.
            key={flaeche}
          />
        </>
      )}
      {gemessen.length === 2 && (
        <line
          x1={gemessen[0].p.x}
          y1={gemessen[0].p.y}
          x2={gemessen[1].p.x}
          y2={gemessen[1].p.y}
          stroke={AKZENT}
          strokeWidth={2}
          strokeLinecap="round"
        />
      )}

      {/* Messpunkte. Groß genug, dass sie auch auf dem Telefon treffbar sind. */}
      {gemessen.map((x) => (
        <g key={x.d.key} className="transition-all duration-700 ease-out">
          {/* Der Einschlag: eine Welle genau dort, wo die Antwort gelandet ist. */}
          {getroffen === x.d.key && (
            <circle
              key={marke}
              className="einschlag-welle"
              cx={x.p.x}
              cy={x.p.y}
              r={9}
              fill="none"
              stroke={AKZENT}
              strokeWidth={2}
              style={{ transformOrigin: `${x.p.x}px ${x.p.y}px` }}
            />
          )}
          <circle cx={x.p.x} cy={x.p.y} r={7} fill={AKZENT} opacity={0.18} />
          <circle cx={x.p.x} cy={x.p.y} r={5} fill="#070d17" />
          <circle cx={x.p.x} cy={x.p.y} r={3.6} fill={AKZENT}>
            <title>{`${x.d.label}: ${x.d.wert} von ${DIMENSION_MAX}`}</title>
          </circle>
        </g>
      ))}

      {/* Offene Achsen: ein hohler Ring am Rand statt eines Punktes in der Mitte. */}
      {dimensionen.map((d, i) => {
        if (d.wert !== null) return null;
        const p = punkt(i, 1);
        return (
          <circle
            key={d.key}
            cx={p.x}
            cy={p.y}
            r={3.5}
            fill="none"
            stroke="#2a3a55"
            strokeWidth={1.2}
            strokeDasharray="2 2"
          >
            <title>{`${d.label}: noch nicht erfasst`}</title>
          </circle>
        );
      })}
    </svg>
  );
}

/**
 * Die Beschriftungen neben dem Diagramm.
 *
 * Bewusst außerhalb des SVG: Als HTML brechen sie um, lassen sich auswählen
 * und bleiben auf einem schmalen Bildschirm lesbar. In das Diagramm gesetzt
 * würden sie sich bei fünf Achsen gegenseitig überlagern.
 */
export function DimensionsListe({
  dimensionen,
  kompakt,
}: {
  dimensionen: DimensionWert[];
  kompakt?: boolean;
}) {
  const { getroffen, marke } = useEinschlag(dimensionen);

  return (
    <ul className={`space-y-2 ${kompakt ? "text-[11px]" : "text-[11.5px]"}`}>
      {dimensionen.map((d) => (
        <DimensionsZeile
          key={d.key}
          dimension={d}
          getroffen={getroffen === d.key}
          marke={marke}
        />
      ))}
    </ul>
  );
}

function DimensionsZeile({
  dimension: d,
  getroffen,
  marke,
}: {
  dimension: DimensionWert;
  getroffen: boolean;
  marke: number;
}) {
  // Die Zahl läuft auf ihren neuen Wert zu, statt zu springen. Eine springende
  // Zahl liest sich wie ein Formularfeld, eine zulaufende wie eine Messung.
  const gezaehlt = useZaehler(d.wert);
  const anzeige = gezaehlt ?? d.wert;

  return (
    <li
      key={getroffen ? marke : "ruhig"}
      className={`rounded-lg px-1.5 -mx-1.5 py-0.5 ${getroffen ? "einschlag-zeile" : ""}`}
    >
      <div className="flex items-center justify-between gap-2 mb-1">
        <span className={d.wert === null ? "text-[#4a6383]" : "text-[#c9d4e4]"}>{d.label}</span>
        {d.wert === null ? (
          <span className="text-[#3f5572] flex-shrink-0 text-[9.5px] uppercase tracking-[0.12em]">
            noch offen
          </span>
        ) : (
          <span className="text-[#eef2f7] font-semibold tabular-nums flex-shrink-0">
            {(anzeige ?? 0).toLocaleString("de-DE", {
              minimumFractionDigits: 1,
              maximumFractionDigits: 1,
            })}
            <span className="text-[#3f5572] font-normal"> / {DIMENSION_MAX},0</span>
          </span>
        )}
      </div>
      {/*
        Ein Balken je Dimension, zusätzlich zum Netz.
        Das Netz zeigt die Form, der Balken den einzelnen Wert — aus einem
        Fünfeck eine Zahl abzulesen gelingt niemandem zuverlässig.
      */}
      <div className="h-[3px] rounded-full bg-[#0d1b2c] overflow-hidden">
        {d.wert !== null && (
          <div
            className="h-full rounded-full bg-[linear-gradient(90deg,#00b8ff,#2ee6c5)] transition-[width] duration-700 ease-out"
            style={{ width: `${((anzeige ?? 0) / DIMENSION_MAX) * 100}%` }}
          />
        )}
      </div>
    </li>
  );
}
