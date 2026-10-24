import type Anthropic from "@anthropic-ai/sdk";
import { db } from "@/lib/db";
import { darfWaehlen, type PostenStand } from "@/lib/strategie/engine";
import { POSTEN_ARTEN, POSTEN_ZUSTAENDE, type PostenArt } from "@/lib/strategie/katalog";
import { istBindung, istZufriedenheit, leseKosten } from "@/lib/blueprint/pillar3-catalog";
import { schabloneFuerSitzung, schreibeSchablone } from "@/lib/grundlagen/laden";

/**
 * Was der Vorbereitungs-Chat tun darf.
 *
 * Er darf alles, was auch der Berater von Hand tun könnte — Posten wählen,
 * verwerfen, anlegen, Grundlagen entscheiden, Preise nachtragen. Eine
 * Vorbereitung, die an einer fehlenden Berechtigung scheitert, ist schlimmer
 * als eine, die man zurücknehmen muss.
 *
 * Zwei Grenzen bleiben, und beide liegen hier im Code, nicht in der
 * Anweisung an das Modell:
 *
 * 1. **Die Paketgrenze prüft der Server.** `darfWaehlen` entscheidet, ob ein
 *    vierter Posten gewählt werden darf — nicht das Modell. Eine Regel, die
 *    nur im Prompt steht, ist eine Bitte.
 * 2. **Nichts erreicht den Kunden.** Die Freigabe bleibt ein eigener,
 *    menschlicher Schritt; kein Werkzeug hier setzt sie.
 */

export const WERKZEUGE: Anthropic.Tool[] = [
  {
    name: "posten_zustand",
    description:
      "Setzt den Stand eines Postens: gewaehlt, spaeter, verworfen oder kandidat. " +
      "Die Paketgrenze wird dabei serverseitig geprüft — mehr als erlaubt lässt sich " +
      "nicht wählen, und die Antwort sagt warum.",
    input_schema: {
      type: "object",
      properties: {
        postenId: { type: "string", description: "Die ID in eckigen Klammern aus der Lage." },
        zustand: { type: "string", enum: POSTEN_ZUSTAENDE.map((z) => z.key) },
      },
      required: ["postenId", "zustand"],
      additionalProperties: false,
    },
  },
  {
    name: "posten_anlegen",
    description:
      "Legt einen zusätzlichen Posten an, der im Leitfaden fehlt. Nur benutzen, wenn " +
      "etwas im Gespräch wirklich fehlt — nicht, um die Liste zu füllen.",
    input_schema: {
      type: "object",
      properties: {
        titel: { type: "string" },
        art: { type: "string", enum: POSTEN_ARTEN.map((a) => a.key) },
        warum: { type: "string", description: "Was der Betrieb davon hat, in einem Satz." },
      },
      required: ["titel", "art"],
      additionalProperties: false,
    },
  },
  {
    name: "posten_aendern",
    description: "Ändert Titel oder Begründung eines Postens.",
    input_schema: {
      type: "object",
      properties: {
        postenId: { type: "string" },
        titel: { type: "string" },
        warum: { type: "string" },
      },
      required: ["postenId"],
      additionalProperties: false,
    },
  },
  {
    name: "schablone_rechnen",
    description:
      "Rechnet die Grundlagen-Schablone neu — nach einer Preiskorrektur sinnvoll. " +
      "Bereits entschiedene Vorschläge bleiben stehen.",
    input_schema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "grundlage_entscheiden",
    description:
      "Bestätigt oder verwirft einen Vorschlag aus der Grundlagen-Schablone. " +
      "Bestätigt heißt: Der Kunde sieht ihn später im Haus.",
    input_schema: {
      type: "object",
      properties: {
        vorschlagId: { type: "string" },
        zustand: { type: "string", enum: ["bestaetigt", "verworfen", "offen"] },
      },
      required: ["vorschlagId", "zustand"],
      additionalProperties: false,
    },
  },
  {
    name: "preis_nachtragen",
    description:
      "Trägt für ein Programm Preis, Vertragsbindung oder Zufriedenheit nach. " +
      "Recherchierte Listenpreise sind Schätzungen — das gehört in die Antwort an den " +
      "Berater, nicht stillschweigend in die Daten.",
    input_schema: {
      type: "object",
      properties: {
        programm: { type: "string", description: "Der Name, wie er in der Lage steht." },
        kosten: { type: "string", description: "Monatskosten, z. B. „49" },
        bindung: { type: "string", enum: ["monatlich", "jahresvertrag", "unbekannt"] },
        zufriedenheit: { type: "string", enum: ["laeuft", "gehtso", "aergert"] },
      },
      required: ["programm"],
      additionalProperties: false,
    },
  },
  {
    name: "notiz_setzen",
    description:
      "Schreibt die interne Notiz der Sitzung — das, was der Berater im Termin vor " +
      "Augen haben will. Ersetzt die bisherige Notiz.",
    input_schema: {
      type: "object",
      properties: { text: { type: "string" } },
      required: ["text"],
      additionalProperties: false,
    },
  },
  {
    name: "vorbereitung_abschliessen",
    description:
      "Schließt die Vorbereitung ab und gibt „Gespräch führen“ frei. Erst benutzen, " +
      "wenn die Auswahl steht, die Grundlagen entschieden sind und der Berater " +
      "bestätigt hat, dass er das Haus abgelaufen ist.",
    input_schema: {
      type: "object",
      properties: {
        probeGelaufen: {
          type: "boolean",
          description: "Hat der Berater den Probedurchlauf durchs Haus gemacht?",
        },
      },
      required: ["probeGelaufen"],
      additionalProperties: false,
    },
  },
];

