"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Send, Sparkles, Wrench } from "lucide-react";

/**
 * Das Vorbereitungsgespräch.
 *
 * Der Berater schreibt, das Modell antwortet — und ändert dabei die
 * Vorbereitung selbst: Posten, Grundlagen, Preise, Notiz. Deshalb wird nach
 * jedem Zug die Seite neu geladen; sonst stünde oben noch die alte Auswahl,
 * während unten steht, sie sei geändert.
 *
 * Bewusst kein Zeichenstrom: Ein Zug besteht meist aus mehreren Runden mit
 * Recherche und Werkzeugen dazwischen. Was zählt, ist das Ergebnis und die
 * Liste dessen, was sich geändert hat.
 */

export type ChatZeile = {
  id: string;
  rolle: string;
  inhalt: string;
  werkzeuge: string[];
};

const WERKZEUG_TEXT: Record<string, string> = {
  posten_zustand: "Posten gesetzt",
  posten_anlegen: "Posten angelegt",
  posten_aendern: "Posten geändert",
  schablone_rechnen: "Schablone gerechnet",
  grundlage_entscheiden: "Grundlage entschieden",
  preis_nachtragen: "Preis nachgetragen",
  notiz_setzen: "Notiz gesetzt",
  vorbereitung_abschliessen: "Vorbereitung abgeschlossen",
};

const VORSCHLAEGE = [
  "Lass uns das Gespräch vorbereiten — womit fangen wir an?",
  "Welche drei Automationen schlägst du vor, und warum diese?",
  "Geh die Grundlagen mit mir durch.",
  "Was fehlt mir noch, bevor ich ins Gespräch gehe?",
];

export function VorbereitungsChat({
  sitzungId,
  verlauf,
  vorbereitetAm,
}: {
  sitzungId: string;
  verlauf: ChatZeile[];
  vorbereitetAm: string | null;
}) {
  const router = useRouter();
  const [frage, setzeFrage] = useState("");
  const [laeuft, setzeLaeuft] = useState(false);
  const [fehler, setzeFehler] = useState<string | null>(null);
  const feld = useRef<HTMLTextAreaElement>(null);

  async function senden(text: string) {
    const inhalt = text.trim();
    if (!inhalt || laeuft) return;
    setzeLaeuft(true);
    setzeFehler(null);
    setzeFrage("");
    try {
      const antwort = await fetch(`/api/strategie/${sitzungId}/vorbereitung`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ frage: inhalt }),
      });
      if (!antwort.ok) {
        const daten: { error?: string } = await antwort.json().catch(() => ({}));
        setzeFehler(daten.error ?? "Der Zug ist fehlgeschlagen.");
        return;
      }
      // Die Vorbereitung drumherum hat sich geändert — alles neu holen.
      router.refresh();
    } catch {
      setzeFehler("Netzwerkfehler — bitte erneut versuchen.");
    } finally {
      setzeLaeuft(false);
    }
  }

  return (
    <div className="bg-[#0c1520] border border-[#1a2840] rounded-xl p-5">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-1">
        <h2 className="text-[#f0f0f0] font-semibold text-sm flex items-center gap-2">
          <Sparkles size={15} className="text-[#00b8ff]" />
          Vorbereitung
        </h2>
        {vorbereitetAm && (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#2ee6c5]/10 border border-[#2ee6c5]/25 text-[#2ee6c5]">
            abgeschlossen am {new Date(vorbereitetAm).toLocaleDateString("de-DE")}
          </span>
        )}
      </div>
      <p className="text-[#888] text-xs leading-relaxed">
        Mit Zugriff auf Blueprint, Bericht, Leitfaden und Schablone — und auf die
        Websuche. Was hier entschieden wird, steht danach oben in der Auswahl.
      </p>

      {verlauf.length > 0 && (
        <div className="mt-4 space-y-3 max-h-[560px] overflow-y-auto pr-1">
          {verlauf.map((zeile) => {
            const vomBerater = zeile.rolle === "user";
            return (
              <div
                key={zeile.id}
                className={`px-4 py-3 rounded-xl border ${
                  vomBerater
                    ? "border-[#1a2840] bg-[#0a121c] ml-8"
                    : "border-[rgba(0,184,255,.2)] bg-[rgba(0,184,255,.04)] mr-8"
                }`}
              >
                <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-[#3f5572] mb-1.5">
                  {vomBerater ? "Sie" : "Vorbereitung"}
                </p>
                <p className="text-[#dce9f6] text-[13px] leading-relaxed whitespace-pre-wrap">
                  {zeile.inhalt}
                </p>
                {zeile.werkzeuge.length > 0 && (
                  <div className="mt-2.5 pt-2 border-t border-[#111e30] flex flex-wrap gap-1.5">
                    {zeile.werkzeuge.map((w, i) => (
                      <span
                        key={`${w}-${i}`}
                        className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-[#101c2e] border border-[#1a2840] text-[#8899b4]"
                      >
                        <Wrench size={9} />
                        {WERKZEUG_TEXT[w] ?? w}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {verlauf.length === 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {VORSCHLAEGE.map((v) => (
            <button
              key={v}
              onClick={() => void senden(v)}
              disabled={laeuft}
              className="px-3 py-1.5 rounded-lg border border-[#1a2840] text-[#8899b4] text-xs
                hover:text-[#dce9f6] hover:border-[rgba(0,184,255,.4)] disabled:opacity-50
                transition-colors text-left"
            >
              {v}
            </button>
          ))}
        </div>
      )}

      {fehler && <p className="mt-3 text-[#f0504a] text-xs">{fehler}</p>}

      <div className="mt-4 flex items-end gap-2">
        <textarea
          ref={feld}
          value={frage}
          onChange={(e) => setzeFrage(e.target.value)}
          onKeyDown={(e) => {
            // Enter schickt ab, Shift+Enter macht einen Absatz — wie überall.
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void senden(frage);
            }
          }}
          rows={2}
          disabled={laeuft}
          placeholder="Was sollen wir vorbereiten?"
          className="flex-1 px-3 py-2.5 rounded-xl bg-[#060a10] border border-[#1a2840]
            text-[#f0f0f0] text-sm placeholder-[#444] resize-none
            focus:outline-none focus:border-[#00b8ff]/50 disabled:opacity-60"
        />
        <button
          onClick={() => void senden(frage)}
          disabled={laeuft || !frage.trim()}
          className="px-4 py-2.5 rounded-xl bg-[#00b8ff] text-[#041018] text-xs font-bold
            disabled:bg-[#16283d] disabled:text-[#4a5a70] transition-colors flex items-center gap-1.5"
        >
          {laeuft ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
          {laeuft ? "Arbeitet…" : "Senden"}
        </button>
      </div>
      {laeuft && (
        <p className="mt-2 text-[#5b6b7f] text-[11px]">
          Kann eine Weile dauern — Recherche und Änderungen laufen in einem Zug.
        </p>
      )}
    </div>
  );
}
