import { STATIONS } from "@/lib/blueprint/pillar3-catalog";
import type { AblaufRaum, AblaufStation } from "@/lib/strategie/haus";

/**
 * Das Drehbuch für einen Ablaufraum.
 *
 * Ein Bild allein erklärt keinen Prozess. Deshalb wird jeder Raum erst
 * erzählt und dann gezeigt: eine Einführung, danach Station für Station,
 * und zum Schluss der Umbau.
 *
 * Jeder Satz hier kommt aus einer von drei Quellen — den Angaben des
 * Betriebs aus dem Blueprint, dem festen Stationskatalog, oder den Posten,
 * die ein Mensch für dieses Gespräch freigegeben hat. **Nichts wird
 * geschätzt und nichts versprochen, was nicht im Paket steht.** Das ist
 * keine Stilfrage: Was hier steht, hört der Kunde als Zusage.
 */

export type Ton = "warnung" | "neutral" | "gut";

export type Befund = { text: string; ton: Ton };

export type StationsArt = "hand" | "teilweise" | "programm" | "ruhig";

export type TourSchritt = {
  /** Der wievielte Schritt der Tour — 1-basiert. */
  nummer: number;
  /** Welche Station im Raum hervorgehoben wird. */
  stationIndex: number;
  titel: string;
  /** Was an dieser Stelle überhaupt passiert — aus dem Katalog. */
  was: string;
  /** Wer sie heute macht. */
  wer: string | null;
  /** Womit sie heute gemacht wird. */
  womit: string | null;
  art: StationsArt;
  /** Was wir hier vorgefunden haben. */
  befunde: Befund[];
  /** Was danach damit passiert — streng nach Katalogregel. */
  danach: string;
  /** Ob sich an dieser Station überhaupt etwas ändert. */
  aenderung: "entfaellt" | "uebernommen" | "bleibt";
};

export type Briefing = {
  titel: string;
  /** Zwei Sätze: worum es geht, und woher wir das wissen. */
  einleitung: string[];
  /** Die Zahlen, die den Raum erklären. */
  punkte: Array<{ wert: string; label: string; ton: Ton }>;
};

export type Fazit = {
  satz: string;
  /** Die Maßnahmen, die diesen Umbau tragen — vom Berater freigegeben. */
  massnahmen: Array<{ titel: string; womit: string | null }>;
  /** Steht keine Maßnahme dahinter, sagt der Raum das auch. */
  ohneDeckung: boolean;
};

export type Drehbuch = {
  briefing: Briefing;
  tour: TourSchritt[];
  fazit: Fazit;
};

/** Was der Katalog über eine Station sagt. */
function katalogHinweis(stationKey: string): string {
  return STATIONS.find((s) => s.key === stationKey)?.hint ?? "";
}

function artVon(station: AblaufStation): StationsArt {
  if (station.modus === "manual") return "hand";
  if (station.modus === "partial") return "teilweise";
  if (station.modus === "automatic") return "programm";
  return "ruhig";
}

/** „Papier" und „gar nichts" sind kein Programm. */
function istProgramm(werkzeug: string | null): boolean {
  if (!werkzeug) return false;
  const w = werkzeug.toLowerCase();
  return !w.startsWith("papier") && !w.startsWith("gar nichts") && w !== "none";
}

/**
 * Was wir an einer Station vorgefunden haben.
 *
 * Alles davon ist abgelesen, nichts gedeutet: Der Modus kommt aus der
 * Aufnahme, der Wechsel aus dem Vergleich zweier Stationen, das Papier aus
 * der Angabe des Betriebs.
 */
function befundeFuer(station: AblaufStation, letztesProgramm: string | null): Befund[] {
  const befunde: Befund[] = [];

  if (station.modus === "manual") {
    befunde.push({ text: "Läuft heute von Hand.", ton: "warnung" });
  } else if (station.modus === "partial") {
    befunde.push({ text: "Läuft teilweise automatisch.", ton: "neutral" });
  } else if (station.modus === "automatic") {
    befunde.push({ text: "Läuft schon automatisch.", ton: "gut" });
  }

  if (station.werkzeug && !istProgramm(station.werkzeug)) {
    befunde.push({ text: `Ohne Programm — ${station.werkzeug}.`, ton: "warnung" });
  }

  /*
    Der Medienbruch zählt gegen das zuletzt benutzte Programm — nicht gegen
    die Station davor. Dazwischen können Schritte liegen, die mit gar keinem
    Programm arbeiten; der Bruch entsteht trotzdem, und zwar genau dort, wo
    jemand etwas aus dem einen ins andere überträgt.
  */
  if (letztesProgramm && istProgramm(station.werkzeug) && letztesProgramm !== station.werkzeug) {
    befunde.push({
      text: `Wechsel von ${letztesProgramm} nach ${station.werkzeug}.`,
      ton: "warnung",
    });
  }

  return befunde;
}

