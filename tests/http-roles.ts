/**
 * Rollenabgrenzung an der HTTP-Ebene: echter Login als Closer, dann Zugriff
 * auf fremde Bereiche und fremde Closings.
 *
 *   BASE_URL=http://localhost:3100 npx tsx tests/http-roles.ts
 */
import assert from "node:assert/strict";
import bcrypt from "bcryptjs";

const BASE = process.env.BASE_URL ?? "http://localhost:3100";
const RUN = `role_${Date.now().toString(36)}`;
const PASSWORD = "TestPasswort!2026";

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

/** Meldet sich per Credentials an und liefert den Cookie-Header zurück. */
async function login(email: string, password: string): Promise<string> {
  const jar = new Map<string, string>();
  const collect = (res: Response) => {
    for (const raw of res.headers.getSetCookie?.() ?? []) {
      const [pair] = raw.split(";");
      const index = pair.indexOf("=");
      if (index > 0) jar.set(pair.slice(0, index).trim(), pair.slice(index + 1).trim());
    }
  };
  const header = () => [...jar].map(([k, v]) => `${k}=${v}`).join("; ");

  const csrfRes = await fetch(`${BASE}/api/auth/csrf`);
  collect(csrfRes);
  const { csrfToken } = (await csrfRes.json()) as { csrfToken: string };

  const res = await fetch(`${BASE}/api/auth/callback/credentials`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", cookie: header() },
    body: new URLSearchParams({ csrfToken, email, password, redirect: "false", json: "true" }),
    redirect: "manual",
  });
  collect(res);
  return header();
}

async function sessionRole(cookie: string): Promise<string | null> {
  const res = await fetch(`${BASE}/api/auth/session`, { headers: { cookie } });
  // Ohne gültige Sitzung liefert NextAuth `null` statt eines Objekts.
  const data = (await res.json()) as { user?: { role?: string } } | null;
  return data?.user?.role ?? null;
}

/** Folgt keiner Weiterleitung — so wird die Umleitung selbst sichtbar. */
async function visit(path: string, cookie: string) {
  const res = await fetch(`${BASE}${path}`, { headers: { cookie }, redirect: "manual" });
  return { status: res.status, location: res.headers.get("location") };
}

