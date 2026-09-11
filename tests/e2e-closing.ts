/**
 * End-to-End-Test des OKUN Closing Portals.
 *
 * Fährt den vollständigen Vorgang gegen eine echte PostgreSQL-Datenbank:
 * Lead → Stammdaten → Closing → Angebot → Snapshot → Erklärungen → Script →
 * Aufzeichnung → R2-Archivierung → Abschlussprotokoll → Rechnung → Zahlung →
 * Kundenaktivierung. R2 und Daily.co laufen als lokale Test-Doubles.
 *
 * Ausführen: npx tsx tests/e2e-closing.ts
 */
import assert from "node:assert/strict";
import { startFakeDaily, startFakeR2 } from "./harness/fake-services";

const BUCKET = "okun-e2e";

let fakeR2: Awaited<ReturnType<typeof startFakeR2>>;
let fakeDaily: Awaited<ReturnType<typeof startFakeDaily>>;

let passed = 0;
const failures: string[] = [];

/** Intl.NumberFormat setzt ein geschütztes Leerzeichen vor das Währungszeichen. */
function normalizeSpaces(value: string): string {
  return value.replace(/\u00a0/g, " ").replace("€", "EUR-Format");
}

async function step(name: string, fn: () => Promise<void>) {
  try {
    await fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    failures.push(name);
    console.error(`  ✗ ${name}`);
    console.error("    ", err instanceof Error ? err.message : err);
  }
}

