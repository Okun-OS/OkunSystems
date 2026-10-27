import { askModel } from "@/lib/strategy-guide/model";

/**
 * Der Beistand im Gespräch.
 *
 * Drei Dinge, die zusammengehören und deshalb hier zusammen stehen:
 *
 * 1. **Vorher** — aus dem Ziel wird eine kurze Vorbereitung: worauf zu
 *    achten ist, was gefragt werden sollte, was schieflaufen kann.
 * 2. **Währenddessen** — aus dem zuletzt Gesagten werden Hinweise. Kurz,
 *    höchstens zwei, und nur wenn es wirklich etwas zu sagen gibt.
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

const SYSTEM_HINWEIS = `Du hörst bei einem Gespräch mit und hilfst dem Berater von OKUN Systems.

Du bekommst sein Ziel, seine Vorbereitung und das zuletzt Gesagte. Du gibst
höchstens zwei Hinweise, jeder ein Satz.

## Wann du schweigst

Meistens. Schweigen ist die richtige Antwort, wenn das Gespräch läuft. Gib
nur dann einen Hinweis, wenn einer der folgenden Fälle eintritt:

- Eine Frage aus der Vorbereitung ist noch offen und es passt gerade.
- Der Kunde hat etwas gesagt, das übergangen wurde und wichtig ist.
- Jemand ist dabei, etwas zuzusagen, was über das Besprochene hinausgeht.
- Eine Zahl oder ein Name fiel, der ins Protokoll gehört.

Gibt es nichts davon, antworte mit einem leeren Array. Das ist der
Normalfall und kein Versagen.

## Form

Ein JSON-Array mit null, einem oder zwei Objekten:

[{"art":"frage|achtung|notiz","text":"ein Satz"}]

- "frage" — das solltest du jetzt fragen.
- "achtung" — hier wird es brenzlig.
- "notiz" — das gehört festgehalten.

Nur das Array, kein Fließtext drumherum.

## Die Regel

Du beziehst dich ausschließlich auf das, was tatsächlich gesagt wurde.
Keine allgemeinen Verkaufstipps, keine Ratschläge ins Blaue.`;

export type Hinweis = { art: string; text: string };

export async function hinweise(input: {
  ziel: string | null;
  vorbereitung: string | null;
  /** Das zuletzt Gesagte — nicht das ganze Gespräch. */
  letztes: string;
  /** Was schon als Hinweis kam, damit sich nichts wiederholt. */
  bereitsGesagt: string[];
}): Promise<Hinweis[]> {
  const letztes = input.letztes.trim();
  if (letztes.length < 80) return [];

  const teile = [
    input.ziel ? `## Ziel\n${input.ziel}` : null,
    input.vorbereitung ? `## Vorbereitung\n${input.vorbereitung}` : null,
    input.bereitsGesagt.length > 0
      ? `## Schon gesagt — nicht wiederholen\n${input.bereitsGesagt.map((h) => `- ${h}`).join("\n")}`
      : null,
    `## Zuletzt gesagt\n${letztes}`,
  ].filter(Boolean);

  const roh = await askModel({
    system: SYSTEM_HINWEIS,
    prompt: teile.join("\n\n"),
    maxTokens: 500,
    aufwand: "low",
    label: "Hinweis im Gespräch",
  });

  return leseHinweise(roh);
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
