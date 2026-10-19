"use client";

import { useEffect, useRef, type ReactNode } from "react";
import {
  BUEHNE,
  boden,
  decke,
  flaeche,
  lerp,
  rueckwand,
  tiefe,
  wand,
  type Kasten,
  RAUM,
} from "@/lib/studio/perspektive";

/**
 * Die Hülle, in der jeder Innenraum spielt.
 *
 * Vorher waren die Räume zentrierte Inhalte auf einem dunklen Verlauf —
 * deshalb sahen sie aus wie Bildschirmseiten und nicht wie Orte. Hier steht
 * stattdessen eine Schachtel: Boden, Decke, zwei Seitenwände, Rückwand,
 * Deckenleuchten, Lichtpfützen auf dem Boden, Staub in der Luft. Die Szenen
 * stellen nur noch hinein, was in ihrem Raum steht.
 *
 * Alles ist eine eigene Ebene und in Bühnenkoordinaten gezeichnet. Kommen
 * später gerenderte Bilder, tritt ein Bild an die Stelle der Hülle, ohne
 * dass eine Szene sich ändert — dieselbe Regel wie draußen beim Haus.
 */

export function Innenraum({
  kasten = RAUM,
  akzent = "#00b8ff",
  warm = false,
  lichter = 3,
  fenster = null,
  rueckseite,
  children,
  vorn,
}: {
  kasten?: Kasten;
  /** Die Lichtfarbe des Raums. Jeder Raum hat seine eigene. */
  akzent?: string;
  /** Warmes Deckenlicht statt kaltem — für Räume, in denen Menschen sitzen. */
  warm?: boolean;
  lichter?: number;
  /** Ein Fenster in einer Seitenwand, durch das man die Stadt sieht. */
  fenster?: "links" | "rechts" | null;
  /** Was an der Rückwand hängt. */
  rueckseite?: ReactNode;
  /** Was im Raum steht. */
  children?: ReactNode;
  /** Was ganz vorn liegt — Staub, Spiegelungen, Schleier. */
  vorn?: ReactNode;
}) {
  const blick = useRef<SVGGElement>(null);

  /*
    Der Blickwinkel folgt der Maus.

    Minimal — zwei Dutzend Pixel. Es geht nicht um einen Effekt, sondern
    darum, dass der Raum auf Bewegung reagiert: Erst dadurch merkt das Auge,
    dass es in eine Tiefe schaut und nicht auf ein Bild.
  */
  useEffect(() => {
    const el = blick.current;
    if (!el) return;
    let laeuft = 0;
    function bewegen(e: MouseEvent) {
      if (laeuft) return;
      laeuft = requestAnimationFrame(() => {
        laeuft = 0;
        const dx = (e.clientX / window.innerWidth - 0.5) * 2;
        const dy = (e.clientY / window.innerHeight - 0.5) * 2;
        el!.style.transform = `translate(${(-dx * 22).toFixed(1)}px, ${(-dy * 12).toFixed(1)}px)`;
      });
    }
    window.addEventListener("mousemove", bewegen);
    return () => {
      window.removeEventListener("mousemove", bewegen);
      if (laeuft) cancelAnimationFrame(laeuft);
    };
  }, []);

  const lampen = Array.from({ length: lichter }, (_, i) => tiefe((i + 0.6) / (lichter + 0.4)));
  const lichtfarbe = warm ? "#ffd9a0" : "#bfe9ff";

  return (
    <svg
      viewBox={`0 0 ${BUEHNE.breite} ${BUEHNE.hoehe}`}
      preserveAspectRatio="xMidYMid slice"
      className="absolute inset-0 w-full h-full"
      aria-hidden
    >
      <defs>
        <linearGradient id="ir-decke" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#060e1a" />
          <stop offset="1" stopColor="#0e1d30" />
        </linearGradient>
        <linearGradient id="ir-boden" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0c1a2b" />
          <stop offset=".55" stopColor="#09131f" />
          <stop offset="1" stopColor="#060c15" />
        </linearGradient>
        <linearGradient id="ir-wand-l" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#070f1b" />
          <stop offset="1" stopColor="#13243a" />
        </linearGradient>
        <linearGradient id="ir-wand-r" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#13243a" />
          <stop offset="1" stopColor="#070f1b" />
        </linearGradient>
        <linearGradient id="ir-rueck" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0a1829" />
          <stop offset=".45" stopColor="#102039" />
          <stop offset="1" stopColor="#17304b" />
        </linearGradient>
        <radialGradient id="ir-pfuetze">
          <stop offset="0" stopColor={lichtfarbe} stopOpacity=".26" />
          <stop offset=".45" stopColor={lichtfarbe} stopOpacity=".09" />
          <stop offset="1" stopColor={lichtfarbe} stopOpacity="0" />
        </radialGradient>
        <radialGradient id="ir-dunst">
          <stop offset="0" stopColor={akzent} stopOpacity=".18" />
          <stop offset="1" stopColor={akzent} stopOpacity="0" />
        </radialGradient>
        <linearGradient id="ir-spiegel" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity=".07" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
        <filter id="ir-weich" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="26" />
        </filter>
        <filter id="ir-weicher" x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation="54" />
        </filter>
      </defs>

      <rect width={BUEHNE.breite} height={BUEHNE.hoehe} fill="#04080f" />

      <g ref={blick} style={{ transition: "transform .5s cubic-bezier(.2,.8,.3,1)" }}>
        {/* ── Die Schachtel ───────────────────────────────────────────── */}
        <polygon
          points={flaeche(decke(0, 0, kasten), decke(0, 1, kasten), decke(1, 1, kasten), decke(1, 0, kasten))}
          fill="url(#ir-decke)"
        />
        <polygon
          points={flaeche(boden(0, 0, kasten), boden(0, 1, kasten), boden(1, 1, kasten), boden(1, 0, kasten))}
          fill="url(#ir-boden)"
        />
        <polygon
          points={flaeche(wand("links", 0, 0, kasten), wand("links", 1, 0, kasten), wand("links", 1, 1, kasten), wand("links", 0, 1, kasten))}
          fill="url(#ir-wand-l)"
        />
        <polygon
          points={flaeche(wand("rechts", 0, 0, kasten), wand("rechts", 1, 0, kasten), wand("rechts", 1, 1, kasten), wand("rechts", 0, 1, kasten))}
          fill="url(#ir-wand-r)"
        />
        <rect
          x={kasten.links}
          y={kasten.oben}
          width={kasten.rechts - kasten.links}
          height={kasten.unten - kasten.oben}
          fill="url(#ir-rueck)"
        />

        {/* Die Kanten — ohne sie zerfließt die Schachtel. */}
        <g stroke={akzent} strokeOpacity=".22" strokeWidth="1.5" fill="none">
          <polyline points={flaeche(decke(0, 0, kasten), decke(1, 0, kasten), decke(1, 1, kasten), decke(0, 1, kasten))} />
          <polyline points={flaeche(boden(0, 0, kasten), boden(1, 0, kasten), boden(1, 1, kasten), boden(0, 1, kasten))} />
          <line {...kante(decke(1, 0, kasten), boden(1, 0, kasten))} />
          <line {...kante(decke(1, 1, kasten), boden(1, 1, kasten))} />
        </g>

        {/* Sockelleiste: der Strich, an dem Wand und Boden sich treffen. */}
        <polygon
          points={flaeche(boden(0, 0, kasten), boden(1, 0, kasten), hoch(boden(1, 0, kasten), -9), hoch(boden(0, 0, kasten), -22))}
          fill="#1b2d45"
        />
        <polygon
          points={flaeche(boden(0, 1, kasten), boden(1, 1, kasten), hoch(boden(1, 1, kasten), -9), hoch(boden(0, 1, kasten), -22))}
          fill="#1b2d45"
        />
        <rect x={kasten.links} y={kasten.unten - 9} width={kasten.rechts - kasten.links} height="9" fill="#1b2d45" />

        {/*
          Fugen im Boden.

          Sie laufen auf den Fluchtpunkt zu und sind das Einzige, was einem
          leeren Boden ansehen lässt, wie tief der Raum ist.
        */}
        <g stroke={akzent} strokeOpacity=".09" strokeWidth="1.2">
          {[0.12, 0.28, 0.44, 0.56, 0.72, 0.88].map((u) => (
            <line
              key={u}
              x1={boden(0, u, kasten).x}
              y1={boden(0, u, kasten).y}
              x2={boden(1, u, kasten).x}
              y2={boden(1, u, kasten).y}
            />
          ))}
          {[0.2, 0.45, 0.7, 0.88].map((z) => {
            const t = tiefe(z);
            return (
              <line
                key={z}
                x1={boden(t, 0, kasten).x}
                y1={boden(t, 0, kasten).y}
                x2={boden(t, 1, kasten).x}
                y2={boden(t, 1, kasten).y}
              />
            );
          })}
        </g>

        {fenster && <Fenster seite={fenster} kasten={kasten} />}

        {/* ── Licht ───────────────────────────────────────────────────── */}
        {lampen.map((t, i) => {
          /*
            Eine Leuchte, kein weißer Balken.

            Gehäuse außen, Leuchtfläche innen, und je weiter vorn sie hängt,
            desto zurückhaltender — sonst frisst die vorderste Lampe den
            halben Bildschirm und steht dem Raum im Weg.
          */
          const tief = 0.038 + t * 0.03;
          const a = decke(t - tief, 0.34, kasten);
          const b = decke(t - tief, 0.66, kasten);
          const c = decke(t + tief, 0.66, kasten);
          const d = decke(t + tief, 0.34, kasten);
          const i1 = decke(t - tief * 0.55, 0.37, kasten);
          const i2 = decke(t - tief * 0.55, 0.63, kasten);
          const i3 = decke(t + tief * 0.55, 0.63, kasten);
          const i4 = decke(t + tief * 0.55, 0.37, kasten);
          const mitte = boden(t, 0.5, kasten);
          const breite = (boden(t, 1, kasten).x - boden(t, 0, kasten).x) * 0.72;
          const kraft = 0.16 + t * 0.46;
          return (
            <g key={i}>
              <polygon points={flaeche(a, b, c, d)} fill="#101e2f" />
              <polygon points={flaeche(i1, i2, i3, i4)} fill={lichtfarbe} opacity={kraft} />
              <polygon
                points={flaeche(i1, i2, i3, i4)}
                fill={lichtfarbe}
                opacity={kraft * 0.5}
                filter="url(#ir-weich)"
              />
              {/* Die Pfütze, die diese Lampe auf den Boden wirft. */}
              <ellipse
                cx={mitte.x}
                cy={mitte.y + 6}
                rx={breite / 2}
                ry={breite / 9}
                fill="url(#ir-pfuetze)"
              />
            </g>
          );
        })}

        {/* Dunst in der Luft — nimmt der Schachtel das Pappige. */}
        <ellipse
          cx={rueckwand(0.5, 0.4, kasten).x}
          cy={rueckwand(0.5, 0.4, kasten).y}
          rx={(kasten.rechts - kasten.links) * 0.9}
          ry={(kasten.unten - kasten.oben) * 0.8}
          fill="url(#ir-dunst)"
        />

        {rueckseite}
        {children}

        {/* Der Boden spiegelt, was im Raum steht — nur als Hauch. */}
        <polygon
          points={flaeche(boden(0, 0, kasten), boden(0, 1, kasten), boden(0.55, 1, kasten), boden(0.55, 0, kasten))}
          fill="url(#ir-spiegel)"
        />
      </g>

      {vorn}

      {/*
        Ein Schleier oben.

        Die Kopfzeile des Raums steht als Text darüber. Ohne diesen Verlauf
        läuft sie bei hellen Decken gegen das Licht und ist nicht mehr zu
        lesen — und ein Raum, dessen Überschrift man suchen muss, erklärt
        nichts.
      */}
      <rect
        width={BUEHNE.breite}
        height={BUEHNE.hoehe * 0.34}
        fill="url(#ir-schleier)"
        pointerEvents="none"
      />
      {/* Dasselbe unten, wo die Knöpfe liegen. */}
      <rect
        y={BUEHNE.hoehe * 0.8}
        width={BUEHNE.breite}
        height={BUEHNE.hoehe * 0.2}
        fill="url(#ir-fuss)"
        pointerEvents="none"
      />
      <defs>
        <linearGradient id="ir-schleier" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#040810" stopOpacity=".88" />
          <stop offset=".6" stopColor="#040810" stopOpacity=".45" />
          <stop offset="1" stopColor="#040810" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="ir-fuss" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#040810" stopOpacity="0" />
          <stop offset="1" stopColor="#040810" stopOpacity=".8" />
        </linearGradient>
      </defs>

      {/* Vignette: zieht den Blick in die Mitte, wie ein Objektiv. */}
      <rect width={BUEHNE.breite} height={BUEHNE.hoehe} fill="url(#ir-vignette)" pointerEvents="none" />
      <defs>
        <radialGradient id="ir-vignette" cx="50%" cy="46%" r="72%">
          <stop offset=".45" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity=".72" />
        </radialGradient>
      </defs>
    </svg>
  );
}

