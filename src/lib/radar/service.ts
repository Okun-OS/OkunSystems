import { db } from "@/lib/db";
import {
  KATALOG_VERSION,
  PROFIL_FELDER,
  SPOTLIGHT_PROZESSE,
  type RadarPhase,
} from "./catalog";
import {
  bewerteRadar,
  type RadarAntwort,
  type RadarErgebnis,
} from "./engine";

/**
 * Die Datenschicht des Radar.
 *
 * Alles, was schreibt, geht hier durch — aus dem Steuerpult des Closers
 * ebenso wie aus der tokengesicherten Kundenseite. Beide Wege haben ihre
 * eigene Autorisierung davor; was danach passiert, ist dasselbe, und das ist
 * Absicht: Zwei Schreibpfade mit je eigener Logik laufen irgendwann
 * auseinander.
 *
 * Jede Änderung zählt `rev` hoch. Beide Seiten fragen den Stand zyklisch ab
 * und erkennen an dieser einen Zahl, ob sich etwas getan hat — ohne das ganze
 * Dokument zu vergleichen.
 */

export const RADAR_STATUS = [
  "vorbereitet",
  "laeuft",
  "ausgewertet",
  "abgeschlossen",
  "abgebrochen",
] as const;
export type RadarStatus = (typeof RADAR_STATUS)[number];

export type RadarProfil = Record<string, string | string[]>;

export type RadarDatensatz = {
  id: string;
  status: RadarStatus;
  phase: RadarPhase | "ergebnis";
  katalogVersion: string;
  cursorKey: string | null;
  spotlightKey: string | null;
  profil: RadarProfil;
  internalNotes: string | null;
  ergebnis: RadarErgebnis | null;
  ergebnisAm: Date | null;
  closerStufe: string | null;
  closerNotiz: string | null;
  closerStufeAm: Date | null;
  rev: number;
  abgeschlossenAm: Date | null;
  freigegebenAm: Date | null;
  closingSessionId: string;
  companyId: string;
  closerId: string;
  companyName: string;
  closerName: string | null;
  antworten: RadarAntwort[];
  /** Wer welche Antwort gesetzt hat. Nur für die interne Sicht. */
  quellen: Record<string, "closer" | "client">;
  erstelltAm: Date;
};

function parseJson<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

/** Liest eine Analyse samt Antworten in die Form, mit der die Engine rechnet. */
export async function ladeRadar(radarSessionId: string): Promise<RadarDatensatz | null> {
  const row = await db.radarSession.findUnique({
    where: { id: radarSessionId },
    include: {
      antworten: { orderBy: { frageKey: "asc" } },
      company: { select: { name: true } },
      closer: { select: { name: true } },
    },
  });
  if (!row) return null;

  const antworten: RadarAntwort[] = row.antworten.map((a) => ({
    frageKey: a.frageKey,
    optionKeys: parseJson<string[]>(a.optionKeys, []),
    uebersprungen: a.uebersprungen,
  }));

  const quellen: Record<string, "closer" | "client"> = {};
  for (const a of row.antworten) {
    quellen[a.frageKey] = a.quelle === "client" ? "client" : "closer";
  }

  return {
    id: row.id,
    status: (row.status as RadarStatus) ?? "vorbereitet",
    phase: (row.phase as RadarPhase | "ergebnis") ?? "profil",
    katalogVersion: row.katalogVersion,
    cursorKey: row.cursorKey,
    spotlightKey: row.spotlightKey,
    profil: parseJson<RadarProfil>(row.profil, {}),
    internalNotes: row.internalNotes,
    ergebnis: parseJson<RadarErgebnis | null>(row.ergebnis, null),
    ergebnisAm: row.ergebnisAm,
    closerStufe: row.closerStufe,
    closerNotiz: row.closerNotiz,
    closerStufeAm: row.closerStufeAm,
    rev: row.rev,
    abgeschlossenAm: row.abgeschlossenAm,
    freigegebenAm: row.freigegebenAm,
    closingSessionId: row.closingSessionId,
    companyId: row.companyId,
    closerId: row.closerId,
    companyName: row.company.name,
    closerName: row.closer.name,
    antworten,
    quellen,
    erstelltAm: row.createdAt,
  };
}

