// @ts-nocheck
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const QUESTIONS = [
  // ── PROFIL Phase ──────────────────────────────────────────────────────────
  {
    externalId: "Q1",
    area: "unternehmensstruktur",
    phase: "PROFIL",
    order: 1,
    isRequired: true,
    intent: "Grundprofil des Unternehmens erfassen: Branche, Leistungen, Zielkunden",
    questionDe:
      "Beschreiben Sie bitte kurz, was Ihr Unternehmen macht – welche Leistungen oder Produkte bieten Sie an, und wer sind Ihre Hauptkunden?",
    questionEn:
      "Please briefly describe what your company does – what services or products do you offer, and who are your main customers?",
    followUpTriggers: JSON.stringify(["verschiedene Branchen", "mehrere Bereiche", "sehr divers"]),
    scoringCategory: "struktur",
    scoringSignal: "POSITIVE",
    maxFollowUps: 1,
  },
  {
    externalId: "Q2",
    area: "unternehmensstruktur",
    phase: "PROFIL",
    order: 2,
    isRequired: true,
    intent: "Teamgröße und Standorte erfassen für Skalierbarkeits- und Komplexitätsbewertung",
    questionDe:
      "Wie viele Mitarbeiter hat Ihr Unternehmen aktuell, und an wie vielen Standorten sind Sie tätig?",
    questionEn:
      "How many employees does your company currently have, and how many locations do you operate from?",
    followUpTriggers: JSON.stringify(["wachsen", "planen einzustellen", "stark gewachsen"]),
    scoringCategory: "struktur",
    scoringSignal: "NEUTRAL",
    maxFollowUps: 1,
  },
  {
    externalId: "Q3",
    area: "unternehmensstruktur",
    phase: "PROFIL",
    order: 3,
    isRequired: true,
    intent: "Kernleistungen und Umsatztreiber identifizieren",
    questionDe:
      "Welche zwei oder drei Leistungen machen den größten Teil Ihres Umsatzes aus?",
    questionEn:
      "Which two or three services make up the largest portion of your revenue?",
    followUpTriggers: JSON.stringify([]),
    scoringCategory: "struktur",
    scoringSignal: "POSITIVE",
    maxFollowUps: 1,
  },
  {
    externalId: "Q4",
    area: "unternehmensstruktur",
    phase: "PROFIL",
    order: 4,
    isRequired: true,
    intent: "Rollenstruktur und Verantwortlichkeiten erfassen: Gibt es klare Zuständigkeiten?",
    questionDe:
      "Welche Positionen oder Rollen gibt es in Ihrem Unternehmen, und wer trägt jeweils welche Hauptverantwortung?",
    questionEn:
      "What positions or roles exist in your company, and who holds which main responsibility?",
    followUpTriggers: JSON.stringify(["unklar", "überschneidungen", "manchmal ich", "oft ich"]),
    scoringCategory: "struktur",
    scoringSignal: "POSITIVE",
    maxFollowUps: 2,
  },
  // ── PROZESSE Phase ────────────────────────────────────────────────────────
  {
    externalId: "Q5",
    area: "vertrieb",
    phase: "PROZESSE",
    order: 5,
    isRequired: true,
    intent: "Vertriebsprozess end-to-end verstehen: Von Anfrage bis Auftrag",
    questionDe:
      "Wenn eine neue Anfrage oder ein Interesse an Ihren Leistungen eingeht – was passiert dann Schritt für Schritt, bis daraus ein Auftrag oder Vertrag wird?",
    questionEn:
      "When a new inquiry or interest in your services comes in – what happens step by step until it becomes an order or contract?",
    followUpTriggers: JSON.stringify(["unklar", "unterschiedlich", "manchmal", "eigentlich", "meistens so"]),
    scoringCategory: "vertrieb",
    scoringSignal: "POSITIVE",
    maxFollowUps: 2,
  },
  {
    externalId: "Q6",
    area: "prozesse",
    phase: "PROZESSE",
    order: 6,
    isRequired: true,
    intent: "Größten Schmerzpunkt identifizieren: Was kostet am meisten Zeit oder läuft am häufigsten schief?",
    questionDe:
      "Welcher Prozess oder welche Aufgabe in Ihrem Unternehmen läuft am häufigsten schief, kostet am meisten Zeit oder frustriert Ihr Team am meisten?",
    questionEn:
      "Which process or task in your company goes wrong most often, costs the most time, or frustrates your team the most?",
    followUpTriggers: JSON.stringify(["nichts wirklich", "eigentlich alles gut", "weiß nicht genau"]),
    scoringCategory: "prozesse",
    scoringSignal: "NEGATIVE",
    maxFollowUps: 2,
  },
  {
    externalId: "Q7",
    area: "geschaeftsfuehrung",
    phase: "PROZESSE",
    order: 7,
    isRequired: true,
    intent: "Geschäftsführer-Flaschenhals erkennen: Welche Aufgaben blockieren die Führungskraft?",
    questionDe:
      "Welche Aufgaben landen immer wieder auf Ihrem Tisch, die theoretisch jemand anderes in Ihrem Team übernehmen könnte?",
    questionEn:
      "Which tasks keep landing on your plate that could theoretically be handled by someone else on your team?",
    followUpTriggers: JSON.stringify(["alle freigaben", "alles läuft über mich", "ohne mich geht nichts"]),
    scoringCategory: "geschaeftsfuehrung",
    scoringSignal: "NEGATIVE",
    maxFollowUps: 2,
  },
  // ── TIEFE Phase ───────────────────────────────────────────────────────────
  {
    externalId: "Q8",
    area: "prozesse",
    phase: "TIEFE",
    order: 8,
    isRequired: true,
    intent: "Auslöser des Hauptprozesses identifizieren",
    questionDe:
      "Was genau löst diesen Prozess aus – wann beginnt er, und was ist das Signal, dass er starten soll?",
    questionEn:
      "What exactly triggers this process – when does it begin, and what is the signal that it should start?",
    followUpTriggers: JSON.stringify(["manchmal", "wenn ich daran denke", "nach bedarf", "spontan"]),
    scoringCategory: "prozesse",
    scoringSignal: "POSITIVE",
    maxFollowUps: 1,
  },
  {
    externalId: "Q9",
    area: "prozesse",
    phase: "TIEFE",
    order: 9,
    isRequired: true,
    intent: "Rollen im Prozess kartieren: Wer macht was?",
    questionDe:
      "Wer ist an diesem Prozess beteiligt – welche Personen oder Rollen, und was tut jede von ihnen konkret?",
    questionEn:
      "Who is involved in this process – which people or roles, and what does each of them specifically do?",
    followUpTriggers: JSON.stringify(["hauptsächlich ich", "ich alleine", "meistens ich"]),
    scoringCategory: "prozesse",
    scoringSignal: "POSITIVE",
    maxFollowUps: 1,
  },
  {
    externalId: "Q10",
    area: "prozesse",
    phase: "TIEFE",
    order: 10,
    isRequired: true,
    intent: "Übergabepunkte identifizieren: Wo entstehen Reibungspunkte?",
    questionDe:
      "Wo im Prozess wird etwas von einer Person zur nächsten übergeben – und wie läuft diese Übergabe konkret ab?",
    questionEn:
      "Where in the process is something handed from one person to the next – and how exactly does this handoff work?",
    followUpTriggers: JSON.stringify(["mündlich", "kurz sagen", "per whatsapp", "man weiß es"]),
    scoringCategory: "prozesse",
    scoringSignal: "POSITIVE",
    maxFollowUps: 1,
  },
  {
    externalId: "Q11",
    area: "prozesse",
    phase: "TIEFE",
    order: 11,
    isRequired: true,
    intent: "Fehlerquellen und Ausnahmen identifizieren",
    questionDe:
      "Was passiert, wenn in diesem Prozess etwas schief läuft – was sind die häufigsten Probleme oder Ausnahmen?",
    questionEn:
      "What happens when something goes wrong in this process – what are the most common problems or exceptions?",
    followUpTriggers: JSON.stringify([]),
    scoringCategory: "prozesse",
    scoringSignal: "NEGATIVE",
    maxFollowUps: 1,
  },
  {
    externalId: "Q12",
    area: "prozesse",
    phase: "TIEFE",
    order: 12,
    isRequired: false,
    intent: "Dokumentationsgrad prüfen: Ist der Prozess schriftlich festgehalten?",
    questionDe:
      "Wie ist dieser Prozess dokumentiert – gibt es eine Beschreibung, Checkliste oder Vorlage, oder läuft er über mündliche Absprachen?",
    questionEn:
      "How is this process documented – is there a description, checklist, or template, or does it run on verbal agreements?",
    followUpTriggers: JSON.stringify(["nicht wirklich", "nein", "mündlich", "im kopf"]),
    scoringCategory: "prozesse",
    scoringSignal: "POSITIVE",
    maxFollowUps: 0,
  },
  // ── SYSTEME Phase ─────────────────────────────────────────────────────────
  {
    externalId: "Q13",
    area: "systeme",
    phase: "SYSTEME",
    order: 13,
    isRequired: true,
    intent: "Systemlandschaft erfassen: Welche Software wird aktiv genutzt?",
    questionDe:
      "Welche Software oder Tools nutzen Sie und Ihr Team aktiv im Tagesgeschäft – und wofür werden sie jeweils eingesetzt?",
    questionEn:
      "Which software or tools do you and your team actively use in daily operations – and what is each used for?",
    followUpTriggers: JSON.stringify(["nur excel", "kein crm", "hauptsächlich papier", "wenig digital"]),
    scoringCategory: "automatisierung",
    scoringSignal: "POSITIVE",
    maxFollowUps: 1,
  },
  {
    externalId: "Q14",
    area: "kommunikation",
    phase: "SYSTEME",
    order: 14,
    isRequired: true,
    intent: "Interne Kommunikation und Informationsflüsse verstehen",
    questionDe:
      "Wie läuft interne Kommunikation in Ihrem Unternehmen ab – über welche Kanäle, und wie stellen Sie sicher, dass wichtige Informationen alle erreichen?",
    questionEn:
      "How does internal communication work in your company – through which channels, and how do you ensure important information reaches everyone?",
    followUpTriggers: JSON.stringify(["whatsapp", "viele kanäle", "geht manchmal unter"]),
    scoringCategory: "kommunikation",
    scoringSignal: "POSITIVE",
    maxFollowUps: 1,
  },
  {
    externalId: "Q15",
    area: "systeme",
    phase: "SYSTEME",
    order: 15,
    isRequired: true,
    intent: "Wissensinseln und Medienbrüche erkennen",
    questionDe:
      "Was wird in Ihrem Unternehmen schriftlich festgehalten, und was läuft über mündliche Absprachen oder existiert nur im Kopf einzelner Personen?",
    questionEn:
      "What is written down in your company, and what runs on verbal agreements or exists only in certain people's heads?",
    followUpTriggers: JSON.stringify(["das weiß nur", "wenn er fehlt", "im kopf von"]),
    scoringCategory: "struktur",
    scoringSignal: "NEGATIVE",
    maxFollowUps: 1,
  },
  // ── GESCHAEFTSFUEHRUNG Phase ───────────────────────────────────────────────
  {
    externalId: "Q16",
    area: "geschaeftsfuehrung",
    phase: "GESCHAEFTSFUEHRUNG",
    order: 16,
    isRequired: true,
    intent: "GF-Abhängigkeit messen: Was funktioniert nicht ohne die Führungskraft?",
    questionDe:
      "Was passiert in Ihrem Unternehmen, wenn Sie als Geschäftsführung für zwei Wochen nicht erreichbar wären – welche Bereiche könnten unabhängig weiterlaufen, und wo würde es stocken?",
    questionEn:
      "What happens in your company if you as management were unreachable for two weeks – which areas could continue independently, and where would things slow down?",
    followUpTriggers: JSON.stringify(["nichts", "alles steht", "würde chaos", "nicht möglich"]),
    scoringCategory: "geschaeftsfuehrung",
    scoringSignal: "NEGATIVE",
    maxFollowUps: 2,
  },
  {
    externalId: "Q17",
    area: "geschaeftsfuehrung",
    phase: "GESCHAEFTSFUEHRUNG",
    order: 17,
    isRequired: true,
    intent: "Entscheidungsstruktur analysieren: Was wird nicht delegiert?",
    questionDe:
      "Welche Entscheidungen treffen Sie täglich oder wöchentlich, die theoretisch jemand anderes in Ihrem Team treffen könnte?",
    questionEn:
      "Which decisions do you make daily or weekly that could theoretically be made by someone else on your team?",
    followUpTriggers: JSON.stringify(["alle", "fast alles", "muss ich selbst entscheiden"]),
    scoringCategory: "geschaeftsfuehrung",
    scoringSignal: "NEGATIVE",
    maxFollowUps: 1,
  },
  // ── OKUN SYSTEME (Dienstplanung / Zeiterfassung / Lohnabrechnung) ─────────
  {
    externalId: "Q19",
    area: "systeme",
    phase: "SYSTEME",
    order: 19,
    isRequired: true,
    intent: "Dienstplanung erfassen: Wie wird der Dienstplan erstellt? Manuell, Excel, Software?",
    questionDe:
      "Wie erstellen Sie aktuell Ihre Dienstpläne oder Schichtpläne – nutzen Sie dafür spezielle Software, Excel oder läuft das noch manuell?",
    questionEn:
      "How do you currently create your duty rosters or shift plans – do you use specific software, Excel, or is it still manual?",
    followUpTriggers: JSON.stringify(["excel", "papier", "manuell", "per hand", "handschriftlich"]),
    scoringCategory: "automatisierung",
    scoringSignal: "POSITIVE",
    maxFollowUps: 1,
  },
  {
    externalId: "Q20",
    area: "systeme",
    phase: "SYSTEME",
    order: 20,
    isRequired: true,
    intent: "Zeiterfassung und Lohnabrechnung verstehen: digital oder manuell?",
    questionDe:
      "Wie erfassen Ihre Mitarbeiter ihre Arbeitszeiten – digital per App, über ein Stechuhrsystem oder auf Papier? Und wie läuft die Lohnabrechnung ab – intern mit Software oder extern über einen Steuerberater?",
    questionEn:
      "How do your employees record their working hours – digitally via app, through a time-clock system, or on paper? And how is payroll handled – internally with software or externally through an accountant?",
    followUpTriggers: JSON.stringify(["papier", "excel", "steuerberater", "extern", "manuell"]),
    scoringCategory: "automatisierung",
    scoringSignal: "POSITIVE",
    maxFollowUps: 1,
  },
  {
    externalId: "Q21",
    area: "systeme",
    phase: "SYSTEME",
    order: 21,
    isRequired: true,
    intent: "Einsatzplanung für Mitarbeiter im Feld verstehen: Wie wird koordiniert wer wann wo ist?",
    questionDe:
      "Wie koordinieren Sie die Einsätze Ihrer Mitarbeiter – also wer geht wann zu welchem Kunden oder Einsatzort? Gibt es da ein System, oder läuft das über Telefon und WhatsApp?",
    questionEn:
      "How do you coordinate your employees' assignments – who goes when to which client or location? Is there a system for that, or does it happen via phone and WhatsApp?",
    followUpTriggers: JSON.stringify(["whatsapp", "telefon", "zettel", "manuell", "per nachricht"]),
    scoringCategory: "automatisierung",
    scoringSignal: "POSITIVE",
    maxFollowUps: 1,
  },
  // ── ABSCHLUSS ─────────────────────────────────────────────────────────────
  {
    externalId: "Q18",
    area: "prozesse",
    phase: "ABSCHLUSS",
    order: 18,
    isRequired: false,
    intent: "Offene Themen auffangen: Was wurde noch nicht angesprochen?",
    questionDe:
      "Gibt es etwas Wichtiges in Ihrem Unternehmen – Prozesse, Herausforderungen oder Themen – die wir noch nicht angesprochen haben, das für die Analyse relevant wäre?",
    questionEn:
      "Is there anything important in your company – processes, challenges, or topics – that we haven't covered yet that would be relevant for the analysis?",
    followUpTriggers: JSON.stringify([]),
    scoringCategory: null,
    scoringSignal: "NEUTRAL",
    maxFollowUps: 1,
  },
];

