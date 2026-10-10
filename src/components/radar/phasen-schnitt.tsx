"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Der Wechsel zwischen den drei Phasen.
 *
 * Kurz — knapp eine Sekunde — und ohne Marke: Das ist kein Werkzeugwechsel,
 * sondern ein Kapitelwechsel innerhalb desselben Werkzeugs. Große Ziffer,
 * Phasenname, Zielzeit. Aus drei Abschnitten werden damit drei Akte, und der
 * Interessent weiß nach einem Blick, wo er steht und was noch kommt.
 *
 * Die Zielzeit kommt aus dem Katalog, nicht aus einer Schätzung. Wer sie
 * ansagt, muss sie halten können.
 */

export type PhasenAnsage = {
  key: string;
  nummer: number;
  label: string;
  unterzeile: string;
  zielzeit: string;
};

const DAUER_MS = 1150;

export function PhasenSchnitt({ phase }: { phase: PhasenAnsage | null }) {
  const [laeuft, setLaeuft] = useState<PhasenAnsage | null>(null);
  const vorher = useRef(phase?.key ?? null);

  useEffect(() => {
    const key = phase?.key ?? null;
    if (vorher.current === key) return;
    const erster = vorher.current === null;
    vorher.current = key;
    // Der erste Aufbau ist kein Wechsel. Wer die Seite neu lädt, soll nicht
    // jedes Mal die Kapitelansage sehen.
    if (erster || !phase) return;
    setLaeuft(phase);
    const id = setTimeout(() => setLaeuft(null), DAUER_MS);
    return () => clearTimeout(id);
  }, [phase]);

  if (!laeuft) return null;

  return (
    <div
      aria-hidden
      className="absolute inset-0 z-50 flex items-center justify-center bg-[#04070d]/92 backdrop-blur-[3px]"
      style={{
        animation: `ueber-vorhang-auf .16s ease-out both, ueber-vorhang-zu .34s cubic-bezier(.4,0,1,1) ${DAUER_MS - 340}ms both`,
      }}
    >
      <div className="flex items-center gap-6 sm:gap-8 px-6">
        <span
          className="font-mono font-bold leading-none text-[96px] sm:text-[132px] text-transparent bg-clip-text"
          style={{
            backgroundImage: "linear-gradient(160deg,#2b86c8,#0d2740)",
            animation: "ueber-marke .7s cubic-bezier(.22,1,.36,1) both",
          }}
        >
          {String(laeuft.nummer).padStart(2, "0")}
        </span>

        <span
          className="block w-px self-stretch"
          style={{
            background: "linear-gradient(180deg,transparent,#1d4668,transparent)",
            animation: "ueber-linie .5s cubic-bezier(.22,1,.36,1) .16s both",
          }}
        />

        <div style={{ animation: "ueber-schrift .6s cubic-bezier(.22,1,.36,1) .18s both" }}>
          <p className="font-mono text-[#3d5c7e] text-[10px] uppercase tracking-[0.26em] mb-2">
            Phase {laeuft.nummer} von 3
          </p>
          <p className="text-[#f4f8fd] text-[23px] sm:text-[30px] font-bold tracking-[-0.02em] leading-tight">
            {laeuft.label}
          </p>
          <p className="text-[#5f88ae] text-[13px] mt-1.5">{laeuft.unterzeile}</p>
          <p className="font-mono text-[#2d4360] text-[10.5px] uppercase tracking-[0.18em] mt-3">
            Zielzeit {laeuft.zielzeit}
          </p>
        </div>
      </div>
    </div>
  );
}