/** Die laufende Analyse eines Gesprächs, sofern der Closer eine aufgeschaltet hat. */
export async function ladeLaufendesRadar(closingSessionId: string): Promise<RadarDatensatz | null> {
  const session = await db.closingSession.findUnique({
    where: { id: closingSessionId },
    select: { liveRadarSessionId: true },
  });
  if (!session?.liveRadarSessionId) return null;
  return ladeRadar(session.liveRadarSessionId);
}

/**
 * Vorbelegung des Profils aus dem CRM.
 *
 * Ausschließlich Felder, die dort tatsächlich geführt werden. Eine
 * Mitarbeiterzahl steht im CRM nicht — sie zu schätzen und dann als gegebene
 * Angabe zu behandeln, wäre genau die erfundene Zahl, die das Radar nicht
 * produzieren soll.
 */
export async function profilAusCrm(companyId: string): Promise<RadarProfil> {
  const company = await db.company.findUnique({
    where: { id: companyId },
    select: { name: true, industry: true, contactPerson: true },
  });
  if (!company) return {};

  const quellen: Record<string, string | null> = {
    "company.name": company.name,
    "company.industry": company.industry,
    "company.contactPerson": company.contactPerson,
  };

  const profil: RadarProfil = {};
  for (const feld of PROFIL_FELDER) {
    if (!feld.quelle) continue;
    const wert = quellen[feld.quelle];
    if (wert && wert.trim()) profil[feld.key] = wert.trim();
  }
  return profil;
}

/**
 * Startet eine Analyse oder nimmt eine unterbrochene wieder auf.
 *
 * Es gibt pro Gespräch höchstens eine offene Analyse. Wer nach einem
 * Verbindungsabbruch erneut startet, landet in derselben — sonst hätte man am
 * Ende zwei halbe Analysen desselben Betriebs.
 */
export async function starteRadar(input: {
  closingSessionId: string;
  companyId: string;
  closerId: string;
}): Promise<RadarDatensatz> {
  const offen = await db.radarSession.findFirst({
    where: {
      closingSessionId: input.closingSessionId,
      status: { in: ["vorbereitet", "laeuft", "ausgewertet"] },
    },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });

  const id =
    offen?.id ??
    (
      await db.radarSession.create({
        data: {
          closingSessionId: input.closingSessionId,
          companyId: input.companyId,
          closerId: input.closerId,
          katalogVersion: KATALOG_VERSION,
          status: "laeuft",
          phase: "profil",
          profil: JSON.stringify(await profilAusCrm(input.companyId)),
        },
        select: { id: true },
      })
    ).id;

  await db.$transaction([
    db.radarSession.update({
      where: { id },
      data: { status: "laeuft", rev: { increment: 1 } },
    }),
    // Erst damit sieht die Kundenseite das Radar. Gleiche Mechanik wie bei der
    // Präsentation: Der Berater schaltet auf, der Kunde sieht mit.
    db.closingSession.update({
      where: { id: input.closingSessionId },
      data: { liveRadarSessionId: id },
    }),
  ]);

  const datensatz = await ladeRadar(id);
  if (!datensatz) throw new Error("Die Analyse konnte nicht geladen werden.");
  return datensatz;
}

/** Nimmt das Radar von der Bühne, ohne es zu beenden. */
export async function blendeRadarAus(closingSessionId: string): Promise<void> {
  await db.closingSession.update({
    where: { id: closingSessionId },
    data: { liveRadarSessionId: null },
  });
}

/**
 * Speichert eine Antwort.
 *
 * Gleichzeitige Eingaben: Die Antwort steht pro Frage genau einmal; wer
 * zuletzt schreibt, gewinnt, und `rev` sagt der anderen Seite, dass sie
 * nachladen muss. Das ist für eine Frage mit vier Knöpfen die richtige
 * Auflösung — ein Sperrmechanismus würde im Gespräch mehr kaputtmachen, als
 * er rettet.
 */
