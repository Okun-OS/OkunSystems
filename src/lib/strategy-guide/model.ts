import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

/**
 * Jeder Aufruf ist eine eigene Anfrage ohne Vorgeschichte.
 *
 * Darauf beruht die Unabhängigkeit der Prüfung: Der Prüfer sieht nicht, wie
 * der Erzeuger auf seinen Vorschlag gekommen ist, und kann deshalb nicht von
 * dessen Begründung überzeugt werden. Er muss selbst in den Daten nachsehen.
 */
export async function askModel(
  system: string,
  prompt: string,
  maxTokens = 16000,
  attempt = 0
): Promise<string> {
  try {
    const res = await client.messages.create({
      model: "claude-opus-5-5",
      max_tokens: maxTokens,
      system,
      messages: [{ role: "user", content: prompt }],
    });
    const block = res.content.find((b) => b.type === "text");
    const text = block?.type === "text" ? block.text.trim() : "";
    if (!text) throw new Error("Leere Antwort vom Modell");
    return text;
  } catch (e) {
    if (attempt < 2) {
      await new Promise((r) => setTimeout(r, (attempt + 1) * 3000));
      return askModel(system, prompt, maxTokens, attempt + 1);
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
    throw new Error(`${was}: Antwort war kein gültiges JSON (${raw.slice(0, 200)}…)`);
  }
}
