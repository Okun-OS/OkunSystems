import { PURPOSES, STATIONS, STATIONS_OKUN_TAKES } from "@/lib/blueprint/pillar3-catalog";
import type { PostenArt } from "./katalog";

/**
 * Das Haus.
 *
 * Der Interessent betritt im Strategiegespräch sein eigenes Unternehmen: Er
 * steht davor, geht hinein, und in jedem Raum sieht er erst, wie es heute ist,
 * und danach, was sich ändert. Diese Datei baut aus den Blueprint-Daten das
 * Modell dieses Hauses — welche Räume es gibt, was darin steht und was beim
 * Umbau damit passiert.
 *
 * Bewusst getrennt von der Darstellung: Was hier entsteht, sind Werte, keine
 * Bilder. Die Zeichnung von heute und die gerenderten Szenen von später lesen
 * dasselbe Modell. Die Kunst ist austauschbar, das Haus ist es nicht.
 *
 * Und es gilt dieselbe Regel wie überall: Hier wird nichts erfunden. Jeder
 * Raum, jede Station, jede Zahl stammt aus etwas, das der Betrieb selbst
 * angegeben hat.
 */

// ─── Außen ───────────────────────────────────────────────────────────────────

/**
 * Was vor dem Haus steht.
 *
 * Ein Handwerksbetrieb hat einen Transporter vor der Tür, ein Pflegedienst
 * einen Kleinwagen, eine Spedition einen Lastzug. Es ist eine Kleinigkeit und
 * genau deshalb wirkt sie: Wer sein eigenes Fahrzeug vor der eigenen Tür
 * stehen sieht, glaubt dem Rest auch.
 */
export type Fahrzeug = "transporter" | "kleinwagen" | "lkw" | "kein";

const FAHRZEUG_JE_BRANCHE: Record<string, Fahrzeug> = {
  "M1.1-OPT-1": "kleinwagen", // Pflege / Soziale Dienste
  "M1.1-OPT-2": "transporter", // Handwerk / Baugewerbe
  "M1.1-OPT-3": "transporter", // Gebäudereinigung
  "M1.1-OPT-4": "kleinwagen", // Sicherheitsdienst
  "M1.1-OPT-5": "transporter", // Gastronomie / Catering
  "M1.1-OPT-6": "lkw", // Logistik / Transport
  "M1.1-OPT-7": "kein", // Dienstleistung
  "M1.1-OPT-8": "lkw", // Produktion
};

export function fahrzeugFuer(branchenOption: string | null | undefined): Fahrzeug {
  if (!branchenOption) return "kein";
  return FAHRZEUG_JE_BRANCHE[branchenOption] ?? "kein";
}

/** Wie viele Stockwerke das Haus bekommt — nach Größe des Betriebs. */
export function stockwerkeFuer(mitarbeitende: number | null | undefined): number {
  if (!mitarbeitende || mitarbeitende <= 0) return 3;
  if (mitarbeitende < 15) return 2;
  if (mitarbeitende < 50) return 3;
  if (mitarbeitende < 150) return 4;
  return 5;
}

/**
 * Der Name auf dem Schild.
 *
 * Rechtsformen gehören an den Vertrag, nicht an die Fassade. „NORDLICHT
 * GEBÄUDETECHNIK GMBH" in Leuchtschrift sieht aus wie ein Handelsregister;
 * „NORDLICHT" sieht aus wie ein Unternehmen.
 */