async function main() {
  console.log("🌱 Seeding OKUN Question Bank...");

  for (const q of QUESTIONS) {
    await prisma.questionTemplate.upsert({
      where: { externalId: q.externalId },
      update: {
        area: q.area,
        phase: q.phase,
        order: q.order,
        isRequired: q.isRequired,
        intent: q.intent,
        questionDe: q.questionDe,
        questionEn: q.questionEn,
        followUpTriggers: q.followUpTriggers,
        scoringCategory: q.scoringCategory ?? undefined,
        scoringSignal: q.scoringSignal ?? undefined,
        maxFollowUps: q.maxFollowUps,
        isActive: true,
      },
      create: {
        externalId: q.externalId,
        area: q.area,
        phase: q.phase,
        order: q.order,
        isRequired: q.isRequired,
        intent: q.intent,
        questionDe: q.questionDe,
        questionEn: q.questionEn,
        followUpTriggers: q.followUpTriggers,
        scoringCategory: q.scoringCategory ?? undefined,
        scoringSignal: q.scoringSignal ?? undefined,
        maxFollowUps: q.maxFollowUps,
        isActive: true,
      },
    });
  }

  console.log(`✅ ${QUESTIONS.length} Fragen in der Question Bank gespeichert`);
  console.log("✅ Question Bank Seed abgeschlossen!");
}

main()
  .catch((e) => {
    console.error("❌ Question Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
