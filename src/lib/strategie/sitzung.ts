import { db } from "@/lib/db";
import { leseGuide } from "@/lib/strategy-guide/normalisieren";
import { aufwandHeute, type ErhobeneAufgabe } from "./engine";
import { entwurfAusLeitfaden, entwurfsHinweise, type PostenEntwurf } from "./vorbereitung";
import { kundeDarfSehen, type PostenArt } from "./katalog";

/**
 * Die Strategiesitzung in der Datenbank.
 *
 * Hier wird geladen, angelegt und fortgeschrieben — gerechnet und entschieden
 * wird nebenan in `engine.ts` und `vorbereitung.ts`, damit beides prüfbar
 * bleibt, ohne eine Datenbank zu brauchen.
 */

// ─── Laden ───────────────────────────────────────────────────────────────────

export type GeladenerPosten = {
  id: string;
  schluessel: string;
  art: PostenArt;
  block: string;
  titel: string;
  befund: string | null;
  womit: string | null;
  warum: string | null;
  wieWirEsMachen: string | null;
  einordnung: string | null;
  zustand: "kandidat" | "gewaehlt" | "spaeter" | "verworfen";
  kundeSieht: boolean;
  aufgabenKeys: string[];
  aufwandHeuteMinuten: number;
  internerAufwand: string | null;
  position: number;
};

export type GeladeneSitzung = {
  id: string;
  status: string;
  ansicht: string;
  paket: string | null;
  freigegebenAm: Date | null;
  freigegebenVon: string | null;
  beraterPresenceAt: Date | null;
  rev: number;
  abgeschlossenAm: Date | null;
  interneNotiz: string | null;
  companyId: string;
  companyName: string;
  sessionId: string;
  appointmentId: string;
  terminStart: Date | null;
  meetingUrl: string | null;
  beraterId: string;
  beraterName: string | null;
  posten: GeladenerPosten[];
  /** Die Aufgaben, die im Blueprint erhoben wurden — die Grundlage jeder Zahl. */
  aufgaben: ErhobeneAufgabe[];
};

function lesePosten(roh: {
  id: string;
  schluessel: string;
  art: string;
  block: string;
  titel: string;
  befund: string | null;
  womit: string | null;
  warum: string | null;
  wieWirEsMachen: string | null;
  einordnung: string | null;
  zustand: string;
  kundeSieht: boolean;
  aufgabenKeys: string;
  aufwandHeuteMinuten: number;
  internerAufwand: string | null;
  position: number;
}): GeladenerPosten {
  let keys: string[] = [];
  try {
    const gelesen: unknown = JSON.parse(roh.aufgabenKeys);
    if (Array.isArray(gelesen)) keys = gelesen.filter((k): k is string => typeof k === "string");
  } catch {
    // Eine kaputte Zuordnung ist kein Grund, das Gespräch zu verlieren —
    // sie ist leer, und die Zahl steht sichtbar auf null.
  }
  return {
    ...roh,
    art: roh.art as PostenArt,
    zustand: roh.zustand as GeladenerPosten["zustand"],
    aufgabenKeys: keys,
  };
}

export async function ladeSitzung(sitzungId: string): Promise<GeladeneSitzung | null> {
  const s = await db.strategieSitzung.findUnique({
    where: { id: sitzungId },
    include: {
      company: { select: { name: true } },
      berater: { select: { name: true } },
      freigegebenBy: { select: { name: true } },
      appointment: { select: { startTime: true, meetingUrl: true } },
      posten: { orderBy: { position: "asc" } },
    },
  });
  if (!s) return null;

  const aufgaben = await ladeAufgaben(s.sessionId);

  return {
    id: s.id,
    status: s.status,
    ansicht: s.ansicht,
    paket: s.paket,
    freigegebenAm: s.freigegebenAm,
    freigegebenVon: s.freigegebenBy?.name ?? null,
    beraterPresenceAt: s.beraterPresenceAt,
    rev: s.rev,
    abgeschlossenAm: s.abgeschlossenAm,
    interneNotiz: s.interneNotiz,
    companyId: s.companyId,
    companyName: s.company.name,
    sessionId: s.sessionId,
    appointmentId: s.appointmentId,
    terminStart: s.appointment?.startTime ?? null,
    meetingUrl: s.appointment?.meetingUrl ?? null,
    beraterId: s.beraterId,
    beraterName: s.berater?.name ?? null,
    posten: s.posten.map(lesePosten),
    aufgaben,
  };
}

