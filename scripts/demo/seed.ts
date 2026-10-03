/**
 * Ein erfundener Betrieb für den Durchlauf: Nordlicht Gebäudetechnik.
 *
 * Bewusst kein Vorzeigekunde — ein Handwerksbetrieb, bei dem vieles auf
 * Zuruf, Papier und Excel läuft.
 */
import "./guard";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import { minutesPerMonth } from "@/lib/blueprint/pillar3-engine";

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

// Welche Antwort bei welcher Frage. Zahl = Position der Option (1-basiert).
// Wo nichts steht, wird die zweitschlechteste gewählt.
const WAHL: Record<string, number[]> = {
  "M1.1": [2],            // Handwerk / Baugewerbe
  "M1.2": [4],            // Mitarbeiterzahl
  "M1.3": [1],            // ein Standort
  "M1.4": [2, 3],         // im Außendienst / gemischt
  "M1.5": [1],            // Geschäftsführung
  "M1.6": [2],
  "M1.7": [2],
  "M1.8": [2],            // Kundendaten teils digital
  "M1.9": [2],            // Zeiterfassung auf Papier
  "M1.10": [1],           // Einsatzplanung analog
  "M1.11": [1, 2, 3],     // Zuruf, Telefon, WhatsApp
  "M1.12": [1],           // keine KI
};

const FREITEXT: Record<string, string> = {
  "M1.13": "Buchhaltungsprogramm (DATEV-Schnittstelle), Branchensoftware für Angebote und Rechnungen, Outlook für Wartungsfristen, Excel-Listen für Material je Fahrzeug, WhatsApp-Gruppen für die Disposition.",
};

async function main() {
  console.log("Lege Nordlicht Gebäudetechnik an …");

  // Aufräumen in der Reihenfolge, die die Fremdschlüssel verlangen.
  const alt = await db.company.findMany({
    where: { name: { contains: "Nordlicht" } }, select: { id: true },
  });
  for (const c of alt) {
    const sitzungen = await db.analysisSession.findMany({
      where: { companyId: c.id }, select: { id: true },
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
    await db.companyContextEntry.deleteMany({ where: { session: { companyId: c.id } } });
    await db.companyContextSession.deleteMany({ where: { companyId: c.id } });
    await db.analysisSession.deleteMany({ where: { companyId: c.id } });
    await db.customerLearningAssignment.deleteMany({ where: { companyId: c.id } });
    await db.user.deleteMany({ where: { companyId: c.id } });
    await db.company.delete({ where: { id: c.id } });
  }

  

  const company = await db.company.create({
    data: {
      name: "Nordlicht Gebäudetechnik GmbH",
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

  const passwort = await bcrypt.hash("demo-nicht-produktiv", 12);
  await db.user.create({
    data: {
      email: "j.harms@nordlicht-gebaeudetechnik.example",
      name: "Jens Harms", password: passwort, role: "CLIENT",
      companyId: company.id, firstLogin: false, portalRole: "CLIENT_ADMIN",
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
      // Ein Betrieb mit Nachholbedarf: die zweitschlechteste Antwort, bei
      // Signalfragen zusätzlich das, was auf Individualentwicklung zeigt.
      const nachPunkten = [...opts].sort((a, b) => a.points - b.points);
      gewaehlt = [nachPunkten[Math.min(1, nachPunkten.length - 1)]];
      const custom = opts.filter((o) => o.signalCategory === "CUSTOM_DEVELOPMENT");
      const workforce = opts.filter((o) => o.signalCategory === "WORKFORCE");
      if (custom.length > 0 || workforce.length > 0) {
        gewaehlt = [...custom, ...workforce.slice(0, 2)];
      }
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
  console.log(`  ${beantwortet} Fragen beantwortet`);

  // ── Dritte Säule ────────────────────────────────────────────────────────
  const sys = async (name: string, category: string, purposes: string[], isCustom = false) =>
    db.blueprintSystem.create({
      data: { sessionId: session.id, name, category,
        purposes: JSON.stringify(purposes), isCustom },
    });

  const buchhaltung = await sys("DATEV-Anbindung", "finanzen", ["pur_invoices", "pur_reports"]);
  const branche = await sys("Branchensoftware (Angebote/Rechnungen)", "erp", ["pur_offers", "pur_invoices", "pur_customers", "pur_orders"]);
  const outlook = await sys("Outlook-Kalender", "kommunikation", ["pur_tasks", "pur_comms"]);
  const excel = await sys("Excel-Listen je Fahrzeug", "sonstige", ["pur_tasks", "pur_reports"], true);
  const whatsapp = await sys("WhatsApp-Gruppen", "kommunikation", ["pur_comms", "pur_scheduling"], true);
  const papier = await sys("Papier-Serviceberichte", "sonstige", ["pur_documents", "pur_time"], true);

  const tasks: Array<[string, string, string, string, string, string[]]> = [
    ["tsk_reports", "Serviceberichte abtippen", "verwaltung", "freq_daily", "dur_over60", [papier.id, branche.id]],
    ["tsk_deadlines", "Wartungsfristen in Excel und Outlook abgleichen", "verwaltung", "freq_weekly", "dur_over60", [outlook.id, excel.id]],
    ["tsk_dispatch", "Einsatzplanung für den Folgetag abstimmen", "disposition", "freq_daily", "dur_30_60", [whatsapp.id]],
    ["tsk_stock", "Materialbestand je Fahrzeug nachpflegen", "lager", "freq_weekly", "dur_30_60", [excel.id]],
    ["tsk_invoice", "Rechnungen aus Serviceberichten erstellen", "verwaltung", "freq_weekly", "dur_over60", [branche.id, papier.id]],
    ["tsk_proof", "Nachweise für Hausverwaltungen zusammenstellen", "verwaltung", "freq_monthly", "dur_over60", [papier.id, outlook.id]],
  ];
  for (const [i, [key, label, area, freq, dur, systemIds]] of tasks.entries()) {
    const minuten = minutesPerMonth(freq, dur) ?? 0;
    await db.blueprintTask.create({
      data: { sessionId: session.id, catalogKey: key, label, area,
        frequencyBand: freq, durationBand: dur,
        systemIds: JSON.stringify(systemIds), minutesPerMonth: minuten,
        position: i },
    });
  }

  const flow = await db.blueprintFlow.create({
    data: { sessionId: session.id, catalogKey: "flow_order", title: "Ein Auftrag wird angelegt und abgewickelt", position: 0 },
  });
  const stationen: Array<[string, string, string, string]> = [
    ["st_receive",  "Büro",           "WhatsApp / Telefon",   "manual"],
    ["st_route",    "Disposition",    "Magnettafel",          "manual"],
    ["st_transfer", "Büro",           "Branchensoftware",     "manual"],
    ["st_create",   "Disposition",    "Magnettafel",          "manual"],
    ["st_document", "Monteur",        "Papier-Servicebericht","manual"],
    ["st_inform",   "Büro",           "WhatsApp",             "manual"],
    ["st_followup", "Büro",           "Outlook-Kalender",     "manual"],
    ["st_archive",  "Buchhaltung",    "Branchensoftware",     "partial"],
  ];
  for (const [i, [key, rolle, systemLabel, mode]] of stationen.entries()) {
    await db.blueprintFlowStation.create({
      data: { flowId: flow.id, stationKey: key, position: i, role: rolle,
        systemLabel, mode },
    });
  }

  console.log(`  Unternehmen: ${company.id}`);
  console.log(`  Sitzung:     ${session.id}`);
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
