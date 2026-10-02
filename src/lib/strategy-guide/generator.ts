import { askModel, parseJson } from "./model";
import type { CustomVorschlag, GuideDocument, Kernbefund, Einwand } from "./types";

const SYSTEM_ERZEUGER = `Du bereitest bei OKUN Systems das Strategiegespräch vor.

Das Gespräch führt ein Kollege mit einem Kunden, der den OKUN Blueprint
bereits ausgefüllt und seinen Bericht erhalten hat. Er ist also schon Kunde,
es geht nicht um Akquise, sondern darum, ihm zu zeigen, dass wir seinen
Betrieb verstanden haben, und mit ihm die nächsten Schritte zu vereinbaren.

Du schreibst **für den Kollegen**, nicht für den Kunden. Er liest deinen Text
vor dem Gespräch und hat ihn währenddessen daneben liegen.

Dabei gelten vier Regeln ohne Ausnahme:

1. Jede Zahl, die du nennst, steht wörtlich im Datenbestand. Du rechnest
   nicht um, rundest nicht und schätzt nicht. Steht eine Zahl nicht da,
   nennst du keine.
2. Jede Behauptung über den Betrieb lässt sich auf eine Stelle im
   Datenbestand zurückführen. Was dort nicht steht, behauptest du nicht —
   auch nicht als wahrscheinlich, typisch oder naheliegend.
3. Du schreibst in schlichtem Deutsch. Keine englischen Begriffe, kein
   Beratersprech, keine Füllwörter.
4. Du antwortest ausschließlich mit JSON, ohne einleitenden Satz und ohne
   Code-Zaun.`;

/**
 * Erzeugt die Custom-Vorschläge.
 *
 * Getrennt vom übrigen Dokument, weil nur sie durch die unabhängige Prüfung
 * müssen. Der Rest des Leitfadens gibt wieder, was ohnehin im Bericht steht;
 * die Vorschläge sind das Einzige, was wirklich neu erfunden wird — und
 * genau dort entsteht die Gefahr, dass etwas behauptet wird, das die Daten
 * nicht hergeben.
 */
export async function generateVorschlaege(
  dossier: string,
  paket: string | null,
  abgelehnt: Array<{ titel: string; begruendung: string }>,
  anweisung: string | null
): Promise<CustomVorschlag[]> {
  const korrektur =
    abgelehnt.length > 0
      ? `\n\nEine unabhängige Prüfung hat folgende Vorschläge aus einem früheren Durchlauf
abgelehnt. Die Begründung steht dabei. Vermeide denselben Fehler — entweder du
belegst den Vorschlag diesmal sauber, oder du ersetzt ihn durch einen anderen:

${abgelehnt.map((a) => `- „${a.titel}“: ${a.begruendung}`).join("\n")}`
      : "";

  const hinweis = anweisung
    ? `\n\nDer Kollege, der das Gespräch führt, hat angemerkt:\n„${anweisung}“\nBerücksichtige das.`
    : "";

  const prompt = `Lies den folgenden Fall vollständig und überlege dann frei, welche
Systeme man für genau diesen Betrieb entwickeln könnte — Dinge, die es so noch
nicht gibt oder die als Standardsoftware nicht passend genug sind.

Denk dabei wie jemand, der den Betrieb kennt: Welche Tätigkeit frisst Zeit, läuft
über mehrere Systeme oder von Hand, und ließe sich mit etwas Gebautem anders
lösen? Branchenübliches zählt mit — eine Pflegeeinrichtung, die Medikamentengabe
und deren Dokumentation von Hand führt, braucht etwas anderes als ein
Handwerksbetrieb mit Materialbestellung.

Wichtig: Für jeden Vorschlag muss es einen **Aufhänger** geben — eine konkrete
Stelle im Datenbestand, auf die sich der Vorschlag stützt. Eine Aufgabe mit
ihren Stunden, ein Medienbruch, eine Lücke, ein Freitext des Kunden, ein Satz
aus dem Vorgespräch. Ohne Aufhänger kein Vorschlag.

Das gebuchte Paket ist: ${paket ?? "keines hinterlegt"}. Vorschläge dürfen
ausdrücklich darüber hinausgehen — darum geht es.

Gib zwei bis vier Vorschläge. Lieber zwei belegte als vier wacklige.${korrektur}${hinweis}

=== DER FALL ===

${dossier}

=== ENDE DES FALLS ===

Antworte mit JSON in genau dieser Form:

{"vorschlaege":[{"titel":"kurz, konkret, kein Produktname",
"aufhaenger":"die Stelle im Datenbestand, wörtlich mit Zahl, so dass der Kollege sie im Gespräch nennen kann",
"idee":"was gebaut würde, in zwei bis vier Sätzen, ohne Fachbegriffe",
"nutzen":"was der Betrieb davon hat, möglichst mit der Zahl aus dem Aufhänger",
"groessenordnung":"grobe Spanne, z. B. 15–25 Tsd."}]}`;

  const raw = await askModel(SYSTEM_ERZEUGER, prompt, 8000);
  const parsed = parseJson<{ vorschlaege?: CustomVorschlag[] }>(raw, "Vorschläge");
  return Array.isArray(parsed.vorschlaege) ? parsed.vorschlaege : [];
}

