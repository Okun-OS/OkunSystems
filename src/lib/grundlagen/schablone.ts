import { PURPOSES } from "@/lib/blueprint/pillar3-catalog";

/**
 * Die Schablone für die digitalen Grundlagen.
 *
 * Der Betrieb zeigt, was er hat. Wir legen darüber, was er braucht. Was
 * dabei herauskommt, sind vier Aussagen — und jede ist ein Satz, den man im
 * Gespräch sagen kann: Das bleibt. Das fällt weg. Das geht zusammen. Das
 * fehlt.
 *
 * Hier stehen nur die Regeln. Sie rechnen mit Werten und brauchen keine
 * Datenbank, damit sich nachprüfen lässt, was das Gespräch später behauptet.
 *
 * Die Leitlinie über allem: **im Zweifel weniger behaupten.** Ein Vorschlag,
 * jemandem ein Programm zu streichen, das er mag oder das wir gar nicht
 * ersetzen können, kostet mehr Vertrauen, als eine übersehene Ersparnis an
 * Argument einbringt.
 */

// ─── Was OKUN Workforce wirklich abdeckt ─────────────────────────────────────

/**
 * Die sechs Module aus `packages/umfang.ts`, in Zwecke übersetzt.
 *
 * Bewusst unvollständig. Drei Module lassen sich auf einen Zweck abbilden,
 * drei nicht:
 *
 * - **Urlaubsmanagement** steckt in Dienstplanung und Personaldaten; ein
 *   eigener Zweck existiert nicht und wäre erfunden.
 * - **Lohnabrechnung** hat im Katalog überhaupt keinen Zweck. Sie erscheint
 *   als Programm („externes Lohnbüro", „macht der Steuerberater"), und ob
 *   man einem Betrieb sein Lohnbüro nimmt, entscheidet kein Abgleich,
 *   sondern ein Mensch.
 * - **Auswertungen** bringt Workforce für *Personalzahlen*. Der Zweck
 *   „Auswertungen und Zahlen" ist viel breiter. Würde man ihn hier
 *   eintragen, behauptete die Schablone, wir lösen sein Berichtswesen ab.
 */
export const WORKFORCE_ZWECKE: readonly string[] = [
  "pur_scheduling", // Dienstplanung
  "pur_time", // Zeiterfassung
  "pur_hr", // Digitale Mitarbeiterakte
] as const;

/** In welchen Paketen Workforce enthalten ist. */
export const WORKFORCE_PAKETE: readonly string[] = ["operations", "custom"] as const;

export function workforceImPaket(paket: string | null | undefined): boolean {
  return Boolean(paket && WORKFORCE_PAKETE.includes(paket));
}

// ─── Eingabe und Ergebnis ────────────────────────────────────────────────────

export type Programm = {
  name: string;
  /** Zweck-Schlüssel, die dieses Programm heute trägt. */
  zwecke: string[];
  kostenProMonat: number | null;
  /** monatlich | jahresvertrag | unbekannt */
  bindung: string | null;
  /** laeuft | gehtso | aergert */
  zufriedenheit: string | null;
};

/** Die vier Aussagen, in der Reihenfolge, in der man sie ausspricht. */
export type Bewegung = "bleibt" | "faellt_weg" | "geht_zusammen" | "fehlt";

export type Vorschlag = {
  bewegung: Bewegung;
  titel: string;
  /** Warum — in der Sprache des Gesprächs, nicht in unserer. */
  begruendung: string;
  /** Betroffene Programme. */
  programme: string[];
  zweckKeys: string[];
  /** Was es im Monat spart. Nur bei `faellt_weg`, und nur wenn bekannt. */
  sparenProMonat: number | null;
  /** Greift erst zum Vertragsende — mindestens ein Jahresvertrag im Spiel. */
  erstZumVertragsende: boolean;
  /**
   * Der Vorschlag braucht eine menschliche Entscheidung, bevor er irgendwo
   * steht. Bei allem, was einem Betrieb etwas wegnimmt, ist das der Fall.
   */
  pruefen: boolean;
};