export async function setzeAntwort(input: {
  radarSessionId: string;
  frageKey: string;
  optionKeys: string[];
  uebersprungen?: boolean;
  quelle: "closer" | "client";
}): Promise<number> {
  const optionKeys = JSON.stringify(input.optionKeys);
  const [, session] = await db.$transaction([
    db.radarAnswer.upsert({
      where: {
        radarSessionId_frageKey: {
          radarSessionId: input.radarSessionId,
          frageKey: input.frageKey,
        },
      },
      create: {
        radarSessionId: input.radarSessionId,
        frageKey: input.frageKey,
        optionKeys,
        uebersprungen: Boolean(input.uebersprungen),
        quelle: input.quelle,
      },
      update: {
        optionKeys,
        uebersprungen: Boolean(input.uebersprungen),
        quelle: input.quelle,
        answeredAt: new Date(),
      },
    }),
    db.radarSession.update({
      where: { id: input.radarSessionId },
      data: { rev: { increment: 1 } },
      select: { rev: true },
    }),
  ]);
  return session.rev;
}

/** Setzt, welche Frage beide Seiten gerade sehen. */
export async function setzeCursor(radarSessionId: string, cursorKey: string | null): Promise<number> {
  const row = await db.radarSession.update({
    where: { id: radarSessionId },
    data: { cursorKey, rev: { increment: 1 } },
    select: { rev: true },
  });
  return row.rev;
}

export async function setzePhase(
  radarSessionId: string,
  phase: RadarPhase | "ergebnis",
  cursorKey: string | null
): Promise<number> {
  const row = await db.radarSession.update({
    where: { id: radarSessionId },
    data: { phase, cursorKey, rev: { increment: 1 } },
    select: { rev: true },
  });
  return row.rev;
}

export async function setzeSpotlight(
  radarSessionId: string,
  spotlightKey: string | null
): Promise<number> {
  // Nur Prozesse aus dem Katalog. Ein freier Wert würde später in der
  // Auswertung ins Leere zeigen.
  const gueltig = spotlightKey
    ? (SPOTLIGHT_PROZESSE.find((p) => p.key === spotlightKey)?.key ?? null)
    : null;
  const row = await db.radarSession.update({
    where: { id: radarSessionId },
    data: { spotlightKey: gueltig, rev: { increment: 1 } },
    select: { rev: true },
  });
  return row.rev;
}

/** Speichert das Unternehmensprofil. Nur bekannte Felder werden übernommen. */
export async function setzeProfil(radarSessionId: string, profil: RadarProfil): Promise<number> {
  const erlaubt = new Set(PROFIL_FELDER.map((f) => f.key));
  const sauber: RadarProfil = {};
  for (const [key, wert] of Object.entries(profil)) {
    if (!erlaubt.has(key)) continue;
    if (Array.isArray(wert)) {
      sauber[key] = wert.filter((w) => typeof w === "string").map((w) => w.slice(0, 200));
    } else if (typeof wert === "string") {
      sauber[key] = wert.slice(0, 2000);
    }
  }
  const row = await db.radarSession.update({
    where: { id: radarSessionId },
    data: { profil: JSON.stringify(sauber), rev: { increment: 1 } },
    select: { rev: true },
  });
  return row.rev;
}

/** Interne Gesprächsnotiz. Erreicht die Kundenseite unter keinen Umständen. */
export async function setzeNotiz(radarSessionId: string, notiz: string): Promise<void> {
  await db.radarSession.update({
    where: { id: radarSessionId },
    data: { internalNotes: notiz.slice(0, 20_000) },
  });
}

/**
 * Rechnet das Ergebnis und friert es ein.
 *
 * Eingefroren, nicht bei jedem Aufruf neu gerechnet: Was dem Kunden im
 * Gespräch gezeigt wurde, muss drei Monate später noch dasselbe sein — auch
 * wenn der Katalog sich inzwischen geändert hat. Eine abgeschlossene Analyse
 * lässt sich gar nicht mehr neu rechnen.
 */
