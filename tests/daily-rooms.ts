/**
 * Videoraum-Erstellung gegen einen Daily.co-Nachbau.
 *
 * Geprüft werden genau die beiden Fälle, an denen die Erstellung bisher
 * scheiterte: eine Ablaufzeit in der Vergangenheit und ein bereits
 * existierender Raumname.
 *
 * Ausführen: npx tsx tests/daily-rooms.ts
 */
import assert from "node:assert/strict";
import { startFakeDaily } from "./harness/fake-services";

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

async function main() {
  const daily = await startFakeDaily();
  process.env.DAILY_API_BASE = `http://127.0.0.1:${daily.port}`;
  process.env.DAILY_API_KEY = "test-key";

  const { ensureDailyRoom, buildRoomName, resolveExpiry } = await import("../src/lib/daily");

  console.log("\n═══ Daily.co Videoräume ═══\n");

  await step("Raumname enthält nur zulässige Zeichen", async () => {
    const name = buildRoomName("closing", "cmtwx6s9k0000ab7dq1z2x3y4");
    assert.match(name, /^[a-z0-9_-]+$/);
    assert.ok(name.startsWith("closing-"));
  });

  await step("Ablaufzeit liegt nie in der Vergangenheit", async () => {
    const laengstVorbei = new Date(Date.now() - 30 * 86400_000);
    const exp = resolveExpiry(laengstVorbei);
    assert.ok(
      exp > Math.floor(Date.now() / 1000) + 3600,
      "Ablaufzeit muss mindestens eine Stunde in der Zukunft liegen"
    );
  });

  await step("Ablaufzeit deckt einen künftigen Termin ab", async () => {
    const inZehnTagen = new Date(Date.now() + 10 * 86400_000);
    const exp = resolveExpiry(inZehnTagen);
    assert.ok(exp > Math.floor(inZehnTagen.getTime() / 1000), "Termin muss abgedeckt sein");
  });

  await step("Raum für einen vergangenen Termin wird trotzdem angelegt", async () => {
    // Genau der Fall aus dem Produktivsystem: Termin 12:00–13:00, Raum wird
    // erst um 15:42 angelegt. Ohne Anhebung von exp lehnt Daily ab.
    const gestern = new Date(Date.now() - 26 * 3600_000);
    const result = await ensureDailyRoom({ name: "closing-vergangen", endsAt: gestern });
    assert.ok(result.ok, result.ok ? "" : result.error);
    if (!result.ok) return;
    assert.equal(result.reused, false);
    assert.match(result.url, /^https:\/\/okun\.daily\.co\//);
  });

  await step("Vorhandener Raum wird weiterverwendet statt abzubrechen", async () => {
    const ersteAnlage = await ensureDailyRoom({
      name: "closing-doppelt",
      endsAt: new Date(Date.now() + 3600_000),
    });
    assert.ok(ersteAnlage.ok);

    const zweiteAnlage = await ensureDailyRoom({
      name: "closing-doppelt",
      endsAt: new Date(Date.now() + 3600_000),
    });
    assert.ok(zweiteAnlage.ok, zweiteAnlage.ok ? "" : zweiteAnlage.error);
    if (!zweiteAnlage.ok || !ersteAnlage.ok) return;
    assert.equal(zweiteAnlage.reused, true, "zweiter Aufruf muss den Raum wiederverwenden");
    assert.equal(zweiteAnlage.url, ersteAnlage.url, "gleiche URL wie beim ersten Mal");
  });

  await step("Abgelaufener Raum wird verlängert statt abgelehnt", async () => {
    // Raum mit längst abgelaufener Frist direkt in den Nachbau setzen.
    daily.state.rooms.set("closing-abgelaufen", {
      name: "closing-abgelaufen",
      url: "https://okun.daily.co/closing-abgelaufen",
      exp: Math.floor(Date.now() / 1000) - 7200,
    });

    const result = await ensureDailyRoom({
      name: "closing-abgelaufen",
      endsAt: new Date(Date.now() - 3600_000),
    });
    assert.ok(result.ok, result.ok ? "" : result.error);
    if (!result.ok) return;
    assert.equal(result.reused, true);
    assert.equal(result.extended, true, "Ablaufzeit hätte verlängert werden müssen");

    const room = daily.state.rooms.get("closing-abgelaufen")!;
    assert.ok(room.exp > Math.floor(Date.now() / 1000), "Raum ist wieder gültig");
  });

  await step("Echte Fehlermeldung von Daily wird durchgereicht", async () => {
    // Daily lehnt unzulässige Raumnamen ab. Der Grund muss im Admin sichtbar
    // werden statt hinter einem allgemeinen Text zu verschwinden.
    const result = await ensureDailyRoom({ name: "un gültiger name", endsAt: new Date() });
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.match(result.error, /Daily\.co meldete/);
      assert.match(result.error, /letters, numbers, dash and underscore/);
    }
  });

  await step("Nicht erreichbares Daily wird als solches gemeldet", async () => {
    const base = process.env.DAILY_API_BASE;
    process.env.DAILY_API_BASE = "http://127.0.0.1:1";
    const result = await ensureDailyRoom({ name: "closing-offline", endsAt: new Date() });
    assert.equal(result.ok, false);
    if (!result.ok) assert.match(result.error, /nicht erreichbar/);
    process.env.DAILY_API_BASE = base;
  });

  await step("Fehlender API-Key wird klar benannt", async () => {
    const key = process.env.DAILY_API_KEY;
    delete process.env.DAILY_API_KEY;
    const result = await ensureDailyRoom({ name: "closing-ohne-key", endsAt: new Date() });
    assert.equal(result.ok, false);
    if (!result.ok) assert.match(result.error, /DAILY_API_KEY/);
    process.env.DAILY_API_KEY = key;
  });

  await daily.close();

  console.log(
    `\n${passed} Prüfungen erfolgreich${failures.length > 0 ? `, ${failures.length} fehlgeschlagen` : ""}.\n`
  );
  if (failures.length > 0) {
    console.error("Fehlgeschlagen:", failures.join(", "));
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error("Daily-Lauf abgebrochen:", err);
  process.exitCode = 1;
});
