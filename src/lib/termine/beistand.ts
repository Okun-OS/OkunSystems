import { askModel } from "@/lib/strategy-guide/model";

/**
 * Der Beistand im Gespräch.
 *
 * Drei Dinge, die zusammengehören und deshalb hier zusammen stehen:
 *
 * 1. **Vorher** — aus dem Ziel wird eine kurze Vorbereitung: worauf zu
 *    achten ist, was gefragt werden sollte, was schieflaufen kann.
 * 2. **Währenddessen** — aus dem zuletzt Gesagten wird zweierlei: eine Zeile
 *    dazu, wo das Gespräch gerade steht, und bis zu zwei Hinweise. Die Zeile
 *    kommt immer, die Hinweise nur, wenn es etwas zu sagen gibt.
 * 3. **Danach** — aus allem Gesagten wird das Protokoll.
 *
 * Die Regel über allen dreien: **nichts erfinden.** Ein Hinweis, der auf
 * etwas antwortet, das niemand gesagt hat, kostet Aufmerksamkeit mitten im
 * Gespräch — und ein Protokoll mit einer erfundenen Zusage steht hinterher
 * als Vereinbarung da.
 */

// ─── Vorher ──────────────────────────────────────────────────────────────────

const SYSTEM_VORBEREITUNG = `Du bereitest einen Berater von OKUN Systems auf ein Gespräch vor.

Er sagt dir, was er erreichen will. Du machst daraus eine knappe
Vorbereitung — das, was er während des Gesprächs im Blick haben muss.

Form: drei Abschnitte, je zwei bis vier Stichpunkte, keine Einleitung.

Darauf achten
— woran man merkt, ob es in die richtige Richtung läuft.

Das fragen
— die Fragen, ohne die er hinterher etwas Wichtiges nicht weiß.

Aufpassen bei
— was das Gespräch kippen lässt oder zu einem Versprechen führt, das er
nicht halten kann.

Kurze Sätze. Keine Floskeln, keine Gesprächsführungs-Ratgeber-Sprache.
Nichts, was nicht aus seinem Ziel folgt.`;

export async function bereiteVor(ziel: string, firma: string): Promise<string> {
  const text = await askModel({
    system: SYSTEM_VORBEREITUNG,
    prompt: `Betrieb: ${firma}\n\nZiel des Gesprächs:\n${ziel.trim()}`,
    maxTokens: 1500,
    aufwand: "low",
    label: "Gesprächsvorbereitung",
  });
  return text.trim();
}

// ─── Währenddessen ───────────────────────────────────────────────────────────

const SYSTEM_HINWEIS = `Du hörst bei einem Gespräch mit und sitzt dem Berater von OKUN Systems zur Seite.

Du bekommst sein Ziel, seine Vorbereitung und das zuletzt Gesagte. Du
antwortest mit zweierlei: einer Lagezeile und null bis zwei Hinweisen.

## Die Lagezeile

Ein Satz, immer. Er sagt, wo das Gespräch gerade steht — worüber geredet
wird, wie weit es in Richtung Ziel gekommen ist, was gerade kippt. Er ist
Beobachtung, kein Ratschlag.

Gut: „Er beschreibt die Dienstplanung, Zahlen sind noch keine gefallen."
Gut: „Das Thema ist vom Preis zur Einführung gewechselt."
Schlecht: „Das Gespräch läuft gut." — das sagt nichts.

Wird gerade nichts Erkennbares gesagt — Begrüßung, Technikgerede,
Höflichkeiten —, dann sag genau das in einem Satz.

## Die Hinweise

Nur, wenn einer dieser Fälle eintritt:

- Eine Frage aus der Vorbereitung ist noch offen und es passt gerade.
- Der Kunde hat etwas gesagt, das übergangen wurde und wichtig ist.
- Jemand ist dabei, etwas zuzusagen, was über das Besprochene hinausgeht.
- Eine Zahl oder ein Name fiel, der ins Protokoll gehört.

Sonst bleibt die Liste leer. Ein Zuruf alle zwanzig Sekunden wäre keine
Hilfe, sondern eine zweite Person, die redet.

## Form

Nur dieses JSON-Objekt, kein Fließtext drumherum:

{"lage":"ein Satz","hinweise":[{"art":"frage|achtung|notiz","text":"ein Satz"}]}

- "frage" — das solltest du jetzt fragen.
- "achtung" — hier wird es brenzlig.
- "notiz" — das gehört festgehalten.

## Die Regel

Du beziehst dich ausschließlich auf das, was tatsächlich gesagt wurde.
Keine allgemeinen Verkaufstipps, keine Ratschläge ins Blaue. Was du nicht
gehört hast, hat nicht stattgefunden.`;


