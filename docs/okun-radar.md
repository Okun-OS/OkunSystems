# OKUN Radar

Die kostenlose, interaktive Potenzialanalyse im laufenden Videogespräch.
Eine Vorstufe des OKUN Blueprints — kürzer, unverbindlich, vorläufig.

---

## 1. Was das Radar ist und was nicht

| | OKUN Radar | OKUN Blueprint |
|---|---|---|
| Kosten | kostenlos | Bestandteil des beauftragten Prozesses |
| Dauer | 10–15 Minuten Fragenphase | vollständige Erhebung |
| Zweck | Erkennen, ob eine Zusammenarbeit überhaupt sinnvoll ist | Die erkannten Potenziale vollständig untersuchen |
| Ergebnis | Erste Einschätzung mit ausgewiesener Aussagekraft | Erhobener Befund |
| Tiefe | Oberflächenfragen, ein Prozess exemplarisch | Prozessaufnahme, Systeme, Aufgaben, Abläufe |

Das Radar ersetzt den Blueprint nicht und darf es auch nicht. Jede Angabe aus
dem Radar trägt deshalb die Herkunft `radar` und `bestaetigt: false` — siehe
Abschnitt 8.

**Ein ehrliches Nein ist ein reguläres Ergebnis.** Stufe C („Aktuell kein
ausreichender Bedarf erkennbar") ist kein Fehlerfall. Die Bewertung ist so
gebaut, dass sie dort auch tatsächlich landet, statt jeden Interessenten zum
Kunden zu erklären.

---

## 2. Ablauf im Gespräch

```
Closing-Gespräch läuft (bestehende Videoplattform)
 └─ Reiter „OKUN Radar“ → Radar starten
     └─ Phase 1 · Unternehmensprofil        (2–3 min, aus dem CRM vorbelegt)
         └─ Phase 2 · Potenzialcheck        (6–8 min, 8–12 Fragen, verzweigt)
             └─ Phase 3 · Prozess-Spotlight (2–4 min, ein Ablauf, 5 Fragen)
                 └─ Auswertung erzeugen     (intern: Stufe, Begründung, Belege)
                     └─ Ergebnis freigeben  (jetzt erst sieht es der Kunde)
                         └─ Analyse abschließen (eingefroren)
                             └─ „Zum Angebot“ → bestehender Closing-Ablauf
```

Der Interessent sieht die Analyse über seinen vorhandenen Einladungslink —
auf der Bühne des Videogesprächs, die Gesichter daneben, das Gespräch läuft
durchgehend weiter.

---

## 3. Dateien

### Konfiguration und Rechnen (ohne Datenbank, ohne Oberfläche)

| Datei | Inhalt |
|---|---|
| `src/lib/radar/catalog.ts` | Fragen, Antworten, Gewichte, Verzweigungsregeln, Potenzialfelder, Widersprüche, Schwellen, Ergebnisformulierungen, Live-Dimensionen, Live-Beobachtungen |
| `src/lib/radar/engine.ts` | Aktive Fragen, Bewertung, Stufenentscheidung, Fortschritt, auffällige Antworten |
| `src/lib/radar/live.ts` | Das Live-Bild: fünf Dimensionen und die Beobachtungen dazu |

Beide Dateien greifen nicht auf die Datenbank zu. Das ist Absicht: Die
Interessentenansicht ist eine Client-Komponente, und was `db` importiert,
kommt dort nicht an.

### Daten und Server

| Datei | Inhalt |
|---|---|
| `src/lib/radar/service.ts` | Lesen und Schreiben, Start, Auswertung einfrieren, Abschluss |
| `src/lib/radar/views.ts` | **Die Grenze**: `kundenAnsicht` und `closerAnsicht` |
| `src/lib/radar/blueprint-handover.ts` | Übernahme ins Blueprint, als vorläufig gekennzeichnet |
| `src/lib/radar/report-html.ts` | Der Ergebnisbericht als Druckbogen |
| `src/lib/radar/kanal.ts` | Stups zwischen Radar und Videogespräch |
| `src/app/api/closing/radar/route.ts` | Kundenseite, tokengesichert |
| `src/app/api/admin/radar/pdf/route.ts` | Bericht als PDF |
| `src/app/(admin)/admin/sales/closing/[sessionId]/radar-actions.ts` | Server-Actions des Closers |

### Oberfläche

| Datei | Inhalt |
|---|---|
| `src/components/radar/cockpit.tsx` | Die Hülle: drei Spalten, Kopfzeile, Phasenleiste |
| `src/components/radar/radar-chart.tsx` | Das Netzdiagramm (SVG) und die Dimensionsliste |
| `src/components/radar/live-dashboard.tsx` | Diagramm plus Beobachtungskarten |
| `src/components/radar/pieces.tsx` | Fragekarte und Ergebnisbericht |
| `src/components/radar/radar-stage.tsx` | Interessentenansicht |
| `src/app/(admin)/admin/sales/closing/[sessionId]/RadarPanel.tsx` | Steuerpult des Closers |

### Geändert, nicht neu

| Datei | Änderung |
|---|---|
| `prisma/schema.prisma` | `RadarSession`, `RadarAnswer`, `ClosingSession.liveRadarSessionId` |
| `src/components/closing/okun-call.tsx` | Neue Bühne `stage`, neue Nachricht `{k:"radar"}` |
| `src/lib/closing/client-view.ts` | `radarActive` im Kundenstand |
| `src/app/closing/[token]/ClosingClientView.tsx` | Radar auf der Bühne und als Rückfallebene |
| `src/app/(admin)/.../ClosingWorkspaceClient.tsx` | Reiter „OKUN Radar“ |
| `src/app/(admin)/admin/kunden/[id]/page.tsx` | Abschnitt „Aus dem OKUN Radar“ |

---

## 4. Datenbank

```prisma
RadarSession
  status           vorbereitet | laeuft | ausgewertet | abgeschlossen | abgebrochen
  phase            profil | potenzial | spotlight | ergebnis
  katalogVersion   Fingerabdruck des Katalogs zum Zeitpunkt der Analyse
  cursorKey        die Frage, die beide Seiten gerade sehen
  spotlightKey     der betrachtete Prozess
  profil           JSON, Phase 1
  internalNotes    interne Notiz — erreicht die Kundenseite nie
  ergebnis         JSON, eingefroren bei der Auswertung
  closerStufe      abweichende Einschätzung, tritt NEBEN das Systemurteil
  rev              zählt bei jeder Änderung hoch
  abgeschlossenAm  gesetzt = unveränderlich
  freigegebenAm    ab hier sieht der Kunde das Ergebnis

RadarAnswer
  frageKey, optionKeys (JSON), uebersprungen
  quelle           closer | client — wer die Antwort gesetzt hat
  @@unique([radarSessionId, frageKey])
```

Keine Migration nötig: Der Betrieb rollt mit `prisma db push` aus
(`railway.json`, `nixpacks.toml`).

---

## 5. Die Bewertungslogik

### Drei getrennte Achsen

| Achse | Frage |
|---|---|
| **Digitaler Reifegrad** | Wie gut ist der Betrieb heute digital organisiert? |
| **Optimierungspotenzial** | Wie groß ist das erkennbare Verbesserungspotenzial? |
| **Passung zu OKUN Systems** | Passen Problem, Rahmen und Bereitschaft zu dem, was wir leisten? |

Die Achsen sind **unabhängig**. Ein niedriger Reifegrad erzeugt keinen hohen
Fit, und ein hoher Reifegrad schließt ihn nicht aus. Wer sie koppelt, bekommt
am Ende immer das Ergebnis, das er sich wünscht.

### Wie gerechnet wird

1. Jede gewählte Antwort trägt Punkte auf höchstens drei Achsen und **einen
   Beleg** — einen Satz darüber, was sie über den Betrieb aussagt. Eine
   Antwort ohne Beleg darf keine Punkte geben.
2. Je Frage und Achse wird die mögliche Spanne aus ihren eigenen Optionen
   gebildet. Fragen, die zu einer Achse nichts sagen, zählen dort nicht mit.
3. Bei Mehrfachauswahl bildet sich die Spanne aus den **drei stärksten**
   Optionen, und der tatsächliche Wert wird hineingestaucht: Wer sechs
   Zeitfresser nennt, hat nicht doppelt so viel Potenzial wie jemand mit drei
   — er hat es breiter verteilt.
4. Normiert auf 0–100 über alle beantworteten, aktiven Fragen.

Nur Fragen, die in diesem Durchlauf tatsächlich gestellt wurden, zählen. Eine
übersprungene Verzweigung verschiebt das Ergebnis nicht.

### Aussagekraft

Anteil der **aktiven Kernfragen**, die wirklich beantwortet wurden.
„Weiß ich nicht" zählt als *nicht* beantwortet, „Nichts davon" als beantwortet
— der Unterschied ist keine Spitzfindigkeit: Das eine macht das Ergebnis
unsicherer, das andere klarer.

* unter 60 % → **keine Zahlen**, nur die Kategorien gering/mittel/hoch
* unter 70 % → **kein Urteil**, immer Stufe B, in beide Richtungen

### Die Stufenentscheidung

Die Reihenfolge der Prüfungen ist die eigentliche Aussage:

```
1. Aussagekraft < 70 %                     → B   (kein Urteil möglich)
2. Potenzial < 35                          → C   (gut aufgestellt)
3. Fit < 35                                → C   (außerhalb unseres Bereichs)
4. Potenzial ≥ 60 UND Fit ≥ 60             → A   (breiter Bedarf)
   oder Fit ≥ 60 UND zwei Felder ≥ 3 Belege → A  (konzentrierter Bedarf)
   dabei: ab 2 Widersprüchen               → B
5. sonst                                   → B
```

Der zweite Weg zu Stufe A ist der wichtigere. Die Potenzialachse misst, wie
viel **im Ganzen** hakt, nicht wie viel **an einer Stelle** hakt. Ohne diesen
Weg könnte ein durchdigitalisierter Betrieb mit einem ernsten
Integrationsproblem nie Stufe A erreichen — und genau solche Betriebe sind oft
die besten Kunden, die wir bekommen können.

### Potenzialfelder

Ein Feld erscheint nur, wenn **mindestens zwei Antworten** es stützen. Eine
einzelne Antwort ist ein Hinweis, kein Befund. Höchstens drei Felder, sortiert
nach Anzahl der Belege. Die Belege stehen beim Kunden mit im Bericht — es sind
seine eigenen Aussagen.

### Widersprüche

Definierte Antwortpaare, die sich fachlich nicht vertragen, z. B. „jede Angabe
wird nur einmal erfasst" neben „zwischen den Programmen überträgt
ausschließlich ein Mensch". Sie erscheinen nur beim Closer, senken aber ab
zwei Stück ein A auf ein B.

### Was es nicht gibt

Keine Zufallswerte, keine erfundenen Prozentzahlen, keine Einsparversprechen,
keine Preisangaben. Verbindliche Zahlen entstehen ausschließlich aus einem
konfigurierten Angebot.

### Die abweichende Einschätzung des Closers

Sie tritt **neben** das Systemurteil, statt es zu ersetzen, und verlangt eine
Begründung. Beide bleiben im Protokoll lesbar; der Kunde sieht nur das
Systemurteil.

---

## 5a. Das Live-Bild

Während des Gesprächs wächst rechts ein Netzdiagramm über fünf Dimensionen:
**Prozesse, Systeme, Automatisierung, Daten, Organisation**. Es zeigt denselben
Reifegrad wie die Auswertung, nur nicht als eine Zahl, sondern als fünf — jede
Frage zahlt über ihr Thema auf genau eine Dimension ein (`DIMENSIONEN` im
Katalog). Ein Test prüft, dass Live-Bild und Reifegrad nicht auseinanderlaufen.

Nicht dabei sind **Veränderungsbereitschaft** und **wirtschaftliche Relevanz**.
Beides sind gute Fragen, aber sie sagen nichts darüber aus, wie der Betrieb
digital dasteht — sie gehören zur Passung. Zwei verschiedene Dinge in dieselbe
Fläche zu malen macht die Fläche bedeutungslos.

### Was dort nicht steht

Die Designvorlage zeigte einen „Branchen-Benchmark", „bis zu 40 % Effizienz­gewinn
möglich" und einen „KI-Insight" mit einem Durchschnittswert. **Nichts davon ist
umgesetzt**, und zwar absichtlich: Wir haben keine Branchendaten, keine
Wirkungsmessung und keine Grundlage für eine Hochrechnung. Eine erfundene Zahl
auf dem Bildschirm ist eine Zahl, nach der der Kunde fragt — und dann steht der
Kollege da. Ein Test (`keine Beobachtung erfindet Zahlen, Vergleiche oder
Versprechen`) hält das offen.

Stattdessen:

* **eine Reihe statt zwei** — der Betrieb selbst, kein Vergleichsring
* **Beobachtungen statt Erkenntnisse** — jede Karte nennt die Frage, aus der sie
  folgt (`BEOBACHTUNGEN` im Katalog), und formuliert nur, was die Antwort hergibt
* **Stärken genauso wie Hinweise** — ein gut aufgestellter Betrieb bekommt grüne
  Karten, keine erfundenen Probleme

### Fehlende Daten sehen aus wie fehlende Daten

Eine Dimension ohne Antwort trägt `wert: null` und erscheint als gestrichelte
Achse mit hohlem Ring und der Beschriftung „noch offen". Sie auf null zu
zeichnen hieße „null von fünf" zu behaupten, und das hat niemand gesagt.

Eine Dimension, die tatsächlich bei 0,0 landet, bekommt im Diagramm einen
kleinen Sockel (10 % des Radius), damit sie nicht im Mittelpunkt verschwindet
und dort mit „nicht erfasst" verwechselt wird. Der Sockel ist reine
Darstellung — die Zahl daneben ist die gemessene.

### Farben

Eine Reihe in der Markenfarbe; die Farbe trägt keine Bedeutung. Die
Beobachtungskarten nutzen Statusfarben (Bernstein für Hinweise, Grün für
Stärken). Geprüft mit dem Palettenvalidator: Grün und Bernstein liegen für
Rotblindheit bei ΔE 5,7 und damit zu dicht beieinander — die Karten tragen
deshalb **Symbol und Beschriftung**, nicht nur die Tönung.

---

## 6. Die Grenze zur Kundenseite

`src/lib/radar/views.ts` stellt die Kundensicht **eigens zusammen**, statt
von einer gemeinsamen Basis etwas abzuziehen. Ein Feld landet dort nur, wenn
es ausdrücklich hineingeschrieben wird — nicht, weil jemand vergessen hat, es
zu entfernen.

Nie auf der Kundenseite:

* Gewichte und Signalwerte der Antworten
* die Absicht hinter einer Frage und der Satz zum Vorlesen
* die Belege je Achse
* die Begründung der Stufe mit ihren Rohwerten
* erkannte Widersprüche
* auffällige Antworten
* die interne Gesprächsnotiz
* die abweichende Einschätzung des Closers

Geprüft in `tests/radar-e2e.ts` gegen die rohe Antwort der Route, nicht gegen
ein Objekt.

---

## 7. Synchronisierung

Der Server ist die einzige Wahrheit. Beide Seiten fragen den Stand zyklisch ab
(2,5 s). Zusätzlich stupst jede Seite die andere über den Datenkanal des
Videogesprächs (`sendAppMessage`, `{k:"radar"}`) — der Stups trägt **keinen
Inhalt**, er spart nur die Wartezeit bis zum nächsten Takt. Geht er verloren,
merkt es niemand.

Weil Radar und Videogespräch in verschiedenen Komponenten stehen, treffen sie
sich in `src/lib/radar/kanal.ts`.

**Gleichzeitige Eingaben:** Eine Antwort steht pro Frage genau einmal
(`@@unique`); wer zuletzt schreibt, gewinnt, und `rev` sagt der Gegenseite, dass
sie nachladen muss. Für eine Frage mit vier Knöpfen ist das die richtige
Auflösung — ein Sperrmechanismus würde im Gespräch mehr kaputtmachen, als er
rettet.

**Verbindungsabbruch:** Für den Server nichts weiter als eine ausbleibende
Anfrage. Alle Antworten stehen dort; der nächste Takt holt den Stand nach. Die
Oberfläche zeigt den Verbindungszustand an und verliert nichts.

**Wiederaufnahme:** Ein zweiter Start öffnet dieselbe Analyse, nicht eine neue.

**Doppelter Abschluss:** `schliesseAb` ist idempotent. Ein zweiter Klick ändert
nichts und meldet keinen Fehler. Eine abgeschlossene Analyse nimmt keine
Antwort mehr entgegen und wird nicht neu gerechnet.

---

## 8. Übernahme in den Blueprint

`radarUebernahme(companyId)` liefert die jüngste **abgeschlossene** Analyse
aufbereitet:

* das Unternehmensprofil in lesbarer Form (`g_25_49` → „25 bis 49")
* die im Radar berührten Themen
* den betrachteten Spotlight-Ablauf
* das Urteil mit `vorlaeufig: true`
* die im Radar offen gebliebenen Fragen — die ersten Kandidaten im Blueprint

Jedes Feld trägt `herkunft: "radar"` und `bestaetigt: false`. Die Funktion
liefert ausdrücklich **keine** fertigen `SessionAnswer`-Datensätze: Wer sie
übernehmen will, muss sie bestätigen lassen, und das kann nur die Oberfläche,
die dem Kunden die Frage stellt.

Sichtbar unter `/admin/kunden/[id]` im Abschnitt „Aus dem OKUN Radar", dort
ausdrücklich als vorläufig gekennzeichnet.

---

## 8a. Das Cockpit

**Zwei Zonen**, nicht drei Spalten: links die Bühne mit der Frage, rechts ein
durchgehendes Panel aus Gesprächsraum und Live-Analyse. Darüber die
Markenleiste und die Phasenschiene über die volle Breite.

Der erste Entwurf hatte drei Spalten unterschiedlicher Länge — und unter jeder
eine große schwarze Fläche, weil keine die andere ausfüllte. Zwei Zonen, die
beide bis zum Rand reichen, haben das Problem nicht: Die Bühne zentriert ihren
Inhalt über `my-auto` (nicht über `justify-center` — das schneidet einen zu
hohen Inhalt oben und unten ab, und oben steht die Frage), das Panel lässt die
Analyse den Rest einnehmen.

Die Navigation ist in die Markenleiste gewandert. Drei Einträge, von denen
während des Gesprächs meist zwei gesperrt sind, rechtfertigen keine eigene
Spalte.

Beide Seiten arbeiten in **derselben Hülle** (`cockpit.tsx`) — säßen sie vor
verschieden gebauten Oberflächen, redeten sie im Gespräch über verschiedene
Bilder.

**Beim Interessenten** nimmt das Cockpit den ganzen Bildschirm, solange die
Analyse läuft. Das Videogespräch läuft darin weiter: `OkunCall` bekommt ein
`stageLayout` und reicht die Teilnehmerkacheln samt Gesprächssteuerung in den
Gesprächsbereich. Kommt kein Videoraum zustande — keine Kamera, kein WebRTC,
Raum noch nicht eingerichtet —, läuft die Analyse trotzdem; dann eben mit dem
Telefon am Ohr.

### Wo das Video sitzt

Der Gesprächsbereich **steht immer da**, auch ohne laufendes Gespräch. Dann
zeigt er zwei reservierte, beschriftete Plätze und sagt, wie man hineinkommt.
Der Unterschied zwischen „hier ist kein Video" und „hier ist noch kein Video"
entscheidet darüber, ob jemand überhaupt danach sucht.

| Breite | Zuschnitt |
|---|---|
| ab `lg` | Eigener Block oben in der rechten Spalte, über dem Live-Bild. Zwei Kacheln im Seitenverhältnis 16:9, darüber die Überschrift „Gesprächsraum" und die Steuerung. |
| darunter | Schmale, am oberen Rand klebende Gesprächsleiste: zwei kleine Bilder links, Steuerung rechts — wie in jeder Telefonie-App. Ein leerer Gesprächsraum darf auf dem Telefon kein Drittel des Bildschirms einnehmen. |

Jede Kachel trägt einen farbigen Strich (Türkis für das Gegenüber, Grün für
einen selbst), Namen, Rolle und ein Stummsymbol. Bei abgeschalteter Kamera
erscheint die Initiale, nicht ein schwarzes Rechteck.

**Beim Closer** liegt dasselbe Dreigespann im Reiter „OKUN Radar", ergänzt um
das, was nur er sieht: Absicht und Vorlesesatz je Frage, Herkunft der Antworten,
auffällige Antworten, interne Notizen. Sein Video bleibt im bekannten
verschiebbaren Fenster.

**Schmale Bildschirme** stapeln in der Reihenfolge Navigation → Frage →
Live-Bild. Die Höhenbegrenzungen des Dreispaltenlayouts greifen erst ab `lg`;
ohne diese Trennung quetscht `flex-1 min-h-0` die Mittelspalte auf dem Telefon
auf wenige Pixel zusammen.

---

## 9. Berechtigungen

| Wer | Weg | Schranke |
|---|---|---|
| Closer / Admin | Server-Actions in `radar-actions.ts` | `requireSessionAccess` — dieselbe Schranke wie Angebot und Vertragsabschluss. Zusätzlich wird geprüft, dass die Analyse zu **diesem** Gespräch gehört |
| Interessent | `/api/closing/radar` | das Token des Einladungslinks. Es wird **keine** Analyse-ID entgegengenommen — die ergibt sich aus der Closing Session |
| PDF | `/api/admin/radar/pdf` | ADMIN, oder der Closer, dem das Gespräch gehört |

Der Interessent darf: antworten, korrigieren, sein Profil ergänzen, den
Spotlight-Ablauf mitwählen und zwischen den Fragen blättern. Das Blättern ist
bewusst erlaubt — es ist seine Analyse, und ein Knopf, der nur beim Berater
liegt, macht aus dem gemeinsamen Gespräch eine Vorführung. Weiter geht erst,
wenn die Frage beantwortet ist.

Er darf nicht: überspringen, auswerten, freigeben, abschließen.

Antworten auf Fragen, die in dieser Analyse gar nicht gestellt werden, werden
abgelehnt (409). Erfundene Antwortoptionen werden verworfen. Unbekannte
Profilfelder werden stillschweigend fallengelassen.

---

## 10. Tests

```bash
npx tsx tests/radar.ts                                     # Bewertungslogik, 25 Tests
DATABASE_URL=… npx tsx tests/radar-e2e.ts                  # Datenbank und Route, 24 Tests
```

`tests/radar.ts` deckt neben der Bewertung auch das Live-Bild ab: dass ohne
Antworten keine Dimension einen Wert trägt, dass eine Antwort genau ihre
Dimension füllt, dass Beobachtungen nur aus gegebenen Antworten entstehen, dass
keine davon Zahlen, Vergleiche oder Versprechen erfindet, und dass Live-Bild und
Reifegrad nicht auseinanderlaufen.

Die Szenarien aus dem Entwicklungsauftrag:

1. viele manuelle Abläufe → Stufe A mit belegten Feldern
2. hoher Digitalisierungsgrad mit Integrationspotenzial → Stufe A über den
   konzentrierten Weg
3. bereits gut aufgestellt → Stufe C, kein Blueprint empfohlen, das Nein steht
   wörtlich in der Einschätzung
4. unvollständige und widersprüchliche Antworten → Stufe B, Zahlen werden
   unterdrückt, Widersprüche benannt

`tests/radar-e2e.ts` deckt ab: Vorbelegung ohne Erfindung, Wiederaufnahme,
Antworten beider Seiten, gleichzeitige Eingaben, Verbindungsabbruch,
doppelter Abschluss, Zugangsschranken und die Grenze zur Kundenseite.

---

## 11. Erweitern

Alles, was sich ändern soll, steht in `catalog.ts`:

* **Frage ergänzen** → Eintrag in `FRAGEN_POTENZIAL` oder `FRAGEN_SPOTLIGHT`.
  Jede Option braucht `beleg`. `kern: true` nur, wenn das Fehlen der Antwort
  die Aussagekraft wirklich senkt.
* **Verzweigung** → `wenn: [...]` an der Frage. Bedingungen beziehen sich auf
  frühere Antworten oder den bis dahin aufgelaufenen Achsenwert.
* **Gewichte ändern** → `signale` an den Optionen.
* **Schwellen ändern** → `SCHWELLEN`.
* **Formulierungen** → `STUFEN`, und für die Einschätzung
  `formuliereEinschaetzung` in `engine.ts`.
* **Branchenvarianten** → über `wenn`-Bedingungen auf Profilfelder, oder ein
  zweiter Katalog mit eigener `KATALOG_VERSION`.

**Nach jeder Änderung `KATALOG_VERSION` hochzählen.** Sie wird auf jeder
Analyse gespeichert; das Steuerpult weist darauf hin, wenn ein altes Ergebnis
mit anderen Fragen entstanden ist.

---

## 9a. Markenführung

Absender gegenüber dem Interessenten ist **OKUN Systems** — kein zweiter
Markenname daneben. Er weiß, bei wem er sitzt; ein „OKUN Radar“ als eigene
Wortmarke in derselben Ecke macht aus einem Haus zwei und verwässert beide.

* Kopfleiste: das OKUN-Systems-Logo, daneben der Unternehmensname und die
  Zeile „Potenzialanalyse · Branche · Größe“.
* Übergang: die Bildmarke, darunter „OKUN SYSTEMS“, darunter der Zusammenhang
  („Interaktive Potenzialanalyse“, „Ihre Auswertung“, „Ihr Angebot“, „Zurück
  ins Gespräch“).
* Ergebnisbericht: Überschrift „Potenzialanalyse“, ohne Wortmarke.

Intern — im Steuerpult des Closers — heißt es weiterhin OKUN Radar. Dort ist
es ein Werkzeugname unter mehreren und genau richtig.

### Die Mitte der Bildmarke

Der Ring der Marke sitzt bei (642, 612), die Mitte ihres Zeichenrahmens aber
bei (575, 612) — der waagerechte Balken läuft nach links hinaus und zieht den
Rahmen mit. Wer die Marke mittig setzt, setzt damit **den Rahmen** mittig, und
der Ring steht 67 Einheiten daneben.

`radar-marke.tsx` legt deshalb Wellen, Strahl und Marke in ein einziges
Koordinatensystem, dessen Mitte der Ringmittelpunkt ist. Alles darunter teilt
sich damit eine Achse — ohne Rechnerei mit Versätzen, die beim nächsten
Größenwechsel wieder nicht stimmt.

---

## 10a. Der Schnitt zwischen den Werkzeugen

Wechselt der Interessent vom Videogespräch in das Radar — oder vom Radar
weiter zum Angebot —, legt sich für 1,75 Sekunden die Marke über den
Bildschirm: die Bildmarke mit Schein, zwei aufziehende Ringe, ein Lichtstreifen
quer durchs Bild, „OKUN RADAR" und die Unterzeile.

Das ist kein Zierrat. Ein Bildschirm, der lautlos seinen Inhalt tauscht, fühlt
sich an wie eine Webseite; ein Schnitt fühlt sich an wie Software, die jemand
gebaut hat. Genau das ist im Verkaufsgespräch die Aussage.

Vier Übergänge: `radar`, `ergebnis`, `angebot`, `gespraech` — jeder mit
eigener Unterzeile. Die Marke sendet dabei Wellen nach außen und wird von
einem umlaufenden Strahl abgetastet; das Ding heißt Radar, und das Bild soll
halten, was der Name verspricht.

`modus-uebergang.tsx`, gesteuert über `ClosingClientView`. Er läuft nur bei
einem **Wechsel**, nicht beim ersten Aufbau — wer die Seite neu lädt, während
das Radar schon läuft, soll nicht jedes Mal den Vorspann sehen. Wer Bewegung
abbestellt hat (`prefers-reduced-motion`), bekommt denselben Schnitt als kurzes
Aufblenden: Die Information, dass das Werkzeug gewechselt hat, bleibt.

**Dazu gehört der Abfragetakt.** Vor dem Beitritt fragt die Kundenseite alle
drei Sekunden nach, nicht mehr alle acht. Der Berater klickt „Radar starten",
und beim Interessenten passierte vorher eine halbe Ewigkeit lang nichts — im
Verkaufsgespräch die längsten acht Sekunden des Tages.

---

## 11a. Gestaltung

Was den Eindruck trägt, und warum es so gebaut ist:

* **Material statt Farbe.** Über allem liegen drei Lichtkegel, eine feine
  Körnung (3,5 % Deckkraft, `feTurbulence` als Datenbild) und eine Vignette.
  Die Körnung ist der wirksamste Kunstgriff für dunkle Oberflächen: Sie bricht
  die Verläufe auf, die sonst in sichtbaren Stufen bandieren, und gibt der
  Fläche eine Textur statt einer Farbe. Jede Karte bekommt an der Oberkante
  eine Haarlinie Licht.
* **Die Phasenschiene** läuft über die volle Breite, jede Phase ein eigenes
  Segment mit Lichtbalken unter der laufenden. Keine Punktreihe.
* **Die Frage** steht bei 38 px mit enger Laufweite — sie ist der Gegenstand
  des Gesprächs und soll aussehen wie einer.
* **Antwortkarten reagieren.** Beim Überfahren: ein Akzentstrich wächst links
  hinein, die Karte hebt sich zwei Pixel, das Bildzeichen bekommt Farbe und
  einen Schein. Bei Auswahl: Verlauf, Außenschein und ein gefüllter Marker.
  Tastaturfokus hat einen eigenen Ring.
* **Bildzeichen je Antwort** — aber nur, wo die Antworten inhaltlich
  Verschiedenes bezeichnen (Bereiche, Reibungspunkte). Bei Skalenfragen tragen
  alle Antworten das Zeichen der Frage: Vier verschiedene Zeichen auf einer
  Skala sagen nichts über den Inhalt, sondern nur, welche Antwort uns am
  liebsten wäre.
* **Bewegung, die etwas bedeutet.** Die Antwortkarten laufen gestaffelt ein
  (45 ms Versatz), die Netzkante zeichnet sich, der Fortschrittsbalken trägt
  einen atmenden Lichtpunkt an der Spitze. Alles respektiert
  `prefers-reduced-motion`.
* **Das Netzdiagramm** hat einen Verlauf von innen nach außen, eine
  weichgezeichnete Kante als Schein und Messpunkte mit Halo. Jede Dimension
  bekommt zusätzlich einen Balken: Aus einem Fünfeck eine Zahl abzulesen
  gelingt niemandem zuverlässig.
* **Eigene SVG-Kennungen je Diagramm** (`useId`). Standen zwei Diagramme auf
  einer Seite — im Steuerpult war genau das der Fall —, kollidierten die
  Kennungen für Verlauf und Weichzeichner und die Fläche verschwand in beiden.

---

## 11b. Die drei Momente

Was aus einer Oberfläche ein Erlebnis macht, sind nicht gleichmäßig verteilte
Effekte, sondern drei Stellen, an denen etwas passiert:

1. **Der Eintritt.** Der Schnitt mit der Marke — der Interessent merkt, dass
   er in ein anderes Werkzeug gewechselt ist.
2. **Der Einschlag.** Jede Antwort landet sichtbar: Am getroffenen Messpunkt
   läuft eine Welle nach außen, die Zahl zählt auf ihren neuen Wert zu, die
   Zeile leuchtet kurz auf (`einschlag.ts`). Ohne diesen Moment bleibt „wir
   durchleuchten Ihren Betrieb gemeinsam“ eine Behauptung — die Zahl springt,
   und niemand merkt es.
3. **Die Enthüllung.** Gibt der Berater das Ergebnis frei, baut sich der
   Bericht auf: Die Balken laufen von null hoch, die Werte zählen mit, die
   Potenzialfelder kommen gestaffelt nach. Das ist der Moment, auf den die
   Viertelstunde hinausläuft.

Alle drei sind rein darstellend. Die Werte stehen fest, bevor etwas läuft.

---

## 12. Offene Punkte

* **Keine generative KI im Spiel.** Die Ersteinschätzung entsteht
  deterministisch aus den Antworten. Das war eine bewusste Entscheidung:
  gleiche Antworten müssen dasselbe Ergebnis geben, mitten im Gespräch darf
  nichts auf ein Modell warten, und ein Text, der sich bei jedem Durchlauf
  anders liest, lässt sich nicht vertreten. Wenn später eine sprachlich
  feinere Zusammenfassung gewünscht ist, kann sie über die vorhandene
  Anthropic-Strecke ergänzt werden — als Zusatz zur Zahl, nie als Ersatz.
* **Keine Verwaltungsoberfläche für den Katalog.** Fragen und Gewichte ändert
  man im Code. Das ist für den jetzigen Stand die ehrlichere Lösung: Ein
  Einstellungsmenü für eine Bewertungslogik, die noch kalibriert wird, nützt
  niemandem.
* **Die Bühne im Gesprächsfenster** ist mit einem echten Daily-Raum nicht
  durchgeklickt worden — dafür fehlt in der Entwicklungsumgebung ein
  Videodienst. Geprüft sind die Datenschicht, die Route, die Rechte und beide
  Oberflächen gegen eine laufende Instanz; die Einbettung selbst folgt
  demselben Muster wie die bereits erprobte Präsentationsbühne.