export type WerkzeugErgebnis = { ok: true; text: string } | { ok: false; text: string };

/**
 * Ein Werkzeug ausführen.
 *
 * Gibt immer Text zurück, nie eine Ausnahme: Ein abgelehnter Aufruf ist für
 * das Modell eine Information, mit der es weiterarbeiten soll („geht nicht,
 * weil die Grenze erreicht ist"), kein Abbruch des Gesprächs.
 */
export async function fuehreAus(
  sitzungId: string,
  name: string,
  eingabe: Record<string, unknown>
): Promise<WerkzeugErgebnis> {
  try {
    switch (name) {
      case "posten_zustand":
        return await postenZustand(sitzungId, eingabe);
      case "posten_anlegen":
        return await postenAnlegen(sitzungId, eingabe);
      case "posten_aendern":
        return await postenAendern(sitzungId, eingabe);
      case "schablone_rechnen":
        return await schabloneRechnen(sitzungId);
      case "grundlage_entscheiden":
        return await grundlageEntscheiden(sitzungId, eingabe);
      case "preis_nachtragen":
        return await preisNachtragen(sitzungId, eingabe);
      case "notiz_setzen":
        return await notizSetzen(sitzungId, eingabe);
      case "vorbereitung_abschliessen":
        return await abschliessen(sitzungId, eingabe);
      default:
        return { ok: false, text: `Unbekanntes Werkzeug: ${name}` };
    }
  } catch (fehler) {
    console.error(`[vorbereitung] ${name}:`, fehler);
    return { ok: false, text: "Das hat nicht geklappt. Bitte dem Berater sagen." };
  }
}

async function beruehre(sitzungId: string) {
  await db.strategieSitzung.update({
    where: { id: sitzungId },
    data: { rev: { increment: 1 } },
  });
}

async function postenZustand(
  sitzungId: string,
  ein: Record<string, unknown>
): Promise<WerkzeugErgebnis> {
  const postenId = String(ein.postenId ?? "");
  const zustand = String(ein.zustand ?? "");

  const posten = await db.strategiePosten.findMany({
    where: { sitzungId },
    select: { id: true, art: true, zustand: true, titel: true, kundeSieht: true },
  });
  const dieser = posten.find((p) => p.id === postenId);
  if (!dieser) return { ok: false, text: "Diesen Posten gibt es in dieser Sitzung nicht." };

  // Die Paketgrenze gehört hierher, nicht in die Anweisung an das Modell.
  if (zustand === "gewaehlt") {
    const stand: PostenStand[] = posten.map((p) => ({
      id: p.id,
      art: p.art as PostenArt,
      zustand: p.zustand as PostenStand["zustand"],
      titel: p.titel,
      kundeSieht: p.kundeSieht,
    }));
    const urteil = darfWaehlen(
      stand.find((p) => p.id === postenId)!,
      stand
    );
    if (!urteil.erlaubt) {
      return { ok: false, text: urteil.grund ?? "Dieser Posten lässt sich nicht wählen." };
    }
  }

  await db.strategiePosten.update({ where: { id: postenId }, data: { zustand } });
  await beruehre(sitzungId);
  return { ok: true, text: `„${dieser.titel}" steht jetzt auf ${zustand}.` };
}

async function postenAnlegen(
  sitzungId: string,
  ein: Record<string, unknown>
): Promise<WerkzeugErgebnis> {
  const titel = String(ein.titel ?? "").trim();
  if (!titel) return { ok: false, text: "Ohne Titel kein Posten." };
  const art = String(ein.art ?? "offen");

  const letzte = await db.strategiePosten.findFirst({
    where: { sitzungId },
    orderBy: { position: "desc" },
    select: { position: true },
  });

  const posten = await db.strategiePosten.create({
    data: {
      sitzungId,
      // Ein eigener Schlüssel, der nicht mit dem Leitfaden kollidiert.
      schluessel: `chat-${Date.now().toString(36)}`,
      art,
      block: "Im Gespräch ergänzt",
      titel,
      warum: ein.warum ? String(ein.warum).trim() : null,
      zustand: "kandidat",
      position: (letzte?.position ?? -1) + 1,
    },
    select: { id: true },
  });
  await beruehre(sitzungId);
  return { ok: true, text: `Angelegt als [${posten.id}]: „${titel}" (Stand: kandidat).` };
}

