import { askModel, parseJson, type Verbrauch } from "./model";
import type { CustomVorschlag, Pruefurteil } from "./types";

const SYSTEM_PRUEFER = `Du prüfst Vorschläge bei OKUN Systems auf Belegbarkeit.

Jemand anderes hat sie geschrieben. Du weißt nicht, wer, und du siehst seine
Begründung nicht — nur den Datenbestand und das fertige Ergebnis. Deine Aufgabe
ist nicht, den Vorschlag gut zu finden oder zu verbessern, sondern festzustellen,
ob er trägt.

Ein Vorschlag besteht die Prüfung nur, wenn alle vier Punkte zutreffen:

1. Jede genannte Zahl steht **wörtlich** im Datenbestand. Eine umgerechnete,
   gerundete oder geschätzte Zahl besteht nicht. Eine Zahl, die du nicht
   wiederfindest, besteht nicht.
2. Der Aufhänger verweist auf eine Stelle, die es im Datenbestand wirklich
   gibt — eine Aufgabe, einen Medienbruch, eine Lücke, einen Freitext, einen
   Satz aus dem Unternehmenskontext. „Erfahrungsgemäß“ ist kein Aufhänger.
3. Es geht wirklich um etwas, das gebaut werden müsste. Was gängige
   Standardsoftware von der Stange löst, besteht nicht.

   Bevor du über diesen Punkt urteilst, schreibst du im Feld
   „standardprodukte“ auf, welche Produkte oder Produktgattungen das
   Beschriebene heute schon können — mit Namen, soweit du welche kennst.
   Erst danach urteilst du. Findest du nichts, schreibst du hin, warum es
   das nicht von der Stange gibt.

   Es gibt drei Wege, diesen Punkt zu bestehen:

   a) Es gibt das Beschriebene so nicht von der Stange.
   b) Es gibt es, deckt aber nachweislich nicht ab, was dieser Betrieb
      braucht.
   c) Es gibt es und deckt es im Prinzip ab, passt aber so schlecht auf
      diesen Betrieb, dass eine eigene Lösung die bessere ist — weil er
      sich sonst um das Produkt herum umstellen müsste, weil mehrere
      Programme nebeneinander nötig wären, oder weil der Zuschnitt teurer
      ausfällt als der Bau.

   In allen drei Fällen gilt dasselbe: Es muss im Datenbestand stehen,
   woran es liegt — ein Freitext, in dem der Kunde es benennt, eine
   Besonderheit seines Ablaufs, eine Anforderung von außen, eine Zahl aus
   der Auswertung. „Passt nicht richtig“ ohne Beleg reicht nicht, und bei
   c) genügt auch nicht, dass eine eigene Lösung schöner wäre: Der
   Vorschlag muss sagen, was am Zuschnitt des fertigen Produkts scheitert.

   Dieser Punkt gilt für **das, was gebaut würde**, nicht für den Betrieb.
   Dass ein Betrieb etwas heute von Hand macht, heißt nicht, dass es dafür
   keine Software gibt — es heißt nur, dass er sie nicht hat. Das ist dann
   eine Einführung, keine Entwicklung.

   Eine Anbindung an vorhandene Software ist für sich genommen kein
   Produkt. Besteht das Eigene allein in der Schnittstelle, während das
   Programm davor von der Stange kommt, besteht der Vorschlag nicht — er
   muss dann auf die Schnittstelle zugeschnitten werden.

4. Es passt zu dem, was dieser Betrieb laut Datenbestand tatsächlich tut.
   Branchentypisches, das hier nirgends vorkommt, besteht nicht.

Im Zweifel lehnst du ab. Ein abgelehnter guter Vorschlag kostet eine Runde;
ein durchgewunkener falscher kostet im Kundengespräch die Glaubwürdigkeit.

Urteile unabhängig voneinander nach denselben Maßstäben. Wenn du einen
Vorschlag ablehnst, weil es das von der Stange gibt, muss derselbe Maßstab
für jeden anderen Vorschlag gelten, der ebenfalls ein Programm beschreibt.

Deine Begründung sagt in einem Satz, welcher der vier Punkte verletzt ist und
woran es konkret liegt — so, dass man es beheben kann.

Du antwortest ausschließlich mit JSON, ohne einleitenden Satz und ohne
Code-Zaun.`;

/**
 * Prüft die Vorschläge gegen den Datenbestand — in einem eigenen Aufruf.
 *
 * Bewusst getrennt vom Erzeuger: Eine zweite Runde in derselben Unterhaltung
 * sähe die eigene Begründung noch und ließe sich von ihr überzeugen. Ein
 * frischer Aufruf kennt sie nicht und muss selbst nachsehen.
 *
 * Deshalb bekommt der Prüfer die Vorschläge auch **ohne** den Text, mit dem
 * der Erzeuger sie begründet hat — nur Titel, Aufhänger, Idee, Nutzen und
 * Größenordnung, also das, was am Ende im Leitfaden stünde.
 */
export async function pruefeVorschlaege(
  dossier: string,
  vorschlaege: CustomVorschlag[],
  sammler?: Verbrauch[]
): Promise<Pruefurteil[]> {
  if (vorschlaege.length === 0) return [];

  const liste = vorschlaege
    .map(
      (v, i) =>
        `### Vorschlag ${i}\nTitel: ${v.titel}\nAufhänger: ${v.aufhaenger}\nIdee: ${v.idee}\nNutzen: ${v.nutzen}\nGrößenordnung: ${v.groessenordnung}`
    )
    .join("\n\n");

  const prompt = `Hier ist der Datenbestand zu einem Betrieb, danach Vorschläge für
Systeme, die man für ihn entwickeln könnte. Prüfe jeden einzeln.

=== DATENBESTAND ===

${dossier}

=== ENDE DATENBESTAND ===

=== VORSCHLÄGE ===

${liste}

=== ENDE VORSCHLÄGE ===

Antworte mit JSON in genau dieser Form, mit einem Eintrag je Vorschlag:

{"urteile":[{"index":0,"standardprodukte":"welche Produkte oder Gattungen das heute schon können","bestanden":true,"begruendung":"ein Satz"}]}

Die Reihenfolge der Felder ist bindend: „standardprodukte“ steht vor
„bestanden“, weil der Marktblick dem Urteil vorausgeht und nicht folgt.`;

  const raw = await askModel({
    label: "Prüfung",
    system: SYSTEM_PRUEFER,
    prompt,
    maxTokens: 16000,
  }, sammler);
  const parsed = parseJson<{ urteile?: Pruefurteil[] }>(raw, "Prüfung");
  const urteile = Array.isArray(parsed.urteile) ? parsed.urteile : [];

  // Ein Vorschlag ohne Urteil gilt als nicht bestanden. Andersherum wäre ein
  // Aussetzer des Prüfers eine stillschweigende Freigabe.
  return vorschlaege.map((_, i) => {
    const roh = urteile.find((u) => u.index === i);
    // Ein Bestehen ohne Marktblick ist keines: Punkt 3 wurde dann nicht
    // geprüft, sondern übersprungen.
    const treffer =
      roh && roh.bestanden && !roh.standardprodukte?.trim()
        ? {
            ...roh,
            bestanden: false,
            begruendung:
              "Punkt 3 ist offen: Die Prüfung hat nicht benannt, was Standardsoftware davon heute schon leistet.",
          }
        : roh;
    return (
      treffer ?? {
        index: i,
        standardprodukte: "",
        bestanden: false,
        begruendung: "Die Prüfung hat zu diesem Vorschlag kein Urteil abgegeben.",
      }
    );
  });
}
