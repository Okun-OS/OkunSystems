"use client";

import { useEffect, useRef, useState } from "react";
import { RadarMarke } from "./radar-marke";

/**
 * Der Schnitt zwischen zwei Werkzeugen.
 *
 * Wechselt das Gespräch vom Videoraum in das Radar — oder weiter zum Angebot,
 * oder zurück —, legt sich für knapp zwei Sekunden die Marke über den
 * Bildschirm und sendet Wellen nach außen. Das ist kein Zierrat: Der
 * Interessent soll merken, dass er in ein anderes Werkzeug gewechselt ist,
 * und zwar in eines, das jemand gebaut hat. Ein Bildschirm, der lautlos
 * seinen Inhalt tauscht, fühlt sich an wie eine Webseite.
 *
 * Absender ist **OKUN Systems**, nicht „OKUN Radar“. Der Interessent weiß,
 * bei wem er sitzt; ein zweiter Markenname daneben macht aus einem Haus zwei
 * und verwässert beide. Das Radar ist ein Werkzeug von OKUN Systems — es
 * steht in der Unterzeile, wo der Zusammenhang hingehört.
 *
 * Der Schnitt läuft nur bei einem **Wechsel**, nicht beim ersten Aufbau: Wer
 * die Seite neu lädt, während das Radar schon läuft, soll nicht jedes Mal den
 * Vorspann sehen.
 */

export type Modus = "gespraech" | "radar" | "ergebnis" | "angebot";

const TEXTE: Record<Modus, string> = {
  gespraech: "Zurück ins Gespräch",
  radar: "Interaktive Potenzialanalyse",
  ergebnis: "Ihre Auswertung",
  angebot: "Ihr Angebot",
};

const DAUER_MS = 1900;

export function ModusUebergang({ modus, firma }: { modus: Modus; firma?: string | null }) {
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

  return (
    <div
      aria-hidden
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden bg-[#03060c]"
      style={{
        animation: `ueber-vorhang-auf .18s ease-out both, ueber-vorhang-zu .46s cubic-bezier(.4,0,1,1) ${DAUER_MS - 460}ms both`,
      }}
    >
      {/* Tiefe hinter der Marke — konzentrisch zum Ring. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(760px 760px at 50% 44%, rgba(0,150,255,0.2), transparent 66%)," +
            "radial-gradient(1500px 820px at 50% 128%, rgba(46,230,197,0.06), transparent 62%)",
        }}
      />

      {/* Der Lichtstreifen quer durchs Bild. */}
      <div
        className="absolute inset-y-0 w-[44%] pointer-events-none"
        style={{
          background:
            "linear-gradient(90deg,transparent,rgba(120,220,255,0.08),rgba(190,245,255,0.14),rgba(120,220,255,0.08),transparent)",
          animation: "ueber-streifen 1.3s cubic-bezier(.3,0,.2,1) .1s both",
        }}
      />

      {/*
        Eine Spalte, eine Achse.

        Die Marke bringt ihre Mitte selbst mit (siehe `radar-marke.tsx`), also
        sitzen Wellen, Ring und die Schrift darunter ohne jeden Versatz
        übereinander.
      */}
      <div className="relative flex flex-col items-center px-6">
        <div
          style={{ animation: "ueber-marke .95s cubic-bezier(.22,1,.36,1) .06s both" }}
        >
          <RadarMarke className="w-[min(78vw,400px)] h-[min(78vw,400px)]" />
        </div>

        <p
          className="-mt-[56px] text-[#f4f8fd] text-[15px] sm:text-[18px] font-bold uppercase text-center"
          style={{ animation: "ueber-schrift .7s cubic-bezier(.22,1,.36,1) .5s both" }}
        >
          Okun Systems
        </p>

        <span
          className="mt-4 block h-px w-[200px] origin-center"
          style={{
            background: "linear-gradient(90deg,transparent,#00b8ff,#2ee6c5,transparent)",
            animation: "ueber-linie .6s cubic-bezier(.22,1,.36,1) .64s both",
          }}
        />

        <p
          className="mt-4 text-[#5f88ae] text-[10.5px] sm:text-[12px] uppercase text-center"
          style={{ animation: "ueber-schrift .7s cubic-bezier(.22,1,.36,1) .72s both" }}
        >
          {TEXTE[laeuft]}
        </p>

        {/*
          Beim Eintritt in die Analyse steht der Firmenname groß darunter.

          Nicht als Dekor: Der Interessent soll in der Sekunde des Wechsels
          sehen, dass hier über seinen Betrieb gesprochen wird und nicht über
          einen Musterfall. Deshalb nur bei `radar` — bei „zurück ins
          Gespräch“ wäre es eine Wiederholung.
        */}
        {laeuft === "radar" && firma ? (
          <p
            className="mt-3 max-w-[18ch] text-[#f4f8fd] text-[21px] sm:text-[30px] font-bold tracking-[-0.02em] leading-tight text-center"
            style={{ animation: "karte-ein .62s cubic-bezier(.22,1,.36,1) .88s both" }}
          >
            {firma}
          </p>
        ) : null}
      </div>
    </div>
  );
}
