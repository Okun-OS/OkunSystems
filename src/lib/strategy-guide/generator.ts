import { askModel, parseJson, type Verbrauch } from "./model";
import type {
  CustomVorschlag,
  GuideDocument,
  Kernbefund,
  Einwand,
  Umsetzungsposten,
} from "./types";

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
  anweisung: string | null,
  sammler?: Verbrauch[]
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
Systeme man für genau diesen Betrieb entwickeln müsste.

Denk dabei wie jemand, der den Betrieb kennt: Welche Tätigkeit frisst Zeit, läuft
über mehrere Systeme oder von Hand, und ließe sich mit etwas Gebautem anders
lösen? Branchenübliches zählt mit — eine Pflegeeinrichtung, die Medikamentengabe
und deren Dokumentation von Hand führt, braucht etwas anderes als ein
Handwerksbetrieb mit Materialbestellung.

Prüfe jeden Einfall erst gegen den Markt, bevor du ihn aufschreibst: Welche
Produkte gibt es dafür schon von der Stange?

Gibt es sie und decken sie den Bedarf, ist das keine Entwicklung, sondern eine
Einführung — die gehört in den Abschnitt für fertige Lösungen, nicht hierher.

Ein Vorschlag bleibt es in drei Fällen: wenn es das so nicht gibt; wenn es das
gibt, es aber nachweislich nicht abdeckt, was dieser Betrieb braucht; oder
wenn es das gibt und im Prinzip abdeckt, aber so schlecht auf diesen Betrieb
passt, dass eine eigene Lösung die bessere ist — weil er sich sonst um das
Produkt herum umstellen müsste, weil mehrere Programme nebeneinander nötig
wären, oder weil der Zuschnitt teurer käme als der Bau. In allen drei Fällen
muss im Datenbestand stehen, woran es liegt.

Dass dieser Betrieb etwas heute von Hand macht, heißt nicht, dass es dafür
keine Software gibt; es heißt nur, dass er sie nicht hat.

Eine Anbindung an vorhandene Software ist für sich kein Produkt. Besteht das
Eigene allein in der Schnittstelle, während das Programm davor von der Stange
kommt, dann schlag die Schnittstelle vor und nicht das Programm.

Lieber ein Vorschlag, der trägt, als drei, die der Kollege im Gespräch nicht
verteidigen kann. Findest du nur einen, nenn nur einen. Findest du keinen,
nenn keinen.

Wichtig: Für jeden Vorschlag muss es einen **Aufhänger** geben — eine konkrete
Stelle im Datenbestand, auf die sich der Vorschlag stützt. Eine Aufgabe mit
ihren Stunden, ein Medienbruch, eine Lücke, ein Freitext des Kunden, ein Satz
aus dem Unternehmenskontext. Ohne Aufhänger kein Vorschlag.

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

  const raw = await askModel({
    label: "Vorschläge",
    system: SYSTEM_ERZEUGER,
    prompt,
    maxTokens: 24000,
  }, sammler);
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
  vorfassung: GuideDocument | null,
  sammler?: Verbrauch[]
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
"umsetzung":[{"block":"in welchen Block des gebuchten Leistungsumfangs das fällt, wörtlich dessen Bezeichnung","titel":"was eingerichtet, automatisiert oder übernommen wird","befund":"der Befund mit seiner Zahl, der das nötig macht","womit":"das konkrete Produkt oder System, mit Namen — und wo mehrere infrage kommen, die erste Wahl und die Alternative","warum":"warum gerade das für genau diesen Betrieb: was an seiner Lage dafür spricht, woran es sonst scheitern würde, und was vorher zu klären ist","wieWirEsMachen":"wie wir vorgehen: was wir einrichten, was wir zuschneiden, welche Daten wir von wo übernehmen, wen wir einweisen — zwei bis vier Sätze","einordnung":"im gebuchten Paket enthalten oder darüber hinaus"}],
"workforceUrteil":"Passt OKUN Workforce für diesen Betrieb? Eine klare Antwort in drei bis fünf Sätzen, mit Begründung aus seinen Daten: Welche seiner Personalprozesse laufen heute wie, welche Module greifen dort, und wo greift es nicht. Passt es nicht, sag das — ein Personalsystem passt nicht zu jedem Betrieb, und wer das Gespräch führt, muss die Frage beantworten können, statt sie zu umgehen.",
"unsereLeistung":"Wie das abläuft: was wir erheben, in welcher Reihenfolge wir einrichten, was wir an Daten übernehmen, wen wir einweisen, wie lange wir begleiten. Vier bis sechs Sätze. Keine Aufzählung der Lösungen — die stehen schon in der Umsetzung.",
"einwaende":[{"einwand":"was der Kunde wahrscheinlich sagt, in seinen Worten","antwort":"die Antwort, ausformuliert zum Sagen"}],
"abschluss":"Was am Ende des Gesprächs vereinbart sein sollte. Konkrete nächste Schritte."}