/** Die erhobenen Aufgaben des Betriebs — die einzige Quelle für Minuten. */
export async function ladeAufgaben(sessionId: string): Promise<ErhobeneAufgabe[]> {
  const tasks = await db.blueprintTask.findMany({
    where: { sessionId },
    orderBy: { minutesPerMonth: "desc" },
    select: { catalogKey: true, label: true, minutesPerMonth: true },
  });
  return tasks;
}

// ─── Anlegen ─────────────────────────────────────────────────────────────────

export type AnlageErgebnis =
  | { ok: true; sitzungId: string; uebernommen: number; hinweise: string[] }
  | { error: string };

/**
 * Eine Sitzung aus einem Termin und einer Leitfaden-Fassung aufsetzen.
 *
 * Die Fassung wird **abgeschrieben**: Ab hier ist die Sitzung von ihr
 * unabhängig. Wer den Leitfaden danach nachschärft, ändert nichts mehr an
 * dem, was im Gespräch auf dem Tisch liegt — und das ist die Absicht.
 */
export async function setzeSitzungAuf(params: {
  appointmentId: string;
  beraterId: string;
  /** Welche Fassung übernommen wird; ohne Angabe die neueste. */
  guideVersionId?: string;
}): Promise<AnlageErgebnis> {
  const termin = await db.appointment.findUnique({
    where: { id: params.appointmentId },
    select: {
      id: true,
      companyId: true,
      analysisSessionId: true,
      company: { select: { contractPackage: true } },
      strategieSitzung: { select: { id: true } },
    },
  });
  if (!termin) return { error: "Termin nicht gefunden." };
  if (termin.strategieSitzung) {
    return { error: "Für diesen Termin gibt es bereits eine Strategiesitzung." };
  }
  /*
    Ein Strategiegespräch braucht einen Betrieb.

    Seit es Termine ohne Kunden gibt — Erstkontakt, Verband, Partner — kann
    `companyId` fehlen. Ein Haus ohne Blueprint wäre leer, deshalb hier die
    klare Absage statt einer halben Sitzung.
  */
  const companyId = termin.companyId;
  if (!companyId) {
    return { error: "Ein Strategiegespräch braucht einen Betrieb aus der Kundenliste." };
  }

  // Der Blueprint am Termin, sonst der zuletzt abgeschlossene des Betriebs.
  const blueprint = termin.analysisSessionId
    ? await db.analysisSession.findUnique({
        where: { id: termin.analysisSessionId },
        select: { id: true },
      })
    : await db.analysisSession.findFirst({
        where: { companyId, blueprintVersion: "2.0", status: "COMPLETED" },
        orderBy: { completedAt: "desc" },
        select: { id: true },
      });
  if (!blueprint) {
    return { error: "Zu diesem Betrieb gibt es keinen abgeschlossenen Blueprint." };
  }

  const guide = await db.strategyGuide.findUnique({
    where: { sessionId: blueprint.id },
    include: {
      versions: {
        orderBy: { version: "desc" },
        take: params.guideVersionId ? undefined : 1,
      },
    },
  });
  const fassung = params.guideVersionId
    ? guide?.versions.find((v) => v.id === params.guideVersionId)
    : guide?.versions[0];
  if (!fassung) {
    return {
      error:
        "Für diesen Blueprint gibt es noch keinen Leitfaden. Ohne ihn hat das Gespräch keine Posten.",
    };
  }

  const dokument = leseGuide(fassung.content);
  if (!dokument) return { error: "Die Leitfaden-Fassung ließ sich nicht lesen." };

  const entwuerfe = entwurfAusLeitfaden(dokument);
  if (entwuerfe.length === 0) {
    return { error: "Die Leitfaden-Fassung enthält keine Posten." };
  }

  const aufgaben = await ladeAufgaben(blueprint.id);

  const sitzung = await db.strategieSitzung.create({
    data: {
      appointmentId: termin.id,
      companyId,
      sessionId: blueprint.id,
      beraterId: params.beraterId,
      paket: termin.company?.contractPackage ?? null,
      guideVersionId: fassung.id,
      status: "vorbereitet",
      posten: { create: entwuerfe.map((e) => zuDatensatz(e, aufgaben)) },
    },
    select: { id: true },
  });

  return {
    ok: true,
    sitzungId: sitzung.id,
    uebernommen: entwuerfe.length,
    hinweise: entwurfsHinweise(entwuerfe),
  };
}

