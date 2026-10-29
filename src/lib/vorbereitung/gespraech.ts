import Anthropic from "@anthropic-ai/sdk";
import { db } from "@/lib/db";
import { anweisung, lage, type Kontext } from "./kontext";
import { fuehreAus, WERKZEUGE } from "./werkzeuge";

/**
 * Der Vorbereitungs-Chat.
 *
 * Ein Zug besteht aus: Nachricht des Beraters → das Modell denkt, recherchiert
 * und ändert → Antwort. Die Schleife läuft so lange, bis das Modell nichts
 * mehr tun will.
 *
 * Zwei Dinge sind hier nicht beliebig:
 *
 * **Das Caching.** Anweisung und Lage sind zusammen lang — Bericht, Dossier,
 * Programme, Posten. Beide stehen vorn und tragen eine Cache-Marke; ab der
 * zweiten Nachricht kostet dieser Teil etwa ein Zehntel. Deshalb darf dort
 * nichts Veränderliches hinein, keine Uhrzeit und keine laufende Nummer.
 *
 * **Die Obergrenze an Runden.** Ein Modell, das sich in einer Werkzeugkette
 * verheddert, soll Geld kosten, aber kein Vermögen.
 */

const MODELL = "claude-opus-5-5";
const MAX_RUNDEN = 12;
const MAX_TOKENS = 8000;

export type Zug = {
  /** Die Antwort an den Berater. */
  text: string;
  /** Was unterwegs passiert ist — für die Anzeige unter der Nachricht. */
  werkzeuge: string[];
};

function textAus(inhalt: Anthropic.ContentBlock[]): string {
  return inhalt
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();
}

/**
 * Die Werkzeuge, die das Modell bekommt.
 *
 * Die Websuche läuft bei Anthropic, nicht bei uns — wir deklarieren sie nur.
 * `max_uses` ist eine Kostenbremse: Eine Vorbereitung braucht eine Handvoll
 * Abfragen, keine Recherchereise.
 */
function werkzeugliste(): Anthropic.ToolUnion[] {
  return [
    { type: "web_search_20260209", name: "web_search", max_uses: 6 },
    ...WERKZEUGE,
  ];
}

export async function fuehreZug(
  sitzungId: string,
  kontext: Kontext,
  verlauf: Array<{ rolle: string; inhalt: string }>,
  frage: string
): Promise<Zug> {
  const schluessel = process.env.ANTHROPIC_API_KEY;
  if (!schluessel) {
    return {
      text:
        "Für die Vorbereitung fehlt der Zugang zum Modell (`ANTHROPIC_API_KEY`). " +
        "Alles andere auf dieser Seite funktioniert weiterhin.",
      werkzeuge: [],
    };
  }

  const client = new Anthropic({ apiKey: schluessel });

  const nachrichten: Anthropic.MessageParam[] = [
    ...verlauf.map((n) => ({
      role: n.rolle === "assistant" ? ("assistant" as const) : ("user" as const),
      content: n.inhalt,
    })),
    { role: "user", content: frage },
  ];

  const benutzt: string[] = [];

  for (let runde = 0; runde < MAX_RUNDEN; runde++) {
    const antwort = await client.messages.create({
      model: MODELL,
      max_tokens: MAX_TOKENS,
      system: [
        { type: "text", text: anweisung(kontext) },
        {
          type: "text",
          text: lage(kontext),
          // Alles davor bleibt über das ganze Gespräch gleich.
          cache_control: { type: "ephemeral" },
        },
      ],
      tools: werkzeugliste(),
      messages: nachrichten,
    });

    if (antwort.stop_reason === "refusal") {
      return {
        text: "Das Modell hat die Antwort abgelehnt. Bitte anders formulieren.",
        werkzeuge: benutzt,
      };
    }

    const aufrufe = antwort.content.filter(
      (b): b is Anthropic.ToolUseBlock => b.type === "tool_use"
    );
    const suchen = antwort.content.filter((b) => b.type === "web_search_tool_result").length;
    if (suchen > 0) benutzt.push(`${suchen}× recherchiert`);

    if (aufrufe.length === 0) {
      return { text: textAus(antwort.content) || "…", werkzeuge: benutzt };
    }

    nachrichten.push({ role: "assistant", content: antwort.content });

    const ergebnisse: Anthropic.ToolResultBlockParam[] = [];
    for (const aufruf of aufrufe) {
      const ergebnis = await fuehreAus(
        sitzungId,
        aufruf.name,
        (aufruf.input ?? {}) as Record<string, unknown>
      );
      benutzt.push(aufruf.name);
      ergebnisse.push({
        type: "tool_result",
        tool_use_id: aufruf.id,
        content: ergebnis.text,
        is_error: !ergebnis.ok,
      });
    }
    nachrichten.push({ role: "user", content: ergebnisse });
  }

  /*
    Die Schleife ist durchgelaufen, ohne dass das Modell fertig wurde.

    Das ist selten und meist ein Zeichen dafür, dass es sich festgefahren
    hat. Lieber ehrlich abbrechen als still weiterlaufen: Der Berater sieht,
    was passiert ist, und kann anders fragen.
  */
  return {
    text:
      "Ich habe mich hier festgefahren und breche ab, bevor es teuer wird. " +
      "Was oben steht, ist gespeichert — frag mich bitte noch einmal, enger gefasst.",
    werkzeuge: benutzt,
  };
}

/** Den Verlauf laden, neueste zuletzt. */
export async function ladeVerlauf(sitzungId: string) {
  return db.vorbereitungsNachricht.findMany({
    where: { sitzungId },
    orderBy: { createdAt: "asc" },
    select: { id: true, rolle: true, inhalt: true, werkzeuge: true, createdAt: true },
  });
}