async function main() {
  // ── Test-Doubles starten und Umgebung setzen ──────────────────────────────
  fakeR2 = await startFakeR2(BUCKET);
  fakeDaily = await startFakeDaily();

  process.env.R2_ENDPOINT = `http://127.0.0.1:${fakeR2.port}`;
  process.env.R2_FORCE_PATH_STYLE = "true";
  process.env.R2_ACCOUNT_ID = "test-account";
  process.env.R2_ACCESS_KEY_ID = "test-key";
  process.env.R2_SECRET_ACCESS_KEY = "test-secret";
  process.env.R2_BUCKET_NAME = BUCKET;
  process.env.R2_PUBLIC_URL = `http://127.0.0.1:${fakeR2.port}/${BUCKET}`;
  process.env.DAILY_API_BASE = `http://127.0.0.1:${fakeDaily.port}`;
  process.env.DAILY_API_KEY = "test-daily-key";
  process.env.NEXTAUTH_URL = "http://localhost:3000";
  process.env.RESEND_API_KEY = "";

  // Module erst nach dem Setzen der Umgebung laden.
  const { db } = await import("../src/lib/db");
  const { createContractSnapshot, verifySnapshotIntegrity } = await import(
    "../src/lib/closing/snapshot"
  );
  const { confirmConsents, evaluateConsentState } = await import("../src/lib/closing/consent");
  const { renderAndFreezeScript } = await import("../src/lib/closing/script-service");
  const {
    checkRecordingRelease,
    startRecording,
    stopRecording,
    migrateRecording,
    deleteDailyCopyIfDue,
  } = await import("../src/lib/closing/recording");
  const { closeContractAndCertify } = await import("../src/lib/closing/certificate");
  const { buildDraftFromClosing, saveInvoiceDraft, finalizeInvoice } = await import(
    "../src/lib/invoicing/invoice"
  );
  const { confirmInvoicePayment } = await import("../src/lib/closing/payments");
  const { validateCompanyMasterData } = await import("../src/lib/closing/master-data");
  const { hashToken, generateToken } = await import("../src/lib/closing/token");
  const { ensureVersionHash, sha256Buffer, sha256String } = await import(
    "../src/lib/documents/hash"
  );
  const { saveCompanySettings } = await import("../src/lib/company-settings");
  const { buildClientClosingState } = await import("../src/lib/closing/client-view");
  const { normalizeStatus } = await import("../src/lib/closing/state-machine");

  const RUN = `e2e_${Date.now()}`;
  const ids = {
    admin: `${RUN}_admin`,
    company: `${RUN}_company`,
    session: "",
    offer: "",
  };

  console.log("\n═══ OKUN Closing Portal — End-to-End ═══\n");

  // ── Vorbereitung: Unternehmenseinstellungen + Admin ───────────────────────
  await saveCompanySettings({
    "company.name": "OKUN Systems",
    "company.street": "Teststraße",
    "company.houseNumber": "1",
    "company.postalCode": "10115",
    "company.city": "Berlin",
    "company.country": "Deutschland",
    "company.email": "info@okun-systems.de",
    "company.invoiceNumberPrefix": "RE",
    "company.defaultVatRatePercent": "19",
    "company.defaultPaymentTermDays": "14",
  });

  await db.user.create({
    data: {
      id: ids.admin,
      email: `${RUN}@okun-systems.de`,
      name: "E2E Closer",
      password: "x",
      role: "ADMIN",
    },
  });

  // ── 1 Lead anlegen ────────────────────────────────────────────────────────
  await step("1 · Lead anlegen", async () => {
    await db.company.create({
      data: {
        id: ids.company,
        name: "Testkunde GmbH",
        status: "ONBOARDING",
        projectPhase: "onboarding",
        leadStatus: "lead",
        assignedCloserId: ids.admin,
      },
    });
    const company = await db.company.findUnique({ where: { id: ids.company } });
    assert.equal(company?.leadStatus, "lead");
  });

  // ── 2 Stammdaten ──────────────────────────────────────────────────────────
  await step("2 · Stammdaten-Prüfung blockiert unvollständige Leads", async () => {
    const before = await validateCompanyMasterData(
      (await db.company.findUnique({ where: { id: ids.company } }))!
    );
    assert.equal(before.complete, false, "unvollständiger Lead darf nicht durchgehen");
    assert.ok(before.missing.some((m) => m.key === "legalForm"));

    await db.company.update({
      where: { id: ids.company },
      data: {
        legalForm: "gmbh",
        street: "Musterallee",
        houseNumber: "12",
        postalCode: "20095",
        city: "Hamburg",
        country: "Deutschland",
        registerCourt: "AG Hamburg",
        registerNumber: "HRB 123456",
        vatId: "DE123456789",
        contactFirstName: "Maria",
        contactLastName: "Beispiel",
        contactPosition: "Geschäftsführerin",
        contactEmail: `${RUN}-kunde@example.test`,
        contactPhone: "+49 40 1234567",
      },
    });

    const after = await validateCompanyMasterData(
      (await db.company.findUnique({ where: { id: ids.company } }))!
    );
    assert.equal(after.complete, true, JSON.stringify(after.missing));
  });

  // ── Vertragsdokumente + Erklärungen konfigurieren ─────────────────────────
  let agbVersionId = "";
  let recordingConsentId = "";
  await step("Vertragsdokumente mit Version und Hash anlegen", async () => {
    const agb = await db.contractDocument.create({
      data: { id: `${RUN}_agb`, type: "agb", name: "AGB", createdById: ids.admin },
    });
    const version = await db.legalDocument.create({
      data: {
        contractDocumentId: agb.id,
        type: "agb",
        title: "AGB",
        version: "1.2",
        content: "TEST-AGB-INHALT v1.2",
        mimeType: "text/plain",
        isActive: true,
        createdById: ids.admin,
      },
    });
    agbVersionId = version.id;
    const hash = await ensureVersionHash(version.id);
    assert.equal(hash, sha256String("TEST-AGB-INHALT v1.2"), "Hash über exakten Inhalt");
  });

  await step("Erklärungen konfigurieren (inkl. Aufzeichnungstext aus dem Admin)", async () => {
    await db.consentDefinition.create({
      data: {
        key: `${RUN}_agb`,
        title: "AGB",
        checkboxText: "TESTTEXT: Ich habe die AGB gelesen und akzeptiere diese.",
        consentType: "ACCEPTANCE",
        isRequired: true,
        isActive: true,
        displayOrder: 1,
        contractDocumentId: `${RUN}_agb`,
        createdById: ids.admin,
      },
    });
    const recording = await db.consentDefinition.create({
      data: {
        key: `${RUN}_recording`,
        title: "Vertragsaufzeichnung",
        checkboxText: "TESTTEXT: Ich willige in die Aufzeichnung des Vertragsabschlusses ein.",
        consentType: "RECORDING_CONSENT",
        isRequired: true,
        isActive: true,
        displayOrder: 2,
        createdById: ids.admin,
      },
    });
    recordingConsentId = recording.id;
    assert.ok(recordingConsentId);
  });

  await step("Closing Scripts anlegen", async () => {
    await db.closingScript.createMany({
      data: [
        {
          key: `${RUN}_intro`,
          kind: "GENERAL_INTRO",
          title: "Einleitung",
          body: "TESTTEXT Einleitung für {{customer_name}} von {{company_name}}. Können Sie das bestätigen?",
          displayOrder: 1,
          isActive: true,
          createdById: ids.admin,
        },
        {
          key: `${RUN}_package`,
          kind: "PACKAGE",
          title: "Paket",
          body: "TESTTEXT: Sie haben sich für {{package_name}} zu einer einmaligen Investition von {{one_time_price_net}} € netto entschieden.",
          packageType: "foundation",
          displayOrder: 1,
          isActive: true,
          createdById: ids.admin,
        },
        {
          key: `${RUN}_final`,
          kind: "FINAL_ACCEPTANCE",
          title: "Verbindliche Annahme",
          body: "TESTTEXT: Nehmen Sie das Angebot {{offer_number}} vom {{contract_date}} verbindlich an?",
          displayOrder: 1,
          isActive: true,
          createdById: ids.admin,
        },
      ],
    });
    const count = await db.closingScript.count({ where: { key: { startsWith: RUN } } });
    assert.equal(count, 3);
  });

  // ── 3 Closing erstellen ───────────────────────────────────────────────────
  const clientToken = generateToken();
  await step("3 · Closing Session erstellen", async () => {
    const appointment = await db.appointment.create({
      data: {
        title: "Closing E2E",
        type: "CLOSING_CALL",
        startTime: new Date(),
        endTime: new Date(Date.now() + 3600_000),
        companyId: ids.company,
        meetingUrl: "https://okun.daily.co/closing-e2e",
      },
    });
    const session = await db.closingSession.create({
      data: {
        clientTokenHash: hashToken(clientToken),
        tokenExpiresAt: new Date(Date.now() + 72 * 3600_000),
        tokenIssuedAt: new Date(),
        appointmentId: appointment.id,
        companyId: ids.company,
        closerId: ids.admin,
        status: "closing_scheduled",
      },
    });
    ids.session = session.id;
    assert.ok(ids.session);
  });

  // ── 4/5 Angebot auswählen ────────────────────────────────────────────────
  await step("4+5 · Angebot mit Positionen anlegen und präsentieren", async () => {
    const template = await db.offerTemplate.create({
      data: {
        name: "OKUN Foundation",
        packageType: "foundation",
        priceNet: 1250000,
        recurringNetCents: 29900,
        recurringInterval: "monthly",
        minimumTermMonths: 12,
        vatRateBp: 1900,
        paymentTerms: "14 Tage netto",
        status: "published",
        createdById: ids.admin,
      },
    });
    const offer = await db.offer.create({
      data: {
        offerNumber: `AN-TEST-${Date.now()}`,
        priceNet: template.priceNet,
        validUntil: new Date(Date.now() + 30 * 86400_000),
        companyId: ids.company,
        templateId: template.id,
        closingSessionId: ids.session,
        createdById: ids.admin,
        packageType: "foundation",
        recurringNetCents: template.recurringNetCents,
        recurringInterval: template.recurringInterval,
        minimumTermMonths: template.minimumTermMonths,
        vatRateBp: template.vatRateBp,
        paymentTerms: template.paymentTerms,
        status: "presented",
        presentedAt: new Date(),
        lineItems: {
          create: [
            {
              position: 1,
              description: "OKUN Foundation — einmalige Investition",
              quantity: 1,
              quantityMilli: 1000,
              unitPriceCents: 1250000,
              totalCents: 1250000,
              kind: "one_time",
            },
            {
              position: 2,
              description: "Workshop-Tag",
              quantity: 2,
              quantityMilli: 2000,
              unitPriceCents: 150000,
              totalCents: 300000,
              kind: "one_time",
              isExtra: true,
            },
          ],
        },
      },
    });
    ids.offer = offer.id;
    await db.closingSession.update({
      where: { id: ids.session },
      data: { status: "offer_presented", activeOfferId: offer.id },
    });
  });

  // ── 6 Contract Snapshot ──────────────────────────────────────────────────
  let snapshotId = "";
  await step("6 · Contract Snapshot erzeugen (idempotent)", async () => {
    const first = await createContractSnapshot(ids.session, ids.admin);
    assert.ok(first.ok, "ok" in first && !first.ok ? first.error : "");
    if (!first.ok) return;
    snapshotId = first.snapshotId;
    assert.equal(first.created, true);

    // Doppelklick darf keinen zweiten Snapshot erzeugen.
    const second = await createContractSnapshot(ids.session, ids.admin);
    assert.ok(second.ok);
    if (second.ok) {
      assert.equal(second.snapshotId, snapshotId);
      assert.equal(second.created, false);
    }
    const count = await db.contractSnapshot.count({ where: { closingSessionId: ids.session } });
    assert.equal(count, 1, "genau ein Snapshot");

    const snapshot = await db.contractSnapshot.findUnique({ where: { id: snapshotId } });
    assert.ok(
      verifySnapshotIntegrity(
        snapshot!.data as never,
        snapshot!.snapshotHash
      ),
      "Snapshot-Hash stimmt"
    );
    assert.equal(snapshot!.oneTimeNetCents, 1250000);
    assert.equal(snapshot!.recurringNetCents, 29900);
    assert.equal(normalizeStatus((await db.closingSession.findUnique({ where: { id: ids.session } }))!.status), "consent_pending");
  });

  // ── 7/8 Kundensicht: richtige Dokumentversionen ──────────────────────────
  await step("7+8 · Kunde sieht die eingefrorenen Dokumentversionen", async () => {
    const state = await buildClientClosingState(ids.session);
    assert.ok(state);
    assert.equal(state!.snapshotReady, true);
    assert.equal(state!.consents.length, 2);
    const agbConsent = state!.consents.find((c) => c.consentType === "ACCEPTANCE");
    assert.equal(agbConsent?.document?.versionLabel, "1.2");
    assert.equal(agbConsent?.document?.versionId, agbVersionId);
    assert.equal(agbConsent?.document?.openable, true);
    assert.match(
      state!.consents.find((c) => c.consentType === "RECORDING_CONSENT")!.checkboxText,
      /Aufzeichnung des Vertragsabschlusses/
    );
    assert.equal(normalizeSpaces(state!.offer?.oneTimeNet ?? ""), "12.500,00 EUR-Format");
  });

  // ── 30.1 Dokumentversion ändert sich während des Closings ────────────────
  await step("Fehlerfall · neue Dokumentversion ändert den laufenden Abschluss nicht", async () => {
    await db.legalDocument.update({ where: { id: agbVersionId }, data: { isActive: false } });
    await db.legalDocument.create({
      data: {
        contractDocumentId: `${RUN}_agb`,
        type: "agb",
        title: "AGB",
        version: "1.3",
        content: "TEST-AGB-INHALT v1.3",
        mimeType: "text/plain",
        isActive: true,
        createdById: ids.admin,
      },
    });
    const state = await buildClientClosingState(ids.session);
    const agbConsent = state!.consents.find((c) => c.consentType === "ACCEPTANCE");
    assert.equal(agbConsent?.document?.versionLabel, "1.2", "Snapshot bleibt auf Version 1.2");
  });

  // ── 30.2 Angebot wird nach dem Snapshot geändert ─────────────────────────
  await step("Fehlerfall · Preisänderung nach dem Snapshot wirkt nicht zurück", async () => {
    await db.offer.update({ where: { id: ids.offer }, data: { priceNet: 9900000 } });
    const snapshot = await db.contractSnapshot.findUnique({ where: { id: snapshotId } });
    assert.equal(snapshot!.oneTimeNetCents, 1250000);
    await db.offer.update({ where: { id: ids.offer }, data: { priceNet: 1250000 } });
  });

  // ── 9/10/11 Erklärungen bestätigen ───────────────────────────────────────
  await step("9+10+11 · Pflichtbestätigung wird serverseitig erzwungen", async () => {
    const incomplete = await confirmConsents({
      closingSessionId: ids.session,
      submissions: [{ definitionId: recordingConsentId, accepted: true }],
      sessionTokenHash: hashToken(clientToken),
    });
    assert.equal(incomplete.ok, false, "fehlende Pflichterklärung muss abgelehnt werden");
    if (!incomplete.ok) assert.ok(incomplete.missing && incomplete.missing.length > 0);

    const events = await db.consentAuditEvent.count({ where: { closingSessionId: ids.session } });
    assert.equal(events, 0, "bei Ablehnung wird nichts protokolliert");
  });

  await step("10+11 · alle Erklärungen werden mit Hash und Zeitstempel protokolliert", async () => {
    const all = await db.consentDefinition.findMany({ where: { key: { startsWith: RUN } } });
    const result = await confirmConsents({
      closingSessionId: ids.session,
      submissions: all.map((d) => ({ definitionId: d.id, accepted: true })),
      sessionTokenHash: hashToken(clientToken),
      ipAddress: "203.0.113.10",
      userAgent: "E2E-Test",
    });
    assert.ok(result.ok, !result.ok ? result.error : "");
    if (!result.ok) return;
    assert.equal(result.allRequiredConfirmed, true);

    const events = await db.consentAuditEvent.findMany({
      where: { closingSessionId: ids.session },
      orderBy: { serverTimestamp: "asc" },
    });
    assert.equal(events.length, 2);

    const agbEvent = events.find((e) => e.consentType === "ACCEPTANCE")!;
    assert.match(agbEvent.checkboxText, /Ich habe die AGB gelesen/);
    assert.equal(agbEvent.documentVersionLabel, "1.2");
    assert.equal(agbEvent.documentSha256, sha256String("TEST-AGB-INHALT v1.2"));
    assert.ok(agbEvent.serverTimestamp instanceof Date);
    assert.ok(agbEvent.timezone.length > 0);
    assert.equal(agbEvent.organizationName, "Testkunde GmbH");
    assert.equal(agbEvent.actingPersonName, "Maria Beispiel");
    assert.equal(agbEvent.ipAddress, "203.0.113.10");

    assert.equal(
      normalizeStatus((await db.closingSession.findUnique({ where: { id: ids.session } }))!.status),
      "consents_confirmed"
    );
  });

  await step("Fehlerfall · doppelte Bestätigung erzeugt keine zweiten Events", async () => {
    const all = await db.consentDefinition.findMany({ where: { key: { startsWith: RUN } } });
    await confirmConsents({
      closingSessionId: ids.session,
      submissions: all.map((d) => ({ definitionId: d.id, accepted: true })),
      sessionTokenHash: hashToken(clientToken),
    });
    const events = await db.consentAuditEvent.count({ where: { closingSessionId: ids.session } });
    assert.equal(events, 2, "weiterhin genau zwei Audit Events");
  });

  // ── 13/14/15 Script ──────────────────────────────────────────────────────
  await step("13+14+15 · Script wird zusammengesetzt und mit echten Daten gerendert", async () => {
    const rendered = await renderAndFreezeScript(ids.session, { force: true });
    assert.ok(rendered.ok, !rendered.ok ? rendered.error : "");
    if (!rendered.ok) return;

    const kinds = rendered.script.sections.map((s) => s.kind);
    assert.deepEqual(kinds, ["GENERAL_INTRO", "PACKAGE", "FINAL_ACCEPTANCE"]);
    assert.match(rendered.script.sections[0].text, /Maria Beispiel/);
    assert.match(rendered.script.sections[0].text, /Testkunde GmbH/);
    assert.match(rendered.script.sections[1].text, /OKUN Foundation/);
    assert.match(rendered.script.sections[1].text, /12\.500,00 € netto/);
    assert.match(rendered.script.sections[2].text, /AN-TEST-/);

    const snapshot = await db.contractSnapshot.findUnique({ where: { id: snapshotId } });
    assert.ok(snapshot!.renderedScript, "gerendertes Script ist im Snapshot eingefroren");
  });

  await step("Fehlerfall · Script-Änderung nach dem Rendern ändert das Closing nicht", async () => {
    await db.closingScript.update({
      where: { key: `${RUN}_intro` },
      data: { body: "KOMPLETT ANDERER TEXT", version: 2 },
    });
    const snapshot = await db.contractSnapshot.findUnique({ where: { id: snapshotId } });
    const script = snapshot!.renderedScript as { sections: Array<{ text: string }> };
    assert.match(script.sections[0].text, /TESTTEXT Einleitung/);
  });

  // ── 12/16 Aufzeichnung ───────────────────────────────────────────────────
  await step("12 · Aufzeichnung ist ohne Einwilligung gesperrt, danach freigegeben", async () => {
    const release = await checkRecordingRelease(ids.session);
    assert.equal(release.released, true, release.reasons.join(" "));

    // Gegenprobe an einer zweiten Session ohne Snapshot.
    const other = await db.closingSession.create({
      data: {
        clientTokenHash: `${RUN}_other`,
        tokenExpiresAt: new Date(Date.now() + 3600_000),
        companyId: ids.company,
        closerId: ids.admin,
        status: "closing_scheduled",
      },
    });
    const blocked = await checkRecordingRelease(other.id);
    assert.equal(blocked.released, false);
    assert.ok(blocked.reasons.some((r) => r.includes("Contract Snapshot")));
    await db.closingSession.delete({ where: { id: other.id } });
  });

  await step("16 · Aufzeichnung starten", async () => {
    const result = await startRecording({ closingSessionId: ids.session, actorId: ids.admin });
    assert.ok(result.ok, !result.ok ? result.error : "");
    if (!result.ok) return;
    const session = await db.closingSession.findUnique({ where: { id: ids.session } });
    assert.equal(normalizeStatus(session!.status), "recording");
    assert.equal(session!.recordingStatus, "recording");
  });

  // ── 30.3 Migrationsfehler + Retry ────────────────────────────────────────
  await step("Fehlerfall · fehlgeschlagene Migration behält die Daily-Kopie", async () => {
    fakeDaily.state.failDownload = true;
    const stopped = await stopRecording({ closingSessionId: ids.session, actorId: ids.admin });
    assert.ok(stopped.ok);
    if (stopped.ok) assert.equal(stopped.migrated, false);

    const recording = await db.closingRecording.findFirst({
      where: { closingSessionId: ids.session },
    });
    assert.equal(recording!.status, "migration_failed");
    assert.ok(recording!.lastError);
    assert.equal(recording!.dailyDeletedAt, null, "Daily-Kopie wurde nicht gelöscht");
    assert.equal(fakeDaily.state.deleted, false);

    const warning = await db.closingEvent.findFirst({
      where: { closingSessionId: ids.session, eventType: "recording_migration_failed" },
    });
    assert.ok(warning, "Admin-Warnung wurde erzeugt");
  });

  // ── 17/18 Retry, Archivierung, Verifizierung ─────────────────────────────
  await step("17+18 · Retry archiviert die Aufzeichnung verifiziert in R2", async () => {
    fakeDaily.state.failDownload = false;
    const recording = await db.closingRecording.findFirst({
      where: { closingSessionId: ids.session },
    });
    const result = await migrateRecording(recording!.id);
    assert.ok(result.ok, !result.ok ? result.error : "");

    const archived = await db.closingRecording.findUnique({ where: { id: recording!.id } });
    assert.equal(archived!.status, "archived");
    assert.ok(archived!.r2Key);
    assert.ok(archived!.verifiedAt);
    assert.equal(archived!.sha256, sha256Buffer(fakeDaily.state.payload));
    assert.ok(fakeR2.objects.has(archived!.r2Key!), "Objekt liegt tatsächlich im Bucket");
    assert.equal(archived!.migrationAttempts, 2);

    // Schutzfrist: die Daily-Kopie darf noch nicht gelöscht werden.
    const tooEarly = await deleteDailyCopyIfDue(recording!.id);
    assert.equal(tooEarly.deleted, false);
    assert.match(tooEarly.reason ?? "", /Schutzfrist/);
    assert.equal(fakeDaily.state.deleted, false);

    // Nach Ablauf der Frist ist die Löschung zulässig.
    await db.closingRecording.update({
      where: { id: recording!.id },
      data: { dailyDeleteAfter: new Date(Date.now() - 1000) },
    });
    const due = await deleteDailyCopyIfDue(recording!.id);
    assert.equal(due.deleted, true);
    assert.equal(fakeDaily.state.deleted, true);
  });

  // ── 19/20/21 Abschlussprotokoll ──────────────────────────────────────────
  let certificateNumber = "";
  await step("19+20+21 · Abschlussprotokoll wird erzeugt, gehasht und archiviert", async () => {
    const result = await closeContractAndCertify({
      closingSessionId: ids.session,
      actorId: ids.admin,
    });
    assert.ok(result.ok, !result.ok ? result.error : "");
    if (!result.ok) return;
    assert.ok(result.certificateNumber, result.certificateError ?? "keine Protokollnummer");
    certificateNumber = result.certificateNumber!;

    const certificate = await db.closingCertificate.findFirst({
      where: { closingSessionId: ids.session },
    });
    assert.ok(certificate);
    assert.ok(certificate!.sha256.length === 64);
    assert.ok(fakeR2.objects.has(certificate!.r2Key), "Protokoll liegt im Bucket");
    assert.equal(
      sha256Buffer(fakeR2.objects.get(certificate!.r2Key)!.body),
      certificate!.sha256,
      "gespeicherter Hash entspricht der archivierten Datei"
    );

    const data = certificate!.data as {
      consents: Array<{ checkboxText: string; documentSha256: string | null }>;
      documents: Array<{ sha256: string | null }>;
      recording: { status: string } | null;
      offer: { oneTimeNetCents: number };
    };
    assert.equal(data.consents.length, 2);
    assert.match(data.consents[0].checkboxText, /TESTTEXT/);
    assert.equal(data.documents[0].sha256, sha256String("TEST-AGB-INHALT v1.2"));
    assert.equal(data.recording?.status, "archived");
    assert.equal(data.offer.oneTimeNetCents, 1250000);

    // Kundenablage
    const document = await db.document.findFirst({
      where: { companyId: ids.company, category: "CONTRACT" },
    });
    assert.ok(document, "Protokoll liegt beim Kunden unter Dokumente");
    assert.equal(document!.visibility, "customer");
  });

  await step("Fehlerfall · doppelter Abschluss erzeugt kein zweites Protokoll", async () => {
    await closeContractAndCertify({ closingSessionId: ids.session, actorId: ids.admin });
    const count = await db.closingCertificate.count({ where: { closingSessionId: ids.session } });
    assert.equal(count, 1);
  });

  // ── 22/23/24 Rechnung ────────────────────────────────────────────────────
  let invoiceId = "";
  await step("22+23+24 · Rechnung aus dem Closing mit beliebig vielen Positionen", async () => {
    const draft = await buildDraftFromClosing(ids.session);
    assert.ok(draft.ok, !draft.ok ? draft.error : "");
    if (!draft.ok) return;
    assert.equal(draft.draft.items.length, 2, "Positionen aus dem Snapshot übernommen");
    assert.equal(draft.draft.billing.name, "Testkunde GmbH");
    assert.equal(draft.draft.billing.city, "Hamburg");

    const saved = await saveInvoiceDraft({
      companyId: ids.company,
      closingSessionId: ids.session,
      offerId: ids.offer,
      contractSnapshotId: snapshotId,
      billing: draft.draft.billing,
      currency: "EUR",
      vatMode: "standard",
      vatRateBp: 1900,
      invoiceDate: new Date(),
      dueDate: new Date(Date.now() + 14 * 86400_000),
      items: [
        ...draft.draft.items.map((item) => ({
          description: item.description,
          quantityMilli: item.quantityMilli,
          unitPriceCents: item.unitPriceCents,
          vatRateBp: item.vatRateBp,
          discountBp: 0,
          unit: item.unit,
        })),
        // dritte Position frei ergänzt
        {
          description: "Zusatzposition",
          quantityMilli: 3000,
          unitPriceCents: 10000,
          vatRateBp: 1900,
          discountBp: 0,
        },
      ],
      createdById: ids.admin,
      idempotencyKey: `invoice_from_closing:${ids.session}`,
    });
    assert.ok(saved.ok, !saved.ok ? saved.error : "");
    if (!saved.ok) return;
    invoiceId = saved.invoiceId;

    // 24 · Netto/MwSt./Brutto serverseitig
    assert.equal(saved.totals.items.length, 3);
    assert.equal(saved.totals.netTotalCents, 1250000 + 300000 + 30000);
    assert.equal(saved.totals.vatTotalCents, Math.round(1580000 * 0.19));
    assert.equal(saved.totals.grossTotalCents, 1580000 + 300200);
  });

  await step("Fehlerfall · zweifaches Erstellen liefert dieselbe Rechnung", async () => {
    const again = await saveInvoiceDraft({
      companyId: ids.company,
      closingSessionId: ids.session,
      billing: { name: "X", street: null, houseNumber: null, postalCode: null, city: null, country: null, email: null },
      currency: "EUR",
      vatMode: "standard",
      vatRateBp: 1900,
      invoiceDate: new Date(),
      dueDate: new Date(),
      items: [{ description: "X", quantityMilli: 1000, unitPriceCents: 100 }],
      createdById: ids.admin,
      idempotencyKey: `invoice_from_closing:${ids.session}`,
    });
    assert.ok(again.ok);
    if (again.ok) assert.equal(again.invoiceId, invoiceId);
    const count = await db.invoice.count({ where: { closingSessionId: ids.session } });
    assert.equal(count, 1);
  });

  // ── 25/26 Finalisierung, PDF, Archivierung ───────────────────────────────
  await step("25+26 · Finalisierung vergibt die Nummer und archiviert das PDF", async () => {
    const result = await finalizeInvoice(invoiceId, ids.admin);
    assert.ok(result.ok, !result.ok ? result.error : "");
    if (!result.ok) return;
    assert.equal(result.alreadyFinal, false);
    assert.equal(result.pdfWarning, undefined, result.pdfWarning ?? "");
    assert.match(result.invoiceNumber, /^RE-\d{4}-\d{4}$/);

    const invoice = await db.invoice.findUnique({ where: { id: invoiceId } });
    assert.ok(invoice!.pdfR2Key);
    assert.ok(invoice!.pdfSha256);
    assert.ok(fakeR2.objects.has(invoice!.pdfR2Key!));
    assert.equal(
      sha256Buffer(fakeR2.objects.get(invoice!.pdfR2Key!)!.body),
      invoice!.pdfSha256
    );
    assert.ok(invoice!.templateVersion, "Template-Version festgehalten");
    assert.equal(invoice!.netTotalCents, 1580000);

    // PDF beginnt mit der PDF-Signatur
    assert.equal(
      fakeR2.objects.get(invoice!.pdfR2Key!)!.body.subarray(0, 4).toString(),
      "%PDF"
    );

    // 29 · Dokument beim richtigen Kunden
    const document = await db.document.findFirst({
      where: { companyId: ids.company, category: "INVOICE" },
    });
    assert.ok(document);
    assert.equal(document!.visibility, "customer");
  });

  await step("Fehlerfall · doppelte Finalisierung vergibt keine zweite Nummer", async () => {
    const invoiceBefore = await db.invoice.findUnique({ where: { id: invoiceId } });
    const again = await finalizeInvoice(invoiceId, ids.admin);
    assert.ok(again.ok);
    if (again.ok) {
      assert.equal(again.alreadyFinal, true);
      assert.equal(again.invoiceNumber, invoiceBefore!.invoiceNumber);
    }
  });

  // ── 27/28 Zahlung und Aktivierung ────────────────────────────────────────
  await step("27+28 · Zahlung bestätigen aktiviert den Kunden — und nur einmal", async () => {
    const beforeCompany = await db.company.findUnique({ where: { id: ids.company } });
    assert.equal(beforeCompany!.activatedAt, null, "vor der Zahlung nicht aktiviert");
    assert.notEqual(beforeCompany!.status, "ACTIVE");

    const result = await confirmInvoicePayment({
      invoiceId,
      actorId: ids.admin,
      note: "Überweisung E2E",
    });
    assert.ok(result.ok);
    assert.equal(result.alreadyPaid, false);
    assert.equal(result.activated, true);

    const company = await db.company.findUnique({ where: { id: ids.company } });
    assert.equal(company!.status, "ACTIVE");
    assert.ok(company!.activatedAt);
    assert.equal(company!.leadStatus, "customer_activated");

    const paymentEvents = await db.invoicePaymentEvent.findMany({ where: { invoiceId } });
    const paidEvent = paymentEvents.find((e) => e.newStatus === "paid");
    assert.ok(paidEvent, "Zahlungsbestätigung ist auditiert");
    assert.equal(paidEvent!.actorId, ids.admin);
    assert.equal(paidEvent!.previousStatus, "sent");
    assert.equal(paidEvent!.source, "admin");

    // Doppelte Bestätigung
    const again = await confirmInvoicePayment({ invoiceId, actorId: ids.admin });
    assert.equal(again.alreadyPaid, true);
    const activations = await db.closingEvent.count({
      where: { closingSessionId: ids.session, eventType: "customer_activated" },
    });
    assert.equal(activations, 1, "genau eine Aktivierung");
  });

  // ── 29 Kundendokumente ───────────────────────────────────────────────────
  await step("29 · Vertragsdokumente liegen beim richtigen Kunden", async () => {
    const documents = await db.document.findMany({
      where: { companyId: ids.company, visibility: "customer" },
    });
    assert.ok(documents.length >= 2);
    assert.ok(documents.some((d) => d.category === "CONTRACT"));
    assert.ok(documents.some((d) => d.category === "INVOICE"));

    const foreign = await db.document.count({
      where: { companyId: { not: ids.company }, r2Key: { in: documents.map((d) => d.r2Key!) } },
    });
    assert.equal(foreign, 0, "keine Zuordnung zu fremden Unternehmen");
  });

  // ── 30 Audit-Rekonstruktion ──────────────────────────────────────────────
  await step("30 · Audit View rekonstruiert den gesamten Vorgang", async () => {
    const session = await db.closingSession.findUnique({
      where: { id: ids.session },
      include: {
        contractSnapshot: true,
        recordings: true,
        certificates: true,
        invoices: { include: { paymentEvents: true } },
        events: true,
        consentAuditEvents: true,
      },
    });
    assert.ok(session);
    assert.ok(session!.contractSnapshot);
    assert.equal(session!.consentAuditEvents.length, 2);
    assert.equal(session!.recordings.length, 1);
    assert.equal(session!.certificates.length, 1);
    assert.equal(session!.invoices.length, 1);
    assert.equal(normalizeStatus(session!.status), "customer_activated");

    const types = session!.events.map((e) => e.eventType);
    for (const expected of [
      "contract_snapshot_created",
      "consents_confirmed",
      "recording_started",
      "recording_stopped",
      "recording_archived",
      "contract_closed",
      "closing_certificate_created",
      "invoice_finalized",
      "payment_confirmed",
      "customer_activated",
    ]) {
      assert.ok(types.includes(expected), `Ereignis fehlt: ${expected}`);
    }

    const consentState = await evaluateConsentState(ids.session);
    assert.equal(consentState.allRequiredConfirmed, true);
    assert.equal(consentState.recordingConsentConfirmed, true);
    assert.ok(certificateNumber.length > 0);
  });

  // ── Aufräumen ────────────────────────────────────────────────────────────
  await cleanup(db, RUN, ids);
  await db.$disconnect();

  console.log(
    `\n${passed} Schritte erfolgreich${failures.length > 0 ? `, ${failures.length} fehlgeschlagen` : ""}.\n`
  );
  if (failures.length > 0) {
    console.error("Fehlgeschlagen:", failures.join(", "));
    process.exitCode = 1;
  }
}