/**
 * Schreibt den Leitfaden um die bereits geprüften Vorschläge herum.
 *
 * Die Vorschläge gehen fertig hinein, damit die Prüfung nicht umgangen werden
 * kann: Dieser Aufruf darf sie zitieren, aber nicht neu erfinden.
 */
export async function generateLeitfaden(
  dossier: string,
  vorschlaege: CustomVorschlag[],
  anweisung: string | null,
  vorfassung: GuideDocument | null
): Promise<Omit<GuideDocument, "customVorschlaege">> {
  const nachschaerfung =
    anweisung && vorfassung
      ? `\n\nEs gibt bereits eine Fassung. Der Kollege, der das Gespräch führt, hat
dazu angemerkt:

„${anweisung}“

Arbeite das ein. Ändere nur, was die Anmerkung betrifft; alles andere bleibt so
nah wie möglich an der bisherigen Fassung. Hier ist sie:

${JSON.stringify({ ...vorfassung, customVorschlaege: undefined }, null, 1)}`
      : "";

  const prompt = `Schreibe den Leitfaden für das Strategiegespräch.

Die Custom-Vorschläge sind bereits geprüft und stehen fest. Du darfst sie in
Abschnitt 5 erwähnen, aber keine neuen erfinden und keinen weglassen:

${vorschlaege.map((v, i) => `${i + 1}. ${v.titel} — Aufhänger: ${v.aufhaenger}`).join("\n") || "(keine)"}${nachschaerfung}

=== DER FALL ===

${dossier}

=== ENDE DES FALLS ===

Antworte mit JSON in genau dieser Form:

{"befund":"Was wir festgestellt haben, in drei Sätzen. Für den Kollegen, damit er in zehn Sekunden im Bild ist.",
"gespraechseinstieg":"Der Einstieg, ausformuliert zum Vorlesen. Vier bis sechs Sätze, direkte Ansprache des Kunden mit Sie. Zeigt, dass wir seinen Betrieb verstanden haben — nennt etwas, das er selbst gesagt hat.",
"kernbefunde":[{"titel":"kurz","beleg":"die Zahl aus der Auswertung, wörtlich","wirkung":"was das im Alltag bedeutet, in Alltagssprache"}],
"expertise":"Die eine Beobachtung, auf die der Kunde selbst nicht gekommen wäre — ein Zusammenhang zwischen zwei Befunden, den erst die Auswertung sichtbar macht. Zwei bis vier Sätze. Das ist der Moment, in dem der Kunde merkt, dass wir hingesehen haben.",
"empfehlung":"Was wir an seiner Stelle täten, in welcher Reihenfolge und warum. Fünf bis acht Sätze.",
"einwaende":[{"einwand":"was der Kunde wahrscheinlich sagt, in seinen Worten","antwort":"die Antwort, ausformuliert zum Sagen"}],
"abschluss":"Was am Ende des Gesprächs vereinbart sein sollte. Konkrete nächste Schritte."}

Gib drei Kernbefunde und drei Einwände.`;

  const raw = await askModel(SYSTEM_ERZEUGER, prompt, 12000);
  const parsed = parseJson<Partial<Omit<GuideDocument, "customVorschlaege">>>(
    raw,
    "Leitfaden"
  );

  // Fehlende Felder sind ein Fehler des Modells, kein Grund zum Absturz: Der
  // Kollege soll sehen, was fehlt, statt vor einer Fehlermeldung zu stehen.
  const text = (v: unknown, fallback: string) =>
    typeof v === "string" && v.trim() ? v.trim() : fallback;

  return {
    befund: text(parsed.befund, "— konnte nicht erzeugt werden —"),
    gespraechseinstieg: text(parsed.gespraechseinstieg, "— konnte nicht erzeugt werden —"),
    kernbefunde: Array.isArray(parsed.kernbefunde)
      ? (parsed.kernbefunde as Kernbefund[])
      : [],
    expertise: text(parsed.expertise, "— konnte nicht erzeugt werden —"),
    empfehlung: text(parsed.empfehlung, "— konnte nicht erzeugt werden —"),
    einwaende: Array.isArray(parsed.einwaende) ? (parsed.einwaende as Einwand[]) : [],
    abschluss: text(parsed.abschluss, "— konnte nicht erzeugt werden —"),
  };
}
