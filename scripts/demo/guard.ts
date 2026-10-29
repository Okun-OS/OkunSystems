/**
 * Riegel vor die Demo-Skripte.
 *
 * Sie legen eine erfundene Firma an, erzeugen Benutzer mit einem bekannten
 * Kennwort und räumen vor dem Seed Daten ab. Gegen die Produktionsdatenbank
 * gerichtet wäre das ein Schaden, den man nicht zurücknehmen kann — deshalb
 * läuft hier nichts, bevor nicht feststeht, dass die Datenbank auf diesem
 * Rechner liegt.
 *
 * Geprüft wird beim Import, nicht in einer Funktion, die man zu rufen
 * vergessen kann.
 */
const URL_VAR = process.env.DATABASE_URL;

if (!URL_VAR) {
  throw new Error(
    "DATABASE_URL fehlt. Die Demo-Skripte laufen nur gegen eine lokale Datenbank — " +
      "siehe scripts/demo/README.md."
  );
}

const ERLAUBTE_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

let host: string;
try {
  host = new URL(URL_VAR).hostname;
} catch {
  throw new Error("DATABASE_URL ist keine gültige Adresse.");
}

if (!ERLAUBTE_HOSTS.has(host)) {
  throw new Error(
    `Abgebrochen: DATABASE_URL zeigt auf "${host}". Die Demo-Skripte legen ` +
      "Testdaten an und löschen vorhandene — sie laufen ausschließlich gegen " +
      "localhost. Wenn das hier wirklich eine lokale Datenbank ist, verbinde " +
      "dich über 127.0.0.1."
  );
}

export const demoDatenbank = URL_VAR;
