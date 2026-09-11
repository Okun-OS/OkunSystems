// @ts-nocheck
/**
 * Bootstrap & Backfill für das OKUN Closing Portal.
 *
 * Läuft beim Deploy nach `prisma db push` und ist vollständig idempotent.
 * Es werden ausschließlich technische Strukturen angelegt:
 *   • Katalog der für den Vertragsabschluss nötigen Stammdaten
 *   • Standard-Dokumentvorlagen im OKUN-Briefbogendesign (nur Layout)
 *   • Verknüpfung bestehender Rechtsdokumente mit der Versionierung
 *   • Normalisierung alter Statuswerte auf die Closing State Machine
 *
 * Ausdrücklich NICHT angelegt werden AGB, AVV, Einwilligungstexte,
 * Widerrufsbelehrungen oder Closing-Scripts — diese Inhalte hinterlegt OKUN
 * administrativ.
 */
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
// Nur importlose Module laden: kein @/-Alias, keine Datenbankschicht —
// damit der Bootstrap unter `npx tsx` genauso läuft wie die übrigen Seeds.
import { MASTER_DATA_FIELDS } from "../src/lib/closing/master-data-catalog";
import { DEFAULT_TEMPLATES } from "../src/lib/documents/default-templates";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function seedMasterDataRequirements() {
  let created = 0;
  for (const [index, field] of MASTER_DATA_FIELDS.entries()) {
    const existing = await prisma.masterDataRequirement.findUnique({
      where: { fieldKey: field.key },
    });
    if (existing) continue;
    await prisma.masterDataRequirement.create({
      data: {
        fieldKey: field.key,
        label: field.label,
        group: field.group,
        helpText: field.helpText ?? null,
        isRequired: field.defaultRequired,
        legalForms: field.defaultLegalForms.length > 0 ? field.defaultLegalForms : null,
        displayOrder: index,
        isActive: true,
      },
    });
    created++;
  }
  if (created > 0) console.log(`  ✅ ${created} Stammdaten-Pflichtfelder angelegt`);
}

const SHIPPED_NOTE = "Auslieferungsstand";

async function seedDocumentTemplates() {
  for (const template of DEFAULT_TEMPLATES) {
    const existing = await prisma.documentTemplate.findFirst({
      where: { type: template.type },
      include: { versions: true },
    });

    if (existing) {
      // Unveränderte Auslieferungsvorlagen dürfen nachgezogen werden.
      // Sobald der Admin eine eigene Version angelegt hat, wird nichts
      // überschrieben — seine Fassung bleibt maßgeblich.
      const untouched =
        existing.versions.length === 1 && existing.versions[0].note === SHIPPED_NOTE;
      if (!untouched) continue;

      const shipped = existing.versions[0];
      if (shipped.html === template.html && shipped.css === template.css) continue;

      const nextVersion = existing.currentVersion + 1;
      await prisma.documentTemplateVersion.create({
        data: {
          templateId: existing.id,
          version: nextVersion,
          html: template.html,
          css: template.css,
          note: SHIPPED_NOTE,
        },
      });
      await prisma.documentTemplate.update({
        where: { id: existing.id },
        data: { currentVersion: nextVersion },
      });
      // Die alte Version bleibt erhalten; bereits erzeugte Dokumente
      // verweisen weiterhin auf ihre Version.
      await prisma.documentTemplateVersion.updateMany({
        where: { templateId: existing.id, version: shipped.version },
        data: { note: `${SHIPPED_NOTE} (abgelöst)` },
      });
      console.log(`  ✅ Dokumentvorlage aktualisiert: ${template.name} → v${nextVersion}`);
      continue;
    }
    const created = await prisma.documentTemplate.create({
      data: {
        type: template.type,
        name: template.name,
        description: template.description,
        isActive: true,
        isDefault: true,
        currentVersion: 1,
      },
    });
    await prisma.documentTemplateVersion.create({
      data: {
        templateId: created.id,
        version: 1,
        html: template.html,
        css: template.css,
        note: SHIPPED_NOTE,
      },
    });
    console.log(`  ✅ Dokumentvorlage angelegt: ${template.name}`);
  }
}

