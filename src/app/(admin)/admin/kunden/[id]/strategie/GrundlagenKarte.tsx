"use client";

import { useState, useTransition } from "react";
import { Check, Layers, RefreshCw, X } from "lucide-react";
import { schabloneRechnen, vorschlagZustand } from "./actions";

/**
 * Die Grundlagen-Schablone in der Vorbereitung.
 *
 * Soll über Ist: was bleibt, was wegfällt, was zusammengeht, was fehlt.
 * Gerechnet hat das ein Abgleich — entschieden wird es hier, von Hand. Erst
 * eine Bestätigung macht einen Vorschlag für den Kunden sichtbar; bis dahin
 * ist er ein Entwurf, auch wenn er noch so plausibel klingt.
 */

export type VorschlagZeile = {
  id: string;
  bewegung: string;
  titel: string;
  begruendung: string | null;
  programme: string[];
  sparenProMonat: number | null;
  erstZumVertragsende: boolean;
  zustand: string;
};

const BEWEGUNGEN: Record<string, { label: string; cls: string }> = {
  bleibt: { label: "bleibt", cls: "bg-[#101c2e] border-[#1a2840] text-[#8899b4]" },
  faellt_weg: {
    label: "fällt weg",
    cls: "bg-[#2ee6c5]/10 border-[#2ee6c5]/25 text-[#2ee6c5]",
  },
  geht_zusammen: {
    label: "geht zusammen",
    cls: "bg-[#00b8ff]/10 border-[#00b8ff]/25 text-[#00b8ff]",
  },
  fehlt: { label: "fehlt", cls: "bg-[#f5a524]/10 border-[#f5a524]/25 text-[#f5a524]" },
};

