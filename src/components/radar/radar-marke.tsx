"use client";

import { useId } from "react";

/**
 * Die OKUN-Bildmarke mit Radarwellen.
 *
 * Warum die Pfade hier noch einmal stehen und nicht `OkunRing` eingebunden
 * wird: Der Ring der Bildmarke sitzt bei (642, 612), die Mitte ihres
 * Zeichenrahmens aber bei (575, 612) — der waagerechte Balken läuft nach
 * links hinaus und zieht den Rahmen mit. Wer die Marke mittig setzt, setzt
 * damit **den Rahmen** mittig, und der Ring steht 67 Einheiten daneben.
 * Genau das war am ersten Übergang zu sehen: Der Kreis dahinter war richtig,
 * die Marke stand schief.
 *
 * Hier liegt alles in einem einzigen Koordinatensystem, dessen Mitte der
 * Ringmittelpunkt ist. Wellen, Sweep, Marke und die Schrift darunter teilen
 * sich damit eine Achse — ohne Rechnerei mit Versätzen, die beim nächsten
 * Größenwechsel wieder nicht stimmt.
 */

/** Mittelpunkt des Rings in den Koordinaten der Vorlage. */
const MX = 642;
const MY = 612;
/** Halbe Kantenlänge des quadratischen Ausschnitts um diesen Punkt. */
const HALB = 420;

export function RadarMarke({
  className = "",
  wellen = true,
  sweep = true,
}: {
  className?: string;
  /** Die Wellen, die vom Logo nach außen laufen. */
  wellen?: boolean;
  /** Der umlaufende Radarstrahl. */
  sweep?: boolean;
}) {
  const uid = useId().replace(/:/g, "");
  const id = (name: string) => `${uid}-${name}`;

  const bogen =
    "M 425.34 650.20 A 220 220 0 0 0 642 832 A 220 220 0 0 0 862 612 A 220 220 0 0 0 642 392 A 220 220 0 0 0 425.34 573.80";

  return (
    <svg
      viewBox={`${MX - HALB} ${MY - HALB} ${HALB * 2} ${HALB * 2}`}
      className={className}
      fill="none"
      aria-hidden
      focusable="false"
    >
      <defs>
        <linearGradient id={id("ring")} gradientUnits="userSpaceOnUse" x1="415" y1="612" x2="875" y2="612">
          <stop offset="0%" stopColor="#0B67FF" />
          <stop offset="38%" stopColor="#4AAEFF" />
          <stop offset="70%" stopColor="#A9F2FF" />
          <stop offset="100%" stopColor="#C8FCFF" />
        </linearGradient>
        <linearGradient id={id("line")} gradientUnits="userSpaceOnUse" x1="275" y1="612" x2="665" y2="612">
          <stop offset="0%" stopColor="#061833" stopOpacity="0" />
          <stop offset="14%" stopColor="#096CFF" stopOpacity="0.92" />
          <stop offset="38%" stopColor="#20A0FF" />
          <stop offset="68%" stopColor="#A7F2FF" />
          <stop offset="100%" stopColor="#C8FCFF" />
        </linearGradient>
        <radialGradient id={id("node")} cx="35%" cy="35%" r="75%">
          <stop offset="0%" stopColor="#D7FFFF" />
          <stop offset="100%" stopColor="#A9F4FF" />
        </radialGradient>
        <filter id={id("glow")} x="-35%" y="-35%" width="170%" height="170%" colorInterpolationFilters="sRGB">
          <feGaussianBlur stdDeviation="9" />
        </filter>
        <filter id={id("spark")} x="-40%" y="-40%" width="180%" height="180%" colorInterpolationFilters="sRGB">
          <feGaussianBlur stdDeviation="11" />
        </filter>
        {/* Der Strahl: von voll nach durchsichtig über eine Vierteldrehung. */}
        <linearGradient id={id("strahl")} gradientUnits="userSpaceOnUse" x1={MX} y1={MY} x2={MX + HALB} y2={MY}>
          <stop offset="0%" stopColor="#4AAEFF" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#4AAEFF" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Ruhende Kreise — das Zifferblatt, auf dem die Wellen laufen. */}
      {[300, 368, 436].map((r, i) => (
        <circle
          key={r}
          cx={MX}
          cy={MY}
          r={r}
          stroke="#1a4b78"
          strokeWidth={1.4}
          opacity={0.3 - i * 0.07}
        />
      ))}

      {/* Der umlaufende Strahl. */}
      {sweep && (
        <g
          className="marke-sweep"
          style={{ transformOrigin: `${MX}px ${MY}px` }}
        >
          <path
            d={`M ${MX} ${MY} L ${MX + HALB} ${MY} A ${HALB} ${HALB} 0 0 0 ${MX + HALB * Math.cos(-Math.PI / 3.2)} ${MY + HALB * Math.sin(-Math.PI / 3.2)} Z`}
            fill={`url(#${id("strahl")})`}
          />
        </g>
      )}

      {/*
        Die Wellen. Jede läuft von knapp außerhalb des Rings nach außen und
        verblasst dabei — wie ein Radarimpuls, der den Raum abtastet.
      */}
      {wellen &&
        [0, 1, 2].map((i) => (
          <circle
            key={i}
            className="marke-welle"
            cx={MX}
            cy={MY}
            r={248}
            stroke={`url(#${id("ring")})`}
            strokeWidth={2.4}
            style={{
              transformOrigin: `${MX}px ${MY}px`,
              animationDelay: `${i * 0.75}s`,
            }}
          />
        ))}

      {/* Schein der Marke */}
      <g opacity="0.38" filter={`url(#${id("glow")})`} strokeLinecap="butt">
        <path d={bogen} stroke={`url(#${id("ring")})`} strokeWidth="24" />
        <path d="M 275 612 L 652 612" stroke={`url(#${id("line")})`} strokeWidth="25" />
        <circle cx="652" cy="612" r="31" fill="#B8F8FF" stroke="none" />
      </g>

      {/* Die Marke selbst */}
      <g strokeLinecap="butt">
        <path d={bogen} stroke={`url(#${id("ring")})`} strokeWidth="22.5" />
        <path d="M 275 612 L 652 612" stroke={`url(#${id("line")})`} strokeWidth="23" />
        <circle cx="652" cy="612" r="30.5" fill={`url(#${id("node")})`} />
      </g>

      {/* Der Lichtpunkt auf der Ringbahn. */}
      <path
        className="okun-ring-lauf"
        d={bogen}
        stroke="#EAFDFF"
        strokeWidth="22.5"
        strokeLinecap="round"
        filter={`url(#${id("spark")})`}
        pathLength={100}
        strokeDasharray="6 94"
      />
    </svg>
  );
}
