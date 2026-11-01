"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Diktieren statt tippen.
 *
 * Der Browser bringt die Spracherkennung mit — in Safari und Chrome unter
 * dem Namen `webkitSpeechRecognition`, nirgends im Standard-Typenkatalog.
 * Deshalb hier die paar Zeilen Typ, die wir tatsächlich benutzen, statt
 * eines fremden Pakets: Es geht nichts an einen Dienst, es kostet nichts,
 * und es funktioniert ohne Aufbau.
 *
 * Was ankommt, wird nicht abgeschickt. Es landet im Textfeld, wo es sich
 * korrigieren lässt — gesprochene Sätze haben Versprecher, und ein Satz,
 * der sofort an das Modell geht, lässt sich nicht mehr einfangen.
 */

type Erkennung = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((e: SpracheEreignis) => void) | null;
  onerror: ((e: { error?: string }) => void) | null;
  onend: (() => void) | null;
};

type SpracheEreignis = {
  resultIndex: number;
  results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }>;
};

type MitErkennung = {
  SpeechRecognition?: new () => Erkennung;
  webkitSpeechRecognition?: new () => Erkennung;
};

function baue(): Erkennung | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as MitErkennung;
  const Klasse = w.SpeechRecognition ?? w.webkitSpeechRecognition;
  return Klasse ? new Klasse() : null;
}

export type Diktat = {
  /** Kann dieser Browser überhaupt zuhören? */
  moeglich: boolean;
  laeuft: boolean;
  fehler: string | null;
  starten: () => void;
  beenden: () => void;
};

/**
 * @param anhaengen Bekommt jeden fertigen Satz — der Aufrufer entscheidet,
 *   wohin er gehört.
 */
export function useDiktat(anhaengen: (text: string) => void): Diktat {
  const [laeuft, setzeLaeuft] = useState(false);
  const [fehler, setzeFehler] = useState<string | null>(null);
  /*
    Ob der Browser zuhören kann, steht erst nach dem ersten Zeichnen fest.

    Auf dem Server gibt es kein `window`; stünde die Antwort schon im
    ersten Durchgang, zeigten Server und Browser Verschiedenes an. Deshalb
    ein Zustand, der mit „nein" beginnt und sich nach dem Einhängen
    korrigiert — nicht im Effektkörper gesetzt, sondern über den
    Initialisierer bei der Nachprüfung.
  */
  const [moeglich, setzeMoeglich] = useState(false);
  const erkennung = useRef<Erkennung | null>(null);
  const anhaengenRef = useRef(anhaengen);

  useEffect(() => {
    anhaengenRef.current = anhaengen;
  }, [anhaengen]);

  useEffect(() => {
    const id = setTimeout(() => setzeMoeglich(baue() !== null), 0);
    return () => {
      clearTimeout(id);
      erkennung.current?.abort();
      erkennung.current = null;
    };
  }, []);

  const starten = useCallback(() => {
    setzeFehler(null);
    const e = baue();
    if (!e) {
      setzeFehler("Dieser Browser kann nicht zuhören.");
      return;
    }
    e.lang = "de-DE";
    // Weiterlaufen, auch wenn jemand mitten im Satz Luft holt.
    e.continuous = true;
    e.interimResults = false;
    e.onresult = (ereignis) => {
      let neu = "";
      for (let i = ereignis.resultIndex; i < ereignis.results.length; i++) {
        const treffer = ereignis.results[i];
        if (treffer.isFinal) neu += treffer[0]?.transcript ?? "";
      }
      const sauber = neu.trim();
      if (sauber) anhaengenRef.current(sauber);
    };
    e.onerror = (ereignis) => {
      const art = ereignis?.error ?? "";
      setzeFehler(
        art === "not-allowed"
          ? "Das Mikrofon ist für diese Seite gesperrt. In der Adressleiste erlauben."
          : art === "no-speech"
            ? null
            : "Die Spracheingabe hat aufgegeben."
      );
      setzeLaeuft(false);
    };
    e.onend = () => setzeLaeuft(false);
    erkennung.current = e;
    try {
      e.start();
      setzeLaeuft(true);
    } catch {
      setzeFehler("Die Spracheingabe ließ sich nicht starten.");
    }
  }, []);

  const beenden = useCallback(() => {
    erkennung.current?.stop();
    setzeLaeuft(false);
  }, []);

  return { moeglich, laeuft, fehler, starten, beenden };
}