export function GrundlagenKarte({
  sitzungId,
  vorschlaege,
  ohneKosten,
  programme,
}: {
  sitzungId: string;
  vorschlaege: VorschlagZeile[];
  /** Programme ohne Kostenangabe — die Lücke im Sparargument. */
  ohneKosten: number;
  programme: number;
}) {
  const [pending, start] = useTransition();
  const [fehler, setzeFehler] = useState<string | null>(null);

  function fuehreAus(fn: () => Promise<unknown>) {
    setzeFehler(null);
    start(async () => {
      const ergebnis = (await fn()) as { error?: string } | undefined;
      if (ergebnis && "error" in ergebnis && ergebnis.error) setzeFehler(ergebnis.error);
    });
  }

  const bestaetigt = vorschlaege.filter((v) => v.zustand === "bestaetigt");
  const sofort = bestaetigt
    .filter((v) => v.bewegung === "faellt_weg" && !v.erstZumVertragsende)
    .reduce((s, v) => s + (v.sparenProMonat ?? 0), 0);
  const spaeter = bestaetigt
    .filter((v) => v.bewegung === "faellt_weg" && v.erstZumVertragsende)
    .reduce((s, v) => s + (v.sparenProMonat ?? 0), 0);

  return (
    <div className="bg-[#0c1520] border border-[#1a2840] rounded-xl p-5">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-1">
        <h2 className="text-[#f0f0f0] font-semibold text-sm flex items-center gap-2">
          <Layers size={15} className="text-[#00b8ff]" />
          Digitale Grundlagen
        </h2>
        <button
          onClick={() => fuehreAus(() => schabloneRechnen(sitzungId))}
          disabled={pending}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#1a2840]
            text-[#8899b4] text-xs hover:text-[#dce9f6] hover:border-[rgba(0,184,255,.4)]
            disabled:opacity-50 transition-colors"
        >
          <RefreshCw size={12} />
          {pending ? "…" : vorschlaege.length === 0 ? "Schablone anlegen" : "Neu rechnen"}
        </button>
      </div>
      <p className="text-[#888] text-xs leading-relaxed">
        Was der Betrieb hat, gegen das gelegt, was er braucht. Bestätigt ist nichts, bis
        Sie es bestätigen — erst dann sieht der Kunde es im Haus.
      </p>

      {fehler && <p className="mt-3 text-[#f0504a] text-xs">{fehler}</p>}

      {ohneKosten > 0 && (
        /*
          Der Satz ist wichtiger, als er aussieht: Ohne Preise steht im
          Gespräch „spart Ihnen Geld" ohne Zahl — und das ist genau die
          Stelle, an der ein Einwand kommt.
        */
        <p className="mt-3 px-3 py-2 rounded-lg bg-[rgba(245,165,36,.08)] border border-[rgba(245,165,36,.25)] text-[#f5a524] text-[11px] leading-relaxed">
          Bei {ohneKosten} von {programme} Programmen fehlt der Preis. Solange der fehlt,
          lässt sich nicht beziffern, was ein Wechsel spart — im Gespräch nachfragen und
          unter Stammdaten nachtragen.
        </p>
      )}

      {vorschlaege.length === 0 ? (
        <p className="mt-4 text-[#555] text-xs">
          Noch nichts gerechnet. Die Schablone liest die Programme aus dem Blueprint und
          legt darüber, was das gebuchte Paket ohnehin mitbringt.
        </p>
      ) : (
        <>
          <ul className="mt-4 space-y-2">
            {vorschlaege.map((v) => {
              const art = BEWEGUNGEN[v.bewegung] ?? BEWEGUNGEN.bleibt;
              const verworfen = v.zustand === "verworfen";
              return (
                <li
                  key={v.id}
                  className={`px-4 py-3 rounded-lg border transition-colors ${
                    verworfen
                      ? "border-[#16263d] bg-transparent opacity-45"
                      : v.zustand === "bestaetigt"
                        ? "border-[rgba(0,184,255,.4)] bg-[rgba(0,184,255,.06)]"
                        : "border-[#1a2840] bg-[#0a121c]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full border ${art.cls}`}
                        >
                          {art.label}
                        </span>
                        {v.sparenProMonat !== null && (
                          <span className="text-[#2ee6c5] text-[11px] font-mono">
                            {v.sparenProMonat} € / Monat
                            {v.erstZumVertragsende && (
                              <span className="text-[#f5a524]"> · ab Vertragsende</span>
                            )}
                          </span>
                        )}
                      </div>
                      <p className="text-[#f0f0f0] text-[13px] font-medium mt-1.5">
                        {v.titel}
                      </p>
                      {v.begruendung && (
                        <p className="text-[#888] text-xs mt-0.5 leading-relaxed">
                          {v.begruendung}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() =>
                          fuehreAus(() =>
                            vorschlagZustand(
                              sitzungId,
                              v.id,
                              v.zustand === "bestaetigt" ? "offen" : "bestaetigt"
                            )
                          )
                        }
                        disabled={pending}
                        title="Bestätigen — der Kunde sieht es"
                        className={`p-1.5 rounded-md disabled:opacity-50 transition-colors ${
                          v.zustand === "bestaetigt"
                            ? "bg-[#00b8ff] text-[#041018]"
                            : "text-[#5b6b7f] hover:text-[#2ee6c5] hover:bg-white/[0.05]"
                        }`}
                      >
                        <Check size={14} />
                      </button>
                      <button
                        onClick={() =>
                          fuehreAus(() =>
                            vorschlagZustand(
                              sitzungId,
                              v.id,
                              verworfen ? "offen" : "verworfen"
                            )
                          )
                        }
                        disabled={pending}
                        title="Verwerfen"
                        className="p-1.5 rounded-md text-[#5b6b7f] hover:text-[#f0504a] hover:bg-white/[0.05] disabled:opacity-50 transition-colors"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>

          {(sofort > 0 || spaeter > 0) && (
            <p className="mt-3 text-[#8899b4] text-xs">
              Bestätigt spart das{" "}
              <span className="text-[#2ee6c5] font-medium">mindestens {sofort} €</span> im
              Monat
              {spaeter > 0 && (
                <>
                  , dazu <span className="text-[#f5a524]">{spaeter} €</span> ab
                  Vertragsende
                </>
              )}
              .
            </p>
          )}
        </>
      )}
    </div>
  );
}
