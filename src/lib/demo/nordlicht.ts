/**
 * Ein erfundener Betrieb zum Vorführen: Nordlicht Gebäudetechnik.
 *
 * Bewusst kein Vorzeigekunde — ein Handwerksbetrieb, bei dem vieles auf
 * Zuruf, Papier und Excel läuft. Gedacht, um Bericht und Leitfaden an einem
 * vollständigen Fall zu sehen, ohne Daten eines echten Kunden dafür zu
 * benutzen.
 *
 * Zwei Entscheidungen, die für den Einsatz im Livesystem wichtig sind:
 *
 * 1. Es werden **keine Benutzerkonten** angelegt. Ein Konto mit bekanntem
 *    Kennwort im Produktivsystem wäre eine offene Tür — und für Bericht und
 *    Leitfaden braucht es keines, die erzeugt ein Mitarbeiter im Admin-Bereich.
 * 2. Der Name trägt den Zusatz "(Demo)", damit niemand die Firma in der
 *    Kundenliste für einen echten Kunden hält.
 */
import { db } from "@/lib/db";
import { minutesPerMonth } from "@/lib/blueprint/pillar3-engine";

export const DEMO_FIRMA = "Nordlicht Gebäudetechnik GmbH (Demo)";

/** Woran die Demo-Daten erkannt werden — auch frühere Namensvarianten. */
const DEMO_KENNUNG = "Nordlicht";

const KONTEXT: Array<[string, string]> = [
  ["In welcher Branche ist Ihr Unternehmen tätig, und was macht Ihr Unternehmen konkret?",
   "Wir sind ein Gebäudetechnik-Betrieb in Hamburg — Sanitär, Heizung, Klima und ein kleiner Elektrobereich. Wir bauen Anlagen ein und warten sie danach. Etwa zwei Drittel unseres Umsatzes kommt aus Wartungsverträgen mit Hausverwaltungen und Gewerbekunden, der Rest aus Neuinstallation und Notdiensten."],
  ["Wie ist Ihr Unternehmen aufgestellt? Wie viele Mitarbeiter haben Sie, und welche Bereiche oder Abteilungen gibt es?",
   "48 Mitarbeitende. 31 davon im Außendienst auf 14 Fahrzeugen, 9 im Büro (Auftragsannahme, Disposition, Buchhaltung), 3 in der Projektleitung, dazu 5 Azubis. Mein Bruder und ich führen den Betrieb, mein Bruder macht die Technik, ich das Kaufmännische."],
  ["Wie würden Sie den aktuellen Stand Ihrer Digitalisierung beschreiben — wo stehen Sie heute?",
   "Ehrlich gesagt durchwachsen. Wir haben ein Buchhaltungsprogramm und eine Branchensoftware für Angebote und Rechnungen. Aber die Einsatzplanung hängt an einer Magnettafel im Büro und läuft über WhatsApp. Die Monteure schreiben ihre Berichte auf Papier, und Montag tippt jemand im Büro die Woche nach. Material wird in einer Excel-Liste pro Fahrzeug geführt, die aber nie stimmt."],
  ["Was sind Ihre größten Herausforderungen im operativen Alltag? Was kostet Sie und Ihr Team am meisten Zeit?",
   "Zwei Dinge. Erstens das Abtippen der Serviceberichte — da sitzt eine Kollegin faktisch zwei Tage die Woche dran, und trotzdem fehlen immer welche, was dann die Rechnungsstellung verzögert. Zweitens die Wartungsfristen: Bei vielen Anlagen gibt es gesetzlich vorgeschriebene Prüfintervalle, teils jährlich, teils alle zwei oder fünf Jahre. Das führen wir in einem Outlook-Kalender und einer Excel-Liste. Wir haben voriges Jahr zwei Fristen gerissen, das war unangenehm und hätte teuer werden können."],
  ["Was hat Sie dazu bewogen, sich jetzt mit Digitalisierung zu beschäftigen? Gibt es einen konkreten Auslöser?",
   "Eine Hausverwaltung, unser zweitgrößter Kunde, verlangt ab nächstem Jahr digitale Wartungsnachweise mit Zeitstempel und Foto. Das können wir heute nicht liefern. Und unsere Bürokollegin, die das meiste im Kopf hat, geht in zwei Jahren in Rente."],
  ["Was wäre für Sie ein besonders gutes Ergebnis? Welche Veränderungen würden Ihnen und Ihrem Team am meisten helfen?",
   "Dass der Monteur seinen Bericht vor Ort fertig macht und niemand mehr etwas abtippt. Und dass mich das System rechtzeitig warnt, bevor eine Prüffrist abläuft, statt dass ich mich darauf verlassen muss, dass jemand in die Excel-Liste schaut."],
];

