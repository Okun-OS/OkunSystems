import { db } from "@/lib/db";
import { leseGuide } from "@/lib/strategy-guide/normalisieren";
import type { Kontext } from "./kontext";

/**
 * Den Kontext für ein Vorbereitungsgespräch zusammentragen.
 *
 * Alles, was der Chat über den Betrieb wissen muss, in einem Zug — und zwar
 * jedes Mal gleich, damit der zwischengespeicherte Vorspann gültig bleibt.
 */

function leseListe(roh: string): string[] {
  try {
    const gelesen: unknown = JSON.parse(roh);
    return Array.isArray(gelesen) ? gelesen.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export async function ladeKontext(
  sitzungId: string,
  beraterName: string
): Promise<Kontext | null> {
  const sitzung = await db.strategieSitzung.findUnique({
    where: { id: sitzungId },
    select: {
      sessionId: true,
      company: { select: { name: true, industry: true, contractPackage: true } },
      posten: {
        orderBy: { position: "asc" },
        select: { id: true, titel: true, art: true, zustand: true, warum: true, kundeSieht: true },
      },
      grundlagen: {
        orderBy: { position: "asc" },
        select: { id: true, bewegung: true, titel: true, zustand: true, sparenProMonat: true },
      },
    },
  });
  if (!sitzung) return null;

  const [programme, guide, bericht] = await Promise.all([
    db.blueprintSystem.findMany({
      where: { sessionId: sitzung.sessionId },
      select: {
        name: true,
        purposes: true,
        kostenProMonat: true,
        bindung: true,
        zufriedenheit: true,
      },
    }),
    db.strategyGuide.findUnique({
      where: { sessionId: sitzung.sessionId },
      select: { versions: { orderBy: { version: "desc" }, take: 1, select: { content: true } } },
    }),
    db.analysisSession.findUnique({
      where: { id: sitzung.sessionId },
      select: { reportTexts: true },
    }),
  ]);

  /*
    Aus dem Leitfaden wird der Befund, nicht das ganze Dokument.

    Die Posten stehen bereits als eigene Zeilen in der Lage; sie ein zweites
    Mal als JSON mitzuschicken, verdoppelt den Vorspann, ohne etwas
    hinzuzufügen.
  */
  const dok = guide?.versions[0] ? leseGuide(guide.versions[0].content) : null;
  const dossier = dok
    ? [
        dok.befund && `Befund: ${dok.befund}`,
        dok.empfehlung && `Empfehlung: ${dok.empfehlung}`,
        dok.workforceUrteil && `Zu OKUN Workforce: ${dok.workforceUrteil}`,
        dok.kernbefunde.length > 0 &&
          `Kernbefunde:\n${dok.kernbefunde
            .map((k) => `- ${k.titel}: ${k.beleg} → ${k.wirkung}`)
            .join("\n")}`,
      ]
        .filter(Boolean)
        .join("\n\n")
    : null;

  return {
    firma: sitzung.company.name,
    branche: sitzung.company.industry,
    paket: sitzung.company.contractPackage,
    beraterName,
    bericht: berichtsAuszug(bericht?.reportTexts ?? null),
    dossier: dossier || null,
    posten: sitzung.posten,
    programme: programme.map((p) => ({
      name: p.name,
      zwecke: leseListe(p.purposes),
      kostenProMonat: p.kostenProMonat,
      bindung: p.bindung,
      zufriedenheit: p.zufriedenheit,
    })),
    vorschlaege: sitzung.grundlagen,
  };
}

/**
 * Der Teil des Berichts, der für die Vorbereitung zählt.
 *
 * Der ganze Bericht sind zwanzig Seiten — Einleitung, Methodik, Modulseiten.
 * Vier Abschnitte tragen hier: die Zusammenfassung, die Grundlagen, die
 * Automatisierung und das Fazit.
 *
 * Bemerkenswert ist `grundlagenAnalyse`: Ihr letzter Absatz beschreibt, wie
 * eine geordnete Grundausstattung für diesen Betrieb aussähe. Dieses Zielbild
 * stand bisher im PDF des Kunden und wurde sonst nirgends gelesen — das
 * System rechnete daneben seine eigene, viel gröbere Auswertung. Hier kommt
 * es zum ersten Mal dort an, wo entschieden wird.
 */
function berichtsAuszug(roh: string | null): string | null {
  if (!roh) return null;

  let texte: Record<string, unknown>;
  try {
    texte = JSON.parse(roh) as Record<string, unknown>;
  } catch {
    return null;
  }

  const teile: string[] = [];
  const nimm = (schluessel: string, ueberschrift: string) => {
    const wert = texte[schluessel];
    if (typeof wert === "string" && wert.trim()) {
      teile.push(`### ${ueberschrift}\n${ohneMarkup(wert)}`);
    }
  };

  nimm("executiveSummary", "Zusammenfassung");
  nimm("grundlagenAnalyse", "Digitale Grundlagen — samt Zielbild im letzten Absatz");
  nimm("automatisierungAnalyse", "Automatisierung");
  nimm("conclusionText", "Fazit");

  return teile.length > 0 ? teile.join("\n\n") : null;
}

/** Die Berichtstexte liegen als HTML-Absätze vor; hier zählt der Text. */
function ohneMarkup(html: string): string {
  return html
    .replace(/<\/p>\s*<p[^>]*>/gi, "\n\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
