"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { anleitungsSchluessel } from "@/lib/strategy-guide/schluessel";
import {
  Sparkles,
  ShieldCheck,
  ShieldAlert,
  Loader2,
  History,
  Lightbulb,
  MessageSquare,
  AlertTriangle,
  FileDown,
  BookOpen,
} from "lucide-react";
import type {
  GuideDocument,
  ProtokollEintrag,
  Umsetzungsposten,
} from "@/lib/strategy-guide/types";

interface Fassung {
  version: number;
  instruction: string | null;
  rounds: number;
  createdAt: string;
  createdBy: string;
  document: GuideDocument | null;
  protokoll: ProtokollEintrag[];
}

function Abschnitt({
  nummer,
  titel,
  children,
}: {
  nummer: number;
  titel: string;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-[#0c1520] border border-[#1a2840] rounded-xl p-6">
      <div className="flex items-center gap-2.5 mb-4">
        <span className="w-6 h-6 rounded-md bg-[#00b8ff]/10 border border-[#00b8ff]/20 text-[#00b8ff] text-xs font-bold flex items-center justify-center flex-shrink-0">
          {nummer}
        </span>
        <h2 className="text-[#f0f0f0] font-semibold text-sm">{titel}</h2>
      </div>
      {children}
    </section>
  );
}

const absatz = "text-[#c9d4e4] text-sm leading-relaxed whitespace-pre-line";

export default function LeitfadenClient({
  companyName,
  companyId,
  sessionId,
  blueprintCompletedAt,
  hatBerichtstexte,
  fassungen,
}: {
  companyName: string;
  companyId: string;
  sessionId: string | null;
  blueprintCompletedAt: string | null;
  hatBerichtstexte: boolean;
  fassungen: Fassung[];
}) {
  const router = useRouter();
  const [laeuft, setLaeuft] = useState(false);
  const [wartet, setWartet] = useState(false);
  const [pdfLaeuft, setPdfLaeuft] = useState(false);
  const [fehler, setFehler] = useState<string | null>(null);
  const [anweisung, setAnweisung] = useState("");
  const [gezeigt, setGezeigt] = useState(fassungen[0]?.version ?? 0);

  const aktuell = fassungen.find((f) => f.version === gezeigt) ?? fassungen[0] ?? null;
  const doc = aktuell?.document ?? null;

  // Nach Block gruppiert, in der Reihenfolge des Leistungsumfangs.
  const bloecke: Array<{ name: string; posten: Umsetzungsposten[] }> = [];
  for (const posten of doc?.umsetzung ?? []) {
    const vorhanden = bloecke.find((b) => b.name === posten.block);
    if (vorhanden) vorhanden.posten.push(posten);
    else bloecke.push({ name: posten.block, posten: [posten] });
  }

  /**
   * Sieht nach, ob eine neue Fassung aufgetaucht ist.
   *
   * Die Erzeugung läuft mehrere Minuten in einer einzigen Anfrage, über die
   * währenddessen nichts fließt. Wird die Leitung dabei gekappt, meldet der
   * Browser "Failed to fetch", obwohl der Server weiterarbeitet und die
   * Fassung ablegt — ein Neuladen der Seite zeigte sie dann. Genau das
   * passiert hier von selbst.
   */
  async function wartenAufFassung(vorher: number): Promise<boolean> {
    const bisMax = Date.now() + 12 * 60 * 1000;
    while (Date.now() < bisMax) {
      await new Promise((r) => setTimeout(r, 10_000));
      try {
        const res = await fetch(
          `/api/admin/strategy-guide?sessionId=${encodeURIComponent(sessionId!)}`
        );
        if (!res.ok) continue;
        const daten = (await res.json()) as { version?: number };
        if ((daten.version ?? 0) > vorher) return true;
      } catch {
        // Auch das Nachsehen kann scheitern — dann eben beim nächsten Mal.
      }
    }
    return false;
  }

  async function erzeugen(mitAnweisung: boolean) {
    if (!sessionId) return;
    const vorher = fassungen[0]?.version ?? 0;
    setLaeuft(true);
    setWartet(false);
    setFehler(null);
    try {
      const res = await fetch("/api/admin/strategy-guide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          anweisung: mitAnweisung ? anweisung : undefined,
        }),
      });

      // Wird die Anfrage abgelehnt, kommt eine gewöhnliche Antwort mit
      // Meldung. Wird sie angenommen, kommt ein Strom: alle zehn Sekunden
      // ein Lebenszeichen, am Ende das Ergebnis. So fließt durchgehend
      // etwas, und niemand hält die Verbindung für tot.
      if (!res.ok) {
        const daten = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(daten.error ?? "Unbekannter Fehler");
      }
      if (!res.body) throw new Error("Keine Antwort vom Server");

      const leser = res.body.getReader();
      const dekoder = new TextDecoder();
      let rest = "";
      let fertig = false;

      for (;;) {
        const { done, value } = await leser.read();
        if (done) break;
        rest += dekoder.decode(value, { stream: true });
        const zeilen = rest.split("\n");
        rest = zeilen.pop() ?? "";
        for (const zeile of zeilen) {
          if (!zeile.trim()) continue;
          let eintrag: { status?: string; error?: string };
          try {
            eintrag = JSON.parse(zeile) as { status?: string; error?: string };
          } catch {
            continue;
          }
          if (eintrag.status === "fehler") {
            throw new Error(eintrag.error ?? "Der Leitfaden konnte nicht erzeugt werden.");
          }
          if (eintrag.status === "fertig") fertig = true;
        }
      }

      if (!fertig) {
        // Der Strom endete, ohne fertig zu melden — dann ist er unterwegs
        // abgerissen. Behandeln wie einen Verbindungsabbruch.
        throw new TypeError("Der Strom endete vorzeitig");
      }

      setAnweisung("");
      router.refresh();
    } catch (e) {
      // Eine abgerissene Leitung wirft einen TypeError; ein abgelehnter
      // Aufruf liefert eine Meldung vom Server. Nur im ersten Fall lohnt
      // das Nachsehen.
      if (e instanceof TypeError) {
        setWartet(true);
        const da = await wartenAufFassung(vorher);
        setWartet(false);
        if (da) {
          setAnweisung("");
          router.refresh();
          setLaeuft(false);
          return;
        }
        setFehler(
          "Die Verbindung ist abgerissen und auch nach zwölf Minuten war keine " +
            "neue Fassung da. Laden Sie die Seite neu — manchmal ist sie trotzdem " +
            "fertig geworden."
        );
      } else {
        setFehler(e instanceof Error ? e.message : "Unbekannter Fehler");
      }
    } finally {
      setLaeuft(false);
    }
  }

  /**
   * Holt die gezeigte Fassung als PDF.
   *
   * Nicht als einfacher Link: Schlägt der Abruf fehl, soll die Meldung hier
   * stehen und nicht als nackter JSON-Text in einem neuen Tab.
   */
  async function pdfHolen() {
    if (!sessionId || !aktuell) return;
    setPdfLaeuft(true);
    setFehler(null);
    try {
      const res = await fetch(
        `/api/admin/strategy-guide/pdf?sessionId=${encodeURIComponent(sessionId)}&version=${aktuell.version}`
      );
      if (!res.ok) {
        const daten = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(daten.error ?? "Das PDF konnte nicht erzeugt werden.");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Leitfaden-${companyName.replace(/[^\p{L}\p{N}]+/gu, "-")}-Fassung-${aktuell.version}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      setFehler(e instanceof Error ? e.message : "Unbekannter Fehler");
    } finally {
      setPdfLaeuft(false);
    }
  }

  if (!sessionId) {
    return (
      <div className="max-w-[900px] mx-auto">
        <h1 className="text-2xl font-bold text-[#f0f0f0] mb-2">Leitfaden Strategiegespräch</h1>
        <div className="mt-6 bg-[#0c1520] border border-[#1a2840] rounded-xl p-8 text-center">
          <AlertTriangle size={28} className="text-[#5b6b7f] mx-auto mb-3" />
          <p className="text-[#8899b4] text-sm">
            Für {companyName} gibt es noch keinen abgeschlossenen Blueprint.
          </p>
          <p className="text-[#5b6b7f] text-xs mt-1.5">
            Der Leitfaden entsteht aus den Antworten — ohne sie gibt es nichts zu analysieren.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[900px] mx-auto space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#f0f0f0]">Leitfaden Strategiegespräch</h1>
          <p className="text-[#8899b4] text-sm mt-1">
            {companyName}
            {blueprintCompletedAt &&
              ` · Blueprint abgeschlossen am ${new Date(blueprintCompletedAt).toLocaleDateString("de-DE")}`}
          </p>
          <p className="text-[#5b6b7f] text-xs mt-2 leading-relaxed">
            Interne Unterlage. Sie enthält, wie wir dem Kunden unsere Befunde vortragen und was
            wir ihm darüber hinaus anbieten — der Kunde bekommt sie nicht zu sehen.
          </p>
        </div>
        {aktuell && (
          <button
            onClick={pdfHolen}
            disabled={pdfLaeuft}
            title="Zum Mitnehmen ins Gespräch — auf jeder Seite steht, dass der Kunde das Blatt nicht sehen darf."
            className="flex-shrink-0 flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[#060a10] border border-[#1a2840] text-[#8899b4] text-xs hover:text-[#c9d4e4] hover:border-[#28405f] disabled:opacity-50 transition-colors"
          >
            {pdfLaeuft ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <FileDown size={14} />
            )}
            {pdfLaeuft ? "Wird erzeugt…" : "Als PDF"}
          </button>
        )}
      </div>

      {!hatBerichtstexte && (
        <div className="bg-[#1a1407] border border-[#3d2f0b] rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle size={15} className="text-[#f59e0b] mt-0.5 flex-shrink-0" />
          <p className="text-[#d6c48a] text-xs leading-relaxed">
            Für diese Sitzung liegen noch keine gespeicherten Berichtstexte vor. Der Leitfaden
            entsteht trotzdem, kann sich aber nicht darauf beziehen, was der Kunde schwarz auf
            weiß bekommen hat. Erzeugen Sie zuerst den Kundenbericht, dann wird er vollständiger.
          </p>
        </div>
      )}

      {fehler && (
        <div className="bg-[#1a0b0b] border border-[#3d1414] rounded-xl p-4">
          <p className="text-[#f87171] text-sm">{fehler}</p>
        </div>
      )}

      {/* Erzeugen / Nachschärfen */}
      <div className="bg-[#0c1520] border border-[#1a2840] rounded-xl p-5">
        {fassungen.length === 0 ? (
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-[#f0f0f0] font-semibold text-sm">Leitfaden erzeugen</p>
              <p className="text-[#8899b4] text-xs mt-1 leading-relaxed">
                Die Analyse liest den gesamten Fall und schlägt Custom-Projekte vor. Jeder
                Vorschlag wird anschließend unabhängig gegen die Daten geprüft. Das dauert
                einige Minuten.
              </p>
            </div>
            <button
              onClick={() => erzeugen(false)}
              disabled={laeuft}
              className="flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#00b8ff]/10 border border-[#00b8ff]/25 text-[#00b8ff] text-sm hover:bg-[#00b8ff]/15 disabled:opacity-50 transition-colors"
            >
              {laeuft ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
              {wartet ? "Verbindung weg — wird nachgesehen…" : laeuft ? "Wird erstellt…" : "Erzeugen"}
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 mb-3">
              <MessageSquare size={14} className="text-[#00b8ff]" />
              <p className="text-[#f0f0f0] font-semibold text-sm">Nachschärfen</p>
            </div>
            <p className="text-[#8899b4] text-xs mb-3 leading-relaxed">
              Was soll anders? Zum Beispiel: „Der Teil zur Dokumentation ist zu technisch, der
              Kunde ist kein IT-Mensch — formuliere das in Alltagssprache.“ Die bisherige
              Fassung bleibt erhalten.
            </p>
            <p className="text-[#5b6b7f] text-xs mb-3 leading-relaxed">
              Das Feld darf leer bleiben: Dann wird der Leitfaden von Grund auf neu
              erzeugt, statt die bisherige Fassung zu überarbeiten.
            </p>
            <textarea
              value={anweisung}
              onChange={(e) => setAnweisung(e.target.value)}
              disabled={laeuft}
              rows={3}
              placeholder="Ihre Anweisung…"
              className="w-full bg-[#060a10] border border-[#1a2840] rounded-lg px-3 py-2.5 text-[#f0f0f0] text-sm placeholder-[#44546b] focus:outline-none focus:border-[#00b8ff]/50 resize-none disabled:opacity-50"
            />
            <div className="flex justify-end mt-3">
              <button
                onClick={() => erzeugen(anweisung.trim().length > 0)}
                disabled={laeuft}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#00b8ff]/10 border border-[#00b8ff]/25 text-[#00b8ff] text-sm hover:bg-[#00b8ff]/15 disabled:opacity-40 transition-colors"
              >
                {laeuft ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                {wartet
                  ? "Verbindung weg — wird nachgesehen…"
                  : laeuft
                    ? anweisung.trim().length > 0
                      ? "Wird überarbeitet…"
                      : "Wird neu erzeugt…"
                    : anweisung.trim().length > 0
                      ? "Neue Fassung erstellen"
                      : "Neu erzeugen"}
              </button>
            </div>
          </>
        )}
      </div>

      {/* Fassungen */}
      {fassungen.length > 1 && (
        <div className="bg-[#0c1520] border border-[#1a2840] rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <History size={14} className="text-[#8899b4]" />
            <p className="text-[#8899b4] text-xs font-semibold uppercase tracking-wider">
              Fassungen
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {fassungen.map((f) => (
              <button
                key={f.version}
                onClick={() => setGezeigt(f.version)}
                title={f.instruction ?? "Erste Fassung"}
                className={`px-3 py-1.5 rounded-lg text-xs border transition-colors ${
                  f.version === gezeigt
                    ? "bg-[#00b8ff]/10 border-[#00b8ff]/25 text-[#00b8ff]"
                    : "bg-[#060a10] border-[#1a2840] text-[#8899b4] hover:text-[#c9d4e4]"
                }`}
              >
                Fassung {f.version}
                <span className="text-[#44546b] ml-1.5">
                  {new Date(f.createdAt).toLocaleDateString("de-DE")}
                </span>
              </button>
            ))}
          </div>
          {aktuell?.instruction && (
            <p className="text-[#5b6b7f] text-xs mt-3 leading-relaxed">
              Angepasst nach: „{aktuell.instruction}“ — {aktuell.createdBy}
            </p>
          )}
        </div>
      )}

      {/* Das Dokument */}
      {doc && (
        <div className="space-y-4">
          <Abschnitt nummer={1} titel="Was wir festgestellt haben">
            <p className={absatz}>{doc.befund}</p>
          </Abschnitt>

          <Abschnitt nummer={2} titel="So steigst du ein">
            <div className="bg-[#060a10] border-l-2 border-[#00b8ff]/40 rounded-r-lg px-4 py-3">
              <p className={absatz}>{doc.gespraechseinstieg}</p>
            </div>
          </Abschnitt>

          <Abschnitt nummer={3} titel="Die stärksten Befunde">
            <div className="space-y-3">
              {doc.kernbefunde.map((b, i) => (
                <div key={i} className="bg-[#060a10] rounded-lg p-4">
                  <p className="text-[#f0f0f0] text-sm font-semibold">{b.titel}</p>
                  <p className="text-[#00b8ff] text-xs mt-1.5 font-medium">{b.beleg}</p>
                  <p className="text-[#8899b4] text-xs mt-2 leading-relaxed">{b.wirkung}</p>
                </div>
              ))}
            </div>
          </Abschnitt>

          <Abschnitt nummer={4} titel="Warum das Expertise zeigt">
            <p className={absatz}>{doc.expertise}</p>
          </Abschnitt>

          <Abschnitt nummer={5} titel="Unsere Empfehlung">
            <p className={absatz}>{doc.empfehlung}</p>
          </Abschnitt>

          <Abschnitt nummer={6} titel="Custom-Projekte, die hier gehen">
            {doc.customVorschlaege.length === 0 ? (
              <p className="text-[#8899b4] text-sm leading-relaxed">
                Die unabhängige Prüfung hat keinen Vorschlag bestätigt. Das heißt nicht, dass
                es keinen gibt — nur, dass sich aus diesen Daten keiner belegen ließ. Im
                Gespräch nachfragen statt raten.
              </p>
            ) : (
              <div className="space-y-4">
                {doc.customVorschlaege.map((v, i) => (
                  <div
                    key={i}
                    className="bg-[#060a10] border border-[#152031] rounded-lg p-4"
                  >
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <p className="text-[#f0f0f0] text-sm font-semibold flex items-center gap-2">
                        <Lightbulb size={14} className="text-[#f59e0b] flex-shrink-0" />
                        {v.titel}
                      </p>
                      <span className="flex-shrink-0 flex items-center gap-1 text-xs text-[#22c55e]">
                        <ShieldCheck size={12} />
                        Runde {v.geprueftInRunde}
                      </span>
                    </div>
                    <p className="text-[#00b8ff] text-xs leading-relaxed">
                      Aufhänger: {v.aufhaenger}
                    </p>
                    <p className="text-[#c9d4e4] text-sm mt-2.5 leading-relaxed">{v.idee}</p>
                    <p className="text-[#8899b4] text-xs mt-2 leading-relaxed">{v.nutzen}</p>
                    <p className="text-[#5b6b7f] text-xs mt-2.5">
                      Grobe Einordnung, im Gespräch zu bestätigen: {v.groessenordnung}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </Abschnitt>

          <Abschnitt nummer={7} titel="Was wir umsetzen und womit">
            {doc.umsetzung.length === 0 ? (
              <p className="text-[#8899b4] text-sm leading-relaxed">
                Für diesen Fall ist nicht hinterlegt, was im gebuchten Paket umgesetzt
                wird. Im Gespräch nichts zusagen.
              </p>
            ) : (
              <div className="space-y-5">
                {bloecke.map((b) => (
                  <div key={b.name}>
                    <p className="text-[#8899b4] text-xs font-semibold uppercase tracking-wider border-b border-[#1a2840] pb-1.5 mb-2.5">
                      {b.name}
                    </p>
                    {/workforce/i.test(b.name) && doc.workforceUrteil && (
                      <div className="bg-[#060a10] border-l-2 border-[#2a3a4f] rounded-r-lg px-3.5 py-2.5 mb-3">
                        <p className={absatz}>{doc.workforceUrteil}</p>
                      </div>
                    )}
                    <div className="space-y-4">
                      {b.posten.map((pst, i) => (
                        <div key={i} className="border-l-2 border-[#1a2840] pl-3">
                          <p className="text-[#f0f0f0] text-sm font-semibold">
                            {pst.titel}
                          </p>
                          <p className="text-[#8899b4] text-xs mt-0.5 leading-relaxed">
                            {pst.einordnung}
                          </p>
                          <p className="text-[#00b8ff] text-xs mt-1 font-medium">
                            {pst.befund}
                          </p>
                          {[
                            { k: "Womit", v: pst.womit },
                            { k: "Warum gerade das", v: pst.warum },
                            { k: "Wie wir vorgehen", v: pst.wieWirEsMachen },
                          ].map((f) => (
                            <div key={f.k} className="mt-2">
                              <p className="text-[#44546b] text-[10px] uppercase tracking-wider font-semibold">
                                {f.k}
                              </p>
                              <p className="text-[#c9d4e4] text-sm leading-relaxed">{f.v}</p>
                            </div>
                          ))}
                          <Link
                            href={`/admin/kunden/${companyId}/leitfaden/anleitung/${encodeURIComponent(
                              anleitungsSchluessel(pst.block, pst.titel)
                            )}`}
                            className="inline-flex items-center gap-1.5 mt-2.5 text-[#8899b4] text-xs hover:text-[#00b8ff] transition-colors"
                          >
                            <BookOpen size={12} />
                            Anleitung für die Umsetzung
                          </Link>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Abschnitt>

          <Abschnitt nummer={8} titel="Wie das abläuft">
            <p className={absatz}>{doc.unsereLeistung}</p>
          </Abschnitt>

          <Abschnitt nummer={9} titel="Womit du rechnen musst">
            <div className="space-y-3">
              {doc.einwaende.map((e, i) => (
                <div key={i} className="bg-[#060a10] rounded-lg p-4">
                  <p className="text-[#8899b4] text-sm italic">„{e.einwand}“</p>
                  <p className="text-[#c9d4e4] text-sm mt-2 leading-relaxed">{e.antwort}</p>
                </div>
              ))}
            </div>
          </Abschnitt>

          <Abschnitt nummer={10} titel="Was am Ende stehen sollte">
            <p className={absatz}>{doc.abschluss}</p>
          </Abschnitt>
        </div>
      )}

      {/* Prüfprotokoll */}
      {aktuell && aktuell.protokoll.length > 0 && (
        <div className="bg-[#0a1119] border border-[#152031] rounded-xl p-5">
          <p className="text-[#8899b4] text-xs font-semibold uppercase tracking-wider mb-1">
            Prüfprotokoll
          </p>
          <p className="text-[#5b6b7f] text-xs mb-4 leading-relaxed">
            Jeder Vorschlag wurde in einem eigenen Durchlauf gegen die Daten geprüft — ohne die
            Begründung, mit der er entstanden ist. {aktuell.rounds}{" "}
            {aktuell.rounds === 1 ? "Runde" : "Runden"} gebraucht.
          </p>
          <div className="space-y-2">
            {aktuell.protokoll.map((p, i) => (
              <div key={i} className="flex items-start gap-2.5">
                {p.bestanden ? (
                  <ShieldCheck size={13} className="text-[#22c55e] mt-0.5 flex-shrink-0" />
                ) : (
                  <ShieldAlert size={13} className="text-[#f59e0b] mt-0.5 flex-shrink-0" />
                )}
                <div className="min-w-0">
                  <p className="text-[#c9d4e4] text-xs">
                    <span className="text-[#5b6b7f]">R{p.runde}</span> {p.titel}
                  </p>
                  <p className="text-[#5b6b7f] text-xs mt-0.5 leading-relaxed">
                    {p.begruendung}
                  </p>
                  {p.standardprodukte && (
                    <p className="text-[#44546b] text-xs mt-1 leading-relaxed">
                      <span className="uppercase tracking-wider text-[10px] text-[#38475c]">
                        Von der Stange:{" "}
                      </span>
                      {p.standardprodukte}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