/** Welche Antwort bei welcher Frage. Zahl = Position der Option (1-basiert). */
const WAHL: Record<string, number[]> = {
  "M1.1": [2], "M1.2": [5], "M1.3": [1], "M1.4": [2, 3], "M1.5": [1],
  "M1.6": [2], "M1.7": [1], "M1.8": [2], "M1.9": [2], "M1.10": [1],
  "M1.11": [1, 2, 3], "M1.12": [1],
  "M1.14": [3],        // dienstliche Mobiltelefone — Erfassung vor Ort ist möglich
  "M1.15": [3],        // ein externer IT-Dienstleister betreut die Systeme
  "M1.16": [2, 5],     // Berichte von unterwegs, Checklisten und Prüfnachweise
};

const FREITEXT: Record<string, string> = {
  "M1.13": "Buchhaltungsprogramm (DATEV-Schnittstelle), Branchensoftware für Angebote und Rechnungen, Outlook für Wartungsfristen, Excel-Listen für Material je Fahrzeug, WhatsApp-Gruppen für die Disposition.",
};

export interface DemoErgebnis {
  companyId: string;
  sessionId: string;
  beantwortet: number;
}

/**
 * Entfernt alle Demo-Daten dieses Betriebs, in der Reihenfolge, die die
 * Fremdschlüssel verlangen.
 *
 * Greift ausschließlich auf Unternehmen zu, deren Name die Demo-Kennung
 * trägt — nie auf etwas anderes.
 */
export async function entferneNordlicht(): Promise<number> {
  const firmen = await db.company.findMany({
    where: { name: { contains: DEMO_KENNUNG } },
    select: { id: true },
  });

  for (const firma of firmen) {
    const sitzungen = await db.analysisSession.findMany({
      where: { companyId: firma.id },
      select: { id: true },
    });
    for (const s of sitzungen) {
      await db.blueprintFlowStation.deleteMany({ where: { flow: { sessionId: s.id } } });
      await db.blueprintFlow.deleteMany({ where: { sessionId: s.id } });
      await db.blueprintTask.deleteMany({ where: { sessionId: s.id } });
      await db.blueprintSystem.deleteMany({ where: { sessionId: s.id } });
      await db.sessionAnswer.deleteMany({ where: { sessionId: s.id } });
      await db.strategyGuideVersion.deleteMany({ where: { guide: { sessionId: s.id } } });
      await db.strategyGuide.deleteMany({ where: { sessionId: s.id } });
    }
    await db.companyContextEntry.deleteMany({ where: { session: { companyId: firma.id } } });
    await db.companyContextSession.deleteMany({ where: { companyId: firma.id } });
    await db.okunScore.deleteMany({ where: { companyId: firma.id } });
    await db.detectedProblem.deleteMany({ where: { companyId: firma.id } });
    await db.opportunity.deleteMany({ where: { companyId: firma.id } });
    await db.processProfile.deleteMany({ where: { companyId: firma.id } });
    await db.analysisSession.deleteMany({ where: { companyId: firma.id } });
    await db.customerLearningAssignment.deleteMany({ where: { companyId: firma.id } });
    await db.document.deleteMany({ where: { companyId: firma.id } });
    await db.activityLog.deleteMany({ where: { companyId: firma.id } });
    await db.note.deleteMany({ where: { companyId: firma.id } });
    await db.user.deleteMany({ where: { companyId: firma.id } });
    await db.company.delete({ where: { id: firma.id } });
  }

  return firmen.length;
}

/**
 * Legt den Betrieb samt Vorgespräch, beantwortetem Blueprint und dritter
 * Säule an. Vorhandene Demo-Daten werden vorher entfernt, damit zweimaliges
 * Drücken nicht zwei Firmen erzeugt.
 */
