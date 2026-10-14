/**
 * End-to-End-Tests des OKUN Radar gegen eine echte Datenbank.
 *
 *   DATABASE_URL=postgresql://… npx tsx tests/radar-e2e.ts
 *
 * Geprüft wird, was sich nur mit Datenbank prüfen lässt: Speichern,
 * Wiederaufnahme, gleichzeitige Eingaben, doppelter Abschluss — und vor allem
 * die Grenze zur Kundenseite. Die Route wird dafür direkt aufgerufen, mit
 * echtem Token, echter Datenbank und ohne Umweg über einen laufenden Server.
 */
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { db } from "../src/lib/db";
import { hashToken, generateToken } from "../src/lib/closing/token";
import { KATALOG_VERSION } from "../src/lib/radar/catalog";
import {
  ladeLaufendesRadar,
  ladeRadar,
  schliesseAb,
  setzeAntwort,
  setzeCursor,
  setzeNotiz,
  setzePhase,
  setzeProfil,
  setzeSpotlight,
  starteRadar,
  werteAus,
  blendeRadarAus,
} from "../src/lib/radar/service";
import { closerAnsicht, kundenAnsicht } from "../src/lib/radar/views";
import { radarUebernahme } from "../src/lib/radar/blueprint-handover";
import { GET as radarGet, POST as radarPost } from "../src/app/api/closing/radar/route";

const LAUF = `radar_${Date.now().toString(36)}`;
let passed = 0;
const fehlgeschlagen: string[] = [];

async function schritt(name: string, fn: () => Promise<void>) {
  try {
    await fn();
    passed++;
    console.log(`  ok   ${name}`);
  } catch (err) {
    fehlgeschlagen.push(name);
    console.error(`FEHLT  ${name}`);
    console.error(`       ${err instanceof Error ? err.message : String(err)}`);
  }
}

/**
 * Ruft die Kundenroute so auf, wie es der Browser des Interessenten täte.
 *
 * NextRequest und nicht Request: Die Route liest `nextUrl`, und das gibt es
 * nur auf dem Next-Typ. Ein einfaches Request würde hier eine Lücke lassen,
 * die es im Betrieb nicht gibt.
 */
