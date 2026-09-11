-- OKUN Closing Portal — Vertragsabschluss, Audit-Trail, Recording, Rechnungssystem
-- Generated: 2026-09-10
--
-- Hinweis: Das Deployment nutzt `prisma db push --accept-data-loss`. Diese Datei
-- dokumentiert die identische Änderung als nachvollziehbares SQL und ist
-- rückwärtskompatibel: alle neuen Spalten auf bestehenden Tabellen sind
-- NULL-bar oder besitzen einen Default. Es werden keine Spalten entfernt.

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "deactivatedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Company" ADD COLUMN     "activatedAt" TIMESTAMP(3),
ADD COLUMN     "billingCity" TEXT,
ADD COLUMN     "billingCountry" TEXT,
ADD COLUMN     "billingDiffers" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "billingEmail" TEXT,
ADD COLUMN     "billingHouseNumber" TEXT,
ADD COLUMN     "billingName" TEXT,
ADD COLUMN     "billingPostalCode" TEXT,
ADD COLUMN     "billingStreet" TEXT,
ADD COLUMN     "city" TEXT,
ADD COLUMN     "contactEmail" TEXT,
ADD COLUMN     "contactFirstName" TEXT,
ADD COLUMN     "contactLastName" TEXT,
ADD COLUMN     "contactPhone" TEXT,
ADD COLUMN     "contactPosition" TEXT,
ADD COLUMN     "country" TEXT,
ADD COLUMN     "houseNumber" TEXT,
ADD COLUMN     "legalForm" TEXT,
ADD COLUMN     "postalCode" TEXT,
ADD COLUMN     "registerCourt" TEXT,
ADD COLUMN     "registerNumber" TEXT,
ADD COLUMN     "street" TEXT,
ADD COLUMN     "taxNumber" TEXT,
ADD COLUMN     "vatId" TEXT;

-- AlterTable
ALTER TABLE "LegalDocument" ADD COLUMN     "contractDocumentId" TEXT,
ADD COLUMN     "fileName" TEXT,
ADD COLUMN     "fileSize" INTEGER,
ADD COLUMN     "packageScope" JSONB,
ADD COLUMN     "sha256" TEXT,
ADD COLUMN     "supersedesId" TEXT,
ADD COLUMN     "validFrom" TIMESTAMP(3),
ADD COLUMN     "validUntil" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "ClosingSession" ADD COLUMN     "activatedAt" TIMESTAMP(3),
ADD COLUMN     "consentsConfirmedAt" TIMESTAMP(3),
ADD COLUMN     "contractClosedAt" TIMESTAMP(3),
ADD COLUMN     "paymentMethod" TEXT,
ADD COLUMN     "recordingReleasedAt" TIMESTAMP(3),
ADD COLUMN     "statusReason" TEXT,
ADD COLUMN     "tokenIssuedAt" TIMESTAMP(3),
ADD COLUMN     "tokenRevokedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "OfferTemplate" ADD COLUMN     "careIncluded" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "minimumTermMonths" INTEGER,
ADD COLUMN     "paymentTerms" TEXT,
ADD COLUMN     "recurringInterval" TEXT,
ADD COLUMN     "recurringNetCents" INTEGER,
ADD COLUMN     "vatRateBp" INTEGER,
ADD COLUMN     "workforceIncluded" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Offer" ADD COLUMN     "careIncluded" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "minimumTermMonths" INTEGER,
ADD COLUMN     "offerNumber" TEXT,
ADD COLUMN     "packageType" TEXT,
ADD COLUMN     "paymentTerms" TEXT,
ADD COLUMN     "recurringInterval" TEXT,
ADD COLUMN     "recurringNetCents" INTEGER,
ADD COLUMN     "vatRateBp" INTEGER,
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "workforceIncluded" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "OfferLineItem" ADD COLUMN     "kind" TEXT NOT NULL DEFAULT 'one_time',
ADD COLUMN     "quantityMilli" INTEGER,
ADD COLUMN     "unit" TEXT,
ADD COLUMN     "vatRateBp" INTEGER;

