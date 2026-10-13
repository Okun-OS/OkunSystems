import { db } from "@/lib/db";
import { PURPOSES } from "@/lib/blueprint/pillar3-catalog";
import {
  baueAblaufRaum,
  baueRaeume,
  baueRegal,
  fahrzeugFuer,
  hallensatz,
  schildName,
  stockwerkeFuer,
  type AblaufRaum,
  type HausDaten,
  type Regalfach,
} from "./haus";
import { GRENZE_AUTOMATISIERUNGEN, type PostenArt } from "./katalog";
import { alsStunden } from "./engine";

/**
 * Das Haus für eine Strategiesitzung laden.
 *
 * Holt aus dem Blueprint, was der Rundgang braucht, und setzt daraus das
 * Modell zusammen. Nichts davon wird hier gerechnet oder entschieden — dafür
 * sind `haus.ts` und `engine.ts` da, die ohne Datenbank prüfbar sind.
 */

export type StudioPosten = {
  id: string;
  titel: string;
  art: PostenArt;
  befund: string | null;
  womit: string | null;
  warum: string | null;
  zustand: string;
  aufwandHeuteMinuten: number;
};

export type StudioDaten = {
  sitzungId: string;
  haus: HausDaten;
  ablaeufe: AblaufRaum[];
  regal: Regalfach[];
  posten: StudioPosten[];
  /** Gesamter heutiger Aufwand aller erhobenen Aufgaben, in Minuten. */
  aufwandGesamtMinuten: number;
  /** Die größten Zeitfresser, für die Halle. */
  zeitfresser: Array<{ label: string; minuten: number; stunden: string }>;
  paket: string | null;
  freigegeben: boolean;
};

/** Die Bandbreiten der Profilfragen als Zahl in der Mitte. */
const MITARBEITER_BAND: Record<string, number> = {
  "M1.2-OPT-1": 1, "M1.2-OPT-2": 3, "M1.2-OPT-3": 8, "M1.2-OPT-4": 18,
  "M1.2-OPT-5": 38, "M1.2-OPT-6": 75, "M1.2-OPT-7": 175, "M1.2-OPT-8": 300,
};
const STANDORT_BAND: Record<string, number> = {
  "M1.3-OPT-1": 1, "M1.3-OPT-2": 2, "M1.3-OPT-3": 6, "M1.3-OPT-4": 12,
};

export async function ladeStudio(sitzungId: string): Promise<StudioDaten | null> {
  const sitzung = await db.strategieSitzung.findUnique({
    where: { id: sitzungId },
    include: {
      company: { select: { name: true, industry: true, city: true } },
      posten: { orderBy: { position: "asc" } },
    },
  });
  if (!sitzung) return null;

  const sessionId = sitzung.sessionId;

  const [systeme, aufgaben, flows, antworten] = await Promise.all([
    db.blueprintSystem.findMany({
      where: { sessionId },
      select: { name: true, purposes: true },
    }),
    db.blueprintTask.findMany({
      where: { sessionId },
      orderBy: { minutesPerMonth: "desc" },
      select: { label: true, minutesPerMonth: true },
    }),
    db.blueprintFlow.findMany({
      where: { sessionId },
      orderBy: { position: "asc" },
      include: { stations: { orderBy: { position: "asc" } } },
    }),
    db.sessionAnswer.findMany({
      where: { sessionId, question: { externalId: { in: ["M1.1", "M1.2", "M1.3"] } } },
      select: { selectedOptionIds: true, question: { select: { externalId: true } } },
    }),
  ]);

  /*
    Die gewählten Optionen stehen als JSON-Liste von Options-IDs im Antwortsatz,
    nicht als externalId. Für die drei Profilfragen holen wir deshalb die
    externalIds der gewählten Optionen nach.
  */
  const gewaehlteIds = antworten.flatMap((a) => leseIds(a.selectedOptionIds));
  const optionen = gewaehlteIds.length
    ? await db.answerOption.findMany({
        where: { id: { in: gewaehlteIds } },
        select: { externalId: true },
      })
    : [];
  const externe = new Set(optionen.map((o) => o.externalId));
  const ersteMit = (praefix: string) =>
    [...externe].find((e) => e.startsWith(praefix)) ?? null;

  const brancheOption = ersteMit("M1.1-OPT");
  const mitarbeitende = MITARBEITER_BAND[ersteMit("M1.2-OPT") ?? ""] ?? null;
  const standorte = STANDORT_BAND[ersteMit("M1.3-OPT") ?? ""] ?? null;

  const systemRecords = systeme.map((s) => ({ name: s.name, purposes: leseIds(s.purposes) }));
  const regal = baueRegal(systemRecords);
  const ablaeufe = flows.map((f) =>
    baueAblaufRaum({
      catalogKey: f.catalogKey,
      title: f.title,
      stations: f.stations.map((s) => ({
        stationKey: s.stationKey,
        position: s.position,
        role: s.role,
        // Der Name des Programms, sonst die Bezeichnung für Papier oder nichts.
        systemLabel: s.systemLabel,
        mode: s.mode,
      })),
    })
  );

  const aufwandGesamt = aufgaben.reduce((s, a) => s + a.minutesPerMonth, 0);
  const vergeben = sitzung.posten.filter(
    (p) => p.zustand === "gewaehlt" && p.art === "automatisierung"
  ).length;

  const haus: HausDaten = {
    firma: sitzung.company.name,
    schild: schildName(sitzung.company.name),
    stockwerke: stockwerkeFuer(mitarbeitende),
    fahrzeug: fahrzeugFuer(brancheOption),
    hallensatz: hallensatz({
      mitarbeitende,
      standorte,
      ort: sitzung.company.city,
      branche: sitzung.company.industry,
    }),
    raeume: baueRaeume({
      paket: sitzung.paket,
      ablaeufe: ablaeufe.length,
      stundenProMonat: aufwandGesamt,
      luecken: regal.filter((r) => r.luecke).length,
      felder: PURPOSES.length,
      plaetze: GRENZE_AUTOMATISIERUNGEN,
      vergeben,
      workforceGewaehlt: sitzung.posten.some(
        (p) => p.art === "workforce" && p.zustand === "gewaehlt"
      ),
    }),
  };

  return {
    sitzungId: sitzung.id,
    haus,
    ablaeufe,
    regal,
    posten: sitzung.posten
      // Was der Berater ausgeblendet oder verworfen hat, betritt das Haus nicht.
      .filter((p) => p.kundeSieht && p.zustand !== "verworfen")
      .map((p) => ({
        id: p.id,
        titel: p.titel,
        art: p.art as PostenArt,
        befund: p.befund,
        womit: p.womit,
        warum: p.warum,
        zustand: p.zustand,
        aufwandHeuteMinuten: p.aufwandHeuteMinuten,
      })),
    aufwandGesamtMinuten: aufwandGesamt,
    zeitfresser: aufgaben.slice(0, 4).map((a) => ({
      label: a.label,
      minuten: a.minutesPerMonth,
      stunden: alsStunden(a.minutesPerMonth),
    })),
    paket: sitzung.paket,
    freigegeben: Boolean(sitzung.freigegebenAm),
  };
}

function leseIds(roh: string): string[] {
  try {
    const gelesen: unknown = JSON.parse(roh);
    return Array.isArray(gelesen) ? gelesen.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}