function anfrage(url: string, body?: unknown): NextRequest {
  return body === undefined
    ? new NextRequest(url)
    : new NextRequest(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
}

async function main() {
  // ── Aufbau ───────────────────────────────────────────────────────────────
  const closer = await db.user.create({
    data: {
      email: `${LAUF}.closer@example.test`,
      name: "Test-Closer",
      password: "x",
      role: "CLOSER",
    },
  });
  const company = await db.company.create({
    data: {
      name: `${LAUF} Muster GmbH`,
      industry: "Elektrotechnik",
      contactPerson: "Frau Muster",
    },
  });
  const token = generateToken();
  const closing = await db.closingSession.create({
    data: {
      companyId: company.id,
      closerId: closer.id,
      clientTokenHash: hashToken(token),
      tokenExpiresAt: new Date(Date.now() + 3600_000),
      status: "closing_in_progress",
    },
  });
  const url = `http://test.local/api/closing/radar?token=${encodeURIComponent(token)}`;

  let radarId = "";

  // ── Start und Vorbelegung ────────────────────────────────────────────────
  await schritt("Start belegt das Profil aus dem CRM vor, ohne etwas zu erfinden", async () => {
    const d = await starteRadar({
      closingSessionId: closing.id,
      companyId: company.id,
      closerId: closer.id,
    });
    radarId = d.id;
    assert.equal(d.profil.firma, `${LAUF} Muster GmbH`);
    assert.equal(d.profil.branche, "Elektrotechnik");
    // Die Mitarbeiterzahl steht im CRM nicht — sie darf nicht geraten werden.
    assert.equal(d.profil.groesse, undefined);
    assert.equal(d.katalogVersion, KATALOG_VERSION);
  });

  await schritt("ein zweiter Start nimmt dieselbe Analyse wieder auf", async () => {
    const wieder = await starteRadar({
      closingSessionId: closing.id,
      companyId: company.id,
      closerId: closer.id,
    });
    assert.equal(wieder.id, radarId, "Es darf keine zweite halbe Analyse entstehen");
    const anzahl = await db.radarSession.count({ where: { closingSessionId: closing.id } });
    assert.equal(anzahl, 1);
  });

  await schritt("der Interessent sieht das Radar erst, wenn es aufgeschaltet ist", async () => {
    const laufend = await ladeLaufendesRadar(closing.id);
    assert.ok(laufend, "Nach dem Start muss es aufgeschaltet sein");
    await blendeRadarAus(closing.id);
    assert.equal(await ladeLaufendesRadar(closing.id), null);
    const res = await radarGet(anfrage(url));
    assert.equal((await res.json()).radar, null);
    // Wieder aufschalten für die weiteren Schritte.
    await starteRadar({ closingSessionId: closing.id, companyId: company.id, closerId: closer.id });
  });

  // ── Phase 1 ──────────────────────────────────────────────────────────────
  await schritt("der Interessent kann sein Profil selbst ergänzen", async () => {
    const res = await radarPost(
      anfrage(url, {
        token,
        aktion: "profil",
        profil: {
          firma: `${LAUF} Muster GmbH`,
          branche: "Elektrotechnik",
          groesse: "g_25_49",
          bereiche: ["b_auftrag", "b_buchhaltung"],
          herausforderung: "Zu viel Papier zwischen Baustelle und Büro.",
          // Ein Feld, das es nicht gibt — muss stillschweigend verworfen werden.
          geheim: "sollte verschwinden",
        },
      }) as never
    );
    assert.equal(res.status, 200);
    const d = await ladeRadar(radarId);
    assert.equal(d?.profil.groesse, "g_25_49");
    assert.deepEqual(d?.profil.bereiche, ["b_auftrag", "b_buchhaltung"]);
    assert.equal((d?.profil as Record<string, unknown>).geheim, undefined);
  });

  // ── Phase 2 ──────────────────────────────────────────────────────────────
  await schritt("der Berater schaltet eine Frage auf, der Interessent sieht sie", async () => {
    await setzePhase(radarId, "potenzial", "P1");
    const res = await radarGet(anfrage(url));
    const { radar } = (await res.json()) as { radar: ReturnType<typeof kundenAnsicht> };
    assert.equal(radar.frage?.key, "P1");
    assert.equal(radar.frage?.optionen.length, 4);
    assert.ok(radar.frage?.frage.includes("Papier"));
  });

  await schritt("der Interessent beantwortet, der Berater sieht es", async () => {
    const res = await radarPost(
      anfrage(url, { token, aktion: "antwort", frageKey: "P1", optionKeys: ["P1-C"] }) as never
    );
    assert.equal(res.status, 200);
    const d = await ladeRadar(radarId);
    assert.deepEqual(d?.antworten.find((a) => a.frageKey === "P1")?.optionKeys, ["P1-C"]);
    assert.equal(d?.quellen.P1, "client", "Die Herkunft muss festgehalten werden");
    const closer2 = closerAnsicht(d!, KATALOG_VERSION);
    assert.equal(closer2.fragen.find((f) => f.key === "P1")?.quelle, "client");
  });

  await schritt("eine Antwort lässt sich korrigieren — die letzte gilt", async () => {
    await radarPost(
      anfrage(url, { token, aktion: "antwort", frageKey: "P1", optionKeys: ["P1-B"] }) as never
    );
    const d = await ladeRadar(radarId);
    assert.deepEqual(d?.antworten.find((a) => a.frageKey === "P1")?.optionKeys, ["P1-B"]);
    const zeilen = await db.radarAnswer.count({ where: { radarSessionId: radarId, frageKey: "P1" } });
    assert.equal(zeilen, 1, "Eine Korrektur darf keine zweite Zeile erzeugen");
  });

  await schritt("gleichzeitige Eingaben beider Seiten gehen nicht verloren", async () => {
    // Beide schreiben im selben Moment auf verschiedene Fragen.
    await Promise.all([
      setzeAntwort({ radarSessionId: radarId, frageKey: "P2", optionKeys: ["P2-D"], quelle: "closer" }),
      radarPost(
        anfrage(url, { token, aktion: "antwort", frageKey: "P3", optionKeys: ["P3-B"] }) as never
      ),
    ]);
    const d = await ladeRadar(radarId);
    assert.deepEqual(d?.antworten.find((a) => a.frageKey === "P2")?.optionKeys, ["P2-D"]);
    assert.deepEqual(d?.antworten.find((a) => a.frageKey === "P3")?.optionKeys, ["P3-B"]);
  });

  await schritt("gleichzeitige Eingaben auf dieselbe Frage enden eindeutig", async () => {
    await Promise.all([
      setzeAntwort({ radarSessionId: radarId, frageKey: "P5", optionKeys: ["P5-B"], quelle: "closer" }),
      setzeAntwort({ radarSessionId: radarId, frageKey: "P5", optionKeys: ["P5-C"], quelle: "client" }),
    ]);
    const d = await ladeRadar(radarId);
    const antwort = d?.antworten.find((a) => a.frageKey === "P5");
    assert.equal(antwort?.optionKeys.length, 1, "Es darf genau eine Antwort übrig bleiben");
    assert.ok(["P5-B", "P5-C"].includes(antwort!.optionKeys[0]));
    const zeilen = await db.radarAnswer.count({ where: { radarSessionId: radarId, frageKey: "P5" } });
    assert.equal(zeilen, 1);
  });

  await schritt("die Revision zählt bei jeder Änderung hoch", async () => {
    const vorher = (await ladeRadar(radarId))!.rev;
    await setzeCursor(radarId, "P6");
    const nachher = (await ladeRadar(radarId))!.rev;
    assert.ok(nachher > vorher, `rev blieb bei ${vorher}`);
  });

  await schritt("eine Frage, die hier nicht gestellt wird, nimmt keine Antwort an", async () => {
    // P8 setzt voraus, dass mehrere Abläufe automatisiert sind (P7-A).
    const res = await radarPost(
      anfrage(url, { token, aktion: "antwort", frageKey: "P8", optionKeys: ["P8-A"] }) as never
    );
    assert.equal(res.status, 409);
    const d = await ladeRadar(radarId);
    assert.equal(d?.antworten.find((a) => a.frageKey === "P8"), undefined);
  });

  await schritt("eine erfundene Antwortoption wird verworfen", async () => {
    await radarPost(
      anfrage(url, { token, aktion: "antwort", frageKey: "P6", optionKeys: ["P6-GOLD"] }) as never
    );
    const d = await ladeRadar(radarId);
    assert.deepEqual(d?.antworten.find((a) => a.frageKey === "P6")?.optionKeys, []);
  });

  // ── Verbindungsabbruch und Wiederaufnahme ────────────────────────────────
  await schritt("nach einem Abbruch steht der Stand vollständig auf dem Server", async () => {
    // Ein Abbruch ist für den Server nichts weiter als eine ausbleibende
    // Anfrage. Entscheidend ist, dass der nächste Aufruf alles wiederfindet.
    const res = await radarGet(anfrage(url));
    const { radar } = (await res.json()) as { radar: ReturnType<typeof kundenAnsicht> };
    assert.equal(radar.antworten.P1?.[0], "P1-B");
    assert.equal(radar.antworten.P2?.[0], "P2-D");
    assert.ok(radar.fortschritt.beantwortet >= 4);
    assert.ok(radar.beantworteteFragen.length >= 4, "Korrigieren braucht die Fragen im Volltext");
  });

  // ── Die Grenze zur Kundenseite ───────────────────────────────────────────
  await schritt("interne Notizen erreichen die Kundenseite unter keinen Umständen", async () => {
    const geheimnis = "INTERN: Entscheider ist der Juniorchef, Vater blockt.";
    await setzeNotiz(radarId, geheimnis);
    const res = await radarGet(anfrage(url));
    const roh = await res.text();
    assert.ok(!roh.includes(geheimnis), "Die Notiz steht in der Antwort an den Kunden");
    assert.ok(!roh.includes("internalNotes"), "Schon das Feld darf nicht auftauchen");
  });

  await schritt("Gewichte, Belege und Absichten erreichen die Kundenseite nicht", async () => {
    const res = await radarGet(anfrage(url));
    const roh = await res.text();
    for (const verboten of [
      "signale",
      "signalValue",
      "beleg",
      "absicht",
      "stufeGrund",
      "widersprueche",
      "auffaellig",
      "internalWeight",
      "closerNotiz",
      "schwellen",
    ]) {
      assert.ok(!roh.includes(verboten), `„${verboten}“ steht in der Antwort an den Kunden`);
    }
    // Gegenprobe: Der Fragetext ist da, die Punkte sind es nicht.
    assert.ok(roh.includes("Papier"));
  });

  await schritt("das Ergebnis sieht der Kunde erst nach der Freigabe", async () => {
    await setzeSpotlight(radarId, "sp_rechnung");
    for (const [frageKey, option] of [
      ["P4", "P4-C"], ["P7", "P7-C"], ["P9", "P9-RECHNUNG"], ["P10", "P10-C"],
      ["P11", "P11-B"], ["P12", "P12-C"], ["S1", "S1-C"], ["S2", "S2-C"],
      ["S3", "S3-DOPPELT"], ["S4", "S4-A"], ["S5", "S5-A"],
    ] as const) {
      await setzeAntwort({ radarSessionId: radarId, frageKey, optionKeys: [option], quelle: "closer" });
    }
    const ergebnis = await werteAus(radarId);
    assert.ok(ergebnis, "Die Auswertung muss entstehen");

    const res = await radarGet(anfrage(url));
    const { radar } = (await res.json()) as { radar: ReturnType<typeof kundenAnsicht> };
    assert.equal(radar.ergebnis, null, "Ohne Freigabe sieht der Kunde kein Ergebnis");

    const { gibErgebnisFrei } = await import("../src/lib/radar/service");
    await gibErgebnisFrei(radarId);
    const res2 = await radarGet(anfrage(url));
    const { radar: radar2 } = (await res2.json()) as { radar: ReturnType<typeof kundenAnsicht> };
    assert.ok(radar2.ergebnis, "Nach der Freigabe muss es da sein");
    assert.ok(radar2.ergebnis!.stufeTitel.length > 5);
    assert.ok(radar2.ergebnis!.felder.every((f) => f.belege.length > 0), "Kein Feld ohne Beleg");
  });

  // ── Abschluss ────────────────────────────────────────────────────────────
  await schritt("ein zweiter Abschluss erzeugt kein zweites Ergebnis", async () => {
    const eins = await schliesseAb(radarId);
    const zwei = await schliesseAb(radarId);
    assert.equal(eins.warBereitsAbgeschlossen, false);
    assert.equal(zwei.warBereitsAbgeschlossen, true);
    assert.equal(eins.ergebnis?.berechnetAm, zwei.ergebnis?.berechnetAm, "Das Ergebnis muss eingefroren sein");
  });

  await schritt("eine abgeschlossene Analyse nimmt keine Antwort mehr entgegen", async () => {
    const res = await radarPost(
      anfrage(url, { token, aktion: "antwort", frageKey: "P1", optionKeys: ["P1-A"] }) as never
    );
    assert.equal(res.status, 409);
    const d = await ladeRadar(radarId);
    assert.deepEqual(d?.antworten.find((a) => a.frageKey === "P1")?.optionKeys, ["P1-B"]);
  });

  await schritt("eine abgeschlossene Analyse wird nicht neu gerechnet", async () => {
    const vorher = (await ladeRadar(radarId))!.ergebnis!.berechnetAm;
    await werteAus(radarId);
    const nachher = (await ladeRadar(radarId))!.ergebnis!.berechnetAm;
    assert.equal(vorher, nachher);
  });

  // ── Zugangsschranke ──────────────────────────────────────────────────────
  await schritt("ohne gültiges Token gibt es nichts", async () => {
    const res = await radarGet(anfrage("http://test.local/api/closing/radar?token=falsch"));
    assert.equal(res.status, 401);
    const ohne = await radarGet(anfrage("http://test.local/api/closing/radar"));
    assert.equal(ohne.status, 400);
  });

  await schritt("ein fremdes Token kommt nicht an diese Analyse", async () => {
    const fremdToken = generateToken();
    const fremdeFirma = await db.company.create({ data: { name: `${LAUF} Fremd GmbH` } });
    await db.closingSession.create({
      data: {
        companyId: fremdeFirma.id,
        closerId: closer.id,
        clientTokenHash: hashToken(fremdToken),
        tokenExpiresAt: new Date(Date.now() + 3600_000),
      },
    });
    const res = await radarGet(
      anfrage(`http://test.local/api/closing/radar?token=${fremdToken}`) as never
    );
    const { radar } = (await res.json()) as { radar: unknown };
    assert.equal(radar, null, "Ein fremdes Token darf hier nichts sehen");
  });

  // ── Übergabe an den Blueprint ────────────────────────────────────────────
  await schritt("der Blueprint bekommt die Profildaten — als vorläufig gekennzeichnet", async () => {
    const u = await radarUebernahme(company.id);
    assert.ok(u, "Nach dem Abschluss muss eine Übernahme vorliegen");
    assert.ok(u!.profil.length >= 3);
    assert.ok(u!.profil.every((f) => f.herkunft === "radar" && f.bestaetigt === false));
    assert.equal(u!.ergebnis?.vorlaeufig, true);
    assert.equal(u!.spotlight, "Rechnungsverarbeitung");
    // Lesbar, nicht als Schlüssel: „g_25_49“ hilft im Blueprint niemandem.
    assert.equal(u!.profil.find((f) => f.key === "groesse")?.wert, "25 bis 49");
  });

  await schritt("eine unabgeschlossene Analyse taucht in der Übernahme nicht auf", async () => {
    const frisch = await db.company.create({ data: { name: `${LAUF} Frisch GmbH` } });
    const frischesClosing = await db.closingSession.create({
      data: {
        companyId: frisch.id,
        closerId: closer.id,
        clientTokenHash: hashToken(generateToken()),
        tokenExpiresAt: new Date(Date.now() + 3600_000),
      },
    });
    await starteRadar({
      closingSessionId: frischesClosing.id,
      companyId: frisch.id,
      closerId: closer.id,
    });
    assert.equal(await radarUebernahme(frisch.id), null);
  });

  await schritt("das Protokoll des Gesprächs kennt die Analyse", async () => {
    const { protokolliere } = await import("../src/lib/radar/service");
    await protokolliere({
      closingSessionId: closing.id,
      companyId: company.id,
      actorId: closer.id,
      eventType: "radar.abgeschlossen",
      metadata: { radarSessionId: radarId },
    });
    const events = await db.closingEvent.findMany({
      where: { closingSessionId: closing.id, eventType: { startsWith: "radar." } },
    });
    assert.ok(events.length >= 1);
  });

  // ── Aufräumen ────────────────────────────────────────────────────────────
  await db.closingEvent.deleteMany({ where: { companyId: company.id } });
  await db.radarAnswer.deleteMany({ where: { radarSession: { companyId: { startsWith: "" } } } });
  await db.radarSession.deleteMany({ where: { closer: { email: { startsWith: LAUF } } } });
  await db.closingSession.deleteMany({ where: { closerId: closer.id } });
  await db.company.deleteMany({ where: { name: { startsWith: LAUF } } });
  await db.user.delete({ where: { id: closer.id } });

  console.log(
    fehlgeschlagen.length === 0
      ? `\n${passed} Tests bestanden.\n`
      : `\n${passed} bestanden, ${fehlgeschlagen.length} fehlgeschlagen:\n  ${fehlgeschlagen.join("\n  ")}\n`
  );
  process.exit(fehlgeschlagen.length === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