async function main() {
  const { db } = await import("../src/lib/db");

  const ids = {
    admin: `${RUN}_admin`,
    closerA: `${RUN}_closer_a`,
    closerB: `${RUN}_closer_b`,
    companyA: `${RUN}_company_a`,
    companyB: `${RUN}_company_b`,
    sessionA: `${RUN}_session_a`,
    sessionB: `${RUN}_session_b`,
  };
  const hash = await bcrypt.hash(PASSWORD, 12);

  console.log("\n═══ Rollenabgrenzung ═══\n");

  await db.user.createMany({
    data: [
      { id: ids.admin, email: `${RUN}-admin@okun.test`, name: "Admin", password: hash, role: "ADMIN", firstLogin: false },
      { id: ids.closerA, email: `${RUN}-a@okun.test`, name: "Closer A", password: hash, role: "CLOSER", firstLogin: false },
      { id: ids.closerB, email: `${RUN}-b@okun.test`, name: "Closer B", password: hash, role: "CLOSER", firstLogin: false },
    ],
  });
  await db.company.createMany({
    data: [
      { id: ids.companyA, name: "Kunde A", status: "ONBOARDING", projectPhase: "onboarding", leadStatus: "lead", assignedCloserId: ids.closerA },
      { id: ids.companyB, name: "Kunde B", status: "ONBOARDING", projectPhase: "onboarding", leadStatus: "lead", assignedCloserId: ids.closerB },
    ],
  });
  await db.closingSession.createMany({
    data: [
      { id: ids.sessionA, clientTokenHash: `${RUN}_a`, tokenExpiresAt: new Date(Date.now() + 3600e3), companyId: ids.companyA, closerId: ids.closerA, status: "closing_scheduled" },
      { id: ids.sessionB, clientTokenHash: `${RUN}_b`, tokenExpiresAt: new Date(Date.now() + 3600e3), companyId: ids.companyB, closerId: ids.closerB, status: "closing_scheduled" },
    ],
  });

  const closerCookie = await login(`${RUN}-a@okun.test`, PASSWORD);
  const adminCookie = await login(`${RUN}-admin@okun.test`, PASSWORD);

  await step("Anmeldung als Closer und als Admin funktioniert", async () => {
    assert.equal(await sessionRole(closerCookie), "CLOSER");
    assert.equal(await sessionRole(adminCookie), "ADMIN");
  });

  await step("Closer erreicht seinen Sales-Bereich", async () => {
    for (const path of ["/admin/sales", "/admin/sales/leads", `/admin/sales/closing/${ids.sessionA}`]) {
      const res = await visit(path, closerCookie);
      assert.equal(res.status, 200, `${path} → ${res.status} ${res.location ?? ""}`);
    }
  });

  await step("Closer wird aus fremden Adminbereichen umgeleitet", async () => {
    const blocked = [
      "/admin/dashboard",
      "/admin/kunden",
      "/admin/lernen",
      "/admin/methodik",
      "/admin/strategy",
      "/admin/dokumente",
      "/admin/termine",
      "/admin/einstellungen",
      "/admin/einstellungen/team",
      "/admin/einstellungen/vertragsdokumente",
      "/admin/einstellungen/erklaerungen",
      "/admin/einstellungen/closing-scripts",
      "/admin/einstellungen/vorlagen",
      "/admin/einstellungen/unternehmen",
    ];
    for (const path of blocked) {
      const res = await visit(path, closerCookie);
      assert.equal(res.status, 307, `${path} hätte umgeleitet werden müssen (war ${res.status})`);
      assert.ok(
        res.location?.endsWith("/admin/sales"),
        `${path} → ${res.location} statt /admin/sales`
      );
    }
  });

  await step("Closer sieht fremde Leads und Closings nicht", async () => {
    const lead = await visit(`/admin/sales/leads/${ids.companyB}`, closerCookie);
    assert.equal(lead.status, 307, `fremder Lead lieferte ${lead.status}`);
    const closing = await visit(`/admin/sales/closing/${ids.sessionB}`, closerCookie);
    assert.equal(closing.status, 307, `fremdes Closing lieferte ${closing.status}`);
  });

  await step("Closer kann keine Vertragsdokumente hochladen oder abrufen", async () => {
    const upload = await fetch(`${BASE}/api/admin/contract-documents/upload`, {
      method: "POST",
      headers: { cookie: closerCookie },
    });
    assert.equal(upload.status, 403);
    const preview = await fetch(`${BASE}/api/admin/template-preview`, {
      method: "POST",
      headers: { "Content-Type": "application/json", cookie: closerCookie },
      body: JSON.stringify({ html: "<p>x</p>" }),
    });
    assert.equal(preview.status, 403);
  });

  await step("Admin erreicht alle Bereiche", async () => {
    for (const path of [
      "/admin/dashboard",
      "/admin/einstellungen/team",
      "/admin/einstellungen/vertragsdokumente",
      `/admin/sales/closing/${ids.sessionB}`,
    ]) {
      const res = await visit(path, adminCookie);
      assert.equal(res.status, 200, `${path} → ${res.status} ${res.location ?? ""}`);
    }
  });

  await step("Deaktiviertes Konto kann sich nicht mehr anmelden", async () => {
    await db.user.update({
      where: { id: ids.closerA },
      data: { deactivatedAt: new Date() },
    });
    const freshCookie = await login(`${RUN}-a@okun.test`, PASSWORD);
    assert.equal(await sessionRole(freshCookie), null, "Anmeldung hätte scheitern müssen");
  });

  await step("Bestehende Sitzung eines deaktivierten Kontos verliert den Zugang", async () => {
    // closerCookie stammt aus der Zeit vor der Deaktivierung.
    const res = await visit("/admin/sales", closerCookie);
    assert.equal(res.status, 307, `deaktiviertes Konto kam durch (${res.status})`);
    assert.ok(res.location?.includes("/dashboard") || res.location?.includes("/login"));
  });

  await db.closingSession.deleteMany({ where: { id: { in: [ids.sessionA, ids.sessionB] } } });
  await db.company.deleteMany({ where: { id: { in: [ids.companyA, ids.companyB] } } });
  await db.user.deleteMany({ where: { id: { in: [ids.admin, ids.closerA, ids.closerB] } } });
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
  console.error("Rollen-Lauf abgebrochen:", err);
  process.exitCode = 1;
});
