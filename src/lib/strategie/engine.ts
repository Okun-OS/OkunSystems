import {
  GRENZE_AUTOMATISIERUNGEN,
  type PostenArt,
  type PostenZustand,
} from "./katalog";

/**
 * Die Rechnung und die Regeln des Strategiegesprächs.
 *
 * Zwei Dinge, die zusammengehören, weil beide dieselbe Grenze kennen müssen:
 * Was ein Posten den Betrieb heute kostet, und wie viele Posten das Paket
 * hergibt.
 *
 * Alles hier ist rein — keine Datenbank, kein Modell. Eine Regel, an der eine
 * Zusage hängt, muss sich prüfen lassen, ohne ein Gespräch zu führen.
 */

// ─── Was ein Posten heute kostet ─────────────────────────────────────────────

export type ErhobeneAufgabe = {
  /** Katalogschlüssel aus `BlueprintTask`. */
  catalogKey: string;
  label: string;
  minutesPerMonth: number;
};

export type AufwandErgebnis = {
  minuten: number;
  /** Die Aufgaben, die tatsächlich dahinterstehen — mit ihren Minuten. */
  belege: ErhobeneAufgabe[];
  /** Zugeordnete Schlüssel, die es bei diesem Betrieb gar nicht gibt. */
  unbekannt: string[];
};

/**
 * Was die zugeordneten Aufgaben den Betrieb heute im Monat kosten.
 *
 * Bewusst der **heutige Aufwand** und keine Ersparnis. Wie viel nach der
 * Umstellung übrig bleibt, wissen wir vorher nicht; was die Aufgabe heute
 * kostet, hat der Betrieb selbst angegeben. Eine Zahl, die er wiedererkennt,
 * trägt im Gespräch weiter als eine, die wir hochgerechnet haben.
 *
 * Schlüssel, die bei diesem Betrieb nicht erhoben wurden, zählen nicht mit —
 * sie werden gemeldet. Die Zuordnung kann aus einem Entwurf stammen, und ein
 * Entwurf kann sich eine Aufgabe ausdenken; in die Zahl darf das nie geraten.
 */
export function aufwandHeute(
  aufgabenKeys: string[],
  erhoben: ErhobeneAufgabe[]
): AufwandErgebnis {
  const nachKey = new Map(erhoben.map((a) => [a.catalogKey, a]));
  const belege: ErhobeneAufgabe[] = [];
  const unbekannt: string[] = [];
  const gesehen = new Set<string>();

  for (const key of aufgabenKeys) {
    if (gesehen.has(key)) continue;
    gesehen.add(key);
    const treffer = nachKey.get(key);
    if (treffer) belege.push(treffer);
    else unbekannt.push(key);
  }

  return {
    minuten: belege.reduce((summe, a) => summe + a.minutesPerMonth, 0),
    belege,
    unbekannt,
  };
}

/** Minuten als Stunden, wie sie im Gespräch gesprochen werden. */
export function alsStunden(minuten: number): string {
  const stunden = minuten / 60;
  if (stunden >= 10) return `${Math.round(stunden)} Stunden`;
  return `${stunden.toLocaleString("de-DE", { maximumFractionDigits: 1 })} Stunden`;
}

// ─── Die Auswahl ─────────────────────────────────────────────────────────────

export type PostenStand = {
  id: string;
  art: PostenArt;
  zustand: PostenZustand;
  titel: string;
  kundeSieht: boolean;
};

export type AuswahlPruefung = {
  ok: boolean;
  /** Gewählte Automatisierungen. */
  gewaehlt: number;
  /** Wie viele noch gehen. */
  frei: number;
  grenze: number;
  fehler: string[];
};

/**
 * Hält die Auswahl, was das Paket hergibt?
 *
 * Nur Automatisierungen zählen gegen die Grenze. Digitale Grundlagen sind im
 * Paket nicht begrenzt — sie sind die Voraussetzung, nicht die Leistung.
 * Workforce ist ein eigener Block. Individuelle Entwicklungen liegen von
 * vornherein über dem Paket; sie dürfen gewählt werden, aber nie stillschweigend.
 */
export function pruefeAuswahl(posten: PostenStand[]): AuswahlPruefung {
  const fehler: string[] = [];

  const gewaehlt = posten.filter((p) => p.zustand === "gewaehlt");
  const automatisierungen = gewaehlt.filter((p) => p.art === "automatisierung").length;

  if (automatisierungen > GRENZE_AUTOMATISIERUNGEN) {
    fehler.push(
      `Das Paket enthält ${GRENZE_AUTOMATISIERUNGEN} Automatisierungen, gewählt sind ${automatisierungen}. ` +
        `Eine davon muss zurück auf „später möglich“ — sonst verkaufen wir eine Nachforderung.`
    );
  }

  const offene = gewaehlt.filter((p) => p.art === "offen");
  for (const p of offene) {
    fehler.push(
      `„${p.titel}“ ist noch nicht eingeordnet. Ohne Art lässt sich nicht sagen, ob der Posten gegen die ${GRENZE_AUTOMATISIERUNGEN} zählt.`
    );
  }

  const unsichtbar = gewaehlt.filter((p) => !p.kundeSieht);
  for (const p of unsichtbar) {
    fehler.push(
      `„${p.titel}“ ist gewählt, steht dem Kunden aber nicht zur Wahl. Entweder freigeben oder abwählen.`
    );
  }

  return {
    ok: fehler.length === 0,
    gewaehlt: automatisierungen,
    frei: Math.max(GRENZE_AUTOMATISIERUNGEN - automatisierungen, 0),
    grenze: GRENZE_AUTOMATISIERUNGEN,
    fehler,
  };
}

