"use client";

import { createContext, useContext } from "react";

/**
 * Der Takt im Raum — und die Frage, wer ihn setzt.
 *
 * Jeder Raum zeigt erst, wie es heute ist, und nach einem Knopfdruck, wie es
 * danach ist. Im Gespräch drückt der Berater, und der Kunde sieht dasselbe.
 * Beides steckt hier drin, statt durch sechs Komponenten gereicht zu werden:
 * Die Szenen sollen den Unterschied zwischen Führen und Mitsehen gar nicht
 * kennen müssen — sie fragen nur, ob umgeschaltet ist und ob sie Knöpfe
 * zeigen dürfen.
 */

export type Takt = {
  /** 0 = wie es heute ist, 1 = wie es danach ist. */
  stufe: number;
  /** Umschalten. Wer mitsieht, ruft das nie auf. */
  setzeStufe: (stufe: number) => void;
  /** Mitsehen statt gehen: keine Knöpfe, keine Türen. */
  gefuehrt: boolean;
};

const TaktKontext = createContext<Takt>({
  stufe: 0,
  setzeStufe: () => {},
  gefuehrt: false,
});

export const TaktGeber = TaktKontext.Provider;

export function useTakt(): Takt {
  return useContext(TaktKontext);
}

/** Kurzform für den häufigsten Fall: „ist schon umgeschaltet?" */
export function useUmgebaut(): boolean {
  return useContext(TaktKontext).stufe > 0;
}
