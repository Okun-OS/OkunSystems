import { db } from "@/lib/db";
import { assembleBlueprintReport } from "@/lib/blueprint/report-assembler";
import type { ReportTexts } from "@/lib/blueprint/report-text-engine";
import { buildDossier } from "./dossier";
import { generateLeitfaden, generateVorschlaege } from "./generator";
import { pruefeVorschlaege } from "./reviewer";
import type {
  CustomVorschlag,
  GepruefterVorschlag,
  GuideDocument,
  ProtokollEintrag,
} from "./types";

/**
 * Wie oft der Erzeuger nachbessern darf, bevor aufgegeben wird.
 *
 * Eine Schleife ohne Grenze kann endlos laufen, und jede Runde kostet Geld und
 * Zeit. Nach der dritten erfolglosen Runde fällt der Vorschlag heraus, statt
 * dass die Erstellung hängt. Lieber zwei belegte Vorschläge als drei mit einem
 * wackeligen dabei.
 */
const MAX_RUNDEN = 3;

export interface GuideErgebnis {
  document: GuideDocument;
  protokoll: ProtokollEintrag[];
  runden: number;
}

/**
 * Erzeugt den Leitfaden: Vorschläge erfinden, unabhängig prüfen lassen,
 * Abgelehntes mit Begründung zurückgeben, und erst dann das Dokument
 * schreiben.
 */
export async function erzeugeLeitfaden(params: {
  sessionId: string;
  anweisung?: string | null;
  vorfassung?: GuideDocument | null;
}): Promise<GuideErgebnis> {
  const { sessionId, anweisung = null, vorfassung = null } = params;

  const [data, session] = await Promise.all([
    assembleBlueprintReport(sessionId),
    db.analysisSession.findUnique({
      where: { id: sessionId },
      select: { reportTexts: true },
    }),
  ]);

  let reportTexts: ReportTexts | null = null;
  if (session?.reportTexts) {
    try {
      reportTexts = JSON.parse(session.reportTexts) as ReportTexts;
    } catch {
      // Beschädigte Texte sind kein Grund, den Leitfaden zu verweigern — er
      // ist dann nur etwas ärmer.
      reportTexts = null;
    }
  }

  const dossier = buildDossier(data, reportTexts);

  const bestaetigt: GepruefterVorschlag[] = [];
  const protokoll: ProtokollEintrag[] = [];
  let abgelehnt: Array<{ titel: string; begruendung: string }> = [];
  let runde = 0;

  while (runde < MAX_RUNDEN && bestaetigt.length === 0) {
    runde++;

    const vorschlaege: CustomVorschlag[] = await generateVorschlaege(
      dossier,
      data.packageType,
      abgelehnt,
      anweisung
    );
    if (vorschlaege.length === 0) break;

    const urteile = await pruefeVorschlaege(dossier, vorschlaege);
    abgelehnt = [];

    for (const [i, vorschlag] of vorschlaege.entries()) {
      const urteil = urteile[i];
      protokoll.push({
        runde,
        titel: vorschlag.titel,
        bestanden: urteil.bestanden,
        begruendung: urteil.begruendung,
      });
      if (urteil.bestanden) {
        bestaetigt.push({ ...vorschlag, geprueftInRunde: runde });
      } else {
        abgelehnt.push({ titel: vorschlag.titel, begruendung: urteil.begruendung });
      }
    }
  }

  const rest = await generateLeitfaden(dossier, bestaetigt, anweisung, vorfassung);

  return {
    document: { ...rest, customVorschlaege: bestaetigt },
    protokoll,
    runden: runde,
  };
}

/**
 * Erzeugt eine neue Fassung und legt sie ab.
 *
 * Jede Fassung bleibt erhalten — der Kollege soll zurückgehen können, wenn
 * eine Nachschärfung in die falsche Richtung lief.
 */
export async function speichereNeueFassung(params: {
  sessionId: string;
  companyId: string;
  userId: string;
  anweisung?: string | null;
}): Promise<{ version: number; ergebnis: GuideErgebnis }> {
  const guide = await db.strategyGuide.upsert({
    where: { sessionId: params.sessionId },
    create: { sessionId: params.sessionId, companyId: params.companyId },
    update: {},
    include: { versions: { orderBy: { version: "desc" }, take: 1 } },
  });

  const letzte = guide.versions[0];
  let vorfassung: GuideDocument | null = null;
  if (letzte) {
    try {
      vorfassung = JSON.parse(letzte.content) as GuideDocument;
    } catch {
      vorfassung = null;
    }
  }

  const ergebnis = await erzeugeLeitfaden({
    sessionId: params.sessionId,
    anweisung: params.anweisung ?? null,
    vorfassung,
  });

  const version = (letzte?.version ?? 0) + 1;

  await db.strategyGuideVersion.create({
    data: {
      guideId: guide.id,
      version,
      instruction: params.anweisung ?? null,
      content: JSON.stringify(ergebnis.document),
      reviewLog: JSON.stringify(ergebnis.protokoll),
      rounds: ergebnis.runden,
      createdById: params.userId,
    },
  });

  return { version, ergebnis };
}