function kante(a: { x: number; y: number }, b: { x: number; y: number }) {
  return { x1: a.x, y1: a.y, x2: b.x, y2: b.y };
}

function hoch(p: { x: number; y: number }, dy: number) {
  return { x: p.x, y: p.y + dy };
}

/**
 * Ein Fenster in der Seitenwand.
 *
 * Dahinter liegt dieselbe Stadt, vor der das Haus steht. Das ist der
 * billigste und stärkste Trick, den ein Innenraum hat: Er beweist, dass es
 * ein Draußen gibt — und damit, dass man wirklich drinnen ist.
 */
function Fenster({ seite, kasten }: { seite: "links" | "rechts"; kasten: Kasten }) {
  const t1 = 0.22;
  const t2 = 0.78;
  const a = wand(seite, t1, 0.26, kasten);
  const b = wand(seite, t2, 0.26, kasten);
  const c = wand(seite, t2, 0.74, kasten);
  const d = wand(seite, t1, 0.74, kasten);
  const id = `fenster-${seite}`;

  return (
    <g>
      <defs>
        <clipPath id={id}>
          <polygon points={flaeche(a, b, c, d)} />
        </clipPath>
        <linearGradient id={`${id}-glas`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0a1a2e" />
          <stop offset="1" stopColor="#061120" />
        </linearGradient>
      </defs>
      <polygon points={flaeche(a, b, c, d)} fill={`url(#${id}-glas)`} />
      <g clipPath={`url(#${id})`}>
        {/* Die Skyline dahinter, klein und unscharf. */}
        {Array.from({ length: 9 }, (_, i) => {
          const u = i / 8;
          const kopf = lerp(0.52, 0.66, ((i * 7) % 5) / 4);
          const o = { x: lerp(a.x, b.x, u), y: lerp(a.y, b.y, u) + (c.y - b.y) * (1 - kopf) };
          const h = (c.y - b.y) * kopf;
          const w = (b.x - a.x) / 9;
          return (
            <g key={i}>
              <rect x={o.x} y={o.y} width={Math.abs(w) * 0.82} height={h} fill="#0e2136" />
              {Array.from({ length: 4 }, (_, j) => (
                <rect
                  key={j}
                  x={o.x + Math.abs(w) * 0.18}
                  y={o.y + 8 + j * 13}
                  width={Math.abs(w) * 0.2}
                  height="6"
                  fill={j % 3 === 0 ? "#d9a44e" : "#6fc4ef"}
                  opacity={(i + j) % 3 === 0 ? 0.45 : 0.14}
                />
              ))}
            </g>
          );
        })}
      </g>
      {/* Rahmen und Sprossen */}
      <g stroke="#2d4b6b" strokeWidth="3" fill="none">
        <polygon points={flaeche(a, b, c, d)} />
        {[0.33, 0.66].map((u) => (
          <line
            key={u}
            x1={lerp(a.x, b.x, u)}
            y1={lerp(a.y, b.y, u)}
            x2={lerp(d.x, c.x, u)}
            y2={lerp(d.y, c.y, u)}
          />
        ))}
      </g>
      {/* Das Licht, das das Fenster in den Raum wirft. */}
      <polygon points={flaeche(a, b, c, d)} fill="#9fd8ff" opacity=".1" filter="url(#ir-weicher)" />
    </g>
  );
}
