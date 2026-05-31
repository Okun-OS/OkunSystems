// @ts-nocheck
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcryptjs from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Seeding database...");

  // Hash passwords
  const adminPassword = await bcryptjs.hash("admin123", 12);
  const clientPassword = await bcryptjs.hash("client123", 12);

  // -----------------------------------
  // Admin user
  // -----------------------------------
  const admin = await prisma.user.upsert({
    where: { email: "felix@okun-systems.de" },
    update: {},
    create: {
      email: "felix@okun-systems.de",
      name: "Felix Okun",
      password: adminPassword,
      role: "ADMIN",
      firstLogin: false,
    },
  });
  console.log("✅ Admin user created:", admin.email);

  // -----------------------------------
  // Company 1: Pflegezentrum Müller GmbH
  // -----------------------------------
  const company1 = await prisma.company.upsert({
    where: { id: "company-mueller-001" },
    update: {},
    create: {
      id: "company-mueller-001",
      name: "Pflegezentrum Müller GmbH",
      industry: "Ambulante Pflege",
      website: "www.pflege-mueller.de",
      phone: "+49 211 123456",
      address: "Musterstraße 12, 40213 Düsseldorf",
      status: "ACTIVE",
    },
  });

  const client1 = await prisma.user.upsert({
    where: { email: "mueller@pflege-mueller.de" },
    update: {},
    create: {
      email: "mueller@pflege-mueller.de",
      name: "Thomas Müller",
      password: clientPassword,
      role: "CLIENT",
      firstLogin: false,
      companyId: company1.id,
    },
  });
  console.log("✅ Client user created:", client1.email);

  // Project for company 1
  const project1 = await prisma.project.upsert({
    where: { id: "project-mueller-001" },
    update: {},
    create: {
      id: "project-mueller-001",
      title: "Digitalisierung Pflegeprozesse",
      description:
        "Analyse und Optimierung der digitalen Prozesse im ambulanten Pflegedienst",
      status: "IN_PROGRESS",
      phase: "OKUN FirstScan",
      progress: 35,
      startDate: new Date("2026-01-15"),
      companyId: company1.id,
    },
  });

  // Milestones for project 1 (delete existing first to avoid duplicates)
  await prisma.milestone.deleteMany({ where: { projectId: project1.id } });
  await prisma.milestone.createMany({
    data: [
      {
        id: "milestone-001",
        title: "Onboarding abgeschlossen",
        completed: true,
        completedAt: new Date("2026-01-20"),
        order: 1,
        projectId: project1.id,
      },
      {
        id: "milestone-002",
        title: "OKUN FirstScan gestartet",
        completed: true,
        completedAt: new Date("2026-02-01"),
        order: 2,
        projectId: project1.id,
      },
      {
        id: "milestone-003",
        title: "Analyse abgeschlossen",
        completed: false,
        dueDate: new Date("2026-06-15"),
        order: 3,
        projectId: project1.id,
      },
      {
        id: "milestone-004",
        title: "Strategiegespräch",
        completed: false,
        dueDate: new Date("2026-07-01"),
        order: 4,
        projectId: project1.id,
      },
    ],
  });

  // Tasks for project 1
  await prisma.task.deleteMany({ where: { projectId: project1.id } });
  await prisma.task.createMany({
    data: [
      {
        id: "task-001",
        title: "Fragebogen ausfüllen",
        description: "Bitte füllen Sie den Analysefragebogen vollständig aus.",
        status: "TODO",
        priority: "HIGH",
        isInternal: false,
        dueDate: new Date("2026-06-10"),
        projectId: project1.id,
      },
      {
        id: "task-002",
        title: "Unterlagen einreichen",
        description: "Reichen Sie bitte alle angeforderten Unterlagen ein.",
        status: "IN_PROGRESS",
        priority: "MEDIUM",
        isInternal: false,
        projectId: project1.id,
      },
      {
        id: "task-003",
        title: "Mitarbeiterstruktur dokumentieren",
        description: "Dokumentation der aktuellen Mitarbeiterstruktur.",
        status: "TODO",
        priority: "MEDIUM",
        isInternal: false,
        dueDate: new Date("2026-06-20"),
        projectId: project1.id,
      },
    ],
  });

  // Assessment for company 1
  const assessment1 = await prisma.assessment.upsert({
    where: { id: "assessment-001" },
    update: {},
    create: {
      id: "assessment-001",
      status: "IN_PROGRESS",
      score: 65,
      summary: "Erste Analyseergebnisse zeigen Optimierungspotenzial im Bereich Digitalisierung.",
      isPublished: false,
      startedAt: new Date("2026-02-01"),
      companyId: company1.id,
    },
  });

  // Recommendations
  await prisma.recommendation.deleteMany({ where: { assessmentId: assessment1.id } });
  await prisma.recommendation.createMany({
    data: [
      {
        id: "rec-001",
        title: "Digitale Dienstplanung einführen",
        description:
          "Implementierung einer modernen Dienstplanungssoftware zur Optimierung der Personalplanung.",
        category: "Digitalisierung",
        priority: 1,
        system: "Softgarden / Planiro",
        isPublished: true,
        assessmentId: assessment1.id,
      },
      {
        id: "rec-002",
        title: "Dokumentationsapp für Pflegekräfte",
        description:
          "Mobille App zur digitalen Pflegedokumentation direkt beim Kunden.",
        category: "Prozessoptimierung",
        priority: 2,
        system: "Medifox DAN / Snap",
        isPublished: true,
        assessmentId: assessment1.id,
      },
    ],
  });

  // Appointment for company 1
  await prisma.appointment.upsert({
    where: { id: "appointment-001" },
    update: {},
    create: {
      id: "appointment-001",
      title: "Strategiegespräch – Pflegezentrum Müller",
      type: "STRATEGY",
      description: "Besprechung der Analyseergebnisse und nächste Schritte.",
      startTime: new Date("2026-07-10T10:00:00Z"),
      endTime: new Date("2026-07-10T11:30:00Z"),
      location: "Online (Zoom)",
      meetingUrl: "https://zoom.us/j/123456789",
      status: "SCHEDULED",
      companyId: company1.id,
    },
  });

  // Document for company 1
  await prisma.document.upsert({
    where: { id: "doc-001" },
    update: {},
    create: {
      id: "doc-001",
      title: "Willkommensleitfaden",
      description: "Ihr Leitfaden für das OKUN Systems Onboarding.",
      category: "ONBOARDING",
      fileName: "willkommensleitfaden.pdf",
      isPublished: true,
      isInternal: false,
      version: "1.0",
      companyId: company1.id,
    },
  });

  // -----------------------------------
  // Company 2: TechVentureHub GmbH
  // -----------------------------------
  const company2 = await prisma.company.upsert({
    where: { id: "company-techventure-002" },
    update: {},
    create: {
      id: "company-techventure-002",
      name: "TechVentureHub GmbH",
      industry: "IT & Software",
      website: "www.techventurehub.de",
      phone: "+49 30 987654",
      address: "Innovationsweg 5, 10115 Berlin",
      status: "ONBOARDING",
    },
  });

  const client2 = await prisma.user.upsert({
    where: { email: "schmidt@techventurehub.de" },
    update: {},
    create: {
      email: "schmidt@techventurehub.de",
      name: "Sarah Schmidt",
      password: clientPassword,
      role: "CLIENT",
      firstLogin: true,
      companyId: company2.id,
    },
  });
  console.log("✅ Client user created:", client2.email);

  // Project for company 2
  const project2 = await prisma.project.upsert({
    where: { id: "project-techventure-001" },
    update: {},
    create: {
      id: "project-techventure-001",
      title: "Systemoptimierung & Skalierung",
      description: "Analyse der bestehenden IT-Infrastruktur und Wachstumsstrategie.",
      status: "PLANNING",
      phase: "Onboarding",
      progress: 15,
      startDate: new Date("2026-05-01"),
      companyId: company2.id,
    },
  });

  // Assessment for company 2
  await prisma.assessment.upsert({
    where: { id: "assessment-002" },
    update: {},
    create: {
      id: "assessment-002",
      status: "PENDING",
      score: null,
      isPublished: false,
      companyId: company2.id,
    },
  });

  // Retainer for company 1
  const retainer1 = await prisma.retainer.upsert({
    where: { id: "retainer-001" },
    update: {},
    create: {
      id: "retainer-001",
      name: "OKUN Betreuungspaket Premium",
      type: "PREMIUM",
      status: "ACTIVE",
      startDate: new Date("2026-03-01"),
      hoursPerMonth: 10,
      usedHours: 3,
      description: "Premium Betreuungspaket mit 10 Stunden im Monat.",
      companyId: company1.id,
    },
  });

  // Retainer ticket
  await prisma.retainerTicket.upsert({
    where: { id: "ticket-001" },
    update: {},
    create: {
      id: "ticket-001",
      title: "Anpassung Dienstplan-Vorlage",
      description: "Bitte passen Sie die Dienstplanvorlage an unsere 3-Schicht-Struktur an.",
      status: "OPEN",
      priority: "MEDIUM",
      type: "CHANGE_REQUEST",
      retainerId: retainer1.id,
      createdById: client1.id,
    },
  });

  // Note
  await prisma.note.upsert({
    where: { id: "note-001" },
    update: {},
    create: {
      id: "note-001",
      content:
        "Erster Kontakt sehr positiv. Kunde hat großes Interesse an Digitalisierung. Besondere Herausforderung: 28 Mitarbeiter, viele davon nicht technikaffin.",
      isInternal: true,
      companyId: company1.id,
      authorId: admin.id,
    },
  });

  // Assessment questions
  await prisma.assessmentQuestion.deleteMany({
    where: { id: { in: ["q-001", "q-002", "q-003", "q-004", "q-005"] } },
  });
  await prisma.assessmentQuestion.createMany({
    data: [
      {
        id: "q-001",
        text: "Wie würden Sie den aktuellen Digitalisierungsgrad Ihres Unternehmens einschätzen?",
        category: "Digitalisierung",
        type: "SCALE",
        weight: 3,
        order: 1,
        isActive: true,
      },
      {
        id: "q-002",
        text: "Welche Softwarelösungen setzen Sie aktuell ein?",
        category: "Digitalisierung",
        type: "TEXT",
        weight: 2,
        order: 2,
        isActive: true,
      },
      {
        id: "q-003",
        text: "Wie zufrieden sind Sie mit Ihrer aktuellen Dienstplanung?",
        category: "Prozesse",
        type: "SCALE",
        weight: 2,
        order: 3,
        isActive: true,
      },
      {
        id: "q-004",
        text: "Wie viele Mitarbeiter hat Ihr Unternehmen aktuell?",
        category: "Unternehmen",
        type: "TEXT",
        weight: 1,
        order: 4,
        isActive: true,
      },
      {
        id: "q-005",
        text: "Was ist Ihre größte operative Herausforderung?",
        category: "Herausforderungen",
        type: "TEXT",
        weight: 3,
        order: 5,
        isActive: true,
      },
    ],
  });

  console.log("✅ Seed completed successfully!");
  console.log("\n📋 Test accounts:");
  console.log("  Admin:  felix@okun-systems.de / admin123");
  console.log("  Client: mueller@pflege-mueller.de / client123");
  console.log("  Client: schmidt@techventurehub.de / client123");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