export async function werteAus(radarSessionId: string): Promise<RadarErgebnis | null> {
  const datensatz = await ladeRadar(radarSessionId);
  if (!datensatz) return null;
  if (datensatz.abgeschlossenAm) return datensatz.ergebnis;

  const profilBereiche = datensatz.profil.bereiche;
  const ergebnis = bewerteRadar({
    antworten: datensatz.antworten,
    spotlightKey: datensatz.spotlightKey,
    bereiche: Array.isArray(profilBereiche) ? profilBereiche : [],
  });

  await db.radarSession.update({
    where: { id: radarSessionId },
    data: {
      ergebnis: JSON.stringify(ergebnis),
      ergebnisAm: new Date(),
      status: "ausgewertet",
      phase: "ergebnis",
      rev: { increment: 1 },
    },
  });
  return ergebnis;
}

/** Gibt das Ergebnis für die Kundenseite frei. Vorher sieht sie es nicht. */
export async function gibErgebnisFrei(radarSessionId: string): Promise<void> {
  await db.radarSession.update({
    where: { id: radarSessionId },
    data: { freigegebenAm: new Date(), rev: { increment: 1 } },
  });
}

/**
 * Die abweichende Einschätzung des Closers.
 *
 * Sie tritt neben das Systemurteil, statt es zu ersetzen. Wer das Ergebnis
 * still überschreiben könnte, hätte am Ende kein Bewertungssystem mehr,
 * sondern ein Eingabefeld.
 */
export async function setzeCloserEinschaetzung(input: {
  radarSessionId: string;
  stufe: "A" | "B" | "C";
  notiz: string;
}): Promise<void> {
  const notiz = input.notiz.trim();
  if (!notiz) throw new Error("Eine abweichende Einschätzung braucht eine Begründung.");
  await db.radarSession.update({
    where: { id: input.radarSessionId },
    data: {
      closerStufe: input.stufe,
      closerNotiz: notiz.slice(0, 5000),
      closerStufeAm: new Date(),
      rev: { increment: 1 },
    },
  });
}

/**
 * Schließt die Analyse ab.
 *
 * Idempotent: Ein zweiter Abschluss ändert nichts und meldet keinen Fehler.
 * Zwei Klicks auf denselben Knopf — bei wackeliger Leitung der Normalfall —
 * dürfen nicht zwei Ergebnisse erzeugen.
 */
export async function schliesseAb(radarSessionId: string): Promise<{
  ergebnis: RadarErgebnis | null;
  warBereitsAbgeschlossen: boolean;
}> {
  const vorher = await db.radarSession.findUnique({
    where: { id: radarSessionId },
    select: { abgeschlossenAm: true, ergebnis: true },
  });
  if (!vorher) throw new Error("Analyse nicht gefunden.");
  if (vorher.abgeschlossenAm) {
    return {
      ergebnis: parseJson<RadarErgebnis | null>(vorher.ergebnis, null),
      warBereitsAbgeschlossen: true,
    };
  }

  const ergebnis = await werteAus(radarSessionId);
  await db.radarSession.update({
    where: { id: radarSessionId },
    data: {
      status: "abgeschlossen",
      abgeschlossenAm: new Date(),
      freigegebenAm: new Date(),
      rev: { increment: 1 },
    },
  });
  return { ergebnis, warBereitsAbgeschlossen: false };
}

/** Protokolleintrag im bestehenden Closing-Protokoll. */
export async function protokolliere(input: {
  closingSessionId: string;
  companyId: string;
  actorId: string;
  eventType: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    await db.closingEvent.create({
      data: {
        closingSessionId: input.closingSessionId,
        companyId: input.companyId,
        actorId: input.actorId,
        eventType: input.eventType,
        metadata: JSON.stringify(input.metadata ?? {}),
      },
    });
  } catch {
    // Ein fehlender Protokolleintrag darf das Gespräch nicht anhalten.
  }
}

/** Alle Analysen eines Kunden — für die spätere Einsicht durch Berechtigte. */
export async function radarVerlauf(companyId: string) {
  return db.radarSession.findMany({
    where: { companyId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      status: true,
      createdAt: true,
      abgeschlossenAm: true,
      ergebnis: true,
      katalogVersion: true,
      closer: { select: { name: true } },
      closingSessionId: true,
    },
  });
}