function zuDatensatz(entwurf: PostenEntwurf, aufgaben: ErhobeneAufgabe[]) {
  // Beim Übernehmen ist noch nichts zugeordnet; die Zahl steht auf null, bis
  // ein Mensch sagt, welche Aufgaben dahinterstehen. Lieber keine Zahl als
  // eine erfundene.
  const aufwand = aufwandHeute([], aufgaben);
  return {
    schluessel: entwurf.schluessel,
    art: entwurf.art,
    block: entwurf.block,
    titel: entwurf.titel,
    befund: entwurf.befund,
    womit: entwurf.womit,
    warum: entwurf.warum,
    wieWirEsMachen: entwurf.wieWirEsMachen,
    einordnung: entwurf.einordnung,
    position: entwurf.position,
    aufgabenKeys: "[]",
    aufwandHeuteMinuten: aufwand.minuten,
  };
}

// ─── Fortschreiben ───────────────────────────────────────────────────────────

/** Jede Änderung zählt die Revision hoch — daran erkennt die Kundenseite sie. */
export async function beruehre(sitzungId: string) {
  await db.strategieSitzung.update({
    where: { id: sitzungId },
    data: { rev: { increment: 1 } },
  });
}

/**
 * Die Zuordnung zu Aufgaben ändern und die Zahl neu rechnen.
 *
 * Gerechnet wird beim Speichern und nicht beim Anzeigen: Im Gespräch und im
 * Protokoll muss dieselbe Zahl stehen, auch wenn jemand später eine Aufgabe
 * im Blueprint korrigiert.
 */
export async function setzeAufgaben(
  postenId: string,
  aufgabenKeys: string[]
): Promise<{ ok: true; minuten: number; unbekannt: string[] } | { error: string }> {
  const posten = await db.strategiePosten.findUnique({
    where: { id: postenId },
    select: { id: true, sitzung: { select: { id: true, sessionId: true } } },
  });
  if (!posten) return { error: "Posten nicht gefunden." };

  const aufgaben = await ladeAufgaben(posten.sitzung.sessionId);
  const ergebnis = aufwandHeute(aufgabenKeys, aufgaben);

  await db.strategiePosten.update({
    where: { id: postenId },
    data: {
      // Nur belegte Schlüssel werden gespeichert. Was der Betrieb nicht
      // erhoben hat, soll auch nicht in der Zuordnung stehen und später
      // aussehen, als hätte es dort eine Zahl gegeben.
      aufgabenKeys: JSON.stringify(ergebnis.belege.map((b) => b.catalogKey)),
      aufwandHeuteMinuten: ergebnis.minuten,
    },
  });
  await beruehre(posten.sitzung.id);

  return { ok: true, minuten: ergebnis.minuten, unbekannt: ergebnis.unbekannt };
}

/** Darf der Kunde diese Sitzung gerade sehen? */
export function sichtbarFuerKunde(sitzung: {
  status: string;
  freigegebenAm: Date | null;
}): boolean {
  return kundeDarfSehen(sitzung.status, sitzung.freigegebenAm);
}