export type Hinweis = { art: string; text: string };

/** Was der Beistand in einem Takt zurückgibt. */
export type Beistand = { lage: string | null; hinweise: Hinweis[] };

export async function hinweise(input: {
  ziel: string | null;
  vorbereitung: string | null;
  /** Das zuletzt Gesagte — nicht das ganze Gespräch. */
  letztes: string;
  /** Was schon als Hinweis kam, damit sich nichts wiederholt. */
  bereitsGesagt: string[];
  /** Die letzten Lagezeilen, damit sich die neue nicht wiederholt. */
  bisherigeLage?: string[];
}): Promise<Beistand> {
  const letztes = input.letztes.trim();
  /*
    Unter einer halben Sinneinheit lohnt sich keine Lagezeile.

    Zwanzig Sekunden Schweigen oder ein „genau, genau" ergeben nichts, was
    sich beobachten ließe — und eine erfundene Beobachtung ist schlimmer als
    gar keine. Die Schwelle ist niedriger als früher: Kommentiert werden
    soll durchgehend, nicht nur bei langen Passagen.
  */
  if (letztes.length < 25) return { lage: null, hinweise: [] };

  const teile = [
    input.ziel ? `## Ziel\n${input.ziel}` : null,
    input.vorbereitung ? `## Vorbereitung\n${input.vorbereitung}` : null,
    input.bereitsGesagt.length > 0
      ? `## Schon gesagt — nicht wiederholen\n${input.bereitsGesagt.map((h) => `- ${h}`).join("\n")}`
      : null,
    (input.bisherigeLage ?? []).length > 0
      ? `## Zuletzt beobachtet\n${(input.bisherigeLage ?? []).map((l) => `- ${l}`).join("\n")}`
      : null,
    `## Zuletzt gesagt\n${letztes}`,
  ].filter(Boolean);

  const roh = await askModel({
    system: SYSTEM_HINWEIS,
    prompt: teile.join("\n\n"),
    maxTokens: 600,
    aufwand: "low",
    label: "Hinweis im Gespräch",
  });

  return leseBeistand(roh);
}

/**
 * Die Antwort des Beistands lesen — Lagezeile und Hinweise.
 *
 * Verträgt beides: das Objekt, das der Prompt verlangt, und ein nacktes
 * Array, wie es frühere Fassungen lieferten. Mitten im Gespräch ist ein
 * geworfener Fehler die schlechteste aller Antworten.
 */
export function leseBeistand(roh: string): Beistand {
  const text = roh.trim().replace(/^```(?:json)?\s*/i, "").replace(/```$/, "").trim();
  if (!text) return { lage: null, hinweise: [] };
  try {
    const gelesen: unknown = JSON.parse(text);
    if (Array.isArray(gelesen)) return { lage: null, hinweise: leseHinweise(text) };
    if (!gelesen || typeof gelesen !== "object") return { lage: null, hinweise: [] };
    const o = gelesen as Record<string, unknown>;
    const lage = typeof o.lage === "string" && o.lage.trim() ? o.lage.trim() : null;
    const hinweise = Array.isArray(o.hinweise)
      ? leseHinweise(JSON.stringify(o.hinweise))
      : [];
    return { lage, hinweise };
  } catch {
    return { lage: null, hinweise: [] };
  }
}

/**
 * Die Antwort lesen, ohne daran zu scheitern.
 *
 * Mitten im Gespräch ist ein geworfener Fehler die schlechteste aller
 * Antworten. Was sich nicht lesen lässt, ist eben kein Hinweis.
 */
export function leseHinweise(roh: string): Hinweis[] {
  const text = roh.trim().replace(/^```(?:json)?\s*/i, "").replace(/```$/, "").trim();
  if (!text || text === "[]") return [];
  try {
    const gelesen: unknown = JSON.parse(text);
    if (!Array.isArray(gelesen)) return [];
    return gelesen
      .filter((h): h is Record<string, unknown> => Boolean(h) && typeof h === "object")
      .map((h) => ({
        art: typeof h.art === "string" ? h.art : "notiz",
        text: typeof h.text === "string" ? h.text.trim() : "",
      }))
      .filter((h) => h.text.length > 0)
      .slice(0, 2);
  } catch {
    return [];
  }
}