-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN     "billingSnapshot" JSONB,
ADD COLUMN     "contractSnapshotId" TEXT,
ADD COLUMN     "customPlaceholders" JSONB,
ADD COLUMN     "documentId" TEXT,
ADD COLUMN     "finalizedAt" TIMESTAMP(3),
ADD COLUMN     "finalizedById" TEXT,
ADD COLUMN     "footerNote" TEXT,
ADD COLUMN     "grossTotalCents" INTEGER,
ADD COLUMN     "idempotencyKey" TEXT,
ADD COLUMN     "invoiceDate" TIMESTAMP(3),
ADD COLUMN     "netTotalCents" INTEGER,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "paymentTerms" TEXT,
ADD COLUMN     "pdfSha256" TEXT,
ADD COLUMN     "serviceDateFrom" TIMESTAMP(3),
ADD COLUMN     "serviceDateTo" TIMESTAMP(3),
ADD COLUMN     "servicePeriodText" TEXT,
ADD COLUMN     "templateId" TEXT,
ADD COLUMN     "templateVersion" INTEGER,
ADD COLUMN     "vatMode" TEXT NOT NULL DEFAULT 'standard',
ADD COLUMN     "vatRateBp" INTEGER,
ADD COLUMN     "vatTotalCents" INTEGER;

-- AlterTable
ALTER TABLE "InvoiceItem" ADD COLUMN     "discountBp" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "grossAmountCents" INTEGER,
ADD COLUMN     "netAmountCents" INTEGER,
ADD COLUMN     "quantityMilli" INTEGER,
ADD COLUMN     "sourceRef" TEXT,
ADD COLUMN     "unit" TEXT,
ADD COLUMN     "vatAmountCents" INTEGER,
ADD COLUMN     "vatRateBp" INTEGER;

-- AlterTable
ALTER TABLE "ContractSnapshot" ADD COLUMN     "careIncluded" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "contactPersonName" TEXT,
ADD COLUMN     "contactPersonPosition" TEXT,
ADD COLUMN     "contractDate" TIMESTAMP(3),
ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'EUR',
ADD COLUMN     "data" JSONB,
ADD COLUMN     "documentVersions" JSONB,
ADD COLUMN     "frozenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "idempotencyKey" TEXT,
ADD COLUMN     "masterData" JSONB,
ADD COLUMN     "minimumTermMonths" INTEGER,
ADD COLUMN     "offerNumber" TEXT,
ADD COLUMN     "oneTimeNetCents" INTEGER,
ADD COLUMN     "paymentMethod" TEXT,
ADD COLUMN     "paymentTerms" TEXT,
ADD COLUMN     "recurringInterval" TEXT,
ADD COLUMN     "recurringNetCents" INTEGER,
ADD COLUMN     "renderedScript" JSONB,
ADD COLUMN     "scriptRenderedAt" TIMESTAMP(3),
ADD COLUMN     "snapshotHash" TEXT,
ADD COLUMN     "vatRateBp" INTEGER,
ADD COLUMN     "workforceIncluded" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "ClosingEvent" ADD COLUMN     "idempotencyKey" TEXT;