Gib drei Kernbefunde und drei Einwände.

Zur Umsetzung — das ist der wichtigste Abschnitt des ganzen Dokuments.

Stell dir vor, wer das Gespräch führt: Der Kollege, der sonst die
Strategiegespräche macht, ist ausgefallen. Es geht jemand hinein, der den
Betrieb nicht kennt und von Software nichts versteht. Er hat nur dieses
Blatt. Fragt der Kunde "und was genau nehmen Sie da?" oder "warum
ausgerechnet das?", muss die Antwort hier stehen. Steht sie nicht da, kann
er sie nicht erfinden.

Deshalb reicht "wir richten eine Ablage ein" nicht. Es muss dastehen, **womit**
— mit Produktnamen —, **warum gerade das** für diesen Betrieb, und **wie** wir
dabei vorgehen.

Geh den gebuchten Leistungsumfang Block für Block durch, in seiner
Reihenfolge:

- **Digitale Grundlagen**: Welche fehlen ihm? Das sind die Werkzeuge, auf
  denen alles andere aufsetzt — eine Büro- und Zusammenarbeitsumgebung wie
  Google Workspace oder Microsoft 365, eine zentrale Dateiablage, ein
  CRM-System, Aufgaben- und Projektverwaltung, digitale Formulare. Nenne je
  Posten das Produkt, das du empfiehlst, und warum es für diesen Betrieb das
  richtige ist. Hat er schon eines, sag das und sag, was wir daran verbessern
  statt es zu ersetzen.
- **Automatisierungen**: Welche wiederkehrende Tätigkeit mit welcher
  Stundenzahl nehmen wir uns vor, und womit lösen wir sie? Das kann ein
  fertiges Produkt sein, eine Verbindung zwischen zweien, oder etwas, das
  direkt auf seiner digitalen Grundlage läuft — etwa eine Automatik in seiner
  Büroumgebung, wenn er ohnehin eine hat. Sag, welcher Weg hier der richtige
  ist und warum.
- **OKUN Workforce**: Welche seiner Personalprozesse greifen die Module auf?
  Dazu gehört ein ausdrückliches Urteil im Feld "workforceUrteil", ob das
  Paket für ihn passt.

Halte dich an die Grenzen des Umfangs. Steht dort "höchstens drei", nenne
höchstens drei — und wenn mehr sinnvoll wäre, schreib das in die Einordnung
des vierten Postens als "darüber hinaus", statt es stillschweigend
mitzuversprechen. Jeder Posten braucht einen Befund mit Zahl; ohne den
gehört er nicht in die Liste.

Zu den Produktnamen: Nenne sie, aber behaupte nichts über sie, was du nicht
weißt. Wo die Wahl von etwas abhängt, das im Datenbestand nicht steht —
welche Branchensoftware läuft, ob sie eine Schnittstelle hat —, gehört das
in das Feld "warum" als das, was vorher zu klären ist.

Nenne das, was der Kunde zu Beginn des Blueprints über seinen Betrieb
geschrieben hat, „Unternehmenskontext“ oder schlicht „im Blueprint“. Es gab
kein Vorgespräch und kein Telefonat — schreibe nie, er habe etwas „im
Vorgespräch“ gesagt.`;

  const raw = await askModel({
    label: "Leitfaden",
    system: SYSTEM_ERZEUGER,
    prompt,
    maxTokens: 48000,
  }, sammler);
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
    umsetzung: Array.isArray(parsed.umsetzung)
      ? (parsed.umsetzung as Umsetzungsposten[])
      : [],
    workforceUrteil: text(parsed.workforceUrteil, "— konnte nicht erzeugt werden —"),
    unsereLeistung: text(parsed.unsereLeistung, "— konnte nicht erzeugt werden —"),
    einwaende: Array.isArray(parsed.einwaende) ? (parsed.einwaende as Einwand[]) : [],
    abschluss: text(parsed.abschluss, "— konnte nicht erzeugt werden —"),
  };
}
