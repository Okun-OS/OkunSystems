import { randomBytes } from "node:crypto";

/**
 * Lebenszeichen für Antworten, die lange brauchen.
 *
 * Eine Anfrage, über die minutenlang nichts fließt, wird unterwegs für tot
 * gehalten und abgeschnitten. Dagegen hilft ein regelmäßiges Lebenszeichen —
 * aber nur, wenn es auch ankommt.
 *
 * Genau daran ist der erste Anlauf gescheitert: Die Anwendung komprimiert ihre
 * Antworten, und ein paar Dutzend Byte bleiben im Puffer des Komprimierers
 * liegen, bis genug zusammen ist. Das Lebenszeichen wurde geschrieben, kam
 * aber nicht an, und die Leitung riss trotzdem.
 *
 * Deshalb trägt jedes Lebenszeichen eine Füllung — und zwar eine zufällige.
 * Ein Block aus Leerzeichen schrumpft im Komprimierer auf ein paar Byte und
 * hilft nichts; beim zweiten Mal wird er sogar nur als Verweis auf den ersten
 * abgelegt. Zufall lässt sich nicht zusammenfalten und drückt sich durch jeden
 * Puffer.
 *
 * Der Empfänger übergeht das Feld.
 */
export function lebenszeichen(): string {
  return (
    JSON.stringify({
      status: "laeuft",
      fuellung: randomBytes(1536).toString("base64"),
    }) + "\n"
  );
}
