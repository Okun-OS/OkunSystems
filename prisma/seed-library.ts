// @ts-nocheck
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const PROCESSES = [
  { id: "P001", name: "Leadgewinnung", category: "Vertrieb", description: "Gewinnung neuer potenzieller Kunden über Empfehlungen, Online-Kanäle, Netzwerke, Kaltakquise oder bezahlte Kampagnen." },
  { id: "P002", name: "Leadrecherche", category: "Vertrieb", description: "Konkretes Suchen, Sammeln und Prüfen von Unternehmens- oder Ansprechpartnerdaten." },
  { id: "P003", name: "Leadqualifizierung", category: "Vertrieb", description: "Bewertung, ob ein Lead zur Zielgruppe passt und vertrieblich relevant ist." },
  { id: "P004", name: "Terminvereinbarung", category: "Vertrieb", description: "Koordination und Buchung von Erst- oder Folgeterminen mit potenziellen Kunden." },
  { id: "P005", name: "Erstgespräch", category: "Vertrieb", description: "Erster qualifizierter Kontakt zur Bedarfsermittlung und Erstvorstellung." },
  { id: "P006", name: "Bedarfsermittlung", category: "Vertrieb", description: "Systematische Erfassung der Anforderungen, Ziele und Herausforderungen des Kunden." },
  { id: "P007", name: "Angebotserstellung", category: "Vertrieb", description: "Erstellung und Kalkulation individueller Angebote für Interessenten oder Bestandskunden." },
  { id: "P008", name: "Angebotsfreigabe", category: "Vertrieb", description: "Interne Prüfung und Freigabe von Angeboten vor dem Versand." },
  { id: "P009", name: "Angebotsversand", category: "Vertrieb", description: "Übermittlung des Angebots an den Interessenten und Dokumentation." },
  { id: "P010", name: "Follow-up", category: "Vertrieb", description: "Systematische Nachverfolgung offener Angebote, Anfragen und Interessenten." },
  { id: "P011", name: "Einwandbehandlung", category: "Vertrieb", description: "Professioneller Umgang mit Einwänden, Bedenken und Preisdiskussionen." },
  { id: "P012", name: "Vertragsabschluss", category: "Vertrieb", description: "Finalisierung und Unterzeichnung des Vertrags sowie Übergabe an Operations." },
  { id: "P013", name: "Neukunden-Onboarding", category: "Kundenmanagement", description: "Strukturierte Einführung neuer Kunden in die Zusammenarbeit, Systeme und Prozesse." },
  { id: "P014", name: "Kundenreaktivierung", category: "Vertrieb", description: "Systematisches Ansprechen inaktiver oder verloren geglaubter Kunden." },
  { id: "P015", name: "Bestandskundenentwicklung", category: "Vertrieb", description: "Aktive Entwicklung bestehender Kundenbeziehungen für Upselling und Cross-Selling." },
  { id: "P016", name: "Contentplanung", category: "Marketing", description: "Planung und Strukturierung von Content-Ideen, Themen und Veröffentlichungsplänen." },
  { id: "P017", name: "Content-Erstellung", category: "Marketing", description: "Produktion von Texten, Grafiken, Videos oder anderen Content-Formaten." },
  { id: "P018", name: "Social-Media-Veröffentlichung", category: "Marketing", description: "Planung, Erstellung und Veröffentlichung von Posts auf Social-Media-Kanälen." },
  { id: "P019", name: "Kampagnenplanung", category: "Marketing", description: "Strategische Planung und Vorbereitung von Marketingkampagnen." },
  { id: "P020", name: "Anzeigenmanagement", category: "Marketing", description: "Erstellung, Optimierung und Auswertung von bezahlten Werbeanzeigen." },
  { id: "P021", name: "Landingpage-Erstellung", category: "Marketing", description: "Konzept und Aufbau von zielgruppenspezifischen Landingpages." },
  { id: "P022", name: "Leadmagneten", category: "Marketing", description: "Erstellung und Pflege von Inhalten zur automatischen Leadgenerierung." },
  { id: "P023", name: "Newsletter", category: "Marketing", description: "Planung, Erstellung und Versand von E-Mail-Newslettern." },
  { id: "P024", name: "Performance-Auswertung", category: "Marketing", description: "Regelmäßige Analyse und Auswertung von Marketing-KPIs und Kampagnenergebnissen." },
  { id: "P025", name: "Kundenkommunikation", category: "Kundenmanagement", description: "Steuerung aller Kommunikationskanäle und Inhalte für bestehende Kunden." },
  { id: "P026", name: "Supportanfragen", category: "Kundenmanagement", description: "Entgegennahme, Bearbeitung und Dokumentation von Kundenanfragen und Supportfällen." },
  { id: "P027", name: "Reklamationen", category: "Kundenmanagement", description: "Professionelle Bearbeitung von Beschwerden und Reklamationen." },
  { id: "P028", name: "Kundenfeedback", category: "Kundenmanagement", description: "Systematisches Einholen, Dokumentieren und Auswerten von Kundenfeedback." },
  { id: "P029", name: "Vertragsverlängerung", category: "Kundenmanagement", description: "Proaktive Steuerung auslaufender Verträge und Verlängerungsverhandlungen." },
  { id: "P030", name: "Kündigungsmanagement", category: "Kundenmanagement", description: "Strukturierter Umgang mit Kündigungen und Rückgewinnungsmaßnahmen." },
  { id: "P031", name: "Stellenerstellung", category: "Recruiting", description: "Erstellung und Abstimmung von Stellenausschreibungen." },
  { id: "P032", name: "Bewerbergewinnung", category: "Recruiting", description: "Aktive und passive Gewinnung von Bewerbern über verschiedene Kanäle." },
  { id: "P033", name: "Bewerbungseingang", category: "Recruiting", description: "Entgegennahme, Prüfung und Verwaltung eingehender Bewerbungen." },
  { id: "P034", name: "Bewerberprüfung", category: "Recruiting", description: "Strukturierte Bewertung und Vorauswahl von Bewerbern." },
  { id: "P035", name: "Interviewplanung", category: "Recruiting", description: "Organisation und Koordination von Vorstellungsgesprächen." },
  { id: "P036", name: "Interviews", category: "Recruiting", description: "Durchführung und Dokumentation von Vorstellungsgesprächen." },
  { id: "P037", name: "Einstellung", category: "Recruiting", description: "Formeller Prozess von der Zusage bis zur Vertragsunterzeichnung." },
  { id: "P038", name: "Mitarbeiter-Onboarding", category: "Personal", description: "Strukturierte Einarbeitung neuer Mitarbeiter in Aufgaben, Systeme und Kultur." },
  { id: "P039", name: "Urlaubsmanagement", category: "Personal", description: "Planung, Genehmigung und Dokumentation von Urlauben und Abwesenheiten." },
  { id: "P040", name: "Krankmeldungen", category: "Personal", description: "Erfassung, Weiterleitung und Verwaltung von Krankmeldungen." },
  { id: "P041", name: "Mitarbeiterkommunikation", category: "Personal", description: "Interne Kommunikation mit Mitarbeitern über Aufgaben, Änderungen und Updates." },
  { id: "P042", name: "Dokumentenmanagement", category: "Verwaltung", description: "Ablage, Verwaltung und Auffindbarkeit von Dokumenten und Dateien." },
  { id: "P043", name: "Vertragsmanagement", category: "Verwaltung", description: "Verwaltung, Kontrolle und Archivierung von Verträgen." },
  { id: "P044", name: "Rechnungsstellung", category: "Verwaltung", description: "Erstellung, Versand und Verwaltung von Ausgangsrechnungen." },
  { id: "P045", name: "Zahlungseingang & Mahnwesen", category: "Verwaltung", description: "Überwachung offener Posten, Zahlungseingänge und Mahnprozesse." },
  { id: "P046", name: "Freigabeprozesse", category: "Verwaltung", description: "Interne Freigabe- und Genehmigungsprozesse für Ausgaben, Angebote oder Aktionen." },
  { id: "P047", name: "Berichtswesen", category: "Verwaltung", description: "Regelmäßige Erstellung und Verteilung von Berichten und Kennzahlen." },
  { id: "P048", name: "Aufgabenmanagement", category: "Operations", description: "Planung, Zuweisung und Nachverfolgung von Aufgaben und To-Dos." },
  { id: "P049", name: "Projektmanagement", category: "Operations", description: "Steuerung von Projekten mit Meilensteinen, Aufgaben, Budget und Kommunikation." },
  { id: "P050", name: "Dienstplanung / Einsatzplanung", category: "Operations", description: "Erstellung und Verwaltung von Dienst- und Einsatzplänen für Mitarbeiter." },
];