function zweckLabel(key: string): string {
  return PURPOSES.find((p) => p.key === key)?.label ?? key;
}

function aufzaehlung(teile: string[]): string {
  if (teile.length <= 1) return teile[0] ?? "";
  return `${teile.slice(0, -1).join(", ")} und ${teile[teile.length - 1]}`;
}

// ─── Die Regeln ──────────────────────────────────────────────────────────────

export type SchablonenEingabe = {
  programme: Programm[];
  paket: string | null;
  /**
   * Zwecke, bei denen im Blueprint tatsächlich Zeit anfällt.
   *
   * Nur sie können fehlen. Ein Zweck ohne Programm *und* ohne Zeitaufwand ist
   * keine Lücke, sondern etwas, das dieser Betrieb schlicht nicht tut — und
   * ihn darauf hinzuweisen, lässt uns wie einen Katalog aussehen.
   */
  zweckeMitAufwand: string[];
};

/**
 * Was wegfällt, weil das Paket es ohnehin mitbringt.
 *
 * Drei Bedingungen, alle drei nötig:
 *
 * 1. Workforce ist im gebuchten Paket. Sonst ist derselbe Befund kein
 *    Sparvorschlag, sondern ein Argument fürs größere Paket — und das ist
 *    ein anderer Satz.
 * 2. **Jeder** Zweck des Programms wird von Workforce abgedeckt. Ein
 *    Programm, das nebenbei noch die Rechnungen macht, kann nicht weg.
 * 3. Der Betrieb ist damit nicht zufrieden. „Läuft gut" heißt: Finger weg.
 */
function wegfall(ein: SchablonenEingabe): Vorschlag[] {
  if (!workforceImPaket(ein.paket)) return [];

  return ein.programme
    .filter((p) => p.zwecke.length > 0)
    .filter((p) => p.zwecke.every((z) => WORKFORCE_ZWECKE.includes(z)))
    .filter((p) => p.zufriedenheit !== "laeuft")
    .map((p) => ({
      bewegung: "faellt_weg" as const,
      titel: `${p.name} wird nicht mehr gebraucht`,
      begruendung:
        `${aufzaehlung(p.zwecke.map(zweckLabel))} übernimmt OKUN Workforce, ` +
        `das in Ihrem Paket enthalten ist.`,
      programme: [p.name],
      zweckKeys: [...p.zwecke],
      sparenProMonat: p.kostenProMonat,
      erstZumVertragsende: p.bindung === "jahresvertrag",
      pruefen: true,
    }));
}

/**
 * Was bleibt, obwohl das Paket es könnte.
 *
 * Diese Zeile ist kein Füllmaterial. Sie hält fest, dass wir das Programm
 * gesehen und bewusst nicht angetastet haben — und verhindert, dass im
 * nächsten Gespräch jemand dieselbe Streichung noch einmal vorschlägt.
 */
function bleibt(ein: SchablonenEingabe): Vorschlag[] {
  if (!workforceImPaket(ein.paket)) return [];

  return ein.programme
    .filter((p) => p.zwecke.length > 0)
    .filter((p) => p.zwecke.every((z) => WORKFORCE_ZWECKE.includes(z)))
    .filter((p) => p.zufriedenheit === "laeuft")
    .map((p) => ({
      bewegung: "bleibt" as const,
      titel: `${p.name} bleibt`,
      begruendung:
        `OKUN Workforce könnte das übernehmen — aber Sie sind damit zufrieden. ` +
        `Dann rühren wir es nicht an.`,
      programme: [p.name],
      zweckKeys: [...p.zwecke],
      sparenProMonat: null,
      erstZumVertragsende: false,
      pruefen: false,
    }));
}

