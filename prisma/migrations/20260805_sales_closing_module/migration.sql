-- Sales & Closing Module — Full Schema Migration
-- Generated: 2026-08-05

-- AlterTable Company: add Pre-Sale fields
ALTER TABLE "Company"
  ADD COLUMN "leadStatus"       TEXT,
  ADD COLUMN "leadSource"       TEXT,
  ADD COLUMN "contractValue"    INTEGER,
  ADD COLUMN "contractPackage"  TEXT,
  ADD COLUMN "paymentMethod"    TEXT,
  ADD COLUMN "convertedAt"      TIMESTAMP(3),
  ADD COLUMN "closingNotes"     TEXT,
  ADD COLUMN "assignedCloserId" TEXT;

ALTER TABLE "Company"
  ADD CONSTRAINT "Company_assignedCloserId_fkey"
  FOREIGN KEY ("assignedCloserId") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable SystemSetting: add label and group
ALTER TABLE "SystemSetting"
  ADD COLUMN "label" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "group" TEXT NOT NULL DEFAULT 'general';

-- CreateTable LegalDocument
CREATE TABLE "LegalDocument" (
    "id"            TEXT NOT NULL,
    "type"          TEXT NOT NULL,
    "title"         TEXT NOT NULL,
    "version"       TEXT NOT NULL,
    "description"   TEXT,
    "r2Key"         TEXT NOT NULL,
    "mimeType"      TEXT NOT NULL DEFAULT 'application/pdf',
    "isActive"      BOOLEAN NOT NULL DEFAULT false,
    "isRequired"    BOOLEAN NOT NULL DEFAULT true,
    "displayOrder"  INTEGER NOT NULL DEFAULT 0,
    "checkboxLabel" TEXT,
    "linkText"      TEXT,
    "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById"   TEXT NOT NULL,

    CONSTRAINT "LegalDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable ClosingSession
CREATE TABLE "ClosingSession" (
    "id"               TEXT NOT NULL,
    "status"           TEXT NOT NULL DEFAULT 'closing_scheduled',
    "activeOfferId"    TEXT,
    "currentStep"      TEXT,
    "recordingStatus"  TEXT NOT NULL DEFAULT 'idle',
    "dailyRecordingId" TEXT,
    "recordingR2Key"   TEXT,
    "clientTokenHash"  TEXT NOT NULL,
    "tokenExpiresAt"   TIMESTAMP(3) NOT NULL,
    "startedAt"        TIMESTAMP(3),
    "closedAt"         TIMESTAMP(3),
    "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"        TIMESTAMP(3) NOT NULL,
    "appointmentId"    TEXT,
    "companyId"        TEXT NOT NULL,
    "closerId"         TEXT NOT NULL,

    CONSTRAINT "ClosingSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable OfferTemplate
CREATE TABLE "OfferTemplate" (
    "id"          TEXT NOT NULL,
    "name"        TEXT NOT NULL,
    "packageType" TEXT NOT NULL,
    "description" TEXT,
    "priceNet"    INTEGER NOT NULL,
    "currency"    TEXT NOT NULL DEFAULT 'EUR',
    "lineItems"   TEXT NOT NULL DEFAULT '[]',
    "validDays"   INTEGER NOT NULL DEFAULT 30,
    "r2Key"       TEXT,
    "status"      TEXT NOT NULL DEFAULT 'draft',
    "version"     INTEGER NOT NULL DEFAULT 1,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL,
    "createdById" TEXT NOT NULL,

    CONSTRAINT "OfferTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable Offer
CREATE TABLE "Offer" (
    "id"               TEXT NOT NULL,
    "status"           TEXT NOT NULL DEFAULT 'draft',
    "currency"         TEXT NOT NULL DEFAULT 'EUR',
    "priceNet"         INTEGER NOT NULL,
    "validUntil"       TIMESTAMP(3) NOT NULL,
    "presentedAt"      TIMESTAMP(3),
    "acceptedAt"       TIMESTAMP(3),
    "pdfR2Key"         TEXT,
    "notes"            TEXT,
    "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"        TIMESTAMP(3) NOT NULL,
    "companyId"        TEXT NOT NULL,
    "templateId"       TEXT,
    "closingSessionId" TEXT,
    "createdById"      TEXT NOT NULL,

    CONSTRAINT "Offer_pkey" PRIMARY KEY ("id")
);

-- CreateTable OfferLineItem
CREATE TABLE "OfferLineItem" (
    "id"             TEXT NOT NULL,
    "position"       INTEGER NOT NULL,
    "description"    TEXT NOT NULL,
    "quantity"       DOUBLE PRECISION NOT NULL DEFAULT 1,
    "unitPriceCents" INTEGER NOT NULL,
    "totalCents"     INTEGER NOT NULL,
    "isExtra"        BOOLEAN NOT NULL DEFAULT false,
    "note"           TEXT,
    "offerId"        TEXT NOT NULL,

    CONSTRAINT "OfferLineItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable ConsentRecord
CREATE TABLE "ConsentRecord" (
    "id"                  TEXT NOT NULL,
    "consentType"         TEXT NOT NULL,
    "isRequired"          BOOLEAN NOT NULL,
    "offerVersion"        INTEGER NOT NULL DEFAULT 1,
    "displayedPriceCents" INTEGER NOT NULL,
    "displayedItems"      TEXT NOT NULL DEFAULT '[]',
    "offerDisplayedAt"    TIMESTAMP(3),
    "agreementAt"         TIMESTAMP(3),
    "result"              TEXT NOT NULL,
    "grantedAt"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress"           TEXT,
    "userAgent"           TEXT,
    "sessionTokenHash"    TEXT NOT NULL,
    "companyId"           TEXT NOT NULL,
    "closingSessionId"    TEXT NOT NULL,
    "offerId"             TEXT NOT NULL,
    "legalDocumentId"     TEXT NOT NULL,

    CONSTRAINT "ConsentRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable Invoice
CREATE TABLE "Invoice" (
    "id"                    TEXT NOT NULL,
    "invoiceNumber"         TEXT NOT NULL,
    "status"                TEXT NOT NULL DEFAULT 'draft',
    "netAmount"             INTEGER NOT NULL,
    "taxRate"               DOUBLE PRECISION NOT NULL DEFAULT 0.19,
    "grossAmount"           INTEGER NOT NULL,
    "currency"              TEXT NOT NULL DEFAULT 'EUR',
    "dueDate"               TIMESTAMP(3) NOT NULL,
    "issuedAt"              TIMESTAMP(3),
    "paidAt"                TIMESTAMP(3),
    "paidBy"                TEXT,
    "stripePaymentIntentId" TEXT,
    "pdfR2Key"              TEXT,
    "billingName"           TEXT,
    "billingAddress"        TEXT,
    "createdAt"             TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"             TIMESTAMP(3) NOT NULL,
    "companyId"             TEXT NOT NULL,
    "offerId"               TEXT,
    "closingSessionId"      TEXT,
    "createdById"           TEXT NOT NULL,
    "confirmedById"         TEXT,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable InvoiceItem
CREATE TABLE "InvoiceItem" (
    "id"          TEXT NOT NULL,
    "position"    INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "quantity"    DOUBLE PRECISION NOT NULL DEFAULT 1,
    "unitPrice"   INTEGER NOT NULL,
    "totalPrice"  INTEGER NOT NULL,
    "invoiceId"   TEXT NOT NULL,

    CONSTRAINT "InvoiceItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable ContractSnapshot
CREATE TABLE "ContractSnapshot" (
    "id"               TEXT NOT NULL,
    "offerVersion"     INTEGER NOT NULL DEFAULT 1,
    "packageType"      TEXT NOT NULL,
    "totalNetCents"    INTEGER NOT NULL,
    "lineItems"        TEXT NOT NULL DEFAULT '[]',
    "extras"           TEXT NOT NULL DEFAULT '[]',
    "customChanges"    TEXT,
    "offerDate"        TIMESTAMP(3) NOT NULL,
    "agbVersion"       TEXT NOT NULL,
    "privacyVersion"   TEXT NOT NULL,
    "otherDocVersions" TEXT NOT NULL DEFAULT '{}',
    "closedAt"         TIMESTAMP(3) NOT NULL,
    "closerName"       TEXT NOT NULL,
    "companyName"      TEXT NOT NULL,
    "fullSnapshot"     TEXT NOT NULL DEFAULT '{}',
    "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closingSessionId" TEXT NOT NULL,
    "offerId"          TEXT NOT NULL,
    "closerId"         TEXT NOT NULL,
    "companyId"        TEXT NOT NULL,

    CONSTRAINT "ContractSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable PackageDefaultLearningAssignment
CREATE TABLE "PackageDefaultLearningAssignment" (
    "id"              TEXT NOT NULL,
    "packageType"     TEXT NOT NULL,
    "assignmentOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive"        BOOLEAN NOT NULL DEFAULT true,
    "chapterId"       TEXT NOT NULL,

    CONSTRAINT "PackageDefaultLearningAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable SalesContent
CREATE TABLE "SalesContent" (
    "id"                TEXT NOT NULL,
    "type"              TEXT NOT NULL,
    "category"          TEXT,
    "title"             TEXT NOT NULL,
    "content"           TEXT NOT NULL,
    "order"             INTEGER NOT NULL DEFAULT 0,
    "isVisibleToClient" BOOLEAN NOT NULL DEFAULT false,
    "status"            TEXT NOT NULL DEFAULT 'draft',
    "version"           INTEGER NOT NULL DEFAULT 1,
    "r2Key"             TEXT,
    "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"         TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SalesContent_pkey" PRIMARY KEY ("id")
);

-- CreateTable EmailTemplate
CREATE TABLE "EmailTemplate" (
    "id"               TEXT NOT NULL,
    "key"              TEXT NOT NULL,
    "subject"          TEXT NOT NULL,
    "bodyHtml"         TEXT NOT NULL,
    "attachmentConfig" TEXT NOT NULL DEFAULT '[]',
    "legalFooter"      TEXT,
    "isActive"         BOOLEAN NOT NULL DEFAULT true,
    "updatedAt"        TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable ClosingEvent
CREATE TABLE "ClosingEvent" (
    "id"               TEXT NOT NULL,
    "eventType"        TEXT NOT NULL,
    "metadata"         TEXT NOT NULL DEFAULT '{}',
    "reason"           TEXT,
    "occurredAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closingSessionId" TEXT NOT NULL,
    "companyId"        TEXT NOT NULL,
    "actorId"          TEXT,

    CONSTRAINT "ClosingEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex (unique)
CREATE UNIQUE INDEX "ClosingSession_clientTokenHash_key" ON "ClosingSession"("clientTokenHash");
CREATE UNIQUE INDEX "ClosingSession_appointmentId_key"   ON "ClosingSession"("appointmentId");
CREATE UNIQUE INDEX "Invoice_invoiceNumber_key"          ON "Invoice"("invoiceNumber");
CREATE UNIQUE INDEX "ContractSnapshot_closingSessionId_key" ON "ContractSnapshot"("closingSessionId");
CREATE UNIQUE INDEX "PackageDefaultLearningAssignment_packageType_chapterId_key"
  ON "PackageDefaultLearningAssignment"("packageType", "chapterId");
CREATE UNIQUE INDEX "EmailTemplate_key_key" ON "EmailTemplate"("key");

-- AddForeignKey
ALTER TABLE "LegalDocument"
  ADD CONSTRAINT "LegalDocument_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ClosingSession"
  ADD CONSTRAINT "ClosingSession_appointmentId_fkey"
  FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ClosingSession"
  ADD CONSTRAINT "ClosingSession_companyId_fkey"
  FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ClosingSession"
  ADD CONSTRAINT "ClosingSession_closerId_fkey"
  FOREIGN KEY ("closerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "OfferTemplate"
  ADD CONSTRAINT "OfferTemplate_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Offer"
  ADD CONSTRAINT "Offer_companyId_fkey"
  FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Offer"
  ADD CONSTRAINT "Offer_templateId_fkey"
  FOREIGN KEY ("templateId") REFERENCES "OfferTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Offer"
  ADD CONSTRAINT "Offer_closingSessionId_fkey"
  FOREIGN KEY ("closingSessionId") REFERENCES "ClosingSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Offer"
  ADD CONSTRAINT "Offer_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "OfferLineItem"
  ADD CONSTRAINT "OfferLineItem_offerId_fkey"
  FOREIGN KEY ("offerId") REFERENCES "Offer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ConsentRecord"
  ADD CONSTRAINT "ConsentRecord_companyId_fkey"
  FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ConsentRecord"
  ADD CONSTRAINT "ConsentRecord_closingSessionId_fkey"
  FOREIGN KEY ("closingSessionId") REFERENCES "ClosingSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ConsentRecord"
  ADD CONSTRAINT "ConsentRecord_offerId_fkey"
  FOREIGN KEY ("offerId") REFERENCES "Offer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ConsentRecord"
  ADD CONSTRAINT "ConsentRecord_legalDocumentId_fkey"
  FOREIGN KEY ("legalDocumentId") REFERENCES "LegalDocument"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Invoice"
  ADD CONSTRAINT "Invoice_companyId_fkey"
  FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Invoice"
  ADD CONSTRAINT "Invoice_offerId_fkey"
  FOREIGN KEY ("offerId") REFERENCES "Offer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Invoice"
  ADD CONSTRAINT "Invoice_closingSessionId_fkey"
  FOREIGN KEY ("closingSessionId") REFERENCES "ClosingSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Invoice"
  ADD CONSTRAINT "Invoice_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Invoice"
  ADD CONSTRAINT "Invoice_confirmedById_fkey"
  FOREIGN KEY ("confirmedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "InvoiceItem"
  ADD CONSTRAINT "InvoiceItem_invoiceId_fkey"
  FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ContractSnapshot"
  ADD CONSTRAINT "ContractSnapshot_closingSessionId_fkey"
  FOREIGN KEY ("closingSessionId") REFERENCES "ClosingSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PackageDefaultLearningAssignment"
  ADD CONSTRAINT "PackageDefaultLearningAssignment_chapterId_fkey"
  FOREIGN KEY ("chapterId") REFERENCES "LearningChapter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ClosingEvent"
  ADD CONSTRAINT "ClosingEvent_closingSessionId_fkey"
  FOREIGN KEY ("closingSessionId") REFERENCES "ClosingSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ClosingEvent"
  ADD CONSTRAINT "ClosingEvent_companyId_fkey"
  FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ClosingEvent"
  ADD CONSTRAINT "ClosingEvent_actorId_fkey"
  FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