/**
 * Was nach dem Umbau mit dieser Station passiert.
 *
 * Die drei Sätze folgen genau der festen Zuordnung aus dem Katalog — nicht
 * einer Einschätzung im Einzelfall. Wo entschieden statt transportiert
 * wird, bleibt es bei den Menschen, und das steht auch so da.
 */
function danachFuer(station: AblaufStation): { text: string; aenderung: TourSchritt["aenderung"] } {
  if (station.entfaellt) {
    return {
      text: "Fällt weg. Die Daten stehen dann schon dort, wo sie gebraucht werden — es gibt nichts mehr zu übertragen.",
      aenderung: "entfaellt",
    };
  }
  if (station.wirdAutomatisch) {
    return {
      text: "Läuft künftig ohne Sie. Der Schritt passiert von selbst, sobald der vorige fertig ist.",
      aenderung: "uebernommen",
    };
  }
  if (station.modus === "automatic") {
    return { text: "Bleibt, wie es ist — das läuft heute schon.", aenderung: "bleibt" };
  }
  return {
    text: "Bleibt bei Ihren Leuten. Hier wird entschieden und nicht transportiert.",
    aenderung: "bleibt",
  };
}

export type Massnahme = { titel: string; womit: string | null; art: string; zustand: string };

export function baueDrehbuch(
  raum: AblaufRaum,
  massnahmen: Massnahme[] = []
): Drehbuch {
  const stationen = raum.stationen;
  const erste = stationen[0];
  const letzte = stationen[stationen.length - 1];

  const programme = new Set(
    stationen.map((s) => s.werkzeug).filter((w): w is string => istProgramm(w))
  );
  const ohneProgramm = stationen.filter((s) => s.werkzeug && !istProgramm(s.werkzeug)).length;

  const einleitung: string[] = [];
  if (erste && letzte && stationen.length > 1) {
    einleitung.push(
      `Der Ablauf geht von „${erste.label}" bis „${letzte.label}" — dazwischen liegen ${stationen.length} Stationen.`
    );
  } else if (erste) {
    einleitung.push(`Aufgenommen ist bisher ein Schritt: „${erste.label}".`);
  }
  einleitung.push(
    "Jede Station haben Sie im Blueprint selbst beschrieben — wer sie macht, womit, und ob sie von Hand läuft. Nichts davon ist geschätzt."
  );

  const punkte: Briefing["punkte"] = [
    { wert: `${stationen.length}`, label: "Stationen", ton: "neutral" },
    {
      wert: `${raum.handStationen}`,
      label: raum.handStationen === 1 ? "davon von Hand" : "davon von Hand",
      ton: raum.handStationen > 0 ? "warnung" : "gut",
    },
    {
      wert: `${raum.systemwechsel}`,
      label: raum.systemwechsel === 1 ? "Systemwechsel" : "Systemwechsel",
      ton: raum.systemwechsel > 0 ? "warnung" : "gut",
    },
  ];
  if (ohneProgramm > 0) {
    punkte.push({
      wert: `${ohneProgramm}`,
      label: ohneProgramm === 1 ? "Station ohne Programm" : "Stationen ohne Programm",
      ton: "warnung",
    });
  } else if (programme.size > 0) {
    punkte.push({ wert: `${programme.size}`, label: "Programme im Spiel", ton: "neutral" });
  }

  let letztesProgramm: string | null = null;
  const tour: TourSchritt[] = stationen.map((station, i) => {
    const { text, aenderung } = danachFuer(station);
    const befunde = befundeFuer(station, letztesProgramm);
    if (istProgramm(station.werkzeug)) letztesProgramm = station.werkzeug;
    return {
      nummer: i + 1,
      stationIndex: i,
      titel: station.label,
      was: katalogHinweis(station.stationKey),
      wer: station.rolle,
      womit: station.werkzeug,
      art: artVon(station),
      befunde,
      danach: text,
      aenderung,
    };
  });

  /*
    Das Fazit darf nur so viel versprechen, wie gebucht ist.

    Die Maßnahmen sind die Posten, die der Berater für dieses Gespräch
    ausgewählt und freigegeben hat. Steht dahinter nichts, sagt der Raum
    das — lieber eine ehrliche Lücke als eine Zusage, die später niemand
    einlösen kann.
  */
  const getragen = massnahmen.filter(
    (m) => m.zustand === "gewaehlt" && (m.art === "automatisierung" || m.art === "grundlage")
  );

  return {
    briefing: { titel: raum.titel, einleitung, punkte },
    tour,
    fazit: {
      satz:
        raum.uebernommen + raum.entfallen === 0
          ? "An diesem Ablauf ändert sich durch die Automatisierung nichts — hier wird entschieden, nicht transportiert."
          : `${raum.uebernommen} ${raum.uebernommen === 1 ? "Schritt läuft" : "Schritte laufen"} künftig ohne Sie, ${
              raum.entfallen
            } ${raum.entfallen === 1 ? "entfällt" : "entfallen"} ganz.`,
      massnahmen: getragen.map((m) => ({ titel: m.titel, womit: m.womit })),
      ohneDeckung: getragen.length === 0,
    },
  };
}

