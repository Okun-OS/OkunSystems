/**
 * Zeitrechnung in deutscher Ortszeit.
 *
 * Der Server steht bei Railway in UTC, die Kundschaft sitzt in Deutschland.
 * Wer auf dem Server `setHours(13)` schreibt, meint 13:00 UTC — im Browser des
 * Kunden steht dann 15:00. Genau so ist es passiert: ausgewählt war 13 Uhr,
 * im Portal stand 15 Uhr.
 *
 * Deshalb hier eine Handvoll Funktionen, die **immer** Europe/Berlin meinen,
 * unabhängig davon, wo der Prozess läuft. Sommerzeit kommt aus der Zeitzonen-
 * datenbank der Laufzeit, nicht aus einer eigenen Regel — eine selbstgebaute
 * Umstellung ist zweimal im Jahr falsch.
 */

export const ZONE = "Europe/Berlin";

const TEILE = new Intl.DateTimeFormat("en-US", {
  timeZone: ZONE,
  hourCycle: "h23",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

export type Zeitteile = {
  jahr: number;
  monat: number;
  tag: number;
  stunde: number;
  minute: number;
  sekunde: number;
};

/** Datum und Uhrzeit, wie eine Uhr in Berlin sie in diesem Moment zeigt. */
export function berlinTeile(d: Date): Zeitteile {
  const p = Object.fromEntries(
    TEILE.formatToParts(d)
      .filter((x) => x.type !== "literal")
      .map((x) => [x.type, Number(x.value)])
  ) as Record<string, number>;
  return {
    jahr: p.year,
    monat: p.month,
    tag: p.day,
    stunde: p.hour % 24,
    minute: p.minute,
    sekunde: p.second,
  };
}

/** Wie weit Berlin an diesem Zeitpunkt vor UTC liegt, in Minuten (60 oder 120). */
export function berlinVersatzMinuten(d: Date): number {
  const t = berlinTeile(d);
  const alsWaereEsUtc = Date.UTC(t.jahr, t.monat - 1, t.tag, t.stunde, t.minute, t.sekunde);
  return Math.round((alsWaereEsUtc - d.getTime()) / 60000);
}

/**
 * Der Zeitpunkt, an dem in Berlin dieses Datum und diese Uhrzeit ist.
 *
 * Zwei Durchgänge: Der erste schätzt den Versatz anhand der angenommenen Zeit,
 * der zweite prüft ihn am Ergebnis. In den beiden Umstellungsnächten liegt der
 * erste Versuch sonst um eine Stunde daneben.
 */
export function berlinZeitpunkt(
  jahr: number,
  monat: number,
  tag: number,
  stunde: number,
  minute = 0
): Date {
  const angenommen = Date.UTC(jahr, monat - 1, tag, stunde, minute, 0);
  const ersterVersatz = berlinVersatzMinuten(new Date(angenommen));
  const ersterVersuch = new Date(angenommen - ersterVersatz * 60000);
  const zweiterVersatz = berlinVersatzMinuten(ersterVersuch);
  if (zweiterVersatz === ersterVersatz) return ersterVersuch;
  return new Date(angenommen - zweiterVersatz * 60000);
}

/** „2026-10-15“ in Berliner Zeit — der Schlüssel für einen Kalendertag. */
export function berlinTagesschluessel(d: Date): string {
  const t = berlinTeile(d);
  return `${t.jahr}-${String(t.monat).padStart(2, "0")}-${String(t.tag).padStart(2, "0")}`;
}

/** Zerlegt „2026-10-15“ in seine Zahlen. Ohne Zeitzonenumweg. */
export function tagAusSchluessel(schluessel: string): { jahr: number; monat: number; tag: number } | null {
  const treffer = /^(\d{4})-(\d{2})-(\d{2})$/.exec(schluessel.trim());
  if (!treffer) return null;
  const jahr = Number(treffer[1]);
  const monat = Number(treffer[2]);
  const tag = Number(treffer[3]);
  if (monat < 1 || monat > 12 || tag < 1 || tag > 31) return null;
  return { jahr, monat, tag };
}

/** Die Stunde, die in Berlin zu diesem Zeitpunkt auf der Uhr steht. */
export function berlinStundeVon(d: Date): number {
  return berlinTeile(d).stunde;
}

/**
 * Der Wochentag eines Kalendertages: 0 ist Sonntag, 6 ist Samstag.
 *
 * Aus den Kalenderzahlen, nicht aus einem Zeitpunkt — welcher Wochentag der
 * 15. Oktober ist, hängt nicht an einer Zeitzone.
 */
export function berlinWochentagVon(jahr: number, monat: number, tag: number): number {
  return new Date(Date.UTC(jahr, monat - 1, tag)).getUTCDay();
}

/** Der Wochentag in Berlin zu einem Zeitpunkt. */
export function berlinWochentag(d: Date): number {
  const t = berlinTeile(d);
  return berlinWochentagVon(t.jahr, t.monat, t.tag);
}

/** Mitternacht und das Ende desselben Kalendertages in Berlin. */
export function berlinTagesgrenzen(jahr: number, monat: number, tag: number): { von: Date; bis: Date } {
  const von = berlinZeitpunkt(jahr, monat, tag, 0, 0);
  const bis = new Date(berlinZeitpunkt(jahr, monat, tag + 1, 0, 0).getTime() - 1);
  return { von, bis };
}

/**
 * Datum und Uhrzeit für Menschen — immer in deutscher Ortszeit.
 *
 * Ohne `timeZone` nimmt `toLocaleString` die Zone des Prozesses: im Browser
 * Berlin, auf dem Server UTC. Dieselbe Zahl sähe dann je nach Ort anders aus,
 * und genau das verwirrt am meisten.
 */
export function formatiereBerlin(
  d: Date | string,
  optionen: Intl.DateTimeFormatOptions = { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }
): string {
  const datum = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(datum.getTime())) return "—";
  return datum.toLocaleString("de-DE", { ...optionen, timeZone: ZONE });
}