-- CreateTable
CREATE TABLE "ContractDocument" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,

    CONSTRAINT "ContractDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsentDefinition" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "checkboxText" TEXT NOT NULL,
    "consentType" TEXT NOT NULL,
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "appliesTo" JSONB,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "contractDocumentId" TEXT,
    "documentVersionId" TEXT,
    "createdById" TEXT,

    CONSTRAINT "ConsentDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsentDefinitionRevision" (
    "id" TEXT NOT NULL,
    "definitionId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "checkboxText" TEXT NOT NULL,
    "consentType" TEXT NOT NULL,
    "isRequired" BOOLEAN NOT NULL,
    "appliesTo" JSONB,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConsentDefinitionRevision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsentAuditEvent" (
    "id" TEXT NOT NULL,
    "closingSessionId" TEXT NOT NULL,
    "contractSnapshotId" TEXT,
    "companyId" TEXT NOT NULL,
    "consentDefinitionId" TEXT,
    "consentDefinitionVersion" INTEGER NOT NULL DEFAULT 1,
    "consentType" TEXT NOT NULL,
    "checkboxText" TEXT NOT NULL,
    "accepted" BOOLEAN NOT NULL,
    "serverTimestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "timezone" TEXT NOT NULL,
    "documentId" TEXT,
    "documentVersionId" TEXT,
    "documentName" TEXT,
    "documentVersionLabel" TEXT,
    "documentSha256" TEXT,
    "organizationName" TEXT,
    "actingPersonName" TEXT,
    "actingPersonEmail" TEXT,
    "sessionTokenHash" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "supersedesEventId" TEXT,
    "correctionReason" TEXT,
    "idempotencyKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConsentAuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClosingScript" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "packageType" TEXT,
    "addonKey" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,

    CONSTRAINT "ClosingScript_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClosingScriptRevision" (
    "id" TEXT NOT NULL,
    "scriptId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClosingScriptRevision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClosingRecording" (
    "id" TEXT NOT NULL,
    "closingSessionId" TEXT NOT NULL,
    "contractSnapshotId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "dailyRecordingId" TEXT,
    "dailyRoomName" TEXT,
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "durationSeconds" INTEGER,
    "r2Key" TEXT,
    "fileSize" INTEGER,
    "sha256" TEXT,
    "mimeType" TEXT,
    "migrationAttempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "dailyDeleteAfter" TIMESTAMP(3),
    "dailyDeletedAt" TIMESTAMP(3),
    "retentionUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClosingRecording_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClosingCertificate" (
    "id" TEXT NOT NULL,
    "closingSessionId" TEXT NOT NULL,
    "contractSnapshotId" TEXT,
    "companyId" TEXT NOT NULL,
    "certificateNumber" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "r2Key" TEXT NOT NULL,
    "sha256" TEXT NOT NULL,
    "fileSize" INTEGER,
    "data" JSONB NOT NULL,
    "templateId" TEXT,
    "templateVersion" INTEGER,
    "supersedesId" TEXT,
    "documentId" TEXT,
    "generatedById" TEXT,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClosingCertificate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentTemplate" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "currentVersion" INTEGER NOT NULL DEFAULT 1,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DocumentTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentTemplateVersion" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "html" TEXT NOT NULL,
    "css" TEXT NOT NULL DEFAULT '',
    "settings" JSONB,
    "note" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentTemplateVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomPlaceholder" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'text',
    "defaultValue" TEXT,
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomPlaceholder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvoiceNumberSequence" (
    "id" TEXT NOT NULL,
    "scope" TEXT NOT NULL DEFAULT 'invoice',
    "prefix" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "lastNumber" INTEGER NOT NULL DEFAULT 0,
    "padding" INTEGER NOT NULL DEFAULT 4,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InvoiceNumberSequence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvoicePaymentEvent" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "previousStatus" TEXT NOT NULL,
    "newStatus" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "actorId" TEXT,
    "note" TEXT,
    "externalRef" TEXT,
    "amountCents" INTEGER,
    "idempotencyKey" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InvoicePaymentEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StripeWebhookEvent" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StripeWebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MasterDataRequirement" (
    "id" TEXT NOT NULL,
    "fieldKey" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "group" TEXT NOT NULL DEFAULT 'company',
    "helpText" TEXT,
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "legalForms" JSONB,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MasterDataRequirement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ConsentDefinition_key_key" ON "ConsentDefinition"("key");

-- CreateIndex
CREATE UNIQUE INDEX "ConsentDefinitionRevision_definitionId_version_key" ON "ConsentDefinitionRevision"("definitionId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "ConsentAuditEvent_idempotencyKey_key" ON "ConsentAuditEvent"("idempotencyKey");

-- CreateIndex
CREATE INDEX "ConsentAuditEvent_closingSessionId_idx" ON "ConsentAuditEvent"("closingSessionId");

-- CreateIndex
CREATE INDEX "ConsentAuditEvent_companyId_idx" ON "ConsentAuditEvent"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "ClosingScript_key_key" ON "ClosingScript"("key");

-- CreateIndex
CREATE UNIQUE INDEX "ClosingScriptRevision_scriptId_version_key" ON "ClosingScriptRevision"("scriptId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "ClosingRecording_dailyRecordingId_key" ON "ClosingRecording"("dailyRecordingId");

-- CreateIndex
CREATE INDEX "ClosingRecording_closingSessionId_idx" ON "ClosingRecording"("closingSessionId");

-- CreateIndex
CREATE INDEX "ClosingRecording_status_idx" ON "ClosingRecording"("status");

-- CreateIndex
CREATE UNIQUE INDEX "ClosingCertificate_certificateNumber_key" ON "ClosingCertificate"("certificateNumber");

-- CreateIndex
CREATE INDEX "ClosingCertificate_companyId_idx" ON "ClosingCertificate"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "ClosingCertificate_closingSessionId_version_key" ON "ClosingCertificate"("closingSessionId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentTemplateVersion_templateId_version_key" ON "DocumentTemplateVersion"("templateId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "CustomPlaceholder_templateId_key_key" ON "CustomPlaceholder"("templateId", "key");

-- CreateIndex
CREATE UNIQUE INDEX "InvoicePaymentEvent_idempotencyKey_key" ON "InvoicePaymentEvent"("idempotencyKey");

-- CreateIndex
CREATE INDEX "InvoicePaymentEvent_invoiceId_idx" ON "InvoicePaymentEvent"("invoiceId");

-- CreateIndex
CREATE UNIQUE INDEX "MasterDataRequirement_fieldKey_key" ON "MasterDataRequirement"("fieldKey");

-- CreateIndex
CREATE UNIQUE INDEX "Offer_offerNumber_key" ON "Offer"("offerNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_idempotencyKey_key" ON "Invoice"("idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "ContractSnapshot_idempotencyKey_key" ON "ContractSnapshot"("idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "ClosingEvent_idempotencyKey_key" ON "ClosingEvent"("idempotencyKey");

-- AddForeignKey
ALTER TABLE "LegalDocument" ADD CONSTRAINT "LegalDocument_contractDocumentId_fkey" FOREIGN KEY ("contractDocumentId") REFERENCES "ContractDocument"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractDocument" ADD CONSTRAINT "ContractDocument_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsentDefinition" ADD CONSTRAINT "ConsentDefinition_contractDocumentId_fkey" FOREIGN KEY ("contractDocumentId") REFERENCES "ContractDocument"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsentDefinition" ADD CONSTRAINT "ConsentDefinition_documentVersionId_fkey" FOREIGN KEY ("documentVersionId") REFERENCES "LegalDocument"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsentDefinition" ADD CONSTRAINT "ConsentDefinition_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsentDefinitionRevision" ADD CONSTRAINT "ConsentDefinitionRevision_definitionId_fkey" FOREIGN KEY ("definitionId") REFERENCES "ConsentDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsentAuditEvent" ADD CONSTRAINT "ConsentAuditEvent_closingSessionId_fkey" FOREIGN KEY ("closingSessionId") REFERENCES "ClosingSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsentAuditEvent" ADD CONSTRAINT "ConsentAuditEvent_contractSnapshotId_fkey" FOREIGN KEY ("contractSnapshotId") REFERENCES "ContractSnapshot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsentAuditEvent" ADD CONSTRAINT "ConsentAuditEvent_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsentAuditEvent" ADD CONSTRAINT "ConsentAuditEvent_consentDefinitionId_fkey" FOREIGN KEY ("consentDefinitionId") REFERENCES "ConsentDefinition"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsentAuditEvent" ADD CONSTRAINT "ConsentAuditEvent_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "ContractDocument"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsentAuditEvent" ADD CONSTRAINT "ConsentAuditEvent_documentVersionId_fkey" FOREIGN KEY ("documentVersionId") REFERENCES "LegalDocument"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClosingScript" ADD CONSTRAINT "ClosingScript_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClosingScriptRevision" ADD CONSTRAINT "ClosingScriptRevision_scriptId_fkey" FOREIGN KEY ("scriptId") REFERENCES "ClosingScript"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClosingRecording" ADD CONSTRAINT "ClosingRecording_closingSessionId_fkey" FOREIGN KEY ("closingSessionId") REFERENCES "ClosingSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClosingCertificate" ADD CONSTRAINT "ClosingCertificate_closingSessionId_fkey" FOREIGN KEY ("closingSessionId") REFERENCES "ClosingSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentTemplateVersion" ADD CONSTRAINT "DocumentTemplateVersion_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "DocumentTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomPlaceholder" ADD CONSTRAINT "CustomPlaceholder_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "DocumentTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoicePaymentEvent" ADD CONSTRAINT "InvoicePaymentEvent_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoicePaymentEvent" ADD CONSTRAINT "InvoicePaymentEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ─── Datenmigration: bestehende LegalDocument-Zeilen als Versionen einhängen ──
-- Für jeden bereits vorhandenen Dokumenttyp wird ein logisches ContractDocument
-- angelegt und die bestehenden Zeilen werden als dessen Versionen verknüpft.
-- Bestehende Dateien/Inhalte bleiben unangetastet.
INSERT INTO "ContractDocument" ("id", "type", "name", "isActive", "displayOrder", "createdAt", "updatedAt")
SELECT
  'cdoc_legacy_' || md5(ld."type"),
  ld."type",
  MIN(ld."title"),
  TRUE,
  MIN(ld."displayOrder"),
  MIN(ld."createdAt"),
  CURRENT_TIMESTAMP
FROM "LegalDocument" ld
GROUP BY ld."type"
ON CONFLICT ("id") DO NOTHING;

UPDATE "LegalDocument" ld
SET "contractDocumentId" = 'cdoc_legacy_' || md5(ld."type")
WHERE ld."contractDocumentId" IS NULL;

-- Hashes bestehender Versionen werden beim ersten Zugriff berechnet und
-- persistiert (siehe src/lib/documents/hash.ts → ensureVersionHash).

-- ─── Statusnormalisierung auf die Closing State Machine ──────────────────────
UPDATE "ClosingSession" SET "status" = 'closing_in_progress'  WHERE "status" = 'in_progress';
UPDATE "ClosingSession" SET "status" = 'consents_confirmed'   WHERE "status" = 'consent_given';
UPDATE "ClosingSession" SET "status" = 'lost'                 WHERE "status" = 'verloren';
UPDATE "ClosingSession" SET "status" = 'cancelled'            WHERE "status" IN ('storniert', 'abgesagt');

UPDATE "Company" SET "leadStatus" = 'closing_in_progress' WHERE "leadStatus" = 'in_progress';
UPDATE "Company" SET "leadStatus" = 'consents_confirmed'  WHERE "leadStatus" = 'consent_given';
UPDATE "Company" SET "leadStatus" = 'lost'                WHERE "leadStatus" = 'verloren';
UPDATE "Company" SET "leadStatus" = 'cancelled'           WHERE "leadStatus" IN ('storniert', 'abgesagt');
UPDATE "Company" SET "leadStatus" = 'lead'                WHERE "leadStatus" = 'prospect';

-- ─── Bestehende Rechnungsbeträge in die neuen Felder spiegeln ────────────────
UPDATE "Invoice"
SET "netTotalCents"   = COALESCE("netTotalCents", "netAmount"),
    "grossTotalCents" = COALESCE("grossTotalCents", "grossAmount"),
    "vatTotalCents"   = COALESCE("vatTotalCents", "grossAmount" - "netAmount"),
    "vatRateBp"       = COALESCE("vatRateBp", ROUND("taxRate" * 10000)::INT),
    "invoiceDate"     = COALESCE("invoiceDate", "createdAt")
WHERE "netTotalCents" IS NULL;

UPDATE "InvoiceItem"
SET "quantityMilli"    = COALESCE("quantityMilli", ROUND("quantity" * 1000)::INT),
    "netAmountCents"   = COALESCE("netAmountCents", "totalPrice")
WHERE "quantityMilli" IS NULL;
