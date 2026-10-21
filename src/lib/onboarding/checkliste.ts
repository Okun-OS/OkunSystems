/**
 * Die Onboarding-Checkliste des Kunden.
 *
 * Ein neuer Betrieb hat im Portal viel zu sehen und keine Reihenfolge dafür.
 * Diese Liste gibt ihm eine — und zwar eine, die mitdenkt: Was aus dem Stand
 * des Betriebs ablesbar ist, hakt sich selbst ab. Eine Checkliste, die man
 * vollständig von Hand pflegt, ist nach zwei Wochen falsch und wird ab dann
 * ignoriert.
 *
 * Hier liegt nur die Regel. Geladen wird nebenan, damit sich das Ganze ohne
 * Datenbank prüfen lässt.
 */

/** Woher der Haken kommt. */
export type Herkunft = "stand" | "selbst";

export type SchrittVorlage = {
  schluessel: string;
  titel: string;
  text: string;
  /** Wohin der Kunde geht, um diesen Schritt zu tun. */
  href: string;
  linkText: string;
  herkunft: Herkunft;
  /** Wer ihn tut. Was bei uns liegt, wird dem Kunden nicht als Aufgabe angeboten. */
  werTut: "kunde" | "okun";
};

/**
 * Der Weg eines Betriebs durch OKUN, in sieben Schritten.
 *
 * Bewusst der Weg und nicht eine Aufgabenliste: Zwei Schritte erledigen wir,
 * nicht der Kunde — sie stehen trotzdem drin, weil er sonst nicht weiß, wo er
 * gerade ist.
 */
export const ONBOARDING_SCHRITTE: readonly SchrittVorlage[] = [
  {
    schluessel: "zugang",
    titel: "Zugang eingerichtet",
    text: "Sie sind im Portal angemeldet und haben ein eigenes Passwort gesetzt.",
    href: "/portal/einstellungen",
    linkText: "Einstellungen",
    herkunft: "stand",
    werTut: "kunde",
  },
  {
    schluessel: "video",
    titel: "Begrüßung angesehen",
    text: "Fünf Minuten, die erklären, was in den nächsten Wochen passiert.",
    href: "/dashboard",
    linkText: "Video ansehen",
    herkunft: "selbst",
    werTut: "kunde",
  },
  {
    schluessel: "stammdaten",
    titel: "Ihre Daten geprüft",
    text: "Firmenname, Anschrift und Ansprechpartner — damit Verträge und Rechnungen stimmen.",
    href: "/portal/profil",
    linkText: "Profil öffnen",
    herkunft: "selbst",
    werTut: "kunde",
  },
  {
    schluessel: "blueprint",
    titel: "Blueprint abgeschlossen",
    text: "Die strukturierte Aufnahme Ihrer Abläufe. Grundlage für alles Weitere.",
    href: "/blueprint",
    linkText: "Blueprint",
    herkunft: "stand",
    werTut: "kunde",
  },
  {
    schluessel: "termin",
    titel: "Strategiegespräch gebucht",
    text: "Der Termin, in dem wir die Ergebnisse gemeinsam durchgehen.",
    href: "/termine",
    linkText: "Termin buchen",
    herkunft: "stand",
    werTut: "kunde",
  },
  {
    schluessel: "studio",
    titel: "Transformation Studio freigegeben",
    text: "Ihr Betrieb als Haus — nach dem Gespräch jederzeit wieder ansehbar.",
    href: "/portal/studio",
    linkText: "Studio öffnen",
    herkunft: "stand",
    werTut: "okun",
  },
  {
    schluessel: "lernen",
    titel: "Lernpfad begonnen",
    text: "Die Inhalte zu dem, was bei Ihnen umgesetzt wird.",
    href: "/portal/lernen",
    linkText: "Lernen",
    herkunft: "stand",
    werTut: "kunde",
  },
] as const;

/** Was sich aus dem Stand des Betriebs ablesen lässt. */
export type OnboardingStand = {
  zugangEingerichtet: boolean;
  blueprintFertig: boolean;
  strategieterminVorhanden: boolean;
  studioFreigegeben: boolean;
  lernenBegonnen: boolean;
  /** Die Schlüssel, die der Kunde selbst abgehakt hat. */
  selbstErledigt: readonly string[];
};

export type Schritt = SchrittVorlage & {
  erledigt: boolean;
  /** Nur selbst gesetzte Haken lassen sich wieder lösen. */
  abhakbar: boolean;
};

function istErledigt(schluessel: string, stand: OnboardingStand): boolean {
  switch (schluessel) {
    case "zugang":
      return stand.zugangEingerichtet;
    case "blueprint":
      return stand.blueprintFertig;
    case "termin":
      /*
        Ein freigegebenes Studio setzt ein geführtes Gespräch voraus — und
        damit einen Termin. Ohne diese Klammer bliebe der Haken offen, weil
        der Termin inzwischen vergangen und abgesagt oder gelöscht ist, und
        die Liste behauptete einen Rückschritt, den es nicht gab.
      */
      return stand.strategieterminVorhanden || stand.studioFreigegeben;
    case "studio":
      return stand.studioFreigegeben;
    case "lernen":
      return stand.lernenBegonnen;
    default:
      return stand.selbstErledigt.includes(schluessel);
  }
}

export function baueCheckliste(stand: OnboardingStand): Schritt[] {
  return ONBOARDING_SCHRITTE.map((vorlage) => ({
    ...vorlage,
    erledigt: istErledigt(vorlage.schluessel, stand),
    abhakbar: vorlage.herkunft === "selbst",
  }));
}

/**
 * Der nächste Schritt — der erste offene, nicht der erste überhaupt.
 *
 * „Warten, bis OKUN freigibt" ist kein nächster Schritt für den Kunden.
 * Deshalb zeigt der Hinweis auf den ersten offenen Schritt, der bei ihm
 * liegt — und nur wenn keiner mehr bei ihm liegt, auf den ersten offenen
 * überhaupt, damit die Zeile nicht leer bleibt.
 */
export function naechsterSchritt(schritte: readonly Schritt[]): Schritt | null {
  const offen = schritte.filter((s) => !s.erledigt);
  if (offen.length === 0) return null;
  return offen.find((s) => s.werTut === "kunde") ?? offen[0];
}

export function fortschritt(schritte: readonly Schritt[]): {
  erledigt: number;
  gesamt: number;
  prozent: number;
} {
  const erledigt = schritte.filter((s) => s.erledigt).length;
  const gesamt = schritte.length;
  return {
    erledigt,
    gesamt,
    prozent: gesamt > 0 ? Math.round((erledigt / gesamt) * 100) : 0,
  };
}