const PROBLEMS = [
  { id: "PROB001", name: "Geschäftsführer-Flaschenhals", symptomPatterns: JSON.stringify(["alle Entscheidungen laufen über mich", "muss ich freigeben", "warte auf Freigabe", "nur ich entscheide"]), operativeProblem: "Alle wichtigen Entscheidungen und Freigaben laufen über die Geschäftsführung", rootCause: "Fehlende Entscheidungsstrukturen und Delegation", category: "leadership", severity: "HIGH" },
  { id: "PROB002", name: "Medienbrüche", symptomPatterns: JSON.stringify(["müssen wir manuell übertragen", "kopieren wir immer", "doppelte Eingabe", "zweimal eingeben"]), operativeProblem: "Informationen müssen zwischen Systemen manuell übertragen werden", rootCause: "Fehlende Systemintegration und Schnittstellenmanagement", category: "automation", severity: "HIGH" },
  { id: "PROB003", name: "Fehlende Nachverfolgung", symptomPatterns: JSON.stringify(["wir verlieren Kontakt", "keine Follow-ups", "vergessen nachzuhaken", "keine Wiedervorlagen"]), operativeProblem: "Angebote, Leads und offene Vorgänge werden nicht systematisch nachverfolgt", rootCause: "Fehlende CRM/Pipeline-Nutzung und strukturierte Follow-up-Prozesse", category: "sales", severity: "HIGH" },
  { id: "PROB004", name: "Wissensinseln", symptomPatterns: JSON.stringify(["das weiß nur", "wenn er fehlt geht nichts", "im Kopf", "nur einer kennt"]), operativeProblem: "Kritisches Wissen liegt bei einzelnen Personen ohne Dokumentation", rootCause: "Fehlende Wissenssicherung und Prozessdokumentation", category: "structure", severity: "HIGH" },
  { id: "PROB005", name: "Kommunikationschaos", symptomPatterns: JSON.stringify(["WhatsApp", "viele Kanäle", "geht unter", "wissen nicht", "chaotisch", "überall verteilt"]), operativeProblem: "Informationen sind über viele Kanäle verteilt und gehen verloren", rootCause: "Fehlende Kommunikationsstruktur und zentrale Informationsablage", category: "communication", severity: "MEDIUM" },
  { id: "PROB006", name: "Repetitive Handarbeit", symptomPatterns: JSON.stringify(["jeden Tag dasselbe", "immer wieder manuell", "wiederholen sich ständig", "copy paste", "täglich manuell"]), operativeProblem: "Wiederkehrende, regelbasierte Aufgaben werden manuell erledigt", rootCause: "Fehlende Automatisierung und Prozessstandarisierung", category: "automation", severity: "HIGH" },
  { id: "PROB007", name: "Fehlende Prozessdokumentation", symptomPatterns: JSON.stringify(["nicht dokumentiert", "mündlich", "keine SOPs", "jeder macht es anders", "nicht aufgeschrieben"]), operativeProblem: "Prozesse sind nicht dokumentiert und laufen uneinheitlich ab", rootCause: "Fehlende Standardisierung und Prozessdisziplin", category: "process", severity: "MEDIUM" },
  { id: "PROB008", name: "Excel-Abhängigkeit", symptomPatterns: JSON.stringify(["Excel", "Tabelle", "Spreadsheet", "alles in Excel", "Excel-Datei"]), operativeProblem: "Zentrale Unternehmensdaten sind in unverbundenen Excel-Tabellen", rootCause: "Fehlende Systemlandschaft und Digitalisierung", category: "automation", severity: "MEDIUM" },
  { id: "PROB009", name: "Keine Pipeline-Übersicht", symptomPatterns: JSON.stringify(["weiß nicht wo Angebote stehen", "keine Übersicht", "keine Pipeline", "verlieren Angebote", "kein CRM"]), operativeProblem: "Status von Angeboten, Leads und Projekten ist nicht zentral sichtbar", rootCause: "Fehlende CRM- oder Pipeline-Nutzung", category: "sales", severity: "HIGH" },
  { id: "PROB010", name: "Skalierungsblockade", symptomPatterns: JSON.stringify(["wenn wir wachsen geht das nicht", "funktioniert nur so lange wir klein sind", "bei mehr Kunden bricht es zusammen"]), operativeProblem: "Aktuelle Prozesse und Systeme sind nicht skalierbar", rootCause: "Fehlende Standardisierung und Systeminfrastruktur", category: "structure", severity: "CRITICAL" },
];

