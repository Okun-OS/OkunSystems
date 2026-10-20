import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const MODELL = "claude-opus-5-5";

/**
 * Wie gründlich das Modell nachdenken soll.
 *
 * Auf diesem Modell lässt sich das Denken nicht abschalten, nur dosieren —
 * und die Voreinstellung gilt für jeden Aufruf gleich. Ein Erzeuger, der
 * frei auf Ideen kommen soll, braucht mehr davon als eine Prüfung, die
 * fertige Vorschläge gegen vorgegebene Regeln hält.
 */
export type Aufwand = "low" | "medium" | "high" | "xhigh" | "max";

export interface Aufruf {
  system: string;
  prompt: string;
  maxTokens?: number;
  /**
   * Voreinstellung ist "medium" — genau das, was dieses Modell ohnehin
   * verwendet, wenn man nichts angibt. Hier steht es nur ausdrücklich, damit
   * sichtbar ist, dass es ein Stellhebel ist, und damit eine spätere
   * Änderung eine Entscheidung ist und kein Zufall.
   */
  aufwand?: Aufwand;
  /** Für die Protokollzeile, damit man sieht, welcher Schritt was kostet. */
  label: string;
}

/** Was ein Aufruf verbraucht hat. */
export interface Verbrauch {
  label: string;
  eingabe: number;
  ausgabe: number;
  ausCache: number;
  inCache: number;
  sekunden: number;
}

/** Preise je Million Token für claude-opus-5-5. */
const PREIS = { eingabe: 4, ausgabe: 20, cache: 0.2 };

export function kostenEuro(v: Verbrauch[]): number {
  const summe = v.reduce(
    (s, x) =>
      s +
      (x.eingabe * PREIS.eingabe +
        x.ausgabe * PREIS.ausgabe +
        x.ausCache * PREIS.cache +
        x.inCache * PREIS.eingabe * 1.25) /
        1_000_000,
    0
  );
  return Math.round(summe * 100) / 100;
}

/** Die Antwort passte nicht in die Obergrenze. Ein zweiter Versuch hilft nicht. */
export class AbgeschnittenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AbgeschnittenError";
  }
}

/**
 * Ein Fehler, bei dem ein zweiter Versuch Sinn ergibt.
 *
 * Vorher wurde jeder Fehler zweimal wiederholt — auch eine abgelehnte
 * Anfrage, die beim dritten Mal genauso abgelehnt wird. Das kostete den
 * dreifachen Preis für ein Ergebnis, das feststand.
 */
function lohntWiederholung(e: unknown): boolean {
  if (e instanceof AbgeschnittenError) return false;
  if (e instanceof Anthropic.APIError) {
    const s = e.status ?? 0;
    return s === 408 || s === 409 || s === 429 || s >= 500;
  }
  // Verbindungsabbrüche und Zeitüberschreitungen sind keine APIError.
  return true;
}

/**
 * Ein Aufruf ans Modell.
 *
 * Jeder Aufruf ist eine eigene Anfrage ohne Vorgeschichte. Darauf beruht die
 * Unabhängigkeit der Prüfung: Der Prüfer sieht nicht, wie der Erzeuger auf
 * seinen Vorschlag gekommen ist, und kann deshalb nicht von dessen
 * Begründung überzeugt werden. Er muss selbst in den Daten nachsehen.
 *
 * Die Antwort wird im Strom gelesen, nicht am Stück. Bei Antworten dieser
 * Länge läuft eine Anfrage sonst minutenlang, ohne dass ein einziges Byte
 * fließt — und was so lange schweigt, wird unterwegs für tot gehalten und
 * abgeschnitten.
 */
export async function askModel(
  aufruf: Aufruf,
  sammler?: Verbrauch[],
  versuch = 0
): Promise<string> {
  const begonnen = Date.now();
  try {
    const strom = client.messages.stream({
      model: MODELL,
      max_tokens: aufruf.maxTokens ?? 16000,
      output_config: { effort: aufruf.aufwand ?? "medium" },
      system: aufruf.system,
      messages: [{ role: "user", content: aufruf.prompt }],
    });

    const antwort = await strom.finalMessage();

    // Abgeschnitten heißt abgeschnitten, nicht "ungültiges JSON".
    //
    // Dieses Modell denkt immer, und die Denk-Token zählen gegen dieselbe
    // Obergrenze wie die Antwort. Reicht sie nicht, bricht der Text mitten im
    // Satz ab — und weiter hinten scheitert dann das Lesen des JSON mit einer
    // Meldung, die auf die falsche Fährte führt. Deshalb wird hier gemeldet,
    // was wirklich passiert ist. Ein zweiter Versuch mit derselben Obergrenze
    // liefe genauso aus, also wird nicht wiederholt.
    if (antwort.stop_reason === "max_tokens") {
      throw new AbgeschnittenError(
        `${aufruf.label}: Die Antwort stieß an die Obergrenze von ` +
          `${aufruf.maxTokens ?? 16000} Token und wurde abgeschnitten.`
      );
    }

    sammler?.push({
      label: aufruf.label,
      eingabe: antwort.usage.input_tokens,
      ausgabe: antwort.usage.output_tokens,
      ausCache: antwort.usage.cache_read_input_tokens ?? 0,
      inCache: antwort.usage.cache_creation_input_tokens ?? 0,
      sekunden: Math.round((Date.now() - begonnen) / 100) / 10,
    });

    const block = antwort.content.find((b) => b.type === "text");
    const text = block?.type === "text" ? block.text.trim() : "";
    if (!text) throw new Error("Leere Antwort vom Modell");
    return text;
  } catch (e) {
    if (versuch < 2 && lohntWiederholung(e)) {
      await new Promise((r) => setTimeout(r, (versuch + 1) * 3000));
      return askModel(aufruf, sammler, versuch + 1);
    }
    throw e;
  }
}

/**
 * Liest JSON aus einer Antwort.
 *
 * Modelle rahmen JSON gern in ```json ein oder stellen einen Satz davor. Statt
 * daran zu scheitern, wird der äußerste geschweifte Block herausgeschnitten.
 * Bleibt es ungültig, ist das ein Fehler und wird als solcher gemeldet — ein
 * stillschweigend leeres Dokument wäre schlimmer.
 */
export function parseJson<T>(raw: string, was: string): T {
  const ohneZaun = raw.replace(/^\s*```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "");
  const start = ohneZaun.indexOf("{");
  const ende = ohneZaun.lastIndexOf("}");
  const kern = start >= 0 && ende > start ? ohneZaun.slice(start, ende + 1) : ohneZaun;
  try {
    return JSON.parse(kern) as T;
  } catch {
    // Anfang und Ende, denn ein abgeschnittener Text sieht vorn tadellos aus
    // und verrät sich erst hinten.
    const anfang = raw.slice(0, 160);
    const ende = raw.length > 320 ? raw.slice(-160) : "";
    throw new Error(
      `${was}: Antwort war kein gültiges JSON (${raw.length} Zeichen). ` +
        `Anfang: ${anfang}…` +
        (ende ? ` | Ende: …${ende}` : "")
    );
  }
}