type Db = Awaited<typeof import("../src/lib/db")>["db"];

async function cleanup(db: Db, run: string, ids: { admin: string; company: string; session: string }) {
  try {
    await db.consentAuditEvent.deleteMany({ where: { companyId: ids.company } });
    await db.invoicePaymentEvent.deleteMany({ where: { invoice: { companyId: ids.company } } });
    await db.invoiceItem.deleteMany({ where: { invoice: { companyId: ids.company } } });
    await db.invoice.deleteMany({ where: { companyId: ids.company } });
    await db.closingCertificate.deleteMany({ where: { companyId: ids.company } });
    await db.closingRecording.deleteMany({ where: { closingSessionId: ids.session } });
    await db.closingEvent.deleteMany({ where: { companyId: ids.company } });
    await db.contractSnapshot.deleteMany({ where: { companyId: ids.company } });
    await db.offerLineItem.deleteMany({ where: { offer: { companyId: ids.company } } });
    await db.offer.deleteMany({ where: { companyId: ids.company } });
    await db.closingSession.deleteMany({ where: { companyId: ids.company } });
    await db.appointment.deleteMany({ where: { companyId: ids.company } });
    await db.document.deleteMany({ where: { companyId: ids.company } });
    await db.consentDefinitionRevision.deleteMany({
      where: { definition: { key: { startsWith: run } } },
    });
    await db.consentDefinition.deleteMany({ where: { key: { startsWith: run } } });
    await db.legalDocument.deleteMany({ where: { contractDocumentId: `${run}_agb` } });
    await db.contractDocument.deleteMany({ where: { id: `${run}_agb` } });
    await db.closingScriptRevision.deleteMany({ where: { script: { key: { startsWith: run } } } });
    await db.closingScript.deleteMany({ where: { key: { startsWith: run } } });
    await db.offerTemplate.deleteMany({ where: { createdById: ids.admin } });
    await db.user.deleteMany({ where: { id: ids.admin } });
    await db.company.deleteMany({ where: { id: ids.company } });
  } catch (err) {
    console.warn("Aufräumen unvollständig:", err instanceof Error ? err.message : err);
  }
}

main()
  .catch((err) => {
    console.error("E2E-Lauf abgebrochen:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await fakeR2?.close();
    await fakeDaily?.close();
    const { closePdfBrowser } = await import("../src/lib/blueprint/pdf-generator");
    await closePdfBrowser();
  });
