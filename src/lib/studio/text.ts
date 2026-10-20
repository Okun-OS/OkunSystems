/**
 * Text, der in einen Raum passen muss.
 *
 * In einer Szene steht Schrift neben Dingen, nicht in einem Kasten mit
 * Zeilenumbruch. SVG bricht nichts von allein um — also wird hier
 * umgebrochen, und zwar an Wortgrenzen und nicht mitten im Wort.
 */

export function umbrechen(text: string, maxZeichen: number): string[] {
  const woerter = text.split(/\s+/).filter(Boolean);
  if (woerter.length === 0) return [];

  const zeilen: string[] = [];
  let zeile = "";
  for (const wort of woerter) {
    const versuch = zeile ? `${zeile} ${wort}` : wort;
    if (versuch.length <= maxZeichen || !zeile) {
      zeile = versuch;
    } else {
      zeilen.push(zeile);
      zeile = wort;
    }
  }
  if (zeile) zeilen.push(zeile);
  return zeilen;
}

/** Zu lange Einzelwörter kürzen, damit nichts über den Rand läuft. */
export function kuerzen(text: string, maxZeichen: number): string {
  if (text.length <= maxZeichen) return text;
  return `${text.slice(0, Math.max(1, maxZeichen - 1)).trimEnd()}…`;
}
