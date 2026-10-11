import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import {
  FREITEXT_KAPPUNG,
  POTENZIALFELDER,
  type PotenzialfeldKey,
  type RadarAchse,
} from "./catalog";

/**
 * Freitextangaben einordnen.
 *
 * Der Interessent schreibt „Wir machen Montage und Wartung gemischt, dazu ein
 * eigener Onlineshop" — ein Satz, den kein Fragebogen vorsieht und der
 * trotzdem mehr über den Betrieb sagt als drei Ankreuzfelder. Diese Datei
 * übersetzt solche Sätze in genau das Vokabular, das die Bewertung ohnehin
 * kennt: eine Achse, ein kleiner Ausschlag, ein paar Potenzialfelder.
 *
 * Drei Regeln, die das Ganze erst vertretbar machen:
 *
 * 1. **Gedeckelt.** Eine Freitextangabe bewegt eine Achse um höchstens zwei
 *    Punkte, und je Achse zählen höchstens drei. Der Fragebogen bleibt das
 *    Maß; die Einordnung ist eine Ergänzung, keine zweite Bewertung.
 * 2. **Im Zweifel nichts.** Ist der Satz unklar, zu kurz oder sagt er nichts
 *    über Abläufe aus, kommt `sicher: false` zurück und die Angabe fließt
 *    nicht in die Zahlen ein. Sie steht trotzdem im Steuerpult — der Berater
 *    soll sie lesen.
 * 3. **Keine erfundenen Zahlen.** Die Einordnung ist ein Satz in unseren
 *    Worten über das, was dasteht. Prozente, Einsparungen, Branchenvergleiche
 *    sind ausdrücklich verboten und werden nachträglich geprüft.
 *
 * Fällt das Modell aus oder antwortet es unbrauchbar, ist das kein Fehler des
 * Gesprächs: Die Angabe bleibt gespeichert, die Einordnung fehlt, die
 * Bewertung läuft ohne sie weiter.
 */

const client = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null;

/** Das Modell, das die Einordnung schreibt. */
export const DEUTUNG_MODELL = "claude-opus-5-5";

export type Deutung = {
  /** Ein Satz für den Berater: Was steht da fachlich? */
  einordnung: string;
  /** Welche Achse es betrifft — oder keine. */
  achse: RadarAchse | null;
  /** Ausschlag auf dieser Achse, −2 bis +2. Negativ heißt: spricht dagegen. */
  wert: number;
  /** Potenzialfelder, auf die der Text zeigt. */
  felder: PotenzialfeldKey[];
  /** Nur wenn wahr, fließt die Angabe in die Zahlen ein. */
  sicher: boolean;
  /** Woher die Einordnung stammt. */
  modell: string;
};

const FELD_KEYS = Object.keys(POTENZIALFELDER) as PotenzialfeldKey[];

const Antwortform = z.object({
  einordnung: z.string().min(3).max(400),
  achse: z.enum(["reife", "potenzial", "fit"]).nullable(),
  wert: z.number().min(-FREITEXT_KAPPUNG).max(FREITEXT_KAPPUNG),
  felder: z.array(z.string()).max(3),
  sicher: z.boolean(),
});

/**
 * Wendungen, die in einer Einordnung nichts zu suchen haben.
 *
 * Dieselbe Prüfung wie bei den Live-Beobachtungen: Was wir nicht erhoben
 * haben, dürfen wir auch nicht schreiben. Fällt eine Einordnung hier durch,
 * wird sie verworfen statt gekürzt — ein halb gelöschter Satz ergibt keinen
 * verlässlichen Sinn.
 */
const VERBOTEN = [
  /\d\s?%/,
  /€|EUR\b/i,
  /\bdurchschnittlich\b/i,
  /\bbranche(n|nüblich|nvergleich|nschnitt)?\b/i,
  /\bbenchmark\b/i,
  /\bbis zu\b/i,
  /\bspart?\b/i,
  /\beinsparung/i,
];

export function istSauber(satz: string): boolean {
  return !VERBOTEN.some((muster) => muster.test(satz));
}

export type DeutungsAuftrag = {
  /** Worum es geht: die Frage, das Profilfeld oder der Programmname. */
  zusammenhang: string;
  /** Was der Interessent geschrieben hat. */
  text: string;
  /** Was wir sonst schon über den Betrieb wissen — knapp. */
  betrieb?: string;
};

