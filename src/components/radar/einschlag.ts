"use client";

import { useEffect, useRef, useState } from "react";
import type { DimensionWert } from "@/lib/radar/live";

/**
 * Welche Dimension sich gerade verändert hat.
 *
 * Das ist der Moment, um den es im ganzen Radar geht: Der Interessent klickt
 * eine Antwort, und rechts verändert sich sein Betrieb. Wenn das lautlos
 * passiert — eine Zahl springt, mehr nicht —, merkt er es nicht, und das
 * Versprechen „wir durchleuchten Ihren Betrieb gemeinsam“ bleibt eine
 * Behauptung.
 *
 * Der Haken merkt sich den letzten Stand und meldet, welche Dimension sich
 * zuletzt geändert hat und wann. Die Oberfläche macht daraus einen Einschlag:
 * eine Welle am Messpunkt, eine hochzählende Zahl, eine aufleuchtende Zeile.
 */
export function useEinschlag(dimensionen: DimensionWert[]): {
  getroffen: string | null;
  marke: number;
} {
  const vorher = useRef<Map<string, number | null> | null>(null);
  const [zustand, setZustand] = useState<{ getroffen: string | null; marke: number }>({
    getroffen: null,
    marke: 0,
  });

  useEffect(() => {
    const jetzt = new Map(dimensionen.map((d) => [d.key, d.wert]));

    // Der erste Durchlauf setzt nur den Bezugspunkt. Sonst schlüge beim
    // Aufbau alles gleichzeitig ein, was nach Fehler aussieht, nicht nach
    // Messung.
    if (!vorher.current) {
      vorher.current = jetzt;
      return;
    }

    let getroffen: string | null = null;
    for (const [key, wert] of jetzt) {
      if (vorher.current.get(key) !== wert) getroffen = key;
    }
    vorher.current = jetzt;

    if (getroffen) setZustand({ getroffen, marke: Date.now() });
  }, [dimensionen]);

  // Der Einschlag klingt nach anderthalb Sekunden ab.
  useEffect(() => {
    if (!zustand.getroffen) return;
    const id = setTimeout(() => setZustand({ getroffen: null, marke: 0 }), 1500);
    return () => clearTimeout(id);
  }, [zustand]);

  return zustand;
}

/**
 * Eine Zahl, die auf ihren neuen Wert zuläuft.
 *
 * Eine Zahl, die springt, liest sich wie ein Formularfeld. Eine, die zuläuft,
 * liest sich wie eine Messung — und genau das ist sie.
 */
export function useZaehler(ziel: number | null, dauerMs = 650): number | null {
  const [wert, setWert] = useState(ziel);
  const von = useRef(ziel);
  const start = useRef(0);
  const rahmen = useRef<number | null>(null);

  useEffect(() => {
    if (ziel === null || von.current === null) {
      von.current = ziel;
      setWert(ziel);
      return;
    }
    if (ziel === von.current) return;

    const anfang = von.current;
    const spanne = ziel - anfang;
    start.current = performance.now();

    const schritt = (jetzt: number) => {
      const t = Math.min(1, (jetzt - start.current) / dauerMs);
      // Weich auslaufend — am Ende soll die Zahl stehen, nicht bremsen.
      const e = 1 - Math.pow(1 - t, 3);
      setWert(Math.round((anfang + spanne * e) * 10) / 10);
      if (t < 1) rahmen.current = requestAnimationFrame(schritt);
      else von.current = ziel;
    };
    rahmen.current = requestAnimationFrame(schritt);

    return () => {
      if (rahmen.current !== null) cancelAnimationFrame(rahmen.current);
      von.current = ziel;
    };
  }, [ziel, dauerMs]);

  return wert;
}
