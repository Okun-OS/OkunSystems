import { db } from "@/lib/db";
import { assembleBlueprintReport } from "@/lib/blueprint/report-assembler";
import type { ReportTexts } from "@/lib/blueprint/report-text-engine";
import { buildDossier } from "./dossier";
import { askModel, parseJson, type Verbrauch } from "./model";
import { leseGuide } from "./normalisieren";
import type { Anleitung, Umsetzungsposten } from "./types";
import { umfangAlsText } from "@/lib/packages/umfang";
import { anleitungsSchluessel } from "./schluessel";

export { anleitungsSchluessel };

const SYSTEM_ANLEITUNG = `Du schreibst Umsetzungsanleitungen für die Abteilung von OKUN
Systems, die die Digitalisierung beim Kunden tatsächlich einrichtet.

Das hier ist kein Text fürs Kundengespräch. Es liest jemand, der am Montag
anfängt und wissen muss, was er in welcher Reihenfolge tut.

Vier Regeln ohne Ausnahme:

1. Jede Zahl, die du nennst, steht wörtlich im Datenbestand. Du rechnest nicht
   um, rundest nicht und schätzt nicht.
2. Du erfindest keine Eigenschaft eines Produkts. Was du über ein Programm
   nicht sicher weißt, schreibst du als das, was zu prüfen ist — nicht als
   Tatsache.
3. Du schreibst in schlichtem Deutsch, in Arbeitsschritten, nicht in
   Absichtserklärungen. "Ordnerstruktur nach Kunde, Objekt und Anlage anlegen"
   ist ein Schritt. "Die Ablage konzipieren" ist keiner.
4. Du antwortest ausschließlich mit JSON, ohne einleitenden Satz und ohne
   Code-Zaun.`;

/**
 * Schreibt die Anleitung zu einem Posten.
 *
 * Bekommt denselben Fall wie der Leitfaden, dazu den Posten im Wortlaut. Mehr
 * braucht es nicht: Was gebaut wird und womit, steht schon fest — hier geht
 * es allein um das Wie.
 */
export async function erzeugeAnleitung(params: {
  sessionId: string;
  posten: Umsetzungsposten;
  sammler?: Verbrauch[];
}): Promise<Anleitung> {
  const [data, sitzung] = await Promise.all([
    assembleBlueprintReport(params.sessionId),
    db.analysisSession.findUnique({
      where: { id: params.sessionId },
      select: { reportTexts: true },
    }),
  ]);

  let reportTexts: ReportTexts | null = null;
  if (sitzung?.reportTexts) {
    try {
      reportTexts = JSON.parse(sitzung.reportTexts) as ReportTexts;
    } catch {
      reportTexts = null;
    }
  }

  const dossier = buildDossier(data, reportTexts);
  const p = params.posten;

  const prompt = `Schreibe die Anleitung für genau einen Posten der Umsetzung.

=== DER POSTEN ===

Block im Leistungsumfang: ${p.block}
Titel: ${p.titel}
Der Befund, der ihn nötig macht: ${p.befund}
Womit: ${p.womit}
Warum gerade das: ${p.warum}
Wie wir vorgehen (grob, aus dem Gesprächsleitfaden): ${p.wieWirEsMachen}
Einordnung: ${p.einordnung}

=== ENDE DES POSTENS ===

${umfangAlsText(data.packageType)}

=== DER FALL ===

${dossier}

=== ENDE DES FALLS ===

Schreib die Anleitung so, dass jemand sie abarbeiten kann, der diesen Betrieb
nicht kennt. Nimm die Zahlen und Namen aus dem Fall — wie viele Mitarbeitende,
welche Programme, welche Daten von wo übernommen werden. Wo etwas erst beim
Kunden zu klären ist, mach daraus einen Schritt oder eine Voraussetzung, nicht
eine Annahme.

Antworte mit JSON in genau dieser Form:

{"ziel":"Was am Ende läuft, zwei bis drei Sätze, aus Sicht des Betriebs",
"voraussetzungen":["was vorher geklärt, beschafft oder freigegeben sein muss — je ein Satz"],
"schritte":[{"titel":"kurz, was in diesem Schritt passiert","was":"was konkret zu tun ist, zwei bis vier Sätze, mit den Namen und Zahlen aus dem Fall","wer":"wir, der Kunde, oder beide gemeinsam — und wenn möglich wer genau","ergebnis":"woran man erkennt, dass dieser Schritt fertig ist"}],
"fallstricke":["was erfahrungsgemäß schiefgeht und woran man es früh merkt — je ein bis zwei Sätze"],
"fertigWenn":"Woran wir erkennen, dass der Posten erledigt ist. Nachprüfbar, nicht gefühlt."}

Gib sechs bis zwölf Schritte, zwei bis fünf Voraussetzungen und zwei bis vier
Fallstricke.`;

  const raw = await askModel(
    {
      label: `Anleitung: ${p.titel}`,
      system: SYSTEM_ANLEITUNG,
      prompt,
      maxTokens: 32000,
    },
    params.sammler
  );

  const roh = parseJson<Partial<Anleitung>>(raw, "Anleitung");
  const text = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : "");
  const liste = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);

  return {
    ziel: text(roh.ziel) || "— konnte nicht erzeugt werden —",
    voraussetzungen: liste<string>(roh.voraussetzungen),
    schritte: liste<Anleitung["schritte"][number]>(roh.schritte),
    fallstricke: liste<string>(roh.fallstricke),
    fertigWenn: text(roh.fertigWenn) || "— konnte nicht erzeugt werden —",
  };
}

/** Sucht den Posten in der neuesten Fassung des Leitfadens. */
export async function findePosten(
  sessionId: string,
  schluessel: string
): Promise<Umsetzungsposten | null> {
  const guide = await db.strategyGuide.findUnique({
    where: { sessionId },
    include: { versions: { orderBy: { version: "desc" }, take: 1 } },
  });
  const fassung = guide?.versions[0];
  if (!fassung) return null;
  const doc = leseGuide(fassung.content);
  if (!doc) return null;
  return (
    doc.umsetzung.find(
      (p) => anleitungsSchluessel(p.block, p.titel) === schluessel
    ) ?? null
  );
}

/** Erzeugt die Anleitung und legt sie ab — vorhandene wird ersetzt. */
export async function speichereAnleitung(params: {
  sessionId: string;
  posten: Umsetzungsposten;
  userId: string;
}): Promise<Anleitung> {
  const sammler: Verbrauch[] = [];
  const anleitung = await erzeugeAnleitung({
    sessionId: params.sessionId,
    posten: params.posten,
    sammler,
  });

  const schluessel = anleitungsSchluessel(params.posten.block, params.posten.titel);
  await db.umsetzungsAnleitung.upsert({
    where: { sessionId_schluessel: { sessionId: params.sessionId, schluessel } },
    create: {
      sessionId: params.sessionId,
      schluessel,
      block: params.posten.block,
      titel: params.posten.titel,
      content: JSON.stringify(anleitung),
      createdById: params.userId,
    },
    update: {
      block: params.posten.block,
      titel: params.posten.titel,
      content: JSON.stringify(anleitung),
    },
  });

  for (const v of sammler) {
    console.log(`[anleitung] ${v.label}: ${v.sekunden}s, ${v.eingabe} ein / ${v.ausgabe} aus`);
  }

  return anleitung;
}