export function schildName(firma: string): string {
  /*
    Die Klammer zuerst.

    `\b` nach einer schließenden Klammer greift nicht — zwischen „)" und dem
    Zeilenende liegt keine Wortgrenze. Ohne diesen eigenen Schritt blieb aus
    „Meyer UG (haftungsbeschränkt)" ein „Meyer (haftungsbeschränkt)" übrig,
    und das stand dann in Leuchtschrift an der Fassade.
  */
  const ohneForm = firma
    .replace(/\s*\((haftungsbeschränkt|haftungsbeschraenkt)\)/gi, "")
    .replace(/\b(GmbH\s*&\s*Co\.?\s*KG|GmbH|UG|AG|KG|OHG|e\.?\s?K\.?|GbR|mbH|SE)\b\.?/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim()
    // Ein Name, der auf „&" oder einem Komma endet, ist abgeschnitten, nicht kurz.
    .replace(/[,&\-–+]\s*$/, "")
    .trim();
  const sauber = ohneForm || firma;
  // Zwei Wörter passen auf ein Schild, fünf nicht.
  const woerter = sauber.split(/\s+/);
  const kurz = woerter.length > 2 ? woerter.slice(0, 2).join(" ") : sauber;
  return kurz.replace(/[,&\-–+]\s*$/, "").trim().toUpperCase();
}

// ─── Die Räume ───────────────────────────────────────────────────────────────

export type RaumKey = "ablaeufe" | "grundlagen" | "automationen" | "workforce";

export type Raum = {
  key: RaumKey;
  titel: string;
  unterzeile: string;
  /** Was auf dem Schild über der Tür steht. */
  marke: string;
  /** Die Kennzahl auf dem Türschild — aus echten Daten. */
  kennzahl: string;
  /**
   * Verschlossen, weil das Paket es nicht enthält.
   *
   * Die Tür bleibt sichtbar. Ein Raum, den man sieht und nicht betreten kann,
   * sagt mehr über das größere Paket als jeder Hinweistext — und er lügt
   * nicht: Der Raum existiert wirklich.
   */
  verschlossen: boolean;
  /** Leer heißt: Dazu hat der Blueprint nichts hergegeben. */
  leer: boolean;
};

export type HausDaten = {
  firma: string;
  schild: string;
  stockwerke: number;
  fahrzeug: Fahrzeug;
  /** Ein Satz über den Betrieb, aus seinen eigenen Angaben. */
  hallensatz: string;
  raeume: Raum[];
};

export type AblaufStation = {
  stationKey: string;
  label: string;
  rolle: string | null;
  werkzeug: string | null;
  /** manual | partial | automatic | none */
  modus: string;
  /** Der Schritt verschwindet ganz — er war reine Doppelarbeit. */
  entfaellt: boolean;
  /** Der Schritt bleibt, läuft aber ohne Menschen. */
  wirdAutomatisch: boolean;
};

export type AblaufRaum = {
  key: string;
  titel: string;
  stationen: AblaufStation[];
  /** Stationen, die heute von Hand laufen. */
  handStationen: number;
  /** Stationen, die danach noch von Hand laufen. */
  handDanach: number;
  /** Schritte, die ganz wegfallen — reine Doppelarbeit. */
  entfallen: number;
  /** Schritte, die bleiben, aber ohne Menschen laufen. */
  uebernommen: number;
  systemwechsel: number;
  systemwechselDanach: number;
};

/**
 * Was der Umbau mit einer Station macht — und was nicht.
 *
 * Hier wird unterschieden, wo andere Darstellungen schummeln. Eine Station,
 * die OKUN übernimmt, **verschwindet nicht**: Die Arbeit passiert weiter, nur
 * ohne dass jemand davorsitzt. Verschwinden tut allein das Übertragen von
 * Daten aus einem System ins nächste — das ist Doppelarbeit, die es nach der
 * Umstellung wirklich nicht mehr gibt.
 *
 * Der Unterschied ist kein Detail. „Acht Schritte werden zwei" wäre eine
 * Behauptung, die im Projekt auffliegt. „Sechs Schritte laufen künftig ohne
 * Sie, einer entfällt" ist dasselbe Ergebnis, und es stimmt.
 */
const STATION_ENTFAELLT = "st_transfer";

export function entfaellt(stationKey: string, modus: string): boolean {
  return modus === "manual" && stationKey === STATION_ENTFAELLT;
}

export function wirdAutomatisch(stationKey: string, modus: string): boolean {
  if (modus !== "manual") return false;
  if (stationKey === STATION_ENTFAELLT) return false;
  return STATIONS_OKUN_TAKES.includes(stationKey);
}

export function baueAblaufRaum(flow: {
  catalogKey: string;
  title: string;
  stations: Array<{
    stationKey: string;
    position: number;
    role: string | null;
    systemLabel: string | null;
    mode: string;
  }>;
}): AblaufRaum {
  const stationen: AblaufStation[] = flow.stations
    .slice()
    .sort((a, b) => a.position - b.position)
    .filter((s) => s.mode !== "none")
    .map((s) => ({
      stationKey: s.stationKey,
      label: STATIONS.find((e) => e.key === s.stationKey)?.label ?? s.stationKey,
      rolle: s.role,
      werkzeug: s.systemLabel,
      modus: s.mode,
      entfaellt: entfaellt(s.stationKey, s.mode),
      wirdAutomatisch: wirdAutomatisch(s.stationKey, s.mode),
    }));

  const werkzeuge = (nurBleibende: boolean) =>
    new Set(
      stationen
        .filter((s) => (nurBleibende ? !s.entfaellt : true))
        .map((s) => s.werkzeug)
        .filter((w): w is string => Boolean(w) && w !== "none")
    ).size;

  const hand = stationen.filter((s) => s.modus === "manual").length;

  return {
    key: flow.catalogKey,
    titel: flow.title,
    stationen,
    handStationen: hand,
    handDanach: stationen.filter(
      (s) => s.modus === "manual" && !s.entfaellt && !s.wirdAutomatisch
    ).length,
    entfallen: stationen.filter((s) => s.entfaellt).length,
    uebernommen: stationen.filter((s) => s.wirdAutomatisch).length,
    systemwechsel: Math.max(werkzeuge(false) - 1, 0),
    systemwechselDanach: Math.max(werkzeuge(true) - 1, 0),
  };
}

// ─── Der Grundlagenraum ──────────────────────────────────────────────────────

export type Regalfach = {
  zweckKey: string;
  label: string;
  /** Die Programme, die diesen Zweck heute tragen. */
  programme: string[];
  /** Kein Programm — das Fach ist leer. */
  luecke: boolean;
  /** Zwei oder mehr Programme für denselben Zweck. */
  doppelt: boolean;
};

/**
 * Zwölf Fächer an der Wand, für jeden Zweck eines.
 *
 * Genau die Darstellung, die nie zum Knäuel werden kann: Es sind immer zwölf,
 * egal wie groß der Betrieb ist. Leere Fächer sind die Lücken, doppelt
 * belegte die Medienbrüche.
 */
export function baueRegal(
  systeme: Array<{ name: string; purposes: string[] }>
): Regalfach[] {
  return PURPOSES.map((p) => {
    const programme = systeme.filter((s) => s.purposes.includes(p.key)).map((s) => s.name);
    return {
      zweckKey: p.key,
      label: p.label,
      programme,
      luecke: programme.length === 0,
      doppelt: programme.length > 1,
    };
  });
}

// ─── Die Türschilder ─────────────────────────────────────────────────────────

export function baueRaeume(input: {
  paket: string | null;
  ablaeufe: number;
  stundenProMonat: number;
  luecken: number;
  felder: number;
  plaetze: number;
  vergeben: number;
  workforceGewaehlt: boolean;
}): Raum[] {
  const mitWorkforce = input.paket === "operations" || input.paket === "custom";
  const stunden = (input.stundenProMonat / 60).toLocaleString("de-DE", {
    maximumFractionDigits: 1,
  });

  return [
    {
      key: "ablaeufe",
      titel: "Ihre Abläufe",
      unterzeile: "Station für Station, so wie es heute läuft",
      marke: `${input.ablaeufe} ${input.ablaeufe === 1 ? "ABLAUF" : "ABLÄUFE"}`,
      kennzahl: `${stunden} h / Monat`,
      verschlossen: false,
      leer: input.ablaeufe === 0,
    },
    {
      key: "grundlagen",
      titel: "Digitale Grundlagen",
      unterzeile: "Zwölf Fächer an der Wand, und was darin steht",
      marke: `${input.felder} FÄCHER`,
      kennzahl:
        input.luecken === 0
          ? "vollständig"
          : `${input.luecken} ${input.luecken === 1 ? "Lücke" : "Lücken"}`,
      verschlossen: false,
      leer: false,
    },
    {
      key: "automationen",
      titel: "Bewährte Automationen",
      unterzeile: "Bis zu drei kommen ins Haus — Sie wählen",
      marke: `${input.plaetze} ${input.plaetze === 1 ? "PLATZ" : "PLÄTZE"}`,
      kennzahl: `${input.vergeben} vergeben`,
      verschlossen: false,
      leer: false,
    },
    {
      key: "workforce",
      titel: "OKUN Workforce",
      unterzeile: mitWorkforce
        ? "Das Betriebssystem für Ihr Personal"
        : "Im Paket Operations enthalten",
      marke: mitWorkforce ? "IM PAKET" : "PAKET 2",
      kennzahl: mitWorkforce
        ? input.workforceGewaehlt
          ? "wird eingeführt"
          : "noch offen"
        : "nicht gebucht",
      verschlossen: !mitWorkforce,
      leer: false,
    },
  ];
}

/**
 * Der Satz, der in der Eingangshalle steht.
 *
 * Keine Kennzahl, sondern ein Satz über den Betrieb — und zwar einer, den der
 * Betrieb selbst gesagt hat. Was wir nicht wissen, lassen wir weg, statt es
 * mit einer Floskel zu füllen.
 */
export function hallensatz(input: {
  mitarbeitende?: number | null;
  standorte?: number | null;
  fahrzeuge?: number | null;
  ort?: string | null;
  branche?: string | null;
}): string {
  const teile: string[] = [];
  if (input.mitarbeitende && input.mitarbeitende > 0) {
    teile.push(`${input.mitarbeitende} Menschen`);
  }
  if (input.fahrzeuge && input.fahrzeuge > 0) teile.push(`${input.fahrzeuge} Fahrzeuge`);
  if (input.standorte && input.standorte > 1) teile.push(`${input.standorte} Standorte`);
  else if (teile.length > 0) teile.push("ein Haus");

  if (teile.length === 0) {
    return input.branche ? `${input.branche}${input.ort ? ` in ${input.ort}` : ""}` : "Ihr Betrieb";
  }
  return teile.join(", ");
}

// ─── Der Workforce-Raum ──────────────────────────────────────────────────────

export type WorkforceModul = {
  key: string;
  titel: string;
  beschreibung: string;
  /** Welchen Zweck aus dem Regal dieses Modul übernimmt. */
  zweckKey: string | null;
  /** Was diesen Zweck heute trägt — leer heißt: niemand. */
  heute: string[];
};

/**
 * Die sechs Module aus dem Angebot, gegen den Betrieb gehalten.
 *
 * Die Beschreibungen stammen aus dem Leistungsumfang und nicht aus einer
 * Produktseite — was im Angebot steht, steht hier. Wogegen sie gehalten
 * werden, kommt aus dem Regal: Für jeden Zweck, den ein Modul übernimmt,
 * steht daneben, was ihn heute trägt. Ein leeres „heute" ist das stärkste
 * Argument, das es gibt, und es ist eins aus den eigenen Angaben.
 */
const WORKFORCE_MODULE: Array<{ key: string; titel: string; zweckKey: string | null }> = [
  { key: "dienstplanung", titel: "Dienstplanung", zweckKey: "pur_scheduling" },
  { key: "zeiterfassung", titel: "Zeiterfassung", zweckKey: "pur_time" },
  { key: "urlaub", titel: "Urlaubsmanagement", zweckKey: "pur_time" },
  { key: "lohn", titel: "Lohnabrechnung", zweckKey: "pur_hr" },
  { key: "akte", titel: "Digitale Mitarbeiterakte", zweckKey: "pur_hr" },
  { key: "auswertungen", titel: "Auswertungen und Reports", zweckKey: "pur_reports" },
];

export function baueWorkforce(
  beispiele: string[],
  regal: Regalfach[]
): WorkforceModul[] {
  return WORKFORCE_MODULE.map((m, i) => {
    // Im Angebot steht „Titel — Beschreibung"; der Teil nach dem Strich ist
    // das, was wir versprochen haben, also genau das, was hier stehen muss.
    const roh = beispiele[i] ?? "";
    const strich = roh.indexOf("—");
    const beschreibung = strich >= 0 ? roh.slice(strich + 1).trim() : roh.trim();
    const fach = m.zweckKey ? regal.find((f) => f.zweckKey === m.zweckKey) : undefined;
    return {
      key: m.key,
      titel: m.titel,
      beschreibung,
      zweckKey: m.zweckKey,
      heute: fach?.programme ?? [],
    };
  });
}

// ─── Der Plan ────────────────────────────────────────────────────────────────

export type PlanSchritt = {
  nummer: number;
  titel: string;
  was: string;
  /** Der Schritt, in dem das Gespräch selbst steht. */
  jetzt: boolean;
  /** Schon hinter uns. */
  erledigt: boolean;
};

/** Das Gespräch, in dem der Kunde gerade sitzt. */
const DIESES_GESPRAECH =
  "Strategiegespräch — Ergebnisse aus dem Blueprint, Roadmap und Auswahl der Lösungen";

/**
 * Der Weg von hier bis zum Go-Live.
 *
 * Die Schritte sind nicht erfunden, sondern der Projektablauf aus dem
 * Angebot. Nur einer kommt dazu: dieses Gespräch. Im Vertrag steckt es in
 * „Auswahl und Umsetzung", aber es findet vor den Grundlagen statt — und wer
 * vor der Strecke steht, muss sehen, wo er steht, sonst ist es eine
 * Produktgrafik und kein Plan.
 *
 * Alles vor diesem Schritt ist erledigt, alles danach ist das, wofür die
 * Auswahl von eben der Arbeitsauftrag ist.
 */
export function bauePlan(phasen: string[]): PlanSchritt[] {
  // Nach dem Blueprint, denn dafür ist es das Gespräch. Findet sich keine
  // Blueprint-Phase, steht es an dritter Stelle — so steht es im Angebot.
  const nachBlueprint = phasen.findIndex((p) => p.includes("Blueprint"));
  const jetzt = nachBlueprint >= 0 ? nachBlueprint + 1 : Math.min(2, phasen.length);
  const alle = [...phasen.slice(0, jetzt), DIESES_GESPRAECH, ...phasen.slice(jetzt)];

  return alle.map((p, i) => {
    const strich = p.indexOf("—");
    return {
      nummer: i + 1,
      titel: strich >= 0 ? p.slice(0, strich).trim() : p,
      was: strich >= 0 ? p.slice(strich + 1).trim() : "",
      jetzt: i === jetzt,
      erledigt: i < jetzt,
    };
  });
}

/** Welcher Art ein Posten im Automationsraum auf welchem Sockel steht. */
export function sockelFuerArt(art: PostenArt): "automation" | "grundlage" | "workforce" | "extra" {
  if (art === "automatisierung") return "automation";
  if (art === "grundlage") return "grundlage";
  if (art === "workforce") return "workforce";
  return "extra";
}
