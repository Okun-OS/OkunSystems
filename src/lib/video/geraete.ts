/**
 * Kamera und Mikrofon fragen, bevor das Gespräch beginnt.
 *
 * Warum nicht einfach Daily machen lassen: Der Browser gibt die Geräte nur
 * frei, wenn die Frage aus einer Handlung des Benutzers kommt — aus dem
 * Klick auf „Beitreten", nicht aus einem Effekt, der danach läuft. Safari
 * nimmt das genau, besonders auf dem iPhone. Fragt niemand im richtigen
 * Moment, bleibt der Beitritt hängen, ohne dass irgendwo ein Fehler steht:
 * Genau das hat einen Interessenten zweimal aus dem Gespräch ausgesperrt.
 *
 * Deshalb wird hier im Klick gefragt. Der Strom wird sofort wieder
 * freigegeben — gebraucht wird nicht das Bild, sondern die Erlaubnis.
 */

export type GeraeteAntwort =
  | { ok: true; kamera: boolean }
  | { ok: false; grund: string };

async function kurzOeffnen(bedingungen: MediaStreamConstraints): Promise<void> {
  const strom = await navigator.mediaDevices.getUserMedia(bedingungen);
  for (const spur of strom.getTracks()) spur.stop();
}

export async function frageGeraete(): Promise<GeraeteAntwort> {
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
    return {
      ok: false,
      grund:
        "Dieser Browser gibt Kamera und Mikrofon nicht frei. Das passiert bei " +
        "einer unverschlüsselten Verbindung oder in einem eingebetteten Fenster — " +
        "bitte den Link direkt im Browser öffnen.",
    };
  }

  try {
    await kurzOeffnen({ video: true, audio: true });
    return { ok: true, kamera: true };
  } catch (fehler) {
    /*
      Ohne Kamera, aber mit Ton ist immer noch ein Gespräch.

      Die häufigsten Fälle sind kein Fehler des Benutzers: Das Notebook hat
      keine Kamera, oder sie läuft noch in Teams. Der Ton reicht.
    */
    try {
      await kurzOeffnen({ audio: true });
      return { ok: true, kamera: false };
    } catch {
      return { ok: false, grund: nenneGrund(fehler) };
    }
  }
}

/** Was der Browser meldet, in einem Satz, der weiterhilft. */
export function nenneGrund(fehler: unknown): string {
  const name =
    fehler && typeof fehler === "object" && "name" in fehler
      ? String((fehler as { name: unknown }).name)
      : "";

  switch (name) {
    case "NotAllowedError":
    case "SecurityError":
      return (
        "Kamera und Mikrofon sind für diese Seite gesperrt. In der Adressleiste " +
        "auf das Schloss tippen, beides erlauben und die Seite neu laden."
      );
    case "NotFoundError":
    case "OverconstrainedError":
      return "Es wurde weder Kamera noch Mikrofon gefunden.";
    case "NotReadableError":
    case "AbortError":
      return (
        "Kamera oder Mikrofon werden gerade von einem anderen Programm benutzt — " +
        "Teams, Zoom oder ein zweiter Browser-Tab. Dort beenden und es erneut versuchen."
      );
    default:
      return "Kamera und Mikrofon ließen sich nicht öffnen.";
  }
}