async function main() {
  console.log("🌱 Seeding OKUN Method Library...");

  // Seed Process Library
  for (const proc of PROCESSES) {
    await prisma.processLibraryItem.upsert({
      where: { id: proc.id },
      update: { name: proc.name, category: proc.category, description: proc.description },
      create: {
        id: proc.id,
        name: proc.name,
        category: proc.category,
        description: proc.description,
        isActive: true,
        isCustom: false,
      },
    });
  }
  console.log(`✅ ${PROCESSES.length} Prozesse in Library gespeichert`);

  // Seed Problem Library
  for (const prob of PROBLEMS) {
    await prisma.problemLibraryItem.upsert({
      where: { id: prob.id },
      update: { name: prob.name, operativeProblem: prob.operativeProblem, rootCause: prob.rootCause },
      create: {
        id: prob.id,
        name: prob.name,
        symptomPatterns: prob.symptomPatterns,
        operativeProblem: prob.operativeProblem,
        rootCause: prob.rootCause,
        category: prob.category,
        severity: prob.severity,
        isActive: true,
        isCustom: false,
      },
    });
  }
  console.log(`✅ ${PROBLEMS.length} Problemmuster in Library gespeichert`);
  console.log("✅ Library Seed abgeschlossen!");
}

main()
  .catch((e) => {
    console.error("❌ Library Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
