import type { BlueprintReportData } from "@/lib/blueprint/report-assembler";
import type { ReportTexts } from "@/lib/blueprint/report-text-engine";
import { formatHours, stationLabel } from "@/lib/blueprint/pillar3-engine";
import { packageLabel } from "@/lib/packages";
import { umfangAlsText } from "@/lib/packages/umfang";

/**
 * Die Faktengrundlage für Erzeuger und Prüfer.
 *
 * Beide bekommen denselben Text — das ist der Kern der Prüfung. Der Prüfer
 * soll nachsehen können, ob eine Behauptung im Bestand steht, und das geht
 * nur, wenn er denselben Bestand vor sich hat. Was er **nicht** bekommt, ist
 * die Begründung, mit der der Erzeuger seinen Vorschlag verkauft hat; sonst
 * liest er sie mit und lässt sich überzeugen.
 *
 * Alle Zahlen kommen fertig gerechnet aus der Auswertung. Hier wird nichts
 * geschätzt und nichts umgerechnet — sonst stünden im Bericht des Kunden und
 * im Leitfaden des Kollegen verschiedene Zahlen über denselben Betrieb.
 */
export function buildDossier(
  data: BlueprintReportData,
  reportTexts: ReportTexts | null
): string {
  const teile: string[] = [];

  // ── Unternehmen ──────────────────────────────────────────────────────────
  const p = data.profile;
  teile.push(
    [
      "## Unternehmen",
      `Name: ${p.name}${p.legalForm ? ` (${p.legalForm})` : ""}`,
      p.industry ? `Branche: ${p.industry}` : null,
      p.city ? `Ort: ${p.city}` : null,
      p.contactPerson
        ? `Ansprechpartner: ${p.contactPerson}${p.contactPosition ? `, ${p.contactPosition}` : ""}`
        : null,
      `Gebuchtes Paket: ${packageLabel(data.packageType) ?? "keines hinterlegt"}`,
    ]
      .filter(Boolean)
      .join("\n")
  );

  // ── Was der Kunde selbst erzählt hat ─────────────────────────────────────
  teile.push(umfangAlsText(data.packageType));

  if (data.companyContext) {
    const paare = data.companyContext.entries.reduce<string[]>((acc, e, i, arr) => {
      if (e.role === "assistant" && arr[i + 1]?.role === "user") {
        acc.push(`Frage: ${e.content}\nAntwort: ${arr[i + 1].content}`);
      }
      return acc;
    }, []);
    teile.push(
      [
        "## Was der Kunde über sich selbst gesagt hat",
        "Wörtlich aus dem Unternehmenskontext — dem ersten Teil des Blueprints,",
        "den der Kunde selbst ausgefüllt hat. Die wichtigste Quelle für alles,",
        "was nicht in Zahlen steht. Es gab kein Vorgespräch; nenne es im",
        "Gespräch nie so.",
        "",
        paare.length > 0 ? paare.join("\n\n") : data.companyContext.summary ?? "—",
      ].join("\n")
    );
  }

  // ── Werte ────────────────────────────────────────────────────────────────
  teile.push(
    [
      "## Werte aus der Auswertung",
      `Gesamtwert: ${data.totalScore} von 100`,
      `Beantwortet: ${data.totalAnswered} von ${data.totalActive} aktiven Fragen`,
      "",
      "Module (Wert | Gewicht | Beitrag zum Gesamtwert):",
      ...data.moduleScores.map(
        (m) =>
          `- ${m.label}: ${m.score} | ${Math.round(m.weight * 100)} % | ${m.contribution.toFixed(1)}`
      ),
      "",
      data.skippedGroups.length > 0
        ? `Bereiche, die den Betrieb nicht betreffen und deshalb nicht bewertet wurden: ${data.skippedGroups.join(", ")}`
        : "Alle Bereiche betreffen den Betrieb.",
      "",
      `Signale: Workforce ${data.signals.WORKFORCE} | Bewährte Lösungen ${data.signals.BEWAEHRTE_LOESUNG} | Individualentwicklung ${data.signals.CUSTOM_DEVELOPMENT}`,
    ].join("\n")
  );

  // ── Dritte Säule: das Rohmaterial für Custom-Ideen ───────────────────────
  const p3 = data.pillar3;
  if (p3?.hasData) {
    const zeilen: string[] = ["## Systeme, Aufgaben und Abläufe"];

    zeilen.push(`\n### Systeme (${p3.systems.systemCount})`);
    for (const row of p3.systems.rows) {
      zeilen.push(`- ${row.purposeLabel}: ${row.systemNames.join(", ") || "kein System"}`);
    }
    if (p3.systems.mediaBreaks.length > 0) {
      zeilen.push(
        `\nMedienbrüche — ein Zweck läuft über mehrere Systeme: ${p3.systems.mediaBreaks
          .map((r) => `${r.purposeLabel} (${r.systemNames.join(" + ")})`)
          .join("; ")}`
      );
    }
    if (p3.systems.gaps.length > 0) {
      zeilen.push(
        `\nLücken — Zwecke ohne System: ${p3.systems.gaps.map((r) => r.purposeLabel).join(", ")}`
      );
    }
    if (p3.systems.overloaded.length > 0) {
      zeilen.push(
        `\nÜberladene Programme: ${p3.systems.overloaded
          .map((o) => `${o.name} (${o.purposeCount} Zwecke)`)
          .join(", ")}`
      );
    }

    zeilen.push(
      `\n### Aufgaben — zusammen ${formatHours(p3.tasks.totalHoursPerMonth)} Stunden im Monat`
    );
    for (const t of p3.tasks.entries) {
      zeilen.push(
        `- ${t.task.label} (${t.task.area}): ${formatHours(t.hoursPerMonth)} h/Monat, ${t.task.systemIds.length} beteiligte Systeme`
      );
    }

    zeilen.push(`\n### Abläufe — Reifegrad ${p3.flowMaturity} von 100`);
    for (const f of p3.flows.findings) {
      zeilen.push(
        `- ${f.flow.title}: ${f.manualStations} von ${f.relevantStations} Stationen von Hand (${f.manualShare} %), ${f.systemSwitches} Programmwechsel` +
          (f.carrier ? `, getragen von: ${f.carrier.role}` : "") +
          (f.takeoverStations.length > 0
            ? `\n  Stationen, die heute von Hand laufen: ${f.takeoverStations.map(stationLabel).join(", ")}`
            : "")
      );
    }
    teile.push(zeilen.join("\n"));
  }

  // ── Antworten im Wortlaut ────────────────────────────────────────────────
  if (data.answers.length > 0) {
    const zeilen = [
      "## Die Antworten im Wortlaut",
      "Was der Kunde angekreuzt und dazugeschrieben hat. Freitexte sind die",
      "Stellen, an denen er selbst sagt, was Standardsoftware bei ihm nicht",
      "abbildet.",
      "",
    ];
    for (const a of data.answers) {
      const teil = [`[${a.externalId}] ${a.question}`];
      if (a.selected.length > 0) teil.push(`  → ${a.selected.join(" | ")}`);
      if (a.freeText) teil.push(`  → Freitext: „${a.freeText}“`);
      zeilen.push(teil.join("\n"));
    }
    teile.push(zeilen.join("\n"));
  }

  // ── Empfehlungen und Roadmap ─────────────────────────────────────────────
  if (data.recommendations.length > 0) {
    teile.push(
      [
        "## Lösungen, die die Auswertung vorschlägt",
        "",
        "Es gibt drei Arten, und sie bedeuten für den Kunden Verschiedenes:",
        "",
        "- DIGITALE GRUNDLAGE: ein bewährtes Werkzeug vom Markt, das wir für ihn",
        "  auswählen, einrichten und auf seinen Betrieb zuschneiden. Er bekommt",
        "  damit erst die Grundlage, auf der sich überhaupt etwas automatisieren",
        "  lässt. Schon im kleinsten Paket enthalten.",
        "- AUTOMATISIERUNG: ein Baustein, der einen Ablauf übernimmt, der heute",
        "  von Hand läuft. Ordne ihn im Abschnitt zur Umsetzung dem Block des",
        "  Leistungsumfangs zu, in den er gehört — zu den Automatisierungen oder",
        "  zur Workforce, je nachdem, was er tatsächlich tut.",
        "- INDIVIDUELL GEBAUT: wird für ihn entwickelt, weil es das so nicht gibt.",
        "",
        ...data.recommendations.map((r) => {
          const art =
            r.category === "BEWAEHRTE_LOESUNG"
              ? "DIGITALE GRUNDLAGE"
              : r.category === "WORKFORCE"
                ? "AUTOMATISIERUNG"
                : "INDIVIDUELL GEBAUT";
          return `- ${r.name} [${art}, Trefferstärke ${r.signalScore}]${
            r.beyondPackage ? " — LIEGT ÜBER DEM GEBUCHTEN PAKET" : " — im gebuchten Paket enthalten"
          }\n  ${r.description}`;
        }),
      ].join("\n")
    );
  }

  // ── Was der Kunde schwarz auf weiß bekommen hat ──────────────────────────
  if (reportTexts) {
    teile.push(
      [
        "## Aus dem Bericht, den der Kunde bereits erhalten hat",
        "Daran muss sich das Gespräch messen lassen — der Kunde hat es gelesen.",
        "",
        `Kurzfassung: ${reportTexts.executiveSummary}`,
        "",
        `Einordnung des Werts: ${reportTexts.scoreAnalysis}`,
        "",
        `Schluss: ${reportTexts.conclusionText}`,
      ].join("\n")
    );
  }

  return teile.join("\n\n---\n\n");
}
