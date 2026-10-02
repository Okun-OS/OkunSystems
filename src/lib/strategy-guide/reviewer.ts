import { askModel, parseJson } from "./model";
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
   Satz aus dem Vorgespräch. „Erfahrungsgemäß“ ist kein Aufhänger.
3. Es geht wirklich um etwas, das gebaut werden müsste. Was gängige
   Standardsoftware von der Stange löst, besteht nicht.
4. Es passt zu dem, was dieser Betrieb laut Datenbestand tatsächlich tut.
   Branchentypisches, das hier nirgends vorkommt, besteht nicht.

Im Zweifel lehnst du ab. Ein abgelehnter guter Vorschlag kostet eine Runde;
ein durchgewunkener falscher kostet im Kundengespräch die Glaubwürdigkeit.

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
  vorschlaege: CustomVorschlag[]
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

{"urteile":[{"index":0,"bestanden":true,"begruendung":"ein Satz"}]}`;

  const raw = await askModel(SYSTEM_PRUEFER, prompt, 4000);
  const parsed = parseJson<{ urteile?: Pruefurteil[] }>(raw, "Prüfung");
  const urteile = Array.isArray(parsed.urteile) ? parsed.urteile : [];

  // Ein Vorschlag ohne Urteil gilt als nicht bestanden. Andersherum wäre ein
  // Aussetzer des Prüfers eine stillschweigende Freigabe.
  return vorschlaege.map((_, i) => {
    const treffer = urteile.find((u) => u.index === i);
    return (
      treffer ?? {
        index: i,
        bestanden: false,
        begruendung: "Die Prüfung hat zu diesem Vorschlag kein Urteil abgegeben.",
      }
    );
  });
}