async function postenAendern(
  sitzungId: string,
  ein: Record<string, unknown>
): Promise<WerkzeugErgebnis> {
  const postenId = String(ein.postenId ?? "");
  const vorhanden = await db.strategiePosten.findFirst({
    where: { id: postenId, sitzungId },
    select: { id: true },
  });
  if (!vorhanden) return { ok: false, text: "Diesen Posten gibt es in dieser Sitzung nicht." };

  const daten: { titel?: string; warum?: string } = {};
  if (typeof ein.titel === "string" && ein.titel.trim()) daten.titel = ein.titel.trim();
  if (typeof ein.warum === "string") daten.warum = ein.warum.trim();
  if (Object.keys(daten).length === 0) return { ok: false, text: "Nichts zu ändern angegeben." };

  await db.strategiePosten.update({ where: { id: postenId }, data: daten });
  await beruehre(sitzungId);
  return { ok: true, text: "Geändert." };
}

async function schabloneRechnen(sitzungId: string): Promise<WerkzeugErgebnis> {
  const ergebnis = await schabloneFuerSitzung(sitzungId);
  if (!ergebnis) return { ok: false, text: "Sitzung nicht gefunden." };
  const geschrieben = await schreibeSchablone(sitzungId, ergebnis.vorschlaege);
  const zeilen = ergebnis.vorschlaege
    .map((v) => `- ${v.bewegung}: ${v.titel}${v.sparenProMonat ? ` (${v.sparenProMonat} €)` : ""}`)
    .join("\n");
  return {
    ok: true,
    text:
      `${geschrieben.neu} Vorschläge, ${geschrieben.behalten} entschiedene blieben stehen.\n` +
      zeilen,
  };
}

async function grundlageEntscheiden(
  sitzungId: string,
  ein: Record<string, unknown>
): Promise<WerkzeugErgebnis> {
  const vorschlagId = String(ein.vorschlagId ?? "");
  const zustand = String(ein.zustand ?? "");
  const treffer = await db.grundlagenVorschlag.updateMany({
    where: { id: vorschlagId, sitzungId },
    data: { zustand, kundeSieht: zustand === "bestaetigt" },
  });
  if (treffer.count === 0) return { ok: false, text: "Diesen Vorschlag gibt es hier nicht." };
  return { ok: true, text: `Vorschlag steht auf ${zustand}.` };
}

async function preisNachtragen(
  sitzungId: string,
  ein: Record<string, unknown>
): Promise<WerkzeugErgebnis> {
  const name = String(ein.programm ?? "").trim();
  if (!name) return { ok: false, text: "Welches Programm?" };

  const sitzung = await db.strategieSitzung.findUnique({
    where: { id: sitzungId },
    select: { sessionId: true },
  });
  if (!sitzung) return { ok: false, text: "Sitzung nicht gefunden." };

  const programm = await db.blueprintSystem.findFirst({
    where: { sessionId: sitzung.sessionId, name: { equals: name, mode: "insensitive" } },
    select: { id: true, name: true },
  });
  if (!programm) {
    return { ok: false, text: `„${name}" steht nicht in den Programmen dieses Betriebs.` };
  }

  const daten: { kostenProMonat?: number | null; bindung?: string; zufriedenheit?: string } = {};
  if (ein.kosten !== undefined) {
    const kosten = leseKosten(String(ein.kosten));
    if (kosten === null) return { ok: false, text: "Diesen Betrag konnte ich nicht lesen." };
    daten.kostenProMonat = kosten;
  }
  if (typeof ein.bindung === "string" && istBindung(ein.bindung)) daten.bindung = ein.bindung;
  if (typeof ein.zufriedenheit === "string" && istZufriedenheit(ein.zufriedenheit)) {
    daten.zufriedenheit = ein.zufriedenheit;
  }
  if (Object.keys(daten).length === 0) return { ok: false, text: "Nichts Gültiges angegeben." };

  await db.blueprintSystem.update({ where: { id: programm.id }, data: daten });
  return {
    ok: true,
    text: `Bei „${programm.name}" nachgetragen. Die Schablone rechnet das erst beim nächsten Lauf mit.`,
  };
}

async function notizSetzen(
  sitzungId: string,
  ein: Record<string, unknown>
): Promise<WerkzeugErgebnis> {
  const text = String(ein.text ?? "").trim();
  await db.strategieSitzung.update({
    where: { id: sitzungId },
    data: { interneNotiz: text || null },
  });
  return { ok: true, text: "Notiz gesetzt." };
}

async function abschliessen(
  sitzungId: string,
  ein: Record<string, unknown>
): Promise<WerkzeugErgebnis> {
  const probe = ein.probeGelaufen === true;
  await db.strategieSitzung.update({
    where: { id: sitzungId },
    data: { vorbereitetAm: new Date(), probeAm: probe ? new Date() : null },
  });
  return {
    ok: true,
    text: probe
      ? "Vorbereitung abgeschlossen, Probedurchlauf vermerkt. „Gespräch führen“ ist offen."
      : "Vorbereitung abgeschlossen — ohne Probedurchlauf. Der Hinweis bleibt stehen.",
  };
}