export async function seedNordlicht(): Promise<DemoErgebnis> {
  await entferneNordlicht();

  const company = await db.company.create({
    data: {
      name: DEMO_FIRMA,
      industry: "Handwerk / Gebäudetechnik",
      legalForm: "GmbH",
      street: "Billstraße", houseNumber: "112",
      postalCode: "20539", city: "Hamburg", country: "Deutschland",
      website: "https://nordlicht-gebaeudetechnik.example",
      phone: "040 55512340",
      contactPerson: "Jens Harms",
      contactFirstName: "Jens", contactLastName: "Harms",
      contactPosition: "Geschäftsführer (kaufmännisch)",
      contactEmail: "j.harms@nordlicht-gebaeudetechnik.example",
      plan: "operations",
      status: "ACTIVE",
      projectPhase: "blueprint",
      leadStatus: "contract_closed",
      contractPackage: "operations",
      contractValue: 7500,
      convertedAt: new Date("2026-09-08"),
      activatedAt: new Date("2026-09-09"),
    },
  });

  // ── Vorgespräch ─────────────────────────────────────────────────────────
  const ctx = await db.companyContextSession.create({
    data: { companyId: company.id, status: "COMPLETED", completedAt: new Date("2026-09-12") },
  });
  for (const [i, [frage, antwort]] of KONTEXT.entries()) {
    await db.companyContextEntry.create({
      data: { sessionId: ctx.id, role: "assistant", content: frage, order: i * 2 },
    });
    await db.companyContextEntry.create({
      data: { sessionId: ctx.id, role: "user", content: antwort, order: i * 2 + 1 },
    });
  }

  // ── Blueprint-Sitzung ───────────────────────────────────────────────────
  const session = await db.analysisSession.create({
    data: {
      companyId: company.id, status: "COMPLETED", phase: "BLUEPRINT_M1",
      blueprintVersion: "2.0", packageType: "operations",
      startedAt: new Date("2026-09-12"), completedAt: new Date("2026-09-15"),
      pillar3CompletedAt: new Date("2026-09-15"),
    },
  });
  await db.companyContextSession.update({
    where: { id: ctx.id }, data: { analysisSessionId: session.id },
  });

  const fragen = await db.questionTemplate.findMany({
    where: { isActive: true, phase: { startsWith: "BLUEPRINT_" } },
    include: { answerOptions: { where: { isActive: true }, orderBy: { order: "asc" } } },
    orderBy: { order: "asc" },
  });
  if (fragen.length === 0) {
    throw new Error(
      "Es sind keine Blueprint-Fragen hinterlegt — ohne Fragenkatalog gibt es nichts zu beantworten."
    );
  }

  let beantwortet = 0;
  for (const frage of fragen) {
    const opts = frage.answerOptions;
    if (opts.length === 0) {
      const text = FREITEXT[frage.externalId];
      if (!text) continue;
      await db.sessionAnswer.create({
        data: { sessionId: session.id, questionId: frage.id,
          selectedOptionIds: "[]", freeText: text, status: "ANSWERED" },
      });
      beantwortet++;
      continue;
    }

    const vorgabe = WAHL[frage.externalId];
    let gewaehlt: typeof opts;
    if (vorgabe) {
      gewaehlt = vorgabe.map((n) => opts[n - 1]).filter(Boolean);
    } else {
      // Ein Betrieb mit Nachholbedarf: die zweitschlechteste Antwort.
      const nachPunkten = [...opts].sort((a, b) => a.points - b.points);
      gewaehlt = [nachPunkten[Math.min(1, nachPunkten.length - 1)]];

      // Bei Signalfragen eine glaubwürdige Mischung über alle drei Arten.
      //
      // Vorher wurden hier ausschließlich die Antworten mit Personal- oder
      // Individualsignal gewählt. Dadurch löste dieser Betrieb nie eine
      // bewährte Lösung aus — kein CRM, keine Buchhaltung, kein Wiki —, und
      // der Leitfaden konnte sie folglich nicht empfehlen. Das sah aus wie
      // ein Fehler der Auswertung, war aber einer der Demo-Daten: Ein
      // Handwerksbetrieb, der Kundendaten auf Zuruf führt, kreuzt sehr wohl
      // an, dass Kundendaten unstrukturiert liegen.
      const je = (kat: string, wieviel: number) =>
        opts.filter((o) => o.signalCategory === kat).slice(0, wieviel);
      const gemischt = [
        ...je("CUSTOM_DEVELOPMENT", 2),
        ...je("WORKFORCE", 2),
        ...je("BEWAEHRTE_LOESUNG", 2),
      ];
      if (gemischt.length > 0) gewaehlt = gemischt;
    }
    if (gewaehlt.length === 0) gewaehlt = [opts[0]];

    const braucht = gewaehlt.find((o) =>
      /freitext|sonstiges|bitte angeben|andere lösung|welche anwendungen/i.test(o.textDe));
    const punkte = gewaehlt.reduce((s, o) => s + o.points, 0);

    await db.sessionAnswer.create({
      data: {
        sessionId: session.id, questionId: frage.id,
        selectedOptionIds: JSON.stringify(gewaehlt.map((o) => o.id)),
        freeText: braucht
          ? "Wiederkehrende gesetzliche Prüffristen je Anlage (jährlich, zweijährlich, fünfjährlich) samt Nachweis mit Foto und Zeitstempel — das bildet unsere Branchensoftware nicht ab."
          : null,
        computedScore: Math.round(punkte / gewaehlt.length),
        computedSignals: JSON.stringify({}),
        status: "ANSWERED",
      },
    });
    beantwortet++;
  }

  // ── Dritte Säule ────────────────────────────────────────────────────────
  //
  // Mit den Schlüsseln aus dem Katalog und echten Produktnamen. Vorher standen
  // hier erfundene Bezeichnungen ohne Katalogbezug ("Branchensoftware
  // (Angebote/Rechnungen)"). Der Leitfaden konnte daraus nicht erkennen, was
  // der Betrieb wirklich einsetzt, und fragte in jedem Posten nach dem Namen
  // — ein Mangel, der wie eine Lücke im Fragebogen aussah, aber keiner war.
  const sys = (
    catalogKey: string,
    name: string,
    category: string,
    purposes: string[]
  ) =>
    db.blueprintSystem.create({
      data: {
        sessionId: session.id,
        catalogKey,
        name,
        category,
        purposes: JSON.stringify(purposes),
      },
    });

  const office = await sys("sys_ms365", "Microsoft 365 / Outlook", "Büro & E-Mail", ["pur_comms", "pur_scheduling"]);
  await sys("sys_datev", "DATEV", "Buchhaltung & Rechnung", ["pur_invoices", "pur_reports"]);
  const branche = await sys("sys_branchen", "Streit V.1", "Branchensoftware", ["pur_offers", "pur_invoices", "pur_customers", "pur_orders"]);
  const excel = await sys("sys_task_calendar", "Outlook-Kalender und Excel-Listen", "Aufgaben & Fristen", ["pur_tasks", "pur_reports"]);
  const whatsapp = await sys("sys_comm_whatsapp", "WhatsApp", "Interne Kommunikation", ["pur_comms", "pur_scheduling"]);
  const papier = await sys("sys_doc_paper", "Papierordner und Papier-Serviceberichte", "Dokumente & Ablage", ["pur_documents"]);
  await sys("sys_time_paper", "Stundenzettel auf Papier", "Arbeitszeiten", ["pur_time"]);
  await sys("sys_plan_paper", "Magnettafel im Büro", "Planung & Einsatz", ["pur_scheduling"]);

  // Ausdrücklich ohne System — damit die Lücke in der Auswertung sichtbar wird
  // und nicht bloß als fehlende Angabe durchgeht.
  await sys("sys_crm_none", "kein System", "Kundenverwaltung", []);
  await sys("sys_hr_folder", "Ordner im Schrank", "Personal", ["pur_hr"]);

  const tasks: Array<[string, string, string, string, string, string[]]> = [
    ["tsk_reports", "Serviceberichte abtippen", "Verwaltung & Dokumente", "freq_daily", "dur_over60", [papier.id, branche.id]],
    ["tsk_deadlines", "Wartungsfristen in Excel und Outlook abgleichen", "Verwaltung & Dokumente", "freq_weekly", "dur_over60", [office.id, excel.id]],
    ["tsk_dispatch", "Einsatzplanung für den Folgetag abstimmen", "Steuerung & Abstimmung", "freq_daily", "dur_30_60", [whatsapp.id]],
    ["tsk_stock", "Materialbestand je Fahrzeug nachpflegen", "Einkauf & Material", "freq_weekly", "dur_30_60", [excel.id]],
    ["tsk_invoice", "Rechnungen aus Serviceberichten erstellen", "Rechnungen & Zahlungen", "freq_weekly", "dur_over60", [branche.id, papier.id]],
    ["tsk_proof", "Nachweise für Hausverwaltungen zusammenstellen", "Verwaltung & Dokumente", "freq_monthly", "dur_over60", [papier.id, office.id]],
  ];
  for (const [i, [key, label, area, freq, dur, systemIds]] of tasks.entries()) {
    await db.blueprintTask.create({
      data: { sessionId: session.id, catalogKey: key, label, area,
        frequencyBand: freq, durationBand: dur,
        systemIds: JSON.stringify(systemIds),
        minutesPerMonth: minutesPerMonth(freq, dur) ?? 0,
        position: i },
    });
  }

  const flow = await db.blueprintFlow.create({
    data: { sessionId: session.id, catalogKey: "flow_order",
      title: "Ein Auftrag wird angelegt und abgewickelt", position: 0 },
  });
  const stationen: Array<[string, string, string, string]> = [
    ["st_receive",  "Büro",        "WhatsApp / Telefon",    "manual"],
    ["st_route",    "Disposition", "Magnettafel",           "manual"],
    ["st_transfer", "Büro",        "Branchensoftware",      "manual"],
    ["st_create",   "Disposition", "Magnettafel",           "manual"],
    ["st_document", "Monteur",     "Papier-Servicebericht", "manual"],
    ["st_inform",   "Büro",        "WhatsApp",              "manual"],
    ["st_followup", "Büro",        "Outlook-Kalender",      "manual"],
    ["st_archive",  "Buchhaltung", "Branchensoftware",      "partial"],
  ];
  for (const [i, [key, rolle, systemLabel, mode]] of stationen.entries()) {
    await db.blueprintFlowStation.create({
      data: { flowId: flow.id, stationKey: key, position: i, role: rolle,
        systemLabel, mode },
    });
  }

  return { companyId: company.id, sessionId: session.id, beantwortet };
}