/**
 * Darf dieser Posten noch gewählt werden?
 *
 * Die Antwort gehört in die Oberfläche, bevor jemand klickt — ein Knopf, der
 * erst nach dem Drücken sagt, dass er nicht geht, ist im Gespräch vor Publikum
 * das Letzte, was man braucht.
 */
export function darfWaehlen(
  posten: PostenStand,
  alle: PostenStand[]
): { erlaubt: boolean; grund?: string } {
  if (posten.zustand === "gewaehlt") return { erlaubt: true };
  if (posten.art === "offen") {
    return { erlaubt: false, grund: "Noch nicht eingeordnet." };
  }
  if (posten.art !== "automatisierung") return { erlaubt: true };

  const schon = alle.filter(
    (p) => p.zustand === "gewaehlt" && p.art === "automatisierung"
  ).length;
  if (schon >= GRENZE_AUTOMATISIERUNGEN) {
    return {
      erlaubt: false,
      grund: `Ihr Paket enthält ${GRENZE_AUTOMATISIERUNGEN} Automatisierungen. Dafür müsste eine andere weichen.`,
    };
  }
  return { erlaubt: true };
}

// ─── Zusammenfassung ─────────────────────────────────────────────────────────

export type Zusammenfassung = {
  gewaehlt: number;
  kandidaten: number;
  spaeter: number;
  /** Heutiger Aufwand aller gewählten Posten, in Minuten pro Monat. */
  aufwandGewaehltMinuten: number;
  /** Was über dem gebuchten Paket liegt — getrennt ausgewiesen. */
  ueberDemPaket: number;
  jeArt: Record<PostenArt, number>;
};

export function fasseZusammen(
  posten: Array<PostenStand & { aufwandHeuteMinuten: number }>
): Zusammenfassung {
  const jeArt: Record<PostenArt, number> = {
    grundlage: 0,
    automatisierung: 0,
    workforce: 0,
    custom: 0,
    offen: 0,
  };

  let aufwand = 0;
  let gewaehlt = 0;
  let ueber = 0;

  for (const p of posten) {
    if (p.zustand !== "gewaehlt") continue;
    gewaehlt++;
    jeArt[p.art]++;
    aufwand += p.aufwandHeuteMinuten;
    if (p.art === "custom") ueber++;
  }

  return {
    gewaehlt,
    kandidaten: posten.filter((p) => p.zustand === "kandidat").length,
    spaeter: posten.filter((p) => p.zustand === "spaeter").length,
    aufwandGewaehltMinuten: aufwand,
    ueberDemPaket: ueber,
    jeArt,
  };
}

/**
 * Was der Freigabe noch im Weg steht.
 *
 * Vor dem Termin, nicht während: Wer im Gespräch merkt, dass ein Posten nicht
 * eingeordnet ist, kann nichts mehr tun — der Kunde sitzt daneben.
 */
export function freigabeHindernisse(
  posten: Array<PostenStand & { aufwandHeuteMinuten: number }>
): string[] {
  const hindernisse: string[] = [];

  const sichtbar = posten.filter((p) => p.kundeSieht && p.zustand !== "verworfen");
  if (sichtbar.length === 0) {
    hindernisse.push("Es steht nichts zur Wahl — alle Posten sind ausgeblendet oder verworfen.");
  }

  const offen = sichtbar.filter((p) => p.art === "offen");
  if (offen.length > 0) {
    hindernisse.push(
      `${offen.length === 1 ? "Ein Posten ist" : `${offen.length} Posten sind`} noch nicht eingeordnet: ` +
        offen.map((p) => `„${p.titel}“`).join(", ")
    );
  }

  const automatisierungen = sichtbar.filter((p) => p.art === "automatisierung");
  if (automatisierungen.length > 0 && automatisierungen.length < 2) {
    hindernisse.push(
      "Nur eine Automatisierung steht zur Wahl. Zur Auswahl gehört eine Wahl — es sollten mehr Kandidaten dastehen als Plätze."
    );
  }

  return hindernisse;
}

// ─── Wer führt ───────────────────────────────────────────────────────────────

export type Fuehrung = "folgt" | "frei";

/**
 * Wie lange ein Lebenszeichen des Beraters zählt.
 *
 * Großzügig gewählt: Lieber zeigt die Kundenseite einen Moment zu lange
 * „Ihr Berater führt", als dass sie mitten im Satz die Führung abgibt und
 * der Kunde plötzlich woanders steht.
 */
export const PRESENCE_MS = 90_000;

export function istBeraterDa(beraterPresenceAt: Date | null, jetzt = new Date()): boolean {
  if (!beraterPresenceAt) return false;
  const her = jetzt.getTime() - beraterPresenceAt.getTime();
  // Eine Uhr, die vorgeht, darf die Führung nicht abschalten.
  return her < PRESENCE_MS;
}

/**
 * Folgt der Kunde gerade, oder geht er allein?
 *
 * Nach dem Gespräch gehört das Haus ihm — da führt niemand mehr, auch wenn
 * der Berater zufällig noch die Seite offen hat.
 */
export function fuehrungFuer(
  sitzung: { abgeschlossenAm: Date | null; beraterPresenceAt: Date | null },
  jetzt = new Date()
): Fuehrung {
  if (sitzung.abgeschlossenAm) return "frei";
  return istBeraterDa(sitzung.beraterPresenceAt, jetzt) ? "folgt" : "frei";
}