/**
 * Was zusammengeht.
 *
 * Mehrere Programme für denselben Zweck sind ein Medienbruch — zwei Orte für
 * dieselbe Sache, zwischen denen jemand abtippt. Kein Urteil über die
 * Programme, sondern über den Zustand.
 */
function zusammen(ein: SchablonenEingabe): Vorschlag[] {
  const vorschlaege: Vorschlag[] = [];

  for (const zweck of PURPOSES) {
    const traeger = ein.programme.filter((p) => p.zwecke.includes(zweck.key));
    if (traeger.length < 2) continue;

    // Was wir ohnehin ablösen, braucht keine zweite Empfehlung.
    const abgeloest = workforceImPaket(ein.paket) && WORKFORCE_ZWECKE.includes(zweck.key);
    if (abgeloest) continue;

    vorschlaege.push({
      bewegung: "geht_zusammen",
      titel: `${zweck.label} an einer Stelle`,
      begruendung:
        `Das läuft heute über ${aufzaehlung(traeger.map((t) => t.name))}. ` +
        `Zwei Orte für dieselbe Sache heißt: Irgendjemand überträgt.`,
      programme: traeger.map((t) => t.name),
      zweckKeys: [zweck.key],
      sparenProMonat: null,
      erstZumVertragsende: false,
      pruefen: true,
    });
  }

  return vorschlaege;
}

/**
 * Was fehlt.
 *
 * Nur dort, wo auch Zeit anfällt. Ein Zweck ohne Programm und ohne Aufwand
 * ist keine Lücke — den tut dieser Betrieb einfach nicht.
 */
function fehlt(ein: SchablonenEingabe): Vorschlag[] {
  const belegt = new Set(ein.programme.flatMap((p) => p.zwecke));

  return ein.zweckeMitAufwand
    .filter((key) => !belegt.has(key))
    .filter((key) => PURPOSES.some((p) => p.key === key))
    .map((key) => ({
      bewegung: "fehlt" as const,
      titel: `${zweckLabel(key)} — dafür haben Sie nichts`,
      begruendung:
        `Es kostet Sie trotzdem Zeit. Heute läuft es über Zettel, Excel oder ` +
        `im Kopf.`,
      programme: [],
      zweckKeys: [key],
      sparenProMonat: null,
      erstZumVertragsende: false,
      pruefen: true,
    }));
}

/** Die Reihenfolge im Gespräch: erst was bleibt, dann die Veränderungen. */
const ORDNUNG: Record<Bewegung, number> = {
  bleibt: 0,
  faellt_weg: 1,
  geht_zusammen: 2,
  fehlt: 3,
};

export function legeSchabloneAn(ein: SchablonenEingabe): Vorschlag[] {
  return [...bleibt(ein), ...wegfall(ein), ...zusammen(ein), ...fehlt(ein)].sort(
    (a, b) => ORDNUNG[a.bewegung] - ORDNUNG[b.bewegung]
  );
}

/**
 * Was die Streichungen zusammen sparen.
 *
 * Wieder nur das Bekannte, und wieder ausdrücklich eine Untergrenze. Getrennt
 * ausgewiesen wird, was erst zum Vertragsende greift — sonst steht im
 * Gespräch eine Zahl, die der Kunde nächsten Monat nicht wiederfindet.
 */
export function ersparnis(vorschlaege: readonly Vorschlag[]): {
  sofort: number;
  zumVertragsende: number;
  unbekannt: number;
} {
  let sofort = 0;
  let zumVertragsende = 0;
  let unbekannt = 0;

  for (const v of vorschlaege) {
    if (v.bewegung !== "faellt_weg") continue;
    if (v.sparenProMonat === null) {
      unbekannt++;
      continue;
    }
    if (v.erstZumVertragsende) zumVertragsende += v.sparenProMonat;
    else sofort += v.sparenProMonat;
  }

  return { sofort, zumVertragsende, unbekannt };
}
