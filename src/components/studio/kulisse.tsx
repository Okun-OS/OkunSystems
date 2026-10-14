"use client";

import { useMemo } from "react";

/**
 * Die Ebenen hinter dem Haus.
 *
 * Himmel, Sterne, Mondglanz, Stadt, Boden, Regen — jede für sich, jede mit
 * eigener Parallaxentiefe. Das ist der Grund, warum die Szene nach etwas
 * aussieht und nicht nach einer Illustration: Nicht die Zeichnung macht die
 * Tiefe, sondern dass sich die Schichten verschieden schnell bewegen.
 *
 * Jede dieser Schichten kann später durch ein Bild ersetzt werden. Sie sind
 * absichtlich dumm — sie wissen nichts über den Betrieb.
 */

export function Himmel() {
  return (
    <div
      className="absolute inset-[-6%]"
      style={{
        background:
          "radial-gradient(130% 80% at 50% 108%, #123a5e 0%, #0a1f38 34%, #050d1c 62%, #02040a 100%)",
      }}
    />
  );
}

export function Sterne({ anzahl = 170 }: { anzahl?: number }) {
  const sterne = useMemo(() => {
    const zufall = mischer(4711);
    return Array.from({ length: anzahl }, () => ({
      x: zufall() * 100,
      y: zufall() * 62,
      r: zufall() * 1.2 + 0.2,
      o: zufall() * 0.6 + 0.08,
      d: zufall() * 5,
      s: 3 + zufall() * 6,
    }));
  }, [anzahl]);

  return (
    <svg className="absolute inset-[-6%] opacity-75" aria-hidden>
      {sterne.map((s, i) => (
        <circle
          key={i}
          cx={`${s.x}%`}
          cy={`${s.y}%`}
          r={s.r}
          fill="#cfe8ff"
          opacity={s.o}
          style={{ animation: `studio-flimmer ${s.s}s ease-in-out ${s.d}s infinite` }}
        />
      ))}
    </svg>
  );
}

export function Mondglanz() {
  return (
    <div
      className="absolute inset-[-6%]"
      style={{
        background: "radial-gradient(22% 18% at 76% 17%, rgba(190,225,255,.22), transparent 62%)",
      }}
    />
  );
}

/** Die Stadt im Rücken — gibt dem Haus einen Ort. */
export function Stadt() {
  const haeuser = useMemo(() => {
    const zufall = mischer(1301);
    const liste: Array<{ x: number; w: number; h: number; fenster: Array<[number, number, string, number]> }> = [];
    let x = 0;
    while (x < 1400) {
      const w = 40 + zufall() * 90;
      const h = 60 + zufall() * 190;
      const fenster: Array<[number, number, string, number]> = [];
      for (let fy = 400 - h + 14; fy < 390; fy += 22) {
        for (let fx = x + 9; fx < x + w - 9; fx += 17) {
          if (zufall() > 0.72) {
            fenster.push([fx, fy, zufall() > 0.5 ? "#2a5f85" : "#7d6a3e", zufall() * 0.5 + 0.2]);
          }
        }
      }
      liste.push({ x, w, h, fenster });
      x += w + 6 + zufall() * 26;
    }
    return liste;
  }, []);

  return (
    <svg className="absolute inset-[-6%] bottom-0" viewBox="0 0 1400 400" preserveAspectRatio="none" aria-hidden>
      {haeuser.map((h, i) => (
        <g key={i}>
          <rect x={h.x} y={400 - h.h} width={h.w} height={h.h} fill="#060f1d" />
          {h.fenster.map(([fx, fy, f, o], j) => (
            <rect key={j} x={fx} y={fy} width="4" height="6" fill={f} opacity={o} />
          ))}
        </g>
      ))}
    </svg>
  );
}

export function Boden() {
  return (
    <>
      <div
        className="absolute inset-[-6%]"
        style={{ background: "linear-gradient(180deg,transparent 62%, #04080f 100%)" }}
      />
      <div
        className="absolute inset-[-6%] studio-atmen"
        style={{
          background: "radial-gradient(34% 13% at 50% 93%, rgba(120,215,255,.2), transparent 70%)",
        }}
      />
    </>
  );
}

export function Regen() {
  return (
    <div
      aria-hidden
      className="absolute inset-[-6%] pointer-events-none opacity-[0.14] studio-regen"
      style={{
        backgroundImage:
          "repeating-linear-gradient(104deg,transparent 0 11px,rgba(190,225,255,.5) 11px 12px)",
      }}
    />
  );
}

function mischer(saat: number) {
  let s = saat % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}
