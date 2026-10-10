"use client";

import { useEffect, useRef, useState } from "react";
import { OkunRing } from "@/components/marketing/okun-ring";

/**
 * Der Schnitt zwischen zwei Werkzeugen.
 *
 * Wechselt das Gespräch vom Videoraum in das Radar — oder vom Radar weiter
 * zum Angebot —, legt sich für anderthalb Sekunden die Marke über den
 * Bildschirm. Das ist kein Zierrat: Der Interessent soll merken, dass er
 * gerade in ein anderes Werkzeug gewechselt ist, und zwar in eines, das
 * jemand gebaut hat. Ein Bildschirm, der lautlos seinen Inhalt tauscht,
 * fühlt sich an wie eine Webseite; ein Schnitt fühlt sich an wie Software.
 *
 * Er läuft nur bei einem **Wechsel**, nicht beim ersten Aufbau. Wer die Seite
 * neu lädt, während das Radar schon läuft, soll nicht jedes Mal den Vorspann
 * sehen.
 */

export type Modus = "gespraech" | "radar" | "ergebnis" | "angebot";

const TEXTE: Record<Modus, { ober: string; unter: string }> = {
  gespraech: { ober: "Okun Systems", unter: "Zurück ins Gespräch" },
  radar: { ober: "Okun Radar", unter: "Interaktive Potenzialanalyse" },
  ergebnis: { ober: "Okun Radar", unter: "Ihre Auswertung" },
  angebot: { ober: "Okun Systems", unter: "Ihr Angebot" },
};

const DAUER_MS = 1750;

export function ModusUebergang({ modus }: { modus: Modus }) {
  const [laeuft, setLaeuft] = useState<Modus | null>(null);
  const vorher = useRef(modus);

  useEffect(() => {
    if (vorher.current === modus) return;
    vorher.current = modus;
    setLaeuft(modus);
    const id = setTimeout(() => setLaeuft(null), DAUER_MS);
    return () => clearTimeout(id);
  }, [modus]);

  if (!laeuft) return null;
  const text = TEXTE[laeuft];

  return (
    <div
      aria-hidden
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden bg-[#04070d]"
      style={{
        animation: `ueber-vorhang-auf .18s ease-out both, ueber-vorhang-zu .42s cubic-bezier(.4,0,1,1) ${DAUER_MS - 420}ms both`,
      }}
    >
      {/* Tiefe hinter der Marke */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(820px 560px at 50% 46%, rgba(0,160,255,0.24), transparent 68%)," +
            "radial-gradient(1200px 700px at 50% 120%, rgba(46,230,197,0.06), transparent 62%)",
        }}
      />

      {/* Der Lichtstreifen quer durch das Bild */}
      <div
        className="ueber-streifen absolute inset-y-0 w-[46%] pointer-events-none"
        style={{
          background:
            "linear-gradient(90deg,transparent,rgba(120,220,255,0.09),rgba(190,245,255,0.16),rgba(120,220,255,0.09),transparent)",
          animation: "ueber-streifen 1.15s cubic-bezier(.3,0,.2,1) .1s both",
        }}
      />

      <div className="relative flex flex-col items-center">
        {/* Zwei Ringe, die sich aufziehen — die Analyse greift in den Raum. */}
        {[0, 1].map((i) => (
          <span
            key={i}
            className="ueber-puls absolute top-1/2 left-1/2 w-[150px] h-[150px] -translate-x-1/2 rounded-full border border-[#00b8ff]/35"
            style={{
              marginTop: -115,
              animation: `ueber-puls 1.5s cubic-bezier(.2,.6,.2,1) ${0.25 + i * 0.3}s both`,
            }}
          />
        ))}

        <div
          className="ueber-marke relative"
          style={{ animation: "ueber-marke .85s cubic-bezier(.22,1,.36,1) .08s both" }}
        >
          <div
            aria-hidden
            className="absolute inset-0 blur-2xl opacity-60"
            style={{ background: "radial-gradient(circle,rgba(0,180,255,0.68),transparent 65%)" }}
          />
          <OkunRing className="relative w-[156px] h-[156px]" />
        </div>

        <p
          className="ueber-schrift mt-7 text-[#f4f8fd] text-[15px] sm:text-[17px] font-bold uppercase"
          style={{ animation: "ueber-schrift .7s cubic-bezier(.22,1,.36,1) .42s both" }}
        >
          {text.ober}
        </p>

        <span
          className="ueber-linie mt-3.5 block h-px w-[180px] origin-center"
          style={{
            background: "linear-gradient(90deg,transparent,#00b8ff,#2ee6c5,transparent)",
            animation: "ueber-linie .6s cubic-bezier(.22,1,.36,1) .58s both",
          }}
        />

        <p
          className="ueber-schrift mt-3.5 text-[#5f88ae] text-[10.5px] sm:text-[11.5px] uppercase"
          style={{ animation: "ueber-schrift .7s cubic-bezier(.22,1,.36,1) .66s both" }}
        >
          {text.unter}
        </p>
      </div>
    </div>
  );
}