/** Bestehende LegalDocument-Zeilen als Versionen eines ContractDocument einhängen. */
async function backfillContractDocuments() {
  const orphans = await prisma.legalDocument.findMany({
    where: { contractDocumentId: null },
    orderBy: { createdAt: "asc" },
  });
  if (orphans.length === 0) return;

  const byType = new Map<string, typeof orphans>();
  for (const doc of orphans) {
    const list = byType.get(doc.type) ?? [];
    list.push(doc);
    byType.set(doc.type, list);
  }

  for (const [type, docs] of byType) {
    let parent = await prisma.contractDocument.findFirst({ where: { type } });
    if (!parent) {
      parent = await prisma.contractDocument.create({
        data: {
          type,
          name: docs[0].title,
          description: docs[0].description ?? null,
          isActive: true,
          displayOrder: docs[0].displayOrder,
          createdById: docs[0].createdById,
        },
      });
    }
    await prisma.legalDocument.updateMany({
      where: { id: { in: docs.map((d) => d.id) } },
      data: { contractDocumentId: parent.id },
    });
    console.log(`  ✅ ${docs.length} Dokumentversion(en) für „${parent.name}" verknüpft`);
  }
}

/** Alte Statusbezeichnungen auf die Closing State Machine normalisieren. */
async function normalizeStatuses() {
  const sessionMap: Record<string, string> = {
    in_progress: "closing_in_progress",
    consent_given: "consents_confirmed",
    verloren: "lost",
    storniert: "cancelled",
    abgesagt: "cancelled",
  };
  for (const [from, to] of Object.entries(sessionMap)) {
    const result = await prisma.closingSession.updateMany({
      where: { status: from },
      data: { status: to },
    });
    if (result.count > 0) console.log(`  ✅ ${result.count} Closing Session(s): ${from} → ${to}`);
  }

  const companyMap: Record<string, string> = { ...sessionMap, prospect: "lead" };
  for (const [from, to] of Object.entries(companyMap)) {
    const result = await prisma.company.updateMany({
      where: { leadStatus: from },
      data: { leadStatus: to },
    });
    if (result.count > 0) console.log(`  ✅ ${result.count} Lead(s): ${from} → ${to}`);
  }
}

/** Bestehende Rechnungsbeträge in die neuen Minor-Unit-Felder spiegeln. */
async function backfillInvoiceAmounts() {
  const invoices = await prisma.invoice.findMany({
    where: { netTotalCents: null },
    include: { items: true },
  });
  for (const invoice of invoices) {
    await prisma.invoice.update({
      where: { id: invoice.id },
      data: {
        netTotalCents: invoice.netAmount,
        grossTotalCents: invoice.grossAmount,
        vatTotalCents: invoice.grossAmount - invoice.netAmount,
        vatRateBp: Math.round(invoice.taxRate * 10000),
        invoiceDate: invoice.invoiceDate ?? invoice.createdAt,
      },
    });
    for (const item of invoice.items) {
      if (item.quantityMilli !== null) continue;
      await prisma.invoiceItem.update({
        where: { id: item.id },
        data: {
          quantityMilli: Math.round(item.quantity * 1000),
          netAmountCents: item.totalPrice,
        },
      });
    }
  }
  if (invoices.length > 0) console.log(`  ✅ ${invoices.length} Rechnung(en) auf Minor Units gespiegelt`);
}

async function main() {
  console.log("🔒 Closing Portal — Bootstrap");
  await seedMasterDataRequirements();
  await seedDocumentTemplates();
  await backfillContractDocuments();
  await normalizeStatuses();
  await backfillInvoiceAmounts();
  console.log("✅ Closing Portal bereit");
}

main()
  .catch((err) => {
    // Bewusst kein Fehlercode: der Bootstrap ist idempotent und läuft beim
    // nächsten Deploy erneut. Er darf den Start der Anwendung nicht verhindern.
    console.error("❌ Closing-Portal-Bootstrap fehlgeschlagen:", err);
    console.error("   Die Anwendung startet trotzdem. Bitte dieses Log prüfen.");
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
