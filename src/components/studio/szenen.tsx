"use client";

import { useEffect, useRef, useState } from "react";
import { OkunLogo } from "@/components/layout/okun-logo";
import { Gebaeude } from "./gebaeude";
import { Boden, Himmel, Mondglanz, Regen, Sterne, Stadt } from "./kulisse";
import type { AblaufRaum, HausDaten, Regalfach } from "@/lib/strategie/haus";
import { useTakt } from "./takt";

/**
 * Die Szenen des Rundgangs.
 *
 * Jede ist eine eigene Komponente mit demselben Takt: Man sieht erst, wie es
 * heute ist, und drückt dann einen Knopf, der zeigt, was sich ändert. Nichts
 * davon ist erfunden — was sich bewegt, steht im Blueprint, und was
 * verschwindet, steht in der festen Zuordnung aus dem Katalog.
 */

// ─── Szene 1 · Draußen ───────────────────────────────────────────────────────

export function Aussen({
  haus,
  untertitel,
  vorsatz,
  onEintreten,
}: {
  haus: HausDaten;
  untertitel: string | null;
  vorsatz: string;
  onEintreten: () => void;
}) {
  const { gefuehrt } = useTakt();
  const [geht, setzeGeht] = useState(false);
  const welt = useRef<HTMLDivElement>(null);

  /*
    Parallaxe nach der Maus.

    Der eine Effekt, der aus einer Zeichnung einen Ort macht. Er läuft nur,
    solange niemand eintritt — während der Kamerafahrt würde er sie stören.
  */
  useEffect(() => {
    if (geht) return;
    const el = welt.current;
    if (!el) return;
    const bewegen = (e: MouseEvent) => {
      const dx = e.clientX / window.innerWidth - 0.5;
      const dy = e.clientY / window.innerHeight - 0.5;
      el.querySelectorAll<HTMLElement>("[data-tiefe]").forEach((lage) => {
        const t = Number(lage.dataset.tiefe) || 1;
        lage.style.transform = `translate3d(${-dx * t * 5}px, ${-dy * t * 2.5}px, 0)`;
      });
    };
    window.addEventListener("mousemove", bewegen);
    return () => window.removeEventListener("mousemove", bewegen);
  }, [geht]);

  function eintreten() {
    // Wer mitsieht, öffnet die Tür nicht — sonst führe gleich die Kamerafahrt
    // ins Leere und der Kunde stünde vor einer Wand.
    if (gefuehrt || geht) return;
    setzeGeht(true);
    // Die Kamerafahrt läuft 2,2 Sekunden; danach übernimmt der Schnitt.
    setTimeout(onEintreten, 1700);
  }

  return (
    <div className="fixed inset-0 overflow-hidden" style={{ perspective: "1400px" }}>
      <div
        ref={welt}
        className={`absolute inset-0 studio-welt ${geht ? "studio-eintritt" : ""}`}
      >
        <div data-tiefe="1"><Himmel /></div>
        <div data-tiefe="1.5"><Sterne /></div>
        <div data-tiefe="2"><Mondglanz /></div>
        <div data-tiefe="3"><Stadt /></div>
        <div data-tiefe="4"><Boden /></div>
        <div
          data-tiefe="6"
          className="absolute left-1/2 bottom-[11%] w-[min(78vw,1220px)]"
          style={{ transform: "translateX(-50%)" }}
        >
          <Gebaeude
            schild={haus.schild}
            untertitel={untertitel}
            stockwerke={haus.stockwerke}
            fahrzeug={haus.fahrzeug}
            onTuer={eintreten}
          />
        </div>
        <div data-tiefe="8"><Regen /></div>
      </div>

      <div
        className={`absolute inset-x-0 top-[6.5%] text-center z-10 transition-all duration-500 ${
          geht ? "opacity-0 -translate-y-6" : ""
        }`}
        style={{ animation: "studio-schrift-ein 1.4s cubic-bezier(.16,1,.3,1) .4s both" }}
      >
        <p className="font-mono text-[9px] uppercase tracking-[0.26em] text-[#3a4f68] font-semibold">
          OKUN Transformation Studio
        </p>
        <p className="mt-3 text-[#90a6c0] text-[13.5px]">{vorsatz}</p>
      </div>

      <div
        className={`absolute left-1/2 bottom-[9%] -translate-x-1/2 z-10 flex flex-col items-center gap-3 transition-all duration-500 ${
          geht ? "opacity-0 translate-y-4" : ""
        }`}
        style={{ animation: "studio-schrift-ein 1.3s cubic-bezier(.16,1,.3,1) 1.2s both" }}
      >
        {gefuehrt ? (
          /*
            Der Wartezustand.

            Der Kunde steht vor seinem eigenen Haus, bis der Berater die Tür
            öffnet. Das ist kein Ladebalken, sondern der Anfang der
            Geschichte — und er hält, solange er halten muss.
          */
          <p className="flex items-center gap-2.5 px-5 py-3 rounded-full border border-[rgba(0,184,255,.22)]
            bg-[rgba(10,22,38,.7)] backdrop-blur text-[#90a6c0] text-[12.5px]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00b8ff] studio-atmen" />
            Gleich geht es los
          </p>
        ) : (
          <>
            <button
              onClick={eintreten}
              className="flex items-center gap-3 px-8 py-4 rounded-full text-[#041018] text-sm font-bold
                bg-[linear-gradient(135deg,#7adcff,#00b8ff)] shadow-[0_18px_48px_-14px_rgba(0,184,255,.95)]
                hover:-translate-y-0.5 hover:scale-[1.03] transition-transform duration-300"
            >
              Studio betreten <span className="text-base">→</span>
            </button>
            <p className="text-[#52687f] text-[11px]">oder auf die Tür klicken</p>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Szene 2 · Der Schnitt ───────────────────────────────────────────────────

/**
 * Die Marke zwischen zwei Welten.
 *
 * Dasselbe Mittel wie im Radar: Ein Wechsel ohne Schnitt fühlt sich an wie
 * eine Webseite, die ihren Inhalt tauscht. Mit Schnitt fühlt er sich an wie
 * ein Ortswechsel — und genau das ist er hier auch.
 */
export function Schnitt({
  firma,
  fussnote,
  onFertig,
}: {
  firma: string;
  fussnote: string;
  onFertig: () => void;
}) {
  useEffect(() => {
    const id = setTimeout(onFertig, 2600);
    return () => clearTimeout(id);
  }, [onFertig]);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-[#02040a]" aria-hidden>
      <div
        className="absolute inset-0"
        style={{
          background: "radial-gradient(circle at 50% 62%,#cfefff,#2aa8e6 26%,transparent 62%)",
          animation: "studio-blitz 1.5s cubic-bezier(.2,.9,.3,1) both",
        }}
      />
      <div className="relative text-center z-10">
        <div
          className="w-[92px] h-[92px] mx-auto rounded-full border-[3px] border-[#00b8ff] relative
            shadow-[0_0_60px_rgba(0,184,255,.85)]"
          style={{ animation: "studio-ring-ein 1.1s cubic-bezier(.2,1.4,.3,1) .35s both" }}
        >
          <span className="absolute inset-5 rounded-full bg-[#00b8ff] shadow-[0_0_40px_#00b8ff]" />
        </div>
        <p
          className="mt-6 text-[clamp(22px,2.6vw,36px)] font-bold tracking-[0.3em] text-[#eef3f9]"
          style={{ animation: "studio-schrift-ein 1s cubic-bezier(.2,.9,.3,1) .7s both" }}
        >
          OKUN
        </p>
        <div
          className="mt-3 h-px bg-[linear-gradient(90deg,transparent,#00b8ff,transparent)]"
          style={{ animation: "studio-linie-ein .9s cubic-bezier(.2,.9,.3,1) .95s both" }}
        />
        <p
          className="mt-3.5 font-mono text-xs tracking-[0.42em] text-[#7fd4ff]"
          style={{ animation: "studio-schrift-ein 1s cubic-bezier(.2,.9,.3,1) 1.1s both" }}
        >
          TRANSFORMATION STUDIO
        </p>
        <p
          className="mt-7 text-sm text-[#90a6c0]"
          style={{ animation: "studio-schrift-ein 1s ease 1.4s both" }}
        >
          {firma} · {fussnote}
        </p>
      </div>
    </div>
  );
}

/*
  Die Eingangshalle und der alte Ablaufraum standen hier.

  Beide waren Kacheln auf dunklem Grund. Ersetzt haben sie der Flur und die
  Werkstatt — dieselben Daten, aber in einem Raum, den man betreten kann.
  Siehe `innenszenen.tsx` und `werkstatt.tsx`.
*/

// ─── Szene 5 · Der Grundlagenraum ────────────────────────────────────────────

export function RegalSzene({
  regal,
  onZurueck,
}: {
  regal: Regalfach[];
  onZurueck: () => void;
}) {
  const { stufe, setzeStufe, gefuehrt } = useTakt();
  const gefuellt = stufe > 0;
  const luecken = regal.filter((r) => r.luecke).length;

  return (
    <div
      className="fixed inset-0 overflow-hidden"
      style={{ background: "radial-gradient(90% 80% at 50% 8%,#0a1f36,#040c18 58%,#02060e 100%)" }}
    >
      <ZurueckKnopf onClick={onZurueck} />

      <div
        className="absolute inset-x-0 top-[8%] text-center px-6"
        style={{ animation: "studio-auf .8s cubic-bezier(.2,.85,.25,1) both" }}
      >
        <p className="font-mono text-[9px] uppercase tracking-[0.26em] text-[#3a4f68] font-semibold">
          Digitale Grundlagen
        </p>
        <h2 className="mt-2.5 text-[clamp(21px,2.5vw,34px)] font-bold tracking-[-0.02em]">
          Zwölf Fächer an der Wand
        </h2>
        <p className="mt-2.5 mx-auto max-w-[60ch] text-[#90a6c0] text-[12.5px]">
          Für jeden Zweck eines. {luecken === 0
            ? "Bei Ihnen ist jedes belegt."
            : `${luecken} ${luecken === 1 ? "Fach ist" : "Fächer sind"} bei Ihnen leer.`}{" "}
          Rot heißt: zwei Programme für dieselbe Sache.
        </p>
      </div>

      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-[46%] w-[min(94vw,1200px)] px-4">
        <div className="grid grid-cols-6 gap-3">
          {regal.map((f, i) => {
            const gefuelltJetzt = gefuellt && f.luecke;
            return (
              <div
                key={f.zweckKey}
                className={`rounded-xl border p-3.5 min-h-[112px] flex flex-col transition-all duration-700
                  ${
                    f.luecke && !gefuellt
                      ? "border-dashed border-[rgba(245,165,36,.5)] bg-[rgba(245,165,36,.05)]"
                      : f.doppelt && !gefuellt
                        ? "border-[rgba(240,80,74,.45)] bg-[rgba(240,80,74,.06)]"
                        : "border-[rgba(0,184,255,.25)] bg-[rgba(0,184,255,.05)]"
                  }`}
                style={{ animation: `studio-pop .7s cubic-bezier(.2,1.05,.3,1) ${0.2 + i * 0.05}s both` }}
              >
                <p className="font-mono text-[8.6px] uppercase tracking-[0.14em] text-[#4d93ba]">
                  {f.label}
                </p>
                <p className="mt-auto text-[11.5px] leading-snug">
                  {gefuelltJetzt ? (
                    <span className="text-[#2ee6c5]">wird eingerichtet</span>
                  ) : f.luecke ? (
                    <span className="text-[#f5a524]">leer</span>
                  ) : (
                    <span className="text-[#cfe0f2]">{f.programme.join(" · ")}</span>
                  )}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      <div className="absolute left-1/2 bottom-[11%] -translate-x-1/2 text-center">
        <button
          onClick={() => setzeStufe(gefuellt ? 0 : 1)}
          disabled={luecken === 0}
          hidden={gefuehrt}
          className={`flex items-center gap-3 px-7 py-3.5 rounded-full text-[#041018] text-[13.5px] font-bold
            mx-auto transition-transform duration-300 hover:-translate-y-0.5 disabled:opacity-40 ${
              gefuellt
                ? "bg-[linear-gradient(135deg,#8af2dd,#2ee6c5)]"
                : "bg-[linear-gradient(135deg,#7adcff,#00b8ff)]"
            }`}
        >
          <span className="text-base">✦</span>
          {gefuellt ? "Zurück zu heute" : "Lücken schließen"}
        </button>
      </div>
    </div>
  );
}

// ─── Gemeinsame Kleinteile ───────────────────────────────────────────────────

/*
  Der Weg zurück — nur für den, der geht.

  Wer mitsieht, bekommt ihn nicht zu sehen: Ein Knopf, der nichts tut, ist
  schlimmer als keiner, und zwei Leute, die gleichzeitig durchs Haus laufen,
  sind das Ende des Gesprächs.
*/
function ZurueckKnopf({ onClick }: { onClick: () => void }) {
  const { gefuehrt } = useTakt();
  if (gefuehrt) return null;
  return (
    <button
      onClick={onClick}
      className="absolute left-6 top-6 z-20 flex items-center gap-2 px-4 py-2.5 rounded-full
        bg-[rgba(10,22,38,.8)] border border-[rgba(0,184,255,.2)] text-[#90a6c0] text-xs
        backdrop-blur hover:text-[#eef3f9] hover:border-[rgba(0,184,255,.5)] transition-colors"
    >
      ← Der Gang
    </button>
  );
}

/** Die Marke unten rechts — damit klar bleibt, in wessen Haus man steht. */
export function StudioMarke() {
  return (
    <div className="fixed left-6 bottom-6 z-20 w-[96px] opacity-45 pointer-events-none">
      <OkunLogo size="sm" />
    </div>
  );
}
