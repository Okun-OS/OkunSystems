import { db } from "@/lib/db";
import { legeSchabloneAn, type Programm, type Vorschlag } from "./schablone";

/**
 * Die Schablone an einem echten Betrieb.
 *
 * Holt zusammen, was der Blueprint erhoben hat, und lässt die Regeln darüber
 * laufen. Nichts wird hier entschieden — das Ergebnis ist ein Vorschlag, der
 * auf einen Menschen wartet.
 */

function leseListe(roh: string): string[] {
  try {
    const gelesen: unknown = JSON.parse(roh);
    return Array.isArray(gelesen) ? gelesen.filter((x): x is string => typeof x === "string") : [];
  } catch {
    // Eine kaputte Liste ist kein Grund, die Vorbereitung abzubrechen.
    return [];
  }
}

/**
 * Bei welchen Zwecken im Betrieb tatsächlich Zeit anfällt.
 *
 * Aufgaben und Zwecke sind im Katalog nicht direkt verknüpft — aber über die
 * Programme: Eine Aufgabe nennt die Systeme, über die sie läuft, und ein
 * System nennt die Zwecke, die es trägt. Das ist die Brücke.
 *
 * Aufgaben ohne zugeordnetes System fallen dabei heraus. Das ist der Preis
 * dafür, keine zweite Zuordnungstabelle pflegen zu müssen — und es führt
 * höchstens dazu, dass eine Lücke nicht gemeldet wird. Lieber eine
 * übersehene als eine erfundene.
 */
async function zweckeMitAufwand(sessionId: string): Promise<string[]> {
  const [aufgaben, systeme] = await Promise.all([
    db.blueprintTask.findMany({
      where: { sessionId, minutesPerMonth: { gt: 0 } },
      select: { systemIds: true },
    }),
    db.blueprintSystem.findMany({ where: { sessionId }, select: { id: true, purposes: true } }),
  ]);

  const zweckeJeSystem = new Map(systeme.map((s) => [s.id, leseListe(s.purposes)]));
  const zwecke = new Set<string>();
  for (const aufgabe of aufgaben) {
    for (const systemId of leseListe(aufgabe.systemIds)) {
      for (const zweck of zweckeJeSystem.get(systemId) ?? []) zwecke.add(zweck);
    }
  }
  return [...zwecke];
}

export type SchablonenErgebnis = {
  vorschlaege: Vorschlag[];
  /** Wie viele Programme ohne Kostenangabe dastehen — die Lücke im Argument. */
  ohneKosten: number;
};

export async function schabloneFuerSitzung(sitzungId: string): Promise<SchablonenErgebnis | null> {
  const sitzung = await db.strategieSitzung.findUnique({
    where: { id: sitzungId },
    select: { sessionId: true, company: { select: { contractPackage: true } } },
  });
  if (!sitzung) return null;

  const systeme = await db.blueprintSystem.findMany({
    where: { sessionId: sitzung.sessionId },
    select: {
      name: true,
      purposes: true,
      kostenProMonat: true,
      bindung: true,
      zufriedenheit: true,
    },
  });

  const programme: Programm[] = systeme.map((s) => ({
    name: s.name,
    zwecke: leseListe(s.purposes),
    kostenProMonat: s.kostenProMonat,
    bindung: s.bindung,
    zufriedenheit: s.zufriedenheit,
  }));

  const vorschlaege = legeSchabloneAn({
    programme,
    paket: sitzung.company.contractPackage,
    zweckeMitAufwand: await zweckeMitAufwand(sitzung.sessionId),
  });

  return {
    vorschlaege,
    ohneKosten: programme.filter((p) => p.kostenProMonat === null).length,
  };
}

/**
 * Die Vorschläge festschreiben.
 *
 * Ersetzt, was noch offen ist, und lässt in Ruhe, was ein Mensch schon
 * bestätigt oder verworfen hat. Ein zweiter Durchlauf nach einer Korrektur
 * im Blueprint soll die Arbeit nicht wegwerfen, die in der Vorbereitung
 * schon steckt.
 */
export async function schreibeSchablone(
  sitzungId: string,
  vorschlaege: readonly Vorschlag[]
): Promise<{ neu: number; behalten: number }> {
  const bestehend = await db.grundlagenVorschlag.findMany({
    where: { sitzungId },
    select: { id: true, zustand: true },
  });
  const entschieden = bestehend.filter((v) => v.zustand !== "offen");

  await db.grundlagenVorschlag.deleteMany({ where: { sitzungId, zustand: "offen" } });

  let position = entschieden.length;
  for (const v of vorschlaege) {
    await db.grundlagenVorschlag.create({
      data: {
        sitzungId,
        bewegung: v.bewegung,
        titel: v.titel,
        begruendung: v.begruendung,
        programme: JSON.stringify(v.programme),
        zweckKeys: JSON.stringify(v.zweckKeys),
        sparenProMonat: v.sparenProMonat,
        erstZumVertragsende: v.erstZumVertragsende,
        position: position++,
      },
    });
  }

  return { neu: vorschlaege.length, behalten: entschieden.length };
}