const SYSTEM = `Du ordnest Freitextangaben aus einer Kurzanalyse für deutsche mittelständische Betriebe ein.

Du bekommst: den Zusammenhang (Frage oder Feld), den Wortlaut der Angabe und knappe Eckdaten des Betriebs.
Du gibst ausschließlich ein JSON-Objekt zurück, ohne Vorrede, ohne Markdown-Zaun:

{
  "einordnung": "<ein Satz auf Deutsch: was die Angabe fachlich bedeutet>",
  "achse": "reife" | "potenzial" | "fit" | null,
  "wert": <ganze Zahl von -2 bis 2>,
  "felder": [<0 bis 3 Schlüssel aus der Liste unten>],
  "sicher": true | false
}

Die Achsen:
- "reife": wie digital der Betrieb heute aufgestellt ist. Positiv = moderner.
- "potenzial": wie viel erkennbarer Verbesserungsbedarf besteht. Positiv = mehr Bedarf.
- "fit": wie gut Problem, Rahmen und Bereitschaft zu einer Zusammenarbeit passen. Positiv = passt besser.

Die Potenzialfelder (nur diese Schlüssel sind erlaubt):
${FELD_KEYS.map((k) => `- ${k}: ${POTENZIALFELDER[k].label} — ${POTENZIALFELDER[k].beschreibung}`).join("\n")}

Regeln:
- "sicher": false, wenn die Angabe zu kurz, unklar, scherzhaft oder ohne Bezug zu Abläufen, Systemen oder Zusammenarbeit ist. Dann "wert": 0 und "achse": null.
- "wert" bleibt zwischen -2 und 2. Zwei vergibst du nur bei einer eindeutigen, konkreten Aussage.
- Erfinde nichts: keine Prozentzahlen, keine Beträge, keine Branchenvergleiche, keine Einsparungen, keine Zeitangaben, die nicht dastehen.
- "einordnung" ist ein nüchterner Satz in der dritten Person über den Betrieb. Keine Anrede, keine Empfehlung, kein Verkauf.
- Antworte auf Deutsch.`;

function bauePrompt(auftrag: DeutungsAuftrag): string {
  return [
    `Zusammenhang: ${auftrag.zusammenhang}`,
    auftrag.betrieb ? `Betrieb: ${auftrag.betrieb}` : null,
    `Angabe des Interessenten: "${auftrag.text.replace(/"/g, "'")}"`,
  ]
    .filter(Boolean)
    .join("\n");
}

function schneideJson(roh: string): string {
  const start = roh.indexOf("{");
  const ende = roh.lastIndexOf("}");
  if (start < 0 || ende <= start) return roh;
  return roh.slice(start, ende + 1);
}

/**
 * Prüft, was das Modell geantwortet hat.
 *
 * Bewusst streng und bewusst wortkarg: Alles, was nicht genau in die Form
 * passt, wird verworfen statt zurechtgebogen. Eine halb verstandene Deutung
 * ist schlimmer als keine — sie sähe aus wie eine Erkenntnis.
 *
 * Eigene Funktion, damit sie prüfbar ist, ohne das Modell zu rufen.
 */
export function pruefeAntwort(roh: string): Deutung | null {
  let gelesen: unknown;
  try {
    gelesen = JSON.parse(schneideJson(roh.trim()));
  } catch {
    return null;
  }

  const geprueft = Antwortform.safeParse(gelesen);
  if (!geprueft.success) return null;

  const d = geprueft.data;
  if (!istSauber(d.einordnung)) return null;

  const felder = d.felder.filter((f): f is PotenzialfeldKey =>
    (FELD_KEYS as string[]).includes(f)
  );
  const sicher = d.sicher && d.achse !== null;

  return {
    einordnung: d.einordnung.trim(),
    achse: sicher ? d.achse : null,
    wert: sicher ? Math.max(-FREITEXT_KAPPUNG, Math.min(FREITEXT_KAPPUNG, Math.round(d.wert))) : 0,
    felder: sicher ? felder : [],
    sicher,
    modell: DEUTUNG_MODELL,
  };
}

/**
 * Ordnet eine einzelne Angabe ein.
 *
 * Gibt `null` zurück, wenn kein Schlüssel hinterlegt ist, das Modell nicht
 * antwortet oder die Antwort die Prüfungen nicht besteht. Der Aufrufer
 * behandelt das wie „noch nicht eingeordnet" — nicht wie einen Fehler.
 */
export async function deuteFreitext(auftrag: DeutungsAuftrag): Promise<Deutung | null> {
  if (!client) return null;
  const text = auftrag.text.trim();
  if (text.length < 2) return null;

  try {
    const antwort = await client.messages.create({
      model: DEUTUNG_MODELL,
      max_tokens: 1000,
      // Eine kurze Einordnung braucht keine lange Überlegung; niedriger
      // Aufwand hält das Gespräch schnell und die Kosten klein.
      output_config: { effort: "low" },
      system: SYSTEM,
      messages: [{ role: "user", content: bauePrompt(auftrag) }],
    });

    const block = antwort.content.find((b) => b.type === "text");
    if (!block || block.type !== "text") return null;

    return pruefeAntwort(block.text);
  } catch (fehler) {
    console.warn("[radar] Freitext konnte nicht eingeordnet werden:", fehler);
    return null;
  }
}
