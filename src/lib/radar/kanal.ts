/**
 * Der kurze Draht zwischen Radar und Videogespräch.
 *
 * Das Radar steht auf beiden Seiten in einer anderen Komponente als das
 * Gespräch: beim Closer in einem Reiter, beim Interessenten auf der Bühne.
 * Der Datenkanal von Daily hängt aber am Gespräch. Statt beide Oberflächen
 * umzubauen, treffen sie sich hier.
 *
 * Wichtig: Über diesen Kanal läuft **kein Inhalt**, nur ein Stups. Wer ihn
 * empfängt, holt den Stand beim Server — und der Server bleibt die einzige
 * Wahrheit. Geht ein Stups verloren, merkt es niemand: Beide Seiten fragen
 * ohnehin zyklisch nach, der Stups spart nur die Wartezeit bis zum nächsten
 * Takt.
 */

type Horcher = () => void;

const horcher = new Set<Horcher>();
let senden: (() => void) | null = null;

/** Das Gespräch meldet sich an und stellt seinen Datenkanal bereit. */
export function registriereSender(fn: () => void): () => void {
  senden = fn;
  return () => {
    if (senden === fn) senden = null;
  };
}

/** Eine Oberfläche hat etwas geändert — die Gegenseite soll nachladen. */
export function stupseGegenseite(): void {
  try {
    senden?.();
  } catch {
    // Ein verlorener Stups ist folgenlos; der Abfragetakt fängt ihn auf.
  }
}

/** Das Gespräch hat einen Stups der Gegenseite empfangen. */
export function meldeStups(): void {
  for (const fn of horcher) {
    try {
      fn();
    } catch {
      // Ein fehlerhafter Horcher darf die anderen nicht mitreißen.
    }
  }
}

/** Eine Oberfläche will über Änderungen der Gegenseite Bescheid wissen. */
export function beiStups(fn: Horcher): () => void {
  horcher.add(fn);
  return () => {
    horcher.delete(fn);
  };
}
