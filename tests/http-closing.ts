/**
 * HTTP-Ebene des Closing Portals: Routing, Autorisierung und Idempotenz gegen
 * einen laufenden Server.
 *
 *   1. Server starten (Beispiel):
 *      DATABASE_URL=… AUTH_SECRET=… STRIPE_SECRET_KEY=sk_test_dummy \
 *      STRIPE_WEBHOOK_SECRET=whsec_test_okun_e2e npx next start -p 3100
 *   2. Test ausführen:
 *      BASE_URL=http://localhost:3100 npx tsx tests/http-closing.ts
 */
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";

const BASE = process.env.BASE_URL ?? "http://localhost:3100";
const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET ?? "whsec_test_okun_e2e";
const RUN = `http_${Date.now().toString(36)}`;

let passed = 0;
const failures: string[] = [];

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

function signStripe(payload: string): string {
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = createHmac("sha256", WEBHOOK_SECRET)
    .update(`${timestamp}.${payload}`)
    .digest("hex");
  return `t=${timestamp},v1=${signature}`;
}

async function main() {
  const { db } = await import("../src/lib/db");
  const { createContractSnapshot } = await import("../src/lib/closing/snapshot");
  const { renderAndFreezeScript } = await import("../src/lib/closing/script-service");
  const { hashToken } = await import("../src/lib/closing/token");

  const token = `${RUN}${"0".repeat(64)}`.slice(0, 64);
  const ids = {
    admin: `${RUN}_admin`,
    company: `${RUN}_company`,
    session: `${RUN}_session`,
    offer: `${RUN}_offer`,
    doc: `${RUN}_agb`,
    version: `${RUN}_agb_v1`,
    foreign: `${RUN}_foreign_doc`,
  };

  console.log("\n═══ Closing Portal — HTTP-Ebene ═══\n");

  // ── Fixture ───────────────────────────────────────────────────────────────
  await db.user.create({
    data: { id: ids.admin, email: `${RUN}@okun.test`, name: "HTTP", password: "x", role: "ADMIN" },
  });
  await db.company.create({
    data: {
      id: ids.company, name: "HTTP Kunde GmbH", status: "ONBOARDING", projectPhase: "onboarding",
      leadStatus: "offer_presented", legalForm: "gmbh", street: "A", houseNumber: "1",
      postalCode: "10115", city: "Berlin", country: "Deutschland", registerCourt: "AG Berlin",
      registerNumber: "HRB 1", contactFirstName: "Erika", contactLastName: "Muster",
      contactPosition: "GF", contactEmail: `${RUN}@example.test`,
    },
  });
  await db.contractDocument.create({
    data: { id: ids.doc, type: "agb", name: "AGB", createdById: ids.admin },
  });
  await db.legalDocument.create({
    data: {
      id: ids.version, contractDocumentId: ids.doc, type: "agb", title: "AGB", version: "1.0",
      content: "HTTP-AGB-INHALT", mimeType: "text/plain", isActive: true, createdById: ids.admin,
    },
  });
  // Dokument, das NICHT zu diesem Abschluss gehört.
  await db.legalDocument.create({
    data: {
      id: ids.foreign, type: "agb", title: "Fremd-AGB", version: "9.9",
      content: "VERTRAULICH", mimeType: "text/plain", isActive: false, createdById: ids.admin,
    },
  });
  await db.consentDefinition.createMany({
    data: [
      {
        key: `${RUN}_agb`, title: "AGB", checkboxText: "HTTP: AGB akzeptiert.",
        consentType: "ACCEPTANCE", isRequired: true, isActive: true, displayOrder: 1,
        contractDocumentId: ids.doc, createdById: ids.admin,
      },
      {
        key: `${RUN}_rec`, title: "Aufzeichnung", checkboxText: "HTTP: Aufzeichnung eingewilligt.",
        consentType: "RECORDING_CONSENT", isRequired: true, isActive: true, displayOrder: 2,
        createdById: ids.admin,
      },
    ],
  });
  await db.closingScript.createMany({
    data: [
      { key: `${RUN}_intro`, kind: "GENERAL_INTRO", title: "Intro", body: "HTTP {{company_name}}", isActive: true, createdById: ids.admin },
      { key: `${RUN}_final`, kind: "FINAL_ACCEPTANCE", title: "Final", body: "HTTP {{offer_number}}", isActive: true, createdById: ids.admin },
    ],
  });
  const template = await db.offerTemplate.create({
    data: { name: `${RUN} Paket`, packageType: RUN, priceNet: 500000, vatRateBp: 1900, status: "published", createdById: ids.admin },
  });
  const appointment = await db.appointment.create({
    data: {
      title: "HTTP", type: "CLOSING_CALL", startTime: new Date(),
      endTime: new Date(Date.now() + 3600e3), companyId: ids.company,
      meetingUrl: "https://okun.daily.co/http",
    },
  });
  const session = await db.closingSession.create({
    data: {
      id: ids.session, clientTokenHash: hashToken(token),
      tokenExpiresAt: new Date(Date.now() + 72 * 3600e3), appointmentId: appointment.id,
      companyId: ids.company, closerId: ids.admin, status: "offer_presented",
    },
  });
  const offer = await db.offer.create({
    data: {
      id: ids.offer, offerNumber: `AN-${RUN}`, priceNet: 500000,
      validUntil: new Date(Date.now() + 30 * 864e5), companyId: ids.company,
      templateId: template.id, closingSessionId: session.id, createdById: ids.admin,
      packageType: RUN, vatRateBp: 1900, status: "presented", presentedAt: new Date(),
      lineItems: { create: [{ position: 1, description: "HTTP Paket", quantity: 1, quantityMilli: 1000, unitPriceCents: 500000, totalCents: 500000 }] },
    },
  });
  await db.closingSession.update({ where: { id: session.id }, data: { activeOfferId: offer.id } });

  const snapshot = await createContractSnapshot(session.id, ids.admin);
  assert.ok(snapshot.ok, snapshot.ok ? "" : snapshot.error);
  await renderAndFreezeScript(session.id, { force: true });

  // ── Kundenseite ───────────────────────────────────────────────────────────
  await step("Kundenseite zeigt die im Admin gepflegten Checkbox-Texte", async () => {
    const res = await fetch(`${BASE}/closing/${token}`);
    assert.equal(res.status, 200);
    const html = await res.text();
    assert.ok(html.includes("HTTP: AGB akzeptiert."));
    assert.ok(html.includes("HTTP: Aufzeichnung eingewilligt."));
    assert.ok(html.includes("Verbindlich best"));
  });

  await step("unbekannter Token führt zu keiner Preisgabe", async () => {
    const res = await fetch(`${BASE}/closing/nicht-existierender-token-0000`);
    const html = await res.text();
    assert.ok(html.includes("Link ungültig"));
    assert.ok(!html.includes("HTTP: AGB akzeptiert."));
  });

  let agbId = "";
  let recId = "";
  await step("State-API liefert die eingefrorene Dokumentversion", async () => {
    const res = await fetch(`${BASE}/api/closing/state?token=${token}`);
    assert.equal(res.status, 200);
    const state = (await res.json()) as {
      status: string;
      snapshotReady: boolean;
      offer: { oneTimeNet: string };
      consents: Array<{ definitionId: string; consentType: string; document: { versionLabel: string } | null }>;
    };
    assert.equal(state.status, "consent_pending");
    assert.equal(state.snapshotReady, true);
    assert.equal(state.consents.length, 2);
    agbId = state.consents.find((c) => c.consentType === "ACCEPTANCE")!.definitionId;
    recId = state.consents.find((c) => c.consentType === "RECORDING_CONSENT")!.definitionId;
    assert.equal(state.consents.find((c) => c.consentType === "ACCEPTANCE")!.document!.versionLabel, "1.0");
  });

  // ── Dokumentzugriff ───────────────────────────────────────────────────────
  await step("eigenes Vertragsdokument ist abrufbar", async () => {
    const res = await fetch(`${BASE}/api/closing/document?token=${token}&versionId=${ids.version}`);
    assert.equal(res.status, 200);
    assert.ok((await res.text()).includes("HTTP-AGB-INHALT"));
  });

  await step("fremdes Dokument wird abgewiesen", async () => {
    const res = await fetch(`${BASE}/api/closing/document?token=${token}&versionId=${ids.foreign}`);
    assert.equal(res.status, 403);
    assert.ok(!(await res.text()).includes("VERTRAULICH"));
  });

  await step("Dokumentabruf ohne Token wird abgewiesen", async () => {
    const res = await fetch(`${BASE}/api/closing/document?versionId=${ids.version}`);
    assert.equal(res.status, 400);
  });

  // ── Bestätigung ───────────────────────────────────────────────────────────
  async function confirm(accepted: string[]) {
    const res = await fetch(`${BASE}/api/closing/confirm`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, accepted }),
    });
    return { status: res.status, body: await res.json() };
  }

  await step("unvollständige Bestätigung wird serverseitig abgelehnt", async () => {
    const result = await confirm([agbId]);
    assert.equal(result.status, 422);
    assert.deepEqual((result.body as { missing: string[] }).missing, ["Aufzeichnung"]);
    const events = await db.consentAuditEvent.count({ where: { closingSessionId: session.id } });
    assert.equal(events, 0, "bei Ablehnung wird nichts protokolliert");
  });

  await step("untergeschobene Kennung erzeugt keine Erklärung", async () => {
    const result = await confirm(["nicht-existierende-id"]);
    assert.equal(result.status, 422);
    const events = await db.consentAuditEvent.count({ where: { closingSessionId: session.id } });
    assert.equal(events, 0);
  });

  await step("vollständige Bestätigung wird protokolliert", async () => {
    const result = await confirm([agbId, recId]);
    assert.equal(result.status, 200);
    const body = result.body as { recorded: number; allRequiredConfirmed: boolean; state: { status: string } };
    assert.equal(body.recorded, 2);
    assert.equal(body.allRequiredConfirmed, true);
    assert.equal(body.state.status, "consents_confirmed");
  });

  await step("wiederholtes Absenden erzeugt keine weiteren Events", async () => {
    for (let i = 0; i < 3; i++) await confirm([agbId, recId]);
    const events = await db.consentAuditEvent.count({ where: { closingSessionId: session.id } });
    assert.equal(events, 2);
  });

  // ── Token-Lebenszyklus ────────────────────────────────────────────────────
  await step("widerrufener Token sperrt den Zugang", async () => {
    await db.closingSession.update({ where: { id: session.id }, data: { tokenRevokedAt: new Date() } });
    const api = await fetch(`${BASE}/api/closing/state?token=${token}`);
    assert.equal(api.status, 401);
    assert.equal((await api.json()).reason, "revoked");
    const page = await fetch(`${BASE}/closing/${token}`);
    assert.ok((await page.text()).includes("Zugang widerrufen"));
    await db.closingSession.update({ where: { id: session.id }, data: { tokenRevokedAt: null } });
  });

  await step("abgelaufener Token sperrt den Zugang", async () => {
    await db.closingSession.update({
      where: { id: session.id },
      data: { tokenExpiresAt: new Date(Date.now() - 3600e3) },
    });
    const api = await fetch(`${BASE}/api/closing/state?token=${token}`);
    assert.equal(api.status, 401);
    assert.equal((await api.json()).reason, "expired");
    await db.closingSession.update({
      where: { id: session.id },
      data: { tokenExpiresAt: new Date(Date.now() + 72 * 3600e3) },
    });
  });

  // ── Admin-Endpunkte ───────────────────────────────────────────────────────
  await step("Admin-Endpunkte sind ohne Anmeldung gesperrt", async () => {
    const checks: Array<[string, RequestInit]> = [
      [`/api/admin/contract-documents/download?versionId=${ids.version}`, {}],
      ["/api/admin/invoices/preview?invoiceId=x", {}],
      ["/api/admin/invoices/pdf?invoiceId=x", {}],
      ["/api/admin/template-preview", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" }],
      ["/api/admin/contract-documents/upload", { method: "POST" }],
    ];
    for (const [path, init] of checks) {
      const res = await fetch(`${BASE}${path}`, init);
      assert.equal(res.status, 403, `${path} muss 403 liefern, war ${res.status}`);
    }
  });

  // ── Stripe ────────────────────────────────────────────────────────────────
  await step("Stripe-Webhook ohne gültige Signatur wird abgewiesen", async () => {
    const payload = JSON.stringify({ id: "evt_x", type: "checkout.session.completed" });
    const invalid = await fetch(`${BASE}/api/stripe/webhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "stripe-signature": "t=1,v1=deadbeef" },
      body: payload,
    });
    assert.equal(invalid.status, 400);

    const missing = await fetch(`${BASE}/api/stripe/webhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
    });
    assert.equal(missing.status, 400);
  });

  await step("Stripe-Zahlung aktiviert den Kunden — doppelte Zustellung nicht erneut", async () => {
    await db.closingSession.update({ where: { id: session.id }, data: { status: "contract_closed" } });
    const event = {
      id: `evt_${RUN}`,
      object: "event",
      type: "checkout.session.completed",
      data: {
        object: {
          id: `cs_${RUN}`,
          object: "checkout.session",
          mode: "payment",
          amount_total: 595000,
          metadata: {
            type: "sales_payment",
            companyId: ids.company,
            closingSessionId: session.id,
            offerId: offer.id,
          },
        },
      },
    };
    const payload = JSON.stringify(event);

    const first = await fetch(`${BASE}/api/stripe/webhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "stripe-signature": signStripe(payload) },
      body: payload,
    });
    assert.equal(first.status, 200);
    assert.equal((await first.json()).duplicate, undefined);

    const second = await fetch(`${BASE}/api/stripe/webhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "stripe-signature": signStripe(payload) },
      body: payload,
    });
    assert.equal(second.status, 200);
    assert.equal((await second.json()).duplicate, true);

    const company = await db.company.findUnique({ where: { id: ids.company } });
    assert.equal(company!.status, "ACTIVE");
    assert.ok(company!.activatedAt);

    const activations = await db.closingEvent.count({
      where: { closingSessionId: session.id, eventType: "customer_activated" },
    });
    assert.equal(activations, 1, "genau eine Aktivierung trotz doppeltem Webhook");
  });

  // ── Aufräumen ─────────────────────────────────────────────────────────────
  await db.stripeWebhookEvent.deleteMany({ where: { id: `evt_${RUN}` } });
  await db.consentAuditEvent.deleteMany({ where: { companyId: ids.company } });
  await db.closingEvent.deleteMany({ where: { companyId: ids.company } });
  await db.contractSnapshot.deleteMany({ where: { companyId: ids.company } });
  await db.offerLineItem.deleteMany({ where: { offerId: offer.id } });
  await db.offer.deleteMany({ where: { companyId: ids.company } });
  await db.closingSession.deleteMany({ where: { companyId: ids.company } });
  await db.appointment.deleteMany({ where: { companyId: ids.company } });
  await db.consentDefinitionRevision.deleteMany({ where: { definition: { key: { startsWith: RUN } } } });
  await db.consentDefinition.deleteMany({ where: { key: { startsWith: RUN } } });
  await db.legalDocument.deleteMany({ where: { id: { in: [ids.version, ids.foreign] } } });
  await db.contractDocument.deleteMany({ where: { id: ids.doc } });
  await db.closingScriptRevision.deleteMany({ where: { script: { key: { startsWith: RUN } } } });
  await db.closingScript.deleteMany({ where: { key: { startsWith: RUN } } });
  await db.offerTemplate.deleteMany({ where: { id: template.id } });
  await db.company.deleteMany({ where: { id: ids.company } });
  await db.user.deleteMany({ where: { id: ids.admin } });
  await db.$disconnect();

  console.log(
    `\n${passed} Prüfungen erfolgreich${failures.length > 0 ? `, ${failures.length} fehlgeschlagen` : ""}.\n`
  );
  if (failures.length > 0) {
    console.error("Fehlgeschlagen:", failures.join(", "));
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error("HTTP-Lauf abgebrochen:", err);
  process.exitCode = 1;
});
